import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DemoStatusBanner } from "@/components/demo-status-banner";
import { cores } from "@/constants/palette";
import { useWallet } from "@/lib/wallet-context";
import { formatDateTime, formatSats } from "@/shared/wallet";

export default function AndroidWalletTab() {
  const router = useRouter();
  const { state, isReady, setHideBalance } = useWallet();
  const insets = useSafeAreaInsets();

  if (!isReady || !state) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={cores.acaoPrimaria} />
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
              <MaterialIcons name="bolt" size={15} color={cores.aviso} />
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
            <MaterialIcons name="arrow-downward" size={23} color={cores.acaoPrimariaTexto} />{"\n"}
            <Text style={styles.primaryActionText}>Receber</Text>
          </Text>
          <Text
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            onPress={() => router.push("/android-send")}
            style={styles.secondaryAction}
          >
            <MaterialIcons name="arrow-upward" size={23} color={cores.acaoSecundariaTexto} />{"\n"}
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
                <MaterialIcons name={latestTransaction.direction === "incoming" ? "arrow-downward" : "arrow-upward"} size={19} color={latestTransaction.direction === "incoming" ? cores.sucesso : cores.textoSecundario} />
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
            <MaterialIcons name="shield" size={20} color={cores.sucesso} />
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

/**
 * Cores vêm de `constants/palette.ts`, por nome de função. Esta tela era
 * clara (`#F7F9FC`) num sistema de identidade que **não define tema claro** —
 * ver o cabeçalho do palette. Não foi uma troca de hexadecimal por token: a
 * tela foi invertida, e cada par fundo/texto foi remapeado.
 *
 * Duas decisões que não são só cor, e que valem explicação:
 *
 * 1. **Texto do botão preenchido é escuro** (`acaoPrimariaTexto`). Era branco
 *    sobre laranja, que dá 2,01:1 e reprova em AA. Obsidiana sobre o amarelo
 *    dá 9,97:1. Não é preferência: é a única combinação legível.
 *
 * 2. **Saída de valor não usa `cores.aviso`.** O código anterior pintava todo
 *    valor que sai com o mesmo tom de alerta. Depois da separação de papéis
 *    por Delta-E, `aviso` significa aviso — e um envio de rotina não é um
 *    aviso. Saída fica em texto neutro; só entrada ganha cor (`sucesso`),
 *    porque receber é o evento que o usuário quer notar de relance.
 *
 * A pílula "LIGHTNING DEMO" foi mantida como está. O texto é afirmação de
 * produto, não de estilo — e esta carteira não faz Lightning hoje (marco 0.9,
 * adiado). Trocar o texto é decisão do proprietário, não desta migração.
 */
const styles = StyleSheet.create({
  loadingScreen: { alignItems: "center", backgroundColor: cores.fundo, flex: 1, justifyContent: "center" },
  screen: { backgroundColor: cores.fundo, flex: 1 },
  content: { gap: 18, paddingHorizontal: 20 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  // Marca, não ação: `acento` de propósito. Usar `acaoPrimaria` aqui ensinaria
  // ao usuário que amarelo nem sempre é tocável, que é o sinal que a paleta
  // acabou de separar.
  eyebrow: { color: cores.acento, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: cores.textoPrimario, fontSize: 29, fontWeight: "700", letterSpacing: -0.6, marginTop: 4 },
  visibilityAction: { backgroundColor: cores.superficieAlta, borderColor: cores.borda, borderRadius: 18, borderWidth: 1, color: cores.textoSecundario, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 13, paddingVertical: 10 },
  balanceCard: { backgroundColor: cores.superficie, borderRadius: 24, gap: 10, minHeight: 176, padding: 22 },
  balanceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  balanceLabel: { color: cores.textoSecundario, fontSize: 14, fontWeight: "600" },
  lightningPill: { alignItems: "center", backgroundColor: cores.avisoSuperficie, borderRadius: 99, flexDirection: "row", gap: 3, paddingHorizontal: 9, paddingVertical: 5 },
  lightningText: { color: cores.aviso, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  balance: { color: cores.textoPrimario, fontSize: 34, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -1.1, marginTop: 12 },
  balanceSubtext: { color: cores.textoTerciario, fontSize: 13 },
  actions: { flexDirection: "row", gap: 12 },
  primaryAction: { backgroundColor: cores.acaoPrimaria, borderRadius: 18, color: cores.acaoPrimariaTexto, flex: 1, fontSize: 23, fontWeight: "800", lineHeight: 34, overflow: "hidden", paddingVertical: 22, textAlign: "center" },
  secondaryAction: { backgroundColor: cores.acaoSecundariaFundo, borderColor: cores.acaoSecundariaBorda, borderRadius: 18, borderWidth: 1, color: cores.acaoSecundariaTexto, flex: 1, fontSize: 23, fontWeight: "800", lineHeight: 34, overflow: "hidden", paddingVertical: 22, textAlign: "center" },
  primaryActionText: { color: cores.acaoPrimariaTexto, fontSize: 16, fontWeight: "800" },
  secondaryActionText: { color: cores.acaoSecundariaTexto, fontSize: 16, fontWeight: "800" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  sectionTitle: { color: cores.textoPrimario, fontSize: 18, fontWeight: "700" },
  sectionHint: { color: cores.textoTerciario, fontSize: 13, fontWeight: "600" },
  transactionCard: { backgroundColor: cores.superficie, borderColor: cores.borda, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  transactionRow: { alignItems: "center", flexDirection: "row", gap: 12, padding: 16 },
  transactionIcon: { alignItems: "center", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  transactionIconIncoming: { backgroundColor: cores.sucessoSuperficie },
  transactionIconOutgoing: { backgroundColor: cores.superficieAlta },
  transactionInfo: { flex: 1, gap: 3 },
  transactionTitle: { color: cores.textoPrimario, fontSize: 14, fontWeight: "700" },
  transactionMeta: { color: cores.textoSecundario, fontSize: 12 },
  transactionAmount: { fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "800" },
  amountIncoming: { color: cores.sucesso },
  amountOutgoing: { color: cores.textoPrimario },
  emptyText: { color: cores.textoTerciario, padding: 20, textAlign: "center" },
  protectionCard: { alignItems: "flex-start", backgroundColor: cores.sucessoSuperficie, borderColor: cores.borda, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 15 },
  protectionIcon: { alignItems: "center", backgroundColor: cores.superficieAlta, borderRadius: 14, height: 34, justifyContent: "center", width: 34 },
  protectionText: { flex: 1, gap: 4 },
  protectionTitle: { color: cores.sucesso, fontSize: 14, fontWeight: "800" },
  protectionDescription: { color: cores.textoSecundario, fontSize: 12, lineHeight: 17 },
});
