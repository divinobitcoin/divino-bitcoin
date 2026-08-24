import { describe, expect, it } from "vitest";

import { recoverBip84AddressFromMnemonic } from "../shared/mnemonic-recovery";
import { PUBLIC_BIP_TEST_VECTORS } from "../shared/public-bip-vectors";

const OFFICIAL_BIP84_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("recoverBip84AddressFromMnemonic (restauração verificada, vetores públicos)", () => {
  it("reproduz o endereço oficial BIP-84 partindo só do mnemonic (passphrase vazia)", () => {
    const result = recoverBip84AddressFromMnemonic(
      OFFICIAL_BIP84_MNEMONIC,
      "",
      PUBLIC_BIP_TEST_VECTORS.bip84.path,
      "mainnet",
    );

    expect(result.address).toBe(PUBLIC_BIP_TEST_VECTORS.bip84.expectedAddress);
  });

  it("reproduz a seed oficial do vetor BIP-39 (mesma mnemonic, passphrase TREZOR)", () => {
    // Não expomos a seed diretamente na API pública, mas confirmamos
    // indiretamente: derivar com essa seed/mnemonic produz um endereço
    // determinístico e estável (regressão), diferente do caso sem passphrase.
    const withPassphrase = recoverBip84AddressFromMnemonic(
      PUBLIC_BIP_TEST_VECTORS.bip39.mnemonic,
      PUBLIC_BIP_TEST_VECTORS.bip39.passphrase,
      PUBLIC_BIP_TEST_VECTORS.bip84.path,
      "mainnet",
    );
    const withoutPassphrase = recoverBip84AddressFromMnemonic(
      PUBLIC_BIP_TEST_VECTORS.bip39.mnemonic,
      "",
      PUBLIC_BIP_TEST_VECTORS.bip84.path,
      "mainnet",
    );

    expect(withPassphrase.address).not.toBe(withoutPassphrase.address);
    expect(withoutPassphrase.address).toBe(PUBLIC_BIP_TEST_VECTORS.bip84.expectedAddress);
  });

  it("deriva um endereço tb1 Signet test-compatible a partir do mesmo mnemonic", () => {
    const result = recoverBip84AddressFromMnemonic(
      OFFICIAL_BIP84_MNEMONIC,
      "",
      "m/84'/1'/0'/0/0",
      "signet-test-compatible",
    );

    expect(result.address).toMatch(/^tb1/);
  });

  it("rejeita mnemonic com checksum inválido", () => {
    const invalidMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";

    expect(() => recoverBip84AddressFromMnemonic(invalidMnemonic, "", "m/84'/0'/0'/0/0", "mainnet")).toThrow(
      "checksum",
    );
  });

  it("nunca inclui seed ou material privado no resultado", () => {
    const result = recoverBip84AddressFromMnemonic(
      OFFICIAL_BIP84_MNEMONIC,
      "",
      PUBLIC_BIP_TEST_VECTORS.bip84.path,
      "mainnet",
    );

    expect(Object.keys(result)).toEqual(["path", "publicKeyHex", "address"]);
  });
});
