import Constants from "expo-constants";
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";

export type AppConfig = {
  graphqlApiUrl: string;
  webAppUrl: string;
};

type AppConfigContextValue = {
  config: AppConfig;
  isReady: boolean;
};

function normalizeUrlValue(value?: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isLocalhostHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function extractHostFromUrlLikeValue(value?: string | null) {
  const normalizedValue = normalizeUrlValue(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const parsed = normalizedValue.includes("://")
      ? new URL(normalizedValue)
      : new URL(`http://${normalizedValue}`);

    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function getExpoDevelopmentHost() {
  return (
    extractHostFromUrlLikeValue(Constants.expoConfig?.hostUri) ??
    extractHostFromUrlLikeValue(Constants.expoGoConfig?.debuggerHost) ??
    extractHostFromUrlLikeValue(Constants.linkingUri) ??
    extractHostFromUrlLikeValue(Constants.experienceUrl)
  );
}

function resolveDeviceReachableUrl(value?: string | null) {
  const normalizedValue = normalizeUrlValue(value);

  if (!normalizedValue) {
    return "";
  }

  try {
    const parsed = new URL(normalizedValue);

    if (Platform.OS !== "web" && isLocalhostHostname(parsed.hostname)) {
      const expoHost = getExpoDevelopmentHost();

      if (expoHost) {
        parsed.hostname = expoHost;
      }
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return normalizedValue;
  }
}

function readExtraValue(key: "graphqlApiUrl" | "webAppUrl") {
  const value = Constants.expoConfig?.extra?.[key];
  if (typeof value === "string" && value.trim()) {
    return resolveDeviceReachableUrl(value);
  }

  if (key === "graphqlApiUrl") {
    return resolveDeviceReachableUrl(process.env.EXPO_PUBLIC_GRAPHQL_API_URL);
  }

  return resolveDeviceReachableUrl(process.env.EXPO_PUBLIC_WEB_APP_URL) || "http://localhost:3000";
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: PropsWithChildren) {
  const value = useMemo<AppConfigContextValue>(
    () => ({
      config: {
        graphqlApiUrl: readExtraValue("graphqlApiUrl"),
        webAppUrl: readExtraValue("webAppUrl"),
      },
      isReady: true,
    }),
    [],
  );

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);

  if (!context) {
    throw new Error("useAppConfig must be used within AppConfigProvider.");
  }

  return context;
}
