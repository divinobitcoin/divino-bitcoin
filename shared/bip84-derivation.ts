import { HDKey } from "@scure/bip32";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { bech32 } from "bech32";

/**
 * Derivação BIP-84 (P2WPKH) real, mas estritamente funcional e sem estado:
 * recebe uma seed em hex, deriva um caminho e devolve chave pública + endereço.
 * Não lê nem escreve armazenamento, rede, clipboard ou log. Não aceita
 * mnemonic diretamente — quem chama decide como obter a seed (hoje, somente
 * vetores públicos de teste; nunca entrada de usuário nesta fase).
 *
 * Material privado é apagado da memória do @scure/bip32 assim que a chave
 * pública é extraída (best effort — ver ADR-0001 sobre limites de apagamento
 * de memória em runtimes gerenciados).
 */

export type Bip84AddressResult = {
  path: string;
  publicKeyHex: string;
  address: string;
};

/** HRP (human-readable part) bech32 por rede. Signet reaproveita o formato Testnet (BIP-325). */
const BECH32_HRP_BY_NETWORK = {
  mainnet: "bc",
  "signet-test-compatible": "tb",
} as const;

export type Bip84AddressNetwork = keyof typeof BECH32_HRP_BY_NETWORK;

function hash160(pubkey: Uint8Array): Uint8Array {
  return ripemd160(sha256(pubkey));
}

function encodeP2WPKH(hrp: string, pubkey: Uint8Array): string {
  const program = hash160(pubkey);
  const words = bech32.toWords(program);
  return bech32.encode(hrp, [0, ...words]);
}

/**
 * Deriva um endereço P2WPKH (BIP-84) a partir de uma seed em hex e um
 * caminho BIP-32 já formatado (ex: "m/84'/0'/0'/0/0"). Uso restrito a
 * vetores públicos de teste nesta fase — ver shared/public-bip-vectors.ts
 * e shared/signet-derivation-policy.ts para o contrato que impede uso com
 * seed de usuário real antes dos gates da ADR-0001 serem satisfeitos.
 */
export function deriveBip84Address(
  seedHex: string,
  path: string,
  network: Bip84AddressNetwork,
): Bip84AddressResult {
  const seed = Uint8Array.from(Buffer.from(seedHex, "hex"));
  const root = HDKey.fromMasterSeed(seed);

  try {
    const child = root.derive(path);

    try {
      if (!child.publicKey) {
        throw new Error("Derivação não produziu chave pública.");
      }

      const address = encodeP2WPKH(BECH32_HRP_BY_NETWORK[network], child.publicKey);

      return {
        path,
        publicKeyHex: Buffer.from(child.publicKey).toString("hex"),
        address,
      };
    } finally {
      child.wipePrivateData();
    }
  } finally {
    root.wipePrivateData();
  }
}
