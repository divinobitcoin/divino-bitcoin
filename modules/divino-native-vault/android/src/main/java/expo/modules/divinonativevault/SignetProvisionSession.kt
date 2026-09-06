package expo.modules.divinonativevault

/**
 * Palavras de um provisionamento em curso. Vivem só na RAM deste processo.
 * Não vão para extras de Activity, SharedPreferences, disco, Bundle
 * (onSaveInstanceState) nem a bridge. Se o processo morrer, os campos
 * voltam vazios — o envelope ainda não existe.
 */
internal object SignetProvisionSession {
  @Volatile
  private var pendingWords: List<String>? = null

  @Volatile
  private var quizIndexA: Int? = null

  @Volatile
  private var quizIndexB: Int? = null

  fun begin(words: List<String>) {
    pendingWords = words.toList()
    quizIndexA = null
    quizIndexB = null
  }

  fun replaceDraft(words: List<String>) {
    pendingWords = words.toList()
  }

  fun words(): List<String>? = pendingWords

  fun beginQuiz(indexA: Int, indexB: Int) {
    quizIndexA = indexA
    quizIndexB = indexB
  }

  fun quizPair(): Pair<Int, Int>? {
    val first = quizIndexA
    val second = quizIndexB
    return if (first != null && second != null) Pair(first, second) else null
  }

  fun clear() {
    pendingWords = null
    quizIndexA = null
    quizIndexB = null
  }
}
