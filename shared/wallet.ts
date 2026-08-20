export type TransactionDirection = "incoming" | "outgoing";
import { validateBolt11Invoice } from "../lib/bolt11";
import { createInitialLightningConnection, type LightningConnection } from "./lightning";

export type TransactionStatus = "completed" | "pending" | "failed";

export interface WalletTransaction {
  id: string;
  direction: TransactionDirection;
  amountSats: number;
  feeSats: number;
  counterparty: string;
  memo: string;
  reference: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface LightningInvoice {
  id: string;
  amountSats: number;
  memo: string;
  reference: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "settled" | "expired";
}

export interface WalletSettings {
  hideBalance: boolean;
  biometricsEnabled: boolean;
  hasCompletedOnboarding: boolean;
}

export interface WalletState {
  mode: "demo";
  balanceSats: number;
  transactions: WalletTransaction[];
  invoices: LightningInvoice[];
  settings: WalletSettings;
  lightning: LightningConnection;
}

export const DEMO_INITIAL_BALANCE_SATS = 250_000;
const MAX_DEMO_AMOUNT_SATS = 5_000_000;

export function createInitialWalletState(): WalletState {
  return {
    mode: "demo",
    balanceSats: DEMO_INITIAL_BALANCE_SATS,
    invoices: [],
    settings: { hideBalance: false, biometricsEnabled: false, hasCompletedOnboarding: false },
    lightning: createInitialLightningConnection(),
    transactions: [
      {
        id: "demo-credit-inicial",
        direction: "incoming",
        amountSats: DEMO_INITIAL_BALANCE_SATS,
        feeSats: 0,
        counterparty: "Saldo inicial",
        memo: "Crédito exclusivo do modo de demonstração",
        reference: "DEMO-INITIAL-CREDIT",
        status: "completed",
        createdAt: "2026-08-19T09:00:00.000Z",
      },
    ],
  };
}

export function formatSats(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} sats`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizedAmount(value: number): number {
  return Math.floor(Number(value));
}

function validateDemoAmount(value: number): string | null {
  const amount = normalizedAmount(value);
  if (!Number.isFinite(amount) || amount < 1) return "Informe um valor de pelo menos 1 sat.";
  if (amount > MAX_DEMO_AMOUNT_SATS) return "O modo de demonstração aceita até 5.000.000 sats por operação.";
  return null;
}

function buildId(prefix: string, now: Date): string {
  return `${prefix}-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDemoInvoice(state: WalletState, rawAmountSats: number, memo: string, now = new Date()): { nextState: WalletState; invoice?: LightningInvoice; error?: string } {
  const error = validateDemoAmount(rawAmountSats);
  if (error) return { nextState: state, error };
  const amountSats = normalizedAmount(rawAmountSats);
  const id = buildId("invoice", now);
  const invoice: LightningInvoice = {
    id,
    amountSats,
    memo: memo.trim() || "Recebimento Lightning de demonstração",
    reference: `lnbc-demo-${now.getTime().toString(36)}-${amountSats.toString(36)}`,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    status: "pending",
  };
  return { nextState: { ...state, invoices: [invoice, ...state.invoices] }, invoice };
}

export function settleDemoInvoice(state: WalletState, invoiceId: string, now = new Date()): { nextState: WalletState; error?: string } {
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return { nextState: state, error: "Solicitação não encontrada." };
  if (invoice.status !== "pending") return { nextState: state, error: "Esta solicitação já foi processada." };
  const settledInvoice: LightningInvoice = { ...invoice, status: "settled" };
  const transaction: WalletTransaction = {
    id: buildId("receive", now), direction: "incoming", amountSats: invoice.amountSats, feeSats: 0,
    counterparty: "Pagamento de demonstração", memo: invoice.memo, reference: invoice.reference,
    status: "completed", createdAt: now.toISOString(),
  };
  return { nextState: { ...state, balanceSats: state.balanceSats + invoice.amountSats, invoices: state.invoices.map((item) => item.id === invoiceId ? settledInvoice : item), transactions: [transaction, ...state.transactions] } };
}

export function payDemoReference(state: WalletState, reference: string, rawAmountSats: number, memo: string, now = new Date()): { nextState: WalletState; transaction?: WalletTransaction; error?: string } {
  const error = validateDemoAmount(rawAmountSats);
  if (error) return { nextState: state, error };
  const cleanReference = reference.trim();
  const isLocalDemoReference = /^lnbc-demo-/i.test(cleanReference);
  if (!/^ln/i.test(cleanReference)) return { nextState: state, error: "Use uma referência Lightning iniciada por ln." };
  if (!isLocalDemoReference && !validateBolt11Invoice(cleanReference).valid) return { nextState: state, error: "Use uma invoice BOLT11 válida." };
  const amountSats = normalizedAmount(rawAmountSats);
  const feeSats = Math.max(1, Math.ceil(amountSats * 0.002));
  const totalSats = amountSats + feeSats;
  if (totalSats > state.balanceSats) return { nextState: state, error: "Saldo demonstrativo insuficiente para este pagamento." };
  const transaction: WalletTransaction = {
    id: buildId("payment", now), direction: "outgoing", amountSats, feeSats, counterparty: "Destino Lightning",
    memo: memo.trim() || "Pagamento Lightning de demonstração", reference: cleanReference,
    status: "completed", createdAt: now.toISOString(),
  };
  return { nextState: { ...state, balanceSats: state.balanceSats - totalSats, transactions: [transaction, ...state.transactions] }, transaction };
}
