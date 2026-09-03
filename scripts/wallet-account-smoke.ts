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

  /**
   * Endereços desta conta, para filtrar o que o nó devolve.
   *
   * **SMOKE-MULTICONTA-001, 02/09/2026.** `listunspent` responde pela WALLET
   * INTEIRA do Core, não pela conta. Basta uma segunda seed de laboratório
   * usar o mesmo nome de wallet para os UTXOs das duas contas aparecerem
   * juntos — e comparar isso contra o Esplora, que é consultado só pelos
   * endereços DESTA conta, declara divergência onde não há.
   *
   * Aconteceu: a conta perdida em `LAB-SEED-VOLATIL-001` continuou dentro de
   * `divino-watch-only-conta`, e a primeira execução com a conta nova somou as
   * duas. O nó reportou 10.000 confirmados que o Esplora não via, porque eram
   * de outra conta.
   */
  const enderecosDaConta = new Set([...enderecos.recebimento, ...enderecos.troco]);

  const saldoNo = await getWatchOnlyBalanceSummary(config);
  const utxosNoBrutos = await listWatchOnlyUtxos(config);
  const utxosNo = utxosNoBrutos.filter((u) => enderecosDaConta.has(u.address));
  const utxosForaDaConta = utxosNoBrutos.length - utxosNo.length;

  /**
   * Os valores saem do próprio `listunspent`, NÃO de `getbalances`.
   *
   * **SMOKE-TRUSTED-001, 02/09/2026.** `getbalances.mine.trusted` não quer
   * dizer "confirmado". Quer dizer "não confirmado, mas eu confio" — e o Core
   * confia no troco ainda não confirmado de uma transação cujas entradas a
   * própria wallet conhece por inteiro, porque ninguém de fora pode
   * gastá-las duas vezes.
   *
   * A versão anterior tirava os VALORES de `getbalances` e as CONTAGENS de
   * `listunspent`: duas réguas na mesma comparação. Enquanto todo o dinheiro
   * vinha de faucet — de terceiro — as duas coincidiam por acidente. Na
   * primeira transação da conta PARA SI MESMA, o troco não confirmado entrou
   * como `trusted` no nó e como não confirmado no Esplora, e o veredito deu
   * falso negativo sobre uma rodada que tinha funcionado.
   *
   * `listunspent` traz `confirmations` por UTXO, que é a mesma definição do
   * Esplora. Somar dali põe os dois lados na mesma língua.
   */
  const utxosNoConfirmados = utxosNo.filter((u) => u.confirmed);
  const utxosNoPendentes = utxosNo.filter((u) => !u.confirmed);
  const somaSats = (lista: typeof utxosNo): number =>
    lista.reduce((total, utxo) => total + utxo.valueSats, 0);
  const confirmadoNo = somaSats(utxosNoConfirmados);
  const pendenteNo = somaSats(utxosNoPendentes);

  console.log(
    `Nó — confirmado: ${confirmadoNo} sat (${utxosNoConfirmados.length} UTXO) | ` +
      `pendente: ${pendenteNo} sat (${utxosNoPendentes.length} UTXO)`,
  );

  if (utxosForaDaConta > 0) {
    console.log(
      `  ATENÇÃO: ${utxosForaDaConta} UTXO da wallet "${config.walletName}" ficaram de fora da\n` +
        "  comparação: estão em endereços que não são desta conta. Isso é correto, mas\n" +
        "  indica wallet compartilhada entre contas (SMOKE-MULTICONTA-001). Para uma\n" +
        "  wallet limpa: export DIVINO_CORE_ACCOUNT_WALLET=<outro nome>",
    );
  }

  if (saldoNo.trustedSats !== confirmadoNo || saldoNo.untrustedPendingSats !== pendenteNo) {
    console.log(
      `  Nota: getbalances diz trusted=${saldoNo.trustedSats} e untrusted_pending=${saldoNo.untrustedPendingSats},\n` +
        "  diferente dos números acima. Isso é NORMAL e não é erro: 'trusted' inclui\n" +
        "  troco próprio ainda não confirmado, e pode incluir outras contas da mesma\n" +
        "  wallet. Ver SMOKE-TRUSTED-001. A comparação usa listunspent, não getbalances.",
    );
  }

  console.log("\n--- Passo 4: somar os mesmos endereços pelo Esplora, para comparar ---");
  const esplora: EsploraConfig = { baseUrl: process.env.DIVINO_LAB_ESPLORA ?? "https://mempool.space/signet/api" };
  const todos = [...enderecos.recebimento, ...enderecos.troco];
  let confirmadoEsplora = 0;
  let pendenteEsplora = 0;
  let utxosConfirmadosEsplora = 0;
  let utxosPendentesEsplora = 0;
  // `SMOKE-ESPLORA-CRASH-001`, 03/09/2026. A versão anterior deixava a exceção
  // subir, e o script morria com `TypeError: fetch failed` e um stack trace —
  // DEPOIS de já ter obtido a resposta do nó do próprio usuário.
  //
  // Errado por dois motivos. Primeiro: falha de terceiro é condição normal de
  // operação, não exceção — serviço público cai, limita requisição e some sem
  // avisar. Segundo, e pior: a ferramenta jogava fora uma resposta boa, vinda
  // da fonte que este projeto inteiro existe para privilegiar, porque a fonte
  // de COMPARAÇÃO não respondeu.
  //
  // O `try` envolve o laço inteiro de propósito. Somar parcialmente e comparar
  // produziria divergência falsa — mesma família do `SMOKE-VERDICT-001`: a
  // régua errada, não o que era medido.
  try {
    for (const address of todos) {
      const utxos = await fetchAddressUtxos(esplora, address);
      const confirmados = utxos.filter((u) => u.confirmed);
      const pendentes = utxos.filter((u) => !u.confirmed);
      confirmadoEsplora += sumUtxoValueSats(confirmados);
      pendenteEsplora += sumUtxoValueSats(pendentes);
      utxosConfirmadosEsplora += confirmados.length;
      utxosPendentesEsplora += pendentes.length;
    }
  } catch (erro) {
    console.log(`A segunda fonte NÃO respondeu: ${erro instanceof Error ? erro.message : String(erro)}`);
    console.log(`  Endpoint: ${esplora.baseUrl}`);
    console.log("\n--- Veredito ---");
    console.log("SEM VEREDITO. O nó do seu computador respondeu, e o que ele disse está");
    console.log("acima, íntegro. Faltou a SEGUNDA fonte — e sem duas fontes independentes");
    console.log("este script não diz PROVADO. Uma fonte sozinha é autoconfirmação.");
    console.log("\n  Isto NÃO é defeito da sua conta nem do seu nó.");
    console.log("  Causas comuns: sua conexão, o serviço fora do ar, ou limite de");
    console.log("  requisição depois de várias rodadas de 20 endereços.");
    console.log("\n  Conferir se o serviço está no ar:");
    console.log(`    curl -sS ${esplora.baseUrl}/blocks/tip/height; echo`);
    console.log("  Usar outro Esplora:  export DIVINO_LAB_ESPLORA=<url>/api");
    console.log("\n  SMOKE-ESPLORA-CRASH-001");
    // Código 2, distinto do 1 usado para divergência real entre as fontes. São
    // dois resultados diferentes, e quem automatizar isto precisa separar
    // "as fontes discordam" de "faltou uma fonte".
    process.exit(2);
  }

  console.log(
    `Esplora — confirmado: ${confirmadoEsplora} sat (${utxosConfirmadosEsplora} UTXO) | ` +
      `pendente: ${pendenteEsplora} sat (${utxosPendentesEsplora} UTXO)   [${todos.length} endereços consultados]`,
  );

  console.log("\n--- Veredito ---");
  const bateConfirmado =
    confirmadoNo === confirmadoEsplora && utxosNoConfirmados.length === utxosConfirmadosEsplora;
  const batePendente =
    pendenteNo === pendenteEsplora && utxosNoPendentes.length === utxosPendentesEsplora;

  if (!bateConfirmado || !batePendente) {
    console.log("As duas fontes NÃO concordam. Isto é um achado, não um erro do script:");
    console.log(`  confirmado:  nó ${confirmadoNo} sat / ${utxosNoConfirmados.length} UTXO` +
      `   vs Esplora ${confirmadoEsplora} sat / ${utxosConfirmadosEsplora} UTXO`);
    console.log(`  pendente:    nó ${pendenteNo} sat / ${utxosNoPendentes.length} UTXO` +
      `   vs Esplora ${pendenteEsplora} sat / ${utxosPendentesEsplora} UTXO`);
    console.log(
      "  Duas causas já catalogadas foram eliminadas por construção: mistura de\n" +
        "  contas na mesma wallet (SMOKE-MULTICONTA-001) e 'trusted' tratado como\n" +
        "  confirmado (SMOKE-TRUSTED-001). Restam: janela de rescan (o nó é podado),\n" +
        "  faixa curta demais, ou propagação — o mempool do seu nó e o do Esplora\n" +
        "  não são o mesmo.",
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
  } else if (pendenteEsplora > 0 || pendenteNo > 0) {
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
