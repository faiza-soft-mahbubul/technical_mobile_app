import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { COMPANY_ACCOUNTS_QUERY } from "@/api/documents";
import type { CompanyAccount } from "@/api/types";
import type { MainTabScreenProps } from "@/navigation/types";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { Screen } from "@/components/common/screen";
import { SearchField } from "@/components/common/search-field";
import { Surface } from "@/components/common/surface";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import { formatDateTime } from "@/utils/format";
import { useAsyncResource } from "@/utils/use-async-resource";

type CompanyAccountsResponse = {
  companyAccounts: {
    items: CompanyAccount[];
    availableCountries: string[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalPages: number;
    totalCount: number;
  };
};

export function CompaniesScreen({ navigation }: MainTabScreenProps<"Companies">) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { executeAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const compact = width < 390;

  const resource = useAsyncResource(
    () =>
      executeAuthenticated<
        CompanyAccountsResponse,
        { input: { page: number; pageSize: number; search?: string; countries?: string[] } }
      >(COMPANY_ACCOUNTS_QUERY, {
        input: {
          page,
          pageSize: 20,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(country ? { countries: [country] } : {}),
        },
      }),
    [country, executeAuthenticated, page, search],
  );

  const pageData = resource.data?.companyAccounts;

  return (
    <Screen onRefresh={() => void resource.reload("refresh")} refreshing={resource.refreshing}>
      <View style={styles.stack}>
        <SearchField
          placeholder="Search company, owner, or email"
          returnKeyType="search"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        {pageData?.availableCountries?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.countryRow}>
              <Pressable
                onPress={() => {
                  setCountry(null);
                  setPage(1);
                }}
                style={[
                  styles.countryChip,
                  {
                    backgroundColor: country === null ? colors.accent : colors.card,
                    borderColor: country === null ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countryLabel,
                    { color: country === null ? "#042321" : colors.text },
                  ]}
                >
                  All Countries
                </Text>
              </Pressable>
              {pageData.availableCountries.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setCountry(item);
                    setPage(1);
                  }}
                  style={[
                    styles.countryChip,
                    {
                      backgroundColor: country === item ? colors.accent : colors.card,
                      borderColor: country === item ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countryLabel,
                      { color: country === item ? "#042321" : colors.text },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {resource.loading && !pageData ? <LoadingState label="Loading companies..." /> : null}
        {resource.error && !pageData ? (
          <EmptyState title="Could not load companies" description={resource.error} />
        ) : null}

        {pageData ? (
          <View style={styles.stack}>
            <Text style={[styles.summary, { color: colors.textSoft }]}>
              {pageData.totalCount} companies found
            </Text>
            {pageData.items.length === 0 ? (
              <EmptyState
                title="No companies found"
                description="Try another country filter or clear your search."
              />
            ) : (
              pageData.items.map((company) => (
                <Pressable
                  key={company.id}
                  onPress={() =>
                    navigation.getParent()?.navigate("CompanyDetail", {
                      companyId: company.id,
                      companyName: company.companyName,
                    })
                  }
                >
                  <Surface style={styles.card}>
                    <View style={[styles.rowBetween, compact && styles.rowStack]}>
                      <View style={styles.copy}>
                        <Text style={[styles.name, { color: colors.text }]}>{company.companyName}</Text>
                        <Text style={[styles.owner, { color: colors.textDim }]}>{company.ownerName}</Text>
                      </View>
                      <Badge label={company.country} tone="accent" />
                    </View>

                    <Text style={[styles.meta, { color: colors.textSoft }]}>
                      {company.email} | {company.phone}
                    </Text>

                    <View style={styles.metrics}>
                      <Badge label={`Pending ${company.pendingOrdersCount}`} tone="pending" />
                      <Badge
                        label={`Processing ${company.processingOrdersCount}`}
                        tone="processing"
                      />
                      <Badge
                        label={`Completed ${company.completedOrdersCount}`}
                        tone="completed"
                      />
                    </View>

                    <Text style={[styles.updated, { color: colors.textSoft }]}>
                      Updated {formatDateTime(company.updatedAt)}
                    </Text>
                  </Surface>
                </Pressable>
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
    marginTop: 8,
  },
  countryRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryChip: {
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  countryLabel: {
    fontSize: 13,
    fontWeight: "700",
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
  name: {
    fontSize: 18,
    fontWeight: "800",
  },
  owner: {
    fontSize: 14,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  updated: {
    fontSize: 12,
    fontWeight: "600",
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
