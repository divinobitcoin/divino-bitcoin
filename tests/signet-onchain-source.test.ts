import { describe, expect, it } from "vitest";

import {
  assertLiveOnchainEnabled,
  createSignetOnchainSourcePlan,
  describeOwnNodeSource,
  isLiveOnchainEnabled,
  withAdditionalSource,
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

  it("permite adicionar a opção de nó próprio sem alterar primary/fallback", () => {
    const plan = createSignetOnchainSourcePlan("signet");
    const withOwnNode = withAdditionalSource(plan, describeOwnNodeSource());

    expect(withOwnNode.primary).toBe("electrum");
    expect(withOwnNode.fallback).toBe("esplora");
    expect(withOwnNode.sources).toHaveLength(3);
    expect(withOwnNode.sources[2]).toEqual({
      id: "bitcoin-core-rpc",
      label: "Nó Bitcoin Core próprio (RPC local, leitura via scantxoutset)",
      status: "not-configured",
      endpoint: null,
    });

    // Plano original não é mutado
    expect(plan.sources).toHaveLength(2);
  });

  it("nó próprio adicionado também mantém liveSyncEnabled bloqueado", () => {
    const plan = withAdditionalSource(createSignetOnchainSourcePlan("signet"), describeOwnNodeSource());

    expect(isLiveOnchainEnabled(plan)).toBe(false);
    expect(() => assertLiveOnchainEnabled(plan)).toThrow("fonte on-chain real ainda não está ativada");
  });
});
