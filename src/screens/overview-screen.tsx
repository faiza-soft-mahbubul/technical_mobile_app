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
  COMPANY_ACCOUNTS_QUERY,
  OVERVIEW_ORDERS_BY_MONTH_QUERY,
  OVERVIEW_PACKAGE_DISTRIBUTION_QUERY,
  OVERVIEW_STATS_QUERY,
  RECENT_ACTIVITIES_QUERY,
} from "@/api/documents";
import type {
  MonthlyOrderPoint,
  OverviewRange,
  OverviewStats,
  CompanyAccount,
  PackageDistributionPoint,
  RecentActivityItem,
} from "@/api/types";
import type { MainTabScreenProps } from "@/navigation/types";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart, DONUT_CHART_COLORS } from "@/components/charts/donut-chart";
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
  { label: "Yday", value: "YESTERDAY" },
  { label: "7D", value: "LAST_7_DAYS" },
  { label: "Month", value: "THIS_MONTH" },
  { label: "Last", value: "LAST_MONTH" },
] as const;

type OverviewBundle = {
  activities: RecentActivityItem[];
  monthlyPoints: MonthlyOrderPoint[];
  partialPayments: number;
  packageDistribution: PackageDistributionPoint[];
  stats: OverviewStats;
  totalPackageOrders: number;
};

type CompanyAccountsResponse = {
  companyAccounts: {
    items: CompanyAccount[];
  };
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

function getStatCardTone(accent: string) {
  if (accent === PALETTE.pending) {
    return {
      backgroundColor: "#4b3310",
      labelColor: "#ffe3b2",
      valueColor: PALETTE.text,
    };
  }

  if (accent === PALETTE.processing) {
    return {
      backgroundColor: "#15395f",
      labelColor: "#d5e9ff",
      valueColor: PALETTE.text,
    };
  }

  if (accent === PALETTE.success) {
    return {
      backgroundColor: "#123b25",
      labelColor: "#d8ffe8",
      valueColor: PALETTE.text,
    };
  }

  if (accent === PALETTE.danger) {
    return {
      backgroundColor: "#4a1f28",
      labelColor: "#ffd7de",
      valueColor: "#ffadb9",
    };
  }

  return {
    backgroundColor: "#0f3f44",
    labelColor: "#d8fffd",
    valueColor: PALETTE.text,
  };
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
}

function buildRangeWindow(range: OverviewRange, referenceDate: Date) {
  if (range === "TODAY") {
    return {
      start: startOfDay(referenceDate),
      end: endOfDay(referenceDate),
    };
  }

  if (range === "YESTERDAY") {
    const previousDate = new Date(referenceDate);
    previousDate.setDate(previousDate.getDate() - 1);

    return {
      start: startOfDay(previousDate),
      end: endOfDay(previousDate),
    };
  }

  if (range === "LAST_7_DAYS") {
    const start = startOfDay(referenceDate);
    start.setDate(start.getDate() - 6);

    return {
      start,
      end: endOfDay(referenceDate),
    };
  }

  if (range === "LAST_MONTH") {
    const previousMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      1,
    );

    return {
      start: startOfMonth(previousMonth),
      end: endOfMonth(previousMonth),
    };
  }

  return {
    start: startOfMonth(referenceDate),
    end: endOfDay(referenceDate),
  };
}

function isDateWithinRange(value: string, rangeWindow: { start: Date; end: Date }) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() >= rangeWindow.start.getTime() && parsed.getTime() <= rangeWindow.end.getTime();
}

export function OverviewScreen({ navigation }: MainTabScreenProps<"Overview">) {
  const { width } = useWindowDimensions();
  const { executeAuthenticated } = useAuth();
  const [range, setRange] = useState<OverviewRange>("THIS_MONTH");
  const compact = width < 390;
  const statCardWidth = width >= 720 ? "31.8%" : "48.5%";

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
      const rangeWindow = buildRangeWindow(range, referenceDate);

      const [statsData, monthlyData, packageData, activityData, companyAccountsData] =
        await Promise.all([
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
        executeAuthenticated<
          CompanyAccountsResponse,
          { input: { page: number; pageSize: number } }
        >(COMPANY_ACCOUNTS_QUERY, {
          input: {
            page: 1,
            pageSize: 500,
          },
        }),
      ]);

      const partialPayments = companyAccountsData.companyAccounts.items.reduce(
        (count, company) =>
          count +
          company.payments.filter(
            (payment) =>
              payment.status === "PARTIALLY_PAID" &&
              isDateWithinRange(payment.latestActivityAt, rangeWindow),
          ).length,
        0,
      );

      return {
        activities: activityData.recentActivities.items,
        monthlyPoints: monthlyData.overviewOrdersByMonth.items,
        partialPayments,
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
          label: "Companies",
          value: resource.data.stats.totalCompanies,
        },
        {
          accent: PALETTE.pending,
          label: "Pending",
          value: resource.data.stats.pendingOrders,
        },
        {
          accent: PALETTE.processing,
          label: "Progress",
          value: resource.data.stats.processingOrders,
        },
        {
          accent: PALETTE.success,
          label: "Done",
          value: resource.data.stats.completedOrders,
        },
        {
          accent: PALETTE.accent,
          label: "Total Payments",
          value: "$48,300",
        },
        {
          accent: PALETTE.accent,
          label: "Total Partial Payment",
          value: resource.data.partialPayments,
        },
        {
          accent: PALETTE.danger,
          label: "Total Due",
          value: "$12,500",
        },
      ]
    : [];

  return (
    <LinearGradient colors={BACKGROUND_GRADIENT} style={styles.gradient}>
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
            <Text style={styles.heroMeta}>
              {referenceDate.toLocaleString("en-US", { month: "long" })} {referenceDate.getFullYear()}
            </Text>

            <View style={styles.rangeSection}>
              <View style={styles.rangeRow}>
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
              </View>
            </View>

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
                <View style={styles.statsPanel}>
                  <View style={styles.statsGrid}>
                    {statItems.map((item) => {
                      const tone = getStatCardTone(item.accent);

                      return (
                        <View
                          key={item.label}
                          style={[
                            styles.statCard,
                            {
                              backgroundColor: tone.backgroundColor,
                              width: statCardWidth,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={2}
                            style={[styles.statLabel, { color: tone.labelColor }]}
                          >
                            {item.label}
                          </Text>
                          <Text style={[styles.statValue, { color: tone.valueColor }]}>
                            {item.value}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>Orders by month</Text>
                    <Text style={styles.panelMeta}>Live snapshot</Text>
                  </View>
                  <BarChart
                    barColor={PALETTE.accent}
                    data={resource.data.monthlyPoints}
                    height={compact ? 118 : 124}
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
                      size={compact ? 104 : 112}
                      total={resource.data.totalPackageOrders}
                      totalColor={PALETTE.text}
                      trackColor={PALETTE.chartTrack}
                    />

                    <View style={styles.legend}>
                      {resource.data.packageDistribution.map((item, index) => (
                        <View key={item.label} style={styles.legendRow}>
                          <View style={styles.legendCopy}>
                            <View
                              style={[
                                styles.legendDot,
                                {
                                  backgroundColor:
                                    DONUT_CHART_COLORS[index % DONUT_CHART_COLORS.length],
                                },
                              ]}
                            />
                            <Text numberOfLines={1} style={styles.legendLabel}>
                              {item.label}
                            </Text>
                          </View>
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
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  viewport: {
    alignSelf: "center",
    maxWidth: 980,
    width: "100%",
  },
  heroMeta: {
    color: PALETTE.muted,
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 8,
  },
  rangeSection: {
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 4,
  },
  rangeChip: {
    alignItems: "center",
    backgroundColor: PALETTE.backgroundSofter,
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 26,
    paddingHorizontal: 4,
  },
  rangeChipPressed: {
    opacity: 0.88,
  },
  rangeChipActive: {
    alignItems: "center",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 26,
    paddingHorizontal: 4,
  },
  rangeChipLabel: {
    color: PALETTE.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  rangeChipActiveLabel: {
    color: "#042321",
    fontSize: 9,
    fontWeight: "800",
  },
  statePanel: {
    backgroundColor: PALETTE.backgroundSoft,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stateTitle: {
    color: PALETTE.text,
    fontSize: 14,
    fontWeight: "800",
  },
  stateCopy: {
    color: PALETTE.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  stack: {
    gap: 8,
    marginTop: 8,
  },
  statsPanel: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  statCard: {
    borderRadius: 8,
    gap: 4,
    minHeight: 72,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 7,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "600",
    lineHeight: 11,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -1,
  },
  panel: {
    backgroundColor: PALETTE.backgroundSoft,
    borderRadius: 8,
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#020817",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  panelHeader: {
    gap: 2,
  },
  panelTitle: {
    color: PALETTE.text,
    fontSize: 14,
    fontWeight: "800",
  },
  panelMeta: {
    color: PALETTE.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  chartBlock: {
    gap: 8,
  },
  legend: {
    gap: 5,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  legendCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minWidth: 0,
  },
  legendDot: {
    borderRadius: 99,
    height: 8,
    width: 8,
  },
  legendLabel: {
    color: PALETTE.text,
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  legendPill: {
    alignItems: "center",
    backgroundColor: "rgba(28, 207, 190, 0.14)",
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  legendPillLabel: {
    color: PALETTE.accent,
    fontSize: 10,
    fontWeight: "800",
  },
  activityHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  activityHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  feedButton: {
    alignItems: "center",
    backgroundColor: PALETTE.backgroundSofter,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 24,
    paddingHorizontal: 8,
  },
  feedButtonPressed: {
    opacity: 0.88,
  },
  feedButtonLabel: {
    color: PALETTE.text,
    fontSize: 10,
    fontWeight: "800",
  },
  feed: {
    gap: 6,
  },
  feedItem: {
    gap: 4,
  },
  feedTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  feedTitle: {
    color: PALETTE.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  lanePill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  lanePillLabel: {
    fontSize: 9,
    fontWeight: "800",
  },
  feedDescription: {
    color: "#c8d7ea",
    fontSize: 12,
    lineHeight: 16,
  },
  feedMeta: {
    color: PALETTE.text,
    fontSize: 10,
    fontWeight: "700",
  },
  feedMetaMuted: {
    color: PALETTE.muted,
    fontSize: 9,
    lineHeight: 14,
  },
  feedDivider: {
    backgroundColor: PALETTE.line,
    height: 1,
    marginTop: 2,
  },
});
