import { base64, hex } from "@scure/base";
import * as btc from "@scure/btc-signer";

import { assertSignetOnly } from "./bitcoin-network";
import { assertTb1qSignetAddress, type WatchAddressBook } from "./signet-watch-addresses";
import { sumPsbtInputAmounts } from "./transaction-broadcast";

const HARDENED = 0x80000000;
const BIP84_SIGNET_ACCOUNT0 = [HARDENED + 84, HARDENED + 1, HARDENED + 0];

function fingerprintHex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function enderecoDoScript(script: Uint8Array | undefined): string {
  if (!script || script.length === 0) return "";
  try {
    return btc.Address(btc.TEST_NETWORK).encode(btc.OutScript.decode(script));
  } catch {
    try {
      const mainnet = btc.Address(btc.NETWORK).encode(btc.OutScript.decode(script));
      if (mainnet.startsWith("bc1")) {
        throw new Error("PSBT com endereço Mainnet. Recusada.");
      }
    } catch (cause) {
      if (cause instanceof Error && /Mainnet/.test(cause.message)) throw cause;
    }
    return "";
  }
}

/**
 * Confere que a PSBT (assinada ou não) pertence a ESTE descritor Signet:
 * mesma fingerprint, caminho BIP-84 conta 0, UTXOs desta faixa. Recusa
 * outra rede ou outra carteira.
 */
export function assertPsbtMatchesWatchOnly(params: {
  psbtBase64: string;
  network: string;
  masterFingerprint: string;
  book: WatchAddressBook;
}): { totalInputSats: number } {
  assertSignetOnly(params.network);
  const fingerprint = params.masterFingerprint.trim().toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(fingerprint)) {
    throw new Error("Fingerprint inválida.");
  }

  let tx: btc.Transaction;
  try {
    tx = btc.Transaction.fromPSBT(base64.decode(params.psbtBase64.trim()));
  } catch (cause) {
    throw new Error("PSBT ilegível.", { cause });
  }

  if (tx.inputsLength === 0) {
    throw new Error("PSBT sem entradas.");
  }

  for (let i = 0; i < tx.inputsLength; i += 1) {
    const input = tx.getInput(i);
    const script = input.witnessUtxo?.script;
    const address = enderecoDoScript(script);
    if (address.startsWith("bc1")) {
      throw new Error("PSBT com endereço Mainnet. Recusada.");
    }
    if (!address || !params.book.byAddress.has(address)) {
      throw new Error(
        `A entrada ${i} da PSBT não pertence a este descritor Signet. Recusando.`,
      );
    }

    const derivacoes = input.bip32Derivation ?? [];
    for (const [chave, info] of derivacoes) {
      const fp = fingerprintHex(info.fingerprint);
      if (fp !== fingerprint) {
        throw new Error("Fingerprint da PSBT não é a deste descritor. Recusando.");
      }
      const path = info.path;
      if (
        path.length !== 5 ||
        path[0] !== BIP84_SIGNET_ACCOUNT0[0] ||
        path[1] !== BIP84_SIGNET_ACCOUNT0[1] ||
        path[2] !== BIP84_SIGNET_ACCOUNT0[2] ||
        (path[3] !== 0 && path[3] !== 1)
      ) {
        throw new Error("A PSBT aponta para outro caminho BIP-32. Só m/84'/1'/0'/{0|1}/*. Recusando.");
      }
      const esperado = params.book.byAddress.get(address);
      if (esperado && hex.encode(chave) !== esperado.publicKeyHex) {
        throw new Error("A chave pública da PSBT não confere com este descritor. Recusando.");
      }
    }
  }

  for (let i = 0; i < tx.outputsLength; i += 1) {
    const output = tx.getOutput(i);
    const address = enderecoDoScript(output.script);
    if (address.startsWith("bc1")) {
      throw new Error("PSBT com saída Mainnet. Recusada.");
    }
    if (address.startsWith("tb1q")) {
      assertTb1qSignetAddress(address);
    }
  }

  return { totalInputSats: sumPsbtInputAmounts(params.psbtBase64.trim()) };
}
