import { bech32 } from "bech32";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";

const SIGNATURE_WORD_COUNT = 104;
const TIMESTAMP_WORD_COUNT = 7;
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const NETWORKS = {
  bc: "mainnet",
  tb: "testnet",
  tbs: "signet",
  bcrt: "regtest",
} as const;

export type Bolt11Network = (typeof NETWORKS)[keyof typeof NETWORKS];

export interface Bolt11Invoice {
  amountMsats?: number;
  amountSats?: number;
  createdAt: Date;
  invoice: string;
  network: Bolt11Network;
  paymentHash: string;
}

export type Bolt11Validation =
  | { valid: true; invoice: Bolt11Invoice }
  | { valid: false; error: string };

function toBytes(words: readonly number[], pad: boolean): Uint8Array {
  let accumulator = 0;
  let bits = 0;
  const bytes: number[] = [];

  for (const word of words) {
    if (word < 0 || word > 31) throw new Error("Dados Bech32 inválidos.");
    accumulator = (accumulator << 5) | word;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >>> bits) & 0xff);
    }
  }

  if (pad && bits > 0) bytes.push((accumulator << (8 - bits)) & 0xff);
  if (!pad && (bits >= 5 || ((accumulator << (8 - bits)) & 0xff) !== 0)) {
    throw new Error("Conversão de dados Bech32 inválida.");
  }
  return Uint8Array.from(bytes);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeInvoice(raw: string): string {
  const trimmed = raw.trim();
  const withoutScheme = /^lightning:/i.test(trimmed) ? trimmed.slice("lightning:".length) : trimmed;
  return withoutScheme.replace(/\s/g, "").toLowerCase();
}

function parseAmount(rawAmount: string | undefined): { amountMsats?: number; amountSats?: number } {
  if (!rawAmount) return {};
  const matched = rawAmount.match(/^(\d+)([munp]?)$/);
  if (!matched) throw new Error("O valor declarado na invoice é inválido.");

  const [, digits, multiplier] = matched;
  const amount = BigInt(digits);
  const msatMultipliers: Record<string, bigint> = {
    "": 100_000_000_000n,
    m: 100_000_000n,
    u: 100_000n,
    n: 100n,
  };

  let amountMsats: bigint;
  if (multiplier === "p") {
    if (amount % 10n !== 0n) throw new Error("O valor da invoice não pode ser representado em millisats.");
    amountMsats = amount / 10n;
  } else {
    amountMsats = amount * msatMultipliers[multiplier];
  }

  if (amountMsats > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("O valor da invoice excede o limite suportado.");
  const numericMsats = Number(amountMsats);
  return {
    amountMsats: numericMsats,
    ...(numericMsats % 1000 === 0 ? { amountSats: numericMsats / 1000 } : {}),
  };
}

function parseHrp(hrp: string): { network: Bolt11Network; amount: { amountMsats?: number; amountSats?: number } } {
  const matched = hrp.match(/^ln(bcrt|tbs|bc|tb)(\d+(?:[munp])?)?$/);
  if (!matched) throw new Error("A invoice não pertence a uma rede Lightning reconhecida.");
  const [, networkPrefix, rawAmount] = matched;
  return { network: NETWORKS[networkPrefix as keyof typeof NETWORKS], amount: parseAmount(rawAmount) };
}

function parsePaymentHash(payloadWords: readonly number[]): string {
  let offset = TIMESTAMP_WORD_COUNT;
  while (offset < payloadWords.length) {
    if (offset + 3 > payloadWords.length) throw new Error("Os campos da invoice estão incompletos.");
    const tag = CHARSET[payloadWords[offset]];
    const length = payloadWords[offset + 1] * 32 + payloadWords[offset + 2];
    const start = offset + 3;
    const end = start + length;
    if (end > payloadWords.length) throw new Error("Os campos da invoice possuem tamanho inválido.");

    if (tag === "p") {
      const paymentHash = toBytes(payloadWords.slice(start, end), false);
      if (paymentHash.length !== 32) throw new Error("O payment hash da invoice é inválido.");
      return toHex(paymentHash);
    }
    offset = end;
  }
  throw new Error("A invoice não contém payment hash.");
}

function verifySignature(hrp: string, payloadWords: readonly number[], signatureWords: readonly number[]): void {
  const signature = toBytes(signatureWords, false);
  if (signature.length !== 65) throw new Error("A assinatura da invoice é inválida.");
  const recoveryId = signature[64];
  if (recoveryId > 3) throw new Error("O identificador de recuperação da invoice é inválido.");

  const message = new Uint8Array([...new TextEncoder().encode(hrp), ...toBytes(payloadWords, true)]);
  const digest = sha256(message);
  const compactSignature = signature.slice(0, 64);
  const recoveredPublicKey = secp256k1.Signature.fromBytes(compactSignature)
    .addRecoveryBit(recoveryId)
    .recoverPublicKey(digest)
    .toBytes(true);

  if (!secp256k1.verify(compactSignature, digest, recoveredPublicKey, { prehash: false })) {
    throw new Error("A assinatura da invoice não pôde ser verificada.");
  }
}

export function validateBolt11Invoice(rawInvoice: string): Bolt11Validation {
  const normalized = normalizeInvoice(rawInvoice);
  if (!normalized) return { valid: false, error: "Cole ou leia uma invoice Lightning." };

  try {
    const decoded = bech32.decode(normalized, 5000);
    const { network, amount } = parseHrp(decoded.prefix);
    if (decoded.words.length <= TIMESTAMP_WORD_COUNT + SIGNATURE_WORD_COUNT) {
      throw new Error("A invoice está incompleta.");
    }

    const payloadWords = decoded.words.slice(0, -SIGNATURE_WORD_COUNT);
    const signatureWords = decoded.words.slice(-SIGNATURE_WORD_COUNT);
    const timestamp = payloadWords
      .slice(0, TIMESTAMP_WORD_COUNT)
      .reduce((value, word) => value * 32 + word, 0);
    const paymentHash = parsePaymentHash(payloadWords);
    verifySignature(decoded.prefix, payloadWords, signatureWords);

    return {
      valid: true,
      invoice: {
        ...amount,
        createdAt: new Date(timestamp * 1000),
        invoice: normalized,
        network,
        paymentHash,
      },
    };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Não foi possível validar a invoice BOLT11." };
  }
}
