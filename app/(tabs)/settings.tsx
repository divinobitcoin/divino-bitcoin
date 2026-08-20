import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { useWallet } from "@/lib/wallet-context";
import { LIGHTNING_PROVIDER_PLANS, type LightningProviderKind } from "@/shared/lightning";

export default function SettingsScreen() {
  const { state, isReady, selectLightningProvider, setBiometricsEnabled, setHideBalance } = useWallet();
  if (!isReady || !state) return <ScreenContainer className="items-center justify-center" />;

  async function testBiometrics() {
    if (Platform.OS === "web") { Alert.alert("Disponível no celular", "O desbloqueio biométrico pode ser usado nas versões nativas para Android e iOS."); return; }
    const LocalAuthentication = await import("expo-local-authentication");
    const [hasHardware, isEnrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if (!hasHardware || !isEnrolled) { Alert.alert("Biometria indisponível", "Configure uma impressão digital, Face ID ou desbloqueio facial no aparelho para usar este recurso."); return; }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirmar acesso ao Divino Bitcoin", fallbackLabel: "Usar código do aparelho" });
    if (result.success) { haptic.success(); Alert.alert("Biometria confirmada", "O aparelho confirmou sua identidade. Em uma integração Lightning real, essa proteção será aplicada a ações sensíveis."); }
  }

  async function prepareLightningProvider(provider: LightningProviderKind) {
    haptic.medium();
    await selectLightningProvider(provider);
    Alert.alert("Estrutura preparada", `${LIGHTNING_PROVIDER_PLANS[provider].title} foi selecionado como caminho de integração. A conexão continua desativada: não há credenciais, invoices ou pagamentos reais neste estágio.`);
  }

  const selectedProvider = state.lightning.provider;
  const connectionTitle = selectedProvider ? `${LIGHTNING_PROVIDER_PLANS[selectedProvider].title} selecionado` : "Nenhuma fonte selecionada";
  const connectionDescription = selectedProvider ? "A arquitetura está registrada localmente; a ativação depende da configuração segura da próxima etapa." : "Escolha uma arquitetura para preparar a futura integração sem conectar fundos reais.";

  return (
    <ScreenContainer containerClassName="bg-[#F7F9FC]" safeAreaClassName="bg-[#F7F9FC]"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.eyebrow}>PREFERÊNCIAS</Text><Text style={styles.title}>Ajustes</Text></View>
      <View style={styles.demoCard}><MaterialIcons name="science" color="#085EAF" size={22} /><View style={styles.flex}><Text style={styles.demoTitle}>Carteira em demonstração</Text><Text style={styles.demoText}>As informações ficam neste aparelho e não há conexão com saldo Lightning real.</Text></View></View>
      <Text style={styles.sectionLabel}>PRIVACIDADE</Text><View style={styles.group}><View style={styles.settingRow}><View style={styles.settingText}><Text style={styles.settingTitle}>Ocultar saldo</Text><Text style={styles.settingDescription}>Protege a leitura do saldo na tela inicial.</Text></View><Switch value={state.settings.hideBalance} onValueChange={(value) => { haptic.medium(); void setHideBalance(value); }} trackColor={{ false: "#D1D5DB", true: "#8DC8FF" }} thumbColor={state.settings.hideBalance ? "#0A84FF" : "#F9FAFB"} /></View></View>
      <Text style={styles.sectionLabel}>SEGURANÇA</Text><View style={styles.group}><View style={styles.settingRow}><View style={styles.settingText}><Text style={styles.settingTitle}>Desbloqueio biométrico</Text><Text style={styles.settingDescription}>Registrar a preferência no armazenamento protegido.</Text></View><Switch value={state.settings.biometricsEnabled} onValueChange={(value) => { haptic.medium(); void setBiometricsEnabled(value); }} trackColor={{ false: "#D1D5DB", true: "#8DC8FF" }} thumbColor={state.settings.biometricsEnabled ? "#0A84FF" : "#F9FAFB"} /></View><View style={styles.divider} /><Pressable onPress={() => void testBiometrics()} style={({ pressed }) => [styles.testRow, pressed && styles.pressed]}><View style={styles.settingIcon}><MaterialIcons name="fingerprint" size={21} color="#0A84FF" /></View><View style={styles.flex}><Text style={styles.settingTitle}>Testar desbloqueio</Text><Text style={styles.settingDescription}>Usa a proteção configurada no aparelho.</Text></View><MaterialIcons name="chevron-right" size={22} color="#98A2B3" /></Pressable></View>
      <Text style={styles.sectionLabel}>CONEXÃO LIGHTNING</Text><View style={styles.group}><View style={styles.testRow}><View style={[styles.settingIcon, styles.warningIcon]}><MaterialIcons name="bolt" size={20} color="#B85A00" /></View><View style={styles.flex}><Text style={styles.settingTitle}>{connectionTitle}</Text><Text style={styles.settingDescription}>{connectionDescription}</Text></View><View style={styles.demoBadge}><Text style={styles.demoBadgeText}>DEMO</Text></View></View><View style={styles.divider} /><Pressable accessibilityRole="button" accessibilityLabel="Preparar Nostr Wallet Connect" onPress={() => void prepareLightningProvider("nwc")} style={({ pressed }) => [styles.testRow, pressed && styles.pressed]}><View style={styles.settingIcon}><MaterialIcons name="qr-code-2" size={21} color="#0A84FF" /></View><View style={styles.flex}><Text style={styles.settingTitle}>Nostr Wallet Connect</Text><Text style={styles.settingDescription}>{LIGHTNING_PROVIDER_PLANS.nwc.description}</Text></View>{selectedProvider === "nwc" ? <MaterialIcons name="check-circle" size={22} color="#16803A" /> : <MaterialIcons name="chevron-right" size={22} color="#98A2B3" />}</Pressable><View style={styles.divider} /><Pressable accessibilityRole="button" accessibilityLabel="Preparar gateway próprio" onPress={() => void prepareLightningProvider("gateway")} style={({ pressed }) => [styles.testRow, pressed && styles.pressed]}><View style={styles.settingIcon}><MaterialIcons name="dns" size={21} color="#0A84FF" /></View><View style={styles.flex}><Text style={styles.settingTitle}>Gateway próprio</Text><Text style={styles.settingDescription}>{LIGHTNING_PROVIDER_PLANS.gateway.description}</Text></View>{selectedProvider === "gateway" ? <MaterialIcons name="check-circle" size={22} color="#16803A" /> : <MaterialIcons name="chevron-right" size={22} color="#98A2B3" />}</Pressable></View><Text style={styles.connectionNote}>A seleção não abre rede nem pede segredos. Os métodos de saldo, invoice e pagamento permanecem bloqueados até uma implementação auditada.</Text>
    </ScrollView></ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 20, paddingBottom: 32 }, header: { gap: 4, marginBottom: 6, marginTop: 4 }, eyebrow: { color: "#0A84FF", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { color: "#101828", fontSize: 29, fontWeight: "700", letterSpacing: -0.6 }, demoCard: { alignItems: "flex-start", backgroundColor: "#E6F4FE", borderRadius: 16, flexDirection: "row", gap: 12, padding: 15 }, flex: { flex: 1 }, demoTitle: { color: "#085EAF", fontSize: 14, fontWeight: "800", marginBottom: 4 }, demoText: { color: "#286A9E", fontSize: 12, lineHeight: 17 }, sectionLabel: { color: "#667085", fontSize: 11, fontWeight: "800", letterSpacing: 0.9, marginLeft: 4, marginTop: 12 }, group: { backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 17, borderWidth: 1, overflow: "hidden" }, settingRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 76, paddingHorizontal: 16 }, settingText: { flex: 1, gap: 4 }, settingTitle: { color: "#1D2939", fontSize: 15, fontWeight: "600" }, settingDescription: { color: "#667085", fontSize: 12, lineHeight: 17 }, divider: { backgroundColor: "#E7EAF0", height: StyleSheet.hairlineWidth, marginLeft: 16 }, testRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 76, paddingHorizontal: 16 }, pressed: { opacity: 0.6 }, settingIcon: { alignItems: "center", backgroundColor: "#E6F4FE", borderRadius: 14, height: 35, justifyContent: "center", width: 35 }, warningIcon: { backgroundColor: "#FFF3E5" }, demoBadge: { backgroundColor: "#E6F4FE", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 }, demoBadgeText: { color: "#0A84FF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }, connectionNote: { color: "#667085", fontSize: 11, lineHeight: 16, marginHorizontal: 4, marginTop: -4 },
});
