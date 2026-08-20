import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { haptic } from "@/lib/haptics";
import { formatDateTime, formatSats, type WalletTransaction } from "@/shared/wallet";

export function TransactionRow({ transaction, onPress }: { transaction: WalletTransaction; onPress: () => void }) {
  const incoming = transaction.direction === "incoming";
  const amount = incoming ? transaction.amountSats : transaction.amountSats + transaction.feeSats;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir transação ${transaction.memo}`} onPress={() => { haptic.light(); onPress(); }} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.icon, incoming ? styles.incomingIcon : styles.outgoingIcon]}><MaterialIcons name={incoming ? "south-west" : "north-east"} size={20} color={incoming ? "#30D158" : "#F7931A"} /></View>
      <View style={styles.content}><Text style={styles.title} numberOfLines={1}>{transaction.memo}</Text><Text style={styles.meta}>{formatDateTime(transaction.createdAt)}</Text></View>
      <View style={styles.amountColumn}><Text style={[styles.amount, incoming ? styles.incomingAmount : styles.outgoingAmount]}>{incoming ? "+" : "−"}{formatSats(amount)}</Text><Text style={styles.meta}>{transaction.status === "completed" ? "Concluída" : "Pendente"}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", borderBottomColor: "#E7EAF0", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, minHeight: 74, paddingHorizontal: 20 }, rowPressed: { opacity: 0.62 },
  icon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, incomingIcon: { backgroundColor: "#E9F9EE" }, outgoingIcon: { backgroundColor: "#FFF3E5" },
  content: { flex: 1, gap: 3 }, title: { color: "#111827", fontSize: 15, fontWeight: "600" }, meta: { color: "#6B7280", fontSize: 12 }, amountColumn: { alignItems: "flex-end", gap: 3 },
  amount: { fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: "700" }, incomingAmount: { color: "#16803A" }, outgoingAmount: { color: "#B85A00" },
});
