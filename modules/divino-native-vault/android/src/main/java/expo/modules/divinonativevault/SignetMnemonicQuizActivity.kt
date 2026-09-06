package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors
import kotlin.random.Random

/**
 * Quiz sem a lista visível. Dois índices sorteados nesta Activity.
 * Erro volta à revelação. Persistência só depois de acertar.
 */
class SignetMnemonicQuizActivity : AppCompatActivity() {
  private val worker = Executors.newSingleThreadExecutor()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    with(SignetNativeChrome) { lockScreen() }

    val words = SignetProvisionSession.words()
    if (words == null || words.size < 2) {
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

    val pair = SignetProvisionSession.quizPair()
    val indexA: Int
    val indexB: Int
    if (pair != null) {
      indexA = pair.first
      indexB = pair.second
    } else {
      indexA = Random.nextInt(words.size)
      var next = Random.nextInt(words.size)
      if (next == indexA) {
        next = (indexA + 1 + Random.nextInt(words.size - 1)) % words.size
      }
      indexB = next
      SignetProvisionSession.beginQuiz(indexA, indexB)
    }

    setContentView(buildQuiz(words, indexA, indexB))
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
        setResult(Activity.RESULT_CANCELED)
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
