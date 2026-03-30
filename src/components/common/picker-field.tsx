import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

type PickerOption = {
  label: string;
  value: string;
};

type PickerFieldProps = {
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  selectedValue: string;
  options: PickerOption[];
  onValueChange: (value: string) => void;
  enabled?: boolean;
  prompt?: string;
};

export function PickerField({
  containerStyle,
  label,
  selectedValue,
  options,
  onValueChange,
  enabled = true,
}: PickerFieldProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textDim }]}>{label}</Text> : null}
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.cardMuted,
            borderColor: "transparent",
            opacity: enabled ? 1 : 0.6,
          },
        ]}
      >
        <Picker
          enabled={enabled}
          dropdownIconColor={colors.textSoft}
          selectedValue={selectedValue}
          style={[
            styles.picker,
            {
              color: colors.text,
            },
          ]}
          itemStyle={{
            color: isDark ? "#ffffff" : "#0f172a",
          }}
          onValueChange={(value) => onValueChange(String(value))}
        >
          {options.map((option) => (
            <Picker.Item
              key={`${option.label}-${option.value}`}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
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
  container: {
    borderRadius: 8,
    borderWidth: 0,
    overflow: "hidden",
  },
  picker: {
    minHeight: 46,
  },
});
