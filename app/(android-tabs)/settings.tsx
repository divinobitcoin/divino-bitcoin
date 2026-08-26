import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/lib/wallet-context";
import DivinoNativeVaultModule from "@/modules/divino-native-vault/src/DivinoNativeVaultModule";
import { SIGNET_NETWORK } from "@/shared/bitcoin-network";
import { LIGHTNING_PROVIDER_PLANS, type LightningProviderKind } from "@/shared/lightning";

const switchTrackColor = { false: "#D1D5DB", true: "#8DC8FF" };

export default function AndroidSettingsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, isReady, selectLightningProvider, setBiometricsEnabled, setHideBalance } = useWallet();

  if (!isReady || !state) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#F7931A" />
      </View>
    );
  }

  const selectedProvider = state.lightning.provider;
  const connectionTitle = selectedProvider
    ? `${LIGHTNING_PROVIDER_PLANS[selectedProvider].title} selecionado`
    : "Nenhuma fonte selecionada";
  const connectionDescription = selectedProvider
    ? `A arquitetura está registrada para ${SIGNET_NETWORK.label}; a ativação depende de uma implementação auditada futura.`
    : `O primeiro ambiente será ${SIGNET_NETWORK.label}; nenhuma rede real será conectada.`;

  async function testBiometrics() {
    const LocalAuthentication = await import("expo-local-authentication");
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Biometria indisponível",
        "Configure uma impressão digital ou desbloqueio facial no aparelho para usar este recurso.",
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirmar acesso ao Divino Bitcoin",
      fallbackLabel: "Usar código do aparelho",
    });

    if (result.success) {
      Alert.alert(
        "Biometria confirmada",
        "O aparelho confirmou sua identidade. Nenhuma ação com Bitcoin real foi autorizada.",
      );
      return;
    }

    if (result.error !== "user_cancel") {
      Alert.alert("Verificação não concluída", "A biometria não foi confirmada. Você pode tentar novamente.");
    }
  }

  async function prepareLightningProvider(provider: LightningProviderKind) {
    await selectLightningProvider(provider);
    Alert.alert(
      "Estrutura preparada",
              `${LIGHTNING_PROVIDER_PLANS[provider].title} foi selecionado apenas para ${SIGNET_NETWORK.label}. Não há credenciais, invoices ou pagamentos reais neste estágio.`,
    );
  }

  async function testNativeVaultIntegration() {
    if (!DivinoNativeVaultModule) {
      Alert.alert(
        "Development build necessário",
        "O Expo Go não inclui o módulo local do cofre. Instale o development build Android e abra-o com o servidor de desenvolvimento para executar este diagnóstico.",
      );
      return;
    }

    const capabilities = await DivinoNativeVaultModule.getCapabilitiesAsync();
    const expectedBoundary =
      capabilities.status === "skeleton" &&
      capabilities.requiresDevelopmentBuild &&
      capabilities.usesNativeBoundary &&
      !capabilities.supportsSecretProvisioning &&
      !capabilities.supportsSigning;

    if (!expectedBoundary) {
      Alert.alert("Contrato inesperado", "O development build retornou capacidades não autorizadas. Não prossiga com testes de cofre.");
      return;
    }

    try {
      await DivinoNativeVaultModule.assertOperationUnavailableAsync("diagnóstico público de integração");
      Alert.alert("Bloqueio ausente", "A operação indisponível não foi bloqueada. Não prossiga com testes de cofre.");
    } catch {
      Alert.alert(
        "Cofre nativo integrado",
        "O módulo Kotlin respondeu no development build e bloqueou a operação de teste como previsto. Nenhuma seed, chave, assinatura ou dado de cofre foi criado, lido ou gravado.",
      );
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PREFERÊNCIAS</Text>
          <Text style={styles.title}>Ajustes</Text>
        </View>

        <View style={styles.demoCard}>
          <MaterialIcons name="science" color="#085EAF" size={22} />
          <View style={styles.flex}>
            <Text style={styles.demoTitle}>Carteira em demonstração</Text>
            <Text style={styles.demoText}>As informações ficam neste aparelho e não há conexão com saldo Lightning real.</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>PRIVACIDADE</Text>
        <View style={styles.group}>
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Ocultar saldo</Text>
              <Text style={styles.settingDescription}>Protege a leitura do saldo na tela inicial.</Text>
            </View>
            <Switch
              value={state.settings.hideBalance}
              onValueChange={(value) => void setHideBalance(value)}
              trackColor={switchTrackColor}
              thumbColor={state.settings.hideBalance ? "#0A84FF" : "#F9FAFB"}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>SEGURANÇA</Text>
        <View style={styles.group}>
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Desbloqueio biométrico</Text>
              <Text style={styles.settingDescription}>Registra a preferência no armazenamento protegido.</Text>
            </View>
            <Switch
              value={state.settings.biometricsEnabled}
              onValueChange={(value) => void setBiometricsEnabled(value)}
              trackColor={switchTrackColor}
              thumbColor={state.settings.biometricsEnabled ? "#0A84FF" : "#F9FAFB"}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.actionRow}>
            <View style={styles.iconBox}>
              <MaterialIcons name="fingerprint" size={21} color="#0A84FF" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Testar desbloqueio</Text>
              <Text style={styles.settingDescription}>Usa a proteção configurada no aparelho.</Text>
              <Text accessibilityRole="button" onPress={() => void testBiometrics()} style={styles.textAction}>TESTAR BIOMETRIA →</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>DEVELOPMENT BUILD</Text>
        <View style={styles.group}>
          <View style={styles.actionRow}>
            <View style={[styles.iconBox, styles.vaultIcon]}>
              <MaterialIcons name="shield" size={21} color="#0E6E4B" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Diagnóstico do cofre nativo</Text>
              <Text style={styles.settingDescription}>Confirma a ponte Kotlin e o bloqueio explícito de operações, sem seed, chave, assinatura, backup ou rede.</Text>
              <Text accessibilityRole="button" onPress={() => void testNativeVaultIntegration()} style={styles.textAction}>TESTAR INTEGRAÇÃO →</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>REDE SIGNET (TESTE)</Text>
        <View style={styles.group}>
          <View style={styles.actionRow}>
            <View style={styles.iconBox}>
              <MaterialIcons name="travel-explore" size={21} color="#0A84FF" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Observar endereço {SIGNET_NETWORK.label}</Text>
              <Text style={styles.settingDescription}>
                Consulta saldo real de um endereço colado manualmente, via Esplora público. Ferramenta de teste — não
                é a carteira final.
              </Text>
              <Text accessibilityRole="button" onPress={() => router.push("/dev/signet-watch")} style={styles.textAction}>ABRIR →</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>CONEXÃO LIGHTNING</Text>
        <View style={styles.group}>
          <View style={styles.actionRow}>
            <View style={[styles.iconBox, styles.warningIcon]}>
              <MaterialIcons name="bolt" size={20} color="#B85A00" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>{connectionTitle}</Text>
              <Text style={styles.settingDescription}>{connectionDescription}</Text>
              <Text style={styles.demoBadge}>DEMO</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <ProviderOption
            description={LIGHTNING_PROVIDER_PLANS.nwc.description}
            icon="qr-code-2"
            isSelected={selectedProvider === "nwc"}
            onChoose={() => void prepareLightningProvider("nwc")}
            title="Nostr Wallet Connect"
          />
          <View style={styles.divider} />
          <ProviderOption
            description={LIGHTNING_PROVIDER_PLANS.gateway.description}
            icon="dns"
            isSelected={selectedProvider === "gateway"}
            onChoose={() => void prepareLightningProvider("gateway")}
            title="Gateway próprio"
          />
        </View>
        <Text style={styles.connectionNote}>{SIGNET_NETWORK.label} é o único ambiente de desenvolvimento definido. A seleção não abre rede nem pede segredos; Mainnet, saldo, invoice e pagamento reais continuam bloqueados até uma implementação auditada.</Text>
      </ScrollView>
    </View>
  );
}

function ProviderOption({
  description,
  icon,
  isSelected,
  onChoose,
  title,
}: {
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  isSelected: boolean;
  onChoose: () => void;
  title: string;
}) {
  return (
    <View style={styles.actionRow}>
      <View style={styles.iconBox}>
        <MaterialIcons name={icon} size={21} color="#0A84FF" />
      </View>
      <View style={styles.flex}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
        <Text accessibilityRole="button" onPress={onChoose} style={styles.textAction}>
          {isSelected ? "SELECIONADO ✓" : "PREPARAR CONEXÃO →"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, minHeight: 84, paddingHorizontal: 16, paddingVertical: 15 },
  connectionNote: { color: "#667085", fontSize: 11, lineHeight: 16, marginHorizontal: 4, marginTop: -4 },
  content: { gap: 14, paddingHorizontal: 20 },
  demoBadge: { alignSelf: "flex-start", backgroundColor: "#E6F4FE", borderRadius: 8, color: "#0A84FF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginTop: 8, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4 },
  demoCard: { alignItems: "flex-start", backgroundColor: "#E6F4FE", borderRadius: 16, flexDirection: "row", gap: 12, padding: 15 },
  demoText: { color: "#286A9E", fontSize: 12, lineHeight: 17 },
  demoTitle: { color: "#085EAF", fontSize: 14, fontWeight: "800", marginBottom: 4 },
  divider: { backgroundColor: "#E7EAF0", height: StyleSheet.hairlineWidth, marginLeft: 16 },
  eyebrow: { color: "#F7931A", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  flex: { flex: 1 },
  group: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 17, borderWidth: 1, overflow: "hidden" },
  header: { gap: 4, marginBottom: 6, marginTop: 4 },
  iconBox: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 14, height: 35, justifyContent: "center", marginTop: 2, width: 35 },
  loadingScreen: { alignItems: "center", backgroundColor: "#F7F9FC", flex: 1, justifyContent: "center" },
  screen: { backgroundColor: "#F7F9FC", flex: 1 },
  sectionLabel: { color: "#667085", fontSize: 11, fontWeight: "800", letterSpacing: 0.9, marginLeft: 4, marginTop: 12 },
  settingDescription: { color: "#667085", fontSize: 12, lineHeight: 17, marginTop: 4 },
  settingRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 76, paddingHorizontal: 16 },
  settingTitle: { color: "#1D2939", fontSize: 15, fontWeight: "600" },
  textAction: { color: "#0A84FF", fontSize: 11, fontWeight: "800", letterSpacing: 0.25, marginTop: 10, paddingVertical: 4 },
  title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 },
  vaultIcon: { backgroundColor: "#E7F7EF" },
  warningIcon: { backgroundColor: "#FFF3E5" },
});
