import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function EmptyState(props: {
  title: string;
  description: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: "transparent",
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{props.title}</Text>
      <Text style={[styles.description, { color: colors.textSoft }]}>
        {props.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
