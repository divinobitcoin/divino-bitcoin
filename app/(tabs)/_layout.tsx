import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#0A84FF", tabBarButton: HapticTab, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, height: 56 + bottomPadding, paddingBottom: bottomPadding, paddingTop: 8 } }}>
      <Tabs.Screen name="index" options={{ title: "Carteira", tabBarIcon: ({ color }) => <IconSymbol name="bolt.fill" size={24} color={color} /> }} />
      <Tabs.Screen name="activity" options={{ title: "Atividade", tabBarIcon: ({ color }) => <IconSymbol name="clock.fill" size={24} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarIcon: ({ color }) => <IconSymbol name="gearshape.fill" size={24} color={color} /> }} />
    </Tabs>
  );
}
