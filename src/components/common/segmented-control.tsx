import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/theme-provider";

type SegmentOption<T extends string> = {
  label: string;
  value: T;
  meta?: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? colors.accent : colors.cardMuted,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? "#042321" : colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
              {option.meta ? (
                <Text
                  style={[
                    styles.meta,
                    {
                      color: active ? "#063c38" : colors.textSoft,
                    },
                  ]}
                >
                  {option.meta}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
  },
  pill: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginRight: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
  },
});
