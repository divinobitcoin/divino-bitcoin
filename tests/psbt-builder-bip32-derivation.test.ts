import { ripemd160 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64, hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import { describe, expect, it } from "vitest";

import {
  buildUnsignedPsbt,
  type Bip32DerivationInfo,
  type PsbtInputSource,
} from "../shared/psbt-builder";

/**
 * `PSBT-DERIV-001` — a PSBT passa a carregar a origem das chaves.
 *
 * ## Por que estes testes existem
 *
 * Uma carteira que montou a transação sabe de cabeça quais chaves usar. Um
 * **assinador externo** recebe bytes de um aparelho que nunca viu, e sem
 * `bip32Derivation` ele não sabe qual chave derivar para cada entrada. Ele não
 * erra: recusa.
 *
 * O que estes testes protegem não é o preenchimento — é a **recusa**. Um campo
 * preenchido errado é pior que ausente, porque manda o assinador usar outra
 * chave e o defeito só aparece no aparelho do usuário.
 */

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const CAMINHO_ENTRADA = "m/84'/1'/0'/0/0";
const CAMINHO_TROCO = "m/84'/1'/0'/1/0";

function origem(path: string): Bip32DerivationInfo {
  const root = HDKey.fromMasterSeed(hex.decode(SEED));
  const filho = root.derive(path);
  return {
    publicKeyHex: hex.encode(filho.publicKey!),
    masterFingerprint: root.fingerprint.toString(16).padStart(8, "0"),
    path,
  };
}

function enderecoDe(path: string): string {
  const filho = HDKey.fromMasterSeed(hex.decode(SEED)).derive(path);
  return btc.p2wpkh(filho.publicKey!, btc.TEST_NETWORK).address!;
}

const ENDERECO_ENTRADA = enderecoDe(CAMINHO_ENTRADA);
const ENDERECO_TROCO = enderecoDe(CAMINHO_TROCO);
const DESTINO = "tb1q6cjfaxg7z2g9jskcneex6hnvx23a43j48l2dd0";

function entrada(indice: number, derivation?: Bip32DerivationInfo): PsbtInputSource {
  return {
    utxo: {
      txid: `${String(indice).repeat(2)}${"a".repeat(62)}`.slice(0, 64),
      vout: 0,
      valueSats: 50_000,
      confirmed: true,
      blockHeight: 320_433,
    },
    ownerAddress: ENDERECO_ENTRADA,
    ...(derivation ? { derivation } : {}),
  };
}

function montar(overrides: Partial<Parameters<typeof buildUnsignedPsbt>[0]> = {}) {
  return buildUnsignedPsbt({
    inputs: [entrada(1, origem(CAMINHO_ENTRADA))],
    recipientAddress: DESTINO,
    recipientSats: 30_000,
    changeAddress: ENDERECO_TROCO,
    changeSats: 19_000,
    changeDerivation: origem(CAMINHO_TROCO),
    network: "signet",
    ...overrides,
  });
}

describe("bip32Derivation — o que a PSBT passa a carregar", () => {
  it("preenche entradas e troco, e anuncia isso no resultado", () => {
    const psbt = montar();
    expect(psbt.hasInputDerivations).toBe(true);
    expect(psbt.hasChangeDerivation).toBe(true);
  });

  /**
   * Round-trip pelos **bytes**, não pelo objeto em memória.
   *
   * É a classe de defeito que teste de aritmética não pega: a estrutura está
   * certa e a serialização sai errada. Foi exatamente assim que o
   * `TPUB-SERIAL-001` apareceu — e só contra o nó real, depois de 24 testes
   * verdes.
   */
  it("a origem sobrevive à serialização, com chave, fingerprint e caminho intactos", () => {
    const esperada = origem(CAMINHO_ENTRADA);
    const psbt = montar();
    const lida = btc.Transaction.fromPSBT(base64.decode(psbt.psbtBase64));
    const derivacao = lida.getInput(0).bip32Derivation;

    expect(derivacao).toHaveLength(1);
    const [chave, info] = derivacao![0]!;
    expect(hex.encode(chave)).toBe(esperada.publicKeyHex);
    expect((info.fingerprint >>> 0).toString(16).padStart(8, "0")).toBe(esperada.masterFingerprint);
    // 84' , 1' , 0' , 0 , 0 — hardened somam 0x80000000
    expect(info.path).toEqual([0x80000054, 0x80000001, 0x80000000, 0, 0]);
  });

  /**
   * A BIP-174 grava a fingerprint como 4 bytes **na ordem em que ela é
   * escrita**. Inverter produziria uma PSBT que um assinador externo recusaria
   * sem dizer por quê — e nenhum teste de igualdade de objeto pegaria, porque
   * o round-trip pela mesma biblioteca inverteria de volta.
   *
   * Por isso este teste olha os bytes crus.
   */
  it("a fingerprint aparece nos bytes crus na mesma ordem em que é escrita", () => {
    const psbt = montar();
    expect(psbt.psbtHex).toContain(origem(CAMINHO_ENTRADA).masterFingerprint);
  });

  it("continua montando sem derivação nenhuma, como antes", () => {
    const psbt = montar({ inputs: [entrada(1)], changeDerivation: undefined });
    expect(psbt.hasInputDerivations).toBe(false);
    expect(psbt.hasChangeDerivation).toBe(false);
    expect(btc.Transaction.fromPSBT(base64.decode(psbt.psbtBase64)).getInput(0).bip32Derivation)
      .toBeUndefined();
  });

  it("o troco carrega a origem, que é o que deixa o assinador reconhecer o troco", () => {
    const psbt = montar();
    const lida = btc.Transaction.fromPSBT(base64.decode(psbt.psbtBase64));
    const derivacao = lida.getOutput(1).bip32Derivation;
    expect(derivacao).toHaveLength(1);
    expect(hex.encode(derivacao![0]![0])).toBe(origem(CAMINHO_TROCO).publicKeyHex);
  });
});

describe("bip32Derivation — as recusas, que é o que importa", () => {
  /**
   * **A recusa mais importante do módulo.**
   *
   * Sem esta conferência, o builder estaria repassando adiante a palavra de
   * quem chamou. Uma chave trocada — por engano ou por ataque — produziria uma
   * PSBT que manda o assinador usar a chave errada, e a falha só apareceria no
   * aparelho do usuário, na hora de assinar.
   */
  it("recusa chave pública que não corresponde ao endereço da entrada", () => {
    const trocada = { ...origem(CAMINHO_ENTRADA), publicKeyHex: origem(CAMINHO_TROCO).publicKeyHex };
    expect(() => montar({ inputs: [entrada(1, trocada)] })).toThrow(
      /não corresponde ao endereço/,
    );
  });

  it("recusa chave pública que não corresponde ao endereço de troco", () => {
    expect(() => montar({ changeDerivation: origem(CAMINHO_ENTRADA) })).toThrow(
      /não corresponde ao endereço/,
    );
  });

  /**
   * Preenchimento pela metade é pior que ausência: o assinador externo assina o
   * que reconhece, devolve o resto sem assinar, e quem vê "assinada" transmite
   * uma transação inválida.
   */
  it("recusa derivação em parte das entradas — é tudo ou nada", () => {
    expect(() =>
      montar({ inputs: [entrada(1, origem(CAMINHO_ENTRADA)), entrada(2)] }),
    ).toThrow(/tudo ou nada/);
  });

  it("aceita quando TODAS as entradas têm derivação", () => {
    const psbt = montar({
      inputs: [entrada(1, origem(CAMINHO_ENTRADA)), entrada(2, origem(CAMINHO_ENTRADA))],
      recipientSats: 60_000,
      changeSats: 39_000,
    });
    expect(psbt.hasInputDerivations).toBe(true);
    expect(psbt.inputCount).toBe(2);
  });

  it("recusa chave pública não comprimida", () => {
    const naoComprimida = { ...origem(CAMINHO_ENTRADA), publicKeyHex: `04${"ab".repeat(64)}` };
    expect(() => montar({ inputs: [entrada(1, naoComprimida)] })).toThrow(/comprimida/);
  });

  it("recusa fingerprint que não tem 8 caracteres hex", () => {
    for (const ruim of ["25beba0", "25beba033", "25beba0z", ""]) {
      const info = { ...origem(CAMINHO_ENTRADA), masterFingerprint: ruim };
      expect(() => montar({ inputs: [entrada(1, info)] })).toThrow(/8 caracteres hex/);
    }
  });

  it("recusa caminho malformado", () => {
    for (const ruim of ["84'/1'/0'/0/0", "m/84'/x/0", "m/84''/1'", "caminho"]) {
      const info = { ...origem(CAMINHO_ENTRADA), path: ruim };
      expect(() => montar({ inputs: [entrada(1, info)] })).toThrow(/inválido/);
    }
  });

  it('recusa o caminho "m" sozinho', () => {
    const info = { ...origem(CAMINHO_ENTRADA), path: "m" };
    expect(() => montar({ inputs: [entrada(1, info)] })).toThrow(/só "m"/);
  });

  it("recusa changeDerivation quando não há troco", () => {
    expect(() =>
      montar({ changeSats: 0, changeAddress: undefined, recipientSats: 49_000 }),
    ).toThrow(/sem saída de troco/);
  });
});

describe("bip32Derivation — aceita h e ' para hardened", () => {
  /**
   * As duas formas são válidas na BIP-380 e as duas circulam por aí. O `h`
   * atravessa shell, JSON e cópia-e-cola sem virar aspas erradas — é por isso
   * que `accountDescriptors` usa `h`. Aqui as duas precisam produzir a mesma
   * PSBT, byte por byte, ou um kit escrito de um jeito não recuperaria a conta
   * escrita do outro.
   */
  it("m/84h/1h/0h/0/0 produz exatamente a mesma PSBT que m/84'/1'/0'/0/0", () => {
    const comApostrofo = montar();
    const comH = montar({
      inputs: [entrada(1, { ...origem(CAMINHO_ENTRADA), path: "m/84h/1h/0h/0/0" })],
      changeDerivation: { ...origem(CAMINHO_TROCO), path: "m/84h/1h/0h/1/0" },
    });
    expect(comH.psbtBase64).toBe(comApostrofo.psbtBase64);
  });
});

describe("a conferência de chave é aritmética de hash, não derivação", () => {
  /**
   * A ADR-0001 proíbe *runtime root* de derivar chave. `shared/` é runtime
   * root. Esta conferência cabe lá porque só compara `hash160(chave pública)`
   * com o programa do script — não há chave privada, nem BIP-32, nem seed.
   *
   * O teste refaz a conta por fora para provar que é isso mesmo que acontece.
   */
  it("hash160 da chave pública é o programa de 20 bytes do script P2WPKH", () => {
    const chave = hex.decode(origem(CAMINHO_ENTRADA).publicKeyHex);
    const script = btc.OutScript.encode(btc.Address(btc.TEST_NETWORK).decode(ENDERECO_ENTRADA));
    expect(script).toHaveLength(22);
    expect(hex.encode(script.slice(0, 2))).toBe("0014");
    expect(hex.encode(script.slice(2))).toBe(hex.encode(ripemd160(sha256(chave))));
  });
});
