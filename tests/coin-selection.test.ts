import { describe, expect, it } from "vitest";

import type { EsploraUtxo } from "../shared/esplora-client";
import {
  P2WPKH_DUST_THRESHOLD_SATS,
  P2WPKH_INPUT_VBYTES,
  P2WPKH_OUTPUT_VBYTES,
  TX_OVERHEAD_VBYTES,
  outputVBytesForAddress,
  selectCoins,
  type CoinSelectionRequest,
} from "../shared/coin-selection";

// Endereços Signet/Testnet públicos, usados só para medir tamanho de saída.
// Nenhum deles recebe nada nestes testes: o módulo não constrói nem transmite.
const SIGNET_P2WPKH = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
const SIGNET_P2WSH = "tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqq9lxq8";
const SIGNET_P2SH = "2MsX9d7whKiRATPBtQ3er6dr3LwFjS9JmXs";
const SIGNET_P2TR = "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c";
const SIGNET_P2PKH = "mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn";
const MAINNET_P2WPKH = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

function utxo(valueSats: number, overrides: Partial<EsploraUtxo> = {}): EsploraUtxo {
  return {
    txid: String(valueSats).padStart(64, "0"),
    vout: 0,
    valueSats,
    confirmed: true,
    blockHeight: 250_000,
    ...overrides,
  };
}

function request(overrides: Partial<CoinSelectionRequest> = {}): CoinSelectionRequest {
  return {
    utxos: [utxo(100_000)],
    recipientAddress: SIGNET_P2WPKH,
    targetSats: 50_000,
    feeRateSatsPerVByte: 1,
    network: "signet",
    ...overrides,
  };
}

/** Recalcula a taxa esperada do zero, sem reusar a aritmética do módulo. */
function expectedFee(inputs: number, outputVBytes: number, rate: number): number {
  return Math.ceil((TX_OVERHEAD_VBYTES + inputs * P2WPKH_INPUT_VBYTES + outputVBytes) * rate);
}

describe("outputVBytesForAddress", () => {
  it.each([
    ["P2WPKH", SIGNET_P2WPKH, 31],
    ["P2WSH", SIGNET_P2WSH, 43],
    ["P2TR", SIGNET_P2TR, 43],
    ["P2PKH", SIGNET_P2PKH, 34],
    ["P2SH", SIGNET_P2SH, 32],
  ])("mede %s corretamente (%s → %i vbytes)", (_label, address, expected) => {
    expect(outputVBytesForAddress(address, "signet")).toBe(expected);
  });

  it("não confunde P2WSH com P2WPKH, apesar do prefixo igual", () => {
    // Se a medição fosse por prefixo em vez de decodificação real, estes dois
    // dariam o mesmo número e a taxa sairia subestimada em 12 vbytes.
    expect(outputVBytesForAddress(SIGNET_P2WSH, "signet")).toBeGreaterThan(
      outputVBytesForAddress(SIGNET_P2WPKH, "signet"),
    );
  });

  it("recusa endereço de Mainnet quando a rede pedida é Signet", () => {
    expect(() => outputVBytesForAddress(MAINNET_P2WPKH, "signet")).toThrow(/inválido para a rede signet/);
  });

  it("recusa endereço de Signet quando a rede pedida é Mainnet", () => {
    expect(() => outputVBytesForAddress(SIGNET_P2WPKH, "mainnet")).toThrow(/inválido para a rede mainnet/);
  });

  it.each([
    ["string vazia", ""],
    ["lixo", "não é endereço"],
    ["bech32 com checksum quebrado", "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsy"],
  ])("recusa endereço inválido (%s)", (_label, address) => {
    expect(() => outputVBytesForAddress(address, "signet")).toThrow(/inválido/);
  });
});

describe("selectCoins — entrada inválida lança", () => {
  it.each([
    ["alvo fracionário", { targetSats: 1000.5 }],
    ["alvo negativo", { targetSats: -1 }],
    ["alvo acima do supply", { targetSats: 21_000_000 * 100_000_000 + 1 }],
  ])("recusa %s", (_label, override) => {
    expect(() => selectCoins(request(override))).toThrow(/targetSats/);
  });

  it.each([
    ["taxa zero", { feeRateSatsPerVByte: 0 }],
    ["taxa negativa", { feeRateSatsPerVByte: -1 }],
    ["taxa NaN", { feeRateSatsPerVByte: Number.NaN }],
    ["taxa infinita", { feeRateSatsPerVByte: Number.POSITIVE_INFINITY }],
  ])("recusa %s", (_label, override) => {
    expect(() => selectCoins(request(override))).toThrow(/feeRateSatsPerVByte/);
  });
});

describe("selectCoins — casos que falham por regra da rede", () => {
  it("recusa alvo abaixo do limite de poeira", () => {
    const outcome = selectCoins(request({ targetSats: 293 }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("target-below-dust");
  });

  it("aceita alvo exatamente no limite de poeira", () => {
    const outcome = selectCoins(
      request({ targetSats: P2WPKH_DUST_THRESHOLD_SATS, utxos: [utxo(100_000)] }),
    );
    expect(outcome.ok).toBe(true);
  });

  it("reporta ausência de UTXO gastável quando a lista está vazia", () => {
    const outcome = selectCoins(request({ utxos: [] }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("no-spendable-utxos");
  });
});

describe("selectCoins — confirmação", () => {
  it("ignora UTXO não confirmado por padrão", () => {
    const outcome = selectCoins(
      request({ utxos: [utxo(100_000, { confirmed: false, blockHeight: null })] }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("no-spendable-utxos");
    expect(outcome.message).toMatch(/não confirmado/);
  });

  it("usa UTXO não confirmado quando explicitamente permitido", () => {
    const outcome = selectCoins(
      request({
        utxos: [utxo(100_000, { confirmed: false, blockHeight: null })],
        allowUnconfirmed: true,
      }),
    );
    expect(outcome.ok).toBe(true);
  });

  it("prefere o confirmado e nem toca no não confirmado quando o confirmado basta", () => {
    const confirmado = utxo(100_000, { txid: "c".repeat(64) });
    const naoConfirmado = utxo(900_000, { txid: "d".repeat(64), confirmed: false, blockHeight: null });

    const outcome = selectCoins(request({ utxos: [naoConfirmado, confirmado] }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.selection.selected).toHaveLength(1);
    expect(outcome.selection.selected[0].txid).toBe(confirmado.txid);
  });
});

describe("selectCoins — caso normal com troco", () => {
  it("gasta uma entrada, devolve troco e fecha a aritmética", () => {
    const outcome = selectCoins(request({ utxos: [utxo(100_000)], targetSats: 50_000 }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const s = outcome.selection;
    const fee = expectedFee(1, P2WPKH_OUTPUT_VBYTES * 2, 1);

    expect(s.selected).toHaveLength(1);
    expect(s.feeSats).toBe(fee);
    expect(s.changeSats).toBe(100_000 - 50_000 - fee);
    expect(s.hasChange).toBe(true);
    expect(s.droppedToFeeSats).toBe(0);
    expect(s.totalInputSats).toBe(s.targetSats + s.changeSats + s.feeSats);
  });

  it("ordena por valor decrescente e usa o mínimo de entradas", () => {
    const outcome = selectCoins(
      request({
        utxos: [utxo(10_000), utxo(80_000), utxo(5_000), utxo(30_000)],
        targetSats: 70_000,
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.selection.selected).toHaveLength(1);
    expect(outcome.selection.selected[0].valueSats).toBe(80_000);
  });

  it("acumula várias entradas quando uma só não cobre", () => {
    const outcome = selectCoins(
      request({ utxos: [utxo(30_000), utxo(30_000), utxo(30_000)], targetSats: 70_000 }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.selection.selected).toHaveLength(3);
    expect(outcome.selection.totalInputSats).toBe(90_000);
  });

  it("cobra mais taxa por entrada adicional", () => {
    const uma = selectCoins(request({ utxos: [utxo(100_000)], targetSats: 50_000 }));
    const duas = selectCoins(
      request({ utxos: [utxo(50_000), utxo(50_000)], targetSats: 50_000 }),
    );
    if (!uma.ok || !duas.ok) throw new Error("ambas deveriam ter sucesso");

    expect(duas.selection.feeSats - uma.selection.feeSats).toBe(P2WPKH_INPUT_VBYTES);
  });

  it("cobra mais taxa para destino P2TR do que para P2WPKH", () => {
    const paraWpkh = selectCoins(request({ recipientAddress: SIGNET_P2WPKH }));
    const paraTr = selectCoins(request({ recipientAddress: SIGNET_P2TR }));
    if (!paraWpkh.ok || !paraTr.ok) throw new Error("ambas deveriam ter sucesso");

    expect(paraTr.selection.feeSats).toBe(paraWpkh.selection.feeSats + 12);
  });
});

describe("selectCoins — troco abaixo da poeira vira taxa", () => {
  it("descarta o troco e paga a diferença como taxa quando o troco seria poeira", () => {
    // Montado para que, com saída de troco, sobre um valor positivo mas menor
    // que 294 sat. Sem a saída de troco a transação encolhe 31 vbytes.
    const feeComTroco = expectedFee(1, P2WPKH_OUTPUT_VBYTES * 2, 1); // 141
    const alvo = 50_000;
    const entrada = alvo + feeComTroco + 100; // troco de 100 sat = poeira

    const outcome = selectCoins(request({ utxos: [utxo(entrada)], targetSats: alvo }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const s = outcome.selection;
    expect(s.hasChange).toBe(false);
    expect(s.changeSats).toBe(0);
    expect(s.droppedToFeeSats).toBeGreaterThan(0);
    expect(s.feeSats).toBe(entrada - alvo);
    expect(s.totalInputSats).toBe(s.targetSats + s.changeSats + s.feeSats);
  });

  it("a taxa efetiva fica acima da pedida quando há troco descartado", () => {
    const feeComTroco = expectedFee(1, P2WPKH_OUTPUT_VBYTES * 2, 1);
    const outcome = selectCoins(
      request({ utxos: [utxo(50_000 + feeComTroco + 100)], targetSats: 50_000 }),
    );
    if (!outcome.ok) throw new Error("deveria ter sucesso");
    expect(outcome.selection.effectiveFeeRateSatsPerVByte).toBeGreaterThan(1);
  });

  it("gasta o UTXO inteiro quando ele cobre exatamente alvo mais taxa sem troco", () => {
    const feeSemTroco = expectedFee(1, P2WPKH_OUTPUT_VBYTES, 1); // 110
    const alvo = 50_000;

    const outcome = selectCoins(request({ utxos: [utxo(alvo + feeSemTroco)], targetSats: alvo }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.selection.hasChange).toBe(false);
    expect(outcome.selection.feeSats).toBe(feeSemTroco);
    expect(outcome.selection.droppedToFeeSats).toBe(0);
  });

  it("mantém o troco quando ele fica exatamente no limite de poeira", () => {
    const feeComTroco = expectedFee(1, P2WPKH_OUTPUT_VBYTES * 2, 1);
    const alvo = 50_000;
    const entrada = alvo + feeComTroco + P2WPKH_DUST_THRESHOLD_SATS;

    const outcome = selectCoins(request({ utxos: [utxo(entrada)], targetSats: alvo }));
    if (!outcome.ok) throw new Error("deveria ter sucesso");
    expect(outcome.selection.hasChange).toBe(true);
    expect(outcome.selection.changeSats).toBe(P2WPKH_DUST_THRESHOLD_SATS);
  });
});

describe("selectCoins — saldo insuficiente", () => {
  it("falha quando o total nem cobre o alvo", () => {
    const outcome = selectCoins(request({ utxos: [utxo(10_000)], targetSats: 50_000 }));
    if (outcome.ok) throw new Error("deveria falhar por saldo insuficiente");
    if (outcome.reason !== "insufficient-funds") throw new Error(`razão errada: ${outcome.reason}`);
    expect(outcome.availableSats).toBe(10_000);
    expect(outcome.requiredSats).toBeGreaterThan(50_000);
  });

  it("falha quando cobre o alvo mas não a taxa — o caso traiçoeiro", () => {
    // 50.000 sat de entrada para enviar 50.000 sat: o saldo "dá", mas não
    // sobra nada para a taxa. Uma carteira que não checasse isso montaria uma
    // transação inválida.
    const outcome = selectCoins(request({ utxos: [utxo(50_000)], targetSats: 50_000 }));
    if (outcome.ok) throw new Error("deveria falhar por saldo insuficiente");
    if (outcome.reason !== "insufficient-funds") throw new Error(`razão errada: ${outcome.reason}`);
    expect(outcome.availableSats).toBe(50_000);
  });

  it("falha por um satoshi de diferença", () => {
    const feeSemTroco = expectedFee(1, P2WPKH_OUTPUT_VBYTES, 1);
    const alvo = 50_000;
    const outcome = selectCoins(
      request({ utxos: [utxo(alvo + feeSemTroco - 1)], targetSats: alvo }),
    );
    expect(outcome.ok).toBe(false);
  });

  it("informa disponível e necessário para a interface poder explicar", () => {
    const outcome = selectCoins(request({ utxos: [utxo(1_000), utxo(2_000)], targetSats: 50_000 }));
    if (outcome.ok) throw new Error("deveria falhar");
    if (outcome.reason !== "insufficient-funds") throw new Error("razão errada");
    expect(outcome.availableSats).toBe(3_000);
    expect(outcome.message).toMatch(/Saldo insuficiente/);
  });
});

describe("selectCoins — taxa alta", () => {
  it("uma taxa alta o bastante torna insuficiente um saldo que bastava", () => {
    const barato = selectCoins(request({ utxos: [utxo(51_000)], targetSats: 50_000, feeRateSatsPerVByte: 1 }));
    const caro = selectCoins(request({ utxos: [utxo(51_000)], targetSats: 50_000, feeRateSatsPerVByte: 100 }));

    expect(barato.ok).toBe(true);
    expect(caro.ok).toBe(false);
  });

  it("aceita taxa fracionária e arredonda a taxa para cima", () => {
    const outcome = selectCoins(request({ feeRateSatsPerVByte: 1.5 }));
    if (!outcome.ok) throw new Error("deveria ter sucesso");
    expect(outcome.selection.feeSats).toBe(expectedFee(1, P2WPKH_OUTPUT_VBYTES * 2, 1.5));
    expect(Number.isInteger(outcome.selection.feeSats)).toBe(true);
  });
});

describe("selectCoins — determinismo e ausência de efeito colateral", () => {
  it("produz o mesmo resultado para a mesma entrada", () => {
    const entrada = request({ utxos: [utxo(30_000), utxo(70_000), utxo(50_000)], targetSats: 90_000 });
    const a = selectCoins(entrada);
    const b = selectCoins(entrada);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("desempata deterministicamente entre UTXOs de valor idêntico", () => {
    const mesmos = [
      utxo(50_000, { txid: "b".repeat(64) }),
      utxo(50_000, { txid: "a".repeat(64) }),
    ];
    const outcome = selectCoins(request({ utxos: mesmos, targetSats: 40_000 }));
    if (!outcome.ok) throw new Error("deveria ter sucesso");
    expect(outcome.selection.selected[0].txid).toBe("a".repeat(64));
  });

  it("não modifica a lista de UTXOs que recebeu", () => {
    const original = [utxo(10_000), utxo(90_000), utxo(50_000)];
    const copia = original.map((u) => ({ ...u }));
    selectCoins(request({ utxos: original, targetSats: 80_000 }));
    expect(original).toEqual(copia);
  });
});
