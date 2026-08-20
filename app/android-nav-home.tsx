import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/lib/wallet-context";

export default function AndroidNavigationHome() {
  const { state } = useWallet();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View>
        <Text style={styles.eyebrow}>DIVINO BITCOIN</Text>
        <Text style={styles.title}>Navegação Android ativa</Text>
        <Text style={styles.description}>
          O Expo Router e a carteira local foram montados sem carregar o tema ou as telas completas.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Estado da carteira</Text>
        <Text style={styles.cardValue}>{state?.mode === "demo" ? "Demonstração local" : "Carregada"}</Text>
      </View>

      <View style={styles.button}>
        <Text style={styles.buttonLabel}>Navegação verificada</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
    marginBottom: 12,
  },
  description: {
    color: "#4B5563",
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  cardLabel: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardValue: {
    color: "#431407",
    fontSize: 20,
    fontWeight: "700",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#F7931A",
    borderRadius: 16,
    minHeight: 56,
    justifyContent: "center",
  },
  buttonLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});
