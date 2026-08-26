import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { DemoStatusBanner } from "@/components/demo-status-banner";
import { ScreenContainer } from "@/components/screen-container";
import { validateBolt11Invoice, type Bolt11Invoice } from "@/lib/bolt11";
import { haptic } from "@/lib/haptics";
import { useWallet } from "@/lib/wallet-context";
import { DEMO_PAYMENT_FIXTURE, isDemoLightningReference } from "@/shared/demo-fixtures";

export default function SendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invoice?: string }>();
  const { state } = useWallet();
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [invoice, setInvoice] = useState<Bolt11Invoice | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const applyInvoice = useCallback((value: string) => {
    if (isDemoLightningReference(value)) {
      setReference(value.trim());
      setInvoice(null);
      setValidationMessage(null);
      return;
    }
    const validation = validateBolt11Invoice(value);
    if (!validation.valid) {
      haptic.error();
      setInvoice(null);
      setValidationMessage(validation.error);
      return;
    }
    haptic.success();
    setReference(validation.invoice.invoice);
    setInvoice(validation.invoice);
    setValidationMessage(null);
    if (validation.invoice.amountSats !== undefined) setAmount(String(validation.invoice.amountSats));
  }, []);

  useEffect(() => {
    if (typeof params.invoice === "string" && params.invoice !== reference) applyInvoice(params.invoice);
  }, [applyInvoice, params.invoice, reference]);

  function reviewPayment() {
    const cleanReference = reference.trim();
    const amountSats = Math.floor(Number(amount.replace(/\D/g, "")));

    if (isDemoLightningReference(cleanReference)) {
      if (!Number.isFinite(amountSats) || amountSats < 1) {
        haptic.error();
        Alert.alert("Informe o valor", "Digite pelo menos 1 sat para a fixture local.");
        return;
      }
      haptic.light();
      router.push({ pathname: "/payment-review", params: { reference: cleanReference, amount: String(amountSats), memo: memo.trim() } });
      return;
    }

    const validation = validateBolt11Invoice(cleanReference);
    if (!validation.valid) {
      haptic.error();
      setInvoice(null);
      setValidationMessage(validation.error);
      Alert.alert("Invoice inválida", validation.error);
      return;
    }
    if (validation.invoice.amountMsats !== undefined && validation.invoice.amountSats === undefined) {
      haptic.error();
      Alert.alert("Valor em millisats", "Esta primeira versão aceita somente invoices cujo valor corresponda a satoshis inteiros.");
      return;
    }
    if (!Number.isFinite(amountSats) || amountSats < 1) {
      haptic.error();
      Alert.alert("Informe o valor", "Digite o valor em sats para esta invoice sem valor definido.");
      return;
    }
    if (validation.invoice.amountSats !== undefined && amountSats !== validation.invoice.amountSats) {
      haptic.error();
      Alert.alert("Valor divergente", `A invoice define ${new Intl.NumberFormat("pt-BR").format(validation.invoice.amountSats)} sats. Ajuste o valor para continuar.`);
      return;
    }
    haptic.light();
    router.push({ pathname: "/payment-review", params: { reference: validation.invoice.invoice, amount: String(amountSats), memo: memo.trim() } });
  }

  return <ScreenContainer containerClassName="bg-[#F7F9FC]" safeAreaClassName="bg-[#F7F9FC]"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><DemoStatusBanner /><View style={styles.header}><Text style={styles.title}>Enviar</Text><Text style={styles.subtitle}>Use a fixture local ou leia/cole uma invoice BOLT11. A confirmação desta demo não envia fundos.</Text></View><View style={styles.balanceBanner}><MaterialIcons name="account-balance-wallet" size={20} color="#0A84FF" /><Text style={styles.balanceText}>Saldo demonstrativo: {state ? `${new Intl.NumberFormat("pt-BR").format(state.balanceSats)} sats` : "carregando"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Usar fixture local de pagamento" onPress={() => { setReference(DEMO_PAYMENT_FIXTURE.reference); setAmount(String(DEMO_PAYMENT_FIXTURE.amountSats)); setMemo(DEMO_PAYMENT_FIXTURE.memo); setInvoice(null); setValidationMessage(null); }} style={({ pressed }) => [styles.fixtureButton, pressed && styles.primaryPressed]}><View style={styles.fixtureIcon}><MaterialIcons name="science" size={20} color="#0A84FF" /></View><View style={styles.scanCopy}><Text style={styles.scanTitle}>Usar fixture local</Text><Text style={styles.scanSubtitle}>{DEMO_PAYMENT_FIXTURE.amountSats.toLocaleString("pt-BR")} sats · sem rede</Text></View><MaterialIcons name="chevron-right" size={24} color="#667085" /></Pressable><Pressable onPress={() => router.push("/scan-invoice")} style={({ pressed }) => [styles.scanButton, pressed && styles.primaryPressed]}><View style={styles.scanIcon}><MaterialIcons name="qr-code-scanner" size={24} color="#0A84FF" /></View><View style={styles.scanCopy}><Text style={styles.scanTitle}>Ler QR Code</Text><Text style={styles.scanSubtitle}>Escaneie uma invoice Lightning</Text></View><MaterialIcons name="chevron-right" size={24} color="#667085" /></Pressable><View style={styles.formCard}><Text style={styles.fieldLabel}>INVOICE OU REFERÊNCIA</Text><TextInput value={reference} onChangeText={(value) => { setReference(value); setInvoice(null); setValidationMessage(null); }} onEndEditing={() => { if (reference.trim()) applyInvoice(reference); }} autoCapitalize="none" autoCorrect={false} placeholder="lnbc..." placeholderTextColor="#98A2B3" returnKeyType="next" style={[styles.textInput, styles.referenceInput]} /><Text style={styles.hint}>Fixtures `lnbc-demo-*` são locais; invoices BOLT11 são apenas verificadas nesta demonstração.</Text>{validationMessage ? <View style={styles.invalidFeedback}><MaterialIcons name="error-outline" size={17} color="#B42318" /><Text style={styles.invalidText}>{validationMessage}</Text></View> : null}{invoice ? <View style={styles.validFeedback}><MaterialIcons name="verified" size={17} color="#067647" /><View style={styles.validCopy}><Text style={styles.validTitle}>Invoice válida · {invoice.network}</Text><Text style={styles.validText}>Payment hash verificado · {invoice.amountSats !== undefined ? `${new Intl.NumberFormat("pt-BR").format(invoice.amountSats)} sats` : "valor informado pelo pagador"}</Text></View></View> : null}<View style={styles.divider} /><Text style={styles.fieldLabel}>VALOR EM SATS</Text><TextInput value={amount} editable={invoice?.amountSats === undefined} onChangeText={setAmount} placeholder="Ex.: 1.000" placeholderTextColor="#98A2B3" keyboardType="numeric" returnKeyType="next" style={[styles.amountInput, invoice?.amountSats !== undefined && styles.lockedAmount]} /><Text style={styles.amountHint}>{invoice?.amountSats !== undefined ? "Valor definido pela invoice; ele não pode ser alterado." : "Obrigatório quando a invoice não contém um valor."}</Text><View style={styles.divider} /><Text style={styles.fieldLabel}>DESCRIÇÃO OPCIONAL</Text><TextInput value={memo} onChangeText={setMemo} placeholder="Ex.: Pagamento de teste" placeholderTextColor="#98A2B3" returnKeyType="done" style={styles.textInput} /></View><View style={styles.warning}><MaterialIcons name="warning-amber" size={20} color="#B85A00" /><Text style={styles.warningText}>Nenhuma fonte externa será acionada. Esta versão apenas valida referências e registra simulações no histórico local.</Text></View><Pressable onPress={reviewPayment} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryButtonText}>Revisar pagamento</Text></Pressable></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { gap: 18, padding: 20, paddingBottom: 34 }, header: { gap: 7, marginTop: 8 }, title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 }, subtitle: { color: "#667085", fontSize: 14, lineHeight: 20 }, balanceBanner: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 13, flexDirection: "row", gap: 9, padding: 13 }, balanceText: { color: "#085EAF", flex: 1, fontSize: 13, fontWeight: "700" },   fixtureButton: { alignItems: "center", backgroundColor: "#F0F9FF", borderColor: "#BAE6FD", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 }, fixtureIcon: { alignItems: "center", backgroundColor: "#DFF3FF", borderRadius: 13, height: 46, justifyContent: "center", width: 46 },
  scanButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#BFDBFE", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 }, scanIcon: { alignItems: "center", backgroundColor: "#EAF4FF", borderRadius: 13, height: 46, justifyContent: "center", width: 46 }, scanCopy: { flex: 1, gap: 2 }, scanTitle: { color: "#101828", fontSize: 16, fontWeight: "800" }, scanSubtitle: { color: "#667085", fontSize: 13 }, formCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, gap: 8, padding: 18 }, fieldLabel: { color: "#667085", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }, textInput: { color: "#101828", fontSize: 16, paddingVertical: 7 }, referenceInput: { fontFamily: "monospace", fontSize: 14 }, hint: { color: "#667085", fontSize: 12, lineHeight: 17 }, validFeedback: { alignItems: "flex-start", backgroundColor: "#ECFDF3", borderRadius: 10, flexDirection: "row", gap: 8, marginTop: 4, padding: 10 }, validCopy: { flex: 1, gap: 2 }, validTitle: { color: "#067647", fontSize: 12, fontWeight: "800" }, validText: { color: "#47765A", fontSize: 11, lineHeight: 15 }, invalidFeedback: { alignItems: "flex-start", backgroundColor: "#FEF3F2", borderRadius: 10, flexDirection: "row", gap: 8, marginTop: 4, padding: 10 }, invalidText: { color: "#B42318", flex: 1, fontSize: 12, lineHeight: 17 }, amountInput: { color: "#101828", fontSize: 30, fontVariant: ["tabular-nums"], fontWeight: "700", paddingVertical: 5 }, lockedAmount: { color: "#667085" }, amountHint: { color: "#667085", fontSize: 12, lineHeight: 17 }, divider: { backgroundColor: "#E7EAF0", height: StyleSheet.hairlineWidth, marginVertical: 10 }, warning: { alignItems: "flex-start", backgroundColor: "#FFF7ED", borderColor: "#FDE2C2", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 }, warningText: { color: "#9A4D09", flex: 1, fontSize: 12, lineHeight: 17 }, primaryButton: { alignItems: "center", backgroundColor: "#0A84FF", borderRadius: 15, justifyContent: "center", minHeight: 54 }, primaryPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
