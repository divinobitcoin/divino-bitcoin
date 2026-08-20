import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/lib/wallet-context";
import { formatDateTime, formatSats, type WalletTransaction } from "@/shared/wallet";

function statusLabel(status: WalletTransaction["status"]) {
  if (status === "completed") return "Concluída";
  if (status === "pending") return "Pendente";
  return "Não concluída";
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function AndroidTransactionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, isReady } = useWallet();
  const [isReferenceCopied, setIsReferenceCopied] = useState(false);

  if (!isReady) {
    return <View style={styles.loadingScreen}><ActivityIndicator color="#F7931A" /></View>;
  }

  const transaction = state?.transactions.find((item) => item.id === id);
  if (!transaction) {
    return (
      <View style={styles.screen}>
        <View style={[styles.notFoundContent, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]}>
          <Text accessibilityRole="button" onPress={() => router.replace("/(android-tabs)/activity")} style={styles.backAction}>‹ Voltar à atividade</Text>
          <View style={styles.notFoundCard}>
            <MaterialIcons name="search-off" size={28} color="#64748B" />
            <Text style={styles.notFoundTitle}>Movimento não encontrado</Text>
            <Text style={styles.notFoundText}>Ele pode ter sido removido da carteira local deste aparelho.</Text>
          </View>
        </View>
      </View>
    );
  }

  const incoming = transaction.direction === "incoming";
  const totalAmount = incoming ? transaction.amountSats : transaction.amountSats + transaction.feeSats;
  const directionLabel = incoming ? "Recebimento" : "Pagamento";
  const reference = transaction.reference;

  async function copyReference() {
    try {
      await Clipboard.setStringAsync(reference);
      setIsReferenceCopied(true);
    } catch {
      Alert.alert("Não foi possível copiar", "Selecione a referência acima para copiá-la manualmente.");
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="button" onPress={() => router.replace("/(android-tabs)/activity")} style={styles.backAction}>‹ Voltar à atividade</Text>

        <View style={styles.hero}>
          <View style={[styles.heroIcon, incoming ? styles.incomingIcon : styles.outgoingIcon]}>
            <MaterialIcons name={incoming ? "arrow-downward" : "arrow-upward"} size={29} color={incoming ? "#16803A" : "#B45309"} />
          </View>
          <Text style={styles.directionLabel}>{directionLabel} em demonstração</Text>
          <Text style={[styles.amountValue, incoming ? styles.incomingAmount : styles.outgoingAmount]}>
            {incoming ? "+" : "−"}{formatSats(totalAmount)}
          </Text>
          {!incoming && <Text style={styles.totalCaption}>Inclui a taxa demonstrativa</Text>}
          <Text style={styles.dateValue}>{formatDateTime(transaction.createdAt)}</Text>
        </View>

        <View style={styles.detailCard}>
          <DetailRow label="Status" value={statusLabel(transaction.status)} />
          <DetailRow label="Descrição" value={transaction.memo} />
          <DetailRow label="Contraparte" value={transaction.counterparty} />
          <DetailRow label="Valor" value={formatSats(transaction.amountSats)} last={incoming} />
          {!incoming && <DetailRow label="Taxa demonstrativa" value={formatSats(transaction.feeSats)} last />}
        </View>

        <View style={styles.referenceCard}>
          <Text style={styles.referenceLabel}>REFERÊNCIA</Text>
          <Text selectable style={styles.reference}>{reference}</Text>
          <Text
            accessibilityRole="button"
            accessibilityLabel="Copiar referência da transação"
            onPress={() => void copyReference()}
            style={styles.copyAction}
          >
            {isReferenceCopied ? "REFERÊNCIA COPIADA" : "COPIAR REFERÊNCIA"}
          </Text>
        </View>

        <View style={styles.disclaimerCard}>
          <MaterialIcons name="science" size={20} color="#085EAF" />
          <Text style={styles.disclaimerText}>Este registro é local e pertence ao modo de demonstração. Não representa uma transação em Bitcoin ou Lightning Network.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { alignItems: "center", backgroundColor: "#F7F9FC", flex: 1, justifyContent: "center" },
  screen: { backgroundColor: "#F7F9FC", flex: 1 },
  content: { gap: 18, paddingHorizontal: 20 },
  notFoundContent: { flex: 1, gap: 28, paddingHorizontal: 20 },
  backAction: { color: "#B45309", fontSize: 14, fontWeight: "800", paddingVertical: 8 },
  hero: { alignItems: "center", gap: 7, paddingHorizontal: 12, paddingTop: 4 },
  heroIcon: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  incomingIcon: { backgroundColor: "#E9F9EE" },
  outgoingIcon: { backgroundColor: "#FFF3E5" },
  directionLabel: { color: "#475467", fontSize: 14, fontWeight: "700", marginTop: 3 },
  amountValue: { fontSize: 31, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -0.8 },
  incomingAmount: { color: "#16803A" },
  outgoingAmount: { color: "#B45309" },
  totalCaption: { color: "#667085", fontSize: 12, marginTop: -3 },
  dateValue: { color: "#667085", fontSize: 13, marginTop: 2 },
  detailCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  detailRow: { alignItems: "flex-start", borderBottomColor: "#E7EAF0", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 14, justifyContent: "space-between", minHeight: 57, paddingHorizontal: 16, paddingVertical: 14 },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { color: "#667085", flex: 0.43, fontSize: 14 },
  detailValue: { color: "#1D2939", flex: 0.57, fontSize: 14, fontWeight: "700", textAlign: "right" },
  referenceCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 16, borderWidth: 1, gap: 9, padding: 16 },
  referenceLabel: { color: "#667085", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  reference: { color: "#344054", fontFamily: "monospace", fontSize: 12, lineHeight: 19 },
  copyAction: { alignSelf: "flex-start", color: "#B45309", fontSize: 12, fontWeight: "800", paddingVertical: 4 },
  disclaimerCard: { alignItems: "flex-start", backgroundColor: "#E6F4FE", borderRadius: 15, flexDirection: "row", gap: 10, padding: 14 },
  disclaimerText: { color: "#286A9E", flex: 1, fontSize: 12, lineHeight: 17 },
  notFoundCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, gap: 8, padding: 28 },
  notFoundTitle: { color: "#101828", fontSize: 17, fontWeight: "800" },
  notFoundText: { color: "#667085", fontSize: 13, lineHeight: 19, textAlign: "center" },
});
