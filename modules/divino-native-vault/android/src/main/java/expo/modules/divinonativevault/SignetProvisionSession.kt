package expo.modules.divinonativevault

import java.security.SecureRandom

/**
 * Palavras de um provisionamento em curso. Vivem só na RAM deste processo.
 * Não vão para extras de Activity, SharedPreferences, disco, Bundle
 * (onSaveInstanceState) nem a bridge. Se o processo morrer, os campos
 * voltam vazios — o envelope ainda não existe.
 *
 * Os dois índices do quiz nascem aqui, ao gerar: distintos, em 0..11,
 * SecureRandom, sem seed fixa. Não entram no envelope.
 */
internal object SignetProvisionSession {
  private const val QUIZ_BOUND = 12

  @Volatile
  private var pendingWords: List<String>? = null

  @Volatile
  private var quizIndexA: Int? = null

  @Volatile
  private var quizIndexB: Int? = null

  fun begin(words: List<String>) {
    pendingWords = words.toList()
    val pair = drawDistinctQuizIndices()
    quizIndexA = pair.first
    quizIndexB = pair.second
  }

  fun replaceDraft(words: List<String>) {
    pendingWords = words.toList()
  }

  fun words(): List<String>? = pendingWords

  fun quizPair(): Pair<Int, Int>? {
    val first = quizIndexA
    val second = quizIndexB
    if (first == null || second == null) return null
    if (first == second || first !in 0 until QUIZ_BOUND || second !in 0 until QUIZ_BOUND) {
      return null
    }
    return Pair(first, second)
  }

  fun drawDistinctQuizIndices(): Pair<Int, Int> {
    val rng = SecureRandom()
    val first = rng.nextInt(QUIZ_BOUND)
    var second = rng.nextInt(QUIZ_BOUND - 1)
    if (second >= first) {
      second += 1
    }
    return Pair(first, second)
  }

  fun clear() {
    pendingWords = null
    quizIndexA = null
    quizIndexB = null
  }
}
