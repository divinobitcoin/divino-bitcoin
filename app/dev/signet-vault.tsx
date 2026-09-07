import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CampoTexto } from "@/components/campo-texto";
import { ScreenContainer } from "@/components/screen-container";
import { cores } from "@/constants/palette";
import { haptic } from "@/lib/haptics";
import {
  deleteProfile,
  getCapabilities,
  getPublicDescriptor,
  isNativeVaultAvailable,
  provisionSignetProfile,
  signPsbt,
} from "@/modules/divino-native-vault/src";
import type { NativeVaultCapabilities, PublicDescriptor } from "@/modules/divino-native-vault/src";
import { SIGNET_NETWORK } from "@/shared/bitcoin-network";
import { broadcastRawTransactionViaCoreRpc } from "@/shared/bitcoin-core-wallet-client";
import { finalizeSignedPsbt, reviewSignedTransaction } from "@/shared/transaction-broadcast";
import {
  buildVaultUnsignedPsbt,
  fetchVaultUtxos,
  type VaultUtxoSet,
} from "@/shared/signet-vault-utxo";

const RPC_URL_PADRAO = "http://127.0.0.1:38332";
const MEMPOOL_SIGNET = "https://mempool.space/signet/tx/";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Falha desconhecida.";
}

function formatSats(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} sats`;
}

export default function SignetVaultScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capabilities, setCapabilities] = useState<NativeVaultCapabilities | null>(null);
  const [descriptor, setDescriptor] = useState<PublicDescriptor | null>(null);
  const [psbt, setPsbt] = useState("");
  const [authorized, setAuthorized] = useState("");
  const [rpcUrl, setRpcUrl] = useState(RPC_URL_PADRAO);
  const [rpcUser, setRpcUser] = useState("");
  const [rpcPassword, setRpcPassword] = useState("");
  const [chain, setChain] = useState<VaultUtxoSet | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [feeRate, setFeeRate] = useState("2");
  const [txid, setTxid] = useState("");

  const reload = useCallback(async () => {
    if (!isNativeVaultAvailable()) {
      setCapabilities(null);
      setDescriptor(null);
      return;
    }
    const next = await getCapabilities();
    setCapabilities(next);
    if (next.profileId) {
      setDescriptor(await getPublicDescriptor(next.profileId));
    } else {
      setDescriptor(null);
      setChain(null);
      setTxid("");
    }
  }, []);

  function currentRpc() {
    if (!rpcUser.trim() || rpcPassword === "") return null;
    return { url: rpcUrl.trim() || RPC_URL_PADRAO, username: rpcUser.trim(), password: rpcPassword };
  }

  async function loadBalance(publicDescriptor: PublicDescriptor) {
    const set = await fetchVaultUtxos({
      network: "signet",
      accountXpub: publicDescriptor.accountXpub,
      masterFingerprint: publicDescriptor.masterFingerprint,
      receiveDescriptor: publicDescriptor.receiveDescriptor,
      changeDescriptor: publicDescriptor.changeDescriptor,
      receiveAddress0: publicDescriptor.receiveAddress0,
      rpc: currentRpc(),
    });
    setChain(set);
  }

  useEffect(() => {
    void reload().catch((caught) => setError(messageOf(caught)));
  }, [reload]);

  useEffect(() => {
    if (!descriptor) return;
    void loadBalance(descriptor).catch((caught) => setError(messageOf(caught)));
    // Saldo inicial: Esplora público se o RPC ainda estiver vazio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor]);

  async function enviar(publicDescriptor: PublicDescriptor) {
    const rpc = currentRpc();
    if (!rpc) {
      throw new Error("Informe URL, usuário e senha do RPC Signet do bitcoind para transmitir.");
    }
    const targetSats = Number(amount.trim());
    const rate = Number(feeRate.trim());
    if (!Number.isInteger(targetSats) || targetSats <= 0) {
      throw new Error("Informe o valor em satoshis inteiros.");
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Informe uma taxa em sat/vB maior que zero.");
    }
    const set = await fetchVaultUtxos({
      network: "signet",
      accountXpub: publicDescriptor.accountXpub,
      masterFingerprint: publicDescriptor.masterFingerprint,
      receiveDescriptor: publicDescriptor.receiveDescriptor,
      changeDescriptor: publicDescriptor.changeDescriptor,
      receiveAddress0: publicDescriptor.receiveAddress0,
      rpc,
    });
    const built = buildVaultUnsignedPsbt({
      network: "signet",
      utxos: set.utxos,
      recipientAddress: destination,
      targetSats,
      feeRateSatsPerVByte: rate,
      book: set.book,
    });
    const signed = await signPsbt({
      profileId: publicDescriptor.profileId,
      network: "signet",
      psbtBase64: built.psbtBase64,
    });
    const finalized = finalizeSignedPsbt({ signedPsbtBase64: signed.psbtBase64, network: "signet" });
    const reviewed = reviewSignedTransaction({
      rawTxHex: finalized.rawTxHex,
      network: "signet",
      totalInputSats: built.totalInputSats,
      changeAddresses: set.book.change.map((entry) => entry.address),
    });
    const broadcast = await broadcastRawTransactionViaCoreRpc({ config: rpc, review: reviewed });
    setTxid(broadcast.txid);
    setAuthorized(signed.psbtBase64);
    await loadBalance(publicDescriptor);
  }

  async function run(action: () => Promise<void>) {
    haptic.medium();
    setBusy(true);
    setError("");
    try {
      await action();
      haptic.success();
    } catch (caught) {
      setError(messageOf(caught));
      haptic.error();
    } finally {
      setBusy(false);
    }
  }

  if (!isNativeVaultAvailable()) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]} containerStyle={styles.tela} style={styles.tela}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>EXPERIMENTAL · NÃO AUDITADO</Text>
          <Text style={styles.title}>Cofre Signet</Text>
          <Text style={styles.body}>
            O Expo Go não inclui o módulo nativo. Instale o development build e abra-o com o servidor de
            desenvolvimento. Nenhuma seed é lida aqui.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerStyle={styles.tela} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPERIMENTAL · NÃO AUDITADO · {SIGNET_NETWORK.label}</Text>
          <Text style={styles.title}>Cofre Signet</Text>
        </View>

        <View style={styles.noticeCard}>
          <MaterialIcons name="science" size={20} color={cores.aviso} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitle}>Material descartável, valor zero</Text>
            <Text style={styles.noticeText}>
              A frase de recuperação nasce e permanece na tela nativa. O JavaScript só vê fingerprint, descritor
              público e PSBT assinada. Isto não foi auditado e não aceita satoshi real.
            </Text>
          </View>
        </View>

        {capabilities && (
          <View style={styles.darkCard}>
            <Text style={styles.darkLabel}>Estado</Text>
            <Text style={styles.darkBalance}>{capabilities.status === "provisioned" ? "Provisionado" : "Vazio"}</Text>
            {capabilities.masterFingerprint && (
              <Text style={styles.pending}>Fingerprint {capabilities.masterFingerprint}</Text>
            )}
          </View>
        )}

        {!descriptor && (
          <View style={styles.rowButtons}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void run(async () => { await provisionSignetProfile("generate"); await reload(); })}
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Gerar frase</Text>}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void run(async () => { await provisionSignetProfile("import"); await reload(); })}
              style={[styles.buttonSecondary, busy && styles.buttonDisabled]}
            >
              <Text style={styles.buttonSecondaryText}>Importar do papel</Text>
            </Pressable>
          </View>
        )}

        {descriptor && (
          <>
            <Text style={styles.step}>Material público</Text>
            <CopyBlock label="Fingerprint" value={descriptor.masterFingerprint} />
            <CopyBlock label="Endereço de recebimento 0" value={descriptor.receiveAddress0} />
            <CopyBlock label="tpub da conta" value={descriptor.accountXpub} />
            <CopyBlock label="Descriptor de recebimento" value={descriptor.receiveDescriptor} />
            <CopyBlock label="Descriptor de troco" value={descriptor.changeDescriptor} />

            <Text style={styles.step}>Nó Signet (broadcast)</Text>
            <Text style={styles.label}>RPC do bitcoind (lança sendrawtransaction). Se falhar a leitura, o saldo vem do Esplora/Electrum Signet público.</Text>
            <CampoTexto
              value={rpcUrl}
              onChangeText={setRpcUrl}
              placeholder={RPC_URL_PADRAO}
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.inputSingle}
            />
            <CampoTexto
              value={rpcUser}
              onChangeText={setRpcUser}
              placeholder="rpcuser"
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.inputSingle}
            />
            <CampoTexto
              value={rpcPassword}
              onChangeText={setRpcPassword}
              placeholder="rpcpassword"
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.inputSingle}
            />

            <Text style={styles.step}>Saldo</Text>
            <View style={styles.darkCard}>
              <Text style={styles.darkLabel}>
                {chain
                  ? chain.source === "bitcoin-core-rpc"
                    ? "Nó próprio"
                    : "Electrum/Esplora Signet público"
                  : "A consultar…"}
              </Text>
              <Text style={styles.darkBalance}>{chain ? formatSats(chain.confirmedSats) : "—"}</Text>
              {chain && chain.pendingSats !== 0 ? (
                <Text style={styles.pending}>Pendente {formatSats(chain.pendingSats)}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void run(async () => { await loadBalance(descriptor); })}
              style={[styles.buttonSecondary, busy && styles.buttonDisabled]}
            >
              <Text style={styles.buttonSecondaryText}>Atualizar saldo</Text>
            </Pressable>

            <Text style={styles.step}>Enviar</Text>
            <Text style={styles.label}>Endereço tb1q Signet</Text>
            <CampoTexto
              value={destination}
              onChangeText={setDestination}
              placeholder="tb1q..."
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.inputSingle}
            />
            <Text style={styles.label}>Quantos sats</Text>
            <CampoTexto
              value={amount}
              onChangeText={setAmount}
              placeholder="10000"
              placeholderTextColor={cores.textoTerciario}
              keyboardType="number-pad"
              style={styles.inputSingle}
            />
            <Text style={styles.label}>Taxa (sat/vB)</Text>
            <CampoTexto
              value={feeRate}
              onChangeText={setFeeRate}
              placeholder="2"
              placeholderTextColor={cores.textoTerciario}
              keyboardType="decimal-pad"
              style={styles.inputSingle}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void run(async () => { await enviar(descriptor); })}
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Enviar</Text>}
            </Pressable>
            {txid ? (
              <>
                <CopyBlock label="txid" value={txid} />
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(`${MEMPOOL_SIGNET}${txid}`)}
                >
                  <Text style={styles.link}>{`${MEMPOOL_SIGNET}${txid}`}</Text>
                </Pressable>
              </>
            ) : null}

            <Text style={styles.step}>Assinar PSBT</Text>
            <Text style={styles.label}>PSBT não assinada (base64)</Text>
            <CampoTexto
              value={psbt}
              onChangeText={setPsbt}
              placeholder="cHNidP8..."
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                void Clipboard.getStringAsync().then((value) => {
                  setPsbt(value.trim());
                  haptic.light();
                })
              }
              style={styles.buttonSecondary}
            >
              <Text style={styles.buttonSecondaryText}>Colar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const result = await signPsbt({
                    profileId: descriptor.profileId,
                    network: "signet",
                    psbtBase64: psbt,
                  });
                  setAuthorized(result.psbtBase64);
                })
              }
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Assinar</Text>}
            </Pressable>
            {authorized ? <CopyBlock label="PSBT assinado" value={authorized} /> : null}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                Alert.alert("Apagar perfil Signet", "O envelope deste aparelho some. A recuperação é a frase no papel.", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Apagar",
                    style: "destructive",
                    onPress: () =>
                      void run(async () => {
                        await deleteProfile(descriptor.profileId);
                        setAuthorized("");
                        setPsbt("");
                        setTxid("");
                        setChain(null);
                        await reload();
                      }),
                  },
                ])
              }
              style={styles.dangerButton}
            >
              <Text style={styles.dangerText}>Apagar perfil</Text>
            </Pressable>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copyPublic() {
    await Clipboard.setStringAsync(value);
    haptic.light();
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copied ? `${label} copiado` : `Copiar ${label}`}
      onPress={() => void copyPublic()}
      style={styles.copyCard}
    >
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.mono}>
        {value}
      </Text>
      <Text style={[styles.copyHint, copied && styles.copyHintDone]}>{copied ? "Copiado" : "Copiar"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { backgroundColor: cores.fundo, flex: 1 },
  content: { gap: 12, padding: 20, paddingBottom: 40 },
  header: { gap: 6, marginBottom: 4 },
  eyebrow: { color: cores.aviso, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: cores.textoPrimario, fontSize: 28, fontWeight: "700", letterSpacing: -0.6 },
  body: { color: cores.textoSecundario, fontSize: 14, lineHeight: 20 },
  flex: { flex: 1 },
  noticeCard: {
    alignItems: "flex-start",
    backgroundColor: cores.avisoSuperficie,
    borderColor: cores.aviso,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  noticeTitle: { color: cores.aviso, fontSize: 14, fontWeight: "800", marginBottom: 4 },
  noticeText: { color: cores.textoSecundario, fontSize: 12, lineHeight: 17 },
  darkCard: { backgroundColor: cores.superficie, borderColor: cores.borda, borderRadius: 16, borderWidth: 1, padding: 16 },
  darkLabel: { color: cores.textoSecundario, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  darkBalance: { color: cores.textoPrimario, fontSize: 22, fontWeight: "700", marginTop: 6 },
  pending: { color: cores.textoTerciario, fontSize: 12, marginTop: 6 },
  step: { color: cores.textoSecundario, fontSize: 11, fontWeight: "800", letterSpacing: 0.9, marginTop: 8 },
  label: { color: cores.textoSecundario, fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: cores.superficieAlta,
    borderColor: cores.borda,
    borderRadius: 12,
    borderWidth: 1,
    color: cores.textoPrimario,
    minHeight: 88,
    padding: 12,
    textAlignVertical: "top",
  },
  inputSingle: {
    backgroundColor: cores.superficieAlta,
    borderColor: cores.borda,
    borderRadius: 12,
    borderWidth: 1,
    color: cores.textoPrimario,
    minHeight: 48,
    padding: 12,
  },
  link: { color: cores.acaoSecundariaTexto, fontSize: 12, lineHeight: 18, textDecorationLine: "underline" },
  button: {
    alignItems: "center",
    backgroundColor: cores.acaoPrimaria,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 52,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: cores.acaoPrimariaTexto, fontSize: 15, fontWeight: "800" },
  buttonSecondary: {
    alignItems: "center",
    borderColor: cores.acaoSecundariaBorda,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  buttonSecondaryText: { color: cores.acaoSecundariaTexto, fontSize: 15, fontWeight: "800" },
  rowButtons: { gap: 10 },
  copyCard: { backgroundColor: cores.superficie, borderColor: cores.borda, borderRadius: 14, borderWidth: 1, padding: 12 },
  mono: { color: cores.textoPrimario, fontFamily: "monospace", fontSize: 12, lineHeight: 18, marginTop: 6 },
  copyHint: { color: cores.acaoSecundariaTexto, fontSize: 10, fontWeight: "800", letterSpacing: 0.4, marginTop: 8 },
  copyHintDone: { color: cores.sucesso },
  dangerButton: { alignItems: "center", borderColor: cores.perigo, borderRadius: 14, borderWidth: 1, minHeight: 48, justifyContent: "center" },
  dangerText: { color: cores.perigo, fontSize: 14, fontWeight: "800" },
  error: { color: cores.perigo, fontSize: 13, lineHeight: 18 },
});
