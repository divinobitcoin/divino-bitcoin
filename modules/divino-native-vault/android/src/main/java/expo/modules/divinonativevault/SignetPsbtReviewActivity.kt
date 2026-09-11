package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Base64
import android.view.View
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * Última palavra antes de assinar. Descodifica a PSBT só com a fingerprint
 * pública já guardada — sem mnemonic, sem seed — e mostra rede, destino,
 * sats e taxa em português. `signPsbt` só assina depois deste ecrã aparecer
 * e o usuário tocar em "Assinar".
 */
class SignetPsbtReviewActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    with(SignetNativeChrome) { lockScreen() }

    val profileId = intent.getStringExtra(EXTRA_PROFILE_ID)
    val network = intent.getStringExtra(EXTRA_NETWORK)
    val psbtBase64 = intent.getStringExtra(EXTRA_PSBT_BASE64)
    val expectedFingerprint = intent.getStringExtra(EXTRA_EXPECTED_FINGERPRINT)

    if (profileId.isNullOrEmpty() || psbtBase64.isNullOrEmpty() || expectedFingerprint.isNullOrEmpty()) {
      cancel("VAULT_INVALID_PSBT", "A revisão não recebeu a PSBT esperada.")
      return
    }
    if (network != SignetVaultCrypto.NETWORK) {
      cancel("VAULT_NETWORK", "Este cofre revisa apenas Signet.")
      return
    }

    val review = try {
      val psbtBytes = Base64.decode(psbtBase64.trim(), Base64.DEFAULT)
      if (psbtBytes.isEmpty()) throw VaultException("VAULT_INVALID_PSBT", "PSBT ilegível.")
      SignetVaultCrypto.reviewPsbt(expectedFingerprint, psbtBytes)
    } catch (failure: VaultException) {
      showRefusal(failure)
      return
    } catch (_: Exception) {
      showRefusal(VaultException("VAULT_INVALID_PSBT", "PSBT ilegível."))
      return
    }

    setContentView(buildReview(review, profileId, network, psbtBase64))
    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          cancel(CANCEL_BACK, "Revisão cancelada. Nada foi assinado.")
        }
      },
    )
  }

  private fun showRefusal(failure: VaultException) {
    setContentView(buildRefusal(failure))
    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          cancel(failure.code, failure.message ?: "Recusado.")
        }
      },
    )
  }

  private fun cancel(reason: String, message: String) {
    setResult(
      Activity.RESULT_CANCELED,
      Intent()
        .putExtra(EXTRA_CANCEL_REASON, reason)
        .putExtra(EXTRA_CANCEL_MESSAGE, message),
    )
    finish()
  }

  private fun approve(profileId: String, network: String, psbtBase64: String) {
    setResult(
      Activity.RESULT_OK,
      Intent()
        .putExtra(EXTRA_PROFILE_ID, profileId)
        .putExtra(EXTRA_NETWORK, network)
        .putExtra(EXTRA_PSBT_BASE64, psbtBase64),
    )
    finish()
  }

  private fun buildReview(
    review: SignetVaultCrypto.PsbtReview,
    profileId: String,
    network: String,
    psbtBase64: String,
  ): View {
    with(SignetNativeChrome) {
      val root = scrollRoot()
      val column = column()
      column.addView(eyebrow("SIGNET · REVISÃO ANTES DE ASSINAR"))
      column.addView(title("Confira antes de assinar"))
      column.addView(body("Rede: Signet"))
      column.addView(body("Fingerprint desta carteira: ${review.masterFingerprint}"))
      column.addView(body("Entradas a assinar: ${review.inputCount}"))

      review.outputs.forEach { output ->
        column.addView(body("Destino: ${output.address}\n${output.sats} sats"))
      }
      column.addView(body("Taxa: ${review.feeSats} sats"))
      column.addView(body("Estado: NÃO ASSINADO"))

      val sign = primaryButton("Assinar")
      sign.setOnClickListener { approve(profileId, network, psbtBase64) }
      column.addView(sign)

      val cancelButton = secondaryButton("Cancelar")
      cancelButton.setOnClickListener { cancel(CANCEL_BACK, "Revisão cancelada. Nada foi assinado.") }
      column.addView(cancelButton)

      root.addView(column)
      return root
    }
  }

  private fun buildRefusal(failure: VaultException): View {
    with(SignetNativeChrome) {
      val root = scrollRoot()
      val column = column()
      column.addView(eyebrow("SIGNET · RECUSADO"))
      column.addView(title("O cofre recusou"))
      column.addView(body(failure.message ?: "PSBT recusada."))
      column.addView(body("Nada foi assinado."))

      val backButton = secondaryButton("Voltar")
      backButton.setOnClickListener { cancel(failure.code, failure.message ?: "Recusado.") }
      column.addView(backButton)

      root.addView(column)
      return root
    }
  }

  companion object {
    const val REQUEST_PSBT_REVIEW = 0xD1C0
    const val EXTRA_PROFILE_ID = "profileId"
    const val EXTRA_NETWORK = "network"
    const val EXTRA_PSBT_BASE64 = "psbtBase64"
    const val EXTRA_EXPECTED_FINGERPRINT = "expectedFingerprint"
    const val EXTRA_CANCEL_REASON = "cancelReason"
    const val EXTRA_CANCEL_MESSAGE = "cancelMessage"
    const val CANCEL_BACK = "VAULT_CANCELLED"
  }
}
