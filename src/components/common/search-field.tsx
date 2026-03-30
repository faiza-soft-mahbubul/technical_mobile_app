import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

export function SearchField(props: TextInputProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.cardMuted,
          borderColor: "transparent",
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textSoft} />
      <TextInput
        placeholder="Search"
        placeholderTextColor={colors.textSoft}
        style={[styles.input, { color: colors.text }]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
});
