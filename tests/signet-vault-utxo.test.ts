import { hex } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { describe, expect, it } from "vitest";

import { deriveWatchAddressBook } from "../shared/signet-watch-addresses";
import {
  PUBLIC_SIGNET_ESPLORA,
  assertSignetEsploraUrl,
  broadcastVaultTransaction,
  buildVaultUnsignedPsbt,
  fetchVaultUtxos,
} from "../shared/signet-vault-utxo";
import type { TransactionReview } from "../shared/transaction-broadcast";

const SEED = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const VERSOES_TESTNET = { private: 0x04358394, public: 0x043587cf };
const conta = HDKey.fromMasterSeed(hex.decode(SEED), VERSOES_TESTNET).derive("m/84'/1'/0'");
const TPUB = conta.publicExtendedKey;
const FINGERPRINT = "aabbccdd";
const book = deriveWatchAddressBook({
  network: "signet",
  accountXpub: TPUB,
  masterFingerprint: FINGERPRINT,
  gap: 2,
});
const receive0 = book.receive[0]!;
const receiveDesc = `wpkh([${FINGERPRINT}/84h/1h/0h]${TPUB}/0/*)`;
const changeDesc = `wpkh([${FINGERPRINT}/84h/1h/0h]${TPUB}/1/*)`;

function jsonRpc(handlers: Record<string, (params: unknown[]) => unknown>) {
  return async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string; params?: unknown[] };
    const method = body.method ?? "";
    if (!(method in handlers)) {
      return new Response(JSON.stringify({ error: { code: -32601, message: method }, result: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ result: handlers[method]!(body.params ?? []), error: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

describe("assertSignetEsploraUrl", () => {
  it("aceita Signet e recusa Mainnet", () => {
    expect(assertSignetEsploraUrl(PUBLIC_SIGNET_ESPLORA)).toContain("signet");
    expect(() => assertSignetEsploraUrl("https://mempool.space/api")).toThrow(/Signet|Mainnet/);
  });
});

describe("fetchVaultUtxos", () => {
  it("lê UTXOs pelo RPC do nó quando ele responde", async () => {
    const fetchImpl = jsonRpc({
      createwallet: () => ({ name: "w" }),
      getwalletinfo: () => ({ private_keys_enabled: false, descriptors: true }),
      listdescriptors: () => ({ descriptors: [] }),
      getdescriptorinfo: () => ({ checksum: "checksum", hasprivatekeys: false }),
      importdescriptors: () => [{ success: true }, { success: true }],
      listunspent: () => [
        {
          txid: "ab".repeat(32),
          vout: 0,
          address: receive0.address,
          amount: 0.0001,
          confirmations: 3,
        },
      ],
    });

    const set = await fetchVaultUtxos({
      network: "signet",
      accountXpub: TPUB,
      masterFingerprint: FINGERPRINT,
      receiveDescriptor: receiveDesc,
      changeDescriptor: changeDesc,
      receiveAddress0: receive0.address,
      rpc: { url: "http://127.0.0.1:38332", username: "u", password: "p" },
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(set.source).toBe("bitcoin-core-rpc");
    expect(set.confirmedSats).toBe(10_000);
    expect(set.utxos[0]!.derivation.path).toBe("m/84'/1'/0'/0/0");
  });

  it("cai no Esplora Signet público quando o RPC falha", async () => {
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href.startsWith("http://127.0.0.1")) {
        return new Response("nope", { status: 500 });
      }
      if (href.includes("/address/") && href.endsWith("/utxo")) {
        if (href.includes(receive0.address)) {
          return new Response(
            JSON.stringify([
              {
                txid: "cd".repeat(32),
                vout: 1,
                value: 20_000,
                status: { confirmed: true, block_height: 100 },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return jsonRpc({})(href, init);
    };

    const set = await fetchVaultUtxos({
      network: "signet",
      accountXpub: TPUB,
      masterFingerprint: FINGERPRINT,
      receiveDescriptor: receiveDesc,
      changeDescriptor: changeDesc,
      receiveAddress0: receive0.address,
      rpc: { url: "http://127.0.0.1:38332", username: "u", password: "p" },
      esploraBaseUrl: PUBLIC_SIGNET_ESPLORA,
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(set.source).toBe("esplora-publico");
    expect(set.confirmedSats).toBe(20_000);
    expect(set.utxos[0]!.address).toBe(receive0.address);
  });
});

describe("buildVaultUnsignedPsbt", () => {
  it("monta PSBT Signet com origem BIP-84 conta 0 e recusa Mainnet", () => {
    const dest = book.receive[1]!.address;
    const built = buildVaultUnsignedPsbt({
      network: "signet",
      utxos: [
        {
          txid: "11".repeat(32),
          vout: 0,
          valueSats: 50_000,
          confirmed: true,
          blockHeight: 8,
          address: receive0.address,
          derivation: receive0.derivation,
        },
      ],
      recipientAddress: dest,
      targetSats: 10_000,
      feeRateSatsPerVByte: 2,
      book,
    });
    expect(built.hasInputDerivations).toBe(true);
    expect(built.psbtBase64.length).toBeGreaterThan(20);
    expect(() =>
      buildVaultUnsignedPsbt({
        network: "signet",
        utxos: [],
        recipientAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        targetSats: 1000,
        feeRateSatsPerVByte: 1,
        book,
      }),
    ).toThrow(/Mainnet|tb1q/);
  });
});

const RAW_REAL =
  "020000000001011518503dfe8e58bebb508ac3c95ce9bd399adc38b17e8c733ae059271d731d4b0100000000fdffffff028813000000000000160014306b0e91bfc57cebb994b28f831c5f25cadc20876f12000000000000160014b66d68a069e00cd3eeb88b3aa8cbc565af43032602483045022100e705ee3fc2e9b76ece347c3ce9e4ddd530dda610c61a893a1c78785154b29c6702203787d2e7a6551d7f5eada400fcf26b7e38b3de07efc762365ba4ff3dce35a1300121022be393012e9d3c3e7cbf0865f218f451504274fd187fe18a6cef8192385f1bdf00000000";
const TXID_REAL = "87174464d90500db2e87227dee5d123f5f5c4b14642dd8499d398819d0e7238c";
const revisao = { rawTxHex: RAW_REAL, txid: TXID_REAL, network: "signet" } as TransactionReview;

describe("broadcastVaultTransaction", () => {
  it("usa o RPC quando ele responde e cai no Esplora Signet se o RPC falhar", async () => {
    const rpcOk = jsonRpc({ sendrawtransaction: () => TXID_REAL });
    const viaRpc = await broadcastVaultTransaction({
      review: revisao,
      rpc: { url: "http://127.0.0.1:38332", username: "u", password: "p" },
      fetchImpl: rpcOk as typeof fetch,
    });
    expect(viaRpc.source).toBe("bitcoin-core-rpc");
    expect(viaRpc.txid).toBe(TXID_REAL);

    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      if (href.startsWith("http://127.0.0.1")) {
        return new Response("nope", { status: 500 });
      }
      if (href.endsWith("/tx") && init?.method === "POST") {
        return new Response(TXID_REAL, { status: 200 });
      }
      return new Response("nope", { status: 404 });
    };
    const viaEsplora = await broadcastVaultTransaction({
      review: revisao,
      rpc: { url: "http://127.0.0.1:38332", username: "u", password: "p" },
      esploraBaseUrl: PUBLIC_SIGNET_ESPLORA,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(viaEsplora.source).toBe("esplora-publico");
    expect(viaEsplora.txid).toBe(TXID_REAL);
  });

  it("recusa Esplora Mainnet", async () => {
    await expect(
      broadcastVaultTransaction({
        review: revisao,
        esploraBaseUrl: "https://mempool.space/api",
        fetchImpl: (async () => new Response(TXID_REAL)) as typeof fetch,
      }),
    ).rejects.toThrow(/Signet|Mainnet/);
  });
});
