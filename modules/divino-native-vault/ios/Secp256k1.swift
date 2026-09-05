import CryptoKit
import Foundation

/// secp256k1: ponto, derivação de chave pública e ECDSA (RFC 6979, low-S).
/// Self-check contra o gerador e o vetor BIP-32 publicado antes de provisionar.
enum Secp256k1 {
  static let p = SignetBigInt(hex: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F")
  static let n = SignetBigInt(hex: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141")
  static let gx = SignetBigInt(hex: "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798")
  static let gy = SignetBigInt(hex: "483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8")
  static let b = SignetBigInt(7)

  struct Point {
    var x: SignetBigInt
    var y: SignetBigInt
    var z: SignetBigInt
    var infinite: Bool

    static let infinity = Point(x: .zero, y: .one, z: .zero, infinite: true)
    static let generator = Point(x: gx, y: gy, z: .one, infinite: false)

    func affine() -> (SignetBigInt, SignetBigInt)? {
      if infinite { return nil }
      let zInv = z.modInverse(p)
      let zInv2 = zInv.modMul(zInv, mod: p)
      let zInv3 = zInv2.modMul(zInv, mod: p)
      return (x.modMul(zInv2, mod: p), y.modMul(zInv3, mod: p))
    }
  }

  static func selfCheck() throws {
    let one = Data(repeating: 0, count: 31) + Data([1])
    let pub = try publicKey(privateKey: one)
    let expected = Data(hex: "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
    guard pub == expected else {
      throw VaultException(code: "VAULT_REFUSED", message: "Self-check secp256k1 falhou. Cofre recusado.")
    }
  }

  static func publicKey(privateKey: Data) throws -> Data {
    let d = SignetBigInt(data: privateKey)
    guard d > .zero && d < n else {
      throw VaultException(code: "VAULT_REFUSED", message: "Chave privada fora da faixa.")
    }
    let point = multiply(Point.generator, d)
    return try compressed(point)
  }

  static func addPrivate(_ privateKey: Data, tweak: Data) throws -> Data {
    let sum = SignetBigInt(data: privateKey).modAdd(SignetBigInt(data: tweak), mod: n)
    if sum == .zero {
      throw VaultException(code: "VAULT_REFUSED", message: "Derivação BIP-32 produziu chave nula.")
    }
    return sum.padded(to: 32)
  }

  static func sign(message32: Data, privateKey: Data) throws -> Data {
    let z = SignetBigInt(data: message32).modulo(n)
    let d = SignetBigInt(data: privateKey)
    let k = rfc6979(privateKey: privateKey, message32: message32)
    let R = multiply(Point.generator, k)
    guard let affine = R.affine() else {
      throw VaultException(code: "VAULT_REFUSED", message: "ECDSA: ponto no infinito.")
    }
    let r = affine.0.modulo(n)
    if r == .zero {
      throw VaultException(code: "VAULT_REFUSED", message: "ECDSA: r nulo.")
    }
    let kInv = k.modInverse(n)
    var s = kInv.modMul(z.modAdd(r.modMul(d, mod: n), mod: n), mod: n)
    let halfN = n.divmod(SignetBigInt(2)).0
    if s > halfN {
      s = n - s
    }
    return der(r: r, s: s)
  }

  private static func multiply(_ point: Point, _ scalar: SignetBigInt) -> Point {
    var result = Point.infinity
    var addend = point
    let bits = scalar.padded(to: 32)
    for byte in bits {
      for bit in [7, 6, 5, 4, 3, 2, 1, 0] {
        result = doubled(result)
        if (byte >> bit) & 1 == 1 {
          result = added(result, addend)
        }
      }
    }
    return result
  }

  private static func doubled(_ p: Point) -> Point {
    if p.infinite { return p }
    let yz = p.y.modMul(p.z, mod: Secp256k1.p)
    if yz == .zero { return .infinity }
    let xx = p.x.modMul(p.x, mod: Secp256k1.p)
    let m = xx.modAdd(xx, mod: Secp256k1.p).modAdd(xx, mod: Secp256k1.p)
    let s = p.y.modMul(p.y, mod: Secp256k1.p).modMul(p.x, mod: Secp256k1.p).modMul(SignetBigInt(4), mod: Secp256k1.p)
    let x3 = m.modMul(m, mod: Secp256k1.p).modSub(s.modAdd(s, mod: Secp256k1.p), mod: Secp256k1.p)
    let y3 = m.modMul(s.modSub(x3, mod: Secp256k1.p), mod: Secp256k1.p)
      .modSub(p.y.modMul(p.y, mod: Secp256k1.p).modMul(p.y.modMul(p.y, mod: Secp256k1.p), mod: Secp256k1.p).modMul(SignetBigInt(8), mod: Secp256k1.p), mod: Secp256k1.p)
    let z3 = yz.modMul(SignetBigInt(2), mod: Secp256k1.p)
    return Point(x: x3, y: y3, z: z3, infinite: false)
  }

  private static func added(_ p: Point, _ q: Point) -> Point {
    if p.infinite { return q }
    if q.infinite { return p }
    let z1z1 = p.z.modMul(p.z, mod: Secp256k1.p)
    let z2z2 = q.z.modMul(q.z, mod: Secp256k1.p)
    let u1 = p.x.modMul(z2z2, mod: Secp256k1.p)
    let u2 = q.x.modMul(z1z1, mod: Secp256k1.p)
    let s1 = p.y.modMul(q.z, mod: Secp256k1.p).modMul(z2z2, mod: Secp256k1.p)
    let s2 = q.y.modMul(p.z, mod: Secp256k1.p).modMul(z1z1, mod: Secp256k1.p)
    if u1 == u2 {
      if s1 != s2 { return .infinity }
      return doubled(p)
    }
    let h = u2.modSub(u1, mod: Secp256k1.p)
    let r = s2.modSub(s1, mod: Secp256k1.p)
    let h2 = h.modMul(h, mod: Secp256k1.p)
    let h3 = h2.modMul(h, mod: Secp256k1.p)
    let v = u1.modMul(h2, mod: Secp256k1.p)
    let x3 = r.modMul(r, mod: Secp256k1.p).modSub(h3, mod: Secp256k1.p).modSub(v.modAdd(v, mod: Secp256k1.p), mod: Secp256k1.p)
    let y3 = r.modMul(v.modSub(x3, mod: Secp256k1.p), mod: Secp256k1.p).modSub(s1.modMul(h3, mod: Secp256k1.p), mod: Secp256k1.p)
    let z3 = h.modMul(p.z, mod: Secp256k1.p).modMul(q.z, mod: Secp256k1.p)
    return Point(x: x3, y: y3, z: z3, infinite: false)
  }

  private static func compressed(_ point: Point) throws -> Data {
    guard let affine = point.affine() else {
      throw VaultException(code: "VAULT_REFUSED", message: "Ponto no infinito.")
    }
    var prefix: UInt8 = 0x02
    if (affine.1.bytes.last ?? 0) & 1 == 1 {
      prefix = 0x03
    }
    return Data([prefix]) + affine.0.padded(to: 32)
  }

  private static func rfc6979(privateKey: Data, message32: Data) -> SignetBigInt {
    var v = Data(repeating: 0x01, count: 32)
    var k = Data(repeating: 0x00, count: 32)
    let payload = privateKey + message32
    k = hmacSHA256(key: k, data: v + Data([0x00]) + payload)
    v = hmacSHA256(key: k, data: v)
    k = hmacSHA256(key: k, data: v + Data([0x01]) + payload)
    v = hmacSHA256(key: k, data: v)
    while true {
      v = hmacSHA256(key: k, data: v)
      let candidate = SignetBigInt(data: v)
      if candidate > .zero && candidate < n {
        return candidate
      }
      k = hmacSHA256(key: k, data: v + Data([0x00]))
      v = hmacSHA256(key: k, data: v)
    }
  }

  private static func hmacSHA256(key: Data, data: Data) -> Data {
    let mac = HMAC<SHA256>.authenticationCode(for: data, using: SymmetricKey(data: key))
    return Data(mac)
  }

  private static func der(r: SignetBigInt, s: SignetBigInt) -> Data {
    func encodeInt(_ value: SignetBigInt) -> Data {
      var bytes = [UInt8](value.padded(to: 32))
      while bytes.count > 1 && bytes[0] == 0 {
        bytes.removeFirst()
      }
      if let first = bytes.first, first & 0x80 != 0 {
        bytes.insert(0, at: 0)
      }
      return Data([0x02, UInt8(bytes.count)]) + Data(bytes)
    }
    let body = encodeInt(r) + encodeInt(s)
    return Data([0x30, UInt8(body.count)]) + body
  }
}

private extension Data {
  init(hex: String) {
    var parsed = [UInt8]()
    var index = hex.startIndex
    while index < hex.endIndex {
      let next = hex.index(index, offsetBy: 2)
      parsed.append(UInt8(hex[index..<next], radix: 16) ?? 0)
      index = next
    }
    self.init(parsed)
  }
}
