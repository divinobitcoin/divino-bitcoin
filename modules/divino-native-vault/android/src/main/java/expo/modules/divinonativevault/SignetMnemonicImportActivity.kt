package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Restauração BIP-39 do papel. Doze campos nativos, checksum, mesmo envelope
 * do gerar. As palavras não cruzam a bridge, não entram na mensagem de erro
 * e não vão para Bundle, extras, SharedPreferences nem disco. Rascunho só
 * em RAM (SignetProvisionSession). Processo morto = campos vazios.
 */
class SignetMnemonicImportActivity : AppCompatActivity() {
  private val worker = Executors.newSingleThreadExecutor()
  private lateinit var fields: List<EditText>

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    with(SignetNativeChrome) { lockScreen() }
    setContentView(buildImportUi())
    restoreDraft()
    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          cancelImport()
        }
      },
    )
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
    column.addView(title("Importar do papel"))
    column.addView(
      body(
        "Experimental, não auditado. Digite as 12 palavras na ordem, sem passphrase. " +
          "As palavras não saem desta tela. Checksum BIP-39 inválido recusa e não guarda nada.",
      ),
    )

    fields = (0 until 12).map { index -> wordField("${index + 1}") }
    fields.last().imeOptions = EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING or EditorInfo.IME_ACTION_DONE
    fields.forEach { field ->
      field.addTextChangedListener(DraftWatcher())
      column.addView(field)
    }

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
      persist(typed, save)
    }
    column.addView(save)

    val cancel = secondaryButton("Cancelar")
    cancel.setOnClickListener { cancelImport() }
    column.addView(cancel)
    root.addView(column)
    root
  }

  private fun restoreDraft() {
    val draft = SignetProvisionSession.words() ?: return
    if (draft.size != 12) return
    fields.forEachIndexed { index, field ->
      val word = draft[index]
      if (field.text.isEmpty() && word.isNotEmpty()) {
        field.setText(word)
      }
    }
  }

  private fun captureDraft() {
    if (!::fields.isInitialized) return
    SignetProvisionSession.replaceDraft(fields.map { it.text.toString() })
  }

  private fun cancelImport() {
    SignetProvisionSession.clear()
    setResult(
      Activity.RESULT_CANCELED,
      Intent().putExtra(SignetMnemonicRevealActivity.EXTRA_CANCEL_REASON, SignetMnemonicRevealActivity.CANCEL_BACK),
    )
    finish()
  }

  private fun readTwelve(fields: List<EditText>): List<String>? {
    val typed = fields.map { it.text.toString().trim().lowercase() }
    if (typed.any { it.isEmpty() }) return null
    return typed
  }

  private fun persist(
    words: List<String>,
    save: android.widget.Button,
  ) {
    save.isEnabled = false
    worker.execute {
      try {
        val stored = SignetVaultStore(applicationContext).persistNewProfile(words)
        SignetProvisionSession.clear()
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
          setResult(
            Activity.RESULT_CANCELED,
            Intent().putExtra(
              SignetMnemonicRevealActivity.EXTRA_CANCEL_REASON,
              SignetMnemonicRevealActivity.CANCEL_PERSIST,
            ),
          )
          finish()
        }
      }
    }
  }

  private inner class DraftWatcher : TextWatcher {
    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
    override fun afterTextChanged(s: Editable?) {
      captureDraft()
    }
  }
}
