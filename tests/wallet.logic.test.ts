import { describe, expect, it } from "vitest";

import { createDemoInvoice, createInitialWalletState, payDemoReference, settleDemoInvoice } from "../shared/wallet";

describe("regras da carteira de demonstração", () => {
  it("mantém a boas-vindas pendente no estado inicial", () => {
    expect(createInitialWalletState().settings.hasCompletedOnboarding).toBe(false);
  });

  it("cria e liquida uma solicitação local, atualizando o saldo", () => {
    const initial = createInitialWalletState(); const created = createDemoInvoice(initial, 1500, "Teste", new Date("2026-08-19T10:00:00.000Z"));
    expect(created.error).toBeUndefined(); expect(created.invoice?.status).toBe("pending");
    const settled = settleDemoInvoice(created.nextState, created.invoice!.id, new Date("2026-08-19T10:01:00.000Z"));
    expect(settled.error).toBeUndefined(); expect(settled.nextState.balanceSats).toBe(initial.balanceSats + 1500); expect(settled.nextState.invoices[0].status).toBe("settled");
  });
  it("inclui a taxa ao validar o saldo de um pagamento", () => {
    const initial = createInitialWalletState(); const result = payDemoReference(initial, "lnbc-demo-destino", initial.balanceSats, "Teste", new Date("2026-08-19T10:00:00.000Z"));
    expect(result.error).toBe("Saldo demonstrativo insuficiente para este pagamento."); expect(result.nextState.balanceSats).toBe(initial.balanceSats);
  });
  it("recusa referências que não parecem Lightning", () => {
    const result = payDemoReference(createInitialWalletState(), "bitcoin:abc", 1000, "Teste", new Date("2026-08-19T10:00:00.000Z"));
    expect(result.error).toBe("Use uma referência Lightning iniciada por ln.");
  });
});
