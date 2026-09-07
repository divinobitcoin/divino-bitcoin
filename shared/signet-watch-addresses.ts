import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

import { assertSignetOnly } from "./bitcoin-network";
import type { Bip32DerivationInfo } from "./psbt-builder";

/**
 * Endereços de observação a partir do tpub da conta. Derivação **pública**
 * (filhos do xpub neutro). Sem seed, sem chave privada, sem módulos LAB.
 */

export const SIGNET_WATCH_GAP = 20;

/** Bytes de versão BIP-32 da família testnet/Signet (tpub/tprv). */
const VERSOES_SIGNET = { private: 0x04358394, public: 0x043587cf };

export type WatchAddress = {
  address: string;
  publicKeyHex: string;
  path: string;
  change: 0 | 1;
  index: number;
  derivation: Bip32DerivationInfo;
};

export type WatchAddressBook = {
  receive: WatchAddress[];
  change: WatchAddress[];
  byAddress: Map<string, WatchAddress>;
};

function assertSignetTpub(raw: string): string {
  const tpub = raw.trim();
  if (tpub === "") {
    throw new Error("tpub da conta ausente.");
  }
  const prefix = tpub.slice(0, 4).toLowerCase();
  if (prefix === "xpub" || prefix === "ypub" || prefix === "zpub") {
    throw new Error("Chave estendida Mainnet recusada. Este cofre observa só Signet (tpub).");
  }
  if (prefix === "tprv" || prefix === "xprv" || prefix === "yprv" || prefix === "zprv") {
    throw new Error("Chave privada recusada. Só tpub entra neste caminho.");
  }
  if (prefix !== "tpub") {
    throw new Error("Só tpub Signet. Outro prefixo recusado.");
  }
  return tpub;
}

function encodeP2wpkh(publicKey: Uint8Array): string {
  const payment = btc.p2wpkh(publicKey, btc.TEST_NETWORK);
  const address = payment.address;
  if (!address || !address.startsWith("tb1q")) {
    throw new Error("A derivação pública não produziu um endereço tb1q Signet.");
  }
  return address;
}

function watchAt(
  account: HDKey,
  masterFingerprint: string,
  change: 0 | 1,
  index: number,
): WatchAddress {
  const child = account.deriveChild(change).deriveChild(index);
  if (!child.publicKey) {
    throw new Error("A derivação pública não devolveu chave.");
  }
  const address = encodeP2wpkh(child.publicKey);
  const publicKeyHex = hex.encode(child.publicKey);
  const path = `m/84'/1'/0'/${change}/${index}`;
  return {
    address,
    publicKeyHex,
    path,
    change,
    index,
    derivation: {
      publicKeyHex,
      masterFingerprint,
      path,
    },
  };
}

export function deriveWatchAddressBook(params: {
  network: string;
  accountXpub: string;
  masterFingerprint: string;
  gap?: number;
  receiveAddress0?: string;
}): WatchAddressBook {
  assertSignetOnly(params.network);
  if (!/^[0-9a-f]{8}$/i.test(params.masterFingerprint)) {
    throw new Error("Fingerprint inválida.");
  }
  const tpub = assertSignetTpub(params.accountXpub);
  const gap = params.gap ?? SIGNET_WATCH_GAP;
  if (!Number.isInteger(gap) || gap < 1 || gap > 100) {
    throw new Error("Faixa de observação inválida.");
  }

  let account: HDKey;
  try {
    account = HDKey.fromExtendedKey(tpub, VERSOES_SIGNET);
  } catch (cause) {
    throw new Error("tpub ilegível.", { cause });
  }

  const fingerprint = params.masterFingerprint.toLowerCase();
  const receive: WatchAddress[] = [];
  const change: WatchAddress[] = [];
  for (let index = 0; index < gap; index += 1) {
    receive.push(watchAt(account, fingerprint, 0, index));
    change.push(watchAt(account, fingerprint, 1, index));
  }

  if (params.receiveAddress0 && receive[0]!.address !== params.receiveAddress0) {
    throw new Error("O tpub não confere com o endereço 0 do cofre. Recusando.");
  }

  const byAddress = new Map<string, WatchAddress>();
  for (const entry of [...receive, ...change]) {
    byAddress.set(entry.address, entry);
  }

  return { receive, change, byAddress };
}

export function nextUnusedChange(book: WatchAddressBook, usedAddresses: Iterable<string>): WatchAddress {
  const used = new Set(usedAddresses);
  return book.change.find((entry) => !used.has(entry.address)) ?? book.change[0]!;
}

export function assertTb1qSignetAddress(raw: string): string {
  const address = raw.trim();
  if (address.startsWith("bc1")) {
    throw new Error("Endereço Mainnet recusado. Só tb1q Signet.");
  }
  if (!address.startsWith("tb1q")) {
    throw new Error("Só endereços tb1q P2WPKH Signet.");
  }
  try {
    const decoded = btc.Address(btc.TEST_NETWORK).decode(address);
    if (decoded.type !== "wpkh") {
      throw new Error("Só P2WPKH (tb1q) Signet.");
    }
  } catch (cause) {
    if (cause instanceof Error && /Mainnet|tb1q|P2WPKH/.test(cause.message)) {
      throw cause;
    }
    throw new Error("Endereço Signet inválido.", { cause });
  }
  return address;
}
