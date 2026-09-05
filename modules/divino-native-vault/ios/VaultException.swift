import Foundation

struct VaultException: Error, LocalizedError {
  let code: String
  let message: String
  var errorDescription: String? { message }
}
