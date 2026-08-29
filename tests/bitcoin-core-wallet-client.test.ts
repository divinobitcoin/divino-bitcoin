import { describe, expect, it, vi } from "vitest";

import {
  broadcastRawTransactionViaCoreRpc,
  ensureWatchOnlyWallet,
  getWatchOnlyBalanceSummary,
  importWatchOnlyDescriptors,
  listWatchOnlyUtxos,
  type BitcoinCoreWalletConfig,
} from "../shared/bitcoin-core-wallet-client";

const CONFIG: BitcoinCoreWalletConfig = {
  url: "http://127.0.0.1:38332",
  username: "test_user",
  password: "test_password",
  walletName: "divino-watch-only",
};

// Mesma transação real de BROADCAST-REAL-001, reaproveitada aqui para
// testar o precheck contra bytes verificados de verdade, não inventados.
const RAW_REAL =
  "020000000001011518503dfe8e58bebb508ac3c95ce9bd399adc38b17e8c733ae059271d731d4b0100000000fdffffff028813000000000000160014306b0e91bfc57cebb994b28f831c5f25cadc20876f12000000000000160014b66d68a069e00cd3eeb88b3aa8cbc565af43032602483045022100e705ee3fc2e9b76ece347c3ce9e4ddd530dda610c61a893a1c78785154b29c6702203787d2e7a6551d7f5eada400fcf26b7e38b3de07efc762365ba4ff3dce35a1300121022be393012e9d3c3e7cbf0865f218f451504274fd187fe18a6cef8192385f1bdf00000000";
const TXID_REAL = "87174464d90500db2e87227dee5d123f5f5c4b14642dd8499d398819d0e7238c";

function jsonRpcRouter(handlers: Record<string, (params: unknown[]) => unknown>) {
  return vi.fn(async (_url: string, options: { body: string }) => {
    const body = JSON.parse(options.body) as { method: string; params: unknown[] };
    const handler = handlers[body.method];
    if (!handler) {
      throw new Error(`Método RPC não esperado no teste: ${body.method}`);
    }
    const outcome = handler(body.params);
    if (outcome instanceof ErrorResult) {
      return { ok: true, status: 200, json: async () => ({ error: outcome.error }) };
    }
    return { ok: true, status: 200, json: async () => ({ result: outcome }) };
  }) as unknown as typeof fetch;
}

class ErrorResult {
  constructor(public error: { code: number; message: string }) {}
}

describe("ensureWatchOnlyWallet", () => {
  it("cria a wallet e confirma private_keys_enabled=false", async () => {
    const fetchImpl = jsonRpcRouter({
      createwallet: () => ({ name: CONFIG.walletName, warning: "" }),
      getwalletinfo: () => ({ private_keys_enabled: false, descriptors: true }),
    });

    const result = await ensureWatchOnlyWallet(CONFIG, fetchImpl);

    expect(result).toEqual({ walletName: CONFIG.walletName, alreadyExisted: false });
  });

  it("cai para loadwallet se createwallet falhar, e marca alreadyExisted", async () => {
    const fetchImpl = jsonRpcRouter({
      createwallet: () => new ErrorResult({ code: -4, message: "database already exists" }),
      loadwallet: () => ({ name: CONFIG.walletName, warning: "" }),
      getwalletinfo: () => ({ private_keys_enabled: false, descriptors: true }),
    });

    const result = await ensureWatchOnlyWallet(CONFIG, fetchImpl);

    expect(result).toEqual({ walletName: CONFIG.walletName, alreadyExisted: true });
  });

  it("lança erro combinado se createwallet E loadwallet falharem", async () => {
    const fetchImpl = jsonRpcRouter({
      createwallet: () => new ErrorResult({ code: -4, message: "motivo A" }),
      loadwallet: () => new ErrorResult({ code: -18, message: "motivo B" }),
    });

    await expect(ensureWatchOnlyWallet(CONFIG, fetchImpl)).rejects.toThrow(/motivo A/);
    await expect(ensureWatchOnlyWallet(CONFIG, fetchImpl)).rejects.toThrow(/motivo B/);
  });

  it("recusa prosseguir se o nó devolver private_keys_enabled != false", async () => {
    const fetchImpl = jsonRpcRouter({
      createwallet: () => ({ name: CONFIG.walletName }),
      getwalletinfo: () => ({ private_keys_enabled: true, descriptors: true }),
    });

    await expect(ensureWatchOnlyWallet(CONFIG, fetchImpl)).rejects.toThrow(/private_keys_enabled/);
  });
});

describe("importWatchOnlyDescriptors", () => {
  const DESCRIPTORS = {
    receive: "wpkh([00000000/84h/1h/0h]tpub000/0/*)",
    change: "wpkh([00000000/84h/1h/0h]tpub000/1/*)",
    birthday: "now" as const,
    rangeEnd: 999,
  };

  it("confere hasprivatekeys=false em cada descriptor antes de importar", async () => {
    let importCalled = false;
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: (params) => {
        const desc = params[0] as string;
        return { checksum: "abcd1234", hasprivatekeys: false, descriptor: desc };
      },
      importdescriptors: () => {
        importCalled = true;
        return [{ success: true }, { success: true }];
      },
    });

    await importWatchOnlyDescriptors(CONFIG, DESCRIPTORS, fetchImpl);

    expect(importCalled).toBe(true);
  });

  it("recusa importar se um descriptor tiver chave privada", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () => ({ checksum: "abcd1234", hasprivatekeys: true }),
      importdescriptors: () => {
        throw new Error("não deveria ser chamado");
      },
    });

    await expect(importWatchOnlyDescriptors(CONFIG, DESCRIPTORS, fetchImpl)).rejects.toThrow(/chave privada/);
  });

  it("lança se um dos dois ramos falhar no import, mesmo com o outro ok", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () => ({ checksum: "abcd1234", hasprivatekeys: false }),
      importdescriptors: () => [{ success: true }, { success: false, error: { message: "faixa inválida" } }],
    });

    await expect(importWatchOnlyDescriptors(CONFIG, DESCRIPTORS, fetchImpl)).rejects.toThrow(/faixa inválida/);
  });
});

describe("listWatchOnlyUtxos", () => {
  it("converte BTC (float) para satoshis (inteiro) sem erro de arredondamento", async () => {
    const fetchImpl = jsonRpcRouter({
      listunspent: () => [
        {
          txid: "aa".repeat(32),
          vout: 0,
          address: "tb1qexemplo",
          amount: 0.00009999999999999999, // deveria virar exatamente 10000 sats
          confirmations: 3,
        },
      ],
    });

    const utxos = await listWatchOnlyUtxos(CONFIG, {}, fetchImpl);

    expect(utxos).toEqual([
      {
        txid: "aa".repeat(32),
        vout: 0,
        address: "tb1qexemplo",
        valueSats: 10000,
        confirmed: true,
        blockHeight: null,
      },
    ]);
  });

  it("marca não confirmado quando confirmations <= 0", async () => {
    const fetchImpl = jsonRpcRouter({
      listunspent: () => [
        { txid: "bb".repeat(32), vout: 1, address: "tb1qoutro", amount: 0.0001, confirmations: 0 },
      ],
    });

    const utxos = await listWatchOnlyUtxos(CONFIG, {}, fetchImpl);

    expect(utxos[0].confirmed).toBe(false);
  });

  it("recusa a lista inteira se um UTXO vier malformado", async () => {
    const fetchImpl = jsonRpcRouter({
      listunspent: () => [{ txid: "não é um txid", vout: 0, address: "x", amount: 0, confirmations: 1 }],
    });

    await expect(listWatchOnlyUtxos(CONFIG, {}, fetchImpl)).rejects.toThrow(/txid inválido/);
  });
});

describe("getWatchOnlyBalanceSummary", () => {
  it("lê o grupo watchonly, não o grupo mine", async () => {
    const fetchImpl = jsonRpcRouter({
      getbalances: () => ({
        mine: { trusted: 999 }, // se isto for lido por engano, o teste abaixo falha
        watchonly: { trusted: 0.0001, untrusted_pending: 0.00005, immature: 0 },
      }),
    });

    const summary = await getWatchOnlyBalanceSummary(CONFIG, fetchImpl);

    expect(summary).toEqual({ trustedSats: 10000, untrustedPendingSats: 5000, immatureSats: 0 });
  });

  it("lança se a resposta não tiver grupo watchonly", async () => {
    const fetchImpl = jsonRpcRouter({ getbalances: () => ({ mine: { trusted: 0 } }) });

    await expect(getWatchOnlyBalanceSummary(CONFIG, fetchImpl)).rejects.toThrow(/watchonly/);
  });
});

describe("broadcastRawTransactionViaCoreRpc", () => {
  it("transmite quando o txid local bate com o esperado e com o devolvido pelo nó", async () => {
    const fetchImpl = jsonRpcRouter({ sendrawtransaction: () => TXID_REAL });

    const result = await broadcastRawTransactionViaCoreRpc({
      config: CONFIG,
      review: { rawTxHex: RAW_REAL, txid: TXID_REAL },
      fetchImpl,
    });

    expect(result).toEqual({ txid: TXID_REAL });
  });

  it("recusa transmitir, sem nenhuma chamada de rede, se o txid local não bater com o esperado", async () => {
    const fetchImpl = vi.fn();

    await expect(
      broadcastRawTransactionViaCoreRpc({
        config: CONFIG,
        review: { rawTxHex: RAW_REAL, txid: "00".repeat(32) },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/diferente do expectedTxid/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("lança se o nó devolver um txid diferente do esperado", async () => {
    const fetchImpl = jsonRpcRouter({ sendrawtransaction: () => "11".repeat(32) });

    await expect(
      broadcastRawTransactionViaCoreRpc({
        config: CONFIG,
        review: { rawTxHex: RAW_REAL, txid: TXID_REAL },
        fetchImpl,
      }),
    ).rejects.toThrow(/nó devolveu o txid/);
  });

  it("propaga o erro do nó (ex: já foi transmitida) sem mascarar a mensagem", async () => {
    const fetchImpl = jsonRpcRouter({
      sendrawtransaction: () => new ErrorResult({ code: -27, message: "Transaction already in block chain" }),
    });

    await expect(
      broadcastRawTransactionViaCoreRpc({
        config: CONFIG,
        review: { rawTxHex: RAW_REAL, txid: TXID_REAL },
        fetchImpl,
      }),
    ).rejects.toThrow(/already in block chain/);
  });
});
