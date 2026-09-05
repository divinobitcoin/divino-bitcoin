package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Importação de frase de teste. Geração usa revelação + quiz em Activities
 * distintas; esta tela só recebe palavras digitadas aqui, nunca da bridge.
 */
class SignetMnemonicActivity : AppCompatActivity() {
  private val worker = Executors.newSingleThreadExecutor()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    with(SignetNativeChrome) { lockScreen() }
    setContentView(buildImportUi())
  }

  override fun onDestroy() {
    super.onDestroy()
    worker.shutdownNow()
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
  }

  private fun buildImportUi() = with(SignetNativeChrome) {
    val root = scrollRoot()
    val column = column()
    column.addView(eyebrow("SIGNET · MATERIAL DESCARTÁVEL"))
    column.addView(title("Importar frase de teste"))
    column.addView(
      body(
        "Experimental, não auditado. Digite uma frase descartável de 12 ou 24 palavras. " +
          "Nunca importe uma seed com valor. As palavras não saem desta tela nativa.",
      ),
    )

    val fields = (0 until 24).map { index -> wordField("${index + 1}") }
    fields.forEach { column.addView(it) }

    val error = errorView()
    column.addView(error)

    val save = primaryButton("Importar para o cofre")
    save.setOnClickListener {
      error.text = ""
      val typed = fields.map { it.text.toString().trim().lowercase() }.filter { it.isNotEmpty() }
      try {
        SignetVaultCrypto.validateMnemonic(typed)
      } catch (failure: VaultException) {
        error.text = failure.message
        return@setOnClickListener
      }
      persist(typed, save, error)
    }
    column.addView(save)

    val cancel = secondaryButton("Cancelar")
    cancel.setOnClickListener {
      setResult(Activity.RESULT_CANCELED)
      finish()
    }
    column.addView(cancel)
    root.addView(column)
    root
  }

  private fun persist(
    words: List<String>,
    save: android.widget.Button,
    error: android.widget.TextView,
  ) {
    save.isEnabled = false
    worker.execute {
      try {
        val stored = SignetVaultStore(applicationContext).persistNewProfile(words)
        runOnUiThread {
          val data = Intent().apply {
            putExtra(SignetMnemonicRevealActivity.EXTRA_PROFILE_ID, stored.profileId)
            putExtra(SignetMnemonicRevealActivity.EXTRA_FINGERPRINT, stored.masterFingerprint)
          }
          setResult(Activity.RESULT_OK, data)
          finish()
        }
      } catch (failure: Exception) {
        runOnUiThread {
          save.isEnabled = true
          error.text = if (failure is VaultException) failure.message else "O cofre recusou o provisionamento."
        }
      }
    }
  }

  companion object {
    const val EXTRA_MODE = "mode"
    const val MODE_GENERATE = "generate"
    const val MODE_IMPORT = "import"
  }
}
