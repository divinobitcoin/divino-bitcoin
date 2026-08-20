import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

export default function WebThemeScope({
  children,
  colorScheme,
}: {
  children: React.ReactNode;
  colorScheme: ColorScheme;
}) {
  useEffect(() => {
    nativewindColorScheme.set(colorScheme);
    const root = document.documentElement;
    root.dataset.theme = colorScheme;
    root.classList.toggle("dark", colorScheme === "dark");
    const palette = SchemeColors[colorScheme];
    Object.entries(palette).forEach(([token, value]) => {
      root.style.setProperty(`--color-${token}`, value);
    });
  }, [colorScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  return <View style={[{ flex: 1 }, themeVariables]}>{children}</View>;
}
