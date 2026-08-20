import { ACTIVE_DEVELOPMENT_NETWORK, type BitcoinDevelopmentNetwork } from "./bitcoin-network";

export type LightningProviderKind = "nwc" | "gateway";
export type LightningConnectionStatus = "not-configured" | "planned";

export interface LightningConnection {
  provider: LightningProviderKind | null;
  status: LightningConnectionStatus;
  network: BitcoinDevelopmentNetwork;
}

export interface LightningProviderPlan {
  title: string;
  description: string;
  setupNote: string;
}

export interface LightningProviderAdapter {
  readonly kind: LightningProviderKind;
  getBalance: () => Promise<{ balanceSats: number }>;
  createInvoice: (input: { amountSats: number; memo?: string }) => Promise<{ invoice: string }>;
  payInvoice: (input: { invoice: string; maxFeeSats: number }) => Promise<{ paymentId: string; feeSats: number }>;
}

export const LIGHTNING_PROVIDER_PLANS: Record<LightningProviderKind, LightningProviderPlan> = {
  nwc: {
    title: "Nostr Wallet Connect",
    description: "Planeja uma conexão revogável para uso futuro, restrita ao ambiente Signet neste estágio.",
    setupNote: "Uma URI de conexão, quando habilitada e auditada, ficará somente no armazenamento protegido do aparelho.",
  },
  gateway: {
    title: "Gateway próprio",
    description: "Planeja uma API própria futura, sem credenciais nem conexões nesta versão.",
    setupNote: "Um gateway futuro deverá usar Signet, autenticação, limites, auditoria e proteção de credenciais.",
  },
};

export function createInitialLightningConnection(): LightningConnection {
  return { provider: null, status: "not-configured", network: ACTIVE_DEVELOPMENT_NETWORK };
}

export function normalizeLightningConnection(value: unknown): LightningConnection {
  if (!value || typeof value !== "object") return createInitialLightningConnection();
  const connection = value as Partial<LightningConnection>;
  const provider = connection.provider === "nwc" || connection.provider === "gateway" ? connection.provider : null;
  return {
    provider,
    status: provider && connection.status === "planned" ? "planned" : "not-configured",
    network: ACTIVE_DEVELOPMENT_NETWORK,
  };
}

export function isLiveLightningEnabled(_connection: LightningConnection): boolean {
  return false;
}

export function assertLiveLightningEnabled(connection: LightningConnection): void {
  if (isLiveLightningEnabled(connection)) return;
  throw new Error("A conexão Lightning real ainda não está ativada. Nenhuma operação com fundos reais foi iniciada.");
}
