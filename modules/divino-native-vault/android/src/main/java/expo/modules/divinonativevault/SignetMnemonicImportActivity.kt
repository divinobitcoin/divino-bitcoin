package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Restauração BIP-39 do papel. Doze campos nativos, checksum, mesmo envelope
 * do gerar. As palavras não cruzam a bridge e não entram na mensagem de erro.
 */
class SignetMnemonicImportActivity : AppCompatActivity() {
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
    // Não serializar os campos. A frase fica só nos EditText em memória.
  }

  private fun buildImportUi() = with(SignetNativeChrome) {
    val root = scrollRoot()
    val column = column()
    column.addView(eyebrow("SIGNET · MATERIAL DESCARTÁVEL"))
    column.addView(title("Importar do papel"))
    column.addView(
      body(
        "Experimental, não auditado. Digite as 12 palavras na ordem, sem passphrase. " +
          "As palavras não saem desta tela. Checksum BIP-39 inválido recusa e não guarda nada.",
      ),
    )

    val fields = (0 until 12).map { index -> wordField("${index + 1}") }
    fields.last().imeOptions = EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING or EditorInfo.IME_ACTION_DONE
    fields.forEach { column.addView(it) }

    val error = errorView()
    column.addView(error)

    val save = primaryButton("Importar para o cofre")
    save.setOnClickListener {
      error.text = ""
      val typed = readTwelve(fields)
      if (typed == null) {
        error.text = "Preencha as 12 palavras."
        return@setOnClickListener
      }
      try {
        SignetVaultCrypto.validateMnemonic(typed)
      } catch (_: VaultException) {
        error.text = "Frase BIP-39 inválida."
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

  private fun readTwelve(fields: List<EditText>): List<String>? {
    val typed = fields.map { it.text.toString().trim().lowercase() }
    if (typed.any { it.isEmpty() }) return null
    return typed
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
      } catch (_: Exception) {
        runOnUiThread {
          save.isEnabled = true
          error.text = "O cofre recusou o provisionamento."
        }
      }
    }
  }
}
