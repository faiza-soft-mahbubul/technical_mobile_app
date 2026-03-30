import type { ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

type IconButtonProps = PressableProps & {
  children: ReactNode;
};

export function IconButton({ children, style, ...props }: IconButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={(state) => [
        styles.button,
        {
          backgroundColor: colors.cardMuted,
          borderColor: colors.border,
          opacity: state.pressed ? 0.88 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
