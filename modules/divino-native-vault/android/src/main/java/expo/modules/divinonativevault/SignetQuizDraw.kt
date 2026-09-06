package expo.modules.divinonativevault

import java.security.SecureRandom

private const val QUIZ_BOUND = 12

/**
 * Dois índices distintos em 0..11. Sem estado. Quem chama é o onCreate
 * do quiz, cada vez que a tela abre.
 */
internal fun drawDistinctQuizIndices(): Pair<Int, Int> {
  val rng = SecureRandom()
  val mix = ByteArray(32)
  rng.nextBytes(mix)
  mix.fill(0)
  val first = uniformQuizIndex(rng, QUIZ_BOUND)
  var second = uniformQuizIndex(rng, QUIZ_BOUND - 1)
  if (second >= first) {
    second += 1
  }
  return Pair(first, second)
}

private fun uniformQuizIndex(rng: SecureRandom, bound: Int): Int {
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