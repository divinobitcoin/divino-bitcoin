import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { CampoTexto } from "@/components/campo-texto";
import { ScreenContainer } from "@/components/screen-container";
import { cores } from "@/constants/palette";
import { haptic } from "@/lib/haptics";
import {
  deleteWatchOnlyProfile,
  loadWatchOnlyProfile,
  saveWatchOnlyProfile,
} from "@/lib/signet-watch-profile-store";
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
import { assertPsbtMatchesWatchOnly } from "@/shared/signet-external-psbt";
import { matrizQr } from "@/shared/qr-matriz";
import {
  lerDescritorWatchOnly,
  type SignetWatchOnlyDescriptor,
} from "@/shared/signet-watch-descriptor";
import { deriveWatchAddressBook } from "@/shared/signet-watch-addresses";
import {
  broadcastVaultTransaction,
  buildVaultUnsignedPsbt,
  fetchVaultUtxos,
  type VaultUtxoSet,
} from "@/shared/signet-vault-utxo";
import { finalizeSignedPsbt, reviewSignedTransaction } from "@/shared/transaction-broadcast";

const RPC_URL_PADRAO = "http://127.0.0.1:38332";
const MEMPOOL_SIGNET = "https://mempool.space/signet/tx/";

type Nivel = "escolher" | "nativo" | "externo";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Falha desconhecida.";
}

function formatSats(value: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(value)} sats`;
}

export default function SignetVaultScreen() {
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [watch, setWatch] = useState<SignetWatchOnlyDescriptor | null>(null);

  const boot = useCallback(async () => {
    const [profile, nativo] = await Promise.all([
      loadWatchOnlyProfile().catch(() => null),
      isNativeVaultAvailable()
        ? getCapabilities().catch(() => null)
        : Promise.resolve(null),
    ]);
    setWatch(profile);
    if (nativo?.status === "provisioned") setNivel("nativo");
    else if (profile) setNivel("externo");
    else setNivel("escolher");
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (nivel === null) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]} containerStyle={styles.tela} style={styles.tela}>
        <View style={styles.content}>
          <ActivityIndicator color={cores.acaoPrimaria} />
        </View>
      </ScreenContainer>
    );
  }

  if (nivel === "escolher") {
    return (
      <OnboardingNiveis
        onNativo={() => setNivel("nativo")}
        onExterno={() => setNivel("externo")}
      />
    );
  }

  if (nivel === "externo") {
    return (
      <NivelExterno
        initial={watch}
        onVoltar={() => setNivel("escolher")}
        onProfile={(next) => setWatch(next)}
      />
    );
  }

  return <NivelNativo onVoltar={() => setNivel("escolher")} />;
}

function OnboardingNiveis({
  onNativo,
  onExterno,
}: {
  onNativo: () => void;
  onExterno: () => void;
}) {
  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerStyle={styles.tela} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPERIMENTAL · NÃO AUDITADO · {SIGNET_NETWORK.label}</Text>
          <Text style={styles.title}>Como guardar a chave</Text>
          <Text style={styles.body}>
            Duas formas honestas de usar o cofre Signet. Nenhuma está auditada. Nenhuma aceita satoshi real.
          </Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onNativo} style={styles.levelCard}>
          <Text style={styles.levelKicker}>NÍVEL 1</Text>
          <Text style={styles.levelTitle}>Nível 1 — Dispositivo móvel</Text>
          <Text style={styles.levelText}>
            A chave fica neste celular. 12 palavras no cofre nativo. Saldo e envio no app, com assinatura no aparelho.
            Serve para quantias pequenas de teste Signet.
          </Text>
          <Text style={styles.levelAction}>Usar este celular</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onExterno} style={styles.levelCard}>
          <Text style={styles.levelKicker}>NÍVEL 2</Text>
          <Text style={styles.levelTitle}>Nível 2 — Assinador externo</Text>
          <Text style={styles.levelText}>
            A chave fica fora. Este app não cria nem guarda seed. Importa descritor ou tpub BIP-84 Signet (só
            observação), monta a PSBT e transmite o que você assinou lá.
          </Text>
          <Text style={styles.levelHint}>
            Exemplos de assinador PSBT: Sparrow, SeedSigner, Jade, Coldcard. O Divino Bitcoin não vende hardware e não
            abre loja.
          </Text>
          <Text style={styles.levelAction}>Observar descritor</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function NivelNativo({ onVoltar }: { onVoltar: () => void }) {
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
          <Pressable accessibilityRole="button" onPress={onVoltar} style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Escolher outro nível</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerStyle={styles.tela} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPERIMENTAL · NÃO AUDITADO · {SIGNET_NETWORK.label} · NÍVEL 1</Text>
          <Text style={styles.title}>Cofre Signet</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onVoltar}>
          <Text style={styles.link}>Escolher outro nível</Text>
        </Pressable>

        <View style={styles.noticeCard}>
          <MaterialIcons name="science" size={20} color={cores.aviso} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitle}>Material descartável, valor zero</Text>
            <Text style={styles.noticeText}>
              A chave fica neste celular. A frase de recuperação nasce e permanece na tela nativa. O JavaScript só vê
              fingerprint, descritor público e PSBT assinada. Isto não foi auditado e não aceita satoshi real. Quantias
              pequenas de teste.
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

function NivelExterno({
  initial,
  onVoltar,
  onProfile,
}: {
  initial: SignetWatchOnlyDescriptor | null;
  onVoltar: () => void;
  onProfile: (profile: SignetWatchOnlyDescriptor | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<SignetWatchOnlyDescriptor | null>(initial);
  const [descriptorInput, setDescriptorInput] = useState("");
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [rpcUrl, setRpcUrl] = useState(RPC_URL_PADRAO);
  const [rpcUser, setRpcUser] = useState("");
  const [rpcPassword, setRpcPassword] = useState("");
  const [chain, setChain] = useState<VaultUtxoSet | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [feeRate, setFeeRate] = useState("2");
  const [unsignedPsbt, setUnsignedPsbt] = useState("");
  const [signedPsbt, setSignedPsbt] = useState("");
  const [txid, setTxid] = useState("");

  function currentRpc() {
    if (!rpcUser.trim() || rpcPassword === "") return null;
    return { url: rpcUrl.trim() || RPC_URL_PADRAO, username: rpcUser.trim(), password: rpcPassword };
  }

  async function loadBalance(next: SignetWatchOnlyDescriptor) {
    const set = await fetchVaultUtxos({
      network: "signet",
      accountXpub: next.accountXpub,
      masterFingerprint: next.masterFingerprint,
      receiveDescriptor: next.receiveDescriptor,
      changeDescriptor: next.changeDescriptor,
      receiveAddress0: next.receiveAddress0,
      rpc: currentRpc(),
    });
    setChain(set);
  }

  useEffect(() => {
    if (!profile) return;
    void loadBalance(profile).catch((caught) => setError(messageOf(caught)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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

  async function importar() {
    const parsed = lerDescritorWatchOnly(descriptorInput, fingerprintInput);
    await saveWatchOnlyProfile(parsed);
    setProfile(parsed);
    onProfile(parsed);
    setUnsignedPsbt("");
    setSignedPsbt("");
    setTxid("");
  }

  async function montar() {
    if (!profile) throw new Error("Importe o descritor primeiro.");
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
      accountXpub: profile.accountXpub,
      masterFingerprint: profile.masterFingerprint,
      receiveDescriptor: profile.receiveDescriptor,
      changeDescriptor: profile.changeDescriptor,
      receiveAddress0: profile.receiveAddress0,
      rpc: currentRpc(),
    });
    setChain(set);
    const built = buildVaultUnsignedPsbt({
      network: "signet",
      utxos: set.utxos,
      recipientAddress: destination,
      targetSats,
      feeRateSatsPerVByte: rate,
      book: set.book,
    });
    setUnsignedPsbt(built.psbtBase64);
    setSignedPsbt("");
    setTxid("");
  }

  async function transmitir() {
    if (!profile) throw new Error("Importe o descritor primeiro.");
    const pasted = signedPsbt.trim();
    if (!pasted) throw new Error("Cole a PSBT assinada pelo assinador externo.");
    const book = deriveWatchAddressBook({
      network: "signet",
      accountXpub: profile.accountXpub,
      masterFingerprint: profile.masterFingerprint,
      receiveAddress0: profile.receiveAddress0,
    });
    const matched = assertPsbtMatchesWatchOnly({
      psbtBase64: pasted,
      network: "signet",
      masterFingerprint: profile.masterFingerprint,
      book,
    });
    const finalized = finalizeSignedPsbt({ signedPsbtBase64: pasted, network: "signet" });
    const reviewed = reviewSignedTransaction({
      rawTxHex: finalized.rawTxHex,
      network: "signet",
      totalInputSats: matched.totalInputSats,
      changeAddresses: book.change.map((entry) => entry.address),
    });
    const broadcast = await broadcastVaultTransaction({
      review: reviewed,
      rpc: currentRpc(),
    });
    setTxid(broadcast.txid);
    await loadBalance(profile);
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerStyle={styles.tela} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPERIMENTAL · NÃO AUDITADO · {SIGNET_NETWORK.label} · NÍVEL 2</Text>
          <Text style={styles.title}>Assinador externo</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onVoltar}>
          <Text style={styles.link}>Escolher outro nível</Text>
        </Pressable>

        <View style={styles.noticeCard}>
          <MaterialIcons name="key-off" size={20} color={cores.aviso} />
          <View style={styles.flex}>
            <Text style={styles.noticeTitle}>A chave fica fora deste celular</Text>
            <Text style={styles.noticeText}>
              Este app não cria seed, não guarda seed e não assina. Só observa o descritor BIP-84 Signet e monta a
              PSBT. Exemplos: Sparrow, SeedSigner, Jade, Coldcard. Sem loja.
            </Text>
          </View>
        </View>

        {!profile && (
          <>
            <Text style={styles.step}>Descritor público</Text>
            <Text style={styles.label}>wpkh([fingerprint/84h/1h/0h]tpub…/0/*) ou tpub</Text>
            <CampoTexto
              value={descriptorInput}
              onChangeText={setDescriptorInput}
              placeholder="wpkh([aabbccdd/84h/1h/0h]tpub.../0/*)"
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={styles.input}
            />
            <Text style={styles.label}>Fingerprint (8 hex), se o descritor não trouxer origem</Text>
            <CampoTexto
              value={fingerprintInput}
              onChangeText={setFingerprintInput}
              placeholder="aabbccdd"
              placeholderTextColor={cores.textoTerciario}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.inputSingle}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void run(importar)}
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Observar descritor</Text>}
            </Pressable>
          </>
        )}

        {profile && (
          <>
            <CopyBlock label="Fingerprint" value={profile.masterFingerprint} />
            <CopyBlock label="Endereço de recebimento 0" value={profile.receiveAddress0} />
            <CopyBlock label="Descriptor de recebimento" value={profile.receiveDescriptor} />
            <CopyBlock label="Descriptor de troco" value={profile.changeDescriptor} />

            <Text style={styles.step}>Nó Signet (broadcast)</Text>
            <Text style={styles.label}>
              RPC do bitcoind (sendrawtransaction). Se faltar, a leitura e a transmissão usam Esplora Signet público.
            </Text>
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
              onPress={() => void run(async () => { await loadBalance(profile); })}
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
              onPress={() => void run(montar)}
              style={[styles.button, busy && styles.buttonDisabled]}
            >
              {busy ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Montar PSBT</Text>}
            </Pressable>

            {unsignedPsbt ? (
              <>
                <Text style={styles.label}>PSBT não assinada — QR e Base64. Assine fora deste celular.</Text>
                <QrPsbt valor={unsignedPsbt} />
                <CopyBlock label="PSBT não assinada (Base64)" value={unsignedPsbt} />
                <Text style={styles.levelHint}>Exemplos: Sparrow, SeedSigner, Jade, Coldcard. Sem loja.</Text>
                <Text style={styles.label}>PSBT assinada (colar)</Text>
                <CampoTexto
                  value={signedPsbt}
                  onChangeText={setSignedPsbt}
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
                      setSignedPsbt(value.trim());
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
                  onPress={() => void run(transmitir)}
                  style={[styles.button, busy && styles.buttonDisabled]}
                >
                  {busy ? <ActivityIndicator color={cores.acaoPrimariaTexto} /> : <Text style={styles.buttonText}>Transmitir</Text>}
                </Pressable>
              </>
            ) : null}

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

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Esquecer descritor",
                  "Só some o descritor público deste aparelho. A seed nunca esteve aqui.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Esquecer",
                      style: "destructive",
                      onPress: () =>
                        void run(async () => {
                          await deleteWatchOnlyProfile();
                          setProfile(null);
                          onProfile(null);
                          setChain(null);
                          setUnsignedPsbt("");
                          setSignedPsbt("");
                          setTxid("");
                        }),
                    },
                  ],
                )
              }
              style={styles.dangerButton}
            >
              <Text style={styles.dangerText}>Esquecer descritor</Text>
            </Pressable>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function QrPsbt({ valor }: { valor: string }) {
  try {
    const matriz = matrizQr(valor);
    const n = matriz.length;
    const d = matriz
      .map((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : "")).join(""))
      .join("");
    return (
      <View style={styles.qrWrap}>
        <Svg width={240} height={240} viewBox={`-4 -4 ${n + 8} ${n + 8}`}>
          <Rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#ffffff" />
          <Path d={d} fill="#000000" />
        </Svg>
      </View>
    );
  } catch (caught) {
    return <Text style={styles.levelHint}>{messageOf(caught)}</Text>;
  }
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
  levelCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  levelKicker: { color: cores.aviso, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  levelTitle: { color: cores.textoPrimario, fontSize: 20, fontWeight: "700" },
  levelText: { color: cores.textoSecundario, fontSize: 13, lineHeight: 19 },
  levelHint: { color: cores.textoTerciario, fontSize: 12, lineHeight: 17 },
  levelAction: { color: cores.acaoSecundariaTexto, fontSize: 14, fontWeight: "800", marginTop: 4 },
  qrWrap: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
  },
});
