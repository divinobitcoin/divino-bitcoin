import { HDKey } from "@scure/bip32";
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english.js";
import { describe, expect, it } from "vitest";

import { PUBLIC_BIP_TEST_VECTORS } from "../shared/public-bip-vectors";

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

describe("conformidade scure com vetores BIP públicos", () => {
  it("reproduz o vetor BIP-39 publicado sem aceitar entrada de usuário", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip39;

    expect(validateMnemonic(vector.mnemonic, englishWordlist)).toBe(true);
    expect(entropyToMnemonic(hexToBytes(vector.entropyHex), englishWordlist)).toBe(vector.mnemonic);
    expect(bytesToHex(mnemonicToEntropy(vector.mnemonic, englishWordlist))).toBe(vector.entropyHex);

    // A passphrase TREZOR é parte do vetor público oficial, não uma opção do produto.
    expect(bytesToHex(mnemonicToSeedSync(vector.mnemonic, vector.passphrase))).toBe(vector.expectedSeedHex);
  });

  it("reproduz apenas o xpub publicado do vetor BIP-32", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip32;
    const root = HDKey.fromMasterSeed(hexToBytes(vector.seedHex));
    const child = root.derive(vector.path);

    try {
      expect(child.publicExtendedKey).toBe(vector.expectedExtendedPublicKey);
      expect(child.publicExtendedKey).toMatch(/^xpub/);
    } finally {
      child.wipePrivateData();
      root.wipePrivateData();
    }
  });
});
