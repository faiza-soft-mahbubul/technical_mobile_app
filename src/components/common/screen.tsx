import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme/theme-provider";

type ScreenProps = ScrollViewProps & {
  children: ReactNode;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: (() => void) | undefined;
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  padded = true,
  refreshing,
  onRefresh,
  contentStyle,
  ...props
}: ScreenProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {isDark ? (
        <LinearGradient
          colors={["#04101d", "#071427", "#0a1930"]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              tintColor={colors.accent}
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
            />
          ) : undefined
        }
        {...props}
      >
        <View
          style={[
            styles.inner,
            padded && styles.padded,
            contentStyle,
          ]}
        >
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function InlineScreen({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={[styles.inlineScreen, { backgroundColor: colors.background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  inner: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: 960,
    width: "100%",
  },
  padded: {
    paddingHorizontal: 14,
    paddingBottom: 22,
    paddingTop: 14,
  },
  inlineScreen: {
    flex: 1,
  },
});
