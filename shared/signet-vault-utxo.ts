import { nomeDeWalletParaXpub } from "./account-xpub";
import { assertSignetOnly } from "./bitcoin-network";
import type { BitcoinCoreRpcConfig } from "./bitcoin-core-rpc-client";
import {
  ensureWatchOnlyWallet,
  importWatchOnlyDescriptors,
  listWatchOnlyUtxos,
  type BitcoinCoreWalletConfig,
} from "./bitcoin-core-wallet-client";
import type { EsploraUtxo } from "./esplora-client";
import { fetchAddressUtxos, sumUtxoValueSats } from "./esplora-client";
import {
  broadcastRawTransactionViaCoreRpc,
} from "./bitcoin-core-wallet-client";
import type { Bip32DerivationInfo } from "./psbt-builder";
import { buildPsbtFromSelection, type BuiltPsbt } from "./psbt-builder";
import { selectCoins } from "./coin-selection";
import {
  broadcastRawTransaction,
  type TransactionReview,
} from "./transaction-broadcast";
import {
  SIGNET_WATCH_GAP,
  assertTb1qSignetAddress,
  deriveWatchAddressBook,
  nextUnusedChange,
  type WatchAddress,
  type WatchAddressBook,
} from "./signet-watch-addresses";

export const PUBLIC_SIGNET_ESPLORA = "https://mempool.space/signet/api";
export const PUBLIC_SIGNET_ESPLORA_FALLBACK = "https://blockstream.info/signet/api";

export type VaultOnchainSource = "bitcoin-core-rpc" | "esplora-publico";

export type VaultUtxo = EsploraUtxo & {
  address: string;
  derivation: Bip32DerivationInfo;
};

export type VaultUtxoSet = {
  utxos: VaultUtxo[];
  source: VaultOnchainSource;
  confirmedSats: number;
  pendingSats: number;
  book: WatchAddressBook;
};

export type VaultRpcConfig = BitcoinCoreRpcConfig;

type FetchLike = typeof fetch;

export function assertSignetEsploraUrl(url: string): string {
  const base = url.trim().replace(/\/+$/, "");
  if (!/signet/i.test(base)) {
    throw new Error("Só Esplora/Electrum Signet. Mainnet recusado.");
  }
  return base;
}

function toVaultUtxo(utxo: EsploraUtxo, watch: WatchAddress): VaultUtxo {
  return {
    ...utxo,
    address: watch.address,
    derivation: watch.derivation,
  };
}

async function fetchViaRpc(
  book: WatchAddressBook,
  params: {
    rpc: VaultRpcConfig;
    accountXpub: string;
    receiveDescriptor: string;
    changeDescriptor: string;
    fetchImpl: FetchLike;
  },
): Promise<VaultUtxo[]> {
  const config: BitcoinCoreWalletConfig = {
    ...params.rpc,
    walletName: nomeDeWalletParaXpub(params.accountXpub),
  };
  await ensureWatchOnlyWallet(config, params.fetchImpl);
  await importWatchOnlyDescriptors(
    config,
    {
      receive: params.receiveDescriptor,
      change: params.changeDescriptor,
      birthday: "now",
      rangeEnd: SIGNET_WATCH_GAP - 1,
    },
    params.fetchImpl,
  );
  const listed = await listWatchOnlyUtxos(config, { minConfirmations: 0 }, params.fetchImpl);
  return listed.map((entry) => {
    const watch = book.byAddress.get(entry.address);
    if (!watch) {
      throw new Error(
        `O nó devolveu um UTXO no endereço ${entry.address}, fora da faixa BIP-84 conta 0 observada. Recusando.`,
      );
    }
    return toVaultUtxo(
      {
        txid: entry.txid,
        vout: entry.vout,
        valueSats: entry.valueSats,
        confirmed: entry.confirmed,
        blockHeight: entry.blockHeight,
      },
      watch,
    );
  });
}

async function fetchViaEsplora(
  book: WatchAddressBook,
  esploraBaseUrl: string,
  fetchImpl: FetchLike,
): Promise<VaultUtxo[]> {
  const base = assertSignetEsploraUrl(esploraBaseUrl);
  const collected: VaultUtxo[] = [];
  for (const watch of [...book.receive, ...book.change]) {
    const found = await fetchAddressUtxos({ baseUrl: base }, watch.address, fetchImpl);
    for (const utxo of found) {
      collected.push(toVaultUtxo(utxo, watch));
    }
  }
  return collected;
}

export async function fetchVaultUtxos(params: {
  network: string;
  accountXpub: string;
  masterFingerprint: string;
  receiveDescriptor: string;
  changeDescriptor: string;
  receiveAddress0: string;
  rpc?: VaultRpcConfig | null;
  esploraBaseUrl?: string;
  fetchImpl?: FetchLike;
}): Promise<VaultUtxoSet> {
  assertSignetOnly(params.network);
  const fetchImpl = params.fetchImpl ?? fetch;
  const book = deriveWatchAddressBook({
    network: params.network,
    accountXpub: params.accountXpub,
    masterFingerprint: params.masterFingerprint,
    receiveAddress0: params.receiveAddress0,
  });

  const rpc = params.rpc;
  const hasRpc =
    rpc != null && rpc.url.trim() !== "" && rpc.username.trim() !== "" && rpc.password !== "";

  let utxos: VaultUtxo[] | null = null;
  let source: VaultOnchainSource = "esplora-publico";
  let rpcError: Error | null = null;

  if (hasRpc) {
    try {
      utxos = await fetchViaRpc(book, {
        rpc,
        accountXpub: params.accountXpub,
        receiveDescriptor: params.receiveDescriptor,
        changeDescriptor: params.changeDescriptor,
        fetchImpl,
      });
      source = "bitcoin-core-rpc";
    } catch (failure) {
      rpcError = failure instanceof Error ? failure : new Error(String(failure));
    }
  }

  if (utxos == null) {
    const primary = params.esploraBaseUrl ?? PUBLIC_SIGNET_ESPLORA;
    try {
      utxos = await fetchViaEsplora(book, primary, fetchImpl);
    } catch (first) {
      if (primary === PUBLIC_SIGNET_ESPLORA_FALLBACK) {
        throw first;
      }
      try {
        utxos = await fetchViaEsplora(book, PUBLIC_SIGNET_ESPLORA_FALLBACK, fetchImpl);
      } catch {
        const esploraMsg = first instanceof Error ? first.message : String(first);
        throw new Error(
          rpcError
            ? `O RPC do nó falhou (${rpcError.message}). O Esplora/Electrum Signet público também falhou (${esploraMsg}).`
            : `O Esplora/Electrum Signet público falhou (${esploraMsg}).`,
        );
      }
    }
    source = "esplora-publico";
  }

  const confirmed = utxos.filter((utxo) => utxo.confirmed);
  const pending = utxos.filter((utxo) => !utxo.confirmed);
  return {
    utxos,
    source,
    confirmedSats: sumUtxoValueSats(confirmed),
    pendingSats: sumUtxoValueSats(pending),
    book,
  };
}

export function buildVaultUnsignedPsbt(params: {
  network: string;
  utxos: readonly VaultUtxo[];
  recipientAddress: string;
  targetSats: number;
  feeRateSatsPerVByte: number;
  book: WatchAddressBook;
}): BuiltPsbt {
  assertSignetOnly(params.network);
  const recipient = assertTb1qSignetAddress(params.recipientAddress);
  const outcome = selectCoins({
    utxos: params.utxos,
    recipientAddress: recipient,
    targetSats: params.targetSats,
    feeRateSatsPerVByte: params.feeRateSatsPerVByte,
    network: "signet",
  });
  if (!outcome.ok) {
    throw new Error(outcome.message);
  }

  const change = nextUnusedChange(
    params.book,
    params.utxos.map((utxo) => utxo.address),
  );

  return buildPsbtFromSelection({
    selection: outcome.selection,
    recipientAddress: recipient,
    changeAddress: change.address,
    network: "signet",
    ownerAddressFor: (utxo) => {
      const owned = params.utxos.find((entry) => entry.txid === utxo.txid && entry.vout === utxo.vout);
      if (!owned) {
        throw new Error("UTXO selecionado sem endereço conhecido.");
      }
      return owned.address;
    },
    derivationFor: (utxo) => {
      const owned = params.utxos.find((entry) => entry.txid === utxo.txid && entry.vout === utxo.vout);
      if (!owned) {
        throw new Error("UTXO selecionado sem origem BIP-32.");
      }
      return owned.derivation;
    },
    changeDerivation: change.derivation,
  });
}

function hasRpcCredentials(rpc?: VaultRpcConfig | null): rpc is VaultRpcConfig {
  return rpc != null && rpc.url.trim() !== "" && rpc.username.trim() !== "" && rpc.password !== "";
}

/**
 * Transmite a transação revisada: bitcoind Signet se houver RPC; se faltar
 * ou cair, Esplora Signet público. Recusa URL sem "signet".
 */
export async function broadcastVaultTransaction(params: {
  review: TransactionReview;
  rpc?: VaultRpcConfig | null;
  esploraBaseUrl?: string;
  fetchImpl?: FetchLike;
}): Promise<{ txid: string; source: VaultOnchainSource }> {
  const fetchImpl = params.fetchImpl ?? fetch;
  let rpcError: Error | null = null;

  if (hasRpcCredentials(params.rpc)) {
    try {
      const result = await broadcastRawTransactionViaCoreRpc({
        config: params.rpc,
        review: params.review,
        fetchImpl,
      });
      return { txid: result.txid, source: "bitcoin-core-rpc" };
    } catch (failure) {
      rpcError = failure instanceof Error ? failure : new Error(String(failure));
    }
  }

  const esplora = assertSignetEsploraUrl(params.esploraBaseUrl ?? PUBLIC_SIGNET_ESPLORA);
  try {
    const result = await broadcastRawTransaction({
      config: { baseUrl: esplora },
      review: params.review,
      fetchImpl,
    });
    return { txid: result.txid, source: "esplora-publico" };
  } catch (failure) {
    const esploraMsg = failure instanceof Error ? failure.message : String(failure);
    throw new Error(
      rpcError
        ? `O RPC do nó falhou (${rpcError.message}). O Esplora Signet público também falhou (${esploraMsg}).`
        : `Informe o RPC Signet do bitcoind ou use Esplora Signet. Falha: ${esploraMsg}.`,
    );
  }
}
