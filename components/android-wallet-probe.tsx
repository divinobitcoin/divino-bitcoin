import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { WalletProvider, useWallet } from "@/lib/wallet-context";

function WalletStatus() {
  const { isReady, state } = useWallet();

  if (!isReady || !state) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#F7931A" size="large" />
        <Text style={styles.status}>Carregando carteira local…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>DIVINO BITCOIN</Text>
      <Text style={styles.title}>Carteira local ativa</Text>
      <Text style={styles.description}>
        Os dados de demonstração foram carregados com segurança no Android.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Modo atual</Text>
        <Text style={styles.cardValue}>{state.mode === "demo" ? "Demonstração" : state.mode}</Text>
      </View>
    </View>
  );
}

export default function AndroidWalletProbe() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  eyebrow: {
    color: "#F7931A",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    marginBottom: 12,
  },
  description: {
    color: "#4B5563",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  status: {
    color: "#4B5563",
    fontSize: 16,
    marginTop: 16,
  },
  card: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    width: "100%",
  },
  cardLabel: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardValue: {
    color: "#431407",
    fontSize: 18,
    fontWeight: "700",
  },
});
