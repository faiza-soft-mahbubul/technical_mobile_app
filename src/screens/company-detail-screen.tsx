import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  COMPANY_ACCOUNTS_QUERY,
  COMPANY_PROFILE_DETAILS_QUERY,
} from "@/api/documents";
import { uploadDocumentToCloudinary } from "@/api/cloudinary";
import type {
  CompanyAccount,
  CompanyProfileDetails,
} from "@/api/types";
import type { RootStackScreenProps } from "@/navigation/types";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { IconButton } from "@/components/common/icon-button";
import { LoadingState } from "@/components/common/loading-state";
import { Screen } from "@/components/common/screen";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Surface } from "@/components/common/surface";
import { TextField } from "@/components/common/text-field";
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
  formatEnumLabel,
  formatPaymentMethod,
  formatPaymentStatus,
  parseMoney,
} from "@/utils/format";
import { getStatusTone } from "@/utils/orders";
import { useAsyncResource } from "@/utils/use-async-resource";

const tabOptions = [
  { label: "Services", value: "services" },
  { label: "Payments", value: "payments" },
  { label: "Documents", value: "documents" },
  { label: "Profile", value: "profile" },
] as const;

const documentTypeOptions = [
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Received", value: "RECEIVED" },
] as const;

type DetailTab = (typeof tabOptions)[number]["value"];
type DocumentTab = (typeof documentTypeOptions)[number]["value"];
type CompanyAccountsResponse = {
  companyAccounts: {
    items: CompanyAccount[];
  };
};
type CompanyProfileResponse = {
  company: CompanyProfileDetails;
};
type CompanyDetailResource = {
  items: CompanyAccount[];
  profile: CompanyProfileDetails | null;
};
type ProfileDocumentItem = {
  id: string;
  attachmentUrl: string;
  fileName: string;
  mimeType?: string | null;
  name: string;
  sizeLabel: string;
};
type PendingProfileDocument = {
  asset: DocumentPickerAsset;
  id: string;
  sizeLabel: string;
  title: string;
};

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getFileExtension(value?: string | null) {
  if (!value) {
    return "";
  }

  const lastDot = value.lastIndexOf(".");

  if (lastDot < 0 || lastDot === value.length - 1) {
    return "";
  }

  return value.slice(lastDot + 1);
}

function stripFileExtension(value?: string | null) {
  if (!value) {
    return "";
  }

  const lastDot = value.lastIndexOf(".");

  if (lastDot <= 0) {
    return value;
  }

  return value.slice(0, lastDot);
}

function buildProfileDocumentName(title: string, originalFileName: string) {
  const normalizedTitle = title.trim() || stripFileExtension(originalFileName) || "document";
  const extension = getFileExtension(originalFileName);

  return extension ? `${normalizedTitle}.${extension}` : normalizedTitle;
}

function formatFileSize(value?: number | null) {
  if (!value || value <= 0) {
    return "0 KB";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompanyDetailScreen({ route }: RootStackScreenProps<"CompanyDetail">) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { config } = useAppConfig();
  const { executeAuthenticated } = useAuth();
  const [tab, setTab] = useState<DetailTab>("services");
  const [documentTab, setDocumentTab] = useState<DocumentTab>("SUBMITTED");
  const [profileDocuments, setProfileDocuments] = useState<ProfileDocumentItem[]>([]);
  const [pendingProfileDocuments, setPendingProfileDocuments] = useState<PendingProfileDocument[]>(
    [],
  );
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileDocumentsUploading, setProfileDocumentsUploading] = useState(false);
  const compact = width < 390;
  const summaryCardWidth = width >= 720 ? "31.8%" : "48.5%";

  const resource = useAsyncResource<CompanyDetailResource>(
    async () => {
      const accountsResponse = await executeAuthenticated<
        CompanyAccountsResponse,
        { input: { page: number; pageSize: number } }
      >(COMPANY_ACCOUNTS_QUERY, {
        input: {
          page: 1,
          pageSize: 250,
        },
      });

      let profile: CompanyProfileDetails | null = null;

      try {
        const profileResponse = await executeAuthenticated<
          CompanyProfileResponse,
          { companyId: number }
        >(COMPANY_PROFILE_DETAILS_QUERY, {
          companyId: route.params.companyId,
        });

        profile = profileResponse.company;
      } catch {
        profile = null;
      }

      return {
        items: accountsResponse.companyAccounts.items,
        profile,
      };
    },
    [executeAuthenticated, route.params.companyId],
  );

  const company = useMemo(
    () => resource.data?.items.find((item) => item.id === route.params.companyId) ?? null,
    [resource.data?.items, route.params.companyId],
  );
  const companyProfile = resource.data?.profile ?? null;
  const visibleDocuments = useMemo(
    () =>
      company?.documents.filter((document) => document.documentType === documentTab) ?? [],
    [company?.documents, documentTab],
  );
  const paymentSummary = useMemo(() => {
    const currency = company?.payments.find((payment) => payment.currency)?.currency ?? "USD";
    const totalPayment = (company?.payments ?? []).reduce(
      (sum, payment) => sum + parseMoney(payment.paidAmount),
      0,
    );
    const totalDue = (company?.payments ?? []).reduce(
      (sum, payment) => sum + parseMoney(payment.dueAmount),
      0,
    );
    const partialPayments =
      company?.payments.filter((payment) => payment.status === "PARTIALLY_PAID").length ?? 0;

    return {
      partialPayments,
      totalDueLabel: formatCurrency(totalDue, currency),
      totalPaymentLabel: formatCurrency(totalPayment, currency),
    };
  }, [company?.payments]);
  const summaryCards = useMemo(
    () => [
      { label: "Completed Orders", tone: "default" as const, value: company?.completedOrdersCount ?? 0 },
      { label: "Pending Orders", tone: "default" as const, value: company?.pendingOrdersCount ?? 0 },
      { label: "Total Payment", tone: "default" as const, value: paymentSummary.totalPaymentLabel },
      {
        label: "Total Partial Payment",
        tone: "default" as const,
        value: paymentSummary.partialPayments,
      },
      { label: "Total Due", tone: "danger" as const, value: paymentSummary.totalDueLabel },
    ],
    [
      company?.completedOrdersCount,
      company?.pendingOrdersCount,
      paymentSummary.partialPayments,
      paymentSummary.totalDueLabel,
      paymentSummary.totalPaymentLabel,
    ],
  );
  const userInformationRows = useMemo(
    () => [
      {
        label: "Full Name",
        value:
          `${companyProfile?.user?.firstName ?? ""} ${companyProfile?.user?.lastName ?? ""}`.trim() ||
          company?.ownerName ||
          "Not available",
      },
      {
        label: "Email",
        value: companyProfile?.user?.email ?? company?.email ?? "Not available",
      },
      {
        label: "Phone",
        value: companyProfile?.user?.phone ?? company?.phone ?? "Not available",
      },
      {
        label: "Address",
        value: companyProfile?.user?.address ?? "Not available",
      },
      {
        label: "Role",
        value: companyProfile?.user?.role
          ? formatEnumLabel(companyProfile.user.role)
          : "Not available",
      },
      {
        label: "Status",
        value: companyProfile?.user?.status
          ? formatEnumLabel(companyProfile.user.status)
          : "Not available",
      },
    ],
    [company?.email, company?.ownerName, company?.phone, companyProfile],
  );
  const otherDetailsRows = useMemo(
    () => [
      {
        label: "EIN",
        value: companyProfile?.companyDetails?.ein ?? "Not available",
      },
      {
        label: "Notification Email",
        value: companyProfile?.companyDetails?.notificationEmail ?? "Not available",
      },
      {
        label: "EIN Address",
        value: companyProfile?.companyDetails?.address ?? "Not available",
      },
      {
        label: "Created",
        value: company ? formatDateTime(company.createdAt) : "Not available",
      },
    ],
    [company, companyProfile],
  );

  useEffect(() => {
    setProfileDocuments([]);
    setPendingProfileDocuments([]);
    setProfileModalOpen(false);
    setProfileDocumentsUploading(false);
    setTab("services");
    setDocumentTab("SUBMITTED");
  }, [route.params.companyId]);

  const handlePickProfileDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ["application/pdf", "image/*"],
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setPendingProfileDocuments((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        asset,
        id: createLocalId(),
        sizeLabel: formatFileSize(asset.size),
        title: stripFileExtension(asset.name) || "Document",
      })),
    ]);
  };

  const handleUploadProfileDocuments = async () => {
    if (pendingProfileDocuments.length === 0) {
      setProfileModalOpen(false);
      return;
    }

    setProfileDocumentsUploading(true);

    try {
      const uploadedDocuments: ProfileDocumentItem[] = [];

      for (const item of pendingProfileDocuments) {
        const uploadResult = await uploadDocumentToCloudinary({
          asset: item.asset,
          cloudinaryCloudName: config.cloudinaryCloudName,
          cloudinaryUploadPreset: config.cloudinaryUploadPreset,
          webAppUrl: config.webAppUrl,
        });
        const fileName = buildProfileDocumentName(item.title, uploadResult.originalFileName);

        uploadedDocuments.push({
          id: createLocalId(),
          attachmentUrl: uploadResult.secureUrl,
          fileName,
          mimeType: item.asset.mimeType ?? null,
          name: fileName,
          sizeLabel: item.sizeLabel,
        });
      }

      setProfileDocuments((current) => [...current, ...uploadedDocuments]);
      setPendingProfileDocuments([]);
      setProfileModalOpen(false);
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Could not upload documents.",
      );
    } finally {
      setProfileDocumentsUploading(false);
    }
  };

  const handlePreviewProfileDocument = (document: ProfileDocumentItem) => {
    void openDocumentPreview(config, document.attachmentUrl, document.fileName).catch((error) => {
      Alert.alert(
        "Preview failed",
        error instanceof Error ? error.message : "Could not open document.",
      );
    });
  };

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

            <View style={styles.summaryGrid}>
              {summaryCards.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: colors.cardMuted,
                      width: summaryCardWidth,
                    },
                  ]}
                >
                  <Text style={[styles.summaryLabel, { color: colors.textSoft }]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color: item.tone === "danger" ? colors.danger : colors.text,
                      },
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.copy, { color: colors.textSoft }]}>
              Created {formatDateTime(company.createdAt)}
            </Text>
          </Surface>

          <SegmentedControl
            options={tabOptions}
            value={tab}
            onChange={(value) => setTab(value as DetailTab)}
          />

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
            ? (
                <View style={styles.documentsStack}>
                  <SegmentedControl
                    options={documentTypeOptions}
                    value={documentTab}
                    onChange={(value) => setDocumentTab(value as DocumentTab)}
                  />
                  {visibleDocuments.length
                    ? visibleDocuments.map((document) => {
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
                                  {formatDocumentTypeLabel(document.documentType)} | Order #
                                  {document.orderId}
                                </Text>
                                <Text style={[styles.copy, { color: colors.textSoft }]}>
                                  {document.uploadedByName} | {formatDateTime(document.createdAt)}
                                </Text>
                              </View>
                              <View style={styles.profileDocumentActions}>
                                <Pressable
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
                                  style={({ pressed }) => [
                                    styles.inlineIconAction,
                                    pressed ? styles.inlineIconActionPressed : null,
                                  ]}
                                >
                                  <Ionicons color={colors.text} name="eye-outline" size={18} />
                                </Pressable>
                                <Pressable
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
                                  style={({ pressed }) => [
                                    styles.inlineIconAction,
                                    pressed ? styles.inlineIconActionPressed : null,
                                  ]}
                                >
                                  <Ionicons color={colors.text} name="download-outline" size={18} />
                                </Pressable>
                              </View>
                            </View>
                          </Surface>
                        );
                      })
                    : (
                        <EmptyState
                          title={`No ${documentTab === "SUBMITTED" ? "submitted" : "received"} files`}
                          description="Documents for this company will appear here."
                        />
                      )}
                </View>
              )
            : null}

          {tab === "profile"
            ? (
                <View style={styles.stack}>
                  <Surface style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      User Information
                    </Text>
                    <View style={styles.profileRows}>
                      {userInformationRows.map((row) => (
                        <View
                          key={row.label}
                          style={[
                            styles.profileRow,
                            { borderBottomColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.profileKey, { color: colors.textSoft }]}>
                            {row.label}
                          </Text>
                          <Text style={[styles.profileValue, { color: colors.text }]}>
                            {row.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Surface>

                  <Surface style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Other Details
                    </Text>
                    <View style={styles.profileRows}>
                      {otherDetailsRows.map((row) => (
                        <View
                          key={row.label}
                          style={[
                            styles.profileRow,
                            { borderBottomColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.profileKey, { color: colors.textSoft }]}>
                            {row.label}
                          </Text>
                          <Text style={[styles.profileValue, { color: colors.text }]}>
                            {row.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Surface>

                  <Surface style={styles.card}>
                    <View style={[styles.rowBetween, compact && styles.rowStack]}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Documents
                      </Text>
                      <Button
                        label="Add Documents"
                        tone="secondary"
                        onPress={() => setProfileModalOpen(true)}
                        style={compact ? styles.fullWidthButton : undefined}
                      />
                    </View>

                    {profileDocuments.length ? (
                      <View style={styles.profileDocumentsList}>
                        {profileDocuments.map((document, index) => (
                          <View
                            key={document.id}
                            style={[
                              styles.profileDocumentRow,
                              {
                                borderBottomColor: colors.border,
                              },
                              index === profileDocuments.length - 1
                                ? styles.profileDocumentRowLast
                                : null,
                            ]}
                          >
                            <View style={styles.profileDocumentCopy}>
                              <Text style={[styles.value, { color: colors.text }]}>
                                {document.name}
                              </Text>
                            </View>
                            <Text style={[styles.documentSize, { color: colors.textSoft }]}>
                              {document.sizeLabel}
                            </Text>
                            <View style={styles.profileDocumentActions}>
                              <Pressable
                                onPress={() => handlePreviewProfileDocument(document)}
                                style={({ pressed }) => [
                                  styles.inlineIconAction,
                                  pressed ? styles.inlineIconActionPressed : null,
                                ]}
                              >
                                <Ionicons color={colors.text} name="eye-outline" size={18} />
                              </Pressable>
                              <Pressable
                                onPress={() =>
                                  setProfileDocuments((current) =>
                                    current.filter((item) => item.id !== document.id),
                                  )
                                }
                                style={({ pressed }) => [
                                  styles.inlineIconAction,
                                  pressed ? styles.inlineIconActionPressed : null,
                                ]}
                              >
                                <Ionicons color={colors.danger} name="trash-outline" size={18} />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.copy, { color: colors.textSoft }]}>
                        No document found
                      </Text>
                    )}
                  </Surface>
                </View>
              )
            : null}
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={profileModalOpen}
        onRequestClose={() => {
          if (profileDocumentsUploading) {
            return;
          }

          setProfileModalOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={[styles.modalEyebrow, { color: colors.textSoft }]}>
                  Profile
                </Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Documents</Text>
              </View>
              <IconButton
                disabled={profileDocumentsUploading}
                onPress={() => setProfileModalOpen(false)}
              >
                <Ionicons color={colors.text} name="close" size={18} />
              </IconButton>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <Button
                label="Choose Files"
                tone="secondary"
                disabled={profileDocumentsUploading}
                onPress={() => {
                  void handlePickProfileDocuments();
                }}
              />

              {pendingProfileDocuments.length ? (
                pendingProfileDocuments.map((document) => (
                  <View
                    key={document.id}
                    style={[
                      styles.pendingDocumentCard,
                      { backgroundColor: colors.cardMuted },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={styles.flexCopy}>
                        <Text style={[styles.value, { color: colors.text }]}>
                          {document.asset.name}
                        </Text>
                        <Text style={[styles.copy, { color: colors.textSoft }]}>
                          {document.sizeLabel}
                        </Text>
                      </View>
                      <Pressable
                        disabled={profileDocumentsUploading}
                        onPress={() =>
                          setPendingProfileDocuments((current) =>
                            current.filter((item) => item.id !== document.id),
                          )
                        }
                        style={({ pressed }) => [
                          styles.inlineIconAction,
                          pressed ? styles.inlineIconActionPressed : null,
                        ]}
                      >
                        <Ionicons color={colors.danger} name="trash-outline" size={18} />
                      </Pressable>
                    </View>

                    <TextField
                      label="Title"
                      value={document.title}
                      onChangeText={(value) =>
                        setPendingProfileDocuments((current) =>
                          current.map((item) =>
                            item.id === document.id ? { ...item, title: value } : item,
                          ),
                        )
                      }
                    />
                  </View>
                ))
              ) : (
                <Text style={[styles.copy, { color: colors.textSoft }]}>
                  Choose one or more files to add profile documents.
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancel"
                tone="ghost"
                disabled={profileDocumentsUploading}
                onPress={() => setProfileModalOpen(false)}
                style={styles.modalButton}
              />
              <Button
                label="Upload Documents"
                loading={profileDocumentsUploading}
                disabled={pendingProfileDocuments.length === 0}
                onPress={() => {
                  void handleUploadProfileDocuments();
                }}
                style={styles.modalButton}
              />
            </View>
          </Surface>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  hero: {
    gap: 12,
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  summaryCard: {
    borderRadius: 8,
    gap: 6,
    minHeight: 76,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  card: {
    gap: 12,
  },
  documentsStack: {
    gap: 12,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  profileRows: {
    gap: 0,
  },
  profileRow: {
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  profileKey: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  profileValue: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  profileDocumentsList: {
    gap: 0,
  },
  profileDocumentRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  profileDocumentRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  profileDocumentCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileDocumentActions: {
    flexDirection: "row",
    gap: 4,
  },
  documentSize: {
    fontSize: 12,
    fontWeight: "700",
  },
  inlineIconAction: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 34,
    padding: 6,
  },
  inlineIconActionPressed: {
    opacity: 0.72,
  },
  fullWidthButton: {
    minWidth: "100%",
  },
  modalOverlay: {
    backgroundColor: "rgba(2, 8, 23, 0.86)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalSheet: {
    alignSelf: "center",
    gap: 14,
    maxHeight: "84%",
    width: "100%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  modalContent: {
    gap: 12,
  },
  pendingDocumentCard: {
    borderRadius: 8,
    gap: 12,
    padding: 10,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
  },
});
