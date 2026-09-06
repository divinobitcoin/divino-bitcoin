package expo.modules.divinonativevault

import java.security.SecureRandom

/**
 * Palavras de um provisionamento em curso. Vivem só na RAM deste processo.
 * Não vão para extras de Activity, SharedPreferences, disco, Bundle
 * (onSaveInstanceState) nem a bridge. Se o processo morrer, os campos
 * voltam vazios — o envelope ainda não existe.
 *
 * Os dois índices do quiz nascem em begin(), quando a mnemonic nasce, e
 * de novo em reshuffleQuiz() se o quiz falhar — a mnemonic não muda.
 * Distintos, em 0..11, via SecureRandom.nextBytes. Não entram no envelope.
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

  fun reshuffleQuiz() {
    val current = pendingWords
    if (current == null || current.size != QUIZ_BOUND) return
    val pair = drawDistinctQuizIndices()
    quizIndexA = pair.first
    quizIndexB = pair.second
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

  fun clear() {
    pendingWords = null
    quizIndexA = null
    quizIndexB = null
  }

  private fun drawDistinctQuizIndices(): Pair<Int, Int> {
    val rng = SecureRandom()
    val mix = ByteArray(32)
    rng.nextBytes(mix)
    mix.fill(0)
    val first = uniformIndex(rng, QUIZ_BOUND)
    var second = uniformIndex(rng, QUIZ_BOUND - 1)
    if (second >= first) {
      second += 1
    }
    return Pair(first, second)
  }

  private fun uniformIndex(rng: SecureRandom, bound: Int): Int {
    val buf = ByteArray(4)
    while (true) {
      rng.nextBytes(buf)
      val unsigned = (
        ((buf[0].toInt() and 0xff) shl 24)
          or ((buf[1].toInt() and 0xff) shl 16)
          or ((buf[2].toInt() and 0xff) shl 8)
          or (buf[3].toInt() and 0xff)
        ).toUInt()
      val limit = UInt.MAX_VALUE - (UInt.MAX_VALUE % bound.toUInt())
      if (unsigned < limit) {
        return (unsigned % bound.toUInt()).toInt()
      }
    }
  }
}
