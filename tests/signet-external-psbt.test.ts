import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";

import { assertPsbtMatchesWatchOnly } from "../shared/signet-external-psbt";
import { buildVaultUnsignedPsbt } from "../shared/signet-vault-utxo";
import { deriveWatchAddressBook } from "../shared/signet-watch-addresses";
import { signPsbtWithTestSeed } from "../shared/psbt-signer";

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };
const master = HDKey.fromMasterSeed(hex.decode(SEED), VERSOES_TESTNET);
const conta = master.derive("m/84'/1'/0'");
const TPUB = conta.publicExtendedKey;
const FINGERPRINT = (master.fingerprint >>> 0).toString(16).padStart(8, "0");
const book = deriveWatchAddressBook({
  network: "signet",
  accountXpub: TPUB,
  masterFingerprint: FINGERPRINT,
  gap: 3,
});
const receive0 = book.receive[0]!;
const dest = book.receive[1]!.address;

function montar() {
  return buildVaultUnsignedPsbt({
    network: "signet",
    utxos: [
      {
        txid: "11".repeat(32),
        vout: 0,
        valueSats: 50_000,
        confirmed: true,
        blockHeight: 8,
        address: receive0.address,
        derivation: receive0.derivation,
      },
    ],
    recipientAddress: dest,
    targetSats: 10_000,
    feeRateSatsPerVByte: 2,
    book,
  });
}

describe("assertPsbtMatchesWatchOnly", () => {
  it("aceita PSBT desta fingerprint BIP-84 Signet e recusa outra", () => {
    const built = montar();
    expect(
      assertPsbtMatchesWatchOnly({
        psbtBase64: built.psbtBase64,
        network: "signet",
        masterFingerprint: FINGERPRINT,
        book,
      }).totalInputSats,
    ).toBe(50_000);

    expect(() =>
      assertPsbtMatchesWatchOnly({
        psbtBase64: built.psbtBase64,
        network: "signet",
        masterFingerprint: "deadbeef",
        book,
      }),
    ).toThrow(/Fingerprint/);
  });

  it("aceita a PSBT depois da assinatura LAB da mesma seed descartável", () => {
    const built = montar();
    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED,
      inputPaths: ["m/84'/1'/0'/0/0"],
      network: "signet",
    });
    expect(
      assertPsbtMatchesWatchOnly({
        psbtBase64: signed.signedPsbtBase64,
        network: "signet",
        masterFingerprint: FINGERPRINT,
        book,
      }).totalInputSats,
    ).toBe(50_000);
  });
});
