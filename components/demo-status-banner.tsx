import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import { DEMO_ENVIRONMENT_LABEL, DEMO_STATUS_MESSAGE } from "@/shared/demo-fixtures";

export function DemoStatusBanner() {
  return (
    <View
      accessible
      accessibilityLabel={`Demonstração local. ${DEMO_ENVIRONMENT_LABEL}. ${DEMO_STATUS_MESSAGE}`}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name="science" size={18} color="#085EAF" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Demonstração local</Text>
        <Text style={styles.environment}>{DEMO_ENVIRONMENT_LABEL}</Text>
        <Text style={styles.description}>{DEMO_STATUS_MESSAGE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    backgroundColor: "#E6F4FE",
    borderColor: "#C9E7FA",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 13,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: "#D6EEFC",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  copy: { flex: 1, gap: 2 },
  title: { color: "#075985", fontSize: 13, fontWeight: "800" },
  environment: { color: "#0C4A6E", fontSize: 12, fontWeight: "700" },
  description: { color: "#286A9E", fontSize: 12, lineHeight: 17 },
});
