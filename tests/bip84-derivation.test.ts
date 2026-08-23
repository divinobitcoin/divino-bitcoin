import { describe, expect, it } from "vitest";

import { deriveBip84Address } from "../shared/bip84-derivation";
import { deriveSignetTestCompatibleAddress } from "../shared/signet-derivation-policy";
import { PUBLIC_BIP_TEST_VECTORS } from "../shared/public-bip-vectors";

describe("deriveBip84Address (função pura, sem rede/armazenamento)", () => {
  it("reproduz exatamente o endereço publicado pela especificação BIP-84", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip84;
    const result = deriveBip84Address(vector.seedHex, vector.path, "mainnet");

    expect(result.address).toBe(vector.expectedAddress);
    expect(result.address).toMatch(/^bc1/);
    expect(result.path).toBe(vector.path);
    expect(result.publicKeyHex).toHaveLength(66); // chave pública comprimida: 33 bytes
  });

  it("nunca inclui material privado no resultado", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip84;
    const result = deriveBip84Address(vector.seedHex, vector.path, "mainnet");

    expect(JSON.stringify(result)).not.toContain("xprv");
    expect(Object.keys(result)).toEqual(["path", "publicKeyHex", "address"]);
  });

  it("produz endereços diferentes para redes diferentes com a mesma seed/caminho", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip84;
    const mainnetResult = deriveBip84Address(vector.seedHex, vector.path, "mainnet");
    const signetResult = deriveBip84Address(vector.seedHex, vector.path, "signet-test-compatible");

    expect(mainnetResult.address).toMatch(/^bc1/);
    expect(signetResult.address).toMatch(/^tb1/);
    expect(mainnetResult.address).not.toBe(signetResult.address);
  });
});

describe("deriveSignetTestCompatibleAddress (integração com a política Signet)", () => {
  it("deriva um endereço tb1 válido a partir do caminho test-compatible", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip84;

    const result = deriveSignetTestCompatibleAddress("signet", vector.seedHex, {
      account: 0,
      change: 0,
      addressIndex: 0,
    });

    expect(result.path).toBe("m/84'/1'/0'/0/0");
    expect(result.address).toMatch(/^tb1/);
  });

  it("bloqueia redes que não sejam Signet", () => {
    const vector = PUBLIC_BIP_TEST_VECTORS.bip84;

    expect(() =>
      deriveSignetTestCompatibleAddress("mainnet", vector.seedHex, {
        account: 0,
        change: 0,
        addressIndex: 0,
      }),
    ).toThrow("apenas Bitcoin Signet");
  });
});
