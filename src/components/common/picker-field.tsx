import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
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
  prompt,
}: PickerFieldProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === selectedValue)?.label ?? "";
  }, [options, selectedValue]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textDim }]}>{label}</Text> : null}
      <Pressable
        disabled={!enabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.cardMuted,
            opacity: enabled ? (pressed ? 0.92 : 1) : 0.58,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.triggerLabel,
            {
              color: selectedLabel ? colors.text : colors.textSoft,
            },
          ]}
        >
          {selectedLabel || prompt || "Choose option"}
        </Text>
        <Ionicons color={colors.textSoft} name="chevron-down" size={18} />
      </Pressable>

      <Modal animationType="fade" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={[styles.overlay, { backgroundColor: "rgba(2, 8, 23, 0.62)" }]}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {prompt || label || "Select option"}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Ionicons color={colors.textSoft} name="close" size={18} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.optionList}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const selected = option.value === selectedValue;

                return (
                  <Pressable
                    key={`${option.label}-${option.value}`}
                    onPress={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: selected ? colors.accent : colors.cardMuted,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: selected ? "#042321" : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected ? (
                      <Ionicons color="#042321" name="checkmark" size={18} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  trigger: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  triggerLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    borderRadius: 8,
    maxHeight: "72%",
    padding: 14,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  optionList: {
    gap: 8,
  },
  option: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
