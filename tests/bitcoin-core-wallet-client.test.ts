import { describe, expect, it, vi } from "vitest";

import {
  broadcastRawTransactionViaCoreRpc,
  ensureWatchOnlyWallet,
  getDescriptorInfo,
  getWatchOnlyBalanceSummary,
  importWatchOnlyAddress,
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

// O Core devolve HTTP 500 (não 200) para erro de nível RPC, com a
// mensagem real no corpo JSON — confirmado contra o nó real em
// 29/08/2026 (foi um bug de verdade: a primeira versão deste mock
// devolvia ok:true/status:200 para ErrorResult, o que fez os testes
// passarem enquanto o código de produção lia !response.ok antes do corpo
// e descartava a mensagem. Terceira vez neste arquivo que o mock repete
// a mesma suposição errada do código — ver getbalances/mine no commit
// anterior para a segunda).
function jsonRpcRouter(handlers: Record<string, (params: unknown[]) => unknown>) {
  return vi.fn(async (_url: string, options: { body: string }) => {
    const body = JSON.parse(options.body) as { method: string; params: unknown[] };
    const handler = handlers[body.method];
    if (!handler) {
      throw new Error(`Método RPC não esperado no teste: ${body.method}`);
    }
    const outcome = handler(body.params);
    if (outcome instanceof ErrorResult) {
      return { ok: false, status: 500, json: async () => ({ error: outcome.error }) };
    }
    return { ok: true, status: 200, json: async () => ({ result: outcome }) };
  }) as unknown as typeof fetch;
}

class ErrorResult {
  constructor(public error: { code: number; message: string }) {}
}

describe("getDescriptorInfo", () => {
  const DESC = "wpkh([729c0d85/84h/1h/0h]tpubDDTd/0/*)";

  it("devolve checksum e a natureza do descriptor", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: (params) => ({
        descriptor: params[0],
        checksum: "abcd1234",
        hasprivatekeys: false,
      }),
    });

    const info = await getDescriptorInfo(CONFIG, DESC, fetchImpl);

    expect(info).toEqual({ descriptor: DESC, checksum: "abcd1234", hasPrivateKeys: false });
  });

  it("fala com a URL do NÓ, não com a da wallet — getdescriptorinfo não exige wallet carregada", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      urls.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: { checksum: "abcd1234", hasprivatekeys: false } }),
      };
    }) as unknown as typeof fetch;

    await getDescriptorInfo(CONFIG, DESC, fetchImpl);

    expect(urls).toEqual(["http://127.0.0.1:38332"]);
  });

  it("não engole hasprivatekeys=true — quem chama decide, mas precisa saber", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () => ({ checksum: "abcd1234", hasprivatekeys: true }),
    });

    await expect(getDescriptorInfo(CONFIG, DESC, fetchImpl)).resolves.toMatchObject({
      hasPrivateKeys: true,
    });
  });

  it("lança quando hasprivatekeys vem ausente, em vez de assumir false", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () => ({ checksum: "abcd1234" }),
    });

    await expect(getDescriptorInfo(CONFIG, DESC, fetchImpl)).rejects.toThrow(
      /não disse se o descriptor tem chave privada/,
    );
  });

  it("recusa checksum com forma inesperada — entrada remota é não confiável (WF-F12)", async () => {
    for (const checksum of ["", "abc", "ABCD1234", "abcd12345", null, 42]) {
      const fetchImpl = jsonRpcRouter({
        getdescriptorinfo: () => ({ checksum, hasprivatekeys: false }),
      });

      await expect(getDescriptorInfo(CONFIG, DESC, fetchImpl)).rejects.toThrow(/checksum inesperado/);
    }
  });

  it("propaga o erro do nó com a mensagem real, mesmo vindo em HTTP 500", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () =>
        new ErrorResult({ code: -5, message: "wpkh(): key 'xpub...' is not valid" }),
    });

    await expect(getDescriptorInfo(CONFIG, DESC, fetchImpl)).rejects.toThrow(/is not valid/);
  });
});

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

  it("trata loadwallet com código -35 (já carregada) como sucesso, não como erro", async () => {
    // Reproduz o que aconteceu de verdade contra o nó real em 29/08/2026:
    // rodar o smoke test duas vezes seguidas sem descarregar a wallet faz
    // o createwallet falhar (já existe) E o loadwallet falhar também, mas
    // com "already loaded" — que não é uma falha real, é o estado que a
    // função queria alcançar.
    const fetchImpl = jsonRpcRouter({
      createwallet: () => new ErrorResult({ code: -4, message: "Database already exists." }),
      loadwallet: () => new ErrorResult({ code: -35, message: `Wallet "${CONFIG.walletName}" is already loaded.` }),
      getwalletinfo: () => ({ private_keys_enabled: false, descriptors: true }),
    });

    const result = await ensureWatchOnlyWallet(CONFIG, fetchImpl);

    expect(result).toEqual({ walletName: CONFIG.walletName, alreadyExisted: true });
  });

  it("lança erro combinado se createwallet E loadwallet falharem por outro motivo", async () => {
    const fetchImpl = jsonRpcRouter({
      createwallet: () => new ErrorResult({ code: -4, message: "motivo A" }),
      loadwallet: () => new ErrorResult({ code: -18, message: "motivo B" }),
    });

    await expect(ensureWatchOnlyWallet(CONFIG, fetchImpl)).rejects.toThrow(/motivo A/);
    await expect(ensureWatchOnlyWallet(CONFIG, fetchImpl)).rejects.toThrow(/motivo B/);
  });

  it("usa o status HTTP como motivo só quando não há corpo JSON-RPC legível (ex: 401 de autenticação)", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => {
        throw new Error("corpo não é JSON");
      },
    })) as unknown as typeof fetch;

    await expect(ensureWatchOnlyWallet(CONFIG, fetchImpl)).rejects.toThrow(/status HTTP 401/);
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

  // RANGE-SHRINK-001, achado contra o nó real em 31/08/2026, na SEGUNDA
  // execução de scripts/wallet-account-smoke.ts. A primeira importou com
  // sucesso; o Core então expandiu a faixa para o keypool dele (1000), e a
  // segunda tentou reimportar com [0,9] e foi recusada:
  //
  //   Could not add descriptor '...': new range must include current range = [0,1000]
  //
  // O Core está certo: encolher a faixa faria a carteira perder de vista
  // endereços que já observa, e perder de vista endereço com fundos é saldo
  // que some. Quem estava errado era o módulo, que não lia a faixa atual.
  // Mesma classe do -35 de loadwallet: operação que só falha na segunda vez.
  it("preserva a faixa já existente em vez de encolher (RANGE-SHRINK-001)", async () => {
    const faixasPedidas: Array<[number, number]> = [];
    const fetchImpl = jsonRpcRouter({
      listdescriptors: () => ({
        descriptors: [
          { desc: `${DESCRIPTORS.receive}#abcd1234`, range: [0, 1000] },
          { desc: `${DESCRIPTORS.change}#abcd1234`, range: [0, 1000] },
        ],
      }),
      getdescriptorinfo: () => ({ checksum: "abcd1234", hasprivatekeys: false }),
      importdescriptors: (params) => {
        for (const req of params[0] as Array<{ range: [number, number] }>) {
          faixasPedidas.push(req.range);
        }
        return [{ success: true }, { success: true }];
      },
    });

    // Pede 9, mas a wallet já está em 1000.
    await importWatchOnlyDescriptors(CONFIG, { ...DESCRIPTORS, rangeEnd: 9 }, fetchImpl);

    expect(faixasPedidas).toEqual([
      [0, 1000],
      [0, 1000],
    ]);
  });

  it("usa a faixa pedida quando a wallet ainda não tem o descriptor", async () => {
    const faixasPedidas: Array<[number, number]> = [];
    const fetchImpl = jsonRpcRouter({
      listdescriptors: () => ({ descriptors: [] }),
      getdescriptorinfo: () => ({ checksum: "abcd1234", hasprivatekeys: false }),
      importdescriptors: (params) => {
        for (const req of params[0] as Array<{ range: [number, number] }>) {
          faixasPedidas.push(req.range);
        }
        return [{ success: true }, { success: true }];
      },
    });

    await importWatchOnlyDescriptors(CONFIG, { ...DESCRIPTORS, rangeEnd: 9 }, fetchImpl);

    expect(faixasPedidas).toEqual([
      [0, 9],
      [0, 9],
    ]);
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

describe("importWatchOnlyAddress", () => {
  const ADDRESS = "tb1qsmoketest0000000000000000000000000000";

  it("importa addr(endereco) com checksum, sem faixa", async () => {
    let sentRequest: unknown;
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: (params) => {
        expect(params[0]).toBe(`addr(${ADDRESS})`);
        return { checksum: "deadbeef", hasprivatekeys: false };
      },
      importdescriptors: (params) => {
        sentRequest = params[0];
        return [{ success: true }];
      },
    });

    await importWatchOnlyAddress(CONFIG, { address: ADDRESS, birthday: "now" }, fetchImpl);

    expect(sentRequest).toEqual([
      { desc: `addr(${ADDRESS})#deadbeef`, active: false, timestamp: "now" },
    ]);
  });

  it("recusa se o descriptor derivado do endereço tiver chave privada", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () => ({ checksum: "deadbeef", hasprivatekeys: true }),
    });

    await expect(
      importWatchOnlyAddress(CONFIG, { address: ADDRESS, birthday: "now" }, fetchImpl),
    ).rejects.toThrow(/chave privada/);
  });

  it("lança com a mensagem do nó quando o import falha", async () => {
    const fetchImpl = jsonRpcRouter({
      getdescriptorinfo: () => ({ checksum: "deadbeef", hasprivatekeys: false }),
      importdescriptors: () => [{ success: false, error: { message: "endereço inválido para a rede" } }],
    });

    await expect(
      importWatchOnlyAddress(CONFIG, { address: ADDRESS, birthday: "now" }, fetchImpl),
    ).rejects.toThrow(/endereço inválido para a rede/);
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
  // Formato confirmado contra o nó real em 29/08/2026: uma wallet
  // disable_private_keys=true reporta o saldo dela sob "mine" — é a única
  // categoria que existe pra ela. Não há grupo "watchonly" na resposta
  // real; a versão anterior deste teste supunha o contrário e nunca teria
  // pegado o bug, porque o mock repetia a mesma suposição errada do código.
  it("lê o grupo mine (não existe watchonly numa wallet sem chave própria)", async () => {
    const fetchImpl = jsonRpcRouter({
      getbalances: () => ({
        mine: { trusted: 0.0001, untrusted_pending: 0.00005, immature: 0 },
      }),
    });

    const summary = await getWatchOnlyBalanceSummary(CONFIG, fetchImpl);

    expect(summary).toEqual({ trustedSats: 10000, untrustedPendingSats: 5000, immatureSats: 0 });
  });

  it("reproduz a resposta real observada em 29/08/2026 (369 sat confirmados, sem pendente)", async () => {
    const fetchImpl = jsonRpcRouter({
      getbalances: () => ({
        mine: { trusted: 0.00000369, untrusted_pending: 0.0, immature: 0.0 },
        lastprocessedblock: { hash: "00000009e4eee627ccf454d7d17e6a54fd0652749bdf5e2940802c9bca86658b", height: 319874 },
      }),
    });

    const summary = await getWatchOnlyBalanceSummary(CONFIG, fetchImpl);

    expect(summary).toEqual({ trustedSats: 369, untrustedPendingSats: 0, immatureSats: 0 });
  });

  it("lança se a resposta não tiver grupo mine", async () => {
    const fetchImpl = jsonRpcRouter({ getbalances: () => ({}) });

    await expect(getWatchOnlyBalanceSummary(CONFIG, fetchImpl)).rejects.toThrow(/mine/);
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
