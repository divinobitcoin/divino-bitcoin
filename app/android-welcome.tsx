import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/lib/wallet-context";

export default function AndroidWelcomeScreen() {
  const router = useRouter();
  const { completeOnboarding } = useWallet();
  const insets = useSafeAreaInsets();
  const [isContinuing, setIsContinuing] = useState(false);

  async function enterDemoWallet() {
    if (isContinuing) return;
    setIsContinuing(true);
    try {
      await completeOnboarding();
      router.replace("/(android-tabs)");
    } finally {
      setIsContinuing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 32) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logo}><Text style={styles.logoMark}>ϟ</Text></View>
          <Text style={styles.eyebrow}>DIVINO BITCOIN</Text>
          <Text style={styles.title}>Lightning, sem pressa e sem risco inicial.</Text>
          <Text style={styles.subtitle}>
            Conheça a carteira com dados locais antes de conectar qualquer fonte de bitcoin real.
          </Text>
          <View style={styles.actionBlock}>
            <Text
              accessibilityLabel="Entrar no modo de demonstração"
              accessibilityRole="button"
              onPress={() => void enterDemoWallet()}
              style={[styles.textAction, isContinuing && styles.textActionDisabled]}
            >
              {isContinuing ? "Abrindo demonstração..." : "ABRIR DEMONSTRAÇÃO  →"}
            </Text>
            <Text style={styles.disclaimer}>
              Pagamentos Lightning reais são irreversíveis. Use apenas uma fonte auditada quando a integração estiver disponível.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}><Text style={styles.cardIconMark}>△</Text></View>
            <Text style={styles.cardTitle}>Modo de demonstração</Text>
          </View>
          <Text style={styles.cardText}>
            Você poderá criar solicitações, validar invoices e revisar pagamentos sem enviar, receber ou armazenar bitcoin real.
          </Text>
          <View style={styles.rule} />
          <Text style={styles.bulletText}>✓ Nenhuma seed phrase ou chave é solicitada.</Text>
          <Text style={styles.bulletText}>✓ A integração Lightning continuará desativada até sua escolha explícita.</Text>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0D1117", flex: 1 },
  scroll: { flex: 1, flexShrink: 1 },
  content: { gap: 28, paddingBottom: 24, paddingHorizontal: 24 },
  brandBlock: { gap: 12 },
  logo: { alignItems: "center", backgroundColor: "#F7931A", borderRadius: 24, height: 72, justifyContent: "center", width: 72 },
  logoMark: { color: "#0D1117", fontSize: 42, fontWeight: "800", lineHeight: 50 },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginTop: 10 },
  title: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", letterSpacing: -1.1, lineHeight: 40, maxWidth: 320 },
  subtitle: { color: "#B9C3D0", fontSize: 16, lineHeight: 23, maxWidth: 330 },
  actionBlock: { gap: 10, marginTop: 2 },
  infoCard: { backgroundColor: "#171E27", borderColor: "#283446", borderRadius: 22, borderWidth: 1, gap: 12, padding: 19 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  cardIcon: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 13, height: 36, justifyContent: "center", width: 36 },
  cardIconMark: { color: "#0A84FF", fontSize: 20, fontWeight: "800" },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cardText: { color: "#B9C3D0", fontSize: 13, lineHeight: 19 },
  rule: { backgroundColor: "#283446", height: StyleSheet.hairlineWidth, marginVertical: 2 },
  bulletText: { color: "#D7DEE9", fontSize: 12, lineHeight: 18 },
  disclaimer: { color: "#8793A5", fontSize: 12, lineHeight: 17, textAlign: "center" },
  textAction: { backgroundColor: "#F7931A", borderRadius: 14, color: "#0D1117", fontSize: 16, fontWeight: "900", lineHeight: 22, overflow: "hidden", paddingHorizontal: 18, paddingVertical: 17, textAlign: "center" },
  textActionDisabled: { opacity: 0.8 },
});
