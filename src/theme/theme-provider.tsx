import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type ThemeMode } from "./tokens";

const THEME_STORAGE_KEY = "mas_mobile_theme_mode";

type ThemeContextValue = (typeof darkTheme) & {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedValue) => {
        if (!isMounted) {
          return;
        }

        if (storedValue === "light" || storedValue === "dark" || storedValue === "system") {
          setModeState(storedValue);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const resolvedTheme = mode === "system"
    ? systemScheme === "dark"
      ? darkTheme
      : lightTheme
    : mode === "dark"
      ? darkTheme
      : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...resolvedTheme,
      mode,
      setMode,
      isReady,
    }),
    [isReady, mode, resolvedTheme, setMode],
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
