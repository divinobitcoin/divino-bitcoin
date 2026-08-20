import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/lib/wallet-context";
import { formatDateTime, formatSats, type WalletTransaction } from "@/shared/wallet";

function TransactionItem({ transaction }: { transaction: WalletTransaction }) {
  const router = useRouter();
  const incoming = transaction.direction === "incoming";
  const totalAmount = incoming ? transaction.amountSats : transaction.amountSats + transaction.feeSats;
  const statusLabel = transaction.status === "completed" ? "Concluída" : transaction.status === "pending" ? "Pendente" : "Não concluída";

  return (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIcon, incoming ? styles.incomingIcon : styles.outgoingIcon]}>
        <MaterialIcons name={incoming ? "arrow-downward" : "arrow-upward"} size={20} color={incoming ? "#16803A" : "#B45309"} />
      </View>
      <View style={styles.transactionContent}>
        <Text numberOfLines={1} style={styles.transactionTitle}>{transaction.memo || transaction.counterparty}</Text>
        <Text style={styles.transactionMeta}>{formatDateTime(transaction.createdAt)} · {statusLabel}</Text>
      </View>
      <View style={styles.amountColumn}>
        <Text style={[styles.transactionAmount, incoming ? styles.incomingAmount : styles.outgoingAmount]}>
          {incoming ? "+" : "−"}{formatSats(totalAmount)}
        </Text>
        {transaction.feeSats > 0 && <Text style={styles.feeText}>Taxa {transaction.feeSats} sats</Text>}
      </View>
      <Text
        accessibilityRole="button"
        accessibilityLabel={`Ver detalhes de ${transaction.memo || transaction.counterparty}`}
        onPress={() => router.push({ pathname: "/android-transaction-detail", params: { id: transaction.id } })}
        style={styles.detailAction}
      >
        VER DETALHES
      </Text>
    </View>
  );
}

export default function AndroidActivityTab() {
  const { state, isReady } = useWallet();
  const insets = useSafeAreaInsets();

  if (!isReady || !state) {
    return <View style={styles.loadingScreen}><ActivityIndicator color="#F7931A" /></View>;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={state.transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>HISTÓRICO LOCAL</Text>
            <Text style={styles.title}>Atividade</Text>
            <Text style={styles.description}>Movimentos criados no modo de demonstração deste aparelho.</Text>
            <View style={styles.demoBadge}>
              <MaterialIcons name="science" size={17} color="#085EAF" />
              <Text style={styles.demoBadgeText}>Sem pagamentos ou recebimentos reais</Text>
            </View>
            <Text style={styles.countLabel}>{state.transactions.length} {state.transactions.length === 1 ? "movimento local" : "movimentos locais"}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><MaterialIcons name="receipt-long" size={24} color="#64748B" /></View>
            <Text style={styles.emptyTitle}>Ainda não há movimentos</Text>
            <Text style={styles.emptyText}>Solicitações recebidas e pagamentos simulados aparecerão aqui.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { alignItems: "center", backgroundColor: "#F7F9FC", flex: 1, justifyContent: "center" },
  screen: { backgroundColor: "#F7F9FC", flex: 1 },
  list: { paddingHorizontal: 20 },
  header: { gap: 8, marginBottom: 16 },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 },
  description: { color: "#667085", fontSize: 14, lineHeight: 20 },
  demoBadge: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 12, flexDirection: "row", gap: 8, marginTop: 7, paddingHorizontal: 12, paddingVertical: 10 },
  demoBadgeText: { color: "#085EAF", fontSize: 13, fontWeight: "600" },
  countLabel: { color: "#667085", fontSize: 13, fontWeight: "700", marginTop: 8 },
  transactionCard: { alignItems: "center", backgroundColor: "#FFFFFF", flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 16 },
  separator: { backgroundColor: "#E7EAF0", height: StyleSheet.hairlineWidth, marginLeft: 62 },
  transactionIcon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  incomingIcon: { backgroundColor: "#E9F9EE" },
  outgoingIcon: { backgroundColor: "#FFF3E5" },
  transactionContent: { flex: 1, gap: 3 },
  transactionTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  transactionMeta: { color: "#6B7280", fontSize: 12 },
  amountColumn: { alignItems: "flex-end", gap: 3 },
  transactionAmount: { fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: "800" },
  incomingAmount: { color: "#16803A" },
  outgoingAmount: { color: "#B45309" },
  feeText: { color: "#6B7280", fontSize: 10 },
  detailAction: { color: "#B45309", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginLeft: 48, paddingVertical: 4 },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, gap: 8, padding: 28 },
  emptyIcon: { alignItems: "center", backgroundColor: "#EEF2F6", borderRadius: 20, height: 40, justifyContent: "center", marginBottom: 3, width: 40 },
  emptyTitle: { color: "#101828", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#667085", fontSize: 13, lineHeight: 18, textAlign: "center" },
});
