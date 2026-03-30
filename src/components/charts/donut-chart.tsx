import { useMemo } from "react";
import Svg, { Circle } from "react-native-svg";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import type { PackageDistributionPoint } from "@/api/types";
import { useAppTheme } from "@/theme/theme-provider";

export const DONUT_CHART_COLORS = [
  "#19c4bb",
  "#2f80ed",
  "#f7a928",
  "#9b5de5",
  "#ef476f",
  "#14b8a6",
  "#64748b",
];

export function DonutChart(props: {
  data: PackageDistributionPoint[];
  total: number;
  labelColor?: string;
  size?: number;
  totalColor?: string;
  trackColor?: string;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const size = props.size ?? (width < 380 ? 148 : 170);
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const trackColor = props.trackColor ?? colors.border;
  const totalColor = props.totalColor ?? colors.text;
  const labelColor = props.labelColor ?? colors.textSoft;
  const segments = useMemo(
    () =>
      props.data.map((item, index) => {
        const ratio = props.total > 0 ? item.count / props.total : 0;
        const dash = ratio * circumference;
        const offset = props.data
          .slice(0, index)
          .reduce((total, current) => {
            if (!props.total) {
              return total;
            }

            return total + (current.count / props.total) * circumference;
          }, 0);

        return {
          dash,
          item,
          offset,
          stroke: DONUT_CHART_COLORS[index % DONUT_CHART_COLORS.length],
        };
      }),
    [circumference, props.data, props.total],
  );

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {segments.map((segment) => (
          <Circle
            key={segment.item.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segment.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ))}
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.total, { color: totalColor }]}>{props.total}</Text>
        <Text style={[styles.label, { color: labelColor }]}>Orders</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  total: {
    fontSize: 30,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
