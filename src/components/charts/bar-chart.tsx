import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { useAppTheme } from "@/theme/theme-provider";
import type { MonthlyOrderPoint } from "@/api/types";

export function BarChart(props: {
  data: MonthlyOrderPoint[];
  barColor?: string;
  height?: number;
  labelColor?: string;
  radius?: number;
}) {
  const { colors } = useAppTheme();
  const width = Math.max(320, props.data.length * 30 + 32);
  const height = props.height ?? 180;
  const chartHeight = Math.max(82, height - 56);
  const chartTop = 18;
  const labelY = height - 24;
  const innerWidth = width - 32;
  const slotWidth = props.data.length > 0 ? innerWidth / props.data.length : innerWidth;
  const barWidth = Math.min(18, Math.max(10, slotWidth - 10));
  const maxValue = Math.max(...props.data.map((item) => item.count), 1);
  const barColor = props.barColor ?? colors.accent;
  const labelColor = props.labelColor ?? colors.textSoft;
  const radius = props.radius ?? 8;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {props.data.map((item, index) => {
        const x = 16 + index * slotWidth + (slotWidth - barWidth) / 2;
        const barHeight = (item.count / maxValue) * chartHeight;
        const y = chartTop + (chartHeight - barHeight);

        return (
          <Rect
            key={`${item.month}-${item.monthLabel}`}
            x={x}
            y={y}
            rx={radius}
            ry={radius}
            width={barWidth}
            height={barHeight}
            fill={barColor}
          />
        );
      })}
      {props.data.map((item, index) => (
        <SvgText
          key={`label-${item.month}`}
          x={16 + index * slotWidth + slotWidth / 2}
          y={labelY}
          fontSize="10"
          fill={labelColor}
          textAnchor="middle"
        >
          {item.monthLabel.slice(0, 3)}
        </SvgText>
      ))}
    </Svg>
  );
}
