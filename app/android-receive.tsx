import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CampoTexto } from "@/components/campo-texto";
import { DemoStatusBanner } from "@/components/demo-status-banner";
import { useWallet } from "@/lib/wallet-context";
import { formatSats, type LightningInvoice } from "@/shared/wallet";

export default function AndroidReceiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createReceiveRequest, settleReceiveRequest } = useWallet();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [invoice, setInvoice] = useState<LightningInvoice | null>(null);
  const [isReferenceCopied, setIsReferenceCopied] = useState(false);

  async function createRequest() {
    const result = await createReceiveRequest(Number(amount.replace(/\D/g, "")), memo);
    if (result.error || !result.invoice) {
      Alert.alert("Não foi possível criar", result.error ?? "Tente novamente.");
      return;
    }
    setInvoice(result.invoice);
    setIsReferenceCopied(false);
  }

  async function copyReference() {
    if (!invoice) return;
    try {
      await Clipboard.setStringAsync(invoice.reference);
      setIsReferenceCopied(true);
    } catch {
      Alert.alert("Não foi possível copiar", "Selecione a referência acima para copiá-la manualmente.");
    }
  }

  async function simulateReceipt() {
    if (!invoice) return;
    const result = await settleReceiveRequest(invoice.id);
    if (result.error) {
      Alert.alert("Não foi possível concluir", result.error);
      return;
    }
    setInvoice({ ...invoice, status: "settled" });
    Alert.alert(
      "Recebimento registrado",
      `${formatSats(invoice.amountSats)} foram adicionados ao saldo demonstrativo.`,
      [{ text: "Ver atividade", onPress: () => router.replace("/(android-tabs)/activity") }],
    );
  }

  if (invoice) {
    const isSettled = invoice.status === "settled";
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}>‹ Voltar à carteira</Text>
          <View style={styles.successHeader}>
            <View style={[styles.successIcon, isSettled && styles.settledIcon]}>
              <MaterialIcons name={isSettled ? "check" : "arrow-downward"} size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{isSettled ? "Recebimento registrado" : "Solicitação criada"}</Text>
            <Text style={styles.subtitle}>
              {isSettled
                ? "O saldo e o histórico locais foram atualizados no modo de demonstração."
                : "Esta referência é local e serve apenas para testar o recebimento."}
            </Text>
          </View>

          <View style={styles.amountCard}>
            <Text style={styles.amountCaption}>{isSettled ? "Você recebeu" : "Você vai receber"}</Text>
            <Text style={styles.amountValue}>{formatSats(invoice.amountSats)}</Text>
            <Text style={styles.memoValue}>{invoice.memo}</Text>
          </View>

          <View style={styles.referenceCard}>
            <Text style={styles.fieldLabel}>REFERÊNCIA DE DEMONSTRAÇÃO</Text>
            <Text selectable style={styles.reference}>{invoice.reference}</Text>
          </View>

          <View style={styles.warningCard}>
            <MaterialIcons name="info-outline" size={20} color="#B45309" />
            <Text style={styles.warningText}>Nenhuma invoice BOLT11, QR code ou pagamento real é gerado nesta versão.</Text>
          </View>

          {!isSettled ? (
            <Text accessibilityRole="button" onPress={() => void simulateReceipt()} style={styles.primaryAction}>SIMULAR RECEBIMENTO</Text>
          ) : (
            <Text accessibilityRole="button" onPress={() => router.replace("/(android-tabs)/activity")} style={styles.primaryAction}>VER ATIVIDADE</Text>
          )}
          <Text
            accessibilityRole="button"
            accessibilityLabel="Copiar referência de demonstração"
            onPress={() => void copyReference()}
            style={styles.secondaryAction}
          >
            {isReferenceCopied ? "REFERÊNCIA COPIADA" : "COPIAR REFERÊNCIA"}
          </Text>
          <Text
            accessibilityRole="button"
            onPress={() => void Share.share({ message: `Referência de demonstração Divino Bitcoin: ${invoice.reference}` })}
            style={styles.secondaryAction}
          >
            COMPARTILHAR REFERÊNCIA
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}>‹ Voltar à carteira</Text>
        <View style={styles.header}>
          <DemoStatusBanner />
          <Text style={styles.eyebrow}>FLUXO SEM REDE + SIMULAÇÃO LOCAL</Text>
          <Text style={styles.title}>Receber</Text>
          <Text style={styles.subtitle}>Crie uma referência local em Signet/laboratório para testar o fluxo de recebimento com segurança.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>VALOR EM SATS</Text>
          <CampoTexto
            value={amount}
            onChangeText={setAmount}
            placeholder="Ex.: 1.000"
            placeholderTextColor="#98A2B3"
            keyboardType="numeric"
            returnKeyType="done"
            style={styles.amountInput}
          />
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>DESCRIÇÃO OPCIONAL</Text>
          <CampoTexto
            value={memo}
            onChangeText={setMemo}
            placeholder="Ex.: Venda de café"
            placeholderTextColor="#98A2B3"
            returnKeyType="done"
            style={styles.textInput}
          />
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="bolt" size={21} color="#085EAF" />
          <Text style={styles.infoText}>Esta versão cria apenas uma referência local. Nenhuma invoice BOLT11, QR code ou conexão Lightning é gerada.</Text>
        </View>

        <Text accessibilityRole="button" onPress={() => void createRequest()} style={styles.primaryAction}>CRIAR SOLICITAÇÃO</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F7F9FC", flex: 1 },
  content: { gap: 18, paddingHorizontal: 20 },
  backAction: { color: "#B45309", fontSize: 14, fontWeight: "800", paddingVertical: 8 },
  header: { gap: 7, marginTop: 2 },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.05 },
  title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { color: "#667085", fontSize: 14, lineHeight: 20 },
  formCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, gap: 8, padding: 18 },
  fieldLabel: { color: "#667085", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  amountInput: { color: "#101828", fontSize: 30, fontVariant: ["tabular-nums"], fontWeight: "700", paddingVertical: 5 },
  textInput: { color: "#101828", fontSize: 16, paddingVertical: 7 },
  divider: { backgroundColor: "#E7EAF0", height: StyleSheet.hairlineWidth, marginVertical: 10 },
  infoCard: { alignItems: "flex-start", backgroundColor: "#E6F4FE", borderRadius: 15, flexDirection: "row", gap: 11, padding: 14 },
  infoText: { color: "#286A9E", flex: 1, fontSize: 13, lineHeight: 18 },
  primaryAction: { backgroundColor: "#F7931A", borderRadius: 15, color: "#FFFFFF", fontSize: 15, fontWeight: "800", overflow: "hidden", paddingVertical: 18, textAlign: "center" },
  secondaryAction: { borderColor: "#FAD9AA", borderRadius: 15, borderWidth: 1, color: "#B45309", fontSize: 14, fontWeight: "800", overflow: "hidden", paddingVertical: 17, textAlign: "center" },
  successHeader: { alignItems: "center", gap: 9, paddingHorizontal: 10, paddingTop: 4 },
  successIcon: { alignItems: "center", backgroundColor: "#F7931A", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  settledIcon: { backgroundColor: "#16803A" },
  amountCard: { alignItems: "center", backgroundColor: "#0D1117", borderRadius: 22, gap: 8, padding: 22 },
  amountCaption: { color: "#B9C3D0", fontSize: 13, fontWeight: "600" },
  amountValue: { color: "#FFFFFF", fontSize: 31, fontVariant: ["tabular-nums"], fontWeight: "800" },
  memoValue: { color: "#B9C3D0", fontSize: 13, textAlign: "center" },
  referenceCard: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 16, borderWidth: 1, gap: 9, padding: 16 },
  reference: { color: "#101828", fontFamily: "monospace", fontSize: 14, lineHeight: 21 },
  warningCard: { alignItems: "flex-start", backgroundColor: "#FFF7ED", borderColor: "#FDE2C2", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  warningText: { color: "#9A4D09", flex: 1, fontSize: 12, lineHeight: 17 },
});
