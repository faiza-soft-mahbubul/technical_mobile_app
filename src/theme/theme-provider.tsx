import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { darkTheme, type ThemeMode } from "./tokens";

const THEME_STORAGE_KEY = "mas_mobile_theme_mode";

type ThemeContextValue = (typeof darkTheme) & {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [isReady] = useState(true);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState("dark");
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "dark");
  }, []);

  const resolvedTheme = darkTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...resolvedTheme,
      mode: "dark",
      setMode,
      isReady,
    }),
    [isReady, resolvedTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside ThemeProvider.");
  }

  return context;
}
