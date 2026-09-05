import CryptoKit
import Foundation

struct PsbtDocument {
  var version: Int32
  var lockTime: UInt32
  var txIns: [TxIn]
  var txOuts: [TxOut]
  var inputs: [InputMap]
  var outputs: [OutputMap]

  struct TxIn {
    var txid: Data
    var vout: UInt32
    var sequence: UInt32
  }

  struct TxOut {
    var amount: UInt64
    var script: Data
  }

  struct WitnessUtxo {
    var amount: UInt64
    var script: Data
  }

  struct Derivation {
    var publicKey: Data
    var fingerprint: UInt32
    var path: [UInt32]
  }

  struct InputMap {
    var witnessUtxo: WitnessUtxo?
    var derivations: [Derivation]
    var partialSigs: [Data: Data]
    var sighashType: UInt32?
  }

  struct OutputMap {
    var derivations: [Derivation]
  }

  init(data: Data) throws {
    var cursor = 0
    func readByte() throws -> UInt8 {
      guard cursor < data.count else { throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT truncada.") }
      let value = data[cursor]
      cursor += 1
      return value
    }
    func readVarInt() throws -> Int {
      let first = try readByte()
      switch first {
      case 0xfd:
        let lo = Int(try readByte())
        let hi = Int(try readByte())
        return lo | (hi << 8)
      case 0xfe:
        return Int(try readUInt32())
      case 0xff:
        throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT com varint 64 recusado.")
      default:
        return Int(first)
      }
    }
    func readUInt32() throws -> UInt32 {
      let b0 = UInt32(try readByte())
      let b1 = UInt32(try readByte())
      let b2 = UInt32(try readByte())
      let b3 = UInt32(try readByte())
      return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
    }
    func readUInt64() throws -> UInt64 {
      var value: UInt64 = 0
      for i in 0..<8 {
        value |= UInt64(try readByte()) << (8 * i)
      }
      return value
    }
    func readBytes(_ count: Int) throws -> Data {
      guard cursor + count <= data.count else { throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT truncada.") }
      let slice = data.subdata(in: cursor..<(cursor + count))
      cursor += count
      return slice
    }
    func readSlice() throws -> Data {
      let length = try readVarInt()
      return try readBytes(length)
    }
    func readMap() throws -> [(Data, Data)] {
      var entries: [(Data, Data)] = []
      while true {
        let key = try readSlice()
        if key.isEmpty { break }
        let value = try readSlice()
        entries.append((key, value))
      }
      return entries
    }

    guard try readBytes(5) == Data([0x70, 0x73, 0x62, 0x74, 0xff]) else {
      throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT ilegível.")
    }

    var unsignedTx: Data?
    for (key, value) in try readMap() {
      if key.first == 0x00 {
        unsignedTx = value
      }
    }
    guard let tx = unsignedTx else {
      throw VaultException(code: "VAULT_INVALID_PSBT", message: "PSBT sem transação.")
    }

    var txCursor = 0
    func txByte() throws -> UInt8 {
      guard txCursor < tx.count else { throw VaultException(code: "VAULT_INVALID_PSBT", message: "Transação truncada.") }
      let value = tx[txCursor]
      txCursor += 1
      return value
    }
    func txVarInt() throws -> Int {
      let first = try txByte()
      switch first {
      case 0xfd: return Int(try txByte()) | (Int(try txByte()) << 8)
      case 0xfe:
        let b0 = UInt32(try txByte())
        let b1 = UInt32(try txByte())
        let b2 = UInt32(try txByte())
        let b3 = UInt32(try txByte())
        return Int(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24))
      default: return Int(first)
      }
    }
    func txBytes(_ count: Int) throws -> Data {
      guard txCursor + count <= tx.count else { throw VaultException(code: "VAULT_INVALID_PSBT", message: "Transação truncada.") }
      let slice = tx.subdata(in: txCursor..<(txCursor + count))
      txCursor += count
      return slice
    }
    func txUInt32() throws -> UInt32 {
      let b0 = UInt32(try txByte())
      let b1 = UInt32(try txByte())
      let b2 = UInt32(try txByte())
      let b3 = UInt32(try txByte())
      return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
    }
    func txUInt64() throws -> UInt64 {
      var value: UInt64 = 0
      for i in 0..<8 { value |= UInt64(try txByte()) << (8 * i) }
      return value
    }

    version = Int32(bitPattern: try txUInt32())
    let inCount = try txVarInt()
    var parsedIns: [TxIn] = []
    for _ in 0..<inCount {
      let txid = try txBytes(32)
      let vout = try txUInt32()
      let script = try txBytes(try txVarInt())
      if !script.isEmpty {
        throw VaultException(code: "VAULT_INVALID_PSBT", message: "Transação global com scriptSig.")
      }
      let sequence = try txUInt32()
      parsedIns.append(TxIn(txid: txid, vout: vout, sequence: sequence))
    }
    let outCount = try txVarInt()
    var parsedOuts: [TxOut] = []
    for _ in 0..<outCount {
      let amount = try txUInt64()
      let script = try txBytes(try txVarInt())
      parsedOuts.append(TxOut(amount: amount, script: script))
    }
    lockTime = try txUInt32()
    txIns = parsedIns
    txOuts = parsedOuts

    func parseDerivations(_ entries: [(Data, Data)]) -> [Derivation] {
      entries.compactMap { key, value in
        guard key.first == 0x06, key.count == 34, value.count >= 4, value.count % 4 == 0 else { return nil }
        let publicKey = key.dropFirst()
        let fingerprint = value.prefix(4).reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
        var path: [UInt32] = []
        var offset = 4
        while offset + 4 <= value.count {
          let slice = value.subdata(in: offset..<(offset + 4))
          let index = UInt32(slice[0]) | UInt32(slice[1]) << 8 | UInt32(slice[2]) << 16 | UInt32(slice[3]) << 24
          path.append(index)
          offset += 4
        }
        return Derivation(publicKey: Data(publicKey), fingerprint: fingerprint, path: path)
      }
    }

    inputs = []
    for _ in parsedIns {
      let entries = try readMap()
      var witnessUtxo: WitnessUtxo?
      var sighashType: UInt32?
      var partial: [Data: Data] = [:]
      for (key, value) in entries {
        switch key.first {
        case 0x01:
          var u = 0
          func ub() -> UInt8 { let v = value[u]; u += 1; return v }
          var amount: UInt64 = 0
          for i in 0..<8 { amount |= UInt64(ub()) << (8 * i) }
          let scriptLen = Int(ub())
          let script = value.subdata(in: u..<(u + scriptLen))
          witnessUtxo = WitnessUtxo(amount: amount, script: script)
        case 0x02:
          if key.count == 34 {
            partial[Data(key.dropFirst())] = value
          }
        case 0x03:
          if value.count == 4 {
            sighashType = UInt32(value[0]) | UInt32(value[1]) << 8 | UInt32(value[2]) << 16 | UInt32(value[3]) << 24
          }
        default:
          break
        }
      }
      inputs.append(
        InputMap(
          witnessUtxo: witnessUtxo,
          derivations: parseDerivations(entries),
          partialSigs: partial,
          sighashType: sighashType,
        ),
      )
    }

    outputs = []
    for _ in parsedOuts {
      let entries = try readMap()
      outputs.append(OutputMap(derivations: parseDerivations(entries)))
    }
  }

  func serialize() -> Data {
    var out = Data([0x70, 0x73, 0x62, 0x74, 0xff])
    func writeSlice(_ data: Data, to buffer: inout Data) {
      writeVarInt(data.count, to: &buffer)
      buffer.append(data)
    }
    func writeVarInt(_ value: Int, to buffer: inout Data) {
      if value < 0xfd {
        buffer.append(UInt8(value))
      } else if value <= 0xffff {
        buffer.append(0xfd)
        buffer.append(UInt8(value & 0xff))
        buffer.append(UInt8((value >> 8) & 0xff))
      } else {
        buffer.append(0xfe)
        writeUInt32(UInt32(value), to: &buffer)
      }
    }
    func writeUInt32(_ value: UInt32, to buffer: inout Data) {
      var little = value.littleEndian
      buffer.append(Data(bytes: &little, count: 4))
    }
    func writeUInt64(_ value: UInt64, to buffer: inout Data) {
      var little = value.littleEndian
      buffer.append(Data(bytes: &little, count: 8))
    }

    var tx = Data()
    writeUInt32(UInt32(bitPattern: version), to: &tx)
    writeVarInt(txIns.count, to: &tx)
    for input in txIns {
      tx.append(input.txid)
      writeUInt32(input.vout, to: &tx)
      writeVarInt(0, to: &tx)
      writeUInt32(input.sequence, to: &tx)
    }
    writeVarInt(txOuts.count, to: &tx)
    for output in txOuts {
      writeUInt64(output.amount, to: &tx)
      writeVarInt(output.script.count, to: &tx)
      tx.append(output.script)
    }
    writeUInt32(lockTime, to: &tx)

    writeSlice(Data([0x00]), to: &out)
    writeSlice(tx, to: &out)
    out.append(0x00)

    for input in inputs {
      if let utxo = input.witnessUtxo {
        writeSlice(Data([0x01]), to: &out)
        var value = Data()
        writeUInt64(utxo.amount, to: &value)
        writeVarInt(utxo.script.count, to: &value)
        value.append(utxo.script)
        writeSlice(value, to: &out)
      }
      for (pub, sig) in input.partialSigs {
        writeSlice(Data([0x02]) + pub, to: &out)
        writeSlice(sig, to: &out)
      }
      for derivation in input.derivations {
        writeSlice(Data([0x06]) + derivation.publicKey, to: &out)
        var value = Data()
        var fp = derivation.fingerprint.bigEndian
        value.append(Data(bytes: &fp, count: 4))
        for index in derivation.path {
          var little = index.littleEndian
          value.append(Data(bytes: &little, count: 4))
        }
        writeSlice(value, to: &out)
      }
      out.append(0x00)
    }
    for output in outputs {
      for derivation in output.derivations {
        writeSlice(Data([0x02]) + derivation.publicKey, to: &out)
        var value = Data()
        var fp = derivation.fingerprint.bigEndian
        value.append(Data(bytes: &fp, count: 4))
        for index in derivation.path {
          var little = index.littleEndian
          value.append(Data(bytes: &little, count: 4))
        }
        writeSlice(value, to: &out)
      }
      out.append(0x00)
    }
    return out
  }
}

func bip143Hash(psbt: PsbtDocument, index: Int, publicKey: Data) throws -> Data {
  let input = psbt.inputs[index]
  guard let utxo = input.witnessUtxo else {
    throw VaultException(code: "VAULT_INVALID_PSBT", message: "Entrada sem witnessUtxo.")
  }
  func dsha(_ data: Data) -> Data {
    Data(SHA256.hash(data: Data(SHA256.hash(data: data))))
  }
  func writeUInt32(_ value: UInt32, to buffer: inout Data) {
    var little = value.littleEndian
    buffer.append(Data(bytes: &little, count: 4))
  }
  func writeUInt64(_ value: UInt64, to buffer: inout Data) {
    var little = value.littleEndian
    buffer.append(Data(bytes: &little, count: 8))
  }

  var prevouts = Data()
  var sequences = Data()
  for txin in psbt.txIns {
    prevouts.append(txin.txid)
    writeUInt32(txin.vout, to: &prevouts)
    writeUInt32(txin.sequence, to: &sequences)
  }
  var outputs = Data()
  for txout in psbt.txOuts {
    writeUInt64(txout.amount, to: &outputs)
    outputs.append(UInt8(txout.script.count))
    outputs.append(txout.script)
  }

  let program = SignetVaultCrypto.hash160(publicKey)
  var scriptCode = Data([0x19, 0x76, 0xa9, 0x14])
  scriptCode.append(program)
  scriptCode.append(contentsOf: [0x88, 0xac])

  var preimage = Data()
  writeUInt32(UInt32(bitPattern: psbt.version), to: &preimage)
  preimage.append(dsha(prevouts))
  preimage.append(dsha(sequences))
  preimage.append(psbt.txIns[index].txid)
  writeUInt32(psbt.txIns[index].vout, to: &preimage)
  preimage.append(scriptCode)
  writeUInt64(utxo.amount, to: &preimage)
  writeUInt32(psbt.txIns[index].sequence, to: &preimage)
  preimage.append(dsha(outputs))
  writeUInt32(psbt.lockTime, to: &preimage)
  writeUInt32(input.sighashType ?? 1, to: &preimage)
  return dsha(preimage)
}
