import Foundation
import Security

enum SignetProvisionSession {
  private static let quizBound = 12
  private static var pendingWords: [String]?
  private static var quizIndexA: Int?
  private static var quizIndexB: Int?

  static func begin(_ words: [String]) {
    pendingWords = words
    let pair = drawDistinctQuizIndices()
    quizIndexA = pair.0
    quizIndexB = pair.1
  }

  static func replaceDraft(_ words: [String]) {
    pendingWords = words
  }

  static func words() -> [String]? {
    pendingWords
  }

  static func quizPair() -> (Int, Int)? {
    guard let first = quizIndexA, let second = quizIndexB else { return nil }
    guard first != second, (0..<quizBound).contains(first), (0..<quizBound).contains(second) else {
      return nil
    }
    return (first, second)
  }

  static func drawDistinctQuizIndices() -> (Int, Int) {
    let first = secureInt(quizBound)
    var second = secureInt(quizBound - 1)
    if second >= first {
      second += 1
    }
    return (first, second)
  }

  static func clear() {
    pendingWords = nil
    quizIndexA = nil
    quizIndexB = nil
  }

  private static func secureInt(_ bound: Int) -> Int {
    var bytes: UInt32 = 0
    let status = withUnsafeMutableBytes(of: &bytes) { raw in
      SecRandomCopyBytes(kSecRandomDefault, 4, raw.baseAddress!)
    }
    if status != errSecSuccess {
      return Int.random(in: 0..<bound)
    }
    return Int(bytes % UInt32(bound))
  }
}
