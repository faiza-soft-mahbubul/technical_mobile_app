import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function Badge(props: {
  label: string;
  tone?: "neutral" | "pending" | "processing" | "completed" | "accent";
  size?: "default" | "compact";
}) {
  const { colors, isDark } = useAppTheme();

  const palette = {
    neutral: {
      backgroundColor: isDark ? "#13253d" : colors.cardMuted,
      color: isDark ? "#bfd0e4" : colors.textDim,
    },
    pending: {
      backgroundColor: isDark ? "#4a3310" : "#fff2d8",
      color: isDark ? "#ffd79b" : "#b7791f",
    },
    processing: {
      backgroundColor: isDark ? "#163a60" : "#e8f1ff",
      color: isDark ? "#c4deff" : "#2b6adf",
    },
    completed: {
      backgroundColor: isDark ? "#123a25" : "#daf3e4",
      color: isDark ? "#c9ffdf" : "#20945d",
    },
    accent: {
      backgroundColor: isDark ? "#104044" : colors.accentMuted,
      color: isDark ? "#cffffa" : colors.accentStrong,
    },
  }[props.tone ?? "neutral"];
  const compact = props.size === "compact";

  return (
    <View
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        { backgroundColor: palette.backgroundColor },
      ]}
    >
      <Text
        style={[
          styles.label,
          compact ? styles.labelCompact : null,
          { color: palette.color },
        ]}
      >
        {props.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  labelCompact: {
    fontSize: 11,
  },
});
