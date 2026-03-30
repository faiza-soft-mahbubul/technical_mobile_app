import { StyleSheet, View, type ViewProps } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

type SurfaceProps = ViewProps & {
  muted?: boolean;
};

export function Surface({ style, muted = false, ...props }: SurfaceProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: muted ? colors.cardMuted : colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 8,
    borderWidth: 0,
    padding: 12,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 0,
  },
});
