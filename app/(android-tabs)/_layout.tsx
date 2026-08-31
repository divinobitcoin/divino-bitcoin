import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cores } from "@/constants/palette";

export default function AndroidTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Aba ativa na cor de ação: aba é elemento tocável, e o amarelo
        // significa "isto responde ao toque" no resto da interface.
        tabBarActiveTintColor: cores.acaoPrimaria,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarStyle: {
          // `superficie`, não `fundo`: a barra fica sobre o conteúdo e precisa
          // se separar dele. Era branco puro, herdado do tema claro.
          backgroundColor: cores.superficie,
          borderTopColor: cores.borda,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Carteira",
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="account-balance-wallet" size={24} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Atividade",
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="history" size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color }) => <MaterialIcons color={color} name="settings" size={24} />,
        }}
      />
    </Tabs>
  );
}
