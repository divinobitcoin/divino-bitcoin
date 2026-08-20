import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TransactionRow } from "@/components/wallet/transaction-row";
import { haptic } from "@/lib/haptics";
import { useWallet } from "@/lib/wallet-context";
import { formatSats } from "@/shared/wallet";

export default function WalletScreen() {
  const router = useRouter();
  const { state, isReady, setHideBalance } = useWallet();
  if (!isReady || !state) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#0A84FF" /></ScreenContainer>;

  const latestTransaction = state.transactions[0];
  const balanceLabel = state.settings.hideBalance ? "••••••" : formatSats(state.balanceSats);
  return (
    <ScreenContainer containerClassName="bg-[#F7F9FC]" safeAreaClassName="bg-[#F7F9FC]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View><Text style={styles.eyebrow}>DIVINO BITCOIN</Text><Text style={styles.title}>Sua carteira</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={state.settings.hideBalance ? "Mostrar saldo" : "Ocultar saldo"} onPress={() => { haptic.light(); void setHideBalance(!state.settings.hideBalance); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><MaterialIcons name={state.settings.hideBalance ? "visibility-off" : "visibility"} size={21} color="#374151" /></Pressable>
        </View>
        <View style={styles.demoNotice}><MaterialIcons name="science" size={18} color="#085EAF" /><Text style={styles.demoNoticeText}>Modo de demonstração. Nenhum bitcoin real é movimentado.</Text></View>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}><Text style={styles.balanceLabel}>Saldo disponível</Text><View style={styles.lightningPill}><MaterialIcons name="bolt" size={15} color="#0A84FF" /><Text style={styles.lightningText}>LIGHTNING</Text></View></View>
          <Text style={styles.balance}>{balanceLabel}</Text><Text style={styles.balanceSubtext}>Dados locais de teste</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => { haptic.light(); router.push("/receive"); }} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryPressed]}><View style={styles.actionIconPrimary}><MaterialIcons name="arrow-downward" size={23} color="#FFFFFF" /></View><Text style={styles.primaryActionText}>Receber</Text></Pressable>
          <Pressable onPress={() => { haptic.light(); router.push("/send"); }} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><View style={styles.actionIconSecondary}><MaterialIcons name="arrow-upward" size={23} color="#0A84FF" /></View><Text style={styles.secondaryActionText}>Enviar</Text></Pressable>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Atividade recente</Text><Pressable onPress={() => router.push("/(tabs)/activity")} style={({ pressed }) => pressed && styles.pressed}><Text style={styles.linkText}>Ver tudo</Text></Pressable></View>
        <View style={styles.transactionCard}>{latestTransaction ? <TransactionRow transaction={latestTransaction} onPress={() => router.push(`/transaction/${latestTransaction.id}`)} /> : <Text style={styles.emptyText}>Nenhum movimento local ainda.</Text>}</View>
        <View style={styles.protectionCard}><View style={styles.protectionIcon}><MaterialIcons name="shield" size={20} color="#16803A" /></View><View style={styles.protectionText}><Text style={styles.protectionTitle}>Segurança em primeiro lugar</Text><Text style={styles.protectionDescription}>Antes de receber fundos reais, conecte uma fonte Lightning auditada e revise as proteções.</Text></View></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, padding: 20, paddingBottom: 32 }, topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  eyebrow: { color: "#0A84FF", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6, marginTop: 4 },
  iconButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, pressed: { opacity: 0.6 },
  demoNotice: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 12, flexDirection: "row", gap: 8, padding: 12 }, demoNoticeText: { color: "#085EAF", flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  balanceCard: { backgroundColor: "#0D1117", borderRadius: 24, gap: 10, minHeight: 182, padding: 22 }, balanceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, balanceLabel: { color: "#B9C3D0", fontSize: 14, fontWeight: "600" },
  lightningPill: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 99, flexDirection: "row", gap: 3, paddingHorizontal: 9, paddingVertical: 5 }, lightningText: { color: "#0A84FF", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  balance: { color: "#FFFFFF", fontSize: 35, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -1.1, marginTop: 12 }, balanceSubtext: { color: "#8793A5", fontSize: 13 },
  actions: { flexDirection: "row", gap: 12 }, primaryAction: { alignItems: "center", backgroundColor: "#0A84FF", borderRadius: 18, flex: 1, gap: 9, justifyContent: "center", minHeight: 112 }, primaryPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  secondaryAction: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CFE7FF", borderRadius: 18, borderWidth: 1, flex: 1, gap: 9, justifyContent: "center", minHeight: 112 }, actionIconPrimary: { alignItems: "center", backgroundColor: "#3499FF", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, actionIconSecondary: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, primaryActionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" }, secondaryActionText: { color: "#075DA9", fontSize: 16, fontWeight: "700" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 }, sectionTitle: { color: "#101828", fontSize: 18, fontWeight: "700" }, linkText: { color: "#0A84FF", fontSize: 14, fontWeight: "700" }, transactionCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, overflow: "hidden" }, emptyText: { color: "#6B7280", padding: 20, textAlign: "center" },
  protectionCard: { alignItems: "flex-start", backgroundColor: "#F0FBF3", borderColor: "#D7F0DE", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 15 }, protectionIcon: { alignItems: "center", backgroundColor: "#DFF7E7", borderRadius: 14, height: 34, justifyContent: "center", width: 34 }, protectionText: { flex: 1, gap: 4 }, protectionTitle: { color: "#146C31", fontSize: 14, fontWeight: "800" }, protectionDescription: { color: "#38744A", fontSize: 12, lineHeight: 17 },
});
