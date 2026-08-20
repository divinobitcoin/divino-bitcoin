import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { validateBolt11Invoice } from "@/lib/bolt11";

export default function ScanInvoiceScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeScanner() {
    router.back();
  }

  function scanInvoice({ data }: BarcodeScanningResult) {
    if (scanned) return;
    setScanned(true);
    const validation = validateBolt11Invoice(data);
    if (!validation.valid) {
      haptic.error();
      setError(validation.error);
      return;
    }
    haptic.success();
    router.replace({ pathname: "/send", params: { invoice: validation.invoice.invoice } });
  }

  if (!permission) {
    return <ScreenContainer containerClassName="bg-[#0D1117]" safeAreaClassName="bg-[#0D1117]" style={styles.center}><ActivityIndicator color="#FFFFFF" /></ScreenContainer>;
  }

  if (!permission.granted) {
    return <ScreenContainer containerClassName="bg-[#0D1117]" safeAreaClassName="bg-[#0D1117]" style={styles.center}><MaterialIcons name="photo-camera" size={38} color="#F7F9FC" /><Text style={styles.permissionTitle}>Permitir acesso à câmera</Text><Text style={styles.permissionText}>A câmera é usada apenas para ler a invoice Lightning exibida no QR Code.</Text><Pressable onPress={requestPermission} style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}><Text style={styles.permissionButtonText}>Permitir câmera</Text></Pressable><Pressable onPress={closeScanner} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}><Text style={styles.linkText}>Voltar</Text></Pressable></ScreenContainer>;
  }

  return <View style={styles.container}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanned ? undefined : scanInvoice} /><View style={styles.shadeTop} /><View style={styles.header}><Pressable accessibilityLabel="Fechar leitor" onPress={closeScanner} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><MaterialIcons name="close" size={24} color="#FFFFFF" /></Pressable><Text style={styles.headerTitle}>Ler invoice Lightning</Text><View style={styles.headerSpacer} /></View><View style={styles.scannerArea}><View style={styles.scanFrame}><View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} /></View><Text style={styles.instructions}>Centralize o QR Code da invoice dentro da moldura.</Text></View><View style={styles.bottomPanel}>{error ? <><View style={styles.errorRow}><MaterialIcons name="error-outline" size={20} color="#FFB4AB" /><Text style={styles.errorTitle}>QR Code não é uma invoice BOLT11 válida</Text></View><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => { setError(null); setScanned(false); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></> : <><MaterialIcons name="bolt" size={22} color="#8DC7FF" /><Text style={styles.bottomTitle}>Validaremos a rede, o checksum, o payment hash e a assinatura antes de continuar.</Text></>}</View></View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#0D1117", flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", padding: 28 },
  permissionTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginTop: 8, textAlign: "center" },
  permissionText: { color: "#C8D1DC", fontSize: 15, lineHeight: 22, textAlign: "center" },
  permissionButton: { alignItems: "center", backgroundColor: "#0A84FF", borderRadius: 14, marginTop: 10, minHeight: 50, paddingHorizontal: 22, justifyContent: "center" },
  permissionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  linkButton: { padding: 11 }, linkText: { color: "#8DC7FF", fontSize: 15, fontWeight: "700" },
  shadeTop: { backgroundColor: "rgba(13,17,23,0.48)", height: "100%", position: "absolute", width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12 },
  closeButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  headerTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }, headerSpacer: { width: 44 },
  scannerArea: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 34 },
  scanFrame: { height: 252, position: "relative", width: 252 },
  corner: { borderColor: "#FFFFFF", height: 46, position: "absolute", width: 46 },
  topLeft: { borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 14, left: 0, top: 0 },
  topRight: { borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 14, right: 0, top: 0 },
  bottomLeft: { borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14, bottom: 0, left: 0 },
  bottomRight: { borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14, bottom: 0, right: 0 },
  instructions: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", lineHeight: 20, marginTop: 24, textAlign: "center" },
  bottomPanel: { backgroundColor: "#121C28", borderColor: "rgba(255,255,255,0.12)", borderTopWidth: 1, gap: 8, padding: 22 },
  bottomTitle: { color: "#D9E7F6", fontSize: 13, fontWeight: "600", lineHeight: 19 },
  errorRow: { alignItems: "center", flexDirection: "row", gap: 8 }, errorTitle: { color: "#FFFFFF", flex: 1, fontSize: 14, fontWeight: "800" },
  errorText: { color: "#FDD8D2", fontSize: 13, lineHeight: 18 },
  retryButton: { alignItems: "center", borderColor: "#8DC7FF", borderRadius: 12, borderWidth: 1, justifyContent: "center", marginTop: 6, minHeight: 46 }, retryText: { color: "#8DC7FF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
