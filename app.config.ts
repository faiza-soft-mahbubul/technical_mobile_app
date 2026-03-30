import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig } from "expo/config";

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const rawValue = fs.readFileSync(filePath, "utf8");
  const lines = rawValue.split(/\r?\n/);
  const entries: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key) {
      entries[key] = value;
    }
  }

  return entries;
}

const rootEnvPath = path.resolve(__dirname, "../.env.local");
const rootEnv = parseEnvFile(rootEnvPath);

const graphqlApiUrl = rootEnv.GRAPHQL_API_URL?.trim() ?? "";
const webAppUrl =
  rootEnv.MOBILE_WEB_APP_URL?.trim() ||
  rootEnv.WEB_APP_URL?.trim() ||
  rootEnv.NEXT_PUBLIC_WEB_APP_URL?.trim() ||
  rootEnv.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const config: ExpoConfig = {
  name: "MAS Technical Mobile",
  slug: "mas-technical-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#081522",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: "com.anonymous.mastechnicalmobile",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-secure-store", "expo-web-browser"],
  extra: {
    graphqlApiUrl,
    webAppUrl,
  },
};

export default config;
