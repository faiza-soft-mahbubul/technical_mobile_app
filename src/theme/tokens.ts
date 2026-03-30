import type { Theme as NavigationTheme } from "@react-navigation/native";

export type ThemeMode = "system" | "light" | "dark";

export type AppColors = {
  accent: string;
  accentMuted: string;
  accentStrong: string;
  background: string;
  backgroundSecondary: string;
  border: string;
  card: string;
  cardMuted: string;
  danger: string;
  muted: string;
  ring: string;
  shadow: string;
  success: string;
  text: string;
  textDim: string;
  textSoft: string;
  warning: string;
};

export type AppTheme = {
  colors: AppColors;
  isDark: boolean;
  navigationTheme: NavigationTheme;
};

const common = {
  accent: "#19c4bb",
  accentMuted: "#e7fffb",
  accentStrong: "#0d8c85",
  danger: "#ef6a6a",
  ring: "rgba(25, 196, 187, 0.18)",
  success: "#22a86f",
  warning: "#d7962a",
};

export const lightTheme: AppTheme = {
  isDark: false,
  colors: {
    ...common,
    background: "#f4f7fb",
    backgroundSecondary: "#edf2f8",
    border: "#d6deea",
    card: "#ffffff",
    cardMuted: "#f8fafc",
    muted: "#eef3f8",
    shadow: "rgba(15, 23, 42, 0.08)",
    text: "#0f172a",
    textDim: "#516176",
    textSoft: "#7b8797",
  },
  navigationTheme: {
    dark: false,
    colors: {
      primary: common.accent,
      background: "#f4f7fb",
      card: "#ffffff",
      text: "#0f172a",
      border: "#d6deea",
      notification: common.accent,
    },
    fonts: {
      regular: {
        fontFamily: "System",
        fontWeight: "400",
      },
      medium: {
        fontFamily: "System",
        fontWeight: "500",
      },
      bold: {
        fontFamily: "System",
        fontWeight: "700",
      },
      heavy: {
        fontFamily: "System",
        fontWeight: "800",
      },
    },
  },
};

export const darkTheme: AppTheme = {
  isDark: true,
  colors: {
    ...common,
    background: "#06111f",
    backgroundSecondary: "#0b1728",
    border: "#18324a",
    card: "#0c1a2d",
    cardMuted: "#12233a",
    muted: "#10213a",
    shadow: "rgba(2, 8, 23, 0.4)",
    text: "#f8fbff",
    textDim: "#a8bacf",
    textSoft: "#7d93aa",
  },
  navigationTheme: {
    dark: true,
    colors: {
      primary: common.accent,
      background: "#06111f",
      card: "#0c1a2d",
      text: "#f8fbff",
      border: "#18324a",
      notification: common.accent,
    },
    fonts: {
      regular: {
        fontFamily: "System",
        fontWeight: "400",
      },
      medium: {
        fontFamily: "System",
        fontWeight: "500",
      },
      bold: {
        fontFamily: "System",
        fontWeight: "700",
      },
      heavy: {
        fontFamily: "System",
        fontWeight: "800",
      },
    },
  },
};
