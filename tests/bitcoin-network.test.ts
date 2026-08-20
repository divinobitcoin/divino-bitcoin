import { ACTIVE_DEVELOPMENT_NETWORK, SIGNET_NETWORK, assertSignetOnly } from "../shared/bitcoin-network";
import { describe, expect, it } from "vitest";

describe("perfil de desenvolvimento Bitcoin", () => {
  it("fixa Signet como a única rede ativa de desenvolvimento", () => {
    expect(ACTIVE_DEVELOPMENT_NETWORK).toBe("signet");
    expect(SIGNET_NETWORK.isProduction).toBe(false);
    expect(SIGNET_NETWORK.lightningInvoicePrefix).toBe("lntbs");
  });

  it("bloqueia Mainnet e outras redes no perfil atual", () => {
    expect(() => assertSignetOnly("signet")).not.toThrow();
    expect(() => assertSignetOnly("mainnet")).toThrow("apenas Bitcoin Signet");
    expect(() => assertSignetOnly("testnet")).toThrow("apenas Bitcoin Signet");
  });
});
