package expo.modules.divinonativevault

/**
 * Palavras de um provisionamento em curso. Vivem só na RAM deste processo.
 * Não vão para extras de Activity, SharedPreferences, disco nem a bridge.
 * Se o processo morrer entre a revelação e o quiz, o fluxo recomeça — o
 * envelope ainda não existe.
 */
internal object SignetProvisionSession {
  @Volatile
  private var pendingWords: List<String>? = null

  fun begin(words: List<String>) {
    pendingWords = words.toList()
  }

  fun words(): List<String>? = pendingWords

  fun clear() {
    pendingWords = null
  }
}
