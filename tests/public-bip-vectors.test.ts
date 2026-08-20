import { describe, expect, it } from "vitest";

import {
  BIP39_PASSPHRASE_POLICY,
  PUBLIC_BIP_TEST_VECTORS,
} from "../shared/public-bip-vectors";
import {
  formatSignetTestCompatibleBip84Path,
  SIGNET_TEST_COMPATIBLE_BIP84_POLICY,
} from "../shared/signet-derivation-policy";

describe("catálogo público de vetores BIP", () => {
  it("fixa o vetor BIP-39 oficial apenas como dado público de teste", () => {
    expect(PUBLIC_BIP_TEST_VECTORS.bip39.classification).toBe("public-specification-vector");
    expect(PUBLIC_BIP_TEST_VECTORS.bip39.entropyHex).toHaveLength(32);
    expect(PUBLIC_BIP_TEST_VECTORS.bip39.expectedSeedHex).toHaveLength(128);
    expect(PUBLIC_BIP_TEST_VECTORS.bip39.mnemonic.split(" ")).toHaveLength(12);
  });

  it("conserva vetores públicos BIP-32 e BIP-84 sem expor chave privada", () => {
    expect(PUBLIC_BIP_TEST_VECTORS.bip32.path).toBe("m/0'/1/2'");
    expect(PUBLIC_BIP_TEST_VECTORS.bip32.expectedExtendedPublicKey).toMatch(/^xpub/);
    expect(PUBLIC_BIP_TEST_VECTORS.bip84.path).toBe("m/84'/0'/0'/0/0");
    expect(PUBLIC_BIP_TEST_VECTORS.bip84.expectedAddress).toMatch(/^bc1/);
    expect(JSON.stringify(PUBLIC_BIP_TEST_VECTORS)).not.toContain("xprv");
  });

  it("mantém passphrase e derivação real bloqueadas nesta fase", () => {
    expect(BIP39_PASSPHRASE_POLICY.enabled).toBe(false);
    expect(SIGNET_TEST_COMPATIBLE_BIP84_POLICY.derivationImplemented).toBe(false);
    expect(SIGNET_TEST_COMPATIBLE_BIP84_POLICY.passphraseSupported).toBe(false);
  });
});

describe("contrato de caminho Signet compatível com BIP-84", () => {
  it("formata um caminho test-compatible sem derivar material de chave", () => {
    expect(
      formatSignetTestCompatibleBip84Path("signet", {
        account: 0,
        change: 0,
        addressIndex: 0,
      }),
    ).toBe("m/84'/1'/0'/0/0");
  });

  it("bloqueia redes não Signet e índices BIP-32 inválidos", () => {
    expect(() => formatSignetTestCompatibleBip84Path("mainnet", { account: 0, change: 0, addressIndex: 0 })).toThrow(
      "apenas Bitcoin Signet",
    );
    expect(() => formatSignetTestCompatibleBip84Path("signet", { account: -1, change: 0, addressIndex: 0 })).toThrow(
      "account precisa ser um índice BIP-32",
    );
    expect(() => formatSignetTestCompatibleBip84Path("signet", { account: 0, change: 0, addressIndex: 0x80000000 })).toThrow(
      "addressIndex precisa ser um índice BIP-32",
    );
  });
});
