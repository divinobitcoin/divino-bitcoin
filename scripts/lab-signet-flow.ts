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
 * ambiente. **Nada é escrito em disco.** A seed vive no histórico do seu
 * terminal, que é exatamente onde uma seed descartável deve viver — e onde uma
 * seed real jamais deveria.
 *
 * Uso:
 *
 *   npx tsx scripts/lab-signet-flow.ts new-seed
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts address
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts balance
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB]
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/lab-signet-flow.ts send <destino> <sats> [sat/vB] --confirmo
 *
 * Sem `--confirmo`, `send` faz tudo menos transmitir e mostra a revisão.
 * Transmitir exige a flag: é o único passo que não volta.
 */

import { randomBytes } from "node:crypto";

import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

import { selectCoins } from "../shared/coin-selection";
import {
  fetchAddressUtxos,
  sumUtxoValueSats,
  type EsploraConfig,
  type EsploraUtxo,
} from "../shared/esplora-client";
import { buildPsbtFromSelection } from "../shared/psbt-builder";
import { signAndFinalizeWithTestSeed } from "../shared/psbt-signer";
import {
  broadcastRawTransaction,
  reviewSignedTransaction,
  BroadcastRejectedError,
} from "../shared/transaction-broadcast";

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

function formatSats(sats: number): string {
  return `${sats.toLocaleString("pt-BR")} sat`;
}

// ---------------------------------------------------------------------------

function commandNewSeed(): void {
  // 32 bytes de entropia do CSPRNG do sistema. Descartável por construção:
  // ninguém a anota, ninguém a guarda, e ela morre quando o terminal fechar.
  const seedHex = hex.encode(randomBytes(32));

  console.log(AVISO);
  console.log("Seed gerada (hex):\n");
  console.log(`  ${seedHex}\n`);
  console.log("Endereço de recebimento:\n");
  console.log(`  ${addressFor(seedHex, RECEIVE_PATH)}\n`);
  console.log("Exporte para os próximos comandos:\n");
  console.log(`  export DIVINO_LAB_SEED=${seedHex}\n`);
  console.log("Depois peça moeda de Signet num faucet e cole esse endereço.\n");
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

  const [destino, satsArg, taxaArg] = args;
  const confirmado = args.includes("--confirmo");

  if (!destino || !satsArg) {
    fail("Uso: send <endereco-destino> <sats> [sat/vB] [--confirmo]");
  }

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
  console.log(`Taxa:     ${feeRate} sat/vB\n`);

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

  const psbt = buildPsbtFromSelection({
    selection: selecao.selection,
    recipientAddress: destino,
    changeAddress,
    network: NETWORK,
    ownerAddressFor: () => receiveAddress,
  });

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

  console.log("Transmitindo...\n");

  try {
    const resultado = await broadcastRawTransaction({
      config: ESPLORA,
      rawTxHex: final.rawTxHex,
      expectedTxid: final.txid,
      network: NETWORK,
    });

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

async function main(): Promise<void> {
  const [comando, ...args] = process.argv.slice(2);

  switch (comando) {
    case "new-seed":
      return commandNewSeed();
    case "address":
      return commandAddress();
    case "balance":
      return commandBalance();
    case "send":
      return commandSend(args);
    default:
      console.log(`
Ferramenta de laboratório — caminho on-chain na Signet

  new-seed                              gera seed descartável e endereço
  address                               mostra endereços de recebimento e troco
  balance                               consulta UTXOs do endereço de recebimento
  send <destino> <sats> [sat/vB]        monta, assina e REVISA (não transmite)
  send <destino> <sats> [sat/vB] --confirmo   transmite de verdade

Todos exceto new-seed exigem DIVINO_LAB_SEED no ambiente.
`);
      process.exit(comando ? 1 : 0);
  }
}

main().catch((error: unknown) => {
  console.error(`\nFALHOU: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
