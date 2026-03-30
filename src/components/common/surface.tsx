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
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
});
