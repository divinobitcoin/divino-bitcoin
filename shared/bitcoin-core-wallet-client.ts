/**
 * Cliente RPC para o nó Bitcoin Core próprio do usuário, via wallet
 * watch-only baseada em descriptors. Esta é a peça que falta para I-3
 * (CARTA-001): a carteira consultar saldo, UTXOs e transmitir através do
 * `bitcoind` do próprio usuário, em vez de perguntar a um servidor de
 * terceiro (mempool.space) que passa a saber quais endereços interessam.
 *
 * ## O que este módulo NUNCA faz
 *
 * Não gera, importa, deriva nem manuseia chave privada nenhuma, em nenhum
 * caminho de código. A wallet que ele cria/usa no nó é criada com
 * `disable_private_keys: true`, e `ensureWatchOnlyWallet` se recusa a
 * prosseguir se o nó, por qualquer motivo, devolver uma wallet que não
 * confirme `private_keys_enabled === false`. Isso não é apenas pedido ao
 * nó — é verificado na resposta antes de qualquer outra operação.
 *
 * Só descriptors PÚBLICOS (xpub, nunca xprv) devem ser importados.
 * `importWatchOnlyDescriptors` verifica isso com `getdescriptorinfo`
 * (`hasprivatekeys === false`) antes de importar, pela mesma razão: não
 * confiar que quem chamou passou o argumento certo.
 *
 * Dois caminhos de import: `importWatchOnlyDescriptors` (um xpub, faixa de
 * endereços) para uma conta inteira, e `importWatchOnlyAddress` (um único
 * endereço, sem faixa) para o caso mais simples — é o que
 * `scripts/wallet-core-smoke.ts` usa no primeiro teste contra o nó real,
 * porque não depende de nenhuma derivação de xpub nova.
 *
 * ## Estado desta implementação — seja honesto sobre isto antes de usar
 *
 * Escrito primeiro só contra respostas HTTP simuladas (mocks). Em
 * 29/08/2026, `scripts/wallet-core-smoke.ts` rodou contra o nó real
 * (`~/.bitcoin-divino-signet`, Signet, pruned) e isto é o que ficou
 * verificado de fato, não suposto:
 *
 *   - `createwallet` com `disable_private_keys=true` funciona, e
 *     `getwalletinfo` confirma `private_keys_enabled: false` de volta.
 *   - `getdescriptorinfo` + `importdescriptors` com um `addr(...)` único
 *     (sem faixa) funciona — `importWatchOnlyAddress`.
 *   - `listunspent` devolve os campos que este módulo espera
 *     (txid/vout/address/amount/confirmations).
 *   - **`getbalances` reporta o saldo de uma wallet
 *     `disable_private_keys=true` sob o grupo `mine`, não `watchonly`.**
 *     A primeira versão deste código lia `watchonly` — suposição errada,
 *     nunca teria funcionado contra o nó real, só passava porque o mock
 *     do teste também estava errado do mesmo jeito. Corrigido depois de
 *     ver a resposta real, não antes.
 *
 * Ainda não verificado: o fallback `loadwallet` quando `createwallet` acha
 * a wallet já existente (só foi exercitado criando pela primeira vez); e
 * `importWatchOnlyDescriptors` — o caminho de conta inteira (xpub com
 * faixa de recebimento + troco) — que continua sem nunca ter tocado um nó
 * real, só o caminho de endereço único foi testado até agora.
 *
 * ## Este módulo NÃO está ligado ao gate `liveSyncEnabled`
 *
 * Igual a `esplora-client.ts` e `bitcoin-core-rpc-client.ts`: existir aqui
 * não muda de onde o app hoje lê saldo. Ligar isto à interface — decidir
 * que o app passa a perguntar ao nó próprio em vez do mempool.space — é
 * uma decisão de arquitetura separada e posterior.
 */

import { hex } from "@scure/base";
import * as btc from "@scure/btc-signer";

import type { BitcoinCoreRpcConfig } from "./bitcoin-core-rpc-client";

export type BitcoinCoreWalletConfig = BitcoinCoreRpcConfig & {
  /** Nome da wallet watch-only dedicada a esta carteira dentro do nó. */
  walletName: string;
};

export type WatchOnlyDescriptors = {
  /**
   * Descriptor público de recebimento, ex: `wpkh(tpub.../0/*)`. Sem chave privada.
   *
   * **A chave estendida precisa estar serializada para a rede do nó.** O Core
   * valida os bytes de versão contra a cadeia em que roda, e recusa um `xpub`
   * (mainnet) num nó de Signet com `key ... is not valid` (código -5). Em
   * Signet e testnet, use `tpub`.
   *
   * Isso é serialização, não derivação: a mesma seed produz exatamente os
   * mesmos endereços nas duas formas. Verificado empiricamente em 31/08/2026,
   * depois de o nó real recusar um `xpub`.
   */
  receive: string;
  /** Descriptor público de troco, ex: `wpkh(tpub.../1/*)`. Mesma regra de rede acima. */
  change: string;
  /**
   * A partir de quando escanear o histórico. "now" é aceitável só para
   * material descartável de laboratório (nasce sem histórico). Uma seed
   * real precisa da data de nascimento real, ou o nó não vai encontrar
   * fundos recebidos antes do import.
   */
  birthday: number | "now";
  /** Quantos endereços por ramo (recebimento/troco) importar, 0-indexado. */
  rangeEnd: number;
};

export type BitcoinCoreWalletUtxo = {
  txid: string;
  vout: number;
  address: string;
  valueSats: number;
  confirmed: boolean;
  /**
   * `listunspent` não devolve altura de bloco. Sempre `null` aqui — não é
   * "não confirmado", é "esta fonte não informa". Ao contrário de
   * `EsploraUtxo`, onde `null` tem um significado específico, este tipo é
   * deliberadamente separado para não fingir a mesma garantia.
   */
  blockHeight: null;
};

export type WatchOnlyBalanceSummary = {
  /** Saldo de UTXOs confirmados e não vindos de troco não confiável (getbalances.watchonly.trusted). */
  trustedSats: number;
  /** Saldo em mempool, ainda não confirmado. */
  untrustedPendingSats: number;
  /** Recompensa de mineração ainda imatura. Não deve aparecer em Signet normal. */
  immatureSats: number;
};

export type DescriptorInfo = {
  /** Descriptor normalizado pelo próprio nó, sem o checksum. */
  descriptor: string;
  /** Checksum de 8 caracteres. O Core o EXIGE em `importdescriptors`. */
  checksum: string;
  /**
   * `true` se o descriptor carrega material capaz de gastar.
   *
   * Quem chama decide o que fazer com isso — este módulo não presume. Mas o
   * campo nunca recebe valor padrão: se o nó não devolver um booleano, a
   * função lança. Assumir `false` num campo ausente seria exatamente o erro
   * que o I-2 não perdoa.
   */
  hasPrivateKeys: boolean;
};

type FetchLike = typeof fetch;

class BitcoinCoreRpcError extends Error {
  constructor(
    public readonly rpcCode: number | null,
    message: string,
  ) {
    super(message);
    this.name = "BitcoinCoreRpcError";
  }
}

async function rpcCall<T>(
  baseUrl: string,
  config: BitcoinCoreRpcConfig,
  method: string,
  params: unknown[],
  fetchImpl: FetchLike,
): Promise<T> {
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const response = await fetchImpl(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ jsonrpc: "1.0", id: `divino-wallet-${method}`, method, params }),
  });

  // O Core devolve HTTP 500 (não 200) para a maioria dos erros de nível
  // RPC — "wallet já existe", "endereço inválido", etc. — com a mensagem
  // real dentro do corpo JSON. Checar `!response.ok` antes de ler esse
  // corpo (como a primeira versão deste código fazia) descarta exatamente
  // a mensagem que o usuário precisa ver, e troca por um "status HTTP 500"
  // sem conteúdo. Por isso o corpo é lido SEMPRE, e só quando ele não tem
  // um erro JSON-RPC legível é que o status HTTP vira o motivo do erro —
  // cobrindo casos de transporte de verdade (autenticação, proxy, rede).
  let body: { error?: { code?: number; message?: string } | null; result?: T } | null = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (body?.error) {
    throw new BitcoinCoreRpcError(
      body.error.code ?? null,
      `Nó recusou ${method}: ${body.error.message ?? "erro sem mensagem"} (código ${body.error.code ?? "?"}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Chamada RPC (${method}) falhou com status HTTP ${response.status}, sem corpo de erro JSON-RPC legível.`,
    );
  }

  return body?.result as T;
}

function walletUrl(config: BitcoinCoreWalletConfig): string {
  const base = config.url.replace(/\/+$/, "");
  return `${base}/wallet/${encodeURIComponent(config.walletName)}`;
}

/**
 * Pergunta ao nó o checksum e a natureza de um descriptor.
 *
 * `getdescriptorinfo` é RPC de NÓ, não de wallet: não exige wallet carregada,
 * e por isso esta função recebe `BitcoinCoreRpcConfig` e fala com a URL base.
 * Isso importa para quem só quer validar um descriptor — gerar um Recovery
 * Kit, por exemplo — sem criar wallet nenhuma no nó de ninguém.
 *
 * **Por que existe como função exportada.** Esta chamada já era feita, inline,
 * dentro de `importWatchOnlyDescriptors`. Duplicá-la num script significaria
 * duplicar também o tratamento do HTTP 500 do Core e a validação de entrada
 * remota — dois lugares para acertar a mesma coisa, que é como um deles fica
 * para trás. `importWatchOnlyDescriptors` agora usa esta função.
 *
 * Entrada remota é não confiável (`WF-F12`): checksum precisa ter a forma que
 * o Core produz, e `hasprivatekeys` precisa ser booleano de verdade.
 */
export async function getDescriptorInfo(
  config: BitcoinCoreRpcConfig,
  descriptor: string,
  fetchImpl: FetchLike = fetch,
): Promise<DescriptorInfo> {
  const base = config.url.replace(/\/+$/, "");

  const raw = await rpcCall<{
    descriptor?: unknown;
    checksum?: unknown;
    hasprivatekeys?: unknown;
  }>(base, config, "getdescriptorinfo", [descriptor], fetchImpl);

  if (typeof raw?.checksum !== "string" || !/^[a-z0-9]{8}$/.test(raw.checksum)) {
    throw new Error(
      `getdescriptorinfo devolveu checksum inesperado: ${JSON.stringify(raw?.checksum)}. ` +
        "O Core produz exatamente 8 caracteres minúsculos.",
    );
  }

  if (typeof raw.hasprivatekeys !== "boolean") {
    throw new Error(
      `getdescriptorinfo não disse se o descriptor tem chave privada ` +
        `(hasprivatekeys=${JSON.stringify(raw.hasprivatekeys)}). Sem essa resposta não há decisão segura a tomar.`,
    );
  }

  return {
    descriptor: typeof raw.descriptor === "string" ? raw.descriptor : descriptor,
    checksum: raw.checksum,
    hasPrivateKeys: raw.hasprivatekeys,
  };
}

/**
 * Cria (ou carrega, se já existir) a wallet watch-only dedicada, e SÓ
 * então confirma na resposta do próprio nó que ela não guarda chave
 * privada. Se o nó devolver `private_keys_enabled !== false` por qualquer
 * motivo, isto lança e nada mais deste módulo deve ser chamado — é o
 * limite não-negociável do I-2 aplicado aqui.
 */
export async function ensureWatchOnlyWallet(
  config: BitcoinCoreWalletConfig,
  fetchImpl: FetchLike = fetch,
): Promise<{ walletName: string; alreadyExisted: boolean }> {
  const base = config.url.replace(/\/+$/, "");
  let alreadyExisted = false;

  try {
    await rpcCall(base, config, "createwallet", [
      config.walletName,
      true, // disable_private_keys
      true, // blank
      "", // passphrase
      false, // avoid_reuse
      true, // descriptors
      false, // load_on_startup
    ], fetchImpl);
  } catch (createError) {
    // Confirmado contra o nó real em 29/08/2026: createwallet numa wallet
    // já existente lança código -4 ("Database already exists"). Não
    // presumimos isso pelo texto mesmo assim — em vez disso, tentamos
    // carregar; se carregar também falhar, o erro combinado é honesto
    // sobre os dois caminhos terem sido tentados.
    try {
      await rpcCall(base, config, "loadwallet", [config.walletName, false], fetchImpl);
      alreadyExisted = true;
    } catch (loadError) {
      // Código -35 (RPC_WALLET_ALREADY_LOADED) é um caso de SUCESSO
      // disfarçado de erro: a wallet continua carregada na memória do nó
      // desde a última vez (bitcoind não descarrega sozinho), e é
      // exatamente o estado que esta função queria alcançar. Confirmado
      // contra o nó real: rodar o smoke test duas vezes seguidas produz
      // esse código na segunda vez. Só o código é checado, não o texto —
      // -35 é um código estável da API do Core, não uma string frágil.
      if (loadError instanceof BitcoinCoreRpcError && loadError.rpcCode === -35) {
        alreadyExisted = true;
      } else {
        const createMsg = createError instanceof Error ? createError.message : String(createError);
        const loadMsg = loadError instanceof Error ? loadError.message : String(loadError);
        throw new Error(
          `Não foi possível criar nem carregar a wallet "${config.walletName}". ` +
            `createwallet: ${createMsg} | loadwallet: ${loadMsg}`,
        );
      }
    }
  }

  const info = await rpcCall<{ private_keys_enabled?: boolean; descriptors?: boolean }>(
    walletUrl(config),
    config,
    "getwalletinfo",
    [],
    fetchImpl,
  );

  if (info.private_keys_enabled !== false) {
    throw new Error(
      `A wallet "${config.walletName}" respondeu private_keys_enabled=${info.private_keys_enabled}, ` +
        `não false. Recusando prosseguir: este módulo só opera sobre wallet watch-only comprovada, ` +
        `nunca sobre uma que possa guardar chave privada. Nenhum descriptor foi importado.`,
    );
  }

  return { walletName: config.walletName, alreadyExisted };
}

/**
 * Importa os descriptors públicos de recebimento e troco na wallet
 * watch-only. Verifica com `getdescriptorinfo` que cada descriptor não tem
 * chave privada (`hasprivatekeys === false`) antes de importar qualquer
 * coisa — não confia que quem chamou passou o argumento certo.
 *
 * As duas importações (recebimento + troco) são tratadas como uma unidade:
 * se qualquer uma falhar, isto lança, mesmo que a outra tenha tido sucesso.
 * Uma wallet com só um dos dois ramos importados é um estado parcial
 * silencioso que ninguém pediu.
 */
export async function importWatchOnlyDescriptors(
  config: BitcoinCoreWalletConfig,
  descriptors: WatchOnlyDescriptors,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const branches: Array<{ desc: string; internal: boolean }> = [
    { desc: descriptors.receive, internal: false },
    { desc: descriptors.change, internal: true },
  ];

  const requests: Array<{
    desc: string;
    active: boolean;
    range: [number, number];
    next_index: number;
    timestamp: number | "now";
    internal: boolean;
  }> = [];

  /**
   * Faixas já registradas na wallet, por descriptor completo (com checksum).
   *
   * **Por que isto existe.** O Core recusa reimportar um descriptor ativo com
   * faixa menor: `new range must include current range = [0,1000]`. E ele
   * expande a faixa sozinho — o keypool padrão de uma wallet descriptor é bem
   * maior do que a faixa pedida no primeiro import. Consequência: sem ler a
   * faixa atual, a **segunda** execução sempre falha, mesmo que a primeira
   * tenha funcionado.
   *
   * O Core está certo em recusar. Encolher a faixa faria a carteira perder de
   * vista endereços que ela já observa — e perder de vista um endereço com
   * fundos é como um saldo some. Então este módulo nunca encolhe: usa o maior
   * entre o que foi pedido e o que já existe.
   *
   * Achado contra nó real em 31/08/2026, na segunda execução do
   * `scripts/wallet-account-smoke.ts`. Mesma classe do `-35` de `loadwallet`:
   * a operação não era idempotente.
   */
  const faixasExistentes = new Map<string, number>();
  try {
    const atual = await rpcCall<{
      descriptors?: Array<{ desc?: string; range?: [number, number] }>;
    }>(walletUrl(config), config, "listdescriptors", [], fetchImpl);

    for (const d of atual.descriptors ?? []) {
      if (d.desc && Array.isArray(d.range) && typeof d.range[1] === "number") {
        faixasExistentes.set(d.desc, d.range[1]);
      }
    }
  } catch {
    // Wallet recém-criada ainda não tem descriptors, e versões antigas podem
    // não expor `listdescriptors`. Nos dois casos não há faixa a preservar:
    // seguir com a faixa pedida é o comportamento correto.
  }

  for (const branch of branches) {
    const info = await getDescriptorInfo(config, branch.desc, fetchImpl);

    if (info.hasPrivateKeys) {
      throw new Error(
        `O descriptor "${branch.internal ? "troco" : "recebimento"}" tem chave privada ` +
          `(hasprivatekeys=true). Recusando importar. Este módulo só aceita ` +
          `descriptors públicos.`,
      );
    }

    const comChecksum = `${branch.desc}#${info.checksum}`;
    // Nunca encolher: o Core recusa, e encolher perderia endereços de vista.
    const fimDaFaixa = Math.max(descriptors.rangeEnd, faixasExistentes.get(comChecksum) ?? 0);

    requests.push({
      desc: comChecksum,
      active: true,
      range: [0, fimDaFaixa],
      next_index: 0,
      timestamp: descriptors.birthday,
      internal: branch.internal,
    });
  }

  const results = await rpcCall<Array<{ success?: boolean; error?: { message?: string } }>>(
    walletUrl(config),
    config,
    "importdescriptors",
    [requests],
    fetchImpl,
  );

  const failures = results
    .map((result, index) => ({ result, branch: index === 0 ? "recebimento" : "troco" }))
    .filter((entry) => entry.result.success !== true);

  if (failures.length > 0) {
    const details = failures
      .map((f) => `${f.branch}: ${f.result.error?.message ?? "falhou sem mensagem"}`)
      .join(" | ");
    throw new Error(`Import de descriptors falhou (${details}). Nenhum estado parcial deve ser considerado usável.`);
  }
}

/**
 * Importa um ÚNICO endereço público (`addr(...)`), sem faixa nenhuma —
 * ao contrário de `importWatchOnlyDescriptors`, que importa um ramo
 * inteiro (recebimento ou troco) de um xpub. Existe para o caso mais
 * simples: observar um endereço específico, sem envolver derivação de
 * conta nenhuma. É o caminho usado por `scripts/wallet-core-smoke.ts`.
 *
 * Mesma verificação de `hasprivatekeys === false` antes de importar —
 * mesmo sendo um endereço, não um descriptor com xpub, o nó confirma que
 * não há chave nenhuma envolvida.
 */
export async function importWatchOnlyAddress(
  config: BitcoinCoreWalletConfig,
  params: { address: string; birthday: number | "now" },
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const desc = `addr(${params.address})`;

  const info = await rpcCall<{ checksum?: string; hasprivatekeys?: boolean }>(
    walletUrl(config),
    config,
    "getdescriptorinfo",
    [desc],
    fetchImpl,
  );

  if (info.hasprivatekeys !== false) {
    throw new Error(
      `O descriptor derivado do endereço "${params.address}" tem chave privada ` +
        `(hasprivatekeys=${info.hasprivatekeys}). Recusando importar.`,
    );
  }
  if (!info.checksum) {
    throw new Error(`getdescriptorinfo não devolveu checksum para addr(${params.address}).`);
  }

  const results = await rpcCall<Array<{ success?: boolean; error?: { message?: string } }>>(
    walletUrl(config),
    config,
    "importdescriptors",
    [
      [
        {
          desc: `${desc}#${info.checksum}`,
          active: false,
          timestamp: params.birthday,
        },
      ],
    ],
    fetchImpl,
  );

  if (results[0]?.success !== true) {
    throw new Error(
      `Import do endereço "${params.address}" falhou: ${results[0]?.error?.message ?? "sem mensagem"}.`,
    );
  }
}

/**
 * Lista os UTXOs conhecidos pela wallet watch-only. `minConfirmations = 0`
 * inclui não confirmados — quem chamar decide se filtra, igual ao padrão
 * já usado em `coin-selection.ts` (`allowUnconfirmed`).
 */
export async function listWatchOnlyUtxos(
  config: BitcoinCoreWalletConfig,
  options: { minConfirmations?: number } = {},
  fetchImpl: FetchLike = fetch,
): Promise<BitcoinCoreWalletUtxo[]> {
  const minConf = options.minConfirmations ?? 0;

  const raw = await rpcCall<
    Array<{
      txid?: unknown;
      vout?: unknown;
      address?: unknown;
      amount?: unknown;
      confirmations?: unknown;
    }>
  >(walletUrl(config), config, "listunspent", [minConf, 9_999_999], fetchImpl);

  return raw.map((entry, index) => {
    if (typeof entry.txid !== "string" || !/^[0-9a-f]{64}$/i.test(entry.txid)) {
      throw new Error(`UTXO ${index} devolvido pelo nó tem txid inválido: ${JSON.stringify(entry.txid)}.`);
    }
    if (typeof entry.vout !== "number" || !Number.isInteger(entry.vout) || entry.vout < 0) {
      throw new Error(`UTXO ${index} devolvido pelo nó tem vout inválido: ${JSON.stringify(entry.vout)}.`);
    }
    if (typeof entry.address !== "string" || entry.address.length === 0) {
      throw new Error(`UTXO ${index} devolvido pelo nó não tem endereço.`);
    }
    if (typeof entry.amount !== "number" || !Number.isFinite(entry.amount) || entry.amount < 0) {
      throw new Error(`UTXO ${index} devolvido pelo nó tem amount inválido: ${JSON.stringify(entry.amount)}.`);
    }

    return {
      txid: entry.txid.toLowerCase(),
      vout: entry.vout,
      address: entry.address,
      // BTC (float) -> sats: arredonda no inteiro mais próximo em vez de
      // truncar, porque o float pode chegar como 0.00009999999999999999
      // por erro de representação de um valor que é exatamente 10000 sats.
      valueSats: Math.round(entry.amount * 100_000_000),
      confirmed: typeof entry.confirmations === "number" && entry.confirmations > 0,
      blockHeight: null,
    };
  });
}

/**
 * Saldo agregado da wallet watch-only via `getbalances`. Lê o grupo
 * `mine` — CONFIRMADO contra nó real em 29/08/2026 (Signet,
 * `~/.bitcoin-divino-signet`): uma wallet criada com
 * `disable_private_keys=true` reporta o saldo dela sob `mine`, porque é a
 * única categoria que existe pra ela. `watchonly` é o grupo de um caso
 * diferente — uma wallet COM chave própria que também importou scripts de
 * fora — e nunca aparece aqui, porque `ensureWatchOnlyWallet` já garantiu
 * que esta wallet nunca tem chave própria.
 *
 * Isto substitui uma suposição errada da primeira versão deste módulo,
 * que lia `watchonly` e teria lançado sempre. O nome dos campos do tipo
 * de retorno (`trustedSats` etc.) continua descrevendo o significado, não
 * o nome literal do grupo do Core.
 */
export async function getWatchOnlyBalanceSummary(
  config: BitcoinCoreWalletConfig,
  fetchImpl: FetchLike = fetch,
): Promise<WatchOnlyBalanceSummary> {
  const result = await rpcCall<{
    mine?: { trusted?: number; untrusted_pending?: number; immature?: number };
  }>(walletUrl(config), config, "getbalances", [], fetchImpl);

  const mine = result.mine;

  if (!mine) {
    throw new Error(
      "getbalances não devolveu o grupo mine. Isso é inesperado até para uma wallet vazia — " +
        "conferir se esta é mesmo a wallet watch-only certa.",
    );
  }

  const toSats = (btc: number | undefined): number => Math.round((btc ?? 0) * 100_000_000);

  return {
    trustedSats: toSats(mine.trusted),
    untrustedPendingSats: toSats(mine.untrusted_pending),
    immatureSats: toSats(mine.immature),
  };
}

export type CoreRpcBroadcastResult = {
  txid: string;
};

/**
 * Transmite via `sendrawtransaction`, no endpoint BASE do nó — não no
 * endpoint da wallet. Broadcast não é operação de wallet: não precisa de
 * uma wallet carregada, não toca em chave, e chamar no endpoint base
 * deixa isso explícito no próprio código, não só em comentário.
 *
 * Mesma disciplina de `transaction-broadcast.ts::broadcastRawTransaction`:
 * o txid é recalculado localmente a partir de `review.rawTxHex` e
 * conferido contra `review.txid` ANTES de qualquer chamada de rede. Em
 * caso de divergência, nada é enviado.
 */
export async function broadcastRawTransactionViaCoreRpc(
  params: {
    config: BitcoinCoreRpcConfig;
    review: { rawTxHex: string; txid: string };
    fetchImpl?: FetchLike;
  },
): Promise<CoreRpcBroadcastResult> {
  const { config, review, fetchImpl = fetch } = params;
  const { rawTxHex, txid: expectedTxid } = review;

  if (!/^[0-9a-fA-F]+$/.test(rawTxHex) || rawTxHex.length % 2 !== 0) {
    throw new Error("rawTxHex precisa ser uma string hexadecimal de comprimento par.");
  }
  if (!/^[0-9a-f]{64}$/i.test(expectedTxid)) {
    throw new Error(`expectedTxid precisa ter 64 caracteres hexadecimais; recebido: ${JSON.stringify(expectedTxid)}.`);
  }

  // Precheck local, igual ao Esplora. Nenhuma chamada de rede acontece
  // antes daqui.
  let localTxid: string;
  try {
    localTxid = btc.Transaction.fromRaw(hex.decode(rawTxHex)).id;
  } catch (cause) {
    throw new Error(
      "rawTxHex passou na verificação de forma mas não é uma transação legível; não dá para " +
        "conferir o txid antes de transmitir. Nada foi enviado.",
      { cause },
    );
  }

  if (localTxid.toLowerCase() !== expectedTxid.toLowerCase()) {
    throw new Error(
      `O txid calculado a partir de rawTxHex é ${localTxid}, diferente do expectedTxid ${expectedTxid}. ` +
        `Os bytes que seriam transmitidos não são os da transação revisada. Nada foi enviado.`,
    );
  }

  const base = config.url.replace(/\/+$/, "");
  const nodeTxid = await rpcCall<string>(base, config, "sendrawtransaction", [rawTxHex], fetchImpl);

  if (typeof nodeTxid !== "string" || !/^[0-9a-f]{64}$/i.test(nodeTxid)) {
    throw new Error(
      `O nó aceitou a chamada mas devolveu um resultado que não é um txid: ${JSON.stringify(nodeTxid)}. ` +
        `Estado da transmissão é desconhecido — conferir na cadeia antes de tentar de novo.`,
    );
  }

  if (nodeTxid.toLowerCase() !== expectedTxid.toLowerCase()) {
    throw new Error(
      `O nó devolveu o txid ${nodeTxid}, diferente do esperado ${expectedTxid}. A transação transmitida ` +
        `não é a que foi revisada. Conferir na cadeia imediatamente.`,
    );
  }

  return { txid: nodeTxid.toLowerCase() };
}
