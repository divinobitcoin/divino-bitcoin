import CryptoKit
import Foundation

struct HDKey {
  var privateKey: Data
  var chainCode: Data
  var depth: UInt8
  var parentFingerprint: UInt32
  var childNumber: UInt32
  var publicKey: Data

  var fingerprint: UInt32 {
    let hash = SignetVaultCrypto.hash160(publicKey)
    return hash.prefix(4).reduce(0) { ($0 << 8) | UInt32($1) }
  }

  func fingerprintHex() -> String {
    String(format: "%08x", fingerprint)
  }

  static func master(seed: Data) throws -> HDKey {
    let mac = HMAC<SHA512>.authenticationCode(for: seed, using: SymmetricKey(data: Data("Bitcoin seed".utf8)))
    let data = Data(mac)
    let privateKey = data.prefix(32)
    let chainCode = data.suffix(32)
    let publicKey = try Secp256k1.publicKey(privateKey: Data(privateKey))
    return HDKey(
      privateKey: Data(privateKey),
      chainCode: Data(chainCode),
      depth: 0,
      parentFingerprint: 0,
      childNumber: 0,
      publicKey: publicKey,
    )
  }

  func derive(_ path: String) throws -> HDKey {
    let trimmed = path.hasPrefix("m") ? String(path.dropFirst()) : path
    let parts = trimmed.split(separator: "/").filter { !$0.isEmpty }
    var indexes: [UInt32] = []
    for part in parts {
      let hardened = part.hasSuffix("'") || part.hasSuffix("h")
      let number = UInt32(part.replacingOccurrences(of: "'", with: "").replacingOccurrences(of: "h", with: "")) ?? 0
      indexes.append(hardened ? number + 0x80000000 : number)
    }
    return try derive(path: indexes)
  }

  func derive(path: [UInt32]) throws -> HDKey {
    var current = self
    for index in path {
      current = try current.deriveChild(index)
    }
    return current
  }

  func deriveChild(_ index: UInt32) throws -> HDKey {
    var data = Data()
    if index >= 0x80000000 {
      data.append(0x00)
      data.append(privateKey)
    } else {
      data.append(publicKey)
    }
    var be = index.bigEndian
    data.append(Data(bytes: &be, count: 4))
    let mac = HMAC<SHA512>.authenticationCode(for: data, using: SymmetricKey(data: chainCode))
    let I = Data(mac)
    let il = Data(I.prefix(32))
    let ir = Data(I.suffix(32))
    let childPriv = try Secp256k1.addPrivate(privateKey, tweak: il)
    let childPub = try Secp256k1.publicKey(privateKey: childPriv)
    return HDKey(
      privateKey: childPriv,
      chainCode: ir,
      depth: depth + 1,
      parentFingerprint: fingerprint,
      childNumber: index,
      publicKey: childPub,
    )
  }

  func neuteredTpub() throws -> String {
    var payload = Data()
    payload.append(contentsOf: [0x04, 0x35, 0x87, 0xcf])
    payload.append(depth)
    var parent = parentFingerprint.bigEndian
    payload.append(Data(bytes: &parent, count: 4))
    var child = childNumber.bigEndian
    payload.append(Data(bytes: &child, count: 4))
    payload.append(chainCode)
    payload.append(publicKey)
    return Base58Check.encode(payload)
  }
}

enum Base58Check {
  private static let alphabet = Array("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

  static func encode(_ payload: Data) -> String {
    let checksum = Data(SHA256.hash(data: Data(SHA256.hash(data: payload)))).prefix(4)
    let data = payload + checksum
    var zeros = 0
    for byte in data {
      if byte == 0 { zeros += 1 } else { break }
    }
    var value = SignetBigInt(data: data)
    var encoded = ""
    let base = SignetBigInt(58)
    while value > SignetBigInt.zero {
      let (q, r) = value.divmod(base)
      encoded.insert(alphabet[Int(r.bytes.last ?? 0)], at: encoded.startIndex)
      value = q
    }
    return String(repeating: "1", count: zeros) + encoded
  }
}

enum Bech32 {
  private static let charset = Array("qpzry9x8gf2tvdw0s3jn54khce6mua7l")

  static func encode(hrp: String, witnessVersion: UInt8, program: Data) -> String {
    var values = [witnessVersion] + convertBits(Array(program), from: 8, to: 5, pad: true)
    values += checksum(hrp: hrp, values: values)
    return hrp + "1" + String(values.map { charset[Int($0)] })
  }

  private static func convertBits(_ data: [UInt8], from: Int, to: Int, pad: Bool) -> [UInt8] {
    var acc = 0
    var bits = 0
    var result: [UInt8] = []
    let maxv = (1 << to) - 1
    for value in data {
      acc = (acc << from) | Int(value)
      bits += from
      while bits >= to {
        bits -= to
        result.append(UInt8((acc >> bits) & maxv))
      }
    }
    if pad && bits > 0 {
      result.append(UInt8((acc << (to - bits)) & maxv))
    }
    return result
  }

  private static func checksum(hrp: String, values: [UInt8]) -> [UInt8] {
    let hrpExpand = hrp.lowercased().unicodeScalars.map { UInt8($0.value >> 5) } + [0] + hrp.lowercased().unicodeScalars.map { UInt8($0.value & 31) }
    var polymod = polymodValue(hrpExpand + values + [0, 0, 0, 0, 0, 0]) ^ 1
    var result: [UInt8] = []
    for i in 0..<6 {
      result.append(UInt8((polymod >> (5 * (5 - i))) & 31))
    }
    return result
  }

  private static func polymodValue(_ values: [UInt8]) -> Int {
    let gen = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
    var chk = 1
    for value in values {
      let b = chk >> 25
      chk = ((chk & 0x1ffffff) << 5) ^ Int(value)
      for i in 0..<5 {
        if (b >> i) & 1 == 1 {
          chk ^= gen[i]
        }
      }
    }
    return chk
  }
}
