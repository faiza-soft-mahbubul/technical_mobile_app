import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  tone?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  label,
  loading,
  tone = "primary",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      color: "#042321",
    },
    secondary: {
      backgroundColor: colors.cardMuted,
      borderColor: colors.border,
      color: colors.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: colors.border,
      color: colors.text,
    },
    danger: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
      color: "#ffffff",
    },
  }[tone];

  return (
    <Pressable
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.65 : state.pressed ? 0.9 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
});
