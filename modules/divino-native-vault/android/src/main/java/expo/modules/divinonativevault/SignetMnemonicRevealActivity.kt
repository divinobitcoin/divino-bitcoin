package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.view.View
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * Só revela as 12 palavras. Não persiste, não devolve fingerprint, não copia.
 * O envelope só nasce se o quiz passar. Palavras só na RAM da sessão.
 */
class SignetMnemonicRevealActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    with(SignetNativeChrome) { lockScreen() }

    if (SignetProvisionSession.words() == null) {
      SignetProvisionSession.begin(SignetVaultCrypto.generateMnemonic())
    }
    val words = SignetProvisionSession.words()
    if (words == null) {
      setResult(
        Activity.RESULT_CANCELED,
        Intent().putExtra(EXTRA_CANCEL_REASON, CANCEL_EMPTY_SESSION),
      )
      finish()
      return
    }
    setContentView(buildReveal(words))
    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          cancelReveal()
        }
      },
    )
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
  }

  @Deprecated("startActivityForResult until Expo modules expose the Activity Result API.")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode != REQUEST_QUIZ) return
    if (resultCode == Activity.RESULT_OK && data != null) {
      setResult(Activity.RESULT_OK, data)
      finish()
      return
    }
    val reason = data?.getStringExtra(EXTRA_CANCEL_REASON)
    if (reason == CANCEL_EMPTY_SESSION || reason == CANCEL_PERSIST) {
      setResult(Activity.RESULT_CANCELED, data)
      finish()
    }
    // Quiz errou ou voltou: as 12 ficam na RAM. O próximo quiz é outra Activity.
  }

  private fun cancelReveal() {
    SignetProvisionSession.clear()
    setResult(Activity.RESULT_CANCELED, Intent().putExtra(EXTRA_CANCEL_REASON, CANCEL_BACK))
    finish()
  }

  private fun buildReveal(words: List<String>): View {
    with(SignetNativeChrome) {
      val root = scrollRoot()
      val column = column()
      column.addView(eyebrow("SIGNET · MATERIAL DESCARTÁVEL"))
      column.addView(title("Anote estas palavras"))
      column.addView(
        body(
          "Experimental, não auditado. Esta frase é a única recuperação. " +
            "Escreva em papel. Não fotografe, não envie, não copie. " +
            "O cofre ainda não guardou nada — só depois do quiz.",
        ),
      )

      val grid = GridLayout(this@SignetMnemonicRevealActivity).apply {
        columnCount = 2
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        )
      }
      words.forEachIndexed { index, word ->
        grid.addView(wordChip(index + 1, word))
      }
      column.addView(grid)

      val wrote = primaryButton("Anotei no papel")
      wrote.setOnClickListener {
        startActivityForResult(
          Intent(this@SignetMnemonicRevealActivity, SignetMnemonicQuizActivity::class.java),
          REQUEST_QUIZ,
        )
      }
      column.addView(wrote)

      val cancel = secondaryButton("Cancelar")
      cancel.setOnClickListener { cancelReveal() }
      column.addView(cancel)
      root.addView(column)
      return root
    }
  }

  private fun wordChip(number: Int, word: String) = TextView(this).apply {
    text = "$number  $word"
    setTextColor(SignetNativeChrome.CREME)
    textSize = 16f
    setTypeface(Typeface.MONOSPACE)
    setTextIsSelectable(false)
    isSaveEnabled = false
    setPadding(
      with(SignetNativeChrome) { dp(10) },
      with(SignetNativeChrome) { dp(10) },
      with(SignetNativeChrome) { dp(10) },
      with(SignetNativeChrome) { dp(10) },
    )
    setBackgroundColor(SignetNativeChrome.GRAFITE)
    layoutParams = GridLayout.LayoutParams().apply {
      width = 0
      height = GridLayout.LayoutParams.WRAP_CONTENT
      columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
      val m = with(SignetNativeChrome) { dp(4) }
      setMargins(m, m, m, m)
    }
  }

  companion object {
    const val REQUEST_PROVISION = 0xD1B0
    const val REQUEST_QUIZ = 0xD1B1
    const val EXTRA_PROFILE_ID = "profileId"
    const val EXTRA_FINGERPRINT = "masterFingerprint"
    const val EXTRA_CANCEL_REASON = "cancelReason"
    const val CANCEL_BACK = "back"
    const val CANCEL_EMPTY_SESSION = "empty_session"
    const val CANCEL_PERSIST = "persist"
  }
}
