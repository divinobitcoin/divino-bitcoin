import ExpoModulesCore
import Foundation
import UIKit

public class DivinoNativeVaultModule: Module {
  private let store = SignetVaultStore()

  public func definition() -> ModuleDefinition {
    Name("DivinoNativeVault")

    AsyncFunction("getCapabilitiesAsync") {
      let current = self.store.currentProfileId()
      let publicProfile = current.flatMap { try? self.store.readPublic(profileId: $0) }
      return [
        "status": publicProfile == nil ? "unprovisioned" : "provisioned",
        "network": SignetVaultCrypto.network,
        "requiresDevelopmentBuild": true,
        "usesNativeBoundary": true,
        "supportsSecretProvisioning": true,
        "supportsSigning": true,
        "profileId": publicProfile?["profileId"] as Any,
        "masterFingerprint": publicProfile?["masterFingerprint"] as Any,
      ]
    }

    AsyncFunction("provisionSignetProfile") { (mode: String, promise: Promise) in
      if self.store.hasProfile() {
        promise.reject("VAULT_ALREADY_PROVISIONED", "Já existe um perfil Signet. Apague-o antes.")
        return
      }
      guard mode == "generate" || mode == "import" else {
        promise.reject("VAULT_REFUSED", "Modo inválido.")
        return
      }
      DispatchQueue.main.async {
        guard let presenter = Self.currentViewController() else {
          promise.reject("VAULT_UNAVAILABLE", "Sem tela nativa. Use o development build.")
          return
        }
        let controller: UIViewController
        if mode == "import" {
          let importController = SignetMnemonicViewController()
          importController.onFinish = { result in
            switch result {
            case .success(let stored):
              promise.resolve([
                "profileId": stored["profileId"] as Any,
                "masterFingerprint": stored["masterFingerprint"] as Any,
                "network": SignetVaultCrypto.network,
              ])
            case .failure(let error):
              let vault = error as? VaultException
              promise.reject(vault?.code ?? "VAULT_CANCELLED", vault?.message ?? error.localizedDescription)
            }
          }
          controller = importController
        } else {
          let reveal = SignetMnemonicRevealViewController()
          reveal.onFinish = { result in
            switch result {
            case .success(let stored):
              promise.resolve([
                "profileId": stored["profileId"] as Any,
                "masterFingerprint": stored["masterFingerprint"] as Any,
                "network": SignetVaultCrypto.network,
              ])
            case .failure(let error):
              SignetProvisionSession.clear()
              let vault = error as? VaultException
              promise.reject(vault?.code ?? "VAULT_CANCELLED", vault?.message ?? error.localizedDescription)
            }
          }
          controller = reveal
        }
        presenter.present(controller, animated: true)
      }
    }

    AsyncFunction("getPublicDescriptor") { (profileId: String) in
      try self.store.readPublic(profileId: profileId)
    }

    AsyncFunction("authorizeSigningIntent") { (profileId: String, network: String, psbtBase64: String, promise: Promise) in
      if network != SignetVaultCrypto.network {
        promise.reject("VAULT_NETWORK", "Este cofre aceita apenas Signet.")
        return
      }
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          guard let psbtBytes = Data(base64Encoded: psbtBase64) else {
            throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT ilegível.")
          }
          var signed = Data()
          var count = 0
          try self.store.withMnemonic(profileId: profileId) { words in
            let result = try SignetVaultCrypto.signPsbt(words: words, psbtBytes: psbtBytes)
            signed = result.0
            count = result.1
          }
          promise.resolve([
            "profileId": profileId,
            "network": SignetVaultCrypto.network,
            "psbtBase64": signed.base64EncodedString(),
            "signedInputCount": count,
          ])
        } catch let error as VaultException {
          promise.reject(error.code, error.message)
        } catch {
          promise.reject("VAULT_REFUSED", "O cofre recusou assinar.")
        }
      }
    }

    AsyncFunction("deleteProfile") { (profileId: String) in
      try self.store.deleteProfile(profileId: profileId)
      return [
        "deleted": true,
        "profileId": profileId,
      ]
    }

    AsyncFunction("assertOperationUnavailableAsync") { (operation: String) in
      throw NSError(
        domain: "DivinoNativeVault",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "A operação '\(operation)' não existe neste cofre e não será implementada."],
      )
    }
  }

  private static func currentViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap(\.windows).first { $0.isKeyWindow } ?? scenes.flatMap(\.windows).first
    var controller = window?.rootViewController
    while let presented = controller?.presentedViewController {
      controller = presented
    }
    return controller
  }
}
