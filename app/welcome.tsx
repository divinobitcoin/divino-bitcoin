import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { useWallet } from "@/lib/wallet-context";

export default function WelcomeScreen() {
  const router = useRouter();
  const { completeOnboarding } = useWallet();
  const [isContinuing, setIsContinuing] = useState(false);

  async function enterDemoWallet() {
    if (isContinuing) return;
    setIsContinuing(true);
    haptic.light();
    await completeOnboarding();
    router.replace("/(tabs)");
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#0D1117]" safeAreaClassName="bg-[#0D1117]">
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <View style={styles.logo}><MaterialIcons name="bolt" size={38} color="#0D1117" /></View>
          <Text style={styles.eyebrow}>DIVINO BITCOIN</Text>
          <Text style={styles.title}>Lightning, sem pressa e sem risco inicial.</Text>
          <Text style={styles.subtitle}>Conheça a carteira com dados locais antes de conectar qualquer fonte de bitcoin real.</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}><View style={styles.cardIcon}><MaterialIcons name="science" size={20} color="#0A84FF" /></View><Text style={styles.cardTitle}>Modo de demonstração</Text></View>
          <Text style={styles.cardText}>Você poderá criar solicitações, validar invoices e revisar pagamentos sem enviar, receber ou armazenar bitcoin real.</Text>
          <View style={styles.rule} />
          <View style={styles.bullet}><MaterialIcons name="check-circle" size={18} color="#30D158" /><Text style={styles.bulletText}>Nenhuma seed phrase ou chave é solicitada.</Text></View>
          <View style={styles.bullet}><MaterialIcons name="check-circle" size={18} color="#30D158" /><Text style={styles.bulletText}>A integração Lightning continuará desativada até sua escolha explícita.</Text></View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.disclaimer}>Pagamentos Lightning reais são irreversíveis. Use apenas uma fonte auditada quando a integração estiver disponível.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Entrar no modo de demonstração" disabled={isContinuing} onPress={() => void enterDemoWallet()} style={({ pressed }) => [styles.primaryButton, pressed && !isContinuing && styles.pressed, isContinuing && styles.loading]}>
            {isContinuing ? <ActivityIndicator color="#0D1117" /> : <><Text style={styles.primaryButtonText}>Explorar demonstração</Text><MaterialIcons name="arrow-forward" size={20} color="#0D1117" /></>}
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: "#0D1117", flex: 1, justifyContent: "space-between", padding: 24 },
  brandBlock: { gap: 12, paddingTop: 28 },
  logo: { alignItems: "center", backgroundColor: "#F7931A", borderRadius: 24, height: 72, justifyContent: "center", width: 72 },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginTop: 10 },
  title: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", letterSpacing: -1.1, lineHeight: 40, maxWidth: 320 },
  subtitle: { color: "#B9C3D0", fontSize: 16, lineHeight: 23, maxWidth: 330 },
  infoCard: { backgroundColor: "#171E27", borderColor: "#283446", borderRadius: 22, borderWidth: 1, gap: 12, padding: 19 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  cardIcon: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 13, height: 36, justifyContent: "center", width: 36 },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cardText: { color: "#B9C3D0", fontSize: 13, lineHeight: 19 },
  rule: { backgroundColor: "#283446", height: StyleSheet.hairlineWidth, marginVertical: 2 },
  bullet: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  bulletText: { color: "#D7DEE9", flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { gap: 15 },
  disclaimer: { color: "#8793A5", fontSize: 12, lineHeight: 17, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: "#F7931A", borderRadius: 16, flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 56 },
  primaryButtonText: { color: "#0D1117", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  loading: { opacity: 0.8 },
});
