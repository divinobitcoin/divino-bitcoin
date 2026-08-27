import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { cores } from "@/constants/palette";
import { haptic } from "@/lib/haptics";
import { SIGNET_NETWORK } from "@/shared/bitcoin-network";
import { selectCoins } from "@/shared/coin-selection";
import { fetchAddressUtxos, sumUtxoValueSats, type EsploraUtxo } from "@/shared/esplora-client";
import { buildPsbtFromSelection } from "@/shared/psbt-builder";
import {
  BroadcastRejectedError,
  broadcastRawTransaction,
  finalizeSignedPsbt,
  reviewSignedTransaction,
  sumPsbtInputAmounts,
  type TransactionReview,
} from "@/shared/transaction-broadcast";

/**
 * Fluxo PSBT em Signet — ferramenta de teste, não é a carteira final.
 *
 * ## Por que esta tela não assina
 *
 * `app/` é uma das pastas vigiadas pelo `pnpm guard:lab-boundary`, e
 * `shared/psbt-signer` está entre os módulos de laboratório protegidos.
 * Importá-lo aqui reprovaria o CI.
 *
 * Isso não é limitação acidental: a ADR-0001 rejeita manuseio de chave privada
 * no runtime JavaScript, e o guard existe para impedir que essa rejeição
 * escorregue para dentro do aplicativo. A assinatura acontecerá no módulo
 * nativo, atrás dos gates.
 *
 * ## O fluxo que sobra é o fluxo certo
 *
 * Montar aqui, assinar em outro lugar, revisar e transmitir aqui. É exatamente
 * o que o BIP-174 foi especificado para permitir, e é o mesmo fluxo de uma
 * carteira com assinador de hardware. O `roadmap-v1.md` já pedia PSBT
 * justamente para "permitir revisão externa e integração futura com hardware
 * signers".
 *
 * Hoje o assinador externo é `scripts/lab-signet-flow.ts`. Amanhã é o cofre
 * nativo. A costura é a mesma.
 *
 * ## A revisão não confia nesta tela
 *
 * O resumo mostrado antes de transmitir é lido da PSBT assinada que foi colada
 * de volta — inclusive o total das entradas, via `sumPsbtInputAmounts`. Nada
 * dele vem do que foi digitado nos campos acima. É isso que o `T2` do threat
 * model chama de "confirmação vinculada ao payload": se o que voltar não for o
 * que foi montado, os dois blocos divergem na tela.
 */

const DEFAULT_ESPLORA_BASE_URL = "https://mempool.space/signet/api";

type Phase = "origem" | "montada" | "revisada";

function formatSats(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} sats`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Falha desconhecida.";
}

export default function SignetPsbtScreen() {
  const [phase, setPhase] = useState<Phase>("origem");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Fase 1 — origem
  const [originAddress, setOriginAddress] = useState("");
  const [utxos, setUtxos] = useState<EsploraUtxo[] | null>(null);

  // Fase 2 — montagem
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [feeRate, setFeeRate] = useState("2");
  const [changeAddress, setChangeAddress] = useState("");
  const [unsignedPsbt, setUnsignedPsbt] = useState("");
  const [buildNotes, setBuildNotes] = useState<string[]>([]);

  // Fase 3 — revisão e transmissão
  const [signedPsbt, setSignedPsbt] = useState("");
  const [review, setReview] = useState<TransactionReview | null>(null);
  const [rawTxHex, setRawTxHex] = useState("");
  const [broadcastTxid, setBroadcastTxid] = useState("");

  const spendable = utxos ? sumUtxoValueSats(utxos.filter((u) => u.confirmed)) : 0;

  function reset() {
    setPhase("origem");
    setUtxos(null);
    setUnsignedPsbt("");
    setBuildNotes([]);
    setSignedPsbt("");
    setReview(null);
    setRawTxHex("");
    setBroadcastTxid("");
    setError("");
  }

  async function loadUtxos() {
    const address = originAddress.trim();
    if (!address) {
      setError("Cole o endereço de origem primeiro.");
      return;
    }

    haptic.medium();
    setBusy(true);
    setError("");
    try {
      const found = await fetchAddressUtxos({ baseUrl: DEFAULT_ESPLORA_BASE_URL }, address);
      setUtxos(found);
      if (!changeAddress) setChangeAddress(address);
      haptic.success();
    } catch (caught) {
      setError(messageOf(caught));
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  function buildPsbt() {
    if (!utxos) return;

    setError("");
    setBuildNotes([]);

    const targetSats = Number(amount.trim());
    const rate = Number(feeRate.trim());

    if (!Number.isInteger(targetSats) || targetSats <= 0) {
      setError("Informe o valor em satoshis inteiros.");
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Informe uma taxa em sat/vB maior que zero.");
      return;
    }

    haptic.medium();

    try {
      const outcome = selectCoins({
        utxos,
        recipientAddress: destination.trim(),
        targetSats,
        feeRateSatsPerVByte: rate,
        network: "signet",
      });

      if (!outcome.ok) {
        setError(outcome.message);
        haptic.error();
        return;
      }

      const built = buildPsbtFromSelection({
        selection: outcome.selection,
        recipientAddress: destination.trim(),
        changeAddress: changeAddress.trim(),
        network: "signet",
        ownerAddressFor: () => originAddress.trim(),
      });

      const notes = [
        `${outcome.selection.selected.length} entrada(s) escolhida(s)`,
        `Taxa estimada: ${formatSats(outcome.selection.feeSats)} em ${outcome.selection.estimatedVBytes} vB`,
      ];
      if (outcome.selection.droppedToFeeSats > 0) {
        notes.push(
          `${formatSats(outcome.selection.droppedToFeeSats)} de troco viraram taxa por ficarem abaixo da poeira`,
        );
      }
      if (!outcome.selection.hasChange) {
        notes.push("Sem saída de troco: a transação terá uma saída só");
      }

      setBuildNotes(notes);
      setUnsignedPsbt(built.psbtBase64);
      setPhase("montada");
      haptic.success();
    } catch (caught) {
      setError(messageOf(caught));
      haptic.error();
    }
  }

  async function copyUnsigned() {
    await Clipboard.setStringAsync(unsignedPsbt);
    haptic.light();
    Alert.alert("PSBT copiada", "Assine em um assinador externo e cole o resultado abaixo.");
  }

  async function pasteSigned() {
    const text = await Clipboard.getStringAsync();
    setSignedPsbt(text.trim());
    haptic.light();
  }

  function reviewSigned() {
    const psbt = signedPsbt.trim();
    if (!psbt) {
      setError("Cole a PSBT assinada primeiro.");
      return;
    }

    haptic.medium();
    setError("");

    try {
      // Tudo abaixo é lido do payload colado, não do que foi digitado acima.
      const totalInputSats = sumPsbtInputAmounts(psbt);
      const finalized = finalizeSignedPsbt({ signedPsbtBase64: psbt, network: "signet" });
      const result = reviewSignedTransaction({
        rawTxHex: finalized.rawTxHex,
        network: "signet",
        totalInputSats,
        changeAddresses: changeAddress.trim() ? [changeAddress.trim()] : [],
      });

      setRawTxHex(finalized.rawTxHex);
      setReview(result);
      setPhase("revisada");
      haptic.success();
    } catch (caught) {
      setError(messageOf(caught));
      haptic.error();
    }
  }

  function confirmBroadcast() {
    if (!review) return;

    Alert.alert(
      "Transmitir é irreversível",
      `Sai da carteira: ${formatSats(review.leavingWalletSats)}\nTaxa: ${formatSats(review.feeSats)}\n\nDepois de aceita pela rede, esta transação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Transmitir", style: "destructive", onPress: () => void doBroadcast() },
      ],
    );
  }

  async function doBroadcast() {
    if (!review) return;

    setBusy(true);
    setError("");
    try {
      const result = await broadcastRawTransaction({
        config: { baseUrl: DEFAULT_ESPLORA_BASE_URL },
        rawTxHex,
        expectedTxid: review.txid,
        network: "signet",
      });
      setBroadcastTxid(result.txid);
      haptic.success();
    } catch (caught) {
      setError(
        caught instanceof BroadcastRejectedError
          ? `O nó recusou: ${caught.serverResponse}. A transação NÃO entrou na rede; nada foi gasto.`
          : messageOf(caught),
      );
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer containerStyle={styles.tela} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FERRAMENTA DE TESTE — NÃO É A CARTEIRA FINAL</Text>
          <Text style={styles.title}>Enviar em {SIGNET_NETWORK.label}</Text>
        </View>

        <View style={styles.noticeCard}>
          <MaterialIcons name="key-off" size={20} color={cores.aviso} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitle}>Esta tela não assina</Text>
            <Text style={styles.noticeText}>
              Ela monta a transação, você assina em outro lugar, e ela revisa e transmite. Nenhuma chave
              privada passa por aqui — a ADR-0001 proíbe manuseio de chave no runtime JavaScript, e o guard
              de fronteira impede que isso mude por acidente.
            </Text>
          </View>
        </View>

        {/* ── 1. Origem ─────────────────────────────────────────────── */}
        <Text style={styles.step}>1 · De onde sai</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Endereço de origem</Text>
          <TextInput
            value={originAddress}
            onChangeText={setOriginAddress}
            placeholder="tb1q..."
            placeholderTextColor={cores.textoTerciario}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void loadUtxos()}
          disabled={busy}
          android_ripple={{ color: cores.ondulacaoEscura }}
          style={[styles.button, busy && styles.buttonDisabled]}
        >
          {busy && !review ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Buscar UTXOs</Text>}
        </Pressable>

        {utxos && (
          <View style={styles.darkCard}>
            <Text style={styles.darkLabel}>Gastável (confirmado)</Text>
            <Text style={styles.darkBalance}>{formatSats(spendable)}</Text>
            {utxos.some((u) => !u.confirmed) && (
              <Text style={styles.pending}>
                {formatSats(sumUtxoValueSats(utxos.filter((u) => !u.confirmed)))} ainda não confirmados — não serão
                usados
              </Text>
            )}
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>UTXOs</Text>
              <Text style={styles.rowValue}>
                {utxos.filter((u) => u.confirmed).length} de {utxos.length}
              </Text>
            </View>
          </View>
        )}

        {/* ── 2. Montagem ───────────────────────────────────────────── */}
        {utxos && (
          <>
            <Text style={styles.step}>2 · Para onde vai</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Endereço de destino</Text>
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="tb1q..."
                placeholderTextColor={cores.textoTerciario}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Valor (sats)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="5000"
                  placeholderTextColor={cores.textoTerciario}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputGroup, styles.feeField]}>
                <Text style={styles.label}>sat/vB</Text>
                <TextInput
                  value={feeRate}
                  onChangeText={setFeeRate}
                  placeholder="2"
                  placeholderTextColor={cores.textoTerciario}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Endereço de troco</Text>
              <TextInput
                value={changeAddress}
                onChangeText={setChangeAddress}
                placeholder="tb1q..."
                placeholderTextColor={cores.textoTerciario}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Text style={styles.hint}>
                Preenchido com o endereço de origem por padrão. Reusar o mesmo endereço para troco liga suas
                transações entre si na visão de quem observa a cadeia — aceitável em laboratório, não na carteira
                final.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={buildPsbt}
              android_ripple={{ color: cores.ondulacaoEscura }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Montar PSBT</Text>
            </Pressable>
          </>
        )}

        {/* ── 3. Exportar ───────────────────────────────────────────── */}
        {unsignedPsbt !== "" && (
          <>
            <Text style={styles.step}>3 · Assinar fora daqui</Text>

            {buildNotes.map((note) => (
              <View key={note} style={styles.noteRow}>
                <MaterialIcons name="check" size={16} color={cores.sucesso} />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}

            <View style={styles.psbtCard}>
              <Text style={styles.psbtLabel}>PSBT não assinada</Text>
              <Text style={styles.psbtValue} numberOfLines={4} ellipsizeMode="middle">
                {unsignedPsbt}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void copyUnsigned()}
              android_ripple={{ color: cores.ondulacaoClara }}
              style={styles.secondaryButton}
            >
              <MaterialIcons name="content-copy" size={18} color={cores.acaoSecundariaTexto} />
              <Text style={styles.secondaryButtonText}>Copiar PSBT</Text>
            </Pressable>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PSBT assinada (cole de volta)</Text>
              <TextInput
                value={signedPsbt}
                onChangeText={setSignedPsbt}
                placeholder="cHNidP8B..."
                placeholderTextColor={cores.textoTerciario}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                style={[styles.input, styles.inputMultiline]}
              />
            </View>

            <View style={styles.buttonPair}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void pasteSigned()}
                android_ripple={{ color: cores.ondulacaoClara }}
                style={[styles.secondaryButton, styles.flex]}
              >
                <MaterialIcons name="content-paste" size={18} color={cores.acaoSecundariaTexto} />
                <Text style={styles.secondaryButtonText}>Colar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={reviewSigned}
                android_ripple={{ color: cores.ondulacaoEscura }}
                style={[styles.button, styles.flex]}
              >
                <Text style={styles.buttonText}>Revisar</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── 4. Revisão vinculada ao payload ───────────────────────── */}
        {review && (
          <>
            <Text style={styles.step}>4 · O que a transação realmente faz</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewNetwork}>{SIGNET_NETWORK.label.toUpperCase()}</Text>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Sai da carteira</Text>
                <Text style={styles.rowStrong}>{formatSats(review.leavingWalletSats)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Taxa</Text>
                <Text style={styles.rowValue}>
                  {formatSats(review.feeSats)} · {review.feeRateSatsPerVByte.toFixed(2)} sat/vB
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Tamanho</Text>
                <Text style={styles.rowValue}>{review.vsize} vB</Text>
              </View>

              <View style={styles.divider} />

              {review.outputs.map((output, index) => (
                <View key={`${output.address}-${index}`} style={styles.outputBlock}>
                  <Text style={output.isChange ? styles.tagChange : styles.tagDestination}>
                    {output.isChange ? "TROCO" : "DESTINO"}
                  </Text>
                  <Text style={styles.outputAmount}>{formatSats(output.amountSats)}</Text>
                  <Text style={styles.outputAddress}>{output.address || "(script não endereçável)"}</Text>
                </View>
              ))}

              <View style={styles.divider} />
              <Text style={styles.txidLabel}>txid</Text>
              <Text style={styles.txid}>{review.txid}</Text>
            </View>

            {review.warnings.map((warning) => (
              <View key={warning} style={styles.warnCard}>
                <MaterialIcons name="warning-amber" size={18} color={cores.aviso} />
                <Text style={styles.warnText}>{warning}</Text>
              </View>
            ))}

            <View style={styles.irreversibleCard}>
              <MaterialIcons name="report" size={20} color={cores.perigo} />
              <Text style={styles.irreversibleText}>
                Confira o destino e o valor acima contra o que você pretendia. Estes números foram lidos da
                transação assinada, não dos campos que você preencheu — se divergirem, não transmita.
              </Text>
            </View>

            {broadcastTxid === "" ? (
              <Pressable
                accessibilityRole="button"
                onPress={confirmBroadcast}
                disabled={busy}
                android_ripple={{ color: cores.ondulacaoEscura }}
                style={[styles.dangerButton, busy && styles.buttonDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color={cores.acaoPrimariaTexto} />
                ) : (
                  <Text style={styles.buttonText}>Transmitir na {SIGNET_NETWORK.label}</Text>
                )}
              </Pressable>
            ) : (
              <View style={styles.successCard}>
                <MaterialIcons name="check-circle" size={22} color={cores.sucesso} />
                <View style={styles.flex}>
                  <Text style={styles.successTitle}>Aceita pelo nó</Text>
                  <Text style={styles.successTxid}>{broadcastTxid}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {error !== "" && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={18} color={cores.perigo} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {phase !== "origem" && (
          <Pressable accessibilityRole="button" onPress={reset} style={styles.resetButton}>
            <Text style={styles.resetText}>Recomeçar</Text>
          </Pressable>
        )}

        <Text style={styles.source}>Fonte: {DEFAULT_ESPLORA_BASE_URL}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tela: { backgroundColor: cores.fundo },
  content: { gap: 14, padding: 20, paddingBottom: 48 },
  header: { gap: 4, marginTop: 4 },
  eyebrow: { color: cores.aviso, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: cores.textoPrimario, fontSize: 24, fontWeight: "700", letterSpacing: -0.4, marginTop: 4 },
  flex: { flex: 1 },

  step: { color: cores.textoSecundario, fontSize: 13, fontWeight: "800", letterSpacing: 0.3, marginTop: 10 },

  noticeCard: {
    alignItems: "flex-start", backgroundColor: cores.avisoSuperficie, borderRadius: 16,
    flexDirection: "row", gap: 12, padding: 15,
  },
  noticeTitle: { color: cores.aviso, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  noticeText: { color: cores.textoSecundario, fontSize: 12, lineHeight: 17 },

  inputGroup: { gap: 6 },
  inputRow: { flexDirection: "row", gap: 10 },
  feeField: { width: 96 },
  label: { color: cores.textoSecundario, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  hint: { color: cores.textoTerciario, fontSize: 11, lineHeight: 15, marginTop: 2 },
  input: {
    backgroundColor: cores.superficieAlta, borderColor: cores.borda, borderRadius: 14, borderWidth: 1,
    color: cores.textoPrimario, fontSize: 15, paddingHorizontal: 14, paddingVertical: 13,
  },
  inputMultiline: { minHeight: 92, textAlignVertical: "top" },

  button: {
    alignItems: "center", backgroundColor: cores.acaoPrimaria, borderRadius: 14,
    justifyContent: "center", minHeight: 52,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: cores.acaoPrimariaTexto, fontSize: 15, fontWeight: "700" },
  buttonPair: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    alignItems: "center", backgroundColor: cores.acaoSecundariaFundo, borderRadius: 14, flexDirection: "row",
    gap: 8, justifyContent: "center", minHeight: 52,
  },
  secondaryButtonText: { color: cores.acaoSecundariaTexto, fontSize: 15, fontWeight: "700" },
  dangerButton: {
    alignItems: "center", backgroundColor: cores.perigo, borderRadius: 14,
    justifyContent: "center", minHeight: 56,
  },
  resetButton: { alignItems: "center", paddingVertical: 12 },
  resetText: { color: cores.textoSecundario, fontSize: 13, fontWeight: "600" },

  darkCard: { backgroundColor: cores.superficie, borderRadius: 20, padding: 20 },
  darkLabel: { color: cores.textoSecundario, fontSize: 13, fontWeight: "600" },
  darkBalance: {
    color: cores.textoPrimario, fontSize: 30, fontVariant: ["tabular-nums"],
    fontWeight: "800", letterSpacing: -0.8, marginTop: 6,
  },
  pending: { color: cores.aviso, fontSize: 12, fontWeight: "600", marginTop: 6 },
  divider: { backgroundColor: cores.borda, height: StyleSheet.hairlineWidth, marginVertical: 12 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: cores.textoSecundario, fontSize: 13 },
  rowValue: { color: cores.textoPrimario, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "700" },
  rowStrong: { color: cores.textoPrimario, fontSize: 17, fontVariant: ["tabular-nums"], fontWeight: "800" },

  noteRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  noteText: { color: cores.textoSecundario, flex: 1, fontSize: 12, lineHeight: 17 },

  psbtCard: { backgroundColor: cores.superficie, borderColor: cores.borda, borderRadius: 14, borderWidth: 1, gap: 6, padding: 14 },
  psbtLabel: { color: cores.textoSecundario, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  psbtValue: { color: cores.textoPrimario, fontFamily: "monospace", fontSize: 11, lineHeight: 16 },

  reviewCard: { backgroundColor: cores.superficie, borderRadius: 20, padding: 20 },
  reviewNetwork: {
    color: cores.rede, fontSize: 11, fontWeight: "800",
    letterSpacing: 1.2, marginBottom: 12,
  },
  outputBlock: { gap: 2, paddingVertical: 8 },
  tagDestination: { color: cores.acaoPrimaria, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  tagChange: { color: cores.textoSecundario, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  outputAmount: { color: cores.textoPrimario, fontSize: 18, fontVariant: ["tabular-nums"], fontWeight: "800" },
  outputAddress: { color: cores.textoSecundario, fontFamily: "monospace", fontSize: 10, lineHeight: 15 },
  txidLabel: { color: cores.textoTerciario, fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  txid: { color: cores.textoSecundario, fontFamily: "monospace", fontSize: 10, lineHeight: 15, marginTop: 3 },

  warnCard: {
    alignItems: "flex-start", backgroundColor: cores.avisoSuperficie, borderRadius: 14,
    flexDirection: "row", gap: 10, padding: 14,
  },
  warnText: { color: cores.aviso, flex: 1, fontSize: 12, lineHeight: 17 },
  irreversibleCard: {
    alignItems: "flex-start", backgroundColor: cores.perigoSuperficie, borderRadius: 14,
    flexDirection: "row", gap: 10, padding: 14,
  },
  irreversibleText: { color: cores.perigo, flex: 1, fontSize: 12, lineHeight: 17 },

  successCard: {
    alignItems: "center", backgroundColor: cores.sucessoSuperficie, borderRadius: 16,
    flexDirection: "row", gap: 12, padding: 16,
  },
  successTitle: { color: cores.sucesso, fontSize: 14, fontWeight: "800" },
  successTxid: { color: cores.sucesso, fontFamily: "monospace", fontSize: 10, lineHeight: 15, marginTop: 3 },

  errorCard: {
    alignItems: "flex-start", backgroundColor: cores.perigoSuperficie, borderRadius: 14,
    flexDirection: "row", gap: 10, padding: 14,
  },
  errorText: { color: cores.perigo, flex: 1, fontSize: 13, lineHeight: 18 },

  source: { color: cores.textoTerciario, fontSize: 10, marginTop: 8, textAlign: "center" },
});
