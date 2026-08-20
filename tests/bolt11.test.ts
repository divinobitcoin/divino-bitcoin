import { validateBolt11Invoice } from "../lib/bolt11";
import { describe, expect, it } from "vitest";

const AMOUNT_INVOICE = "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh";

describe("validação de invoice BOLT11", () => {
  it("aceita uma invoice assinada, inclusive com URI lightning e letras maiúsculas", () => {
    const result = validateBolt11Invoice(`LIGHTNING:${AMOUNT_INVOICE.toUpperCase()}`);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.invoice.network).toBe("mainnet");
    expect(result.invoice.amountSats).toBe(250_000);
    expect(result.invoice.paymentHash).toBe("0001020304050607080900010203040506070809000102030405060708090102");
  });

  it("recusa uma invoice com checksum ou assinatura adulterados", () => {
    const corrupted = `${AMOUNT_INVOICE.slice(0, -1)}q`;
    const result = validateBolt11Invoice(corrupted);
    expect(result.valid).toBe(false);
  });

  it("recusa QR Codes que não representem uma invoice BOLT11", () => {
    const result = validateBolt11Invoice("lnurl1dp68gurn8ghj7mrww4exctnrdakj7m3wvdhk6tcpramhxue69uhhyetvv9ujuatda4j8g");
    expect(result.valid).toBe(false);
  });
});
