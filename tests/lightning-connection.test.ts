import { describe, expect, it } from "vitest";

import { assertLiveLightningEnabled, createInitialLightningConnection, normalizeLightningConnection } from "../shared/lightning";

describe("estrutura de conexão Lightning", () => {
  it("inicia sem provedor e sem habilitar operações reais", () => {
    const connection = createInitialLightningConnection();
    expect(connection).toEqual({ provider: null, status: "not-configured", network: "signet" });
    expect(() => assertLiveLightningEnabled(connection)).toThrow("ainda não está ativada");
  });

  it("aceita apenas arquiteturas previstas e as mantém em planejamento", () => {
    expect(normalizeLightningConnection({ provider: "nwc", status: "planned" })).toEqual({ provider: "nwc", status: "planned", network: "signet" });
    expect(normalizeLightningConnection({ provider: "unknown", status: "planned" })).toEqual({ provider: null, status: "not-configured", network: "signet" });
  });
});
