import {
  ACTIVE_DEVELOPMENT_NETWORK,
  assertSignetOnly,
  type BitcoinDevelopmentNetwork,
} from "./bitcoin-network";

export type OnchainSourceKind = "electrum" | "esplora";
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
