import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AndroidTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F7931A",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
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
