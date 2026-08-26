import { describe, expect, it, vi } from "vitest";

import { fetchAddressSummary, type EsploraConfig } from "../shared/esplora-client";

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
