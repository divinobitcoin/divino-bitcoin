import Foundation
import Security

final class SignetVaultStore {
  private let service = "divino.signet.vault"
  private let currentAccount = "current-profile"

  func currentProfileId() -> String? {
    guard let data = readKeychain(account: currentAccount) else { return nil }
    let id = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    return id?.isEmpty == false ? id : nil
  }

  func hasProfile() -> Bool {
    guard let id = currentProfileId() else { return false }
    return readKeychain(account: envelopeAccount(id)) != nil && readKeychain(account: publicAccount(id)) != nil
  }

  func readPublic(profileId: String) throws -> [String: String] {
    guard let data = readKeychain(account: publicAccount(profileId)),
          let json = try JSONSerialization.jsonObject(with: data) as? [String: String]
    else {
      throw VaultException(code: "VAULT_NOT_PROVISIONED", message: "Perfil ausente.")
    }
    return json
  }

  func persistNewProfile(words: [String]) throws -> [String: String] {
    if hasProfile() {
      throw VaultException(code: "VAULT_ALREADY_PROVISIONED", message: "Já existe um perfil Signet. Apague-o antes de criar outro.")
    }
    let material = try SignetVaultCrypto.publicMaterial(from: words)
    let profileId = UUID().uuidString
    var plaintext = Data(words.joined(separator: " ").utf8)
    defer { plaintext.resetBytes(in: 0..<plaintext.count) }
    try writeKeychain(account: envelopeAccount(profileId), data: plaintext, secret: true)
    let publicMap: [String: String] = [
      "profileId": profileId,
      "network": SignetVaultCrypto.network,
      "accountPath": SignetVaultCrypto.accountPath,
      "masterFingerprint": material.masterFingerprint,
      "accountXpub": material.accountXpub,
      "receiveDescriptor": material.receiveDescriptor,
      "changeDescriptor": material.changeDescriptor,
      "receiveAddress0": material.receiveAddress0,
    ]
    let publicData = try JSONSerialization.data(withJSONObject: publicMap)
    try writeKeychain(account: publicAccount(profileId), data: publicData, secret: false)
    try writeKeychain(account: currentAccount, data: Data(profileId.utf8), secret: false)
    return publicMap
  }

  func withMnemonic(profileId: String, use: ([String]) throws -> Void) throws {
    guard var data = readKeychain(account: envelopeAccount(profileId)),
          let raw = String(data: data, encoding: .utf8)
    else {
      throw VaultException(code: "VAULT_NOT_PROVISIONED", message: "Perfil ausente.")
    }
    defer { data.resetBytes(in: 0..<data.count) }
    let words = SignetVaultCrypto.normalizeWords(raw)
    try SignetVaultCrypto.validateMnemonic(words)
    try use(words)
  }

  func deleteProfile(profileId: String) throws {
    guard let current = currentProfileId(), current == profileId else {
      throw VaultException(code: "VAULT_NOT_PROVISIONED", message: "Perfil ausente.")
    }
    deleteKeychain(account: envelopeAccount(profileId))
    deleteKeychain(account: publicAccount(profileId))
    deleteKeychain(account: currentAccount)
  }

  private func envelopeAccount(_ profileId: String) -> String { "envelope.\(profileId)" }
  private func publicAccount(_ profileId: String) -> String { "public.\(profileId)" }

  private func writeKeychain(account: String, data: Data, secret: Bool) throws {
    deleteKeychain(account: account)
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecValueData as String: data,
      kSecAttrSynchronizable as String: false,
    ]
    if secret {
      query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
    } else {
      query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    }
    let status = SecItemAdd(query as CFDictionary, nil)
    if status == errSecDecode || status == errSecParam || status == errSecNotAvailable {
      throw VaultException(code: "VAULT_REFUSED", message: "O Keychain recusou guardar o envelope. Configure um código no aparelho.")
    }
    if status != errSecSuccess {
      throw VaultException(code: "VAULT_REFUSED", message: "O Keychain recusou a gravação.")
    }
  }

  private func readKeychain(account: String) -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess else { return nil }
    return result as? Data
  }

  private func deleteKeychain(account: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    SecItemDelete(query as CFDictionary)
  }
}
