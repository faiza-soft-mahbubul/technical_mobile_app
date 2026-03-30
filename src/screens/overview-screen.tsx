import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  OVERVIEW_ORDERS_BY_MONTH_QUERY,
  OVERVIEW_PACKAGE_DISTRIBUTION_QUERY,
  OVERVIEW_STATS_QUERY,
  RECENT_ACTIVITIES_QUERY,
} from "@/api/documents";
import type {
  MonthlyOrderPoint,
  OverviewRange,
  OverviewStats,
  PackageDistributionPoint,
  RecentActivityItem,
} from "@/api/types";
import type { MainTabScreenProps } from "@/navigation/types";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { useAuth } from "@/providers/auth-provider";
import { formatDateTime, formatRelativeTime } from "@/utils/format";
import { useAsyncResource } from "@/utils/use-async-resource";

const BACKGROUND_GRADIENT = ["#020817", "#071427", "#0a1d33"] as const;
const RANGE_ACTIVE_GRADIENT = ["#1ccfbe", "#16b9c4"] as const;

const PALETTE = {
  accent: "#19c4bb",
  accentStrong: "#11a7b0",
  backgroundSoft: "rgba(8, 23, 41, 0.72)",
  backgroundSofter: "rgba(255, 255, 255, 0.06)",
  chartTrack: "rgba(176, 204, 255, 0.14)",
  danger: "#ff8f8f",
  line: "rgba(176, 204, 255, 0.1)",
  muted: "rgba(220, 234, 252, 0.48)",
  pending: "#f3b13f",
  processing: "#59a6ff",
  success: "#38c27b",
  text: "#f8fbff",
} as const;

const rangeOptions = [
  { label: "Today", value: "TODAY" },
  { label: "Yesterday", value: "YESTERDAY" },
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
] as const;

type OverviewBundle = {
  activities: RecentActivityItem[];
  monthlyPoints: MonthlyOrderPoint[];
  packageDistribution: PackageDistributionPoint[];
  stats: OverviewStats;
  totalPackageOrders: number;
};

function getLaneTone(label: string) {
  const normalized = label.trim().toLowerCase();

  if (normalized.includes("completed")) {
    return {
      backgroundColor: "rgba(56, 194, 123, 0.18)",
      color: PALETTE.success,
    };
  }

  if (normalized.includes("processing")) {
    return {
      backgroundColor: "rgba(89, 166, 255, 0.18)",
      color: PALETTE.processing,
    };
  }

  if (normalized.includes("pending")) {
    return {
      backgroundColor: "rgba(243, 177, 63, 0.18)",
      color: PALETTE.pending,
    };
  }

  return {
    backgroundColor: "rgba(28, 207, 190, 0.18)",
    color: PALETTE.accent,
  };
}

export function OverviewScreen({ navigation }: MainTabScreenProps<"Overview">) {
  const { width } = useWindowDimensions();
  const { executeAuthenticated } = useAuth();
  const [range, setRange] = useState<OverviewRange>("THIS_MONTH");
  const compact = width < 390;

  const referenceDate = useMemo(() => {
    const today = new Date();

    if (range === "YESTERDAY") {
      today.setDate(today.getDate() - 1);
    } else if (range === "LAST_MONTH") {
      today.setMonth(today.getMonth() - 1);
    }

    return today;
  }, [range]);

  const resource = useAsyncResource<OverviewBundle>(
    async () => {
      const year = referenceDate.getFullYear();
      const month = referenceDate.getMonth() + 1;

      const [statsData, monthlyData, packageData, activityData] = await Promise.all([
        executeAuthenticated<{ overviewStats: OverviewStats }, { input: { range: OverviewRange } }>(
          OVERVIEW_STATS_QUERY,
          {
            input: { range },
          },
        ),
        executeAuthenticated<
          {
            overviewOrdersByMonth: {
              items: MonthlyOrderPoint[];
            };
          },
          { input: { year: number; month?: number } }
        >(OVERVIEW_ORDERS_BY_MONTH_QUERY, {
          input: {
            year,
            month,
          },
        }),
        executeAuthenticated<
          {
            overviewPackageDistribution: {
              totalOrders: number;
              items: PackageDistributionPoint[];
            };
          },
          { input: { year: number; month?: number } }
        >(OVERVIEW_PACKAGE_DISTRIBUTION_QUERY, {
          input: {
            year,
            month,
          },
        }),
        executeAuthenticated<
          {
            recentActivities: {
              items: RecentActivityItem[];
            };
          },
          { input: { page: number; pageSize: number } }
        >(RECENT_ACTIVITIES_QUERY, {
          input: {
            page: 1,
            pageSize: 4,
          },
        }),
      ]);

      return {
        activities: activityData.recentActivities.items,
        monthlyPoints: monthlyData.overviewOrdersByMonth.items,
        packageDistribution: packageData.overviewPackageDistribution.items,
        stats: statsData.overviewStats,
        totalPackageOrders: packageData.overviewPackageDistribution.totalOrders,
      };
    },
    [executeAuthenticated, range, referenceDate.getFullYear(), referenceDate.getMonth()],
  );

  const statItems = resource.data
    ? [
        {
          accent: PALETTE.accent,
          label: "Total Companies",
          value: resource.data.stats.totalCompanies,
        },
        {
          accent: PALETTE.pending,
          label: "Pending Orders",
          value: resource.data.stats.pendingOrders,
        },
        {
          accent: PALETTE.processing,
          label: "Processing Orders",
          value: resource.data.stats.processingOrders,
        },
        {
          accent: PALETTE.success,
          label: "Completed Orders",
          value: resource.data.stats.completedOrders,
        },
      ]
    : [];

  return (
    <LinearGradient colors={BACKGROUND_GRADIENT} style={styles.gradient}>
      <View pointerEvents="none" style={[styles.glow, styles.glowPrimary]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowSecondary]} />
      <View pointerEvents="none" style={[styles.bubble, styles.bubbleOne]} />
      <View pointerEvents="none" style={[styles.bubble, styles.bubbleTwo]} />
      <View pointerEvents="none" style={[styles.bubble, styles.bubbleThree]} />
      <View pointerEvents="none" style={[styles.bubbleRing, styles.bubbleRingOne]} />
      <View pointerEvents="none" style={[styles.bubbleRing, styles.bubbleRingTwo]} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              tintColor={PALETTE.accent}
              refreshing={resource.refreshing}
              onRefresh={() => {
                void resource.reload("refresh");
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.viewport}>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Overview</Text>
              <Text style={styles.heroMeta}>
                {referenceDate.toLocaleString("en-US", { month: "long" })} {referenceDate.getFullYear()}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.rangeRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {rangeOptions.map((option) => {
                const active = range === option.value;

                return active ? (
                  <LinearGradient
                    key={option.value}
                    colors={RANGE_ACTIVE_GRADIENT}
                    style={styles.rangeChipActive}
                  >
                    <Text style={styles.rangeChipActiveLabel}>{option.label}</Text>
                  </LinearGradient>
                ) : (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.rangeChip,
                      pressed ? styles.rangeChipPressed : null,
                    ]}
                    onPress={() => setRange(option.value)}
                  >
                    <Text style={styles.rangeChipLabel}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {resource.loading && !resource.data ? (
              <View style={styles.statePanel}>
                <Text style={styles.stateTitle}>Loading overview...</Text>
                <Text style={styles.stateCopy}>Please wait a moment.</Text>
              </View>
            ) : null}

            {resource.error && !resource.data ? (
              <View style={styles.statePanel}>
                <Text style={styles.stateTitle}>Could not load overview</Text>
                <Text style={styles.stateCopy}>{resource.error}</Text>
              </View>
            ) : null}

            {resource.data ? (
              <View style={styles.stack}>
                <View style={styles.statsGrid}>
                  {statItems.map((item) => (
                    <View
                      key={item.label}
                      style={[
                        styles.statCard,
                        {
                          width: compact ? "100%" : "48%",
                        },
                      ]}
                    >
                      <View style={[styles.statAccent, { backgroundColor: item.accent }]} />
                      <Text style={styles.statLabel}>{item.label}</Text>
                      <Text style={styles.statValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Orders by month</Text>
                    <Text style={styles.panelMeta}>Live snapshot</Text>
                  </View>
                  <BarChart
                    barColor={PALETTE.accent}
                    data={resource.data.monthlyPoints}
                    labelColor={PALETTE.muted}
                    radius={6}
                  />
                </View>

                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Package distribution</Text>
                    <Text style={styles.panelMeta}>
                      {resource.data.totalPackageOrders} total orders
                    </Text>
                  </View>

                  <View style={styles.chartBlock}>
                    <DonutChart
                      data={resource.data.packageDistribution}
                      labelColor={PALETTE.muted}
                      size={compact ? 152 : 170}
                      total={resource.data.totalPackageOrders}
                      totalColor={PALETTE.text}
                      trackColor={PALETTE.chartTrack}
                    />

                    <View style={styles.legend}>
                      {resource.data.packageDistribution.map((item) => (
                        <View key={item.label} style={styles.legendRow}>
                          <Text style={styles.legendLabel}>{item.label}</Text>
                          <View style={styles.legendPill}>
                            <Text style={styles.legendPillLabel}>{item.count}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.panel}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityHeaderCopy}>
                      <Text style={styles.panelTitle}>Recent activity</Text>
                      <Text style={styles.panelMeta}>Latest 4 updates</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.feedButton,
                        pressed ? styles.feedButtonPressed : null,
                      ]}
                      onPress={() => navigation.navigate("Activity")}
                    >
                      <Text style={styles.feedButtonLabel}>Open feed</Text>
                    </Pressable>
                  </View>

                  <View style={styles.feed}>
                    {resource.data.activities.map((item, index) => {
                      const laneTone = getLaneTone(item.laneLabel);

                      return (
                        <View key={item.id} style={styles.feedItem}>
                          <View style={styles.feedTop}>
                            <Text style={styles.feedTitle}>{item.title}</Text>
                            <View
                              style={[
                                styles.lanePill,
                                {
                                  backgroundColor: laneTone.backgroundColor,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.lanePillLabel,
                                  {
                                    color: laneTone.color,
                                  },
                                ]}
                              >
                                {item.laneLabel}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.feedDescription}>{item.description}</Text>
                          <Text style={styles.feedMeta}>{item.companyName}</Text>
                          <Text style={styles.feedMetaMuted}>
                            {formatRelativeTime(item.occurredAt)} | {formatDateTime(item.occurredAt)}
                          </Text>

                          {index < (resource.data?.activities.length ?? 0) - 1 ? (
                            <View style={styles.feedDivider} />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  viewport: {
    alignSelf: "center",
    maxWidth: 980,
    width: "100%",
  },
  glow: {
    borderRadius: 999,
    opacity: 0.24,
    position: "absolute",
  },
  glowPrimary: {
    backgroundColor: "#11b5bf",
    height: 220,
    right: -56,
    top: 90,
    width: 220,
  },
  glowSecondary: {
    backgroundColor: "#0f766e",
    bottom: 120,
    height: 180,
    left: -36,
    width: 180,
  },
  bubble: {
    backgroundColor: "rgba(255, 255, 255, 0.045)",
    borderRadius: 999,
    position: "absolute",
  },
  bubbleOne: {
    height: 88,
    left: 20,
    top: 150,
    width: 88,
  },
  bubbleTwo: {
    height: 58,
    right: 42,
    top: 310,
    width: 58,
  },
  bubbleThree: {
    bottom: 160,
    height: 74,
    right: 18,
    width: 74,
  },
  bubbleRing: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    borderWidth: 1,
    position: "absolute",
  },
  bubbleRingOne: {
    height: 124,
    right: -14,
    top: 126,
    width: 124,
  },
  bubbleRingTwo: {
    bottom: 92,
    height: 108,
    left: -26,
    width: 108,
  },
  hero: {
    gap: 6,
    marginBottom: 18,
  },
  heroTitle: {
    color: PALETTE.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  heroMeta: {
    color: PALETTE.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  rangeRow: {
    gap: 10,
    paddingBottom: 6,
  },
  rangeChip: {
    alignItems: "center",
    backgroundColor: PALETTE.backgroundSofter,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  rangeChipPressed: {
    opacity: 0.88,
  },
  rangeChipActive: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  rangeChipLabel: {
    color: PALETTE.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  rangeChipActiveLabel: {
    color: "#042321",
    fontSize: 13,
    fontWeight: "800",
  },
  statePanel: {
    backgroundColor: PALETTE.backgroundSoft,
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stateTitle: {
    color: PALETTE.text,
    fontSize: 16,
    fontWeight: "800",
  },
  stateCopy: {
    color: PALETTE.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  stack: {
    gap: 14,
    marginTop: 18,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: PALETTE.backgroundSoft,
    borderRadius: 8,
    gap: 12,
    minHeight: 116,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  statAccent: {
    borderRadius: 8,
    height: 4,
    width: 44,
  },
  statLabel: {
    color: PALETTE.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  statValue: {
    color: PALETTE.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
  },
  panel: {
    backgroundColor: PALETTE.backgroundSoft,
    borderRadius: 8,
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  panelHeader: {
    gap: 4,
  },
  panelTitle: {
    color: PALETTE.text,
    fontSize: 18,
    fontWeight: "800",
  },
  panelMeta: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  chartBlock: {
    gap: 18,
  },
  legend: {
    gap: 10,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  legendLabel: {
    color: PALETTE.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  legendPill: {
    alignItems: "center",
    backgroundColor: "rgba(28, 207, 190, 0.14)",
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendPillLabel: {
    color: PALETTE.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  activityHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  activityHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  feedButton: {
    alignItems: "center",
    backgroundColor: PALETTE.backgroundSofter,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  feedButtonPressed: {
    opacity: 0.88,
  },
  feedButtonLabel: {
    color: PALETTE.text,
    fontSize: 12,
    fontWeight: "800",
  },
  feed: {
    gap: 12,
  },
  feedItem: {
    gap: 8,
  },
  feedTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  feedTitle: {
    color: PALETTE.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  lanePill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lanePillLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  feedDescription: {
    color: "#c8d7ea",
    fontSize: 14,
    lineHeight: 20,
  },
  feedMeta: {
    color: PALETTE.text,
    fontSize: 12,
    fontWeight: "700",
  },
  feedMetaMuted: {
    color: PALETTE.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  feedDivider: {
    backgroundColor: PALETTE.line,
    height: 1,
    marginTop: 4,
  },
});
