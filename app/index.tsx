import { Redirect } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { useWallet } from "@/lib/wallet-context";

export default function InitialRoute() {
  const { isReady, state } = useWallet();

  if (!isReady || !state) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0A84FF" size="large" />
      </View>
    );
  }

  if (Platform.OS === "android") return <Redirect href="/android-welcome" />;

  return <Redirect href={state.settings.hasCompletedOnboarding ? "/(tabs)" : "/welcome"} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
  },
});
