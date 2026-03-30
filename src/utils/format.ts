import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RecentActivityType,
  ServiceDocumentType,
} from "@/api/types";

export function formatCurrency(value?: string | number | null, currency = "USD") {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "");

  if (!Number.isFinite(numericValue)) {
    return `${currency} ${value ?? "-"}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency} ${numericValue.toFixed(2)}`;
  }
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const diffInMs = Date.now() - parsed.getTime();
  const diffInMinutes = Math.max(1, Math.floor(diffInMs / 60000));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function formatEnumLabel(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatOrderStatusLabel(status: OrderStatus) {
  return formatEnumLabel(status);
}

export function formatPaymentMethod(method?: PaymentMethod | null) {
  return formatEnumLabel(method);
}

export function formatPaymentStatus(status?: PaymentStatus | null) {
  return formatEnumLabel(status);
}

export function formatDocumentTypeLabel(type: ServiceDocumentType) {
  return type === "SUBMITTED" ? "Submitted" : "Received";
}

export function formatActivityTypeLabel(type: RecentActivityType | "ALL") {
  if (type === "ALL") {
    return "All";
  }

  return formatEnumLabel(type);
}

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

export function buildTemporaryPassword() {
  return `Mas#${Date.now()}Aa1!`;
}

export function buildManualTransactionId(orderId: number) {
  return `MANUAL-ORDER-${orderId}-${Date.now()}`;
}

export function buildOrderDates() {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

export function parseMoney(value?: string | null) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim() ?? "").filter(Boolean)),
  );
}
