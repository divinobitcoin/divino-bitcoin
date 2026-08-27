import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { cores } from "@/constants/palette";
import { haptic } from "@/lib/haptics";
import { SIGNET_NETWORK } from "@/shared/bitcoin-network";
import { fetchAddressSummary, type EsploraAddressSummary } from "@/shared/esplora-client";

/**
 * Endpoint público de partida. Nenhuma credencial é necessária. Quando o
 * Esplora auto-hospedado do próprio nó estiver pronto, este valor passa a
 * ser configurável em vez de fixo — decisão pendente, registrada em
 * 26/08/2026.
 */
const DEFAULT_ESPLORA_BASE_URL = "https://mempool.space/signet/api";

function formatSats(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat("pt-BR").format(Math.abs(value))} sats`;
}

export default function SignetWatchScreen() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [summary, setSummary] = useState<EsploraAddressSummary | null>(null);

  async function checkAddress() {
    const trimmed = address.trim();
    if (!trimmed) {
      setStatus("error");
      setErrorMessage("Cole um endereço Signet primeiro.");
      return;
    }

    haptic.medium();
    setStatus("loading");
    setErrorMessage("");
    setSummary(null);

    try {
      const result = await fetchAddressSummary({ baseUrl: DEFAULT_ESPLORA_BASE_URL }, trimmed);
      setSummary(result);
      setStatus("done");
      haptic.success();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Falha desconhecida ao consultar o endereço.");
      haptic.error();
    }
  }

  return (
    <ScreenContainer containerStyle={styles.tela} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FERRAMENTA DE TESTE — NÃO É A CARTEIRA FINAL</Text>
          <Text style={styles.title}>Observar endereço {SIGNET_NETWORK.label}</Text>
        </View>

        <View style={styles.noticeCard}>
          <MaterialIcons name="info" size={20} color={cores.aviso} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitle}>Endereço de observação manual</Text>
            <Text style={styles.noticeText}>
              Cole um endereço {SIGNET_NETWORK.label} que você já controla (por exemplo, de uma faucet). Este não é
              o endereço da sua futura carteira — o cofre nativo ainda não gera endereços reais. Isto só lê saldo
              público; nenhuma chave, seed ou credencial é usada aqui.
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Endereço</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="tb1q..."
            placeholderTextColor={cores.textoTerciario}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void checkAddress()}
          disabled={status === "loading"}
          android_ripple={{ color: cores.ondulacaoEscura }}
          style={[styles.button, status === "loading" && styles.buttonDisabled]}
        >
          {status === "loading" ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Consultar saldo real</Text>}
        </Pressable>

        {status === "error" && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={18} color={cores.perigo} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {status === "done" && summary && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Saldo confirmado</Text>
            <Text style={styles.resultBalance}>{formatSats(summary.chainBalanceSats)}</Text>
            {summary.mempoolBalanceSats !== 0 && (
              <Text style={styles.resultMempool}>
                {summary.mempoolBalanceSats > 0 ? "+" : ""}
                {formatSats(summary.mempoolBalanceSats)} em mempool (ainda não confirmado)
              </Text>
            )}
            <View style={styles.resultDivider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>UTXOs</Text>
              <Text style={styles.resultRowValue}>{summary.utxoCount}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>Transações confirmadas</Text>
              <Text style={styles.resultRowValue}>{summary.chainTxCount}</Text>
            </View>
            <Text style={styles.resultSource}>Fonte: {DEFAULT_ESPLORA_BASE_URL}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tela: { backgroundColor: cores.fundo },
  content: { gap: 16, padding: 20, paddingBottom: 32 },
  header: { gap: 4, marginTop: 4 },
  eyebrow: { color: cores.aviso, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: cores.textoPrimario, fontSize: 24, fontWeight: "700", letterSpacing: -0.4, marginTop: 4 },
  flex: { flex: 1 },
  noticeCard: { alignItems: "flex-start", backgroundColor: cores.avisoSuperficie, borderRadius: 16, flexDirection: "row", gap: 12, padding: 15 },
  noticeTitle: { color: cores.aviso, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  noticeText: { color: cores.textoSecundario, fontSize: 12, lineHeight: 17 },
  inputGroup: { gap: 6 },
  label: { color: cores.textoSecundario, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  input: {
    backgroundColor: cores.superficieAlta, borderColor: cores.borda, borderRadius: 14, borderWidth: 1,
    color: cores.textoPrimario, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13,
  },
  button: { alignItems: "center", backgroundColor: cores.acaoPrimaria, borderRadius: 14, justifyContent: "center", minHeight: 52 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: cores.acaoPrimariaTexto, fontSize: 15, fontWeight: "700" },
  errorCard: { alignItems: "flex-start", backgroundColor: cores.perigoSuperficie, borderRadius: 14, flexDirection: "row", gap: 10, padding: 14 },
  errorText: { color: cores.perigo, flex: 1, fontSize: 13, lineHeight: 18 },
  resultCard: { backgroundColor: cores.superficie, borderRadius: 20, gap: 4, padding: 20 },
  resultLabel: { color: cores.textoSecundario, fontSize: 13, fontWeight: "600" },
  resultBalance: { color: cores.textoPrimario, fontSize: 30, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  resultMempool: { color: cores.rede, fontSize: 13, fontWeight: "600", marginTop: 4 },
  resultDivider: { backgroundColor: cores.borda, height: StyleSheet.hairlineWidth, marginVertical: 12 },
  resultRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  resultRowLabel: { color: cores.textoSecundario, fontSize: 13 },
  resultRowValue: { color: cores.textoPrimario, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "700" },
  resultSource: { color: cores.textoTerciario, fontSize: 10, marginTop: 14 },
});
