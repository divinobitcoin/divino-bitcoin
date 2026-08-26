import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DemoStatusBanner } from "@/components/demo-status-banner";
import { useWallet } from "@/lib/wallet-context";
import { formatDateTime, formatSats } from "@/shared/wallet";

export default function AndroidWalletTab() {
  const router = useRouter();
  const { state, isReady, setHideBalance } = useWallet();
  const insets = useSafeAreaInsets();

  if (!isReady || !state) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#F7931A" />
      </View>
    );
  }

  const latestTransaction = state.transactions[0];
  const balanceLabel = state.settings.hideBalance ? "••••••" : formatSats(state.balanceSats);
  const latestTransactionTotal = latestTransaction
    ? latestTransaction.direction === "incoming"
      ? latestTransaction.amountSats
      : latestTransaction.amountSats + latestTransaction.feeSats
    : 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View>
            <Text style={styles.eyebrow}>DIVINO BITCOIN</Text>
            <Text style={styles.title}>Sua carteira</Text>
          </View>
          <Text
            accessibilityLabel={state.settings.hideBalance ? "Mostrar saldo" : "Ocultar saldo"}
            accessibilityRole="button"
            onPress={() => void setHideBalance(!state.settings.hideBalance)}
            style={styles.visibilityAction}
          >
            {state.settings.hideBalance ? "Mostrar" : "Ocultar"}
          </Text>
        </View>

        <DemoStatusBanner />

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo disponível</Text>
            <View style={styles.lightningPill}>
              <MaterialIcons name="bolt" size={15} color="#F7931A" />
              <Text style={styles.lightningText}>LIGHTNING DEMO</Text>
            </View>
          </View>
          <Text style={styles.balance}>{balanceLabel}</Text>
          <Text style={styles.balanceSubtext}>Dados locais de teste</Text>
        </View>

        <View style={styles.actions}>
          <Text
            accessibilityRole="button"
            accessibilityLabel="Receber"
            onPress={() => router.push("/android-receive")}
            style={styles.primaryAction}
          >
            <MaterialIcons name="arrow-downward" size={23} color="#FFFFFF" />{"\n"}
            <Text style={styles.primaryActionText}>Receber</Text>
          </Text>
          <Text
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            onPress={() => router.push("/android-send")}
            style={styles.secondaryAction}
          >
            <MaterialIcons name="arrow-upward" size={23} color="#F7931A" />{"\n"}
            <Text style={styles.secondaryActionText}>Enviar</Text>
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Atividade recente</Text>
          <Text style={styles.sectionHint}>Em breve</Text>
        </View>
        <View style={styles.transactionCard}>
          {latestTransaction ? (
            <View style={styles.transactionRow}>
              <View style={[styles.transactionIcon, latestTransaction.direction === "incoming" ? styles.transactionIconIncoming : styles.transactionIconOutgoing]}>
                <MaterialIcons name={latestTransaction.direction === "incoming" ? "arrow-downward" : "arrow-upward"} size={19} color={latestTransaction.direction === "incoming" ? "#16803A" : "#B45309"} />
              </View>
              <View style={styles.transactionInfo}>
                <Text numberOfLines={1} style={styles.transactionTitle}>{latestTransaction.memo || latestTransaction.counterparty}</Text>
                <Text style={styles.transactionMeta}>{formatDateTime(latestTransaction.createdAt)}</Text>
              </View>
              <Text style={[styles.transactionAmount, latestTransaction.direction === "incoming" ? styles.amountIncoming : styles.amountOutgoing]}>
                {latestTransaction.direction === "incoming" ? "+" : "−"}{formatSats(latestTransactionTotal)}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Nenhum movimento local ainda.</Text>
          )}
        </View>

        <View style={styles.protectionCard}>
          <View style={styles.protectionIcon}>
            <MaterialIcons name="shield" size={20} color="#16803A" />
          </View>
          <View style={styles.protectionText}>
            <Text style={styles.protectionTitle}>Segurança em primeiro lugar</Text>
            <Text style={styles.protectionDescription}>Nenhuma fonte externa está conectada. Saldos e movimentos desta tela são somente locais.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { alignItems: "center", backgroundColor: "#F7F9FC", flex: 1, justifyContent: "center" },
  screen: { backgroundColor: "#F7F9FC", flex: 1 },
  content: { gap: 18, paddingHorizontal: 20 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6, marginTop: 4 },
  visibilityAction: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 18, borderWidth: 1, color: "#374151", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 13, paddingVertical: 10 },
  balanceCard: { backgroundColor: "#0D1117", borderRadius: 24, gap: 10, minHeight: 176, padding: 22 },
  balanceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { color: "#B9C3D0", fontSize: 14, fontWeight: "600" },
  lightningPill: { alignItems: "center", backgroundColor: "#FFF3E0", borderRadius: 99, flexDirection: "row", gap: 3, paddingHorizontal: 9, paddingVertical: 5 },
  lightningText: { color: "#B45309", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  balance: { color: "#FFFFFF", fontSize: 34, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -1.1, marginTop: 12 },
  balanceSubtext: { color: "#8793A5", fontSize: 13 },
  actions: { flexDirection: "row", gap: 12 },
  primaryAction: { backgroundColor: "#F7931A", borderRadius: 18, color: "#FFFFFF", flex: 1, fontSize: 23, fontWeight: "800", lineHeight: 34, overflow: "hidden", paddingVertical: 22, textAlign: "center" },
  secondaryAction: { backgroundColor: "#FFFFFF", borderColor: "#FAD9AA", borderRadius: 18, borderWidth: 1, color: "#F7931A", flex: 1, fontSize: 23, fontWeight: "800", lineHeight: 34, overflow: "hidden", paddingVertical: 22, textAlign: "center" },
  primaryActionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryActionText: { color: "#B45309", fontSize: 16, fontWeight: "800" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  sectionTitle: { color: "#101828", fontSize: 18, fontWeight: "700" },
  sectionHint: { color: "#6B7280", fontSize: 13, fontWeight: "600" },
  transactionCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  transactionRow: { alignItems: "center", flexDirection: "row", gap: 12, padding: 16 },
  transactionIcon: { alignItems: "center", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  transactionIconIncoming: { backgroundColor: "#E8F8ED" },
  transactionIconOutgoing: { backgroundColor: "#FFF3E0" },
  transactionInfo: { flex: 1, gap: 3 },
  transactionTitle: { color: "#1F2937", fontSize: 14, fontWeight: "700" },
  transactionMeta: { color: "#6B7280", fontSize: 12 },
  transactionAmount: { fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "800" },
  amountIncoming: { color: "#16803A" },
  amountOutgoing: { color: "#B45309" },
  emptyText: { color: "#6B7280", padding: 20, textAlign: "center" },
  protectionCard: { alignItems: "flex-start", backgroundColor: "#F0FBF3", borderColor: "#D7F0DE", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 15 },
  protectionIcon: { alignItems: "center", backgroundColor: "#DFF7E7", borderRadius: 14, height: 34, justifyContent: "center", width: 34 },
  protectionText: { flex: 1, gap: 4 },
  protectionTitle: { color: "#146C31", fontSize: 14, fontWeight: "800" },
  protectionDescription: { color: "#38744A", fontSize: 12, lineHeight: 17 },
});
