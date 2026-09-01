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

import {
  ensureWatchOnlyWallet,
  getWatchOnlyBalanceSummary,
  importWatchOnlyDescriptors,
  listWatchOnlyUtxos,
  type BitcoinCoreWalletConfig,
} from "../shared/bitcoin-core-wallet-client";
import { fetchAddressUtxos, sumUtxoValueSats, type EsploraConfig } from "../shared/esplora-client";
import { resolveBitcoinCoreRpcCredentials } from "./bitcoin-core-rpc-env";
import { ACCOUNT_PATH, deriveLabAccount } from "./lab-account-derivation";

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
  return seed;
}

async function main() {
  console.log("\n=== SMOKE TEST: caminho de CONTA INTEIRA contra o nó real ===\n");

  const seedHex = readSeedFromEnv();
  const rangeEnd = Number(process.env.DIVINO_CORE_RANGE ?? 9);
  if (!Number.isInteger(rangeEnd) || rangeEnd < 0) fail("DIVINO_CORE_RANGE precisa ser inteiro >= 0.");

  // A derivação mora em ./lab-account-derivation, compartilhada com
  // scripts/recovery-kit.ts. Os dois PRECISAM derivar a mesma conta: um kit
  // que descreve conta diferente da que tem o dinheiro falha em silêncio, no
  // dia da recuperação.
  let conta;
  try {
    conta = deriveLabAccount(seedHex, rangeEnd);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const { accountXpub: xpub, enderecos } = conta;
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
  // `listunspent` devolve confirmados E não confirmados. Separar aqui é
  // obrigatório: comparar a lista inteira do nó contra só os confirmados do
  // Esplora é comparar coisas diferentes, e foi assim que a primeira versão
  // deste script declarou divergência onde as duas fontes concordavam.
  const utxosNoConfirmados = utxosNo.filter((u) => u.confirmed);
  const utxosNoPendentes = utxosNo.filter((u) => !u.confirmed);
  console.log(
    `Nó — confirmado: ${saldoNo.trustedSats} sat (${utxosNoConfirmados.length} UTXO) | ` +
      `pendente: ${saldoNo.untrustedPendingSats} sat (${utxosNoPendentes.length} UTXO)`,
  );

  console.log("\n--- Passo 4: somar os mesmos endereços pelo Esplora, para comparar ---");
  const esplora: EsploraConfig = { baseUrl: process.env.DIVINO_LAB_ESPLORA ?? "https://mempool.space/signet/api" };
  const todos = [...enderecos.recebimento, ...enderecos.troco];
  let confirmadoEsplora = 0;
  let pendenteEsplora = 0;
  let utxosConfirmadosEsplora = 0;
  let utxosPendentesEsplora = 0;
  for (const address of todos) {
    const utxos = await fetchAddressUtxos(esplora, address);
    const confirmados = utxos.filter((u) => u.confirmed);
    const pendentes = utxos.filter((u) => !u.confirmed);
    confirmadoEsplora += sumUtxoValueSats(confirmados);
    pendenteEsplora += sumUtxoValueSats(pendentes);
    utxosConfirmadosEsplora += confirmados.length;
    utxosPendentesEsplora += pendentes.length;
  }
  console.log(
    `Esplora — confirmado: ${confirmadoEsplora} sat (${utxosConfirmadosEsplora} UTXO) | ` +
      `pendente: ${pendenteEsplora} sat (${utxosPendentesEsplora} UTXO)   [${todos.length} endereços consultados]`,
  );

  console.log("\n--- Veredito ---");
  const bateConfirmado =
    saldoNo.trustedSats === confirmadoEsplora && utxosNoConfirmados.length === utxosConfirmadosEsplora;
  const batePendente = saldoNo.untrustedPendingSats === pendenteEsplora;

  if (!bateConfirmado || !batePendente) {
    console.log("As duas fontes NÃO concordam. Isto é um achado, não um erro do script:");
    console.log(`  confirmado:  nó ${saldoNo.trustedSats} sat / ${utxosNoConfirmados.length} UTXO` +
      `   vs Esplora ${confirmadoEsplora} sat / ${utxosConfirmadosEsplora} UTXO`);
    console.log(`  pendente:    nó ${saldoNo.untrustedPendingSats} sat   vs Esplora ${pendenteEsplora} sat`);
    console.log(
      "  Investigar nesta ordem: janela de rescan (o nó é podado), faixa curta\n" +
        "  demais, ou propagação — o mempool do seu nó e o do Esplora não são o mesmo.",
    );
    process.exit(1);
  }

  console.log("As duas fontes CONCORDAM, no confirmado e no pendente, para a conta inteira.");

  if (confirmadoEsplora > 0) {
    console.log(
      "\nPROVADO: o nó encontra fundos da conta a partir dos descriptors, e o que\n" +
        "ele reporta bate com uma fonte independente. A carteira pode saber quais\n" +
        "endereços são dela perguntando ao nó do próprio usuário — sem derivar\n" +
        "nada no aplicativo e sem perguntar a servidor de terceiro.",
    );
  } else if (pendenteEsplora > 0 || saldoNo.untrustedPendingSats > 0) {
    console.log(
      "\nQUASE: o nó JÁ VIU o pagamento, mas ele ainda está no mempool.\n" +
        "Isso prova que o import foi aceito e que os descriptors estão sendo\n" +
        "observados de verdade. Falta a confirmação em bloco para fechar.\n" +
        "Espere um bloco e rode de novo.",
    );
  } else {
    console.log(
      "\nINCOMPLETO: os dois deram zero em tudo. Concordar em zero prova que o\n" +
        "import foi aceito, mas NÃO prova que o nó encontra fundos.\n" +
        `Mande moeda de faucet para ${enderecos.recebimento[0]} e rode de novo.`,
    );
  }
  console.log();
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
