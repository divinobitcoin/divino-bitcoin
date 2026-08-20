import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { LightningProviderKind } from "@/shared/lightning";
import { createDemoInvoice, payDemoReference, settleDemoInvoice, type LightningInvoice, type WalletState, type WalletTransaction } from "@/shared/wallet";
import { loadSecurityPreference, saveSecurityPreference } from "@/lib/wallet-security";
import { loadWalletState, saveWalletState } from "@/lib/wallet-storage";

interface PaymentResult { transaction?: WalletTransaction; error?: string; }
interface WalletContextValue {
  state: WalletState | null;
  isReady: boolean;
  createReceiveRequest: (amountSats: number, memo: string) => Promise<{ invoice?: LightningInvoice; error?: string }>;
  settleReceiveRequest: (invoiceId: string) => Promise<{ error?: string }>;
  payReference: (reference: string, amountSats: number, memo: string) => Promise<PaymentResult>;
  setHideBalance: (value: boolean) => Promise<void>;
  setBiometricsEnabled: (value: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  selectLightningProvider: (provider: LightningProviderKind) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState | null>(null);

  useEffect(() => {
    let mounted = true;
    void Promise.all([loadWalletState(), loadSecurityPreference()]).then(([walletState, security]) => {
      if (!mounted) return;
      setState({ ...walletState, settings: { ...walletState.settings, biometricsEnabled: security?.biometricsEnabled ?? walletState.settings.biometricsEnabled } });
    });
    return () => { mounted = false; };
  }, []);

  const commit = useCallback(async (nextState: WalletState) => { setState(nextState); await saveWalletState(nextState); }, []);
  const createReceiveRequest = useCallback(async (amountSats: number, memo: string) => {
    if (!state) return { error: "A carteira ainda está sendo preparada." };
    const result = createDemoInvoice(state, amountSats, memo);
    if (result.invoice) await commit(result.nextState);
    return { invoice: result.invoice, error: result.error };
  }, [commit, state]);
  const settleReceiveRequest = useCallback(async (invoiceId: string) => {
    if (!state) return { error: "A carteira ainda está sendo preparada." };
    const result = settleDemoInvoice(state, invoiceId);
    if (!result.error) await commit(result.nextState);
    return { error: result.error };
  }, [commit, state]);
  const payReference = useCallback(async (reference: string, amountSats: number, memo: string): Promise<PaymentResult> => {
    if (!state) return { error: "A carteira ainda está sendo preparada." };
    const result = payDemoReference(state, reference, amountSats, memo);
    if (result.transaction) await commit(result.nextState);
    return { transaction: result.transaction, error: result.error };
  }, [commit, state]);
  const setHideBalance = useCallback(async (value: boolean) => { if (state) await commit({ ...state, settings: { ...state.settings, hideBalance: value } }); }, [commit, state]);
  const setBiometricsEnabled = useCallback(async (value: boolean) => { if (!state) return; await saveSecurityPreference({ biometricsEnabled: value }); await commit({ ...state, settings: { ...state.settings, biometricsEnabled: value } }); }, [commit, state]);
  const completeOnboarding = useCallback(async () => { if (state) await commit({ ...state, settings: { ...state.settings, hasCompletedOnboarding: true } }); }, [commit, state]);
  const selectLightningProvider = useCallback(async (provider: LightningProviderKind) => { if (state) await commit({ ...state, lightning: { provider, status: "planned", network: state.lightning.network } }); }, [commit, state]);

  const value = useMemo<WalletContextValue>(() => ({ state, isReady: state !== null, createReceiveRequest, settleReceiveRequest, payReference, setHideBalance, setBiometricsEnabled, completeOnboarding, selectLightningProvider }), [completeOnboarding, createReceiveRequest, payReference, selectLightningProvider, setBiometricsEnabled, setHideBalance, settleReceiveRequest, state]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet deve ser utilizado dentro de WalletProvider.");
  return value;
}
