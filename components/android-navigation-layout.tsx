import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { WalletProvider } from "@/lib/wallet-context";
import { cores } from "@/constants/palette";

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
          <Stack.Screen name="dev/signet-watch" options={{ title: "Observar endereço Signet", ...OPCOES_LAB }} />
          <Stack.Screen name="dev/signet-psbt" options={{ title: "Enviar em Signet", ...OPCOES_LAB }} />
        </Stack>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
