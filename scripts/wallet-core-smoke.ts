/**
 * SMOKE TEST de `shared/bitcoin-core-wallet-client.ts` contra um nó
 * Bitcoin Core REAL — não contra mocks.
 *
 * Este é o teste que os testes unitários não podem fazer. `pnpm test`
 * confirma que o código trata as FORMAS de resposta que eu esperava do
 * Core; isto aqui confirma (ou não) que o Core de verdade responde assim.
 * As duas coisas específicas que este script existe para verificar:
 *
 *   1. `createwallet`/`loadwallet` se comportam como o código espera
 *      quando a wallet já existe (o fallback não depende de casar o
 *      texto exato da mensagem de erro, mas nunca foi visto na prática).
 *   2. `importdescriptors` aceita o formato de requisição usado aqui.
 *
 * Roda sob LAB-LANE-001 (Signet, seed descartável, valor zero) — livre,
 * sem gate. Mas só pode rodar na SUA máquina: o nó (`~/.bitcoin-divino-signet`)
 * não existe neste ambiente onde o código foi escrito.
 *
 * ## O que este script NÃO faz
 *
 * Não assina, não constrói PSBT, não transmite nada. Só: garante a wallet
 * watch-only, importa UM endereço (derivado da mesma seed descartável que
 * `lab-signet-flow.ts` já usa), lê saldo/UTXOs pelo nó, e compara com o
 * que o Esplora público já mostra para o mesmo endereço. Se os dois não
 * baterem, isso é o resultado — não um erro do script para esconder.
 *
 * Uso:
 *
 *   DIVINO_LAB_SEED=<hex> npx tsx scripts/wallet-core-smoke.ts
 *
 * Variáveis de ambiente (todas opcionais, com padrão):
 *
 *   DIVINO_CORE_RPC_URL       http://127.0.0.1:38332
 *   DIVINO_CORE_RPC_COOKIE    ~/.bitcoin-divino-signet/signet/.cookie
 *   DIVINO_CORE_RPC_USER      (alternativa ao cookie; exige _PASSWORD junto)
 *   DIVINO_CORE_RPC_PASSWORD
 *   DIVINO_CORE_WALLET_NAME   divino-watch-only-smoke
 *   DIVINO_CORE_RESCAN_SINCE  agora menos 30 dias, em segundos unix
 *   DIVINO_LAB_ESPLORA        https://mempool.space/signet/api
 */

import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

import {
  ensureWatchOnlyWallet,
  getWatchOnlyBalanceSummary,
  importWatchOnlyAddress,
  listWatchOnlyUtxos,
  type BitcoinCoreWalletConfig,
} from "../shared/bitcoin-core-wallet-client";
import { fetchAddressUtxos, sumUtxoValueSats, type EsploraConfig } from "../shared/esplora-client";
import { resolveBitcoinCoreRpcCredentials } from "./bitcoin-core-rpc-env";

const RECEIVE_PATH = "m/84'/1'/0'/0/0";

function fail(message: string): never {
  console.error(`\nERRO: ${message}\n`);
  process.exit(1);
}

function readSeedFromEnv(): string {
  const seed = process.env.DIVINO_LAB_SEED;
  if (!seed) {
    fail(
      "DIVINO_LAB_SEED não está definida.\n" +
        "  Gere uma com: npx tsx scripts/lab-signet-flow.ts new-seed\n" +
        "  Ou reaproveite a mesma que você já usa no lab-signet-flow.",
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(seed) || seed.length % 2 !== 0) {
    fail("DIVINO_LAB_SEED precisa ser hexadecimal de comprimento par.");
  }
  return seed.toLowerCase();
}

function addressForReceive(seedHex: string): string {
  const root = HDKey.fromMasterSeed(hex.decode(seedHex));
  try {
    const child = root.derive(RECEIVE_PATH);
    try {
      if (!child.publicKey) fail(`Derivação em ${RECEIVE_PATH} não produziu chave pública.`);
      const address = btc.p2wpkh(child.publicKey, btc.TEST_NETWORK).address;
      if (!address) fail(`Não foi possível derivar endereço em ${RECEIVE_PATH}.`);
      return address;
    } finally {
      child.wipePrivateData();
    }
  } finally {
    root.wipePrivateData();
  }
}

async function main() {
  console.log("\n=== SMOKE TEST: bitcoin-core-wallet-client contra o nó real ===\n");

  const seedHex = readSeedFromEnv();
  const address = addressForReceive(seedHex);
  console.log(`Endereço de teste (${RECEIVE_PATH}): ${address}`);

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
    walletName: process.env.DIVINO_CORE_WALLET_NAME ?? "divino-watch-only-smoke",
  };
  console.log(`Nó: ${config.url} | wallet: ${config.walletName}\n`);

  console.log("--- Passo 1: ensureWatchOnlyWallet ---");
  const walletResult = await ensureWatchOnlyWallet(config);
  console.log(
    `OK. Wallet "${walletResult.walletName}" ${walletResult.alreadyExisted ? "já existia (carregada)" : "criada agora"}.`,
  );
  console.log("private_keys_enabled confirmado false pelo próprio nó (senão o passo acima teria lançado).\n");

  console.log("--- Passo 2: importWatchOnlyAddress ---");
  const rescanSince = Number(process.env.DIVINO_CORE_RESCAN_SINCE ?? Math.floor(Date.now() / 1000) - 30 * 86400);
  console.log(`Escaneando desde ${new Date(rescanSince * 1000).toISOString()} (pode demorar em Signet).`);
  await importWatchOnlyAddress(config, { address, birthday: rescanSince });
  console.log("OK. Endereço importado.\n");

  console.log("--- Passo 3: ler saldo e UTXOs pelo nó ---");
  const nodeBalance = await getWatchOnlyBalanceSummary(config);
  const nodeUtxos = await listWatchOnlyUtxos(config);
  console.log(
    `Nó — confirmado: ${nodeBalance.trustedSats} sat | pendente: ${nodeBalance.untrustedPendingSats} sat | UTXOs: ${nodeUtxos.length}`,
  );

  console.log("\n--- Passo 4: ler o mesmo endereço pelo Esplora público, para comparar ---");
  const esplora: EsploraConfig = { baseUrl: process.env.DIVINO_LAB_ESPLORA ?? "https://mempool.space/signet/api" };
  const esploraUtxos = await fetchAddressUtxos(esplora, address);
  const esploraConfirmedSats = sumUtxoValueSats(esploraUtxos.filter((u) => u.confirmed));
  const esploraUnconfirmedSats = sumUtxoValueSats(esploraUtxos.filter((u) => !u.confirmed));
  console.log(
    `Esplora — confirmado: ${esploraConfirmedSats} sat | pendente: ${esploraUnconfirmedSats} sat | UTXOs: ${esploraUtxos.length}`,
  );

  console.log("\n--- Veredito ---");
  const bateConfirmado = nodeBalance.trustedSats === esploraConfirmedSats;
  const bateUtxoCount = nodeUtxos.length === esploraUtxos.filter((u) => u.confirmed).length;

  if (bateConfirmado && bateUtxoCount) {
    console.log("Saldo confirmado e contagem de UTXOs BATEM entre nó e Esplora.");
    console.log(
      "Isto mostra que o RPC de leitura funciona contra o nó real para este caso. " +
        "NÃO prova sendrawtransaction, nem descriptor de conta (xpub com faixa), nem outro endereço.",
    );
  } else {
    console.log("Os valores NÃO batem. Isto é um achado, não um bug do script — investigar antes de confiar nesta fonte:");
    console.log(`  trustedSats (nó) = ${nodeBalance.trustedSats} vs confirmado (Esplora) = ${esploraConfirmedSats}`);
    console.log(`  UTXOs confirmados (nó) = ${nodeUtxos.length} vs (Esplora) = ${esploraUtxos.filter((u) => u.confirmed).length}`);
  }
  console.log();
}

main().catch((error) => {
  fail(error instanceof Error ? error.stack ?? error.message : String(error));
});
