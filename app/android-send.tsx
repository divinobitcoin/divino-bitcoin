import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/lib/wallet-context";
import { formatSats } from "@/shared/wallet";

const DEMO_REFERENCE = "lnbc-demo-teste";

function parseSats(value: string): number {
  return Number(value.replace(/\D/g, ""));
}

export default function AndroidSendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReady, payReference, state } = useWallet();
  const [reference, setReference] = useState(DEMO_REFERENCE);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReferencePasted, setIsReferencePasted] = useState(false);

  const amountSats = useMemo(() => parseSats(amount), [amount]);
  const feeSats = useMemo(() => Math.max(1, Math.ceil(amountSats * 0.002)), [amountSats]);
  const totalSats = amountSats + feeSats;

  function beginReview() {
    if (!reference.trim().toLowerCase().startsWith("lnbc-demo-")) {
      Alert.alert(
        "Use a referência de demonstração",
        `Mantenha "lnbc-demo-" no início. O exemplo já preenchido é ${DEMO_REFERENCE}.`,
      );
      return;
    }
    if (!Number.isFinite(amountSats) || amountSats < 1) {
      Alert.alert("Informe o valor", "Digite pelo menos 1 sat antes de revisar o pagamento.");
      return;
    }
    setIsReviewing(true);
  }

  async function pasteDemoReference() {
    try {
      const pastedReference = (await Clipboard.getStringAsync()).trim().toLowerCase();
      if (!pastedReference) {
        Alert.alert("Área de transferência vazia", "Copie uma referência de demonstração antes de colar.");
        return;
      }
      if (!pastedReference.startsWith("lnbc-demo-")) {
        Alert.alert("Referência incompatível", 'Copie uma referência local iniciada por "lnbc-demo-".');
        return;
      }
      setReference(pastedReference);
      setIsReferencePasted(true);
    } catch {
      Alert.alert("Não foi possível colar", "Digite ou cole a referência manualmente no campo acima.");
    }
  }

  async function confirmPayment() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const result = await payReference(reference, amountSats, memo);
    setIsSubmitting(false);

    if (result.error) {
      Alert.alert("Pagamento não concluído", result.error);
      return;
    }

    Alert.alert(
      "Pagamento simulado concluído",
      `${formatSats(totalSats)} foram descontados do saldo demonstrativo, incluindo a taxa estimada.`,
      [{ text: "Ver atividade", onPress: () => router.replace("/(android-tabs)/activity") }],
    );
  }

  if (!isReady || !state) {
    return <View style={styles.loadingScreen}><ActivityIndicator color="#F7931A" /></View>;
  }

  if (isReviewing) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="button" onPress={() => setIsReviewing(false)} style={styles.backAction}>‹ Editar pagamento</Text>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><MaterialIcons name="arrow-upward" size={27} color="#FFFFFF" /></View>
            <Text style={styles.title}>Revisar pagamento</Text>
            <Text style={styles.subtitle}>Confira os dados. Esta operação só atualiza a carteira local de demonstração.</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text style={styles.label}>Você envia</Text><Text style={styles.value}>{formatSats(amountSats)}</Text></View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}><Text style={styles.label}>Taxa estimada</Text><Text style={styles.value}>{formatSats(feeSats)}</Text></View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total demonstrativo</Text><Text style={styles.totalValue}>{formatSats(totalSats)}</Text></View>
          </View>

          <View style={styles.referenceCard}>
            <Text style={styles.fieldLabel}>DESTINO LIGHTNING</Text>
            <Text selectable style={styles.reference}>{reference.trim()}</Text>
            {memo.trim() ? <Text style={styles.memo}>{memo.trim()}</Text> : null}
          </View>

          <View style={styles.warningCard}>
            <MaterialIcons name="verified-user" size={20} color="#146C31" />
            <Text style={styles.warningText}>Nenhuma fonte externa será acionada. Esta confirmação só cria uma saída no histórico local.</Text>
          </View>

          <Text
            accessibilityRole="button"
            onPress={() => void confirmPayment()}
            style={[styles.primaryAction, isSubmitting && styles.actionDisabled]}
          >
            {isSubmitting ? "CONFIRMANDO..." : "CONFIRMAR PAGAMENTO SIMULADO"}
          </Text>
          <Text accessibilityRole="button" onPress={() => router.replace("/(android-tabs)")} style={styles.secondaryAction}>CANCELAR</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}>‹ Voltar à carteira</Text>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MODO DE DEMONSTRAÇÃO</Text>
          <Text style={styles.title}>Enviar</Text>
          <Text style={styles.subtitle}>Simule um pagamento Lightning local. Nenhum bitcoin real é enviado.</Text>
        </View>

        <View style={styles.balanceNotice}>
          <MaterialIcons name="account-balance-wallet" size={18} color="#085EAF" />
          <Text style={styles.balanceNoticeText}>Saldo demonstrativo disponível: {formatSats(state.balanceSats)}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>REFERÊNCIA DEMONSTRATIVA</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setReference(value.toLowerCase());
              setIsReferencePasted(false);
            }}
            placeholder={DEMO_REFERENCE}
            placeholderTextColor="#98A2B3"
            returnKeyType="next"
            style={styles.referenceInput}
            value={reference}
          />
          <Text style={styles.fieldHint}>O exemplo local já está preenchido. O começo <Text style={styles.hintCode}>lnbc-demo-</Text> identifica um teste sem rede Lightning.</Text>
          <View style={styles.referenceActions}>
            <Text
              accessibilityRole="button"
              accessibilityLabel="Colar referência demonstrativa da área de transferência"
              onPress={() => void pasteDemoReference()}
              style={styles.sampleAction}
            >
              {isReferencePasted ? "REFERÊNCIA COLADA" : "COLAR REFERÊNCIA COPIADA"}
            </Text>
            <Text
              accessibilityRole="button"
              onPress={() => {
                setReference(DEMO_REFERENCE);
                setIsReferencePasted(false);
              }}
              style={styles.sampleAction}
            >
              USAR EXEMPLO
            </Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>VALOR EM SATS</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setAmount}
            placeholder="Ex.: 1.000"
            placeholderTextColor="#98A2B3"
            returnKeyType="next"
            style={styles.amountInput}
            value={amount}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>DESCRIÇÃO OPCIONAL</Text>
          <TextInput
            onChangeText={setMemo}
            placeholder="Ex.: Pagamento de teste"
            placeholderTextColor="#98A2B3"
            returnKeyType="done"
            style={styles.textInput}
            value={memo}
          />
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={20} color="#B45309" />
          <Text style={styles.infoText}>Quando uma fonte Lightning auditada for conectada, a validação de invoice e a confirmação poderão ser reforçadas. Por enquanto, o envio permanece local.</Text>
        </View>

        <Text accessibilityRole="button" onPress={beginReview} style={styles.primaryAction}>REVISAR PAGAMENTO</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { alignItems: "center", backgroundColor: "#F7F9FC", flex: 1, justifyContent: "center" },
  screen: { backgroundColor: "#F7F9FC", flex: 1 },
  content: { gap: 18, paddingHorizontal: 20 },
  backAction: { color: "#B45309", fontSize: 14, fontWeight: "800", paddingVertical: 8 },
  header: { gap: 7, marginTop: 2 },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.05 },
  hero: { alignItems: "center", gap: 9, paddingHorizontal: 8, paddingTop: 5 },
  heroIcon: { alignItems: "center", backgroundColor: "#F7931A", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { color: "#667085", fontSize: 14, lineHeight: 20, textAlign: "left" },
  balanceNotice: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 14, flexDirection: "row", gap: 9, padding: 13 },
  balanceNoticeText: { color: "#286A9E", flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  formCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, gap: 8, padding: 18 },
  fieldLabel: { color: "#667085", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  fieldHint: { color: "#667085", fontSize: 12, lineHeight: 17 },
  hintCode: { color: "#344054", fontFamily: "monospace", fontWeight: "800" },
  referenceInput: { color: "#101828", fontFamily: "monospace", fontSize: 14, paddingVertical: 7 },
  referenceActions: { alignItems: "flex-start", gap: 4 },
  sampleAction: { color: "#B45309", fontFamily: "monospace", fontSize: 12, fontWeight: "800", paddingVertical: 5 },
  amountInput: { color: "#101828", fontSize: 30, fontVariant: ["tabular-nums"], fontWeight: "700", paddingVertical: 5 },
  textInput: { color: "#101828", fontSize: 16, paddingVertical: 7 },
  divider: { backgroundColor: "#E7EAF0", height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoCard: { alignItems: "flex-start", backgroundColor: "#FFF7ED", borderColor: "#FDE2C2", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  infoText: { color: "#9A4D09", flex: 1, fontSize: 12, lineHeight: 17 },
  primaryAction: { backgroundColor: "#F7931A", borderRadius: 15, color: "#FFFFFF", fontSize: 15, fontWeight: "800", overflow: "hidden", paddingVertical: 18, textAlign: "center" },
  secondaryAction: { borderColor: "#FAD9AA", borderRadius: 15, borderWidth: 1, color: "#B45309", fontSize: 14, fontWeight: "800", overflow: "hidden", paddingVertical: 17, textAlign: "center" },
  actionDisabled: { opacity: 0.65 },
  summaryCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, paddingHorizontal: 17 },
  summaryRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 55 },
  label: { color: "#667085", fontSize: 14 },
  value: { color: "#344054", fontSize: 15, fontVariant: ["tabular-nums"], fontWeight: "600" },
  totalLabel: { color: "#101828", fontSize: 16, fontWeight: "800" },
  totalValue: { color: "#16803A", fontSize: 18, fontVariant: ["tabular-nums"], fontWeight: "800" },
  referenceCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, gap: 8, padding: 17 },
  reference: { color: "#475467", fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  memo: { color: "#667085", fontSize: 13, marginTop: 3 },
  warningCard: { alignItems: "flex-start", backgroundColor: "#F0FBF3", borderColor: "#D7F0DE", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  warningText: { color: "#38744A", flex: 1, fontSize: 12, lineHeight: 17 },
});
