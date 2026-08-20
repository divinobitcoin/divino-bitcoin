import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme as useSystemColorScheme } from "react-native";

import type { ColorScheme } from "@/constants/theme";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const isWeb = Platform.OS === "web";
const WebThemeScope = lazy(() => import("@/lib/web-theme-scope"));

function resolveColorScheme(systemScheme: string | null | undefined): ColorScheme {
  return systemScheme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = resolveColorScheme(useSystemColorScheme());
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  }, []);

  useEffect(() => {
    setColorSchemeState(systemScheme);
  }, [systemScheme]);

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme],
  );
  const content = isWeb ? (
    <Suspense fallback={children}>
      <WebThemeScope colorScheme={colorScheme}>{children}</WebThemeScope>
    </Suspense>
  ) : children;

  return <ThemeContext.Provider value={value}>{content}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
