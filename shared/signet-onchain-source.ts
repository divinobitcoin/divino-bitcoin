import {
  ACTIVE_DEVELOPMENT_NETWORK,
  assertSignetOnly,
  type BitcoinDevelopmentNetwork,
} from "./bitcoin-network";

export type OnchainSourceKind = "electrum" | "esplora" | "bitcoin-core-rpc";
export type OnchainSourceStatus = "not-configured" | "planned";

export type SignetOnchainSource = {
  id: OnchainSourceKind;
  label: string;
  status: OnchainSourceStatus;
  endpoint: null;
};

export type SignetOnchainSourcePlan = {
  network: BitcoinDevelopmentNetwork;
  strategy: "combined-configurable";
  primary: OnchainSourceKind;
  fallback: OnchainSourceKind;
  sources: readonly SignetOnchainSource[];
  liveSyncEnabled: false;
  broadcastEnabled: false;
  credentialsSupported: false;
};

const SOURCE_LABELS: Record<OnchainSourceKind, string> = {
  electrum: "Servidor Electrum configurável",
  esplora: "API Esplora configurável",
  "bitcoin-core-rpc": "Nó Bitcoin Core próprio (RPC local, leitura via scantxoutset)",
};

/**
 * Define apenas a ordem prevista de fontes on-chain. Endpoints, credenciais,
 * sincronização e transmissão são propositalmente ausentes neste estágio.
 */
export function createSignetOnchainSourcePlan(
  network: string,
  primary: OnchainSourceKind = "electrum",
): SignetOnchainSourcePlan {
  assertSignetOnly(network);
  const fallback: OnchainSourceKind = primary === "electrum" ? "esplora" : "electrum";

  return {
    network: ACTIVE_DEVELOPMENT_NETWORK,
    strategy: "combined-configurable",
    primary,
    fallback,
    sources: [primary, fallback].map((source) => ({
      id: source,
      label: SOURCE_LABELS[source],
      status: "not-configured",
      endpoint: null,
    })),
    liveSyncEnabled: false,
    broadcastEnabled: false,
    credentialsSupported: false,
  };
}

export function isLiveOnchainEnabled(_plan: SignetOnchainSourcePlan): boolean {
  return false;
}

export function assertLiveOnchainEnabled(plan: SignetOnchainSourcePlan): void {
  if (isLiveOnchainEnabled(plan)) return;
  throw new Error(
    "A fonte on-chain real ainda não está ativada. Nenhuma sincronização, broadcast ou operação com fundos foi iniciada.",
  );
}

/**
 * Descreve a opção "nó próprio via RPC" (avaliada e aprovada como parte da
 * estratégia "combinação configurável" em signet-architecture-decision-brief.md).
 * Aditiva e opt-in: não substitui primary/fallback (electrum/esplora),
 * apenas descreve mais uma fonte que pode ser adicionada ao plano. A
 * capacidade de leitura real já existe em shared/bitcoin-core-rpc-client.ts
 * — esta função só documenta a opção dentro do sistema de planos, sem
 * ativar liveSyncEnabled.
 */
export function describeOwnNodeSource(): SignetOnchainSource {
  return {
    id: "bitcoin-core-rpc",
    label: SOURCE_LABELS["bitcoin-core-rpc"],
    status: "not-configured",
    endpoint: null,
  };
}

/**
 * Retorna um NOVO plano com uma fonte adicional anexada, sem alterar o
 * plano original nem o comportamento já testado de
 * createSignetOnchainSourcePlan. Puro e imutável.
 */
export function withAdditionalSource(
  plan: SignetOnchainSourcePlan,
  source: SignetOnchainSource,
): SignetOnchainSourcePlan {
  return {
    ...plan,
    sources: [...plan.sources, source],
  };
}
