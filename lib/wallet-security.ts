import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURITY_PREFERENCE_KEY = "divino-bitcoin.security.v1";

export interface SecurityPreference { biometricsEnabled: boolean; }

export async function loadSecurityPreference(): Promise<SecurityPreference | null> {
  try {
    const serialized = Platform.OS === "web" ? await AsyncStorage.getItem(SECURITY_PREFERENCE_KEY) : await SecureStore.getItemAsync(SECURITY_PREFERENCE_KEY);
    return serialized ? (JSON.parse(serialized) as SecurityPreference) : null;
  } catch {
    return null;
  }
}

export async function saveSecurityPreference(preference: SecurityPreference): Promise<void> {
  const serialized = JSON.stringify(preference);
  if (Platform.OS === "web") { await AsyncStorage.setItem(SECURITY_PREFERENCE_KEY, serialized); return; }
  await SecureStore.setItemAsync(SECURITY_PREFERENCE_KEY, serialized);
}
