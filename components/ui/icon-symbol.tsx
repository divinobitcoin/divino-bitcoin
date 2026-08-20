import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import type { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const MAPPING = {
  "bolt.fill": "bolt",
  "clock.fill": "schedule",
  "gearshape.fill": "settings",
  "chevron.right": "chevron-right",
  "house.fill": "home",
} as const satisfies Record<string, MaterialIconName>;

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({ name, size = 24, color, style }: { name: IconSymbolName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; weight?: SymbolWeight }) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
