import { describe, expect, it, vi } from "vitest";

import {
  fetchAddressSummary,
  fetchAddressUtxos,
  sumUtxoValueSats,
  type EsploraConfig,
} from "../shared/esplora-client";

const CONFIG: EsploraConfig = { baseUrl: "https://mempool.space/signet/api" };
const ADDRESS = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";

function mockFetchSequence(responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  let call = 0;
  const fn = vi.fn(async () => {
    const response = responses[call] ?? responses[responses.length - 1];
    call += 1;
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body,
    };
  });
  return fn as unknown as typeof fetch;
}

describe("fetchAddressSummary (leitura via API Esplora pública, sem credencial)", () => {
  it("chama os dois endpoints corretos, sem barra duplicada mesmo com baseUrl terminando em /", async () => {
    const fetchImpl = mockFetchSequence([
      { body: { address: ADDRESS, chain_stats: {}, mempool_stats: {} } },
      { body: [] },
    ]);

    await fetchAddressSummary({ baseUrl: "https://mempool.space/signet/api/" }, ADDRESS, fetchImpl);

    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe(`https://mempool.space/signet/api/address/${ADDRESS}`);
    expect(calls[1][0]).toBe(`https://mempool.space/signet/api/address/${ADDRESS}/utxo`);
  });

  it("interpreta corretamente um endereço sem nenhum movimento", async () => {
    const fetchImpl = mockFetchSequence([
      {
        body: {
          address: ADDRESS,
          chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
          mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
        },
      },
      { body: [] },
    ]);

    const summary = await fetchAddressSummary(CONFIG, ADDRESS, fetchImpl);

    expect(summary).toEqual({
      address: ADDRESS,
      chainBalanceSats: 0,
      mempoolBalanceSats: 0,
      chainTxCount: 0,
      mempoolTxCount: 0,
      utxoCount: 0,
    });
  });

  it("calcula saldo confirmado como funded - spent, e utxoCount pela lista de UTXOs", async () => {
    const fetchImpl = mockFetchSequence([
      {
        body: {
          address: ADDRESS,
          chain_stats: { funded_txo_sum: 150_000, spent_txo_sum: 50_000, tx_count: 3 },
          mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
        },
      },
      { body: [{ txid: "aa", vout: 0 }, { txid: "bb", vout: 1 }] },
    ]);

    const summary = await fetchAddressSummary(CONFIG, ADDRESS, fetchImpl);

    expect(summary.chainBalanceSats).toBe(100_000);
    expect(summary.utxoCount).toBe(2);
  });

  it("calcula saldo em mempool separadamente do saldo confirmado", async () => {
    const fetchImpl = mockFetchSequence([
      {
        body: {
          address: ADDRESS,
          chain_stats: { funded_txo_sum: 100_000, spent_txo_sum: 0, tx_count: 1 },
          mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 20_000, tx_count: 1 },
        },
      },
      { body: [{ txid: "cc", vout: 0 }] },
    ]);

    const summary = await fetchAddressSummary(CONFIG, ADDRESS, fetchImpl);

    expect(summary.chainBalanceSats).toBe(100_000);
    expect(summary.mempoolBalanceSats).toBe(-20_000);
  });

  it("lança erro claro quando a resposta HTTP do resumo de endereço não é 2xx", async () => {
    const fetchImpl = mockFetchSequence([{ ok: false, status: 404, body: {} }]);

    await expect(fetchAddressSummary(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow("status HTTP 404");
  });

  it("lança erro claro quando a resposta HTTP da lista de UTXOs não é 2xx", async () => {
    const fetchImpl = mockFetchSequence([
      { body: { address: ADDRESS, chain_stats: {}, mempool_stats: {} } },
      { ok: false, status: 503, body: {} },
    ]);

    await expect(fetchAddressSummary(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow("status HTTP 503");
  });

  it("nunca inclui campo fora do contrato público declarado", async () => {
    const fetchImpl = mockFetchSequence([
      {
        body: {
          address: ADDRESS,
          chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
          mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 },
        },
      },
      { body: [] },
    ]);

    const summary = await fetchAddressSummary(CONFIG, ADDRESS, fetchImpl);

    expect(Object.keys(summary).sort()).toEqual(
      ["address", "chainBalanceSats", "chainTxCount", "mempoolBalanceSats", "mempoolTxCount", "utxoCount"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// fetchAddressUtxos — entrada remota é não confiável (WF-F12, ameaça T4)
// ---------------------------------------------------------------------------

const UTXO_TXID = "a".repeat(64);

function utxoEntry(overrides: Record<string, unknown> = {}) {
  return {
    txid: UTXO_TXID,
    vout: 0,
    value: 100_000,
    status: { confirmed: true, block_height: 250_000 },
    ...overrides,
  };
}

describe("fetchAddressUtxos (lista real de UTXOs, com validação estrita)", () => {
  it("chama apenas o endpoint de UTXO e normaliza uma resposta bem formada", async () => {
    const fetchImpl = mockFetchSequence([
      {
        body: [
          utxoEntry(),
          utxoEntry({ txid: "b".repeat(64), vout: 3, value: 5_000, status: { confirmed: false } }),
        ],
      },
    ]);

    const utxos = await fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl);

    const calls = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(`https://mempool.space/signet/api/address/${ADDRESS}/utxo`);

    expect(utxos).toEqual([
      { txid: UTXO_TXID, vout: 0, valueSats: 100_000, confirmed: true, blockHeight: 250_000 },
      { txid: "b".repeat(64), vout: 3, valueSats: 5_000, confirmed: false, blockHeight: null },
    ]);
  });

  it("devolve lista vazia para endereço sem UTXO, sem inventar entrada", async () => {
    const fetchImpl = mockFetchSequence([{ body: [] }]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).resolves.toEqual([]);
  });

  it("normaliza txid maiúsculo para minúsculo, sem alterar o valor", async () => {
    const fetchImpl = mockFetchSequence([{ body: [utxoEntry({ txid: "A".repeat(64) })] }]);
    const [utxo] = await fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl);
    expect(utxo.txid).toBe("a".repeat(64));
  });

  it("trata confirmed ausente como NÃO confirmado, nunca o contrário", async () => {
    const fetchImpl = mockFetchSequence([{ body: [utxoEntry({ status: undefined })] }]);
    const [utxo] = await fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl);
    expect(utxo.confirmed).toBe(false);
    expect(utxo.blockHeight).toBeNull();
  });

  it("ignora block_height quando o UTXO não está confirmado", async () => {
    const fetchImpl = mockFetchSequence([
      { body: [utxoEntry({ status: { confirmed: false, block_height: 999 } })] },
    ]);
    const [utxo] = await fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl);
    expect(utxo.blockHeight).toBeNull();
  });

  // --- Recusa: cada caso abaixo é uma forma de o explorador induzir erro ---

  it.each([
    ["txid curto", utxoEntry({ txid: "abc" })],
    ["txid não hexadecimal", utxoEntry({ txid: "z".repeat(64) })],
    ["txid numérico", utxoEntry({ txid: 12345 })],
    ["txid ausente", utxoEntry({ txid: undefined })],
  ])("recusa a resposta inteira quando o txid é inválido (%s)", async (_label, entry) => {
    const fetchImpl = mockFetchSequence([{ body: [entry] }]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow(/txid inválido/);
  });

  it.each([
    ["vout negativo", utxoEntry({ vout: -1 })],
    ["vout fracionário", utxoEntry({ vout: 1.5 })],
    ["vout como string", utxoEntry({ vout: "0" })],
  ])("recusa a resposta inteira quando o vout é inválido (%s)", async (_label, entry) => {
    const fetchImpl = mockFetchSequence([{ body: [entry] }]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow(/vout inválido/);
  });

  it.each([
    ["valor negativo", utxoEntry({ value: -1 })],
    ["valor fracionário (BTC em vez de sats)", utxoEntry({ value: 0.001 })],
    ["valor como string", utxoEntry({ value: "100000" })],
    ["valor acima do supply total", utxoEntry({ value: 21_000_000 * 100_000_000 + 1 })],
    ["valor NaN", utxoEntry({ value: Number.NaN })],
    ["valor ausente", utxoEntry({ value: undefined })],
  ])("recusa a resposta inteira quando o value é inválido (%s)", async (_label, entry) => {
    const fetchImpl = mockFetchSequence([{ body: [entry] }]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow(/value inválido/);
  });

  it("recusa quando UM UTXO no meio da lista está corrompido, sem devolver os válidos", async () => {
    const fetchImpl = mockFetchSequence([
      { body: [utxoEntry(), utxoEntry({ value: -5 }), utxoEntry({ txid: "c".repeat(64) })] },
    ]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow(/value inválido/);
  });

  it("recusa quando o payload não é uma lista", async () => {
    const fetchImpl = mockFetchSequence([{ body: { erro: "rate limited" } }]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow(/não é uma lista/);
  });

  it("propaga erro de HTTP em vez de devolver lista vazia", async () => {
    const fetchImpl = mockFetchSequence([{ ok: false, status: 503, body: null }]);
    await expect(fetchAddressUtxos(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow(/status HTTP 503/);
  });
});

describe("sumUtxoValueSats", () => {
  it("soma zero para lista vazia", () => {
    expect(sumUtxoValueSats([])).toBe(0);
  });

  it("soma valores mantendo precisão exata de inteiro", () => {
    const utxos = [
      { txid: UTXO_TXID, vout: 0, valueSats: 2_100_000_000_000, confirmed: true, blockHeight: 1 },
      { txid: UTXO_TXID, vout: 1, valueSats: 1, confirmed: true, blockHeight: 1 },
    ];
    expect(sumUtxoValueSats(utxos)).toBe(2_100_000_000_001);
  });
});
