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
  accentMuted: "#10393d",
  accentStrong: "#11a7b0",
  danger: "#ff8f8f",
  ring: "rgba(25, 196, 187, 0.18)",
  success: "#38c27b",
  warning: "#f3b13f",
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
    background: "#020817",
    backgroundSecondary: "#071427",
    border: "rgba(176, 204, 255, 0.08)",
    card: "rgba(8, 23, 41, 0.72)",
    cardMuted: "rgba(255, 255, 255, 0.06)",
    muted: "rgba(255, 255, 255, 0.04)",
    shadow: "rgba(2, 8, 23, 0.42)",
    text: "#f8fbff",
    textDim: "#c8d7ea",
    textSoft: "rgba(220, 234, 252, 0.48)",
  },
  navigationTheme: {
    dark: true,
    colors: {
      primary: common.accent,
      background: "#020817",
      card: "#071427",
      text: "#f8fbff",
      border: "rgba(176, 204, 255, 0.08)",
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
