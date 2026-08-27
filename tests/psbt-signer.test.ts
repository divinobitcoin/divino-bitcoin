import { base64, hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import { describe, expect, it } from "vitest";

import { selectCoins } from "../shared/coin-selection";
import type { EsploraUtxo } from "../shared/esplora-client";
import { buildPsbtFromSelection, buildUnsignedPsbt } from "../shared/psbt-builder";
import {
  finalizeSignedPsbt,
  signAndFinalizeWithTestSeed,
  signPsbtWithTestSeed,
} from "../shared/psbt-signer";

/**
 * Seed de VETOR PÚBLICO do BIP-32. É lixo conhecido do mundo inteiro, o que é
 * exatamente o requisito da condição L2 da faixa LAB. Nenhuma destas chaves
 * jamais deve receber valor.
 */
const SEED_HEX = "000102030405060708090a0b0c0d0e0f";
const PATH_0 = "m/84'/1'/0'/0/0";
const PATH_1 = "m/84'/1'/0'/0/1";
const PATH_CHANGE = "m/84'/1'/0'/1/0";

const TXID_A = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
const TXID_B = "1122334455667788990011223344556677889900112233445566778899001122";

function addressAt(path: string): string {
  const root = HDKey.fromMasterSeed(hex.decode(SEED_HEX));
  const child = root.derive(path);
  const address = btc.p2wpkh(child.publicKey!, btc.TEST_NETWORK).address!;
  child.wipePrivateData();
  root.wipePrivateData();
  return address;
}

function utxo(valueSats: number, overrides: Partial<EsploraUtxo> = {}): EsploraUtxo {
  return { txid: TXID_A, vout: 0, valueSats, confirmed: true, blockHeight: 250_000, ...overrides };
}

const ADDR_0 = addressAt(PATH_0);
const ADDR_1 = addressAt(PATH_1);
const ADDR_CHANGE = addressAt(PATH_CHANGE);

function unsignedPsbt(overrides: Record<string, unknown> = {}) {
  return buildUnsignedPsbt({
    inputs: [{ utxo: utxo(100_000), ownerAddress: ADDR_0 }],
    recipientAddress: ADDR_1,
    recipientSats: 60_000,
    changeAddress: ADDR_CHANGE,
    changeSats: 39_000,
    network: "signet",
    ...overrides,
  });
}

describe("signPsbtWithTestSeed — caminho feliz", () => {
  it("assina a entrada e a PSBT passa a ter assinatura parcial", () => {
    const built = unsignedPsbt();
    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });

    expect(signed.signedInputCount).toBe(1);

    const tx = btc.Transaction.fromPSBT(base64.decode(signed.signedPsbtBase64));
    expect(tx.getInput(0).partialSig).toHaveLength(1);
    expect(tx.isFinal).toBe(false); // assinada, mas ainda não finalizada
  });

  it("não altera as saídas ao assinar", () => {
    const built = unsignedPsbt();
    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });

    const antes = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    const depois = btc.Transaction.fromPSBT(base64.decode(signed.signedPsbtBase64));

    expect(depois.outputsLength).toBe(antes.outputsLength);
    for (let i = 0; i < antes.outputsLength; i++) {
      expect(depois.getOutput(i).amount).toBe(antes.getOutput(i).amount);
      expect(hex.encode(depois.getOutput(i).script!)).toBe(hex.encode(antes.getOutput(i).script!));
    }
  });

  it("assina várias entradas de endereços diferentes, cada uma com seu caminho", () => {
    const built = buildUnsignedPsbt({
      inputs: [
        { utxo: utxo(60_000, { txid: TXID_A }), ownerAddress: ADDR_0 },
        { utxo: utxo(40_000, { txid: TXID_B }), ownerAddress: ADDR_1 },
      ],
      recipientAddress: ADDR_1,
      recipientSats: 60_000,
      changeAddress: ADDR_CHANGE,
      changeSats: 39_000,
      network: "signet",
    });

    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0, PATH_1],
      network: "signet",
    });

    const tx = btc.Transaction.fromPSBT(base64.decode(signed.signedPsbtBase64));
    expect(tx.getInput(0).partialSig).toHaveLength(1);
    expect(tx.getInput(1).partialSig).toHaveLength(1);
  });
});

describe("signPsbtWithTestSeed — recusas", () => {
  it("recusa chave que não corresponde ao script da entrada", () => {
    // O caminho errado deriva outra chave; a biblioteca precisa recusar em vez
    // de produzir uma assinatura que só falharia no broadcast.
    const built = unsignedPsbt();
    expect(() =>
      signPsbtWithTestSeed({
        psbtBase64: built.psbtBase64,
        seedHex: SEED_HEX,
        inputPaths: ["m/84'/1'/0'/0/99"],
        network: "signet",
      }),
    ).toThrow(/pubKey/i);
  });

  it("recusa quando a quantidade de caminhos não bate com a de entradas", () => {
    const built = buildUnsignedPsbt({
      inputs: [
        { utxo: utxo(60_000, { txid: TXID_A }), ownerAddress: ADDR_0 },
        { utxo: utxo(40_000, { txid: TXID_B }), ownerAddress: ADDR_1 },
      ],
      recipientAddress: ADDR_1,
      recipientSats: 60_000,
      changeAddress: ADDR_CHANGE,
      changeSats: 39_000,
      network: "signet",
    });

    expect(() =>
      signPsbtWithTestSeed({
        psbtBase64: built.psbtBase64,
        seedHex: SEED_HEX,
        inputPaths: [PATH_0],
        network: "signet",
      }),
    ).toThrow(/2 entradas.*1 caminhos/s);
  });

  it.each([
    ["hex ímpar", "abc"],
    ["não hexadecimal", "zzzz"],
    ["vazio", ""],
  ])("recusa seedHex inválida (%s)", (_label, seed) => {
    const built = unsignedPsbt();
    expect(() =>
      signPsbtWithTestSeed({
        psbtBase64: built.psbtBase64,
        seedHex: seed,
        inputPaths: [PATH_0],
        network: "signet",
      }),
    ).toThrow(/seedHex/);
  });

  it("recusa rede diferente de signet em execução, não só por tipo", () => {
    const built = unsignedPsbt();
    expect(() =>
      signPsbtWithTestSeed({
        psbtBase64: built.psbtBase64,
        seedHex: SEED_HEX,
        inputPaths: [PATH_0],
        // Força em runtime o que o tipo proíbe — é assim que um bug real
        // chegaria aqui, vindo de dado dinâmico sem tipagem.
        network: "mainnet" as unknown as "signet",
      }),
    ).toThrow();
  });
});

describe("finalizeSignedPsbt", () => {
  it("finaliza e extrai uma transação transmissível", () => {
    const built = unsignedPsbt();
    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });
    const final = finalizeSignedPsbt({
      signedPsbtBase64: signed.signedPsbtBase64,
      network: "signet",
    });

    expect(final.rawTxHex).toMatch(/^[0-9a-f]+$/);
    expect(final.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(final.inputCount).toBe(1);
    expect(final.outputCount).toBe(2);
    expect(final.vsize).toBeGreaterThan(0);
  });

  it("recusa finalizar uma PSBT que não foi assinada", () => {
    const built = unsignedPsbt();
    expect(() =>
      finalizeSignedPsbt({ signedPsbtBase64: built.psbtBase64, network: "signet" }),
    ).toThrow();
  });

  it("a transação final é reparseável e mantém os valores das saídas", () => {
    const built = unsignedPsbt();
    const final = signAndFinalizeWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });

    const tx = btc.Transaction.fromRaw(hex.decode(final.rawTxHex));
    expect(tx.outputsLength).toBe(2);
    expect(tx.getOutput(0).amount).toBe(60_000n);
    expect(tx.getOutput(1).amount).toBe(39_000n);
    expect(tx.id).toBe(final.txid);
  });
});

describe("estimativa de taxa confrontada com a transação assinada de verdade", () => {
  // Este é o teste que fecha o ciclo: a coin selection estima um tamanho antes
  // de existir assinatura; aqui a transação é realmente assinada e medida.
  // Se as constantes de vbyte estiverem erradas, a diferença aparece aqui.

  it("1 entrada, 2 saídas: a estimativa cobre o tamanho real", () => {
    const outcome = selectCoins({
      utxos: [utxo(100_000)],
      recipientAddress: ADDR_1,
      targetSats: 60_000,
      feeRateSatsPerVByte: 2,
      network: "signet",
    });
    if (!outcome.ok) throw new Error("seleção deveria ter sucesso");

    const built = buildPsbtFromSelection({
      selection: outcome.selection,
      recipientAddress: ADDR_1,
      changeAddress: ADDR_CHANGE,
      network: "signet",
      ownerAddressFor: () => ADDR_0,
    });

    const final = signAndFinalizeWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });

    // A estimativa nunca pode ficar ABAIXO do real: taxa insuficiente trava a
    // transação na mempool. Ficar um pouco acima é o erro aceito de propósito.
    expect(outcome.selection.estimatedVBytes).toBeGreaterThanOrEqual(final.vsize);
    // E não pode estar absurdamente acima — 2 vbytes de folga por entrada.
    expect(outcome.selection.estimatedVBytes - final.vsize).toBeLessThanOrEqual(2);
  });

  it("2 entradas, 2 saídas: a estimativa continua cobrindo o real", () => {
    const outcome = selectCoins({
      utxos: [utxo(60_000, { txid: TXID_A }), utxo(50_000, { txid: TXID_B })],
      recipientAddress: ADDR_1,
      targetSats: 90_000,
      feeRateSatsPerVByte: 3,
      network: "signet",
    });
    if (!outcome.ok) throw new Error("seleção deveria ter sucesso");
    expect(outcome.selection.selected).toHaveLength(2);

    const built = buildPsbtFromSelection({
      selection: outcome.selection,
      recipientAddress: ADDR_1,
      changeAddress: ADDR_CHANGE,
      network: "signet",
      ownerAddressFor: (u) => (u.txid === TXID_A ? ADDR_0 : ADDR_1),
    });

    const final = signAndFinalizeWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: built.inputCount === 2 ? [PATH_0, PATH_1] : [PATH_0],
      network: "signet",
    });

    expect(outcome.selection.estimatedVBytes).toBeGreaterThanOrEqual(final.vsize);
    expect(outcome.selection.estimatedVBytes - final.vsize).toBeLessThanOrEqual(4);
  });

  it("1 entrada, 1 saída: a taxa efetiva paga fica acima da pedida, nunca abaixo", () => {
    const outcome = selectCoins({
      utxos: [utxo(60_000 + 141 + 100)],
      recipientAddress: ADDR_1,
      targetSats: 60_000,
      feeRateSatsPerVByte: 1,
      network: "signet",
    });
    if (!outcome.ok) throw new Error("seleção deveria ter sucesso");
    expect(outcome.selection.hasChange).toBe(false);

    const built = buildPsbtFromSelection({
      selection: outcome.selection,
      recipientAddress: ADDR_1,
      changeAddress: ADDR_CHANGE,
      network: "signet",
      ownerAddressFor: () => ADDR_0,
    });

    const final = signAndFinalizeWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });

    expect(outcome.selection.feeSats / final.vsize).toBeGreaterThanOrEqual(1);
  });
});

describe("higiene: o módulo não devolve material privado", () => {
  it("nenhum campo do retorno contém a seed nem uma chave privada", () => {
    const built = unsignedPsbt();
    const signed = signPsbtWithTestSeed({
      psbtBase64: built.psbtBase64,
      seedHex: SEED_HEX,
      inputPaths: [PATH_0],
      network: "signet",
    });
    const final = finalizeSignedPsbt({
      signedPsbtBase64: signed.signedPsbtBase64,
      network: "signet",
    });

    const root = HDKey.fromMasterSeed(hex.decode(SEED_HEX));
    const child = root.derive(PATH_0);
    const privHex = hex.encode(child.privateKey!);
    child.wipePrivateData();
    root.wipePrivateData();

    const serializado = JSON.stringify({ signed, final });
    expect(serializado).not.toContain(SEED_HEX);
    expect(serializado.toLowerCase()).not.toContain(privHex.toLowerCase());
  });
});
