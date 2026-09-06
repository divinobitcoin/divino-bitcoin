package expo.modules.divinonativevault

import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SignetProvisionSessionTest {
  @Test
  fun fiftyNewSessionsDoNotShareASingleQuizPair() {
    val dummy = List(12) { slot -> "w$slot" }
    val pairs = (1..50).map {
      SignetProvisionSession.clear()
      SignetProvisionSession.begin(dummy)
      val pair = SignetProvisionSession.quizPair()
      assertNotNull(pair)
      val first = pair!!.first
      val second = pair.second
      assertTrue(first in 0 until 12)
      assertTrue(second in 0 until 12)
      assertNotEquals(first, second)
      pair
    }
    assertTrue(
      "50 sessões novas devolveram sempre o mesmo par ${pairs.first()}",
      pairs.toSet().size > 1,
    )
  }
}
