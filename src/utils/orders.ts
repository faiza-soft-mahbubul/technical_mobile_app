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
  const directNames =
    order.orderServices?.map((item) => item?.service?.name ?? null) ?? [];
  const packageNames =
    order.orderPackages?.flatMap(
      (item) => item?.package?.packageServices?.map((service) => service?.service?.name ?? null) ?? [],
    ) ?? [];

  return uniqueValues([...directNames, ...packageNames]);
}

export function collectOrderPackageNames(order: OrdersPageItem | StatusBoardOrder) {
  return uniqueValues(order.orderPackages?.map((item) => item?.package?.name ?? null) ?? []);
}

export function buildOrderSummary(order: OrdersPageItem | StatusBoardOrder) {
  const packageNames = collectOrderPackageNames(order);
  const serviceNames = collectOrderServiceNames(order);

  return {
    packageLabel: packageNames.length ? packageNames.join(", ") : "Single services",
    serviceLabel: serviceNames.length ? serviceNames.join(", ") : "No services",
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
