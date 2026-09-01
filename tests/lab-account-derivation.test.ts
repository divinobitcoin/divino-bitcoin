import { describe, expect, it } from "vitest";

import { deriveBip84Address } from "../shared/bip84-derivation";
import {
  ACCOUNT_PATH,
  accountDescriptors,
  assertLabSeedHex,
  deriveLabAccount,
} from "../scripts/lab-account-derivation";

/**
 * Seed de teste, fixa e pública. Não é de ninguém e nunca recebeu moeda.
 * Está aqui para o teste ser determinístico; usar `randomBytes` faria a
 * suíte verificar uma coisa diferente a cada execução, que é o oposto de
 * uma regressão.
 */
const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

describe("deriveLabAccount", () => {
  /**
   * O teste que importa.
   *
   * `deriveLabAccount` monta o endereço com `@scure/btc-signer` (`btc.p2wpkh`).
   * `deriveBip84Address` monta com `bech32` + hash160 escritos à mão, e sem
   * bytes de versão de testnet. São dois caminhos escritos em momentos
   * diferentes, com bibliotecas diferentes de codificação.
   *
   * Se concordarem, duas coisas ficam provadas de uma vez: a derivação está
   * certa, e — porque um usa versão testnet e o outro não — **os bytes de
   * versão realmente não mudam endereço nenhum**, que é a afirmação em cima
   * da qual `TPUB-SERIAL-001` foi fechado. Ela estava escrita num comentário;
   * agora está verificada.
   */
  it("concorda com shared/bip84-derivation em todos os endereços derivados", () => {
    const conta = deriveLabAccount(SEED, 4);

    for (let i = 0; i <= 4; i += 1) {
      expect(conta.enderecos.recebimento[i]).toBe(
        deriveBip84Address(SEED, `${ACCOUNT_PATH}/0/${i}`, "signet-test-compatible").address,
      );
      expect(conta.enderecos.troco[i]).toBe(
        deriveBip84Address(SEED, `${ACCOUNT_PATH}/1/${i}`, "signet-test-compatible").address,
      );
    }
  });

  it("serializa a chave da conta como tpub, não xpub (regressão de TPUB-SERIAL-001)", () => {
    expect(deriveLabAccount(SEED, 0).accountXpub.startsWith("tpub")).toBe(true);
  });

  it("dá fingerprint da mestra com 8 dígitos hex, zeros à esquerda incluídos", () => {
    expect(deriveLabAccount(SEED, 0).masterFingerprint).toMatch(/^[0-9a-f]{8}$/);
  });

  it("não produz chave privada sem que peçam explicitamente", () => {
    expect(deriveLabAccount(SEED, 0).masterTprv).toBeNull();
  });

  it("produz tprv quando pedido, e é a chave da RAIZ", () => {
    const conta = deriveLabAccount(SEED, 0, { incluirChavePrivada: true });
    expect(conta.masterTprv?.startsWith("tprv")).toBe(true);
  });

  it("deriva o mesmo endereço com e sem chave privada pedida", () => {
    expect(deriveLabAccount(SEED, 0, { incluirChavePrivada: true }).enderecos.recebimento[0]).toBe(
      deriveLabAccount(SEED, 0).enderecos.recebimento[0],
    );
  });

  it("recusa faixa negativa ou fracionária", () => {
    expect(() => deriveLabAccount(SEED, -1)).toThrow(/inteiro/);
    expect(() => deriveLabAccount(SEED, 1.5)).toThrow(/inteiro/);
  });
});

describe("assertLabSeedHex", () => {
  it("recusa algo que pareça mnemonic, em vez de tentar derivar", () => {
    expect(() => assertLabSeedHex("abandon abandon abandon about")).toThrow(/mnemonic/);
  });

  it("recusa hex de comprimento ímpar e caractere fora do alfabeto", () => {
    expect(() => assertLabSeedHex("abc")).toThrow(/hexadecimal/);
    expect(() => assertLabSeedHex("zz00")).toThrow(/hexadecimal/);
  });

  it("normaliza maiúsculas", () => {
    expect(assertLabSeedHex("AABB")).toBe("aabb");
  });
});

describe("accountDescriptors", () => {
  it("carrega origem: fingerprint da mestra e caminho até a conta", () => {
    const conta = deriveLabAccount(SEED, 0);
    const { receive, change } = accountDescriptors(conta);

    expect(receive).toBe(`wpkh([${conta.masterFingerprint}/84h/1h/0h]${conta.accountXpub}/0/*)`);
    expect(change).toBe(`wpkh([${conta.masterFingerprint}/84h/1h/0h]${conta.accountXpub}/1/*)`);
  });

  it("usa h e não apóstrofo para hardened, para atravessar shell e JSON", () => {
    const { receive } = accountDescriptors(deriveLabAccount(SEED, 0));
    expect(receive).not.toContain("'");
    expect(receive).toContain("/84h/1h/0h]");
  });

  it("os dois ramos diferem só no índice do ramo", () => {
    const { receive, change } = accountDescriptors(deriveLabAccount(SEED, 0));
    expect(receive.replace("/0/*)", "/1/*)")).toBe(change);
  });
});
