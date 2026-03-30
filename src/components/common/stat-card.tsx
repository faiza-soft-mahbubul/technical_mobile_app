import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function StatCard(props: {
  label: string;
  value: number | string;
  tone?: "accent" | "pending" | "processing" | "completed";
}) {
  const { colors } = useAppTheme();
  const palette = {
    accent: colors.accent,
    pending: "#d7962a",
    processing: "#2f80ed",
    completed: "#22a86f",
  }[props.tone ?? "accent"];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette }]} />
      <Text style={[styles.label, { color: colors.textSoft }]}>{props.label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: 0,
    flexGrow: 1,
    gap: 10,
    minWidth: 140,
    minHeight: 118,
    padding: 16,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
});
