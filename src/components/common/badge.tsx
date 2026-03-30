import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function Badge(props: {
  label: string;
  tone?: "neutral" | "pending" | "processing" | "completed" | "accent";
}) {
  const { colors } = useAppTheme();

  const palette = {
    neutral: {
      backgroundColor: colors.cardMuted,
      color: colors.textDim,
    },
    pending: {
      backgroundColor: "#fff2d8",
      color: "#b7791f",
    },
    processing: {
      backgroundColor: "#e8f1ff",
      color: "#2b6adf",
    },
    completed: {
      backgroundColor: "#daf3e4",
      color: "#20945d",
    },
    accent: {
      backgroundColor: colors.accentMuted,
      color: colors.accentStrong,
    },
  }[props.tone ?? "neutral"];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.color }]}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
