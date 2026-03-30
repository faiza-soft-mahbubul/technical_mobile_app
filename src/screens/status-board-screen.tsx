import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { STATUS_BOARD_ORDERS_QUERY } from "@/api/documents";
import type { OrderStatus, StatusBoardOrder } from "@/api/types";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PickerField } from "@/components/common/picker-field";
import { Screen } from "@/components/common/screen";
import { SearchField } from "@/components/common/search-field";
import { Surface } from "@/components/common/surface";
import { StatusActionModal } from "@/components/status-board/status-action-modal";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import { formatDateTime, formatOrderStatusLabel } from "@/utils/format";
import {
  buildOrderSummary,
  collectOrderCategoryTags,
  getStatusTone,
} from "@/utils/orders";
import { useAsyncResource } from "@/utils/use-async-resource";

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Completed", value: "COMPLETED" },
] as const;

type StatusBoardResponse = {
  statusBoardOrders: {
    items: StatusBoardOrder[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalPages: number;
    totalCount: number;
    statusCounts: Array<{
      status: OrderStatus;
      count: number;
    }>;
    categoryCounts: Array<{
      serviceCategoryId: number;
      name: string;
      count: number;
    }>;
  };
};

export function StatusBoardScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { executeAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [serviceCategoryId, setServiceCategoryId] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<StatusBoardOrder | null>(null);
  const compact = width < 390;

  const resource = useAsyncResource(
    () =>
      executeAuthenticated<
        StatusBoardResponse,
        { input: { page: number; pageSize: number; status: OrderStatus; serviceCategoryId?: number } }
      >(STATUS_BOARD_ORDERS_QUERY, {
        input: {
          page,
          pageSize: 20,
          status,
          ...(serviceCategoryId ? { serviceCategoryId } : {}),
        },
      }),
    [executeAuthenticated, page, serviceCategoryId, status],
  );

  const pageData = resource.data?.statusBoardOrders;
  const visibleOrders = useMemo(() => {
    if (!pageData) {
      return [];
    }

    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return pageData.items;
    }

    return pageData.items.filter((order) => {
      const summary = buildOrderSummary(order);
      const categories = collectOrderCategoryTags(order).join(" ");
      const searchTarget = [
        order.companyInfo?.name,
        summary.packageLabel,
        summary.serviceLabel,
        categories,
        `order ${order.id}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(normalizedSearch);
    });
  }, [pageData, search]);

  return (
    <Screen
      contentStyle={styles.screenContent}
      onRefresh={() => {
        void resource.reload("refresh");
      }}
      refreshing={resource.refreshing}
    >
      <View style={styles.stack}>
        <PickerField
          selectedValue={status}
          options={statusOptions.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          onValueChange={(value) => {
            setStatus(value as OrderStatus);
            setPage(1);
          }}
        />
        <SearchField
          placeholder="Search company, package, or service"
          returnKeyType="search"
          value={search}
          onChangeText={setSearch}
        />

        {pageData ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              <Pressable
                onPress={() => {
                  setServiceCategoryId(null);
                  setPage(1);
                }}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: serviceCategoryId === null ? colors.accent : colors.card,
                    borderColor: serviceCategoryId === null ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryLabel,
                    {
                      color: serviceCategoryId === null ? "#042321" : colors.text,
                    },
                  ]}
                >
                  All Categories
                </Text>
              </Pressable>
              {pageData.categoryCounts.map((item) => (
                <Pressable
                  key={`${item.serviceCategoryId}-${item.name}`}
                  onPress={() => {
                    setServiceCategoryId(item.serviceCategoryId);
                    setPage(1);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        serviceCategoryId === item.serviceCategoryId
                          ? colors.accent
                          : colors.card,
                      borderColor:
                        serviceCategoryId === item.serviceCategoryId
                          ? colors.accent
                          : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      {
                        color:
                          serviceCategoryId === item.serviceCategoryId
                            ? "#042321"
                            : colors.text,
                      },
                    ]}
                  >
                    {item.name} ({item.count})
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {resource.loading && !pageData ? <LoadingState label="Loading status board..." /> : null}
        {resource.error && !pageData ? (
          <EmptyState title="Could not load status board" description={resource.error} />
        ) : null}

        {pageData ? (
          <View style={styles.stack}>
            <Text style={[styles.summary, { color: colors.textSoft }]}>
              {pageData.totalCount} orders in {formatOrderStatusLabel(status)}
            </Text>
            {visibleOrders.length === 0 ? (
              <EmptyState
                title="No matching orders"
                description="Try another category or clear your search."
              />
            ) : (
              visibleOrders.map((order) => {
                const summary = buildOrderSummary(order);
                const categories = collectOrderCategoryTags(order);
                const canUpdateStatus = order.status === "PENDING" || order.status === "PROCESSING";

                return (
                  <Surface key={order.id} style={styles.card}>
                    <Pressable
                      disabled={!canUpdateStatus}
                      onPress={() => {
                        if (canUpdateStatus) {
                          setActiveOrder(order);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.summaryPressable,
                        pressed && canUpdateStatus ? styles.summaryPressableActive : null,
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <View style={styles.copy}>
                          <Text style={[styles.orderNumber, { color: colors.text }]}>
                            Order #{order.id}
                          </Text>
                        </View>
                        <View style={styles.statusWrap}>
                          <Badge
                            label={formatOrderStatusLabel(order.status)}
                            tone={getStatusTone(order.status)}
                          />
                        </View>
                      </View>

                      <Text style={[styles.packageLabel, { color: colors.text }]}>
                        {summary.packageLabel}
                      </Text>
                      <Text style={[styles.subtle, { color: colors.textDim }]}>
                        {summary.serviceLabel}
                      </Text>

                      {categories.length > 0 ? (
                        <View style={styles.tagRow}>
                          {categories.map((category) => (
                            <Badge key={category} label={category} tone="neutral" />
                          ))}
                        </View>
                      ) : null}

                      <Text style={[styles.subtle, { color: colors.textSoft }]}>
                        {formatDateTime(order.updatedAt)}
                      </Text>
                    </Pressable>
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
      {activeOrder ? (
        <StatusActionModal
          currentStatus={status}
          onClose={() => setActiveOrder(null)}
          onSubmitted={async () => {
            await resource.reload("refresh");
          }}
          order={activeOrder}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: 0,
  },
  stack: {
    gap: 14,
    marginTop: 0,
  },
  summary: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    gap: 14,
  },
  summaryPressable: {
    gap: 14,
  },
  summaryPressableActive: {
    opacity: 0.82,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
  statusWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  actionHint: {
    fontSize: 11,
    fontWeight: "700",
  },
  packageLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
