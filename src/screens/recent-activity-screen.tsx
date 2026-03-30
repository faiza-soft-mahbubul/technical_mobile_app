import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { RECENT_ACTIVITIES_QUERY } from "@/api/documents";
import type { RecentActivityItem, RecentActivityType } from "@/api/types";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { Screen } from "@/components/common/screen";
import { SearchField } from "@/components/common/search-field";
import { SectionHeader } from "@/components/common/section-header";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Surface } from "@/components/common/surface";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import {
  formatActivityTypeLabel,
  formatDateTime,
  formatRelativeTime,
} from "@/utils/format";
import { useAsyncResource } from "@/utils/use-async-resource";

const activityOptions = [
  { label: "All", value: "ALL" },
  { label: "Orders", value: "ORDER" },
  { label: "Docs", value: "DOCUMENT" },
  { label: "Payments", value: "PAYMENT" },
  { label: "Status", value: "STATUS" },
  { label: "Company", value: "COMPANY" },
] as const;

type RecentActivityResponse = {
  recentActivities: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalCount: number;
    totalPages: number;
    items: RecentActivityItem[];
  };
};

export function RecentActivityScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { executeAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [type, setType] = useState<RecentActivityType | "ALL">("ALL");
  const compact = width < 390;

  const resource = useAsyncResource(
    () =>
      executeAuthenticated<
        RecentActivityResponse,
        { input: { page: number; pageSize: number; search?: string; activityType?: RecentActivityType } }
      >(RECENT_ACTIVITIES_QUERY, {
        input: {
          page,
          pageSize: 20,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(type !== "ALL" ? { activityType: type } : {}),
        },
      }),
    [executeAuthenticated, page, search, type],
  );

  const pageData = resource.data?.recentActivities;

  return (
    <Screen
      onRefresh={() => {
        void resource.reload("refresh");
      }}
      refreshing={resource.refreshing}
    >
      <SectionHeader
        title="Recent Activity"
        description="A compact operational feed across orders, documents, payments, and status changes."
      />

      <View style={styles.stack}>
        <SearchField
          placeholder="Search company, order, or activity"
          returnKeyType="search"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <SegmentedControl
          options={activityOptions}
          value={type}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
        />

        {resource.loading && !pageData ? (
          <LoadingState label="Loading recent activity..." />
        ) : null}
        {resource.error && !pageData ? (
          <EmptyState title="Could not load activity" description={resource.error} />
        ) : null}

        {pageData ? (
          <View style={styles.stack}>
            <Text style={[styles.summary, { color: colors.textSoft }]}>
              {pageData.totalCount} activities found
            </Text>
            {pageData.items.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Try a different filter or clear your search."
              />
            ) : (
              pageData.items.map((item) => (
                <Surface key={item.id} style={styles.card}>
                  <View style={[styles.rowBetween, compact && styles.rowStack]}>
                    <Badge label={formatActivityTypeLabel(item.activityType)} tone="accent" />
                    <Text style={[styles.meta, { color: colors.textSoft }]}>
                      {formatRelativeTime(item.occurredAt)}
                    </Text>
                  </View>
                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.description, { color: colors.textDim }]}>
                    {item.description}
                  </Text>
                  <View style={[styles.rowBetween, compact && styles.rowStack]}>
                    <Text style={[styles.meta, { color: colors.textSoft }]}>
                      {item.companyName}
                      {item.orderNumber ? ` | ${item.orderNumber}` : ""}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSoft }]}>
                      {formatDateTime(item.occurredAt)}
                    </Text>
                  </View>
                </Surface>
              ))
            )}
            <View style={[styles.pagination, compact && styles.paginationCompact]}>
              <Button
                disabled={!pageData.hasPreviousPage}
                label="Prev"
                tone="secondary"
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                style={compact ? styles.paginationButton : undefined}
              />
              <Text style={[styles.page, compact && styles.pageCompact, { color: colors.text }]}>
                {pageData.totalPages === 0 ? 0 : page} / {pageData.totalPages}
              </Text>
              <Button
                disabled={!pageData.hasNextPage}
                label="Next"
                tone="secondary"
                onPress={() => setPage((current) => current + 1)}
                style={compact ? styles.paginationButton : undefined}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
    marginTop: 18,
  },
  summary: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    gap: 12,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  rowStack: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  paginationCompact: {
    justifyContent: "space-between",
  },
  paginationButton: {
    flexGrow: 1,
    minWidth: 112,
  },
  page: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 72,
    textAlign: "center",
  },
  pageCompact: {
    minWidth: 64,
    width: "100%",
  },
});
