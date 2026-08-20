import { lazy, Suspense } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const FullAppLayout = lazy(() => import("@/components/full-app-layout"));
const AndroidNavigationLayout = lazy(() => import("@/components/android-navigation-layout"));

function AndroidBootstrapProbe() {
  return (
    <View style={styles.probe}>
      <Text style={styles.eyebrow}>DIVINO BITCOIN</Text>
      <Text style={styles.title}>Inicialização Android ativa</Text>
      <Text style={styles.description}>
        Esta tela confirma que o Expo Go concluiu o bootstrap nativo.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  if (Platform.OS === "android") {
    return (
      <Suspense fallback={<AndroidBootstrapProbe />}>
        <AndroidNavigationLayout />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <FullAppLayout />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  probe: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  eyebrow: {
    color: "#F7931A",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    marginBottom: 12,
  },
  description: {
    color: "#4B5563",
    fontSize: 16,
    lineHeight: 24,
  },
});
