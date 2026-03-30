import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  ADD_ORDER_FORM_DATA_QUERY,
  CREATE_COMPANY_MUTATION,
  CREATE_ORDER_MUTATION,
  CREATE_PAYMENT_MUTATION,
  CREATE_USER_MUTATION,
  SUBMIT_ORDER_DOCUMENTS_MUTATION,
} from "@/api/documents";
import { uploadDocumentToCloudinary } from "@/api/cloudinary";
import type { AddOrderFormData } from "@/api/types";
import type { RootStackScreenProps } from "@/navigation/types";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PickerField } from "@/components/common/picker-field";
import { Screen } from "@/components/common/screen";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Surface } from "@/components/common/surface";
import { TextField } from "@/components/common/text-field";
import { useAppConfig } from "@/providers/app-config-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppTheme } from "@/theme/theme-provider";
import {
  buildManualTransactionId,
  buildOrderDates,
  buildTemporaryPassword,
  formatCurrency,
  normalizePhone,
  normalizeText,
  parseMoney,
} from "@/utils/format";
import { useAsyncResource } from "@/utils/use-async-resource";

type CompanyMode = "existing" | "new";
type OrderMode = "package" | "services";
type PaymentCollectionStatus = "paid" | "partial_paid";
type InitialDocumentRow = {
  id: string;
  attachmentUrl: string;
  documentName: string;
  serviceId: string;
  uploadedFileName: string;
  isUploading: boolean;
};

const companyModeOptions = [
  { label: "Existing company", value: "existing" },
  { label: "New company", value: "new" },
] as const;

const orderModeOptions = [
  { label: "Package", value: "package" },
  { label: "Services", value: "services" },
] as const;

const paymentStatusOptions = [
  { label: "Paid", value: "paid" },
  { label: "Partial paid", value: "partial_paid" },
] as const;

function createInitialDocumentRow(): InitialDocumentRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    attachmentUrl: "",
    documentName: "",
    serviceId: "",
    uploadedFileName: "",
    isUploading: false,
  };
}

export function AddOrderScreen({ navigation }: RootStackScreenProps<"AddOrder">) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { config } = useAppConfig();
  const { executeAuthenticated } = useAuth();
  const [companyMode, setCompanyMode] = useState<CompanyMode>("existing");
  const [orderMode, setOrderMode] = useState<OrderMode>("package");
  const [paymentStatus, setPaymentStatus] = useState<PaymentCollectionStatus>("paid");
  const [submitting, setSubmitting] = useState(false);

  const [selectedExistingCompanyId, setSelectedExistingCompanyId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [companyTypeId, setCompanyTypeId] = useState("");
  const [companyServiceTypeId, setCompanyServiceTypeId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [paidAmount, setPaidAmount] = useState("");
  const [initialDocuments, setInitialDocuments] = useState<InitialDocumentRow[]>([]);

  const compact = width < 420;
  const stackedFields = width < 720;

  const resource = useAsyncResource(
    () => executeAuthenticated<AddOrderFormData, Record<string, never>>(ADD_ORDER_FORM_DATA_QUERY),
    [executeAuthenticated],
  );

  const formData = resource.data;
  const existingCompany =
    formData?.companies.find((item) => item.id === Number(selectedExistingCompanyId)) ?? null;
  const activeCountries = formData?.countries.filter((item) => item.isActive) ?? [];
  const selectedCountry = activeCountries.find((item) => item.id === Number(countryId)) ?? null;
  const stateOptions =
    (selectedCountry?.states ?? [])
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.isActive))
      .map((item) => ({ id: item.id, name: item.name, fee: item.fee })) ?? [];
  const packageOptions =
    (formData?.packages ?? []).filter(
      (item) => item.isActive && item.countryId === Number(countryId),
    ) ?? [];
  const serviceOptions =
    (formData?.services ?? []).filter(
      (item) => item.isActive && item.countryId === Number(countryId),
    ) ?? [];
  const selectedPackage = packageOptions.find((item) => item.id === Number(packageId)) ?? null;
  const selectedServices =
    orderMode === "services"
      ? serviceOptions.filter((item) => selectedServiceIds.includes(item.id))
      : [];
  const packageIncludedServices =
    (selectedPackage?.packageServices ?? [])
      .map((item) => item?.service)
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [];
  const packageIncludedServiceNames = packageIncludedServices.map((item) => item.name).join(", ");
  const documentServiceOptions = useMemo(() => {
    const merged = orderMode === "package" ? packageIncludedServices : selectedServices;

    return merged.filter(
      (service, index, current) =>
        current.findIndex((item) => item.id === service.id) === index,
    );
  }, [orderMode, packageIncludedServices, selectedServices]);

  const selectedState = stateOptions.find((item) => item.id === Number(stateId)) ?? null;
  const stateFee = parseMoney(selectedState?.fee);
  const packagePrice = parseMoney(selectedPackage?.currentPrice);
  const serviceTotal = selectedServices.reduce(
    (total, service) => total + parseMoney(service.currentPrice),
    0,
  );
  const totalAmount = stateFee + (orderMode === "package" ? packagePrice : 0) + serviceTotal;

  useEffect(() => {
    const validServiceIds = new Set(documentServiceOptions.map((item) => String(item.id)));

    setInitialDocuments((current) =>
      current.map((row) =>
        row.serviceId && !validServiceIds.has(row.serviceId)
          ? {
              ...row,
              serviceId: "",
            }
          : row,
      ),
    );
  }, [documentServiceOptions]);

  const handleExistingCompanyChange = (companyIdValue: string) => {
    setSelectedExistingCompanyId(companyIdValue);
    const company = formData?.companies.find((item) => item.id === Number(companyIdValue));

    if (!company) {
      return;
    }

    setCompanyName(company.name);
    setCompanyTypeId(String(company.companyTypeId));
    setCompanyServiceTypeId(String(company.serviceTypeId));
    setStateId(String(company.stateId));
    setCountryId(String(company.state?.countryId ?? ""));
    setFirstName(company.user?.firstName ?? "");
    setLastName(company.user?.lastName ?? "");
    setEmail(company.user?.email ?? "");
    setPhone(company.user?.phone ?? "");
    setAddress(company.user?.address ?? "");
  };

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
  };

  const handleOrderModeChange = (nextMode: OrderMode) => {
    setOrderMode(nextMode);

    if (nextMode === "package") {
      setSelectedServiceIds([]);
      return;
    }

    setPackageId("");
  };

  const addDocumentRow = () => {
    if (documentServiceOptions.length === 0) {
      return;
    }

    setInitialDocuments((current) => [...current, createInitialDocumentRow()]);
  };

  const removeDocumentRow = (rowId: string) => {
    setInitialDocuments((current) => current.filter((item) => item.id !== rowId));
  };

  const pickDocumentForRow = async (rowId: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*"],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setInitialDocuments((current) =>
      current.map((item) =>
        item.id === rowId
          ? {
              ...item,
              isUploading: true,
              uploadedFileName: asset.name,
            }
          : item,
      ),
    );

    try {
      const uploadResult = await uploadDocumentToCloudinary({
        asset,
        webAppUrl: config.webAppUrl,
      });

      setInitialDocuments((current) =>
        current.map((item) =>
          item.id === rowId
            ? {
                ...item,
                attachmentUrl: uploadResult.secureUrl,
                uploadedFileName: uploadResult.originalFileName,
                isUploading: false,
              }
            : item,
        ),
      );
    } catch (error) {
      setInitialDocuments((current) =>
        current.map((item) =>
          item.id === rowId
            ? {
                ...item,
                isUploading: false,
              }
            : item,
        ),
      );

      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Could not upload file.",
      );
    }
  };

  const validate = () => {
    if (companyMode === "existing" && !selectedExistingCompanyId) {
      return "Choose an existing company.";
    }

    if (companyMode === "new") {
      const requiredFields = [
        firstName,
        lastName,
        email,
        phone,
        companyName,
        countryId,
        stateId,
        companyTypeId,
        companyServiceTypeId,
      ];

      if (requiredFields.some((value) => !normalizeText(value).length)) {
        return "Complete all new company fields.";
      }
    }

    if (orderMode === "package" && !packageId) {
      return "Choose a package.";
    }

    if (selectedServiceIds.length === 0 && orderMode === "services") {
      return "Choose at least one service.";
    }

    if (paymentStatus === "partial_paid" && parseMoney(paidAmount) <= 0) {
      return "Enter a partial paid amount.";
    }

    for (const row of initialDocuments) {
      if (!row.serviceId || !row.documentName.trim() || !row.attachmentUrl.trim()) {
        return "Complete every initial document row before submitting.";
      }

      if (row.isUploading) {
        return "Wait until all document uploads finish.";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();

    if (validationError) {
      Alert.alert("Cannot create order", validationError);
      return;
    }

    try {
      setSubmitting(true);

      let companyId = existingCompany?.id ?? null;

      if (!companyId) {
        const userResult = await executeAuthenticated<
          { adminCreateUser: { id: string } },
          {
            input: {
              firstName: string;
              lastName: string;
              email: string;
              phone: string;
              address: string;
              password: string;
              role: "USER";
              status: "ACTIVE";
            };
          }
        >(CREATE_USER_MUTATION, {
          input: {
            firstName: normalizeText(firstName),
            lastName: normalizeText(lastName),
            email: email.trim().toLowerCase(),
            phone: normalizePhone(phone),
            address: normalizeText(address),
            password: buildTemporaryPassword(),
            role: "USER",
            status: "ACTIVE",
          },
        });

        const companyResult = await executeAuthenticated<
          { createCompany: { id: number } },
          {
            input: {
              userId: string;
              name: string;
              companyTypeId: number;
              serviceTypeId: number;
              stateId: number;
              isActive: true;
            };
          }
        >(CREATE_COMPANY_MUTATION, {
          input: {
            userId: userResult.adminCreateUser.id,
            name: normalizeText(companyName),
            companyTypeId: Number(companyTypeId),
            serviceTypeId: Number(companyServiceTypeId),
            stateId: Number(stateId),
            isActive: true,
          },
        });

        companyId = companyResult.createCompany.id;
      }

      const orderDates = buildOrderDates();
      const orderResult = await executeAuthenticated<
        { createOrder: { id: number; price: string } },
        {
          input: {
            companyId: number;
            packageId?: number;
            serviceIds: number[];
            price: number;
            startDate: string;
            endDate: string;
            status: "PENDING";
          };
        }
      >(CREATE_ORDER_MUTATION, {
        input: {
          companyId,
          ...(orderMode === "package" && packageId ? { packageId: Number(packageId) } : {}),
          serviceIds: orderMode === "services" ? selectedServiceIds : [],
          price: totalAmount,
          startDate: orderDates.startDate,
          endDate: orderDates.endDate,
          status: "PENDING",
        },
      });

      const orderId = orderResult.createOrder.id;
      const orderPrice = parseMoney(orderResult.createOrder.price);
      const paymentAmount =
        paymentStatus === "paid" ? orderPrice || totalAmount : parseMoney(paidAmount);

      await executeAuthenticated<
        { createPayment: { id: number } },
        {
          input: {
            orderId: number;
            amount: number;
            currency: "USD";
            paymentMethod: "MAIN_BALANCE";
            status: "PAID" | "PARTIALLY_PAID";
            transactionId: string;
          };
        }
      >(CREATE_PAYMENT_MUTATION, {
        input: {
          orderId,
          amount: paymentAmount,
          currency: "USD",
          paymentMethod: "MAIN_BALANCE",
          status: paymentStatus === "paid" ? "PAID" : "PARTIALLY_PAID",
          transactionId: buildManualTransactionId(orderId),
        },
      });

      if (initialDocuments.length > 0) {
        await executeAuthenticated<
          { submitOrderDocuments: { orderId: number } },
          {
            input: {
              orderId: number;
              documents: Array<{
                serviceId: number;
                documentName: string;
                attachment: string;
              }>;
            };
          }
        >(SUBMIT_ORDER_DOCUMENTS_MUTATION, {
          input: {
            orderId,
            documents: initialDocuments.map((row) => ({
              serviceId: Number(row.serviceId),
              documentName: normalizeText(row.documentName),
              attachment: row.attachmentUrl.trim(),
            })),
          },
        });
      }

      Alert.alert(
        "Success",
        initialDocuments.length
          ? "Order and initial documents created successfully."
          : "Order created successfully.",
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Creation failed",
        error instanceof Error ? error.message : "Could not create order.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (resource.loading && !formData) {
    return <LoadingState label="Loading order form..." />;
  }

  if (resource.error && !formData) {
    return <EmptyState title="Could not load order form" description={resource.error} />;
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <SegmentedControl options={companyModeOptions} value={companyMode} onChange={setCompanyMode} />

        <Surface style={styles.card}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSoft }]}>Company</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Company</Text>
          {companyMode === "existing" ? (
            <PickerField
              label="Existing company"
              selectedValue={selectedExistingCompanyId}
              options={[
                { label: "Choose company", value: "" },
                ...(formData?.companies.map((item) => ({
                  label: item.name,
                  value: String(item.id),
                })) ?? []),
              ]}
              onValueChange={handleExistingCompanyChange}
            />
          ) : null}

          <TextField
            editable={companyMode === "new"}
            label="Company name"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <View style={[styles.row, stackedFields && styles.rowStack]}>
            <TextField
              containerStyle={[styles.rowField, stackedFields && styles.rowFieldStack]}
              editable={companyMode === "new"}
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextField
              containerStyle={[styles.rowField, stackedFields && styles.rowFieldStack]}
              editable={companyMode === "new"}
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
          <TextField
            editable={companyMode === "new"}
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            value={email}
            onChangeText={setEmail}
          />
          <View style={[styles.row, stackedFields && styles.rowStack]}>
            <TextField
              containerStyle={[styles.rowField, stackedFields && styles.rowFieldStack]}
              editable={companyMode === "new"}
              keyboardType="phone-pad"
              label="Phone"
              value={phone}
              onChangeText={setPhone}
            />
            <TextField
              containerStyle={[styles.rowField, stackedFields && styles.rowFieldStack]}
              editable={companyMode === "new"}
              label="Address"
              value={address}
              onChangeText={setAddress}
            />
          </View>
          <PickerField
            enabled={companyMode === "new"}
            label="Country"
            selectedValue={countryId}
            options={[
              { label: "Choose country", value: "" },
              ...activeCountries.map((item) => ({ label: item.name, value: String(item.id) })),
            ]}
            onValueChange={(value) => {
              setCountryId(value);
              setStateId("");
              setPackageId("");
              setSelectedServiceIds([]);
            }}
          />
          <View style={[styles.row, stackedFields && styles.rowStack]}>
            <PickerField
              containerStyle={[styles.rowField, stackedFields && styles.rowFieldStack]}
              enabled={companyMode === "new"}
              label="State"
              selectedValue={stateId}
              options={[
                { label: "Choose state", value: "" },
                ...stateOptions.map((item) => ({
                  label: `${item.name}${item.fee ? ` (${formatCurrency(item.fee)})` : ""}`,
                  value: String(item.id),
                })),
              ]}
              onValueChange={setStateId}
            />
            <PickerField
              containerStyle={[styles.rowField, stackedFields && styles.rowFieldStack]}
              enabled={companyMode === "new"}
              label="Company type"
              selectedValue={companyTypeId}
              options={[
                { label: "Choose type", value: "" },
                ...(formData?.companyTypes.map((item) => ({
                  label: item.name,
                  value: String(item.id),
                })) ?? []),
              ]}
              onValueChange={setCompanyTypeId}
            />
          </View>
          <PickerField
            enabled={companyMode === "new"}
            label="Service type"
            selectedValue={companyServiceTypeId}
            options={[
              { label: "Choose service type", value: "" },
              ...(formData?.companyServiceTypes.map((item) => ({
                label: item.name,
                value: String(item.id),
              })) ?? []),
            ]}
            onValueChange={setCompanyServiceTypeId}
          />
        </Surface>

        <SegmentedControl options={orderModeOptions} value={orderMode} onChange={handleOrderModeChange} />

        <Surface style={styles.card}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSoft }]}>Order setup</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order setup</Text>
          {orderMode === "package" ? (
            <>
              <PickerField
                label="Package"
                selectedValue={packageId}
                options={[
                  { label: "Choose package", value: "" },
                  ...packageOptions.map((item) => ({
                    label: `${item.name} (${formatCurrency(item.currentPrice)})`,
                    value: String(item.id),
                  })),
                ]}
                onValueChange={setPackageId}
              />
              <View style={[styles.infoPanel, { backgroundColor: colors.cardMuted }]}>
                <Text style={[styles.infoLabel, { color: colors.textSoft }]}>
                  Included services
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {packageIncludedServiceNames || "Choose a package to see included services."}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.helper, { color: colors.textSoft }]}>
                Select one or more direct services for this order.
              </Text>
              <View style={styles.chipWrap}>
                {serviceOptions.map((service) => {
                  const active = selectedServiceIds.includes(service.id);

                  return (
                    <Pressable
                      key={service.id}
                      onPress={() => toggleService(service.id)}
                      style={[
                        styles.serviceChip,
                        {
                          backgroundColor: active ? colors.accent : colors.cardMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceChipLabel,
                          { color: active ? "#042321" : colors.text },
                        ]}
                      >
                        {service.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </Surface>

        <Surface style={styles.card}>
          <Text style={[styles.sectionEyebrow, { color: colors.textSoft }]}>Payment</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment</Text>
          <SegmentedControl
            options={paymentStatusOptions}
            value={paymentStatus}
            onChange={setPaymentStatus}
          />
          {paymentStatus === "partial_paid" ? (
            <TextField
              keyboardType="decimal-pad"
              label="Paid amount"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />
          ) : null}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardMuted }]}>
            <Text style={[styles.summaryLine, { color: colors.text }]}>
              State fee: {formatCurrency(stateFee)}
            </Text>
            <Text style={[styles.summaryLine, { color: colors.text }]}>
              Package: {formatCurrency(orderMode === "package" ? packagePrice : 0)}
            </Text>
            <Text style={[styles.summaryLine, { color: colors.text }]}>
              Services: {formatCurrency(serviceTotal)}
            </Text>
            <Text style={[styles.totalLine, { color: colors.text }]}>
              Total: {formatCurrency(totalAmount)}
            </Text>
          </View>
        </Surface>

        <Surface style={styles.card}>
          <View style={[styles.rowBetween, compact && styles.rowBetweenStack]}>
            <View style={styles.titleBlock}>
              <Text style={[styles.sectionEyebrow, { color: colors.textSoft }]}>
                Initial documents
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Initial documents</Text>
            </View>
            <Button
              label="Add row"
              tone="secondary"
              disabled={documentServiceOptions.length === 0 || submitting}
              onPress={addDocumentRow}
              style={compact ? styles.fullWidthButton : undefined}
            />
          </View>
          {initialDocuments.length === 0 ? (
            <Text style={[styles.helper, { color: colors.textSoft }]}>
              Optional. You can add multiple documents for the same service before creating the order.
            </Text>
          ) : null}
          {initialDocuments.map((row) => (
            <View key={row.id} style={[styles.documentRow, { backgroundColor: colors.cardMuted }]}>
              <PickerField
                label="Service"
                selectedValue={row.serviceId}
                options={[
                  { label: "Choose service", value: "" },
                  ...documentServiceOptions.map((item) => ({
                    label: item.name,
                    value: String(item.id),
                  })),
                ]}
                onValueChange={(value) =>
                  setInitialDocuments((current) =>
                    current.map((item) => (item.id === row.id ? { ...item, serviceId: value } : item)),
                  )
                }
              />
              <TextField
                label="Document name"
                value={row.documentName}
                onChangeText={(value) =>
                  setInitialDocuments((current) =>
                    current.map((item) => (item.id === row.id ? { ...item, documentName: value } : item)),
                  )
                }
              />
              <View style={[styles.rowBetween, compact && styles.rowBetweenStack]}>
                <Text style={[styles.helper, { color: colors.textSoft, flex: 1 }]}>
                  {row.uploadedFileName || "No file selected"}
                </Text>
                <View style={[styles.inlineActions, compact && styles.inlineActionsWrap]}>
                  <Button
                    label={row.isUploading ? "Uploading..." : "Choose file"}
                    tone="secondary"
                    disabled={row.isUploading}
                    onPress={() => void pickDocumentForRow(row.id)}
                    style={compact ? styles.inlineButton : undefined}
                  />
                  <Button
                    label="Remove"
                    tone="ghost"
                    onPress={() => removeDocumentRow(row.id)}
                    style={compact ? styles.inlineButton : undefined}
                  />
                </View>
              </View>
            </View>
          ))}
        </Surface>

        <Button label="Create order" loading={submitting} onPress={handleSubmit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  card: {
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  titleBlock: {
    gap: 3,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  rowFieldStack: {
    flex: 0,
  },
  rowStack: {
    flexDirection: "column",
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoPanel: {
    borderRadius: 8,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  serviceChipLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 8,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryLine: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalLine: {
    fontSize: 18,
    fontWeight: "800",
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowBetweenStack: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  documentRow: {
    borderRadius: 8,
    gap: 12,
    padding: 12,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineActionsWrap: {
    width: "100%",
  },
  inlineButton: {
    flexGrow: 1,
    minWidth: 132,
  },
  fullWidthButton: {
    alignSelf: "stretch",
  },
});
