import Foundation

/// Inteiro positivo em big-endian. Aritmética de laboratório para secp256k1.
/// Não é uma biblioteca de uso geral.
struct SignetBigInt: Comparable {
  var bytes: [UInt8]

  init(_ bytes: [UInt8]) {
    var trimmed = bytes
    while trimmed.count > 1 && trimmed[0] == 0 {
      trimmed.removeFirst()
    }
    self.bytes = trimmed.isEmpty ? [0] : trimmed
  }

  init(data: Data) {
    self.init(Array(data))
  }

  init(hex: String) {
    var clean = hex
    if clean.count % 2 == 1 { clean = "0" + clean }
    var parsed: [UInt8] = []
    var index = clean.startIndex
    while index < clean.endIndex {
      let next = clean.index(index, offsetBy: 2)
      parsed.append(UInt8(clean[index..<next], radix: 16) ?? 0)
      index = next
    }
    self.init(parsed)
  }

  init(_ value: UInt64) {
    if value == 0 {
      self.bytes = [0]
      return
    }
    var parts: [UInt8] = []
    var remaining = value
    while remaining > 0 {
      parts.insert(UInt8(remaining & 0xff), at: 0)
      remaining >>= 8
    }
    self.bytes = parts
  }

  static let zero = SignetBigInt([0])
  static let one = SignetBigInt([1])

  func padded(to count: Int) -> Data {
    if bytes.count >= count {
      return Data(bytes.suffix(count))
    }
    return Data(repeating: 0, count: count - bytes.count) + Data(bytes)
  }

  static func == (lhs: SignetBigInt, rhs: SignetBigInt) -> Bool {
    lhs.bytes == rhs.bytes
  }

  static func < (lhs: SignetBigInt, rhs: SignetBigInt) -> Bool {
    if lhs.bytes.count != rhs.bytes.count {
      return lhs.bytes.count < rhs.bytes.count
    }
    return lhs.bytes.lexicographicallyPrecedes(rhs.bytes)
  }

  static func + (lhs: SignetBigInt, rhs: SignetBigInt) -> SignetBigInt {
    let count = max(lhs.bytes.count, rhs.bytes.count)
    var result = [UInt8](repeating: 0, count: count + 1)
    var carry: UInt16 = 0
    for i in 0..<count {
      let a = i < lhs.bytes.count ? UInt16(lhs.bytes[lhs.bytes.count - 1 - i]) : 0
      let b = i < rhs.bytes.count ? UInt16(rhs.bytes[rhs.bytes.count - 1 - i]) : 0
      let sum = a + b + carry
      result[result.count - 1 - i] = UInt8(sum & 0xff)
      carry = sum >> 8
    }
    result[0] = UInt8(carry)
    return SignetBigInt(result)
  }

  static func - (lhs: SignetBigInt, rhs: SignetBigInt) -> SignetBigInt {
    precondition(lhs >= rhs)
    var result = lhs.bytes
    var borrow = 0
    for i in 0..<lhs.bytes.count {
      let li = lhs.bytes.count - 1 - i
      let r = i < rhs.bytes.count ? Int(rhs.bytes[rhs.bytes.count - 1 - i]) : 0
      var diff = Int(result[li]) - r - borrow
      if diff < 0 {
        diff += 256
        borrow = 1
      } else {
        borrow = 0
      }
      result[li] = UInt8(diff)
    }
    return SignetBigInt(result)
  }

  static func * (lhs: SignetBigInt, rhs: SignetBigInt) -> SignetBigInt {
    if lhs == .zero || rhs == .zero { return .zero }
    var result = [UInt8](repeating: 0, count: lhs.bytes.count + rhs.bytes.count)
    for i in (0..<lhs.bytes.count).reversed() {
      var carry: UInt16 = 0
      for j in (0..<rhs.bytes.count).reversed() {
        let offset = i + j + 1
        let product = UInt16(lhs.bytes[i]) * UInt16(rhs.bytes[j]) + UInt16(result[offset]) + carry
        result[offset] = UInt8(product & 0xff)
        carry = product >> 8
      }
      result[i] = UInt8(carry)
    }
    return SignetBigInt(result)
  }

  func divmod(_ divisor: SignetBigInt) -> (SignetBigInt, SignetBigInt) {
    precondition(divisor != .zero)
    if self < divisor { return (.zero, self) }
    var quotient = [UInt8](repeating: 0, count: bytes.count)
    var remainder = SignetBigInt.zero
    for i in 0..<bytes.count {
      remainder = SignetBigInt(remainder.bytes + [bytes[i]])
      var q: UInt8 = 0
      while remainder >= divisor {
        remainder = remainder - divisor
        q += 1
      }
      quotient[i] = q
    }
    return (SignetBigInt(quotient), remainder)
  }

  func modulo(_ modulus: SignetBigInt) -> SignetBigInt {
    divmod(modulus).1
  }

  func modAdd(_ other: SignetBigInt, mod: SignetBigInt) -> SignetBigInt {
    (self + other).modulo(mod)
  }

  func modSub(_ other: SignetBigInt, mod: SignetBigInt) -> SignetBigInt {
    if self >= other {
      return (self - other).modulo(mod)
    }
    return (mod - (other - self).modulo(mod)).modulo(mod)
  }

  func modMul(_ other: SignetBigInt, mod: SignetBigInt) -> SignetBigInt {
    (self * other).modulo(mod)
  }

  func modPow(_ exponent: SignetBigInt, mod: SignetBigInt) -> SignetBigInt {
    var result = SignetBigInt.one
    var base = modulo(mod)
    var exp = exponent
    while exp > .zero {
      if (exp.bytes.last ?? 0) & 1 == 1 {
        result = result.modMul(base, mod: mod)
      }
      base = base.modMul(base, mod: mod)
      var next = exp.bytes
      var carry: UInt8 = 0
      for i in 0..<next.count {
        let current = next[i]
        next[i] = (current >> 1) | (carry << 7)
        carry = current & 1
      }
      exp = SignetBigInt(next)
    }
    return result
  }

  func modInverse(_ modulus: SignetBigInt) -> SignetBigInt {
    modPow(modulus - SignetBigInt(2), mod: modulus)
  }
}
