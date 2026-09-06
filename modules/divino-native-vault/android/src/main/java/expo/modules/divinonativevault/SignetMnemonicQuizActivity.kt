package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Quiz sem a lista visível. Sorteia o par em onCreate, cada Activity nova.
 * Erro volta à revelação com as mesmas 12 em RAM. Persistência só se acertar.
 */
class SignetMnemonicQuizActivity : AppCompatActivity() {
  private val worker = Executors.newSingleThreadExecutor()

  fun sortearPar(): Pair<Int, Int> {
    val r = java.security.SecureRandom()
    val a = r.nextInt(12)
    var b = r.nextInt(11)
    if (b >= a) b += 1
    return a to b
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    with(SignetNativeChrome) { lockScreen() }

    val words = SignetProvisionSession.words()
    if (words == null || words.size != 12) {
      setResult(
        Activity.RESULT_CANCELED,
        Intent().putExtra(
          SignetMnemonicRevealActivity.EXTRA_CANCEL_REASON,
          SignetMnemonicRevealActivity.CANCEL_EMPTY_SESSION,
        ),
      )
      finish()
      return
    }

    val par = sortearPar()
    setContentView(buildQuiz(words, par.first, par.second))
  }

  override fun onDestroy() {
    super.onDestroy()
    worker.shutdownNow()
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
  }

  private fun buildQuiz(words: List<String>, indexA: Int, indexB: Int) = with(SignetNativeChrome) {
    val root = scrollRoot()
    val column = column()
    column.addView(eyebrow("SIGNET · MATERIAL DESCARTÁVEL"))
    column.addView(title("Confirme no papel"))
    column.addView(
      body(
        "A lista não está nesta tela de propósito. Digite a palavra ${indexA + 1} e a palavra ${indexB + 1} " +
          "como você anotou. Se errar, volta à lista — o cofre ainda não guardou nada.",
      ),
    )

    val fieldA = wordField("Palavra ${indexA + 1}")
    val fieldB = wordField("Palavra ${indexB + 1}")
    column.addView(fieldA)
    column.addView(fieldB)
    val error = errorView()
    column.addView(error)

    val confirm = primaryButton("Confirmar e guardar")
    confirm.setOnClickListener {
      error.text = ""
      val typedA = fieldA.text.toString().trim().lowercase()
      val typedB = fieldB.text.toString().trim().lowercase()
      if (typedA != words[indexA] || typedB != words[indexB]) {
        Toast.makeText(
          this@SignetMnemonicQuizActivity,
          "Não confere. Volte ao papel e anote de novo.",
          Toast.LENGTH_LONG,
        ).show()
        startActivity(
          Intent(this@SignetMnemonicQuizActivity, SignetMnemonicRevealActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        )
        finish()
        return@setOnClickListener
      }
      persistAfterQuiz(words, confirm)
    }
    column.addView(confirm)

    val back = secondaryButton("Voltar à lista")
    back.setOnClickListener {
      setResult(Activity.RESULT_CANCELED)
      finish()
    }
    column.addView(back)
    root.addView(column)
    root
  }

  private fun persistAfterQuiz(
    words: List<String>,
    confirm: android.widget.Button,
  ) {
    confirm.isEnabled = false
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
}
