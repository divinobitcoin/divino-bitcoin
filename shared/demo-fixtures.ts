export const DEMO_ENVIRONMENT_LABEL = "Signet · laboratório local";
export const DEMO_STATUS_MESSAGE = "Nenhum bitcoin real é movimentado.";

export const DEMO_PAYMENT_FIXTURE = {
  reference: "lnbc-demo-p2-fixture",
  amountSats: 1_000,
  memo: "Pagamento local de teste",
} as const;

export function isDemoLightningReference(reference: string): boolean {
  return /^lnbc-demo-/i.test(reference.trim());
}
