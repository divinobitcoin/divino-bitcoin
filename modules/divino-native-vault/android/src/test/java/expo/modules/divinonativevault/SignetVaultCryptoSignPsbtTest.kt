package expo.modules.divinonativevault

import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test

class SignetVaultCryptoSignPsbtTest {
  private val fixture = listOf(
    "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "about",
  )

  @Test
  fun garbagePsbtIsRefused() {
    try {
      SignetVaultCrypto.signPsbt(fixture, byteArrayOf(1, 2, 3, 4))
      fail("PSBT lixo deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_INVALID_PSBT", failure.code)
    }
  }

  @Test
  fun emptyPsbtIsRefused() {
    try {
      SignetVaultCrypto.signPsbt(fixture, ByteArray(0))
      fail("PSBT vazia deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_INVALID_PSBT", failure.code)
    }
  }
}
