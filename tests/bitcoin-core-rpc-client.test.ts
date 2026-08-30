import { describe, expect, it, vi } from "vitest";

import { scanAddressUtxoSet, type BitcoinCoreRpcConfig } from "../shared/bitcoin-core-rpc-client";

const CONFIG: BitcoinCoreRpcConfig = {
  url: "http://127.0.0.1:38332",
  username: "test_user",
  password: "test_password",
};

const ADDRESS = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";

function mockFetch(response: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => response,
  })) as unknown as typeof fetch;
}

describe("scanAddressUtxoSet (leitura via scantxoutset, sem wallet/assinatura)", () => {
  it("envia a requisição JSON-RPC no formato correto", async () => {
    const fetchImpl = mockFetch({
      result: { success: true, total_amount: 0, unspents: [], bestblock: "abc", height: 100 },
    });

    await scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(CONFIG.url);

    const body = JSON.parse(options.body);
    expect(body.method).toBe("scantxoutset");
    expect(body.params).toEqual(["start", [`addr(${ADDRESS})`]]);

    expect(options.headers.Authorization).toMatch(/^Basic /);
  });

  it("interpreta corretamente um resultado sem saldo", async () => {
    const fetchImpl = mockFetch({
      result: { success: true, total_amount: 0, unspents: [], bestblock: "abc123", height: 319070 },
    });

    const summary = await scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl);

    expect(summary).toEqual({
      address: ADDRESS,
      totalAmountBtc: 0,
      utxoCount: 0,
      bestBlockHash: "abc123",
      height: 319070,
    });
  });

  it("interpreta corretamente um resultado com UTXOs", async () => {
    const fetchImpl = mockFetch({
      result: {
        success: true,
        total_amount: 0.0005,
        unspents: [{ txid: "aa", vout: 0 }, { txid: "bb", vout: 1 }],
        bestblock: "def456",
        height: 319071,
      },
    });

    const summary = await scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl);

    expect(summary.totalAmountBtc).toBe(0.0005);
    expect(summary.utxoCount).toBe(2);
  });

  it("lança erro claro quando o RPC retorna erro (corpo JSON-RPC, HTTP 2xx)", async () => {
    const fetchImpl = mockFetch({ error: { message: "credenciais inválidas" } });

    await expect(scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow("credenciais inválidas");
  });

  // RPC-HTTP-STATUS-001: o Core real devolve HTTP 500 (não 200) para a
  // maioria dos erros de nível RPC, com a mensagem real no corpo JSON-RPC.
  // Este teste existe porque a versão anterior deste mock sempre respondia
  // `ok: true` para o caso de erro, escondendo um bug real: o código lia
  // `!response.ok` antes do corpo e descartava a mensagem, trocando por um
  // "status HTTP 500" genérico. O mesmo achado apareceu contra o nó real em
  // shared/bitcoin-core-wallet-client.ts e foi corrigido lá primeiro.
  it("lança erro claro quando o RPC retorna erro via HTTP 500 (comportamento real do Core)", async () => {
    const fetchImpl = mockFetch({ error: { message: "credenciais inválidas" } }, false, 500);

    await expect(scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow("credenciais inválidas");
  });

  it("lança erro claro quando a resposta HTTP não é 2xx e não tem corpo JSON-RPC legível", async () => {
    const fetchImpl = mockFetch({}, false, 401);

    await expect(scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl)).rejects.toThrow("status HTTP 401");
  });

  it("nunca inclui chave privada, seed ou credenciais no resultado", async () => {
    const fetchImpl = mockFetch({
      result: { success: true, total_amount: 0, unspents: [], bestblock: "x", height: 1 },
    });

    const summary = await scanAddressUtxoSet(CONFIG, ADDRESS, fetchImpl);

    expect(Object.keys(summary)).toEqual(["address", "totalAmountBtc", "utxoCount", "bestBlockHash", "height"]);
    expect(JSON.stringify(summary)).not.toContain(CONFIG.password);
  });
});
