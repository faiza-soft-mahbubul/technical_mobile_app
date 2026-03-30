import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function LoadingState(props: { label?: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={[styles.label, { color: colors.textSoft }]}>
        {props.label ?? "Loading..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    minHeight: 220,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
});
