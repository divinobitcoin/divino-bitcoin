import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/lib/theme-provider";
import { WalletProvider } from "@/lib/wallet-context";
import { cores } from "@/constants/palette";

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
      <Stack.Screen name="dev/signet-watch" options={{ title: "Observar endereço Signet", ...OPCOES_LAB }} />
      <Stack.Screen name="dev/signet-psbt" options={{ title: "Enviar em Signet", ...OPCOES_LAB }} />
      <Stack.Screen name="dev/signet-node-balance" options={{ title: "Saldo pelo meu nó", ...OPCOES_LAB }} />
    </Stack>
  );
}

/**
 * Opções de navegação das telas de laboratório.
 *
 * O cabeçalho e o fundo do navegador NÃO vêm da tela — vêm do Stack. Sem isto,
 * a tela pinta o próprio conteúdo de escuro e sobra branco na barra de título e
 * abaixo do conteúdo, porque essas duas áreas pertencem ao navegador.
 *
 * Aplicado só às telas `dev/`: as demais ainda são claras, e escurecer o
 * navegador inteiro agora deixaria o resto inconsistente.
 */
const OPCOES_LAB = {
  headerStyle: { backgroundColor: cores.fundo },
  headerTintColor: cores.textoPrimario,
  headerTitleStyle: { color: cores.textoPrimario },
  contentStyle: { backgroundColor: cores.fundo },
} as const;

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
