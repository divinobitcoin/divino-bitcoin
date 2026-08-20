import { assertSignetOnly, type BitcoinDevelopmentNetwork } from "./bitcoin-network";

/** Chave exclusiva do estado demonstrativo; nunca é reutilizada por Signet. */
export const DEMO_WALLET_STORAGE_KEY = "divino-bitcoin.wallet.demo.v1";

/**
 * Somente metadados públicos ou não assinados poderão usar este namespace no
 * futuro. Seeds, chaves privadas, tokens, preimages e backups de canal não
 * possuem chaves neste módulo e continuam fora de escopo.
 */
export const SIGNET_PUBLIC_STORAGE_RECORDS = [
  "network-config",
  "sync-metadata",
  "unsigned-intent",
] as const;

export type SignetPublicStorageRecord = (typeof SIGNET_PUBLIC_STORAGE_RECORDS)[number];

const SIGNET_PUBLIC_STORAGE_PREFIX = "divino-bitcoin.signet.public";
const STORAGE_SCHEMA_VERSION = "v1";

/**
 * Produz uma chave para registros que não contêm segredo e obriga o chamador a
 * declarar Signet. A guarda impede reutilização acidental em Mainnet, Testnet
 * ou Regtest antes mesmo que exista uma camada de persistência Signet.
 */
export function createSignetPublicStorageKey(
  network: string,
  record: SignetPublicStorageRecord,
): string {
  assertSignetOnly(network);
  const signetNetwork: BitcoinDevelopmentNetwork = network;
  return `${SIGNET_PUBLIC_STORAGE_PREFIX}.${signetNetwork}.${record}.${STORAGE_SCHEMA_VERSION}`;
}
