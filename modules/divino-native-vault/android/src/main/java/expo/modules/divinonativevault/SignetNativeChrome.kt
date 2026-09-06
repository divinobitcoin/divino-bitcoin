package expo.modules.divinonativevault

import android.content.pm.ActivityInfo
import android.graphics.Typeface
import android.os.Build
import android.text.InputFilter
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

internal object SignetNativeChrome {
  const val OBSIDIANA = 0xFF080808.toInt()
  const val GRAFITE = 0xFF131518.toInt()
  const val GRAFITE_ALTO = 0xFF1D2022.toInt()
  const val CREME = 0xFFFBF2DF.toInt()
  const val AMARELO = 0xFFF2A900.toInt()
  const val SECUNDARIO = 0xFFA8A29B.toInt()
  const val TERCIARIO = 0xFF948C82.toInt()
  const val PERIGO = 0xFFF87171.toInt()

  fun AppCompatActivity.lockScreen() {
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      window.decorView.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
    }
  }

  fun AppCompatActivity.dp(value: Int) = (value * resources.displayMetrics.density).toInt()

  fun AppCompatActivity.padded(top: Int = 0, bottom: Int = 0) = LinearLayout.LayoutParams(
    LinearLayout.LayoutParams.MATCH_PARENT,
    LinearLayout.LayoutParams.WRAP_CONTENT,
  ).apply {
    topMargin = dp(top)
    bottomMargin = dp(bottom)
  }

  fun AppCompatActivity.scrollRoot() = ScrollView(this).apply {
    setBackgroundColor(OBSIDIANA)
    layoutParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.MATCH_PARENT,
    )
  }

  fun AppCompatActivity.column() = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(20), dp(28), dp(20), dp(40))
    setBackgroundColor(OBSIDIANA)
  }

  fun AppCompatActivity.eyebrow(text: String) = TextView(this).apply {
    this.text = text
    setTextColor(AMARELO)
    textSize = 11f
    setTypeface(typeface, Typeface.BOLD)
    letterSpacing = 0.08f
    layoutParams = padded(bottom = 8)
  }

  fun AppCompatActivity.title(text: String) = TextView(this).apply {
    this.text = text
    setTextColor(CREME)
    textSize = 28f
    setTypeface(typeface, Typeface.BOLD)
    layoutParams = padded(bottom = 12)
  }

  fun AppCompatActivity.body(text: String) = TextView(this).apply {
    this.text = text
    setTextColor(SECUNDARIO)
    textSize = 14f
    setLineSpacing(0f, 1.25f)
    layoutParams = padded(bottom = 16)
  }

  fun AppCompatActivity.errorView() = TextView(this).apply {
    setTextColor(PERIGO)
    textSize = 13f
    layoutParams = padded(top = 8, bottom = 8)
  }

  fun AppCompatActivity.wordField(hint: String) = EditText(this).apply {
    this.hint = hint
    setHintTextColor(TERCIARIO)
    setTextColor(CREME)
    setBackgroundColor(GRAFITE_ALTO)
    setPadding(dp(12), dp(14), dp(12), dp(14))
    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
    imeOptions = EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING or EditorInfo.IME_ACTION_NEXT
    filters = arrayOf(InputFilter.LengthFilter(16))
    isSingleLine = true
    isSaveEnabled = false
    importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      setAutofillHints()
    }
    layoutParams = padded(bottom = 8)
  }

  fun AppCompatActivity.primaryButton(label: String) = Button(this).apply {
    text = label
    setTextColor(OBSIDIANA)
    setBackgroundColor(AMARELO)
    layoutParams = padded(top = 12)
  }

  fun AppCompatActivity.secondaryButton(label: String) = Button(this).apply {
    text = label
    setTextColor(CREME)
    setBackgroundColor(GRAFITE)
    layoutParams = padded(top = 8)
  }
}
