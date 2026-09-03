/**
 * Ferramenta de LABORATÓRIO: exercita o caminho on-chain completo na Signet.
 *
 *   ler saldo → escolher moedas → montar PSBT → assinar → revisar → transmitir
 *
 * Existe para fechar o achado `BROADCAST-REAL-001`: até uma transação ser
 * realmente aceita por um nó, o projeto só pode afirmar que o código de
 * transmissão existe, não que a carteira transmite.
 *
 * ## Isto NÃO é a carteira
 *
 * É um script de linha de comando que usa os módulos da carteira. Não tem
 * interface, não guarda estado, não persiste nada, e importa
 * `shared/psbt-signer` — módulo TEST/LAB que nunca vai para produção.
 *
 * Roda sob a faixa `LAB-LANE-001`, condições L1/L2/L3: Signet, seed
 * descartável, valor econômico zero.
 *
 * ## A seed
 *
 * Gerada aleatoriamente por `new-seed` e passada de volta por variável de
 * ambiente. **Nada é escrito em disco** — protege contra vazamento, e é onde
 * uma seed descartável deve viver, nunca uma real.
 *
 * A versão anterior deste parágrafo dizia que "a seed vive no histórico do seu
 * terminal". **Isso é falso no caso mais comum**, e a diferença custou uma
 * conta em 01/09 (`LAB-SEED-VOLATIL-001`): quem gera dentro de `$( )` nunca
 * põe o valor no histórico — só o comando que o produz, e ele produz outro a
 * cada execução. Sem cópia manual, fechar o terminal apaga a conta e o que
 * estiver nela.
 *
 * Por isso `new-seed` agora manda gravar o Recovery Kit **antes** de a conta
 * receber qualquer moeda. Ver `scripts/recovery-kit.ts`.
 *
 * ## Mnemonic é o padrão desde 02/09 (`KIT-MNEMONIC-001`)
 *
 * `new-seed` gera **12 palavras BIP-39** e imprime a seed derivada delas. O
 * modo antigo, entropia hex crua, sobreviveu atrás de `--hex-cru` e serve só
 * para reproduzir contas antigas.
 *
 * A troca de padrão é a correção de um defeito de produto, não uma
 * conveniência: uma conta sem palavras é irrecuperável em carteira de celular,
 * e a Divino é uma carteira de celular. Enquanto o caminho fácil produzia
 * contas assim, todo Recovery Kit do laboratório trazia um asterisco escondido.
 *
 * `DIVINO_LAB_SEED` continua sendo **hexadecimal e nada mais**, e a recusa de
 * qualquer coisa com espaços continua valendo — ela protege contra alguém
 * colar um mnemonic real numa ferramenta de laboratório. As palavras andam
 * numa variável própria, `DIVINO_LAB_MNEMONIC`, lida apenas pelo
 * `recovery-kit.ts`.
 *
 * Uso:
 *
 *   npx tsx scripts/lab-signet-flow.ts new-seed            # 12 palavras
 *   npx tsx scripts/lab-signet-flow.ts new-seed --24       # 24 palavras
 *   npx tsx scripts/lab-signet-flow.ts new-seed --hex-cru  # sem palavras
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts address
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts balance
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB]
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB] --confirmo
 *
 * Sem `--confirmo`, `send` faz tudo menos transmitir e mostra a revisão.
 * Transmitir exige a flag: é o único passo que não volta.
 *
 * ## `--via-node` (I-3, CARTA-001)
 *
 * `send` transmite pelo Esplora público por padrão. Com `--via-node`,
 * transmite via `sendrawtransaction` no `bitcoind` do próprio usuário —
 * mesma disciplina de precheck local (recalcula o txid antes de qualquer
 * chamada de rede), implementada em
 * `shared/bitcoin-core-wallet-client.ts::broadcastRawTransactionViaCoreRpc`.
 * A leitura de saldo continua vindo do Esplora — só o broadcast muda.
 * Credenciais do nó: mesmas variáveis de `scripts/wallet-core-smoke.ts`
 * (`DIVINO_CORE_RPC_URL`, cookie file por padrão, ou
 * `DIVINO_CORE_RPC_USER`/`_PASSWORD`).
 *
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB] --via-node
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB] --via-node --confirmo
 */

import { randomBytes } from "node:crypto";

import { base64, hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

import type { BitcoinCoreRpcConfig } from "../shared/bitcoin-core-rpc-client";
import { broadcastRawTransactionViaCoreRpc } from "../shared/bitcoin-core-wallet-client";
import { selectCoins } from "../shared/coin-selection";
import {
  fetchAddressUtxos,
  sumUtxoValueSats,
  type EsploraConfig,
  type EsploraUtxo,
} from "../shared/esplora-client";
import { buildPsbtFromSelection, type Bip32DerivationInfo } from "../shared/psbt-builder";
import { signAndFinalizeWithTestSeed, signPsbtWithTestSeed } from "../shared/psbt-signer";
import {
  broadcastRawTransaction,
  reviewSignedTransaction,
  BroadcastRejectedError,
} from "../shared/transaction-broadcast";
import { resolveBitcoinCoreRpcCredentials } from "./bitcoin-core-rpc-env";
import { confirmarQueOMnemonicProduzASeed, gerarMnemonicDeLaboratorio } from "./lab-mnemonic";

/**
 * Endpoint Esplora. Configurável de propósito.
 *
 * O `signet-architecture-decision-brief.md` decidiu "fonte combinada e
 * configurável, **sem endpoint público pré-definido**". Um padrão embutido
 * neste script de laboratório é conveniência aceitável — mas a carteira
 * propriamente dita não pode embarcar endpoint nenhum, porque quem escolhe o
 * servidor escolhe quem observa as consultas do usuário.
 *
 * Trocar com:  export DIVINO_LAB_ESPLORA=https://seu-esplora/api
 */
const ESPLORA: EsploraConfig = {
  baseUrl: process.env.DIVINO_LAB_ESPLORA ?? "https://mempool.space/signet/api",
};
const NETWORK = "signet" as const;
const RECEIVE_PATH = "m/84'/1'/0'/0/0";
const CHANGE_PATH = "m/84'/1'/0'/1/0";

const AVISO = `
┌──────────────────────────────────────────────────────────────────────┐
│  SEED DESCARTÁVEL — LABORATÓRIO SIGNET                               │
│                                                                      │
│  Esta seed passa pelo runtime JavaScript, aparece no histórico do    │
│  terminal e não tem proteção nenhuma.                                │
│                                                                      │
│  NUNCA envie Bitcoin real para um endereço derivado dela.            │
│  Moeda de Signet não vale nada. É esse o ponto.                      │
└──────────────────────────────────────────────────────────────────────┘
`;

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

  if (seed.trim().includes(" ")) {
    fail(
      "DIVINO_LAB_SEED parece ser um mnemonic (contém espaços).\n" +
        "  Esta ferramenta aceita SOMENTE seed em hex, e somente descartável.\n" +
        "  Se isso é um mnemonic de verdade, pare agora e não o use aqui.",
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(seed) || seed.length % 2 !== 0) {
    fail("DIVINO_LAB_SEED precisa ser hexadecimal de comprimento par.");
  }

  return seed.toLowerCase();
}

function addressFor(seedHex: string, path: string): string {
  const root = HDKey.fromMasterSeed(hex.decode(seedHex));
  try {
    const child = root.derive(path);
    try {
      if (!child.publicKey) fail(`Derivação em ${path} não produziu chave pública.`);
      const address = btc.p2wpkh(child.publicKey, btc.TEST_NETWORK).address;
      if (!address) fail(`Não foi possível derivar endereço em ${path}.`);
      return address;
    } finally {
      child.wipePrivateData();
    }
  } finally {
    root.wipePrivateData();
  }
}

/**
 * Produz a informação de origem (`bip32Derivation`) de um caminho.
 *
 * Só material **público** sai daqui: chave pública comprimida, fingerprint da
 * mestra e o caminho. Nada disto permite gastar. Deriva porque mora em
 * `scripts/`, que não é *runtime root* — a carteira não pode fazer isto, e é
 * essa a razão de o campo ter de chegar pronto até ela.
 *
 * A fingerprint **não** depende dos bytes de versão: ela é derivada do hash da
 * chave pública, não da serialização. Por isso `fromMasterSeed` sem
 * `VERSOES_TESTNET` devolve a mesma fingerprint — mesmo fato que já estava
 * verificado para endereços em `TPUB-SERIAL-001`.
 */
function derivationInfoFor(seedHex: string, path: string): Bip32DerivationInfo {
  const root = HDKey.fromMasterSeed(hex.decode(seedHex));
  try {
    const masterFingerprint = root.fingerprint.toString(16).padStart(8, "0");
    const child = root.derive(path);
    try {
      if (!child.publicKey) fail(`Derivação em ${path} não produziu chave pública.`);
      return { publicKeyHex: hex.encode(child.publicKey), masterFingerprint, path };
    } finally {
      child.wipePrivateData();
    }
  } finally {
    root.wipePrivateData();
  }
}

function formatSats(sats: number): string {
  return `${sats.toLocaleString("pt-BR")} sat`;
}

// ---------------------------------------------------------------------------

function commandNewSeed(args: string[]): void {
  // **KIT-MNEMONIC-001.** Desde 02/09/2026 o padrão é MNEMONIC BIP-39, e a
  // entropia hex crua ficou atrás de `--hex-cru`.
  //
  // A inversão é deliberada. O padrão é o que decide o resultado: enquanto o
  // caminho fácil produzia uma conta sem palavras, todo Recovery Kit gerado
  // no laboratório era irrecuperável num celular — o Zeus pede doze palavras,
  // e nenhuma carteira móvel importa 128 caracteres de hexadecimal. O
  // laboratório provava a derivação e os descriptors, mas não provava nada
  // sobre o formato que o usuário final vai guardar.
  //
  // Uma carteira de celular cujo backup só recupera num PC tem um asterisco
  // escondido na promessa. Este comando deixou de produzi-lo por padrão.
  const querHexCru = args.includes("--hex-cru");
  const quer24 = args.includes("--24");

  if (querHexCru && quer24) {
    fail("--24 só faz sentido com mnemonic. Remova --hex-cru ou remova --24.");
  }

  const mnemonic = querHexCru ? null : gerarMnemonicDeLaboratorio(quer24 ? 24 : 12);

  //
  // **LAB-SEED-VOLATIL-001, 01/09/2026.** O comentário que estava aqui dizia
  // que a seed é "descartável por construção: ninguém a anota, ninguém a
  // guarda, e ela morre quando o terminal fechar" — como se isso fosse só
  // qualidade. É metade da verdade, e a metade que faltava custou uma conta.
  //
  // Não tocar o disco protege contra vazamento. A consequência que ninguém
  // tinha escrito: o valor também **não entra no histórico** quando gerado
  // dentro de `$( )`, e `randomBytes` devolve outro a cada execução — rodar o
  // mesmo comando de novo não recupera nada. Fechados os terminais, a conta
  // deixa de existir, junto com qualquer fundo que estivesse nela.
  //
  // Aconteceu: 10.000 sat de Signet ficaram permanentemente inacessíveis.
  // Custo econômico zero, porque é moeda de faucet. Mas foi perda de fundos
  // **sem ataque nenhum** — sem invasor, sem defeito de código, sem chave
  // vazada. Uma janela de terminal fechou.
  //
  // Por isso o comando avisa antes, em vez de entregar a seed e ficar calado.
  // Perder é tão definitivo quanto ser roubado; a diferença é que ninguém
  // escreve tutorial sobre a primeira.
  const seedHex = mnemonic ? mnemonic.seedHex : hex.encode(randomBytes(32));

  // A verificação de volta, na própria geração. As palavras só são impressas
  // depois de provarem que derivam a seed que vai ser usada — mesma disciplina
  // que o Recovery Kit aplica. Aqui é redundante por construção; fica porque
  // uma redundância que custa microssegundos é barata comparada a um kit que
  // descreve uma conta e abre outra.
  if (mnemonic) confirmarQueOMnemonicProduzASeed(mnemonic, seedHex);

  console.log(AVISO);

  if (mnemonic) {
    console.log(`Mnemonic BIP-39 gerada — ${mnemonic.quantidade} palavras, lista ${mnemonic.idiomaDaLista}:\n`);
    const palavras = mnemonic.palavras.split(" ");
    for (let i = 0; i < palavras.length; i += 4) {
      console.log(
        "  " +
          palavras
            .slice(i, i + 4)
            .map((palavra, j) => `${String(i + j + 1).padStart(2)}. ${palavra.padEnd(10)}`)
            .join(""),
      );
    }
    console.log();
    console.log("  A ORDEM FAZ PARTE DO SEGREDO. Os números não são enfeite:");
    console.log("  as mesmas palavras fora de ordem reprovam no checksum, e");
    console.log("  duas trocadas entre si podem passar e abrir outra carteira.");
    console.log("  A LISTA TAMBÉM FAZ PARTE DO SEGREDO — anote o idioma junto.");
    console.log("  Sem passphrase BIP-39 nesta conta.\n");
  } else {
    console.log("Modo --hex-cru: entropia bruta, SEM palavras.\n");
    console.log("  Esta conta não pode ser recuperada em carteira de celular —");
    console.log("  nenhuma delas importa hexadecimal. Use este modo só para");
    console.log("  regressão de contas antigas. Ver KIT-MNEMONIC-001.\n");
  }

  console.log(`Seed (hex, ${seedHex.length / 2} bytes):\n`);
  console.log(`  ${seedHex}\n`);
  console.log("Endereço de recebimento:\n");
  console.log(`  ${addressFor(seedHex, RECEIVE_PATH)}\n`);

  console.log("──────────────────────────────────────────────────────────────────────");
  console.log("PASSO 1 — exporte (copie o bloco inteiro, ele não pede substituição):");
  console.log("──────────────────────────────────────────────────────────────────────\n");
  console.log(`export DIVINO_LAB_SEED=${seedHex}`);
  if (mnemonic) console.log(`export DIVINO_LAB_MNEMONIC="${mnemonic.palavras}"`);
  console.log(`export DIVINO_KIT_BIRTHDAY=$(date +%F)\n`);

  console.log("──────────────────────────────────────────────────────────────────────");
  console.log("PASSO 2 — grave o Recovery Kit ANTES de pedir moeda no faucet:");
  console.log("──────────────────────────────────────────────────────────────────────\n");
  console.log("npx tsx scripts/recovery-kit.ts --com-chave-privada \\");
  console.log("  > ~/recovery-kit-lab-signet.txt && chmod 600 ~/recovery-kit-lab-signet.txt\n");

  console.log("┌───────────────────────────────────────────────────────────────────────┐");
  console.log("│  ESTE SEGREDO SÓ EXISTE NESTA TELA                                    │");
  console.log("│                                                                       │");
  console.log("│  Nada foi gravado em disco — de propósito. A consequência é que       │");
  console.log("│  fechar este terminal sem copiar destrói a conta para sempre,         │");
  console.log("│  junto com qualquer fundo nela. Rodar new-seed de novo gera OUTRA     │");
  console.log("│  conta; não recupera esta.                                            │");
  console.log("│                                                                       │");
  console.log("│  O arquivo do kit fica FORA do repositório de propósito: dentro       │");
  console.log("│  dele, um `git add .` distraído publicaria a chave privada no         │");
  console.log("│  GitHub, para sempre.                                                 │");
  console.log("│                                                                       │");
  console.log("│  LAB-SEED-VOLATIL-001                                                 │");
  console.log("└───────────────────────────────────────────────────────────────────────┘\n");

  console.log("Só depois de guardar o kit, peça moeda de Signet num faucet");
  console.log("e cole o endereço de recebimento acima.\n");
}

function commandAddress(): void {
  const seedHex = readSeedFromEnv();
  console.log(`\nRecebimento (${RECEIVE_PATH}):  ${addressFor(seedHex, RECEIVE_PATH)}`);
  console.log(`Troco        (${CHANGE_PATH}):  ${addressFor(seedHex, CHANGE_PATH)}\n`);
}

async function commandBalance(): Promise<void> {
  const seedHex = readSeedFromEnv();
  const address = addressFor(seedHex, RECEIVE_PATH);

  console.log(`\nConsultando ${address} ...\n`);

  const utxos = await fetchAddressUtxos(ESPLORA, address);

  if (utxos.length === 0) {
    console.log("Nenhum UTXO. O faucet ainda não pagou, ou a transação não confirmou.\n");
    return;
  }

  const confirmados = utxos.filter((u) => u.confirmed);

  console.log(`UTXOs: ${utxos.length}  (confirmados: ${confirmados.length})\n`);
  for (const utxo of utxos) {
    const estado = utxo.confirmed ? `bloco ${utxo.blockHeight}` : "NÃO CONFIRMADO";
    console.log(`  ${utxo.txid}:${utxo.vout}  ${formatSats(utxo.valueSats).padStart(18)}  ${estado}`);
  }

  console.log(`\nTotal:        ${formatSats(sumUtxoValueSats(utxos))}`);
  console.log(`Gastável:     ${formatSats(sumUtxoValueSats(confirmados))}\n`);
}

async function commandSend(args: string[]): Promise<void> {
  const seedHex = readSeedFromEnv();

  const posicionais = args.filter((a) => !a.startsWith("--"));
  const [destino, satsArg, taxaArg] = posicionais;
  const confirmado = args.includes("--confirmo");
  const viaNode = args.includes("--via-node");

  if (!destino || !satsArg) {
    fail("Uso: send <endereco-destino> <sats> [sat/vB] [--via-node] [--confirmo]");
  }

  // Resolvido ANTES de montar qualquer coisa: se as credenciais do nó
  // estiverem erradas, é melhor falhar aqui do que depois de já ter
  // assinado. Não transmite nada por si só.
  const nodeConfig: BitcoinCoreRpcConfig | null = viaNode
    ? { url: process.env.DIVINO_CORE_RPC_URL ?? "http://127.0.0.1:38332", ...resolveBitcoinCoreRpcCredentials() }
    : null;

  const targetSats = Number(satsArg);
  const feeRate = taxaArg && !taxaArg.startsWith("--") ? Number(taxaArg) : 2;

  if (!Number.isInteger(targetSats) || targetSats <= 0) {
    fail(`Valor inválido: ${satsArg}. Informe satoshis inteiros.`);
  }
  if (!Number.isFinite(feeRate) || feeRate <= 0) {
    fail(`Taxa inválida: ${taxaArg}. Informe sat/vB maior que zero.`);
  }

  const receiveAddress = addressFor(seedHex, RECEIVE_PATH);
  const changeAddress = addressFor(seedHex, CHANGE_PATH);

  console.log(`\nOrigem:   ${receiveAddress}`);
  console.log(`Destino:  ${destino}`);
  console.log(`Valor:    ${formatSats(targetSats)}`);
  console.log(`Taxa:     ${feeRate} sat/vB`);
  console.log(`Transmissão via: ${nodeConfig ? `nó próprio (${nodeConfig.url})` : "Esplora público (mempool.space)"}\n`);

  const utxos: EsploraUtxo[] = await fetchAddressUtxos(ESPLORA, receiveAddress);

  const selecao = selectCoins({
    utxos,
    recipientAddress: destino,
    targetSats,
    feeRateSatsPerVByte: feeRate,
    network: NETWORK,
  });

  if (!selecao.ok) {
    fail(`Seleção de moedas falhou (${selecao.reason}).\n  ${selecao.message}`);
  }

  console.log(`Entradas escolhidas: ${selecao.selection.selected.length}`);
  console.log(`Taxa estimada:       ${formatSats(selecao.selection.feeSats)}`);
  if (selecao.selection.droppedToFeeSats > 0) {
    console.log(
      `  Atenção: ${formatSats(selecao.selection.droppedToFeeSats)} de troco viraram taxa (abaixo da poeira).`,
    );
  }

  // `PSBT-DERIV-001`. Todas as entradas deste script vêm do mesmo endereço de
  // recebimento, então a origem é a mesma para todas. Numa carteira de verdade
  // cada entrada tem o seu caminho, e é por isso que `derivationFor` recebe o
  // UTXO em vez de devolver um valor fixo.
  const psbt = buildPsbtFromSelection({
    selection: selecao.selection,
    recipientAddress: destino,
    changeAddress,
    network: NETWORK,
    ownerAddressFor: () => receiveAddress,
    derivationFor: () => derivationInfoFor(seedHex, RECEIVE_PATH),
    changeDerivation: derivationInfoFor(seedHex, CHANGE_PATH),
  });

  console.log(
    `Origem das chaves na PSBT: entradas ${psbt.hasInputDerivations ? "SIM" : "não"}` +
      `, troco ${psbt.hasChangeDerivation ? "SIM" : "não"}  (PSBT-DERIV-001)`,
  );

  const final = signAndFinalizeWithTestSeed({
    psbtBase64: psbt.psbtBase64,
    seedHex,
    inputPaths: selecao.selection.selected.map(() => RECEIVE_PATH),
    network: NETWORK,
  });

  // Revisão a partir dos BYTES que serão transmitidos, não da intenção acima.
  const revisao = reviewSignedTransaction({
    rawTxHex: final.rawTxHex,
    network: NETWORK,
    totalInputSats: selecao.selection.totalInputSats,
    changeAddresses: [changeAddress],
  });

  console.log("\n─── REVISÃO (lida da transação assinada) ───────────────────\n");
  console.log(`  Rede:            SIGNET`);
  console.log(`  Txid:            ${revisao.txid}`);
  console.log(`  Tamanho:         ${revisao.vsize} vB  (estimado: ${selecao.selection.estimatedVBytes} vB)`);
  console.log(`  Taxa:            ${formatSats(revisao.feeSats)}  (${revisao.feeRateSatsPerVByte.toFixed(2)} sat/vB)`);
  console.log(`  Sai da carteira: ${formatSats(revisao.leavingWalletSats)}`);
  console.log("\n  Saídas:");
  for (const saida of revisao.outputs) {
    const rotulo = saida.isChange ? "TROCO   " : "DESTINO ";
    console.log(`    ${rotulo} ${formatSats(saida.amountSats).padStart(18)}  ${saida.address || "(script não endereçável)"}`);
  }

  if (revisao.warnings.length > 0) {
    console.log("\n  AVISOS:");
    for (const aviso of revisao.warnings) console.log(`    • ${aviso}`);
  }

  console.log("\n  Transmitir é IRREVERSÍVEL.");
  console.log("─────────────────────────────────────────────────────────────\n");

  if (!confirmado) {
    console.log("Nada foi transmitido. Confira a revisão acima.");
    console.log("Para transmitir de verdade, repita o comando com --confirmo\n");
    return;
  }

  console.log(`Transmitindo${nodeConfig ? " pelo nó próprio" : ""}...\n`);

  try {
    // Transmite a REVISÃO que foi impressa acima, não outra variável —
    // nos dois caminhos.
    const resultado = nodeConfig
      ? await broadcastRawTransactionViaCoreRpc({ config: nodeConfig, review: revisao })
      : await broadcastRawTransaction({ config: ESPLORA, review: revisao });

    console.log(`ACEITA PELO NÓ.\n`);
    console.log(`  txid: ${resultado.txid}`);
    console.log(`  https://mempool.space/signet/tx/${resultado.txid}\n`);
  } catch (error) {
    if (error instanceof BroadcastRejectedError) {
      console.error(`\nO NÓ RECUSOU (HTTP ${error.status}):\n`);
      console.error(`  ${error.serverResponse}\n`);
      console.error("A transação NÃO entrou na rede. Nada foi gasto.\n");
      process.exit(1);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------

/**
 * Descobre qual caminho de derivação controla um script de saída.
 *
 * Existe porque uma PSBT vinda de fora não diz qual chave assina cada entrada
 * — o campo `bip32Derivation` não é preenchido hoje (PSBT-DERIV-001). Em vez
 * de supor que toda entrada é do endereço de recebimento, o script decodifica
 * o endereço da entrada e procura, entre os caminhos conhecidos, o que produz
 * exatamente aquele endereço.
 *
 * Supor erraria calado: assinar com a chave errada não falha aqui, falha no
 * `finalize`, longe da causa.
 */
function pathForInputScript(seedHex: string, script: Uint8Array): string | null {
  let enderecoDaEntrada: string;
  try {
    enderecoDaEntrada = btc.Address(btc.TEST_NETWORK).encode(btc.OutScript.decode(script));
  } catch {
    return null;
  }

  for (const path of [RECEIVE_PATH, CHANGE_PATH]) {
    if (addressFor(seedHex, path) === enderecoDaEntrada) return path;
  }

  return null;
}

/**
 * Assina uma PSBT vinda de fora e devolve a PSBT assinada.
 *
 * NÃO finaliza e NÃO transmite. É o assinador externo do fluxo PSBT: a
 * interface monta, este comando assina, a interface revisa pelos bytes e
 * transmite. Enquanto o cofre nativo não existir, é este script que ocupa o
 * lugar dele — e é por isso que ele vive na faixa de laboratório, com seed
 * descartável e valor zero.
 */
function commandSign(args: string[]): void {
  const psbtBase64 = args[0];

  if (!psbtBase64) {
    fail("Uso: sign <psbt-base64>");
  }

  const seedHex = readSeedFromEnv();

  let tx: btc.Transaction;
  try {
    tx = btc.Transaction.fromPSBT(base64.decode(psbtBase64));
  } catch (cause) {
    fail(
      `Não foi possível ler a PSBT: ${cause instanceof Error ? cause.message : String(cause)}\n` +
        "  Confira se colou o texto inteiro, sem quebra de linha perdida.",
    );
  }

  if (tx.inputsLength === 0) {
    fail("PSBT sem entradas: não há o que assinar.");
  }

  const caminhos: string[] = [];

  for (let i = 0; i < tx.inputsLength; i += 1) {
    const script = tx.getInput(i).witnessUtxo?.script;

    if (!script) {
      fail(
        `Entrada ${i} não declara witnessUtxo. Sem ela não dá para saber que endereço ` +
          "está sendo gasto, e assinar às cegas é justamente o que não se faz.",
      );
    }

    const path = pathForInputScript(seedHex, script);

    if (!path) {
      const endereco = (() => {
        try {
          return btc.Address(btc.TEST_NETWORK).encode(btc.OutScript.decode(script));
        } catch {
          return "(script ilegível)";
        }
      })();

      fail(
        `Entrada ${i} gasta ${endereco}, que NÃO pertence à seed carregada.\n` +
          `  Caminhos conferidos: ${RECEIVE_PATH} e ${CHANGE_PATH}.\n` +
          "  Ou a PSBT foi montada a partir de outro endereço, ou DIVINO_LAB_SEED é outra seed.\n" +
          "  Nada foi assinado.",
      );
    }

    caminhos.push(path);
  }

  const assinada = signPsbtWithTestSeed({
    psbtBase64,
    seedHex,
    inputPaths: caminhos,
    network: NETWORK,
  });

  console.log(`\nEntradas assinadas: ${assinada.signedInputCount} de ${tx.inputsLength}`);
  for (const [i, path] of caminhos.entries()) {
    console.log(`  entrada ${i}  ←  ${path}`);
  }
  console.log("\nNÃO foi finalizada e NÃO foi transmitida.\n");
  console.log("PSBT ASSINADA — cole isto de volta na tela do aparelho:\n");
  console.log(assinada.signedPsbtBase64);
  console.log("");
}

async function main(): Promise<void> {
  const [comando, ...args] = process.argv.slice(2);

  switch (comando) {
    case "new-seed":
      return commandNewSeed(args);
    case "address":
      return commandAddress();
    case "balance":
      return commandBalance();
    case "sign":
      return commandSign(args);
    case "send":
      return commandSend(args);
    default:
      console.log(`
Ferramenta de laboratório — caminho on-chain na Signet

  new-seed                              gera conta descartável a partir de MNEMONIC (12 palavras)
  new-seed --24                         o mesmo, com 24 palavras
  new-seed --hex-cru                    entropia bruta, SEM palavras (contas antigas; ver KIT-MNEMONIC-001)
  address                               mostra endereços de recebimento e troco
  balance                               consulta UTXOs do endereço de recebimento
  sign <psbt-base64>                    assina uma PSBT vinda de fora e imprime a assinada
  send <destino> <sats> [sat/vB]        monta, assina e REVISA (não transmite)
  send <destino> <sats> [sat/vB] --confirmo   transmite de verdade (via Esplora)
  send <destino> <sats> [sat/vB] --via-node --confirmo   transmite via nó próprio

Todos exceto new-seed exigem DIVINO_LAB_SEED no ambiente.
--via-node exige o bitcoind próprio rodando (mesmas variáveis do wallet-core-smoke.ts).
`);
      process.exit(comando ? 1 : 0);
  }
}

main().catch((error: unknown) => {
  console.error(`\nFALHOU: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
