import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

type TextFieldProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  hint?: string;
  error?: string | null;
};

export function TextField({
  containerStyle,
  label,
  hint,
  error,
  style,
  ...props
}: TextFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textDim }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSoft}
        style={[
          styles.input,
          {
            backgroundColor: colors.cardMuted,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.textSoft }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 8,
    borderWidth: 0,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
});
