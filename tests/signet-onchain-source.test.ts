import { describe, expect, it } from "vitest";

import {
  assertLiveOnchainEnabled,
  createSignetOnchainSourcePlan,
  isLiveOnchainEnabled,
} from "../shared/signet-onchain-source";

describe("contrato de fontes on-chain Signet", () => {
  it("configura a estratégia combinada sem endpoint ou operação de rede", () => {
    const plan = createSignetOnchainSourcePlan("signet");

    expect(plan).toEqual({
      network: "signet",
      strategy: "combined-configurable",
      primary: "electrum",
      fallback: "esplora",
      sources: [
        {
          id: "electrum",
          label: "Servidor Electrum configurável",
          status: "not-configured",
          endpoint: null,
        },
        {
          id: "esplora",
          label: "API Esplora configurável",
          status: "not-configured",
          endpoint: null,
        },
      ],
      liveSyncEnabled: false,
      broadcastEnabled: false,
      credentialsSupported: false,
    });
  });

  it("permite inverter a prioridade somente como plano local", () => {
    const plan = createSignetOnchainSourcePlan("signet", "esplora");

    expect(plan.primary).toBe("esplora");
    expect(plan.fallback).toBe("electrum");
    expect(plan.sources.every((source) => source.endpoint === null)).toBe(true);
  });

  it("mantém redes não Signet e operações vivas bloqueadas", () => {
    expect(() => createSignetOnchainSourcePlan("mainnet")).toThrow("apenas Bitcoin Signet");

    const plan = createSignetOnchainSourcePlan("signet");
    expect(isLiveOnchainEnabled(plan)).toBe(false);
    expect(() => assertLiveOnchainEnabled(plan)).toThrow("fonte on-chain real ainda não está ativada");
  });
});
