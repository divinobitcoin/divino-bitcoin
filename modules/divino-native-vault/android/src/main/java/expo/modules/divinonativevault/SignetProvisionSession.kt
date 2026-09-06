package expo.modules.divinonativevault

/**
 * Palavras de um provisionamento em curso. Vivem só na RAM deste processo.
 * Não vão para extras de Activity, SharedPreferences, disco, Bundle
 * (onSaveInstanceState) nem a bridge. Se o processo morrer, os campos
 * voltam vazios — o envelope ainda não existe.
 *
 * Não guarda o par do quiz. Os índices sorteiam-se cada vez que a tela
 * do quiz abre.
 */
internal object SignetProvisionSession {
  @Volatile
  private var pendingWords: List<String>? = null

  fun begin(words: List<String>) {
    pendingWords = words.toList()
  }

  fun replaceDraft(words: List<String>) {
    pendingWords = words.toList()
  }

  fun words(): List<String>? = pendingWords

  fun clear() {
    pendingWords = null
  }
}
