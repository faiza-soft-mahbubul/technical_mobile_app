import type { ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function SectionHeader(props: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 420;

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            compact && styles.titleCompact,
            { color: colors.text },
          ]}
        >
          {props.title}
        </Text>
        {props.description ? (
          <Text style={[styles.description, { color: colors.textSoft }]}>
            {props.description}
          </Text>
        ) : null}
      </View>
      {props.action ? (
        <View style={compact ? styles.actionCompact : undefined}>{props.action}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  wrapperCompact: {
    flexDirection: "column",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  titleCompact: {
    fontSize: 26,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionCompact: {
    alignSelf: "stretch",
  },
});
