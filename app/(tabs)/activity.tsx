import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TransactionRow } from "@/components/wallet/transaction-row";
import { useWallet } from "@/lib/wallet-context";

export default function ActivityScreen() {
  const router = useRouter();
  const { state, isReady } = useWallet();
  if (!isReady || !state) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#0A84FF" /></ScreenContainer>;
  return <ScreenContainer containerClassName="bg-[#F7F9FC]" safeAreaClassName="bg-[#F7F9FC]"><FlatList data={state.transactions} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListHeaderComponent={<View style={styles.header}><Text style={styles.eyebrow}>HISTÓRICO LOCAL</Text><Text style={styles.title}>Atividade</Text><Text style={styles.description}>Movimentos criados no modo de demonstração deste aparelho.</Text></View>} renderItem={({ item }) => <View style={styles.card}><TransactionRow transaction={item} onPress={() => router.push(`/transaction/${item.id}`)} /></View>} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Ainda não há movimentos</Text><Text style={styles.emptyText}>Solicitações recebidas e pagamentos simulados aparecerão aqui.</Text></View>} /></ScreenContainer>;
}

const styles = StyleSheet.create({
  list: { gap: 10, padding: 20, paddingBottom: 28 }, header: { gap: 7, marginBottom: 12, marginTop: 4 }, eyebrow: { color: "#0A84FF", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 }, description: { color: "#667085", fontSize: 14, lineHeight: 20 }, card: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 16, borderWidth: 1, overflow: "hidden" }, empty: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, gap: 7, padding: 28 }, emptyTitle: { color: "#101828", fontSize: 16, fontWeight: "700" }, emptyText: { color: "#667085", fontSize: 13, lineHeight: 18, textAlign: "center" },
});
