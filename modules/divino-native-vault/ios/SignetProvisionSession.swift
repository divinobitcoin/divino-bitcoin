import Foundation
import Security

enum SignetProvisionSession {
  private static let quizBound = 12
  private static var pendingWords: [String]?
  private static var quizIndexA: Int?
  private static var quizIndexB: Int?

  static func begin(_ words: [String]) {
    pendingWords = words
    if let pair = drawDistinctQuizIndices() {
      quizIndexA = pair.0
      quizIndexB = pair.1
    } else {
      quizIndexA = nil
      quizIndexB = nil
    }
  }

  static func replaceDraft(_ words: [String]) {
    pendingWords = words
  }

  static func reshuffleQuiz() {
    guard pendingWords?.count == quizBound, let pair = drawDistinctQuizIndices() else { return }
    quizIndexA = pair.0
    quizIndexB = pair.1
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

  private static func drawDistinctQuizIndices() -> (Int, Int)? {
    guard let first = uniformIndex(quizBound),
          var second = uniformIndex(quizBound - 1) else {
      return nil
    }
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

  private static func uniformIndex(_ bound: Int) -> Int? {
    let limit = UInt32.max - (UInt32.max % UInt32(bound))
    var bytes = [UInt8](repeating: 0, count: 4)
    for _ in 0..<32 {
      let status = bytes.withUnsafeMutableBytes { raw in
        SecRandomCopyBytes(kSecRandomDefault, 4, raw.baseAddress!)
      }
      guard status == errSecSuccess else { return nil }
      let unsigned = bytes.reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
      if unsigned < limit {
        return Int(unsigned % UInt32(bound))
      }
    }
    return nil
  }
}
