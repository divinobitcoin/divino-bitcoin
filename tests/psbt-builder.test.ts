import { base64, hex } from "@scure/base";
import * as btc from "@scure/btc-signer";
import { describe, expect, it } from "vitest";

import { selectCoins } from "../shared/coin-selection";
import type { EsploraUtxo } from "../shared/esplora-client";
import { parsePublicTestPsbt } from "../shared/psbt-parser";
import {
  DEFAULT_MAX_FEE_SATS,
  FINAL_SEQUENCE,
  RBF_SEQUENCE,
  buildPsbtFromSelection,
  buildUnsignedPsbt,
  type BuildPsbtRequest,
} from "../shared/psbt-builder";

// Endereços Signet/Testnet públicos. Nenhum recebe valor: este módulo não
// assina nem transmite, e a rede é Signet.
const OWNER = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
const RECIPIENT = "tb1q2xq57yyxwzkw6tthcxq9mhtxxj7f63e3dgldfj";
const CHANGE = "tb1pnzwqkakt2cuhrlwfhme3asrvx4s0xfyadm57tkpu2a39t9hqtahs2p6h4g";
const MAINNET = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

const TXID_A = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
const TXID_B = "1122334455667788990011223344556677889900112233445566778899001122";

function utxo(valueSats: number, overrides: Partial<EsploraUtxo> = {}): EsploraUtxo {
  return { txid: TXID_A, vout: 0, valueSats, confirmed: true, blockHeight: 250_000, ...overrides };
}

function request(overrides: Partial<BuildPsbtRequest> = {}): BuildPsbtRequest {
  return {
    inputs: [{ utxo: utxo(100_000), ownerAddress: OWNER }],
    recipientAddress: RECIPIENT,
    recipientSats: 60_000,
    changeAddress: OWNER,
    changeSats: 39_000,
    network: "signet",
    ...overrides,
  };
}

describe("buildUnsignedPsbt — resultado bem formado", () => {
  it("produz uma PSBT que o parser do próprio projeto consegue ler", () => {
    const built = buildUnsignedPsbt(request());
    const parsed = parsePublicTestPsbt(built.psbtBase64, "signet");

    expect(parsed.inputCount).toBe(1);
    expect(parsed.outputCount).toBe(2);
    expect(parsed.outputs[0]).toEqual({ address: RECIPIENT, amountSats: 60_000 });
    expect(parsed.outputs[1]).toEqual({ address: OWNER, amountSats: 39_000 });
  });

  it("base64 e hex descrevem exatamente os mesmos bytes", () => {
    const built = buildUnsignedPsbt(request());
    expect(hex.encode(base64.decode(built.psbtBase64))).toBe(built.psbtHex);
  });

  it("calcula a taxa como entrada menos saídas", () => {
    const built = buildUnsignedPsbt(request());
    expect(built.totalInputSats).toBe(100_000);
    expect(built.totalOutputSats).toBe(99_000);
    expect(built.feeSats).toBe(1_000);
  });

  it("omite a saída de troco quando o troco é zero", () => {
    const built = buildUnsignedPsbt(
      request({ recipientSats: 99_000, changeSats: 0, changeAddress: undefined }),
    );
    expect(built.outputCount).toBe(1);
    expect(parsePublicTestPsbt(built.psbtBase64, "signet").outputCount).toBe(1);
  });

  it("aceita destino P2TR", () => {
    const built = buildUnsignedPsbt(request({ recipientAddress: CHANGE }));
    const parsed = parsePublicTestPsbt(built.psbtBase64, "signet");
    expect(parsed.outputs[0].address).toBe(CHANGE);
  });

  it("aceita várias entradas de endereços diferentes", () => {
    const built = buildUnsignedPsbt(
      request({
        inputs: [
          { utxo: utxo(60_000, { txid: TXID_A }), ownerAddress: OWNER },
          { utxo: utxo(40_000, { txid: TXID_B }), ownerAddress: RECIPIENT },
        ],
      }),
    );
    expect(built.inputCount).toBe(2);
    expect(built.totalInputSats).toBe(100_000);
  });
});

describe("buildUnsignedPsbt — ordem de bytes do txid", () => {
  it("preserva o txid exatamente como recebido, sem inverter", () => {
    // Esta é a verificação que impede a carteira de gastar um output
    // inexistente. O txid entra em ordem de exibição, como o Esplora devolve.
    const built = buildUnsignedPsbt(request());
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    expect(hex.encode(tx.getInput(0).txid!)).toBe(TXID_A);
  });

  it("inverte o txid na serialização crua, como o protocolo exige", () => {
    const built = buildUnsignedPsbt(request());
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    const raw = hex.encode(tx.unsignedTx);
    const esperadoInvertido = TXID_A.match(/../g)!.reverse().join("");

    expect(raw.slice(10, 10 + 64)).toBe(esperadoInvertido);
    expect(raw.slice(10, 10 + 64)).not.toBe(TXID_A);
  });

  it("preserva o vout", () => {
    const built = buildUnsignedPsbt(
      request({ inputs: [{ utxo: utxo(100_000, { vout: 7 }), ownerAddress: OWNER }] }),
    );
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    expect(tx.getInput(0).index).toBe(7);
  });
});

describe("buildUnsignedPsbt — RBF e locktime", () => {
  it("sinaliza RBF por padrão", () => {
    const built = buildUnsignedPsbt(request());
    expect(built.rbfEnabled).toBe(true);
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    expect(tx.getInput(0).sequence).toBe(RBF_SEQUENCE);
  });

  it("desliga RBF quando explicitamente pedido", () => {
    const built = buildUnsignedPsbt(request({ enableRbf: false }));
    expect(built.rbfEnabled).toBe(false);
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    expect(tx.getInput(0).sequence).toBe(FINAL_SEQUENCE);
  });

  it("aplica o mesmo sequence a todas as entradas", () => {
    const built = buildUnsignedPsbt(
      request({
        inputs: [
          { utxo: utxo(60_000, { txid: TXID_A }), ownerAddress: OWNER },
          { utxo: utxo(40_000, { txid: TXID_B }), ownerAddress: OWNER },
        ],
      }),
    );
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));
    expect(tx.getInput(0).sequence).toBe(RBF_SEQUENCE);
    expect(tx.getInput(1).sequence).toBe(RBF_SEQUENCE);
  });

  it("usa locktime 0 por padrão e respeita o valor passado", () => {
    expect(buildUnsignedPsbt(request()).lockTime).toBe(0);
    expect(buildUnsignedPsbt(request({ lockTime: 250_000 })).lockTime).toBe(250_000);
  });

  it("recusa locktime fora da faixa de 32 bits", () => {
    expect(() => buildUnsignedPsbt(request({ lockTime: -1 }))).toThrow(/lockTime/);
    expect(() => buildUnsignedPsbt(request({ lockTime: 0x1_0000_0000 }))).toThrow(/lockTime/);
  });
});

describe("buildUnsignedPsbt — recusas de aritmética", () => {
  it("recusa quando as saídas somam mais que as entradas", () => {
    expect(() =>
      buildUnsignedPsbt(request({ recipientSats: 90_000, changeSats: 50_000 })),
    ).toThrow(/somam mais que as entradas/);
  });

  it("recusa taxa zero, que a rede não retransmitiria", () => {
    expect(() =>
      buildUnsignedPsbt(request({ recipientSats: 61_000, changeSats: 39_000 })),
    ).toThrow(/Taxa zero/);
  });

  it("recusa taxa absurda, tratando como erro de cálculo", () => {
    expect(() =>
      buildUnsignedPsbt(request({ recipientSats: 1_000, changeSats: 0, changeAddress: undefined })),
    ).toThrow(/passa do teto/);
  });

  it("permite taxa alta quando o teto é levantado de propósito", () => {
    const built = buildUnsignedPsbt(
      request({
        recipientSats: 1_000,
        changeSats: 0,
        changeAddress: undefined,
        maxFeeSats: 100_000,
      }),
    );
    expect(built.feeSats).toBe(99_000);
  });

  it("o teto padrão é o documentado", () => {
    expect(DEFAULT_MAX_FEE_SATS).toBe(25_000);
  });

  it.each([
    ["destino fracionário", { recipientSats: 60_000.5 }],
    ["destino negativo", { recipientSats: -1 }],
  ])("recusa %s", (_label, override) => {
    expect(() => buildUnsignedPsbt(request(override))).toThrow(/recipientSats/);
  });

  it("recusa troco fracionário", () => {
    expect(() => buildUnsignedPsbt(request({ changeSats: 39_000.5 }))).toThrow(/changeSats/);
  });
});

describe("buildUnsignedPsbt — recusas estruturais", () => {
  it("recusa PSBT sem nenhuma entrada", () => {
    expect(() => buildUnsignedPsbt(request({ inputs: [] }))).toThrow(/pelo menos uma entrada/);
  });

  it("recusa o mesmo outpoint duas vezes", () => {
    expect(() =>
      buildUnsignedPsbt(
        request({
          inputs: [
            { utxo: utxo(60_000, { txid: TXID_A, vout: 0 }), ownerAddress: OWNER },
            { utxo: utxo(40_000, { txid: TXID_A, vout: 0 }), ownerAddress: OWNER },
          ],
        }),
      ),
    ).toThrow(/Entrada duplicada/);
  });

  it("aceita o mesmo txid com vouts diferentes — não é duplicata", () => {
    const built = buildUnsignedPsbt(
      request({
        inputs: [
          { utxo: utxo(60_000, { txid: TXID_A, vout: 0 }), ownerAddress: OWNER },
          { utxo: utxo(40_000, { txid: TXID_A, vout: 1 }), ownerAddress: OWNER },
        ],
      }),
    );
    expect(built.inputCount).toBe(2);
  });

  it("recusa troco maior que zero sem endereço de troco", () => {
    expect(() => buildUnsignedPsbt(request({ changeAddress: undefined }))).toThrow(
      /exige changeAddress/,
    );
  });
});

describe("buildUnsignedPsbt — fronteira de rede", () => {
  it("recusa endereço de destino de Mainnet numa PSBT de Signet", () => {
    expect(() => buildUnsignedPsbt(request({ recipientAddress: MAINNET }))).toThrow(
      /de destino inválido para a rede signet/,
    );
  });

  it("recusa endereço de origem de Mainnet numa PSBT de Signet", () => {
    expect(() =>
      buildUnsignedPsbt(request({ inputs: [{ utxo: utxo(100_000), ownerAddress: MAINNET }] })),
    ).toThrow(/de origem inválido para a rede signet/);
  });

  it("recusa endereço de troco de Mainnet numa PSBT de Signet", () => {
    expect(() => buildUnsignedPsbt(request({ changeAddress: MAINNET }))).toThrow(
      /de troco inválido para a rede signet/,
    );
  });

  it("nomeia qual endereço está errado, não só que algum está", () => {
    try {
      buildUnsignedPsbt(request({ recipientAddress: "lixo" }));
      throw new Error("deveria ter lançado");
    } catch (error) {
      expect((error as Error).message).toContain("de destino");
      expect((error as Error).message).toContain("lixo");
    }
  });
});

describe("buildPsbtFromSelection — integração com coin selection", () => {
  it("vai de UTXOs a PSBT passando pela seleção, e a aritmética fecha ponta a ponta", () => {
    const utxos = [utxo(70_000, { txid: TXID_A }), utxo(50_000, { txid: TXID_B })];

    const outcome = selectCoins({
      utxos,
      recipientAddress: RECIPIENT,
      targetSats: 60_000,
      feeRateSatsPerVByte: 2,
      network: "signet",
    });
    if (!outcome.ok) throw new Error(`seleção deveria ter sucesso: ${outcome.reason}`);

    const built = buildPsbtFromSelection({
      selection: outcome.selection,
      recipientAddress: RECIPIENT,
      changeAddress: OWNER,
      network: "signet",
      ownerAddressFor: () => OWNER,
    });

    // A taxa que a PSBT realmente paga é a que a seleção prometeu.
    expect(built.feeSats).toBe(outcome.selection.feeSats);
    expect(built.totalInputSats).toBe(outcome.selection.totalInputSats);
    expect(built.totalInputSats).toBe(built.totalOutputSats + built.feeSats);

    const parsed = parsePublicTestPsbt(built.psbtBase64, "signet");
    expect(parsed.outputs[0].amountSats).toBe(60_000);
  });

  it("produz PSBT de uma saída só quando a seleção descartou o troco", () => {
    // Alvo e entrada calibrados para o troco cair abaixo da poeira.
    const outcome = selectCoins({
      utxos: [utxo(60_000 + 141 + 100)],
      recipientAddress: RECIPIENT,
      targetSats: 60_000,
      feeRateSatsPerVByte: 1,
      network: "signet",
    });
    if (!outcome.ok) throw new Error("seleção deveria ter sucesso");
    expect(outcome.selection.hasChange).toBe(false);

    const built = buildPsbtFromSelection({
      selection: outcome.selection,
      recipientAddress: RECIPIENT,
      changeAddress: OWNER,
      network: "signet",
      ownerAddressFor: () => OWNER,
    });

    expect(built.outputCount).toBe(1);
    expect(built.feeSats).toBe(outcome.selection.feeSats);
  });

  it("propaga o erro quando ownerAddressFor não sabe responder", () => {
    const outcome = selectCoins({
      utxos: [utxo(100_000)],
      recipientAddress: RECIPIENT,
      targetSats: 60_000,
      feeRateSatsPerVByte: 1,
      network: "signet",
    });
    if (!outcome.ok) throw new Error("seleção deveria ter sucesso");

    expect(() =>
      buildPsbtFromSelection({
        selection: outcome.selection,
        recipientAddress: RECIPIENT,
        changeAddress: OWNER,
        network: "signet",
        ownerAddressFor: (u) => {
          throw new Error(`endereço desconhecido para ${u.txid}:${u.vout}`);
        },
      }),
    ).toThrow(/endereço desconhecido/);
  });
});

describe("buildUnsignedPsbt — a PSBT não está assinada", () => {
  it("não contém assinatura nem testemunha", () => {
    const built = buildUnsignedPsbt(request());
    const tx = btc.Transaction.fromPSBT(base64.decode(built.psbtBase64));

    expect(tx.isFinal).toBe(false);
    const input = tx.getInput(0);
    expect(input.partialSig ?? []).toHaveLength(0);
    expect(input.finalScriptWitness).toBeUndefined();
  });

  it("é determinística: a mesma entrada produz exatamente os mesmos bytes", () => {
    expect(buildUnsignedPsbt(request()).psbtHex).toBe(buildUnsignedPsbt(request()).psbtHex);
  });
});
