import type { OrderStatus, OrdersPageItem, StatusBoardOrder } from "@/api/types";
import { uniqueValues } from "./format";

export function getStatusTone(status: OrderStatus) {
  if (status === "PROCESSING") {
    return "processing" as const;
  }

  if (status === "COMPLETED" || status === "REFUNDED") {
    return "completed" as const;
  }

  return "pending" as const;
}

export function collectOrderServiceNames(order: OrdersPageItem | StatusBoardOrder) {
  return uniqueValues(order.orderServices?.map((item) => item?.service?.name ?? null) ?? []);
}

export function collectOrderPackageNames(order: OrdersPageItem | StatusBoardOrder) {
  return uniqueValues(order.orderPackages?.map((item) => item?.package?.name ?? null) ?? []);
}

export function buildOrderSummary(order: OrdersPageItem | StatusBoardOrder) {
  const packageNames = collectOrderPackageNames(order);
  const serviceNames = collectOrderServiceNames(order);

  return {
    packageLabel: packageNames.length ? packageNames.join(", ") : "Single services",
    serviceLabel: serviceNames.length
      ? serviceNames.join(", ")
      : packageNames.length
        ? "No extra services"
        : "No services",
  };
}

export function collectOrderCategoryTags(order: StatusBoardOrder) {
  const directCategories =
    order.orderServices?.flatMap(
      (item) =>
        item?.service?.serviceCategoryMappings?.map(
          (mapping) => mapping?.serviceCategory?.name ?? null,
        ) ?? [],
    ) ?? [];
  const packageCategories =
    order.orderPackages?.flatMap(
      (item) =>
        item?.package?.packageServices?.flatMap(
          (service) =>
            service?.service?.serviceCategoryMappings?.map(
              (mapping) => mapping?.serviceCategory?.name ?? null,
            ) ?? [],
        ) ?? [],
    ) ?? [];

  return uniqueValues([...directCategories, ...packageCategories]);
}
