import CommonCrypto
import CryptoKit
import Foundation
import Security

enum SignetVaultCrypto {
  static let network = "signet"
  static let accountPath = "m/84'/1'/0'"
  static let gapLimit = 20

  struct PublicMaterial {
    let masterFingerprint: String
    let accountXpub: String
    let receiveDescriptor: String
    let changeDescriptor: String
    let receiveAddress0: String
  }

  static func generateMnemonic() throws -> [String] {
    try Secp256k1.selfCheck()
    var entropy = Data(count: 16)
    let status = entropy.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 16, $0.baseAddress!) }
    if status != errSecSuccess {
      throw VaultException(code: "VAULT_REFUSED", message: "O gerador de entropia recusou.")
    }
    defer { entropy.resetBytes(in: 0..<entropy.count) }
    return try mnemonics(fromEntropy: entropy)
  }

  static func normalizeWords(_ raw: String) -> [String] {
    raw.lowercased().split { $0.isWhitespace }.map(String.init).filter { !$0.isEmpty }
  }

  static func validateMnemonic(_ words: [String]) throws {
    if words.count != 12 && words.count != 24 {
      throw VaultException(code: "VAULT_REFUSED", message: "A frase precisa ter 12 ou 24 palavras.")
    }
    let map = Dictionary(uniqueKeysWithValues: englishWordlist.enumerated().map { ($1, $0) })
    var bits: [Bool] = []
    for word in words {
      guard let index = map[word] else {
        throw VaultException(code: "VAULT_REFUSED", message: "Frase BIP-39 inválida.")
      }
      for shift in (0..<11).reversed() {
        bits.append((index >> shift) & 1 == 1)
      }
    }
    let dataBits = words.count * 32 / 3
    let payload = bitsToBytes(Array(bits.prefix(dataBits)))
    let checksumLength = words.count / 3
    let digest = SHA256.hash(data: Data(payload))
    let expected = bytesToBits(Array(digest)).prefix(checksumLength)
    if Array(expected) != Array(bits.suffix(checksumLength)) {
      throw VaultException(code: "VAULT_REFUSED", message: "Frase BIP-39 inválida.")
    }
  }

  static func publicMaterial(from words: [String]) throws -> PublicMaterial {
    try validateMnemonic(words)
    try Secp256k1.selfCheck()
    var seed = pbkdf2(words: words)
    defer { seed.resetBytes(in: 0..<seed.count) }
    let master = try HDKey.master(seed: seed)
    let fingerprint = master.fingerprintHex()
    let account = try master.derive("m/84'/1'/0'")
    let tpub = try account.neuteredTpub()
    guard tpub.hasPrefix("tpub") else {
      throw VaultException(code: "VAULT_REFUSED", message: "A chave estendida não saiu como tpub. Recusando.")
    }
    let receive0 = try account.derive("m/0/0")
    let address = try bech32Address(publicKey: receive0.publicKey)
    let origin = "[\(fingerprint)/84h/1h/0h]"
    return PublicMaterial(
      masterFingerprint: fingerprint,
      accountXpub: tpub,
      receiveDescriptor: "wpkh(\(origin)\(tpub)/0/*)",
      changeDescriptor: "wpkh(\(origin)\(tpub)/1/*)",
      receiveAddress0: address,
    )
  }

  static func signPsbt(words: [String], psbtBytes: Data) throws -> (Data, Int) {
    try validateMnemonic(words)
    try Secp256k1.selfCheck()
    var seed = pbkdf2(words: words)
    defer { seed.resetBytes(in: 0..<seed.count) }
    let master = try HDKey.master(seed: seed)
    var psbt = try PsbtDocument(data: psbtBytes)
    if psbt.inputs.isEmpty {
      throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT sem entradas.")
    }
    let someDerivation = psbt.inputs.contains { !$0.derivations.isEmpty }
    let allDerivation = psbt.inputs.allSatisfy { !$0.derivations.isEmpty }
    if someDerivation && !allDerivation {
      throw VaultException(code: "VAULT_REFUSED", message: "PSBT com origem de chave em só algumas entradas. Recusando.")
    }
    for index in psbt.inputs.indices {
      let child = try resolveChild(psbt.inputs[index], index: index, master: master, useDerivation: someDerivation)
      let sighash = try bip143Hash(psbt: psbt, index: index, publicKey: child.publicKey)
      var signature = try Secp256k1.sign(message32: sighash, privateKey: child.privateKey)
      signature.append(0x01)
      psbt.inputs[index].partialSigs[child.publicKey] = signature
    }
    return (psbt.serialize(), psbt.inputs.count)
  }

  private static func resolveChild(_ input: PsbtDocument.InputMap, index: Int, master: HDKey, useDerivation: Bool) throws -> HDKey {
    guard let utxo = input.witnessUtxo else {
      throw VaultException(code: "VAULT_INVALID_PSBT", message: "Entrada \(index) sem witnessUtxo. Só P2WPKH Signet.")
    }
    if useDerivation {
      let ours = input.derivations.filter { $0.fingerprint == master.fingerprint }
      guard ours.count == 1 else {
        throw VaultException(code: "VAULT_REFUSED", message: "Entrada \(index) não pertence a este perfil.")
      }
      let derived = try master.derive(path: ours[0].path)
      if derived.publicKey != ours[0].publicKey {
        throw VaultException(code: "VAULT_REFUSED", message: "A origem da entrada \(index) não confere com o cofre.")
      }
      try assertOwned(script: utxo.script, publicKey: derived.publicKey)
      return derived
    }
    let account = try master.derive("m/84'/1'/0'")
    for change: UInt32 in 0...1 {
      for addressIndex: UInt32 in 0...UInt32(gapLimit) {
        let derived = try account.derive(path: [change, addressIndex])
        if let expected = try? p2wpkhScript(publicKey: derived.publicKey), expected == utxo.script {
          return derived
        }
      }
    }
    throw VaultException(code: "VAULT_REFUSED", message: "Entrada \(index) não é um endereço deste perfil.")
  }

  private static func assertOwned(script: Data, publicKey: Data) throws {
    let expected = try p2wpkhScript(publicKey: publicKey)
    if expected != script {
      throw VaultException(code: "VAULT_REFUSED", message: "O script da entrada não é o P2WPKH desta chave.")
    }
  }

  static func hash160(_ data: Data) -> Data {
    Ripemd160.hash(Data(SHA256.hash(data: data)))
  }

  static func p2wpkhScript(publicKey: Data) throws -> Data {
    let program = hash160(publicKey)
    return Data([0x00, 0x14]) + program
  }

  static func bech32Address(publicKey: Data) throws -> String {
    let program = hash160(publicKey)
    return Bech32.encode(hrp: "tb", witnessVersion: 0, program: program)
  }

  private static func mnemonics(fromEntropy entropy: Data) throws -> [String] {
    let digest = SHA256.hash(data: entropy)
    var bits = bytesToBits(Array(entropy))
    bits.append(contentsOf: bytesToBits(Array(digest)).prefix(entropy.count / 4))
    var words: [String] = []
    for chunkStart in stride(from: 0, to: bits.count, by: 11) {
      let slice = bits[chunkStart..<min(chunkStart + 11, bits.count)]
      var value = 0
      for bit in slice {
        value = (value << 1) | (bit ? 1 : 0)
      }
      words.append(englishWordlist[value])
    }
    return words
  }

  private static func pbkdf2(words: [String]) -> Data {
    let password = words.joined(separator: " ")
    let salt = "mnemonic"
    var derived = Data(count: 64)
    derived.withUnsafeMutableBytes { derivedBytes in
      password.withCString { passwordPtr in
        salt.withCString { saltPtr in
          CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordPtr,
            password.lengthOfBytes(using: .utf8),
            saltPtr,
            salt.lengthOfBytes(using: .utf8),
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA512),
            2048,
            derivedBytes.bindMemory(to: UInt8.self).baseAddress,
            64,
          )
        }
      }
    }
    return derived
  }

  private static func bytesToBits(_ bytes: [UInt8]) -> [Bool] {
    bytes.flatMap { byte in (0..<8).reversed().map { (byte >> $0) & 1 == 1 } }
  }

  private static func bitsToBytes(_ bits: [Bool]) -> [UInt8] {
    var bytes: [UInt8] = []
    var current: UInt8 = 0
    var count = 0
    for bit in bits {
      current = (current << 1) | (bit ? 1 : 0)
      count += 1
      if count == 8 {
        bytes.append(current)
        current = 0
        count = 0
      }
    }
    return bytes
  }
}
