import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/lib/theme-provider";
import { WalletProvider } from "@/lib/wallet-context";

function WalletNavigator() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Voltar", headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="receive" options={{ title: "Receber" }} />
      <Stack.Screen name="send" options={{ title: "Enviar" }} />
      <Stack.Screen name="scan-invoice" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="payment-review" options={{ title: "Revisar pagamento", presentation: "modal" }} />
      <Stack.Screen name="transaction/[id]" options={{ title: "Detalhe" }} />
    </Stack>
  );
}

export default function FullAppLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <WalletProvider>
          <WalletNavigator />
          <StatusBar style="auto" />
        </WalletProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
