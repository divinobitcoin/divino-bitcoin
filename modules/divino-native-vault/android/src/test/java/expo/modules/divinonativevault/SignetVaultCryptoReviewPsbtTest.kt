package expo.modules.divinonativevault

import fr.acinq.bitcoin.Bitcoin
import fr.acinq.bitcoin.Block
import fr.acinq.bitcoin.ByteVector
import fr.acinq.bitcoin.DeterministicWallet
import fr.acinq.bitcoin.KeyPath
import fr.acinq.bitcoin.MnemonicCode
import fr.acinq.bitcoin.OutPoint
import fr.acinq.bitcoin.Satoshi
import fr.acinq.bitcoin.Script
import fr.acinq.bitcoin.SigHash
import fr.acinq.bitcoin.SigVersion
import fr.acinq.bitcoin.Transaction
import fr.acinq.bitcoin.TxHash
import fr.acinq.bitcoin.TxIn
import fr.acinq.bitcoin.TxOut
import fr.acinq.bitcoin.ByteVector32
import fr.acinq.bitcoin.psbt.KeyPathWithMaster
import fr.acinq.bitcoin.psbt.Psbt
import fr.acinq.bitcoin.updated
import fr.acinq.bitcoin.utils.Either
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * Revisão nativa da PSBT (Kotlin) antes de `signPsbt`. Testa só o núcleo
 * puro em `SignetVaultCrypto.reviewPsbt`, sem Activity e sem seed real —
 * fixture BIP-39 pública, valor econômico zero.
 */
class SignetVaultCryptoReviewPsbtTest {
  private val fixture = listOf(
    "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "about",
  )

  private val master = DeterministicWallet.generate(MnemonicCode.toSeed(fixture, ""))
  private val masterFingerprint = master.fingerprint()
  private val fingerprintHex = SignetVaultCrypto.fingerprintHex(masterFingerprint)
  private val account = master.derivePrivateKey(SignetVaultCrypto.ACCOUNT_PATH)
  private val inputKey = account.derivePrivateKey(0L).derivePrivateKey(0L)
  private val recipientKey = account.derivePrivateKey(0L).derivePrivateKey(1L)

  private fun buildBasePsbt(coinType: Long = 1L + HARDENED): Pair<Psbt, TxOut> {
    val inputScript = Script.write(Script.pay2wpkh(inputKey.publicKey))
    val inputAmount = Satoshi(100_000L)
    val txOutInput = TxOut(inputAmount, ByteVector(inputScript))

    val recipientScript = Script.write(Script.pay2wpkh(recipientKey.publicKey))
    val txOutRecipient = TxOut(Satoshi(40_000L), ByteVector(recipientScript))

    val outPoint = OutPoint(TxHash(ByteVector32.Zeroes), 0L)
    val txIn = TxIn(outPoint, 0xffffffffL)
    val unsignedTx = Transaction(2L, listOf(txIn), listOf(txOutRecipient), 0L)

    val keyPath = KeyPath(listOf(84L + HARDENED, coinType, 0L + HARDENED, 0L, 0L))
    val derivationPaths = mapOf(inputKey.publicKey to KeyPathWithMaster(masterFingerprint, keyPath))

    val updated = basePsbt(unsignedTx).updateWitnessInput(
      outPoint,
      txOutInput,
      derivationPaths = derivationPaths,
    )
    val psbt = when (updated) {
      is Either.Right -> updated.value
      is Either.Left -> fail("Falha ao montar fixture de PSBT: ${updated.value}") as Nothing
    }
    return Pair(psbt, txOutInput)
  }

  private fun basePsbt(tx: Transaction) = Psbt(tx)

  private fun serialize(psbt: Psbt): ByteArray = Psbt.write(psbt).toByteArray()

  @Test
  fun garbagePsbtIsRefused() {
    try {
      SignetVaultCrypto.reviewPsbt(fingerprintHex, byteArrayOf(1, 2, 3, 4))
      fail("PSBT lixo deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_INVALID_PSBT", failure.code)
    }
  }

  @Test
  fun emptyPsbtIsRefused() {
    try {
      SignetVaultCrypto.reviewPsbt(fingerprintHex, ByteArray(0))
      fail("PSBT vazia deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_INVALID_PSBT", failure.code)
    }
  }

  @Test
  fun validSignetPsbtIsReviewedWithOutputsAndFee() {
    val (psbt, txOutInput) = buildBasePsbt()
    val review = SignetVaultCrypto.reviewPsbt(fingerprintHex, serialize(psbt))

    assertEquals(fingerprintHex, review.masterFingerprint)
    assertEquals(1, review.inputCount)
    assertEquals(1, review.outputs.size)
    assertEquals(40_000L, review.outputs[0].sats)
    assertTrue(review.outputs[0].address.startsWith("tb1"))
    val expectedAddress = Bitcoin.computeP2WpkhAddress(recipientKey.publicKey, Block.SignetGenesisBlock.hash)
    assertEquals(expectedAddress, review.outputs[0].address)
    assertEquals(txOutInput.amount.sat - 40_000L, review.feeSats)
  }

  @Test
  fun mainnetCoinTypeIsRefused() {
    val (psbt, _) = buildBasePsbt(coinType = 0L + HARDENED)
    try {
      SignetVaultCrypto.reviewPsbt(fingerprintHex, serialize(psbt))
      fail("Caminho Mainnet deveria ser recusado.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_NETWORK", failure.code)
    }
  }

  @Test
  fun otherFingerprintIsRefused() {
    val (psbt, _) = buildBasePsbt()
    try {
      SignetVaultCrypto.reviewPsbt("00000000", serialize(psbt))
      fail("Fingerprint diferente deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_FINGERPRINT", failure.code)
    }
  }

  @Test
  fun alreadySignedByUsIsRefused() {
    val (psbt, txOutInput) = buildBasePsbt()
    val input = psbt.inputs[0] as fr.acinq.bitcoin.psbt.Input.WitnessInput.PartiallySignedWitnessInput
    val signature = ByteVector(
      Transaction.signInput(
        psbt.global.tx,
        0,
        Script.pay2pkh(inputKey.publicKey),
        SigHash.SIGHASH_ALL,
        txOutInput.amount,
        SigVersion.SIGVERSION_WITNESS_V0,
        inputKey.privateKey,
      ),
    )
    val signedInput = input.copy(partialSigs = input.partialSigs + (inputKey.publicKey to signature))
    val signedPsbt = psbt.copy(inputs = psbt.inputs.updated(0, signedInput))

    try {
      SignetVaultCrypto.reviewPsbt(fingerprintHex, serialize(signedPsbt))
      fail("Entrada já assinada por nós deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_ALREADY_SIGNED", failure.code)
    }
  }

  @Test
  fun nonSignetOutputIsRefused() {
    val inputScript = Script.write(Script.pay2wpkh(inputKey.publicKey))
    val txOutInput = TxOut(Satoshi(100_000L), ByteVector(inputScript))

    // P2PKH legado: decodifica como endereço base58, nunca "tb1".
    val legacyScript = Script.write(Script.pay2pkh(recipientKey.publicKey))
    val txOutRecipient = TxOut(Satoshi(40_000L), ByteVector(legacyScript))

    val outPoint = OutPoint(TxHash(ByteVector32.Zeroes), 0L)
    val txIn = TxIn(outPoint, 0xffffffffL)
    val unsignedTx = Transaction(2L, listOf(txIn), listOf(txOutRecipient), 0L)
    val keyPath = KeyPath(listOf(84L + HARDENED, 1L + HARDENED, 0L + HARDENED, 0L, 0L))
    val derivationPaths = mapOf(inputKey.publicKey to KeyPathWithMaster(masterFingerprint, keyPath))

    val updated = Psbt(unsignedTx).updateWitnessInput(outPoint, txOutInput, derivationPaths = derivationPaths)
    val psbt = when (updated) {
      is Either.Right -> updated.value
      is Either.Left -> fail("Falha ao montar fixture de PSBT: ${updated.value}") as Nothing
    }

    try {
      SignetVaultCrypto.reviewPsbt(fingerprintHex, serialize(psbt))
      fail("Saída não tb1 deveria ser recusada.")
    } catch (failure: VaultException) {
      assertEquals("VAULT_REFUSED", failure.code)
    }
  }

  companion object {
    private const val HARDENED = 0x80000000L
  }
}
