package expo.modules.divinonativevault

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.text.InputFilter
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors
import kotlin.random.Random

/**
 * Tela nativa de criação/importação. As palavras nunca cruzam a bridge
 * JavaScript: esta Activity persiste o envelope e devolve só o handle público.
 */
class SignetMnemonicActivity : AppCompatActivity() {
  private val worker = Executors.newSingleThreadExecutor()
  private var generatedWords: List<String> = emptyList()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      window.decorView.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
    }

    val mode = intent.getStringExtra(EXTRA_MODE) ?: MODE_GENERATE
    when (mode) {
      MODE_IMPORT -> setContentView(buildImportUi())
      else -> {
        generatedWords = SignetVaultCrypto.generateMnemonic()
        setContentView(buildGenerateUi(generatedWords))
      }
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    worker.shutdownNow()
  }

  override fun onSaveInstanceState(outState: Bundle) {
    // Não serializar as palavras. Recriar a tela se o sistema matar a Activity.
    super.onSaveInstanceState(outState)
  }

  private fun buildGenerateUi(words: List<String>): View {
    val confirmA = Random.nextInt(words.size)
    var confirmB = Random.nextInt(words.size)
    if (confirmB == confirmA) {
      confirmB = (confirmA + 7) % words.size
    }

    val root = scrollRoot()
    val column = column()
    column.addView(eyebrow("SIGNET · MATERIAL DESCARTÁVEL"))
    column.addView(title("Anote estas palavras"))
    column.addView(
      body(
        "Experimental, não auditado. Esta frase é a única recuperação. " +
          "Escreva em papel. Não fotografe, não envie, não copie para a nuvem. " +
          "O aplicativo não volta a mostrá-la.",
      ),
    )

    val grid = GridLayout(this).apply {
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

    val wroteDown = CheckBox(this).apply {
      text = "Escrevi as 12 palavras em papel, fora deste aparelho."
      setTextColor(CREME)
      textSize = 14f
      layoutParams = padded()
    }
    column.addView(wroteDown)

    column.addView(body("Confirme a palavra ${confirmA + 1} e a palavra ${confirmB + 1}."))
    val fieldA = wordField("Palavra ${confirmA + 1}")
    val fieldB = wordField("Palavra ${confirmB + 1}")
    column.addView(fieldA)
    column.addView(fieldB)

    val error = errorView()
    column.addView(error)

    val save = primaryButton("Guardar no cofre")
    save.setOnClickListener {
      error.text = ""
      if (!wroteDown.isChecked) {
        error.text = "Marque que anotou as palavras antes de guardar."
        return@setOnClickListener
      }
      if (fieldA.text.toString().trim().lowercase() != words[confirmA] ||
        fieldB.text.toString().trim().lowercase() != words[confirmB]
      ) {
        error.text = "A confirmação não confere. As palavras não foram guardadas."
        return@setOnClickListener
      }
      persist(words, save, error)
    }
    column.addView(save)
    column.addView(cancelButton())
    root.addView(column)
    return root
  }

  private fun buildImportUi(): View {
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
    column.addView(cancelButton())
    root.addView(column)
    return root
  }

  private fun persist(words: List<String>, save: Button, error: TextView) {
    save.isEnabled = false
    worker.execute {
      try {
        val stored = SignetVaultStore(applicationContext).persistNewProfile(words)
        runOnUiThread {
          val data = Intent().apply {
            putExtra(EXTRA_PROFILE_ID, stored.profileId)
            putExtra(EXTRA_FINGERPRINT, stored.masterFingerprint)
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

  private fun scrollRoot() = ScrollView(this).apply {
    setBackgroundColor(OBSIDIANA)
    layoutParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.MATCH_PARENT,
    )
  }

  private fun column() = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(20), dp(28), dp(20), dp(40))
    setBackgroundColor(OBSIDIANA)
  }

  private fun eyebrow(text: String) = TextView(this).apply {
    this.text = text
    setTextColor(AMARELO)
    textSize = 11f
    setTypeface(typeface, Typeface.BOLD)
    letterSpacing = 0.08f
    layoutParams = padded(bottom = 8)
  }

  private fun title(text: String) = TextView(this).apply {
    this.text = text
    setTextColor(CREME)
    textSize = 28f
    setTypeface(typeface, Typeface.BOLD)
    layoutParams = padded(bottom = 12)
  }

  private fun body(text: String) = TextView(this).apply {
    this.text = text
    setTextColor(SECUNDARIO)
    textSize = 14f
    setLineSpacing(0f, 1.25f)
    layoutParams = padded(bottom = 16)
  }

  private fun errorView() = TextView(this).apply {
    setTextColor(PERIGO)
    textSize = 13f
    layoutParams = padded(top = 8, bottom = 8)
  }

  private fun wordChip(number: Int, word: String) = TextView(this).apply {
    text = "$number  $word"
    setTextColor(CREME)
    textSize = 16f
    setTypeface(Typeface.MONOSPACE)
    setPadding(dp(10), dp(10), dp(10), dp(10))
    setBackgroundColor(GRAFITE)
    layoutParams = GridLayout.LayoutParams().apply {
      width = 0
      height = GridLayout.LayoutParams.WRAP_CONTENT
      columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
      setMargins(dp(4), dp(4), dp(4), dp(4))
    }
  }

  private fun wordField(hint: String) = EditText(this).apply {
    this.hint = hint
    setHintTextColor(TERCIARIO)
    setTextColor(CREME)
    setBackgroundColor(GRAFITE_ALTO)
    setPadding(dp(12), dp(14), dp(12), dp(14))
    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
    imeOptions = EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING or EditorInfo.IME_ACTION_NEXT
    filters = arrayOf(InputFilter.LengthFilter(16))
    isSingleLine = true
    importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      setAutofillHints()
    }
    layoutParams = padded(bottom = 8)
  }

  private fun primaryButton(label: String) = Button(this).apply {
    text = label
    setTextColor(OBSIDIANA)
    setBackgroundColor(AMARELO)
    layoutParams = padded(top = 12)
  }

  private fun cancelButton() = Button(this).apply {
    text = "Cancelar"
    setTextColor(CREME)
    setBackgroundColor(GRAFITE)
    setOnClickListener {
      setResult(Activity.RESULT_CANCELED)
      finish()
    }
    layoutParams = padded(top = 8)
  }

  private fun padded(top: Int = 0, bottom: Int = 0) = LinearLayout.LayoutParams(
    LinearLayout.LayoutParams.MATCH_PARENT,
    LinearLayout.LayoutParams.WRAP_CONTENT,
  ).apply {
    topMargin = dp(top)
    bottomMargin = dp(bottom)
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

  companion object {
    const val EXTRA_MODE = "mode"
    const val EXTRA_PROFILE_ID = "profileId"
    const val EXTRA_FINGERPRINT = "masterFingerprint"
    const val MODE_GENERATE = "generate"
    const val MODE_IMPORT = "import"
    const val REQUEST_PROVISION = 0xD1B0

    private const val OBSIDIANA = 0xFF080808.toInt()
    private const val GRAFITE = 0xFF131518.toInt()
    private const val GRAFITE_ALTO = 0xFF1D2022.toInt()
    private const val CREME = 0xFFFBF2DF.toInt()
    private const val AMARELO = 0xFFF2A900.toInt()
    private const val SECUNDARIO = 0xFFA8A29B.toInt()
    private const val TERCIARIO = 0xFF948C82.toInt()
    private const val PERIGO = 0xFFF87171.toInt()
  }
}
