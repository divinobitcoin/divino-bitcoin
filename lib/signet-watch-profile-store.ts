import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  lerWatchOnlyProfileGravado,
  serializarWatchOnlyProfile,
  type SignetWatchOnlyProfile,
} from "@/shared/signet-watch-profile";
import { createSignetPublicStorageKey } from "@/shared/storage-namespaces";

const KEY = createSignetPublicStorageKey("signet", "watch-only-profile");

export async function loadWatchOnlyProfile(): Promise<SignetWatchOnlyProfile | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  return lerWatchOnlyProfileGravado(raw);
}

export async function saveWatchOnlyProfile(profile: SignetWatchOnlyProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, serializarWatchOnlyProfile(profile));
}

export async function deleteWatchOnlyProfile(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
