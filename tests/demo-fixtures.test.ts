import { describe, expect, it } from "vitest";

import { DEMO_PAYMENT_FIXTURE, isDemoLightningReference } from "../shared/demo-fixtures";

describe("fixtures da demonstração", () => {
  it("mantém uma referência, valor e memo determinísticos", () => {
    expect(DEMO_PAYMENT_FIXTURE).toEqual({
      reference: "lnbc-demo-p2-fixture",
      amountSats: 1_000,
      memo: "Pagamento local de teste",
    });
  });

  it("reconhece somente referências locais lnbc-demo", () => {
    expect(isDemoLightningReference(" lnbc-demo-p2-fixture ")).toBe(true);
    expect(isDemoLightningReference("LNBC-DEMO-OUTRO-TESTE")).toBe(true);
    expect(isDemoLightningReference("lnbc1realinvoice")).toBe(false);
    expect(isDemoLightningReference("bitcoin:demo")).toBe(false);
  });
});
