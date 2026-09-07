import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import { describe, expect, it } from "vitest";

import {
  assertTb1qSignetAddress,
  deriveWatchAddressBook,
  nextUnusedChange,
} from "../shared/signet-watch-addresses";

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };
const conta = HDKey.fromMasterSeed(hex.decode(SEED), VERSOES_TESTNET).derive("m/84'/1'/0'");
const TPUB = conta.publicExtendedKey;
const XPUB = HDKey.fromMasterSeed(hex.decode(SEED)).derive("m/84'/0'/0'").publicExtendedKey;
const FINGERPRINT = "0a0b0c0d";

describe("deriveWatchAddressBook", () => {
  it("deriva tb1q a partir do tpub, sem seed", () => {
    const expected = btc.p2wpkh(conta.derive("m/0/0").publicKey!, btc.TEST_NETWORK).address;
    const book = deriveWatchAddressBook({
      network: "signet",
      accountXpub: TPUB,
      masterFingerprint: FINGERPRINT,
      gap: 3,
    });
    expect(book.receive).toHaveLength(3);
    expect(book.change).toHaveLength(3);
    expect(book.receive[0]!.address).toBe(expected);
    expect(book.receive[0]!.address.startsWith("tb1q")).toBe(true);
    expect(book.receive[0]!.path).toBe("m/84'/1'/0'/0/0");
    expect(book.change[0]!.path).toBe("m/84'/1'/0'/1/0");
    expect(book.receive[0]!.derivation.masterFingerprint).toBe(FINGERPRINT);
  });

  it("recusa xpub Mainnet e tprv", () => {
    expect(() =>
      deriveWatchAddressBook({ network: "signet", accountXpub: XPUB, masterFingerprint: FINGERPRINT, gap: 1 }),
    ).toThrow(/Mainnet|tpub/);
    expect(() =>
      deriveWatchAddressBook({
        network: "signet",
        accountXpub: conta.privateExtendedKey!,
        masterFingerprint: FINGERPRINT,
        gap: 1,
      }),
    ).toThrow(/privada|tpub/i);
  });

  it("recusa se o endereço 0 do cofre não bater com o tpub", () => {
    expect(() =>
      deriveWatchAddressBook({
        network: "signet",
        accountXpub: TPUB,
        masterFingerprint: FINGERPRINT,
        gap: 1,
        receiveAddress0: "tb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
      }),
    ).toThrow(/não confere/);
  });
});

describe("assertTb1qSignetAddress", () => {
  it("recusa Mainnet e aceita tb1q", () => {
    expect(() => assertTb1qSignetAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toThrow(/Mainnet/);
    const address = btc.p2wpkh(conta.derive("m/0/1").publicKey!, btc.TEST_NETWORK).address!;
    expect(assertTb1qSignetAddress(` ${address} `)).toBe(address);
  });
});

describe("nextUnusedChange", () => {
  it("escolhe o primeiro endereço de troco ainda não usado", () => {
    const book = deriveWatchAddressBook({
      network: "signet",
      accountXpub: TPUB,
      masterFingerprint: FINGERPRINT,
      gap: 3,
    });
    const next = nextUnusedChange(book, [book.change[0]!.address]);
    expect(next.address).toBe(book.change[1]!.address);
  });
});
