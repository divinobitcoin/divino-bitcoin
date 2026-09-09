import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hex } from "@scure/base";
import { bech32 } from "bech32";
import { describe, expect, it } from "vitest";

import {
  lerFaturaLightningSignet,
  truncarPaymentHash,
  validateBolt11Invoice,
} from "../lib/bolt11";

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const PRIV = hex.decode("e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734");
const PAYMENT_HASH = hex.decode("0001020304050607080900010203040506070809000102030405060708090102");
const MAINNET = "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh";

function toWords(bytes: Uint8Array, pad: boolean): number[] {
  let accumulator = 0;
  let bits = 0;
  const words: number[] = [];
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words.push((accumulator >>> bits) & 31);
    }
  }
  if (pad && bits > 0) words.push((accumulator << (5 - bits)) & 31);
  return words;
}

function toBytes(words: readonly number[], pad: boolean): Uint8Array {
  let accumulator = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const word of words) {
    accumulator = (accumulator << 5) | word;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >>> bits) & 0xff);
    }
  }
  if (pad && bits > 0) bytes.push((accumulator << (8 - bits)) & 0xff);
  return Uint8Array.from(bytes);
}

function uintToWords(value: number, count: number): number[] {
  const words = new Array<number>(count).fill(0);
  let rest = value;
  for (let i = count - 1; i >= 0; i -= 1) {
    words[i] = rest & 31;
    rest = Math.floor(rest / 32);
  }
  return words;
}

function tagged(tag: string, dataWords: number[]): number[] {
  const index = CHARSET.indexOf(tag);
  const length = dataWords.length;
  return [index, (length >> 5) & 31, length & 31, ...dataWords];
}

function encodeBolt11(hrp: string, timestamp: number, expirySeconds: number): string {
  const payload = [
    ...uintToWords(timestamp, 7),
    ...tagged("p", toWords(PAYMENT_HASH, true)),
    ...tagged("x", uintToWords(expirySeconds, 3)),
  ];
  const message = new Uint8Array([...new TextEncoder().encode(hrp), ...toBytes(payload, true)]);
  const digest = sha256(message);
  const recovered = secp256k1.sign(digest, PRIV, { prehash: false, format: "recovered" });
  const compact = recovered[0]! <= 3 ? recovered.slice(1) : recovered.slice(0, 64);
  const recovery = recovered[0]! <= 3 ? recovered[0]! : recovered[64]!;
  const signature = new Uint8Array(65);
  signature.set(compact, 0);
  signature[64] = recovery;
  const words = [...payload, ...toWords(signature, false)];
  return bech32.encode(hrp, words, 1023);
}

const TIMESTAMP = 1_496_314_658;
const LNTBS = encodeBolt11("lntbs2500u", TIMESTAMP, 3600);
const LNTB = encodeBolt11("lntb2500u", TIMESTAMP, 3600);

describe("lerFaturaLightningSignet", () => {
  it("aceita lntbs Signet, com ou sem prefixo lightning:", () => {
    const direta = lerFaturaLightningSignet(LNTBS);
    expect(direta.valid).toBe(true);
    if (!direta.valid) return;
    expect(direta.invoice.network).toBe("signet");
    expect(direta.invoice.amountSats).toBe(250_000);
    expect(direta.invoice.paymentHash).toBe(hex.encode(PAYMENT_HASH));
    expect(direta.invoice.expirySeconds).toBe(3600);

    const comUri = lerFaturaLightningSignet(`lightning:${LNTBS.toUpperCase()}`);
    expect(comUri.valid).toBe(true);
    if (!comUri.valid) return;
    expect(comUri.invoice.network).toBe("signet");
  });

  it("recusa lnbc Mainnet", () => {
    expect(validateBolt11Invoice(MAINNET).valid).toBe(true);
    const result = lerFaturaLightningSignet(MAINNET);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/lnbc|Mainnet/);
  });

  it("recusa lntb testnet3", () => {
    expect(validateBolt11Invoice(LNTB).valid).toBe(true);
    const result = lerFaturaLightningSignet(LNTB);
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/lntb|testnet/);
  });

  it("recusa checksum lixo", () => {
    const i = 24;
    const lixo = `${LNTBS.slice(0, i)}${LNTBS[i] === "a" ? "c" : "a"}${LNTBS.slice(i + 1)}`;
    expect(lixo).not.toBe(LNTBS);
    const result = lerFaturaLightningSignet(lixo);
    expect(result.valid).toBe(false);
  });
});

describe("truncarPaymentHash", () => {
  it("mostra começo e fim", () => {
    expect(truncarPaymentHash(hex.encode(PAYMENT_HASH))).toBe("00010203…08090102");
  });
});
