import Foundation

enum SignetProvisionSession {
  private static var pendingWords: [String]?

  static func begin(_ words: [String]) {
    pendingWords = words
  }

  static func words() -> [String]? {
    pendingWords
  }

  static func clear() {
    pendingWords = nil
  }
}
