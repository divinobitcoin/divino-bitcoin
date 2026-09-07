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
  private var provisionMode: String? = null

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

  private fun enqueueSignPsbt(profileId: String, network: String, psbtBase64: String, promise: Promise) {
    if (network != SignetVaultCrypto.NETWORK) {
      promise.reject("VAULT_NETWORK", "Este cofre aceita apenas Signet.", null)
      return
    }
    if (psbtBase64.isBlank()) {
      promise.reject("VAULT_INVALID_PSBT", "PSBT ilegível.", null)
      return
    }
    worker.execute {
      try {
        val psbtBytes = try {
          Base64.decode(psbtBase64.trim(), Base64.DEFAULT)
        } catch (_: Exception) {
          throw VaultException("VAULT_INVALID_PSBT", "PSBT ilegível.")
        }
        if (psbtBytes.isEmpty()) {
          throw VaultException("VAULT_INVALID_PSBT", "PSBT ilegível.")
        }
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
      provisionMode = mode
      SignetProvisionSession.clear()
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

    AsyncFunction("signPsbt") { profileId: String, network: String, psbtBase64: String, promise: Promise ->
      enqueueSignPsbt(profileId, network, psbtBase64, promise)
    }

    AsyncFunction("authorizeSigningIntent") { profileId: String, network: String, psbtBase64: String, promise: Promise ->
      enqueueSignPsbt(profileId, network, psbtBase64, promise)
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
      val mode = provisionMode
      provisionPromise = null
      provisionMode = null
      if (payload.resultCode != Activity.RESULT_OK) {
        SignetProvisionSession.clear()
        val reason = payload.data?.getStringExtra(SignetMnemonicRevealActivity.EXTRA_CANCEL_REASON)
        when (reason) {
          SignetMnemonicRevealActivity.CANCEL_BACK -> {
            val message = if (mode == "import") {
              "Você cancelou a importação. Nada foi guardado."
            } else {
              "Você voltou na revelação. Nada foi guardado."
            }
            pending.reject("VAULT_CANCELLED", message, null)
          }
          SignetMnemonicRevealActivity.CANCEL_PERSIST ->
            pending.reject("VAULT_PERSIST", "O Keystore recusou gravar o envelope. Nada foi guardado.", null)
          SignetMnemonicRevealActivity.CANCEL_EMPTY_SESSION, null ->
            pending.reject(
              "VAULT_CANCELLED",
              "A sessão em memória esvaziou. O envelope ainda não existe.",
              null,
            )
          else ->
            pending.reject(
              "VAULT_CANCELLED",
              "A sessão em memória esvaziou. O envelope ainda não existe.",
              null,
            )
        }
        return@OnActivityResult
      }
      val extras = payload.data?.extras
      val profileId = extras?.getString(SignetMnemonicRevealActivity.EXTRA_PROFILE_ID)
      val fingerprint = extras?.getString(SignetMnemonicRevealActivity.EXTRA_FINGERPRINT)
      if (profileId.isNullOrEmpty() || fingerprint.isNullOrEmpty()) {
        pending.reject("VAULT_REFUSED", "O cofre não devolveu um handle público.", null)
        return@OnActivityResult
      }
      if ("-" in fingerprint) {
        pending.reject("VAULT_REFUSED", "Descritor ou fingerprint com sinal. Recusando.", null)
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
