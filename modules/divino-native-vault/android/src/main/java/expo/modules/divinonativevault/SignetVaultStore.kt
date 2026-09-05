package expo.modules.divinonativevault

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Envelope Signet: chave AES-256-GCM não exportável no Android Keystore;
 * ciphertext em `getNoBackupFilesDir()`. Sem SharedPreferences, sem
 * AsyncStorage, sem SecureStore.
 */
class SignetVaultStore(private val context: Context) {
  private val vaultDir: File = File(context.noBackupFilesDir, "divino-vault/signet").apply { mkdirs() }
  private val currentFile = File(vaultDir, "current-profile")

  data class StoredPublic(
    val profileId: String,
    val masterFingerprint: String,
    val accountXpub: String,
    val receiveDescriptor: String,
    val changeDescriptor: String,
    val receiveAddress0: String,
  ) {
    fun toBridgeMap(): Map<String, String> = mapOf(
      "profileId" to profileId,
      "network" to SignetVaultCrypto.NETWORK,
      "accountPath" to SignetVaultCrypto.ACCOUNT_PATH,
      "masterFingerprint" to masterFingerprint,
      "accountXpub" to accountXpub,
      "receiveDescriptor" to receiveDescriptor,
      "changeDescriptor" to changeDescriptor,
      "receiveAddress0" to receiveAddress0,
    )
  }

  fun currentProfileId(): String? {
    if (!currentFile.exists()) return null
    val id = currentFile.readText().trim()
    return id.ifEmpty { null }
  }

  fun hasProfile(): Boolean = currentProfileId()?.let { envelopeFile(it).exists() && publicFile(it).exists() } == true

  fun readPublic(profileId: String): StoredPublic {
    val file = publicFile(profileId)
    if (!file.exists()) {
      throw VaultException("VAULT_NOT_PROVISIONED", "Perfil ausente.")
    }
    val json = JSONObject(file.readText())
    return StoredPublic(
      profileId = json.getString("profileId"),
      masterFingerprint = json.getString("masterFingerprint"),
      accountXpub = json.getString("accountXpub"),
      receiveDescriptor = json.getString("receiveDescriptor"),
      changeDescriptor = json.getString("changeDescriptor"),
      receiveAddress0 = json.getString("receiveAddress0"),
    )
  }

  fun persistNewProfile(words: List<String>): StoredPublic {
    if (hasProfile()) {
      throw VaultException("VAULT_ALREADY_PROVISIONED", "Já existe um perfil Signet. Apague-o antes de criar outro.")
    }
    val material = SignetVaultCrypto.publicMaterialFromMnemonic(words)
    val profileId = UUID.randomUUID().toString()
    val alias = keyAlias(profileId)
    val secretKey = createEnvelopeKey(alias)
    val plaintext = words.joinToString(" ").toByteArray(Charsets.UTF_8)
    try {
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.ENCRYPT_MODE, secretKey)
      cipher.updateAAD(aad(profileId))
      val iv = cipher.iv
      val ciphertext = cipher.doFinal(plaintext)
      envelopeFile(profileId).writeBytes(encodeEnvelope(iv, ciphertext))
      val stored = StoredPublic(
        profileId = profileId,
        masterFingerprint = material.masterFingerprint,
        accountXpub = material.accountXpub,
        receiveDescriptor = material.receiveDescriptor,
        changeDescriptor = material.changeDescriptor,
        receiveAddress0 = material.receiveAddress0,
      )
      publicFile(profileId).writeText(JSONObject().apply {
        put("profileId", stored.profileId)
        put("network", SignetVaultCrypto.NETWORK)
        put("accountPath", SignetVaultCrypto.ACCOUNT_PATH)
        put("masterFingerprint", stored.masterFingerprint)
        put("accountXpub", stored.accountXpub)
        put("receiveDescriptor", stored.receiveDescriptor)
        put("changeDescriptor", stored.changeDescriptor)
        put("receiveAddress0", stored.receiveAddress0)
      }.toString())
      currentFile.writeText(profileId)
      return stored
    } finally {
      plaintext.fill(0)
    }
  }

  fun withMnemonic(profileId: String, use: (List<String>) -> Unit) {
    val envelope = envelopeFile(profileId)
    if (!envelope.exists()) {
      throw VaultException("VAULT_NOT_PROVISIONED", "Perfil ausente.")
    }
    val (iv, ciphertext) = decodeEnvelope(envelope.readBytes())
    val secretKey = loadEnvelopeKey(keyAlias(profileId))
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_BITS, iv))
    cipher.updateAAD(aad(profileId))
    val plaintext = cipher.doFinal(ciphertext)
    try {
      val words = SignetVaultCrypto.normalizeWords(String(plaintext, Charsets.UTF_8))
      SignetVaultCrypto.validateMnemonic(words)
      use(words)
    } finally {
      plaintext.fill(0)
    }
  }

  fun deleteProfile(profileId: String) {
    val expected = currentProfileId()
    if (expected == null || expected != profileId) {
      throw VaultException("VAULT_NOT_PROVISIONED", "Perfil ausente.")
    }
    overwriteAndDelete(envelopeFile(profileId))
    overwriteAndDelete(publicFile(profileId))
    overwriteAndDelete(currentFile)
    try {
      val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
      keyStore.load(null)
      keyStore.deleteEntry(keyAlias(profileId))
    } catch (_: Exception) {
      // Best effort: o ciphertext já foi apagado.
    }
  }

  private fun createEnvelopeKey(alias: String): SecretKey {
    val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    val builder = KeyGenParameterSpec.Builder(
      alias,
      KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
    )
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256)
      .setRandomizedEncryptionRequired(true)
      .setUserAuthenticationRequired(false)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      builder.setUnlockedDeviceRequired(true)
    }

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        builder.setIsStrongBoxBacked(true)
      }
      keyGenerator.init(builder.build())
      return keyGenerator.generateKey()
    } catch (_: Exception) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val fallback = KeyGenParameterSpec.Builder(
          alias,
          KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setKeySize(256)
          .setRandomizedEncryptionRequired(true)
          .setUserAuthenticationRequired(false)
          .setUnlockedDeviceRequired(true)
        keyGenerator.init(fallback.build())
        return keyGenerator.generateKey()
      }
      throw VaultException("VAULT_REFUSED", "O Keystore recusou criar a chave de envelope.")
    }
  }

  private fun loadEnvelopeKey(alias: String): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
    keyStore.load(null)
    val key = keyStore.getKey(alias, null) as? SecretKey
      ?: throw VaultException("VAULT_NOT_PROVISIONED", "Chave de envelope ausente.")
    return key
  }

  private fun encodeEnvelope(iv: ByteArray, ciphertext: ByteArray): ByteArray {
    val out = ByteArray(MAGIC.size + 1 + 1 + iv.size + ciphertext.size)
    var offset = 0
    MAGIC.copyInto(out, offset); offset += MAGIC.size
    out[offset] = VERSION; offset += 1
    out[offset] = iv.size.toByte(); offset += 1
    iv.copyInto(out, offset); offset += iv.size
    ciphertext.copyInto(out, offset)
    return out
  }

  private fun decodeEnvelope(bytes: ByteArray): Pair<ByteArray, ByteArray> {
    if (bytes.size < MAGIC.size + 2 + 12 + 16) {
      throw VaultException("VAULT_REFUSED", "Envelope corrompido.")
    }
    if (!bytes.copyOfRange(0, MAGIC.size).contentEquals(MAGIC)) {
      throw VaultException("VAULT_REFUSED", "Envelope corrompido.")
    }
    if (bytes[MAGIC.size] != VERSION) {
      throw VaultException("VAULT_REFUSED", "Versão de envelope desconhecida.")
    }
    val ivLength = bytes[MAGIC.size + 1].toInt() and 0xff
    val ivStart = MAGIC.size + 2
    val ivEnd = ivStart + ivLength
    if (ivEnd >= bytes.size) {
      throw VaultException("VAULT_REFUSED", "Envelope corrompido.")
    }
    return Pair(bytes.copyOfRange(ivStart, ivEnd), bytes.copyOfRange(ivEnd, bytes.size))
  }

  private fun overwriteAndDelete(file: File) {
    if (!file.exists()) return
    try {
      val size = file.length().toInt().coerceAtLeast(0)
      if (size > 0) {
        file.writeBytes(ByteArray(size))
      }
    } catch (_: Exception) {
    }
    file.delete()
  }

  private fun envelopeFile(profileId: String) = File(vaultDir, "$profileId.envelope")
  private fun publicFile(profileId: String) = File(vaultDir, "$profileId.public.json")
  private fun keyAlias(profileId: String) = "divino.signet.vault.$profileId"
  private fun aad(profileId: String) = "signet:$profileId".toByteArray(Charsets.UTF_8)

  companion object {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_BITS = 128
    private const val VERSION: Byte = 0x01
    private val MAGIC = byteArrayOf(0x44, 0x49, 0x56, 0x4E) // DIVN
  }
}
