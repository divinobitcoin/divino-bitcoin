package expo.modules.divinonativevault

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SignetProvisionSessionTest {
  @Test
  fun threeQuizOpensOnTheSameSessionDrawThreePairsAndKeepWords() {
    val dummy = List(12) { slot -> "w$slot" }
    SignetProvisionSession.clear()
    SignetProvisionSession.begin(dummy)
    val original = SignetProvisionSession.words()
    assertEquals(dummy, original)
    val pairs = List(3) {
      val pair = drawDistinctQuizIndices()
      assertEquals(original, SignetProvisionSession.words())
      assertNotEquals(pair.first, pair.second)
      assertTrue(pair.first in 0 until 12)
      assertTrue(pair.second in 0 until 12)
      pair
    }
    assertEquals(3, pairs.size)
    assertEquals(dummy, SignetProvisionSession.words())
  }

  @Test
  fun fiftyQuizDrawsAreNotASinglePair() {
    val pairs = (1..50).map { drawDistinctQuizIndices() }
    pairs.forEach { pair ->
      assertNotEquals(pair.first, pair.second)
      assertTrue(pair.first in 0 until 12)
      assertTrue(pair.second in 0 until 12)
    }
    assertTrue(
      "50 sorteios devolveram sempre o mesmo par ${pairs.first()}",
      pairs.toSet().size > 1,
    )
  }
}
