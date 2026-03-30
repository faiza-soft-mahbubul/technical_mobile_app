import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { DASHBOARD_ORDERS_QUERY } from "@/api/documents";
import type { OrdersPageItem, OrderStatus } from "@/api/types";
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
import { formatCurrency, formatDateTime, formatShortDate } from "@/utils/format";
import { buildOrderSummary, getStatusTone } from "@/utils/orders";
import { useAsyncResource } from "@/utils/use-async-resource";

const statusOptions = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Completed", value: "COMPLETED" },
] as const;

type OrdersResponse = {
  ordersPage: {
    items: OrdersPageItem[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalPages: number;
    totalCount: number;
  };
};

export function OrdersScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { executeAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const compact = width < 390;

  const resource = useAsyncResource(
    () =>
      executeAuthenticated<
        OrdersResponse,
        { input: { page: number; pageSize: number; search?: string; status?: OrderStatus } }
      >(DASHBOARD_ORDERS_QUERY, {
        input: {
          page,
          pageSize: 20,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(status !== "ALL" ? { status } : {}),
        },
      }),
    [executeAuthenticated, page, search, status],
  );

  const pageData = resource.data?.ordersPage;

  return (
    <Screen
      onRefresh={() => {
        void resource.reload("refresh");
      }}
      refreshing={resource.refreshing}
    >
      <SectionHeader
        title="Orders"
        description="Review all created orders, payment state, and service timelines."
      />

      <View style={styles.stack}>
        <SearchField
          placeholder="Search order, company, or client"
          returnKeyType="search"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <SegmentedControl
          options={statusOptions}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />

        {resource.loading && !pageData ? <LoadingState label="Loading orders..." /> : null}
        {resource.error && !pageData ? (
          <EmptyState title="Could not load orders" description={resource.error} />
        ) : null}

        {pageData ? (
          <View style={styles.stack}>
            <Text style={[styles.summary, { color: colors.textSoft }]}>
              {pageData.totalCount} orders found
            </Text>
            {pageData.items.length === 0 ? (
              <EmptyState
                title="No orders found"
                description="Adjust your search or status filters to see results."
              />
            ) : (
              pageData.items.map((order) => {
                const summary = buildOrderSummary(order);
                const clientName = [
                  order.companyInfo?.user?.firstName,
                  order.companyInfo?.user?.lastName,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <Surface key={order.id} style={styles.card}>
                    <View style={[styles.rowBetween, compact && styles.rowStack]}>
                      <View style={styles.copy}>
                        <Text style={[styles.orderNumber, { color: colors.text }]}>
                          Order #{order.id}
                        </Text>
                        <Text style={[styles.companyName, { color: colors.textDim }]}>
                          {order.companyInfo?.name ?? "Unknown company"}
                        </Text>
                      </View>
                      <Badge
                        label={status === "ALL" ? order.status : status}
                        tone={getStatusTone(order.status)}
                      />
                    </View>

                    <View style={styles.detailBlock}>
                      <Text style={[styles.label, { color: colors.textSoft }]}>
                        Package / Service
                      </Text>
                      <Text style={[styles.value, { color: colors.text }]}>
                        {summary.packageLabel}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        {summary.serviceLabel}
                      </Text>
                    </View>

                    <View style={[styles.infoGrid, compact && styles.infoGridStack]}>
                      <View style={styles.infoCell}>
                        <Text style={[styles.label, { color: colors.textSoft }]}>Client</Text>
                        <Text style={[styles.value, { color: colors.text }]}>
                          {clientName || "No client name"}
                        </Text>
                        <Text style={[styles.subtle, { color: colors.textDim }]}>
                          {order.companyInfo?.user?.email ?? "-"}
                        </Text>
                      </View>
                      <View style={styles.infoCell}>
                        <Text style={[styles.label, { color: colors.textSoft }]}>Amount</Text>
                        <Text style={[styles.value, { color: colors.text }]}>
                          {formatCurrency(order.price)}
                        </Text>
                        <Text style={[styles.subtle, { color: colors.textDim }]}>
                          State: {order.companyInfo?.state?.name ?? "-"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeline}>
                      <Text style={[styles.label, { color: colors.textSoft }]}>Timeline</Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        Created {formatDateTime(order.createdAt)}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        LLC {formatShortDate(order.llcSubmittedAt)} / {formatShortDate(order.llcReceivedAt)}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        BOI {formatShortDate(order.boiSubmittedAt)} / {formatShortDate(order.boiReceivedAt)}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        ITIN {formatShortDate(order.itinSubmittedAt)} / {formatShortDate(order.itinReceivedAt)}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        EIN {formatShortDate(order.einSubmittedAt)} / {formatShortDate(order.einReceivedAt)}
                      </Text>
                    </View>
                  </Surface>
                );
              })
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
    gap: 14,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  rowStack: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "800",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailBlock: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtle: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoGridStack: {
    flexDirection: "column",
  },
  infoCell: {
    flex: 1,
    gap: 4,
  },
  timeline: {
    gap: 4,
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
