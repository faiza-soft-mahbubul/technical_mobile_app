import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { uploadDocumentToCloudinary } from "@/api/cloudinary";
import { SUBMIT_ORDER_DOCUMENTS_MUTATION } from "@/api/documents";
import type { OrderStatus, StatusBoardDocument, StatusBoardOrder } from "@/api/types";
import { Button } from "@/components/common/button";
import { IconButton } from "@/components/common/icon-button";
import { PickerField } from "@/components/common/picker-field";
import { useAppConfig } from "@/providers/app-config-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import { openDocumentPreview, resolveDocumentFileName } from "@/utils/documents";
import { formatDateTime, formatOrderStatusLabel } from "@/utils/format";

type WorkflowFile = {
  id: string;
  attachmentUrl: string;
  extension: string;
  isUploading: boolean;
  originalName: string;
  sizeLabel: string;
  title: string;
};

type WorkflowRow = {
  id: string;
  categoryId: string;
  files: WorkflowFile[];
  statusOnly: boolean;
};

type StatusActionModalProps = {
  currentStatus: OrderStatus;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
  order: StatusBoardOrder;
};

const ALL_SERVICES_VALUE = "__all_services__";

function createWorkflowRow(categoryId = ""): WorkflowRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    categoryId,
    files: [],
    statusOnly: true,
  };
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) {
    return "Unknown size";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function splitFileName(value: string) {
  const trimmed = value.trim();
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0) {
    return {
      extension: "",
      title: trimmed || "document",
    };
  }

  return {
    extension: trimmed.slice(lastDot),
    title: trimmed.slice(0, lastDot) || "document",
  };
}

function getTargetStatus(status: OrderStatus) {
  if (status === "PENDING") {
    return "PROCESSING" as const;
  }

  if (status === "PROCESSING") {
    return "COMPLETED" as const;
  }

  return null;
}

function getDocumentModeLabel(status: OrderStatus) {
  return status === "PROCESSING" ? "Received files" : "Submitted files";
}

function collectOrderCategoryOptions(order: StatusBoardOrder) {
  const mappedCategories = [
    ...(order.orderServices?.flatMap(
      (item) =>
        item?.service?.serviceCategoryMappings?.map((mapping) => ({
          serviceCategoryId: mapping?.serviceCategoryId ?? 0,
          name: mapping?.serviceCategory?.name?.trim() ?? "",
        })) ?? [],
    ) ?? []),
    ...(order.orderPackages?.flatMap(
      (item) =>
        item?.package?.packageServices?.flatMap(
          (packageService) =>
            packageService?.service?.serviceCategoryMappings?.map((mapping) => ({
              serviceCategoryId: mapping?.serviceCategoryId ?? 0,
              name: mapping?.serviceCategory?.name?.trim() ?? "",
            })) ?? [],
        ) ?? [],
    ) ?? []),
  ];

  const resolvedCategories = mappedCategories.filter(
    (item) => item.serviceCategoryId > 0 && item.name.length > 0,
  );

  if (resolvedCategories.length > 0) {
    return Array.from(
      new Map(
        resolvedCategories.map((item) => [item.serviceCategoryId, item]),
      ).values(),
    );
  }

  if (order.availableServiceCategories.length > 0) {
    return Array.from(
      new Map(
        order.availableServiceCategories
          .map((item) => ({
            serviceCategoryId: item.serviceCategoryId,
            name: item.name.trim(),
          }))
          .filter((item) => item.serviceCategoryId > 0 && item.name.length > 0)
          .map((item) => [item.serviceCategoryId, item]),
      ).values(),
    );
  }

  return order.serviceCategoryId > 0 && order.serviceCategoryName.trim().length > 0
    ? [
        {
          serviceCategoryId: order.serviceCategoryId,
          name: order.serviceCategoryName.trim(),
        },
      ]
    : [];
}


export function StatusActionModal({
  currentStatus,
  onClose,
  onSubmitted,
  order,
}: Readonly<StatusActionModalProps>) {
  const { colors } = useAppTheme();
  const { config } = useAppConfig();
  const { executeAuthenticated } = useAuth();
  const [rows, setRows] = useState<WorkflowRow[]>([createWorkflowRow("")]);
  const [submitting, setSubmitting] = useState(false);
  const [editingFile, setEditingFile] = useState<{
    fileId: string;
    rowId: string;
  } | null>(null);
  const lastTapRef = useRef<{
    fileId: string;
    rowId: string;
    timestamp: number;
  } | null>(null);

  const targetStatus = getTargetStatus(currentStatus);
  const allOrderCategoryOptions = useMemo(
    () =>
      collectOrderCategoryOptions(order).filter(
        (item, index, collection) =>
          collection.findIndex(
            (current) => current.serviceCategoryId === item.serviceCategoryId,
          ) === index,
      ),
    [order],
  );
  const categoryOptions = useMemo(() => {
    const availableCategoryOptions = Array.from(
      new Map(
        order.availableServiceCategories
          .map((item) => {
            const mappedMatch = allOrderCategoryOptions.find(
              (current) => current.serviceCategoryId === item.serviceCategoryId,
            );

            return {
              serviceCategoryId: item.serviceCategoryId,
              name: mappedMatch?.name ?? item.name.trim(),
            };
          })
          .filter((item) => item.serviceCategoryId > 0 && item.name.length > 0)
          .map((item) => [item.serviceCategoryId, item]),
      ).values(),
    );

    if (availableCategoryOptions.length > 0) {
      return availableCategoryOptions;
    }

    const submittedCategoryIds = new Set<number>();
    const receivedCategoryIds = new Set<number>();

    for (const document of order.serviceDocuments ?? []) {
      if (!document?.serviceCategoryId) {
        continue;
      }

      if (document.documentType === "RECEIVED") {
        receivedCategoryIds.add(document.serviceCategoryId);
      } else {
        submittedCategoryIds.add(document.serviceCategoryId);
      }
    }

    if (currentStatus === "PENDING") {
      return allOrderCategoryOptions.filter(
        (item) =>
          !submittedCategoryIds.has(item.serviceCategoryId) &&
          !receivedCategoryIds.has(item.serviceCategoryId),
      );
    }

    return allOrderCategoryOptions.filter(
      (item) =>
        submittedCategoryIds.has(item.serviceCategoryId) &&
        !receivedCategoryIds.has(item.serviceCategoryId),
    );
  }, [
    allOrderCategoryOptions,
    order.availableServiceCategories,
    order.serviceDocuments,
    currentStatus,
  ]);
  const defaultCategoryId = useMemo(
    () => (categoryOptions[0] ? String(categoryOptions[0].serviceCategoryId) : ""),
    [categoryOptions],
  );
  const hasAllServicesRow = useMemo(
    () => rows.some((row) => row.categoryId === ALL_SERVICES_VALUE),
    [rows],
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => row.categoryId.trim().length > 0),
    [rows],
  );
  const hasRowsWithFilesMissingCategory = useMemo(
    () => rows.some((row) => !row.categoryId.trim() && row.files.length > 0),
    [rows],
  );
  const canSubmit = useMemo(
    () =>
      selectedRows.length > 0 &&
      !hasRowsWithFilesMissingCategory &&
      selectedRows.every((row) => row.statusOnly || row.files.length > 0) &&
      rows.every(
        (row) =>
          !row.files.some((file) => file.isUploading) &&
          row.files.every((file) => file.attachmentUrl.trim()),
      ),
    [hasRowsWithFilesMissingCategory, rows, selectedRows],
  );
  const canAddRow = useMemo(() => {
    if (hasAllServicesRow) {
      return false;
    }

    const selectedCategoryIds = new Set(
      rows
        .filter(
          (row) =>
            row.categoryId.trim().length > 0 &&
            row.categoryId !== ALL_SERVICES_VALUE,
        )
        .map((row) => row.categoryId),
    );

    return selectedCategoryIds.size < categoryOptions.length;
  }, [categoryOptions.length, hasAllServicesRow, rows]);

  const getAvailableCategoryOptionsForRow = (rowId: string) => {
    const selectedCategoryIds = new Set(
      rows
        .filter(
          (row) =>
            row.id !== rowId &&
            row.categoryId.trim().length > 0 &&
            row.categoryId !== ALL_SERVICES_VALUE,
        )
        .map((row) => row.categoryId),
    );
    const currentRow = rows.find((row) => row.id === rowId);

    return [
      { label: "Choose category", value: "" },
      ...(categoryOptions.length > 0
        ? [
            {
              label: "All services",
              value: ALL_SERVICES_VALUE,
            },
          ]
        : []),
      ...categoryOptions
        .filter(
          (item) =>
            currentRow?.categoryId === String(item.serviceCategoryId) ||
            !selectedCategoryIds.has(String(item.serviceCategoryId)),
        )
        .map((item) => ({
          label: item.name,
          value: String(item.serviceCategoryId),
        })),
    ];
  };

  useEffect(() => {
    if (categoryOptions.length === 0) {
      return;
    }

    setRows((current) => {
      const usedCategoryIds = new Set<string>();
      let changed = false;

      const nextRows = current.map((row) => {
        if (row.categoryId === ALL_SERVICES_VALUE) {
          return row;
        }

        const stillValid = categoryOptions.some(
          (item) => String(item.serviceCategoryId) === row.categoryId,
        );

        if (stillValid) {
          usedCategoryIds.add(row.categoryId);
          return row;
        }

        const replacement =
          categoryOptions.find(
            (item) => !usedCategoryIds.has(String(item.serviceCategoryId)),
          ) ?? categoryOptions[0];
        const replacementId = replacement ? String(replacement.serviceCategoryId) : "";

        if (!replacementId) {
          return row;
        }

        usedCategoryIds.add(replacementId);
        changed = true;

        return {
          ...row,
          categoryId: replacementId,
        };
      });

      return changed ? nextRows : current;
    });
  }, [categoryOptions, defaultCategoryId]);

  const pickFilesForRow = async (rowId: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ["application/pdf", "image/*"],
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const provisionalFiles = result.assets.map((asset) => {
      const parsed = splitFileName(asset.name);

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        attachmentUrl: "",
        extension: parsed.extension,
        isUploading: true,
        originalName: asset.name,
        sizeLabel: formatFileSize(asset.size),
        title: parsed.title,
      } satisfies WorkflowFile;
    });

    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              files: [...row.files, ...provisionalFiles],
            }
          : row,
      ),
    );

    for (const [index, asset] of result.assets.entries()) {
      const fileId = provisionalFiles[index]?.id;

      if (!fileId) {
        continue;
      }

      try {
        const uploadResult = await uploadDocumentToCloudinary({
          asset,
          webAppUrl: config.webAppUrl,
        });

        setRows((current) =>
          current.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  files: row.files.map((file) =>
                    file.id === fileId
                      ? {
                          ...file,
                          attachmentUrl: uploadResult.secureUrl,
                          isUploading: false,
                          originalName: uploadResult.originalFileName,
                        }
                      : file,
                  ),
                }
              : row,
          ),
        );
      } catch (error) {
        setRows((current) =>
          current.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  files: row.files.filter((file) => file.id !== fileId),
                }
              : row,
          ),
        );

        Alert.alert(
          "Upload failed",
          error instanceof Error ? error.message : "Could not upload file.",
        );
      }
    }
  };

  const handleFileNamePress = (rowId: string, fileId: string) => {
    const now = Date.now();

    if (
      lastTapRef.current &&
      lastTapRef.current.rowId === rowId &&
      lastTapRef.current.fileId === fileId &&
      now - lastTapRef.current.timestamp < 320
    ) {
      setEditingFile({ rowId, fileId });
      lastTapRef.current = null;
      return;
    }

    lastTapRef.current = {
      rowId,
      fileId,
      timestamp: now,
    };
  };

  const handleSubmit = async () => {
    if (!targetStatus) {
      onClose();
      return;
    }

    if (hasRowsWithFilesMissingCategory) {
      Alert.alert("Select category", "Choose a service category before uploading files.");
      return;
    }

    const statusOnlyCategoryIds = Array.from(
      new Set(
        selectedRows.flatMap((row) =>
          row.categoryId === ALL_SERVICES_VALUE
            ? categoryOptions.map((item) => item.serviceCategoryId)
            : row.statusOnly
              ? [Number(row.categoryId)].filter(
                  (value) => Number.isInteger(value) && value > 0,
                )
              : [],
        ),
      ),
    );

    const selectedCategoryIds = Array.from(
      new Set(
        selectedRows.flatMap((row) =>
          row.categoryId === ALL_SERVICES_VALUE
            ? categoryOptions.map((item) => item.serviceCategoryId)
            : [Number(row.categoryId)].filter(
                (value) => Number.isInteger(value) && value > 0,
              ),
        ),
      ),
    );

    if (!selectedCategoryIds.length) {
      Alert.alert("Select category", "Choose at least one service category.");
      return;
    }

    if (selectedRows.some((row) => !row.statusOnly && row.files.length === 0)) {
      Alert.alert("Add files", "Choose at least one file when status-only is turned off.");
      return;
    }

    const documents = selectedRows.flatMap((row) =>
      row.statusOnly
        ? []
        : row.files
            .filter((file) => file.attachmentUrl.trim())
            .map((file) => ({
              attachment: file.attachmentUrl.trim(),
              documentName: `${file.title.trim() || "document"}${file.extension}`,
              ...(row.categoryId === ALL_SERVICES_VALUE
                ? {}
                : {
                    serviceCategoryId: Number(row.categoryId),
                  }),
            })),
    );

    try {
      setSubmitting(true);

      await executeAuthenticated<
        { submitOrderDocuments: { orderId: number; orderStatus: OrderStatus } },
        {
          input: {
            documents?: Array<{
              attachment: string;
              documentName: string;
              serviceCategoryId?: number;
            }>;
            orderId: number;
            statusOnlyCategoryIds?: number[];
            workflowStatus: OrderStatus;
          };
        }
      >(SUBMIT_ORDER_DOCUMENTS_MUTATION, {
        input: {
          orderId: order.orderId,
          ...(documents.length ? { documents } : {}),
          ...(statusOnlyCategoryIds.length
            ? { statusOnlyCategoryIds: statusOnlyCategoryIds }
            : {}),
          workflowStatus: currentStatus,
        },
      });

      await onSubmitted();
      onClose();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Could not update order.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient colors={["rgba(2,8,23,0.94)", "rgba(7,20,39,0.96)"]} style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Order #{order.orderId}</Text>
              <Text style={[styles.subtitle, { color: colors.textSoft }]}>
                {order.companyInfo?.name ?? "Unknown company"} · {formatOrderStatusLabel(currentStatus)}
              </Text>
            </View>
            <IconButton onPress={onClose}>
              <Ionicons color={colors.text} name="close" size={18} />
            </IconButton>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.infoBand, { backgroundColor: colors.cardMuted }]}>
              <Text style={[styles.infoLabel, { color: colors.textSoft }]}>
                {targetStatus ? `Move to ${formatOrderStatusLabel(targetStatus)}` : "No next status"}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {getDocumentModeLabel(currentStatus)}
              </Text>
              <Text style={[styles.infoHint, { color: colors.textSoft }]}>
                Add files if needed, or submit without files to update status only.
              </Text>
            </View>

            {rows.map((row, index) => (
              <View key={row.id} style={[styles.rowBlock, { backgroundColor: colors.card }]}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    Category {index + 1}
                  </Text>
                  {rows.length > 1 ? (
                    <IconButton
                      onPress={() => {
                        setRows((current) => current.filter((item) => item.id !== row.id));
                      }}
                    >
                      <Ionicons color={colors.text} name="trash-outline" size={18} />
                    </IconButton>
                  ) : null}
                </View>

                <PickerField
                  label="Category"
                  selectedValue={row.categoryId}
                  options={getAvailableCategoryOptionsForRow(row.id)}
                  onValueChange={(value) => {
                    setRows((current) => {
                      const nextRows = current.map((item) =>
                        item.id === row.id
                          ? {
                              ...item,
                              categoryId: value,
                              statusOnly:
                                value === ALL_SERVICES_VALUE && !item.categoryId.trim()
                                  ? true
                                  : item.statusOnly,
                            }
                          : item,
                      );

                      if (value === ALL_SERVICES_VALUE) {
                        return nextRows.filter((item) => item.id === row.id);
                      }

                      return nextRows;
                    });
                  }}
                />

                {row.categoryId.trim().length > 0 ? (
                  <View style={[styles.modeRow, { backgroundColor: colors.cardMuted }]}>
                    <View style={styles.modeCopy}>
                      <Text style={[styles.modeLabel, { color: colors.text }]}>
                        {targetStatus ? formatOrderStatusLabel(targetStatus) : "Status update"}
                      </Text>
                      {(() => {
                        const modeHint =
                          row.categoryId === ALL_SERVICES_VALUE
                            ? row.statusOnly
                              ? "All services will move without files."
                              : "Files will be submitted for all services."
                            : "";

                        return modeHint ? (
                          <Text style={[styles.modeHint, { color: colors.textSoft }]}>
                            {modeHint}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                    <Pressable
                      onPress={() => {
                        setRows((current) =>
                          current.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  statusOnly: !item.statusOnly,
                                  files: item.statusOnly ? item.files : [],
                                }
                              : item,
                          ),
                        );
                      }}
                      style={({ pressed }) => [
                        styles.switch,
                        {
                          backgroundColor: row.statusOnly ? colors.accent : colors.muted,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          row.statusOnly ? styles.switchThumbOn : styles.switchThumbOff,
                        ]}
                      />
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  {!row.statusOnly ? (
                    <Button
                      disabled={!row.categoryId.trim()}
                      label="Add files"
                      tone="secondary"
                      onPress={() => void pickFilesForRow(row.id)}
                    />
                  ) : null}
                  <Button
                    label="Add category"
                    tone="ghost"
                    disabled={!canAddRow || hasAllServicesRow}
                    onPress={() => {
                      setRows((current) => [...current, createWorkflowRow("")]);
                    }}
                  />
                </View>

                {!row.statusOnly && row.files.length ? (
                  <View style={styles.files}>
                    {row.files.map((file) => {
                      const fileName = `${file.title}${file.extension}`;
                      const previewName = resolveDocumentFileName({
                        title: fileName,
                        attachment: file.attachmentUrl,
                        fallback: file.originalName,
                      });
                      const editing =
                        editingFile?.rowId === row.id && editingFile.fileId === file.id;

                      return (
                        <View
                          key={file.id}
                          style={[styles.fileItem, { backgroundColor: colors.cardMuted }]}
                        >
                          <View style={styles.fileCopy}>
                            {editing ? (
                              <View style={styles.fileNameRow}>
                                <TextInput
                                  autoFocus
                                  onBlur={() => setEditingFile(null)}
                                  onChangeText={(value) => {
                                    setRows((current) =>
                                      current.map((currentRow) =>
                                        currentRow.id === row.id
                                          ? {
                                              ...currentRow,
                                              files: currentRow.files.map((currentFile) =>
                                                currentFile.id === file.id
                                                  ? {
                                                      ...currentFile,
                                                      title: value,
                                                    }
                                                  : currentFile,
                                              ),
                                            }
                                          : currentRow,
                                      ),
                                    );
                                  }}
                                  style={[styles.fileInput, { color: colors.text }]}
                                  value={file.title}
                                />
                                <Text style={[styles.fileExtension, { color: colors.textSoft }]}>
                                  {file.extension}
                                </Text>
                              </View>
                            ) : (
                              <Pressable onPress={() => handleFileNamePress(row.id, file.id)}>
                                <Text style={[styles.fileTitle, { color: colors.text }]}>
                                  {fileName}
                                </Text>
                              </Pressable>
                            )}
                            <Text style={[styles.fileMeta, { color: colors.textSoft }]}>
                              {file.sizeLabel} · {file.isUploading ? "Uploading..." : "Ready"}
                            </Text>
                          </View>
                          <View style={styles.fileActions}>
                            <IconButton
                              disabled={!file.attachmentUrl}
                              onPress={() => {
                                if (!file.attachmentUrl) {
                                  return;
                                }

                                void openDocumentPreview(
                                  config,
                                  file.attachmentUrl,
                                  previewName,
                                ).catch((error) => {
                                  Alert.alert(
                                    "Preview failed",
                                    error instanceof Error
                                      ? error.message
                                      : "Could not open file.",
                                  );
                                });
                              }}
                            >
                              <Ionicons color={colors.text} name="eye-outline" size={18} />
                            </IconButton>
                            <IconButton
                              onPress={() => {
                                setRows((current) =>
                                  current.map((currentRow) =>
                                    currentRow.id === row.id
                                      ? {
                                          ...currentRow,
                                          files: currentRow.files.filter(
                                            (currentFile) => currentFile.id !== file.id,
                                          ),
                                        }
                                      : currentRow,
                                  ),
                                );
                              }}
                            >
                              <Ionicons color={colors.text} name="trash-outline" size={18} />
                            </IconButton>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : !row.statusOnly ? (
                  <Text style={[styles.emptyFiles, { color: colors.textSoft }]}>
                    {row.categoryId === ALL_SERVICES_VALUE
                      ? "No files selected yet. Add one or more files for all services."
                      : "No files selected yet. Add one or more files for this category."}
                  </Text>
                ) : null}
              </View>
            ))}

          </ScrollView>

          <View style={styles.footer}>
            <Button label="Cancel" tone="ghost" onPress={onClose} />
            <Button
              disabled={!canSubmit || submitting || !targetStatus}
              label={
                submitting
                  ? "Saving..."
                  : targetStatus
                    ? formatOrderStatusLabel(targetStatus)
                    : "Done"
              }
              loading={submitting}
              onPress={() => void handleSubmit()}
            />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(2, 8, 23, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    borderRadius: 8,
    maxHeight: "92%",
    overflow: "hidden",
    padding: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: "#f8fbff",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    gap: 12,
    paddingBottom: 10,
    paddingTop: 14,
  },
  infoBand: {
    borderRadius: 8,
    gap: 3,
    padding: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  infoHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowBlock: {
    borderRadius: 8,
    gap: 10,
    padding: 12,
  },
  modeRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeCopy: {
    flex: 1,
    gap: 2,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  modeHint: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  switch: {
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 52,
  },
  switchThumb: {
    backgroundColor: "#f8fbff",
    borderRadius: 999,
    height: 22,
    position: "absolute",
    top: 4,
    width: 22,
  },
  switchThumbOn: {
    right: 4,
  },
  switchThumbOff: {
    left: 4,
  },
  files: {
    gap: 8,
  },
  fileItem: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  fileCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  fileTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  fileMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  fileActions: {
    flexDirection: "row",
    gap: 8,
  },
  emptyFiles: {
    fontSize: 12,
    lineHeight: 18,
  },
  fileNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  fileInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 0,
    paddingVertical: 0,
  },
  fileExtension: {
    fontSize: 12,
    fontWeight: "600",
  },
  historyBlock: {
    gap: 10,
  },
  historyGroup: {
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 10,
  },
  historyGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  historyLane: {
    gap: 6,
  },
  historyLaneLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  historyItemRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  historyCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  historyItemTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  historyItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    paddingTop: 10,
  },
});
