package expo.modules.divinonativevault

import fr.acinq.bitcoin.Bitcoin
import fr.acinq.bitcoin.Block
import fr.acinq.bitcoin.ByteVector
import fr.acinq.bitcoin.DeterministicWallet
import fr.acinq.bitcoin.updated
import fr.acinq.bitcoin.MnemonicCode
import fr.acinq.bitcoin.Script
import fr.acinq.bitcoin.SigHash
import fr.acinq.bitcoin.SigVersion
import fr.acinq.bitcoin.Transaction
import fr.acinq.bitcoin.psbt.Input
import fr.acinq.bitcoin.psbt.Psbt
import fr.acinq.bitcoin.utils.Either
import java.security.SecureRandom

/**
 * Núcleo criptográfico Signet. Não persiste nada, não loga, não fala com a
 * bridge. Quem chama entrega as palavras e recebe só material público ou a
 * PSBT com assinaturas parciais.
 *
 * Caminho fixo BIP-84 testnet/Signet: m/84'/1'/0'. Sem passphrase.
 */
object SignetVaultCrypto {
  const val NETWORK = "signet"
  const val ACCOUNT_PATH = "m/84'/1'/0'"
  const val GAP_LIMIT = 20
  const val ENTROPY_BYTES = 16

  data class PublicMaterial(
    val masterFingerprint: String,
    val accountXpub: String,
    val receiveDescriptor: String,
    val changeDescriptor: String,
    val receiveAddress0: String,
  )

  fun generateMnemonic(): List<String> {
    val entropy = ByteArray(ENTROPY_BYTES)
    SecureRandom().nextBytes(entropy)
    try {
      return MnemonicCode.toMnemonics(entropy)
    } finally {
      entropy.fill(0)
    }
  }

  fun normalizeWords(raw: String): List<String> {
    return raw
      .trim()
      .lowercase()
      .split(Regex("\\s+"))
      .filter { it.isNotEmpty() }
  }

  fun validateMnemonic(words: List<String>) {
    if (words.size != 12 && words.size != 24) {
      throw VaultException("VAULT_REFUSED", "A frase precisa ter 12 ou 24 palavras.")
    }
    try {
      MnemonicCode.validate(words)
    } catch (error: Exception) {
      throw VaultException("VAULT_REFUSED", "Frase BIP-39 inválida.")
    }
  }

  fun publicMaterialFromMnemonic(words: List<String>): PublicMaterial {
    validateMnemonic(words)
    val seed = MnemonicCode.toSeed(words, "")
    try {
      val master = DeterministicWallet.generate(seed)
      val fingerprint = fingerprintHex(master)
      val account = master.derivePrivateKey(ACCOUNT_PATH)
      val tpub = account.extendedPublicKey.encode(true)
      if (!tpub.startsWith("tpub")) {
        throw VaultException("VAULT_REFUSED", "A chave estendida não saiu como tpub. Recusando.")
      }
      val origin = "[$fingerprint/84h/1h/0h]"
      val receive0 = account.derivePrivateKey(0L).derivePrivateKey(0L)
      val address = Bitcoin.computeP2WpkhAddress(receive0.publicKey, Block.SignetGenesisBlock.hash)
      return PublicMaterial(
        masterFingerprint = fingerprint,
        accountXpub = tpub,
        receiveDescriptor = "wpkh($origin$tpub/0/*)",
        changeDescriptor = "wpkh($origin$tpub/1/*)",
        receiveAddress0 = address,
      )
    } finally {
      seed.fill(0)
    }
  }

  fun signPsbt(words: List<String>, psbtBytes: ByteArray): Pair<ByteArray, Int> {
    validateMnemonic(words)
    val parsed = Psbt.read(psbtBytes).getOrElse { failure ->
      throw VaultException("VAULT_INVALID_PSBT", "PSBT ilegível.")
    }
    if (parsed.inputs.isEmpty()) {
      throw VaultException("VAULT_INVALID_PSBT", "PSBT sem entradas.")
    }

    val seed = MnemonicCode.toSeed(words, "")
    try {
      val master = DeterministicWallet.generate(seed)
      val masterFingerprint = master.fingerprint()
      val account = master.derivePrivateKey(ACCOUNT_PATH)
      var current = parsed
      var signed = 0

      val derivationCounts = current.inputs.map { it.derivationPaths.size }
      val someHaveDerivation = derivationCounts.any { it > 0 }
      val allHaveDerivation = derivationCounts.all { it > 0 }
      if (someHaveDerivation && !allHaveDerivation) {
        throw VaultException(
          "VAULT_REFUSED",
          "PSBT com origem de chave em só algumas entradas. Recusando para não assinar pela metade.",
        )
      }

      current.inputs.indices.forEach { index ->
        val input = current.inputs[index]
        val child = resolveChildKey(input, index, master, masterFingerprint, account, someHaveDerivation)
        current = signInputP2wpkh(current, index, child)
        signed += 1
      }

      if (signed != current.inputs.size) {
        throw VaultException("VAULT_REFUSED", "O cofre recusou assinar pela metade.")
      }

      verifyOwnChangeOutputs(current, master, masterFingerprint)

      return Pair(Psbt.write(current).toByteArray(), signed)
    } finally {
      seed.fill(0)
    }
  }

  private fun resolveChildKey(
    input: Input,
    index: Int,
    master: DeterministicWallet.ExtendedPrivateKey,
    masterFingerprint: Long,
    account: DeterministicWallet.ExtendedPrivateKey,
    useDerivation: Boolean,
  ): DeterministicWallet.ExtendedPrivateKey {
    val witnessUtxo = input.witnessUtxo
      ?: throw VaultException("VAULT_INVALID_PSBT", "Entrada $index sem witnessUtxo. Só P2WPKH Signet.")

    if (useDerivation) {
      val ours = input.derivationPaths.filter { (_, path) -> path.masterKeyFingerprint == masterFingerprint }
      if (ours.isEmpty()) {
        throw VaultException("VAULT_REFUSED", "Entrada $index não pertence a este perfil.")
      }
      if (ours.size != 1) {
        throw VaultException("VAULT_REFUSED", "Entrada $index com mais de uma origem nossa. Recusando.")
      }
      val (pub, path) = ours.entries.first()
      val derived = master.derivePrivateKey(path.keyPath)
      if (derived.publicKey != pub) {
        throw VaultException("VAULT_REFUSED", "A origem da entrada $index não confere com o cofre.")
      }
      assertP2wpkhOwnedBy(witnessUtxo.publicKeyScript, derived)
      return derived
    }

    val script = witnessUtxo.publicKeyScript.toByteArray()
    for (change in 0L..1L) {
      for (addressIndex in 0L..GAP_LIMIT.toLong()) {
        val derived = account.derivePrivateKey(change).derivePrivateKey(addressIndex)
        val expected = Script.write(Script.pay2wpkh(derived.publicKey))
        if (expected.contentEquals(script)) {
          return derived
        }
      }
    }
    throw VaultException("VAULT_REFUSED", "Entrada $index não é um endereço deste perfil.")
  }

  private fun signInputP2wpkh(
    psbt: Psbt,
    index: Int,
    child: DeterministicWallet.ExtendedPrivateKey,
  ): Psbt {
    val input = psbt.inputs[index]
    val witnessUtxo = input.witnessUtxo
      ?: throw VaultException("VAULT_INVALID_PSBT", "Entrada $index sem witnessUtxo.")
    assertP2wpkhOwnedBy(witnessUtxo.publicKeyScript, child)

    val sighash = input.sighashType ?: SigHash.SIGHASH_ALL
    val signature = ByteVector(
      Transaction.signInput(
        psbt.global.tx,
        index,
        Script.pay2pkh(child.publicKey),
        sighash,
        witnessUtxo.amount,
        SigVersion.SIGVERSION_WITNESS_V0,
        child.privateKey,
      ),
    )

    return when (input) {
      is Input.WitnessInput.PartiallySignedWitnessInput -> {
        psbt.copy(
          inputs = psbt.inputs.updated(index, input.copy(partialSigs = input.partialSigs + (child.publicKey to signature))),
        )
      }
      else -> throw VaultException("VAULT_REFUSED", "Entrada $index não é P2WPKH assinável.")
    }
  }

  private fun verifyOwnChangeOutputs(
    psbt: Psbt,
    master: DeterministicWallet.ExtendedPrivateKey,
    masterFingerprint: Long,
  ) {
    psbt.outputs.forEachIndexed { index, output ->
      val ours = output.derivationPaths.filter { (_, path) -> path.masterKeyFingerprint == masterFingerprint }
      if (ours.isEmpty()) return@forEachIndexed
      ours.forEach { (pub, path) ->
        val pathString = path.keyPath.toString()
        if (!pathString.startsWith("m/84'/1'/0'/") && !pathString.startsWith("m/84h/1h/0h/")) {
          throw VaultException("VAULT_REFUSED", "Saída $index com caminho que não é BIP-84 Signet.")
        }
        val derived = master.derivePrivateKey(path.keyPath)
        if (derived.publicKey != pub) {
          throw VaultException("VAULT_REFUSED", "A origem da saída $index não confere com o cofre.")
        }
      }
    }
  }

  private fun assertP2wpkhOwnedBy(script: ByteVector, child: DeterministicWallet.ExtendedPrivateKey) {
    val expected = Script.write(Script.pay2wpkh(child.publicKey))
    if (!expected.contentEquals(script.toByteArray())) {
      throw VaultException("VAULT_REFUSED", "O script da entrada não é o P2WPKH desta chave.")
    }
  }

  fun fingerprintHex(master: DeterministicWallet.ExtendedPrivateKey): String {
    return master.fingerprint().toString(16).padStart(8, '0')
  }

  private fun <L, R> Either<L, R>.getOrElse(onLeft: (L) -> Nothing): R {
    return when (this) {
      is Either.Left -> onLeft(value)
      is Either.Right -> value
    }
  }
}
