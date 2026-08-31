/**
 * SMOKE TEST do caminho de CONTA INTEIRA contra um nó Bitcoin Core REAL.
 *
 * ## Por que este script existe
 *
 * `scripts/wallet-core-smoke.ts` já provou `importWatchOnlyAddress` — um
 * endereço, importado à mão. Isso é "observar um endereço". Não é uma
 * carteira.
 *
 * Uma carteira sabe quais endereços são dela sem ninguém colar nada. Isso
 * exige `importWatchOnlyDescriptors`: xpub da conta, ramo de recebimento e
 * ramo de troco, com faixa. **Esse caminho nunca tocou um nó real.**
 *
 * Enquanto ele não for exercitado, qualquer tela de saldo construída em cima
 * é fé. É por isso que este script vem antes de qualquer interface.
 *
 * ## O que ele prova, se passar
 *
 * Que o nó aceita os dois descriptors públicos, escaneia a faixa, e devolve
 * saldo e UTXOs que batem com o que o Esplora vê para os mesmos endereços
 * derivados localmente. Duas fontes independentes, mesmo resultado.
 *
 * ## O que ele NÃO prova
 *
 * Nada sobre cofre nativo, seed real, Mainnet ou iOS. Nada sobre a interface.
 * E não substitui auditoria.
 *
 * ## Fronteira
 *
 * Roda em `scripts/`, que não é runtime root do `guard:lab-boundary` — por
 * isso pode derivar a partir da seed de laboratório. **A carteira não pode**,
 * e é essa a razão de o nó guardar os descriptors: o aplicativo pergunta ao
 * nó em vez de derivar.
 *
 * Uso:
 *
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/wallet-account-smoke.ts
 *
 * Variáveis (todas opcionais):
 *
 *   DIVINO_CORE_RPC_URL        http://127.0.0.1:38332
 *   DIVINO_CORE_RPC_USER       (ou cookie; ver bitcoin-core-rpc-env.ts)
 *   DIVINO_CORE_RPC_PASSWORD
 *   DIVINO_CORE_ACCOUNT_WALLET divino-watch-only-conta
 *   DIVINO_CORE_RANGE          9   (endereços por ramo, 0-indexado)
 *   DIVINO_LAB_ESPLORA         https://mempool.space/signet/api
 */

import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

import {
  ensureWatchOnlyWallet,
  getWatchOnlyBalanceSummary,
  importWatchOnlyDescriptors,
  listWatchOnlyUtxos,
  type BitcoinCoreWalletConfig,
} from "../shared/bitcoin-core-wallet-client";
import { fetchAddressUtxos, sumUtxoValueSats, type EsploraConfig } from "../shared/esplora-client";
import { resolveBitcoinCoreRpcCredentials } from "./bitcoin-core-rpc-env";

const ACCOUNT_PATH = "m/84'/1'/0'";

/**
 * Bytes de versão da família testnet, à qual a Signet pertence.
 *
 * **Achado real, 31/08/2026.** O `@scure/bip32` serializa a chave estendida
 * com os bytes de mainnet por padrão, produzindo `xpub`. O Bitcoin Core valida
 * esses bytes contra a cadeia em que está rodando e recusa:
 *
 *     wpkh(): key 'xpub6CsFd1KN92...' is not valid (código -5)
 *
 * O caminho de derivação já estava certo — `m/84'/1'/0'`, coin type 1 é
 * testnet. Era só a serialização.
 *
 * Verificado: trocar a versão **não muda endereço nenhum**. Os bytes de versão
 * são serialização pura; a derivação de chave é a mesma. Uma seed já usada
 * continua controlando exatamente os mesmos endereços.
 */
const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };

function fail(message: string): never {
  console.error(`\nERRO: ${message}\n`);
  process.exit(1);
}

function readSeedFromEnv(): string {
  const seed = process.env.DIVINO_LAB_SEED;
  if (!seed) {
    fail(
      "DIVINO_LAB_SEED não está definida.\n" +
        "  Gere uma com: npx tsx scripts/lab-signet-flow.ts new-seed",
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(seed) || seed.length % 2 !== 0) {
    fail("DIVINO_LAB_SEED precisa ser hexadecimal de comprimento par.");
  }
  return seed.toLowerCase();
}

/**
 * Deriva o xpub da CONTA e os endereços de cada ramo.
 *
 * O xpub é material público: não permite gastar, só observar. É exatamente o
 * que se entrega ao nó. A seed morre nesta função — `wipePrivateData` em
 * todos os nós intermediários.
 */
function derivarConta(seedHex: string, rangeEnd: number) {
  const root = HDKey.fromMasterSeed(hex.decode(seedHex), VERSOES_TESTNET);
  try {
    const conta = root.derive(ACCOUNT_PATH);
    try {
      const xpub = conta.publicExtendedKey;
      if (!xpub) fail(`Derivação em ${ACCOUNT_PATH} não produziu chave estendida pública.`);
      if (!xpub.startsWith("tpub")) {
        fail(
          `A chave estendida saiu como "${xpub.slice(0, 4)}", não "tpub".\n` +
            "  O Bitcoin Core em Signet recusa chave serializada como mainnet.\n" +
            "  Isso indica que VERSOES_TESTNET não foi aplicada na derivação.",
        );
      }

      const enderecos: { recebimento: string[]; troco: string[] } = { recebimento: [], troco: [] };
      for (const [ramo, rotulo] of [[0, "recebimento"], [1, "troco"]] as const) {
        for (let i = 0; i <= rangeEnd; i += 1) {
          const filho = conta.deriveChild(ramo).deriveChild(i);
          try {
            if (!filho.publicKey) fail(`Sem chave pública em ${ACCOUNT_PATH}/${ramo}/${i}.`);
            const address = btc.p2wpkh(filho.publicKey, btc.TEST_NETWORK).address;
            if (!address) fail(`Sem endereço em ${ACCOUNT_PATH}/${ramo}/${i}.`);
            enderecos[rotulo].push(address);
          } finally {
            filho.wipePrivateData();
          }
        }
      }
      return { xpub, enderecos };
    } finally {
      conta.wipePrivateData();
    }
  } finally {
    root.wipePrivateData();
  }
}

async function main() {
  console.log("\n=== SMOKE TEST: caminho de CONTA INTEIRA contra o nó real ===\n");

  const seedHex = readSeedFromEnv();
  const rangeEnd = Number(process.env.DIVINO_CORE_RANGE ?? 9);
  if (!Number.isInteger(rangeEnd) || rangeEnd < 0) fail("DIVINO_CORE_RANGE precisa ser inteiro >= 0.");

  const { xpub, enderecos } = derivarConta(seedHex, rangeEnd);
  console.log(`Conta:  ${ACCOUNT_PATH}`);
  console.log(`xpub:   ${xpub.slice(0, 20)}...${xpub.slice(-10)}  (público; não permite gastar)`);
  console.log(`Faixa:  0..${rangeEnd} em cada ramo — ${enderecos.recebimento.length + enderecos.troco.length} endereços`);
  console.log(`  recebimento[0]: ${enderecos.recebimento[0]}`);
  console.log(`  troco[0]:       ${enderecos.troco[0]}\n`);

  let username: string, password: string;
  try {
    ({ username, password } = resolveBitcoinCoreRpcCredentials());
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  const config: BitcoinCoreWalletConfig = {
    url: process.env.DIVINO_CORE_RPC_URL ?? "http://127.0.0.1:38332",
    username,
    password,
    walletName: process.env.DIVINO_CORE_ACCOUNT_WALLET ?? "divino-watch-only-conta",
  };
  console.log(`Nó: ${config.url} | wallet: ${config.walletName}\n`);

  console.log("--- Passo 1: garantir a wallet watch-only ---");
  const wallet = await ensureWatchOnlyWallet(config);
  console.log(`OK. "${wallet.walletName}" ${wallet.alreadyExisted ? "já existia" : "criada agora"}.`);
  console.log("private_keys_enabled confirmado false pelo próprio nó.\n");

  console.log("--- Passo 2: importar os DOIS descriptors de conta (o caminho nunca testado) ---");
  const receive = `wpkh(${xpub}/0/*)`;
  const change = `wpkh(${xpub}/1/*)`;
  console.log(`  recebimento: wpkh(${xpub.slice(0, 14)}.../0/*)`);
  console.log(`  troco:       wpkh(${xpub.slice(0, 14)}.../1/*)`);
  console.log("  O módulo recusa qualquer descriptor cujo hasprivatekeys não seja false.");
  await importWatchOnlyDescriptors(config, { receive, change, birthday: "now", rangeEnd });
  console.log("OK. Os dois ramos foram aceitos e escaneados.\n");

  console.log("--- Passo 3: ler pelo nó ---");
  const saldoNo = await getWatchOnlyBalanceSummary(config);
  const utxosNo = await listWatchOnlyUtxos(config);
  console.log(
    `Nó — confirmado: ${saldoNo.trustedSats} sat | pendente: ${saldoNo.untrustedPendingSats} sat | UTXOs: ${utxosNo.length}`,
  );

  console.log("\n--- Passo 4: somar os mesmos endereços pelo Esplora, para comparar ---");
  const esplora: EsploraConfig = { baseUrl: process.env.DIVINO_LAB_ESPLORA ?? "https://mempool.space/signet/api" };
  const todos = [...enderecos.recebimento, ...enderecos.troco];
  let confirmadoEsplora = 0;
  let utxosEsplora = 0;
  for (const address of todos) {
    const utxos = await fetchAddressUtxos(esplora, address);
    const confirmados = utxos.filter((u) => u.confirmed);
    confirmadoEsplora += sumUtxoValueSats(confirmados);
    utxosEsplora += confirmados.length;
  }
  console.log(`Esplora — confirmado: ${confirmadoEsplora} sat | UTXOs: ${utxosEsplora}  (${todos.length} endereços consultados)`);

  console.log("\n--- Veredito ---");
  const bateSaldo = saldoNo.trustedSats === confirmadoEsplora;
  const bateContagem = utxosNo.length === utxosEsplora;

  if (bateSaldo && bateContagem) {
    console.log("Saldo e contagem de UTXOs BATEM entre o nó e o Esplora, para a conta inteira.");
    console.log(
      "Isto estabelece que a carteira pode saber quais endereços são dela\n" +
        "perguntando ao nó do próprio usuário, sem derivar nada no aplicativo\n" +
        "e sem perguntar a servidor de terceiro.",
    );
    if (confirmadoEsplora === 0) {
      console.log(
        "\nATENÇÃO: os dois deram ZERO. Bater em zero prova que o import foi aceito\n" +
          "e que as duas fontes concordam, mas NÃO prova que o nó encontra fundos.\n" +
          "Para a prova completa, mande moeda de faucet para o endereço de\n" +
          "recebimento acima, espere confirmar, e rode de novo.",
      );
    }
  } else {
    console.log("Os valores NÃO batem. Isto é um achado, não um erro do script:");
    console.log(`  saldo:  nó ${saldoNo.trustedSats} vs Esplora ${confirmadoEsplora}`);
    console.log(`  UTXOs:  nó ${utxosNo.length} vs Esplora ${utxosEsplora}`);
    console.log("  Causa provável a investigar primeiro: janela de rescan (o nó é podado) ou faixa curta demais.");
    process.exit(1);
  }
  console.log();
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
