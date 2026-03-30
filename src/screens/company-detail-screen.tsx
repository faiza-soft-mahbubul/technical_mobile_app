import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { COMPANY_ACCOUNTS_QUERY } from "@/api/documents";
import type { CompanyAccount } from "@/api/types";
import type { RootStackScreenProps } from "@/navigation/types";
import { Badge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { IconButton } from "@/components/common/icon-button";
import { LoadingState } from "@/components/common/loading-state";
import { Screen } from "@/components/common/screen";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Surface } from "@/components/common/surface";
import { useAppConfig } from "@/providers/app-config-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import {
  downloadDocument,
  openDocumentPreview,
  resolveDocumentFileName,
} from "@/utils/documents";
import {
  formatCurrency,
  formatDateTime,
  formatDocumentTypeLabel,
  formatPaymentMethod,
  formatPaymentStatus,
} from "@/utils/format";
import { getStatusTone } from "@/utils/orders";
import { useAsyncResource } from "@/utils/use-async-resource";

const tabOptions = [
  { label: "Services", value: "services" },
  { label: "Payments", value: "payments" },
  { label: "Documents", value: "documents" },
] as const;

type DetailTab = (typeof tabOptions)[number]["value"];
type CompanyAccountsResponse = {
  companyAccounts: {
    items: CompanyAccount[];
  };
};

export function CompanyDetailScreen({ route }: RootStackScreenProps<"CompanyDetail">) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { config } = useAppConfig();
  const { executeAuthenticated } = useAuth();
  const [tab, setTab] = useState<DetailTab>("services");
  const compact = width < 390;

  const resource = useAsyncResource(
    () =>
      executeAuthenticated<CompanyAccountsResponse, { input: { page: number; pageSize: number } }>(
        COMPANY_ACCOUNTS_QUERY,
        {
          input: {
            page: 1,
            pageSize: 250,
          },
        },
      ),
    [executeAuthenticated],
  );

  const company = useMemo(
    () =>
      resource.data?.companyAccounts.items.find((item) => item.id === route.params.companyId) ??
      null,
    [resource.data?.companyAccounts.items, route.params.companyId],
  );

  return (
    <Screen onRefresh={() => void resource.reload("refresh")} refreshing={resource.refreshing}>
      {resource.loading && !company ? <LoadingState label="Loading company..." /> : null}
      {resource.error && !company ? (
        <EmptyState title="Could not load company" description={resource.error} />
      ) : null}

      {company ? (
        <View style={styles.stack}>
          <Surface style={styles.hero}>
            <Text style={[styles.companyName, { color: colors.text }]}>{company.companyName}</Text>
            <Text style={[styles.owner, { color: colors.textDim }]}>{company.ownerName}</Text>
            <View style={styles.contactStack}>
              <Text style={[styles.copy, { color: colors.textSoft }]}>{company.country}</Text>
              <Text style={[styles.copy, { color: colors.textSoft }]}>{company.email}</Text>
              <Text style={[styles.copy, { color: colors.textSoft }]}>{company.phone}</Text>
            </View>
            <View style={styles.metrics}>
              <Badge label={`Pending ${company.pendingOrdersCount}`} tone="pending" />
              <Badge label={`Processing ${company.processingOrdersCount}`} tone="processing" />
              <Badge label={`Completed ${company.completedOrdersCount}`} tone="completed" />
            </View>
            <Text style={[styles.copy, { color: colors.textSoft }]}>
              Created {formatDateTime(company.createdAt)}
            </Text>
          </Surface>

          <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />

          {tab === "services"
            ? company.services.length
              ? company.services.map((service) => (
                  <Surface key={service.id} style={styles.card}>
                    <View style={[styles.rowBetween, compact && styles.rowStack]}>
                      <View style={styles.flexCopy}>
                        <Text style={[styles.value, { color: colors.text }]}>
                          {service.serviceName}
                        </Text>
                        <Text style={[styles.copy, { color: colors.textSoft }]}>
                          Submitted {formatDateTime(service.submitDate)}
                        </Text>
                      </View>
                      <Badge label={service.status} tone={getStatusTone(service.status)} />
                    </View>
                  </Surface>
                ))
              : (
                  <EmptyState
                    title="No active services"
                    description="This company does not have any tracked services yet."
                  />
                )
            : null}

          {tab === "payments"
            ? company.payments.length
              ? company.payments.map((payment) => (
                  <Surface key={payment.id} style={styles.card}>
                    <Text style={[styles.value, { color: colors.text }]}>
                      {payment.referenceLabel || payment.description || `Payment ${payment.id}`}
                    </Text>
                    <Text style={[styles.copy, { color: colors.textDim }]}>
                      Total {formatCurrency(payment.totalAmount, payment.currency)} | Paid{" "}
                      {formatCurrency(payment.paidAmount, payment.currency)} | Due{" "}
                      {formatCurrency(payment.dueAmount, payment.currency)}
                    </Text>
                    <Text style={[styles.copy, { color: colors.textSoft }]}>
                      Method {formatPaymentMethod(payment.latestPaymentMethod)} | Status{" "}
                      {formatPaymentStatus(payment.latestTransactionStatus)}
                    </Text>
                    <Text style={[styles.copy, { color: colors.textSoft }]}>
                      Last activity {formatDateTime(payment.latestActivityAt)}
                    </Text>
                  </Surface>
                ))
              : (
                  <EmptyState
                    title="No payments yet"
                    description="Payment records for this company will appear here."
                  />
                )
            : null}

          {tab === "documents"
            ? company.documents.length
              ? company.documents.map((document) => {
                  const fileName = resolveDocumentFileName({
                    title: document.description,
                    attachment: document.attachment,
                    fallback: `document-${document.id}.pdf`,
                  });

                  return (
                    <Surface key={document.id} style={styles.card}>
                      <View style={[styles.rowBetween, compact && styles.rowStack]}>
                        <View style={styles.flexCopy}>
                          <Text style={[styles.value, { color: colors.text }]}>
                            {document.description}
                          </Text>
                          <Text style={[styles.copy, { color: colors.textSoft }]}>
                            {formatDocumentTypeLabel(document.documentType)} | Order #{document.orderId}
                          </Text>
                          <Text style={[styles.copy, { color: colors.textSoft }]}>
                            {document.uploadedByName} | {formatDateTime(document.createdAt)}
                          </Text>
                        </View>
                        <View style={styles.iconRow}>
                          <IconButton
                            onPress={() => {
                              void openDocumentPreview(config, document.attachment, fileName).catch(
                                (error) => {
                                  Alert.alert(
                                    "Preview failed",
                                    error instanceof Error
                                      ? error.message
                                      : "Could not open document.",
                                  );
                                },
                              );
                            }}
                          >
                            <Ionicons color={colors.text} name="eye-outline" size={18} />
                          </IconButton>
                          <IconButton
                            onPress={() => {
                              void downloadDocument(config, document.attachment, fileName).catch(
                                (error) => {
                                  Alert.alert(
                                    "Download failed",
                                    error instanceof Error
                                      ? error.message
                                      : "Could not download document.",
                                  );
                                },
                              );
                            }}
                          >
                            <Ionicons color={colors.text} name="download-outline" size={18} />
                          </IconButton>
                        </View>
                      </View>
                    </Surface>
                  );
                })
              : (
                  <EmptyState
                    title="No documents yet"
                    description="Submitted and received files will appear here."
                  />
                )
            : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  hero: {
    gap: 10,
  },
  companyName: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  owner: {
    fontSize: 16,
    fontWeight: "700",
  },
  copy: {
    fontSize: 13,
    lineHeight: 18,
  },
  contactStack: {
    gap: 2,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  flexCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
  },
  iconRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
});
