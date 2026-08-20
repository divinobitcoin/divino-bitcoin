import ExpoModulesCore
import Foundation

public class DivinoNativeVaultModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DivinoNativeVault")

    AsyncFunction("getCapabilitiesAsync") {
      return [
        "status": "skeleton",
        "requiresDevelopmentBuild": true,
        "usesNativeBoundary": true,
        "supportsSecretProvisioning": false,
        "supportsSigning": false,
      ]
    }

    AsyncFunction("assertOperationUnavailableAsync") { (operation: String) in
      throw NSError(
        domain: "DivinoNativeVault",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Operação indisponível: \(operation). Consulte a ADR-0001."],
      )
    }
  }
}
