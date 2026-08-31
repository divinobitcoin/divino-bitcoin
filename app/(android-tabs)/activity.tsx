import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cores } from "@/constants/palette";
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
        <MaterialIcons name={incoming ? "arrow-downward" : "arrow-upward"} size={20} color={incoming ? cores.sucesso : cores.textoSecundario} />
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
    return <View style={styles.loadingScreen}><ActivityIndicator color={cores.acaoPrimaria} /></View>;
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
              <MaterialIcons name="science" size={17} color={cores.rede} />
              <Text style={styles.demoBadgeText}>Sem pagamentos ou recebimentos reais</Text>
            </View>
            <Text style={styles.countLabel}>{state.transactions.length} {state.transactions.length === 1 ? "movimento local" : "movimentos locais"}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><MaterialIcons name="receipt-long" size={24} color={cores.textoTerciario} /></View>
            <Text style={styles.emptyTitle}>Ainda não há movimentos</Text>
            <Text style={styles.emptyText}>Solicitações recebidas e pagamentos simulados aparecerão aqui.</Text>
          </View>
        }
      />
    </View>
  );
}

/**
 * Cores por nome de função, de `constants/palette.ts`. Tela invertida de claro
 * para escuro — ver a nota em `(android-tabs)/index.tsx` sobre por que isto é
 * inversão de tema e não troca de hexadecimal.
 *
 * Duas decisões que mudam significado, não só aparência:
 *
 * 1. **O selo de demonstração passa a usar `cores.rede`.** Ele usava
 *    `#E6F4FE` com texto `#085EAF` — o mesmo azul claro que veio do template
 *    do ícone do Android e que nunca foi cor de marca. O selo diz "sem
 *    pagamentos ou recebimentos reais", que é exatamente o papel que
 *    `cores.rede` existe para cumprir: sinalizar ambiente que não é real, de
 *    forma que não se confunda com nenhum outro elemento da tela (`T10`).
 *
 * 2. **Saída de valor deixa de ser pintada com a cor de alerta.** Era
 *    `#B45309` em todo movimento de saída. Depois da separação de papéis por
 *    Delta-E, `aviso` significa aviso — e um envio de rotina não é um aviso.
 *    Saída fica em texto neutro; só entrada ganha cor. Mesma decisão da tela
 *    inicial, para as duas telas contarem a mesma história.
 */
const styles = StyleSheet.create({
  loadingScreen: { alignItems: "center", backgroundColor: cores.fundo, flex: 1, justifyContent: "center" },
  screen: { backgroundColor: cores.fundo, flex: 1 },
  list: { paddingHorizontal: 20 },
  header: { gap: 8, marginBottom: 16 },
  // Marca, não ação — mesmo critério da tela inicial.
  eyebrow: { color: cores.acento, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: cores.textoPrimario, fontSize: 29, fontWeight: "700", letterSpacing: -0.6 },
  description: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
  demoBadge: { alignItems: "center", backgroundColor: cores.superficieAlta, borderColor: cores.rede, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 7, paddingHorizontal: 12, paddingVertical: 10 },
  demoBadgeText: { color: cores.rede, fontSize: 13, fontWeight: "600" },
  countLabel: { color: cores.textoSecundario, fontSize: 13, fontWeight: "700", marginTop: 8 },
  transactionCard: { alignItems: "center", backgroundColor: cores.superficie, flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 16 },
  separator: { backgroundColor: cores.borda, height: StyleSheet.hairlineWidth, marginLeft: 62 },
  transactionIcon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  incomingIcon: { backgroundColor: cores.sucessoSuperficie },
  outgoingIcon: { backgroundColor: cores.superficieAlta },
  transactionContent: { flex: 1, gap: 3 },
  transactionTitle: { color: cores.textoPrimario, fontSize: 15, fontWeight: "700" },
  transactionMeta: { color: cores.textoSecundario, fontSize: 12 },
  amountColumn: { alignItems: "flex-end", gap: 3 },
  transactionAmount: { fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: "800" },
  incomingAmount: { color: cores.sucesso },
  outgoingAmount: { color: cores.textoPrimario },
  feeText: { color: cores.textoTerciario, fontSize: 10 },
  detailAction: { color: cores.acaoSecundariaTexto, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginLeft: 48, paddingVertical: 4 },
  emptyCard: { alignItems: "center", backgroundColor: cores.superficie, borderColor: cores.borda, borderRadius: 18, borderWidth: 1, gap: 8, padding: 28 },
  emptyIcon: { alignItems: "center", backgroundColor: cores.superficieAlta, borderRadius: 20, height: 40, justifyContent: "center", marginBottom: 3, width: 40 },
  emptyTitle: { color: cores.textoPrimario, fontSize: 16, fontWeight: "700" },
  emptyText: { color: cores.textoSecundario, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
