import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeLightningConnection } from "@/shared/lightning";
import { DEMO_WALLET_STORAGE_KEY } from "@/shared/storage-namespaces";
import { createInitialWalletState, type WalletState } from "@/shared/wallet";

export async function loadWalletState(): Promise<WalletState> {
  try {
    const serialized = await AsyncStorage.getItem(DEMO_WALLET_STORAGE_KEY);
    if (!serialized) return createInitialWalletState();
    const parsed = JSON.parse(serialized) as WalletState;
    if (parsed.mode !== "demo" || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.invoices)) return createInitialWalletState();
    return {
      ...parsed,
      settings: {
        hideBalance: Boolean(parsed.settings?.hideBalance),
        biometricsEnabled: Boolean(parsed.settings?.biometricsEnabled),
        hasCompletedOnboarding: parsed.settings?.hasCompletedOnboarding === true,
      },
      lightning: normalizeLightningConnection(parsed.lightning),
    };
  } catch {
    return createInitialWalletState();
  }
}

export async function saveWalletState(state: WalletState): Promise<void> {
  await AsyncStorage.setItem(DEMO_WALLET_STORAGE_KEY, JSON.stringify(state));
}
