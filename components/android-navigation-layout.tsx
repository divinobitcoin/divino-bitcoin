import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { WalletProvider } from "@/lib/wallet-context";

export default function AndroidNavigationLayout() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <Stack initialRouteName="index" screenOptions={{ headerBackTitle: "Voltar", headerShadowVisible: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="android-welcome" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="(android-tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="android-nav-home" options={{ headerShown: false }} />
          <Stack.Screen name="android-receive" options={{ headerShown: false }} />
          <Stack.Screen name="android-send" options={{ headerShown: false }} />
          <Stack.Screen name="android-transaction-detail" options={{ headerShown: false }} />
          <Stack.Screen name="dev/signet-watch" options={{ title: "Observar endereço Signet" }} />
        </Stack>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
