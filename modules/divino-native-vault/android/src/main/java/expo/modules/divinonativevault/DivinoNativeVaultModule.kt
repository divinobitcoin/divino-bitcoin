package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors

/**
 * Fronteira nativa Signet. JS só vê handle, fingerprint, descritor público
 * e PSBT assinada. Mnemonic, seed e chave não cruzam a bridge.
 */
class DivinoNativeVaultModule : Module() {
  private val worker = Executors.newSingleThreadExecutor()
  private var provisionPromise: Promise? = null

  private val store: SignetVaultStore
    get() {
      val context = appContext.reactContext ?: appContext.currentActivity
        ?: throw VaultException("VAULT_UNAVAILABLE", "Sem contexto nativo. Use o development build.")
      return SignetVaultStore(context.applicationContext)
    }

  /**
   * Mantém o tipo de retorno da função Expo explícito como Unit. Sem essa
   * anotação, uma lambda que apenas lança exceção é inferida como Nothing.
   */
  private fun rejectUnavailableOperation(operation: String): Unit {
    val normalized = operation.lowercase().replace(Regex("[\\s_-]"), "")
    val forbidden = listOf(
      "getseed",
      "exportprivatekey",
      "decryptsecret",
      "readmnemonic",
      "mainnet",
      "exportmnemonic",
    )
    if (forbidden.any { normalized.contains(it) } || operation.isNotEmpty()) {
      throw VaultException(
        "VAULT_FORBIDDEN",
        "A operação '$operation' não existe neste cofre e não será implementada.",
      )
    }
  }

  override fun definition() = ModuleDefinition {
    Name("DivinoNativeVault")

    AsyncFunction("getCapabilitiesAsync") {
      val current = runCatching { store.currentProfileId() }.getOrNull()
      val public = current?.let { runCatching { store.readPublic(it) }.getOrNull() }
      mapOf(
        "status" to if (public != null) "provisioned" else "unprovisioned",
        "network" to SignetVaultCrypto.NETWORK,
        "requiresDevelopmentBuild" to true,
        "usesNativeBoundary" to true,
        "supportsSecretProvisioning" to true,
        "supportsSigning" to true,
        "profileId" to public?.profileId,
        "masterFingerprint" to public?.masterFingerprint,
      )
    }

    AsyncFunction("provisionSignetProfile") { mode: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("VAULT_UNAVAILABLE", "Sem Activity. Use o development build.", null)
        return@AsyncFunction
      }
      if (store.hasProfile()) {
        promise.reject("VAULT_ALREADY_PROVISIONED", "Já existe um perfil Signet. Apague-o antes.", null)
        return@AsyncFunction
      }
      if (mode != "generate" && mode != "import") {
        promise.reject("VAULT_REFUSED", "Modo inválido.", null)
        return@AsyncFunction
      }
      provisionPromise = promise
      val target = if (mode == "generate") {
        SignetMnemonicRevealActivity::class.java
      } else {
        SignetMnemonicImportActivity::class.java
      }
      activity.startActivityForResult(Intent(activity, target), SignetMnemonicRevealActivity.REQUEST_PROVISION)
    }

    AsyncFunction("getPublicDescriptor") { profileId: String ->
      store.readPublic(profileId).toBridgeMap()
    }

    AsyncFunction("authorizeSigningIntent") { profileId: String, network: String, psbtBase64: String, promise: Promise ->
      if (network != SignetVaultCrypto.NETWORK) {
        promise.reject("VAULT_NETWORK", "Este cofre aceita apenas Signet.", null)
        return@AsyncFunction
      }
      worker.execute {
        try {
          val psbtBytes = Base64.decode(psbtBase64, Base64.DEFAULT)
          var signedBytes: ByteArray = ByteArray(0)
          var signedCount = 0
          store.withMnemonic(profileId) { words ->
            val (bytes, count) = SignetVaultCrypto.signPsbt(words, psbtBytes)
            signedBytes = bytes
            signedCount = count
          }
          val encoded = Base64.encodeToString(signedBytes, Base64.NO_WRAP)
          signedBytes.fill(0)
          promise.resolve(
            mapOf(
              "profileId" to profileId,
              "network" to SignetVaultCrypto.NETWORK,
              "psbtBase64" to encoded,
              "signedInputCount" to signedCount,
            ),
          )
        } catch (failure: VaultException) {
          promise.reject(failure.code, failure.message, failure)
        } catch (failure: Exception) {
          promise.reject("VAULT_REFUSED", "O cofre recusou assinar.", failure)
        }
      }
    }

    AsyncFunction("deleteProfile") { profileId: String ->
      store.deleteProfile(profileId)
      mapOf("deleted" to true, "profileId" to profileId)
    }

    AsyncFunction("assertOperationUnavailableAsync") { operation: String ->
      return@AsyncFunction rejectUnavailableOperation(operation)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != SignetMnemonicRevealActivity.REQUEST_PROVISION) {
        return@OnActivityResult
      }
      val pending = provisionPromise ?: return@OnActivityResult
      provisionPromise = null
      if (payload.resultCode != Activity.RESULT_OK) {
        SignetProvisionSession.clear()
        pending.reject("VAULT_CANCELLED", "Provisionamento cancelado.", null)
        return@OnActivityResult
      }
      val extras = payload.data?.extras
      val profileId = extras?.getString(SignetMnemonicRevealActivity.EXTRA_PROFILE_ID)
      val fingerprint = extras?.getString(SignetMnemonicRevealActivity.EXTRA_FINGERPRINT)
      if (profileId.isNullOrEmpty() || fingerprint.isNullOrEmpty()) {
        pending.reject("VAULT_REFUSED", "O cofre não devolveu um handle público.", null)
        return@OnActivityResult
      }
      pending.resolve(
        mapOf(
          "profileId" to profileId,
          "masterFingerprint" to fingerprint,
          "network" to SignetVaultCrypto.NETWORK,
        ),
      )
    }
  }
}
