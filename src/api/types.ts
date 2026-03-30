export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REFUNDED";
export type ServiceDocumentType = "SUBMITTED" | "RECEIVED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "PARTIALLY_PAID" | "REFUNDED";
export type PaymentMethod =
  | "MAIN_BALANCE"
  | "PAYPAL"
  | "STRIPE"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "WISE"
  | "PAYONEER";
export type OverviewRange = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "LAST_MONTH";
export type RecentActivityType = "COMPANY" | "DOCUMENT" | "ORDER" | "PAYMENT" | "STATUS";

export type GraphqlError = {
  message?: string;
  extensions?: {
    code?: string;
    originalError?: {
      message?: string | string[];
    };
  };
};

export type GraphqlResponse<TData> = {
  data?: TData;
  errors?: GraphqlError[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export type DashboardUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string | null;
  role: string;
  status?: string | null;
};

export type OverviewStats = {
  totalCompanies: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
};

export type MonthlyOrderPoint = {
  month: number;
  monthLabel: string;
  count: number;
};

export type PackageDistributionPoint = {
  label: string;
  count: number;
};

export type RecentActivityItem = {
  id: string;
  activityType: RecentActivityType;
  title: string;
  description: string;
  laneLabel: string;
  companyName: string;
  orderNumber?: string | null;
  occurredAt: string;
  chips: string[];
};

export type OrdersPageItem = {
  id: number;
  companyId: number;
  price: string;
  status: OrderStatus;
  createdAt: string;
  llcSubmittedAt?: string | null;
  llcReceivedAt?: string | null;
  boiSubmittedAt?: string | null;
  boiReceivedAt?: string | null;
  itinSubmittedAt?: string | null;
  itinReceivedAt?: string | null;
  einSubmittedAt?: string | null;
  einReceivedAt?: string | null;
  companyInfo?: {
    name: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    } | null;
    state?: {
      name: string;
    } | null;
  } | null;
  orderServices?: Array<{
    service?: {
      name: string;
    } | null;
  } | null> | null;
  orderPackages?: Array<{
    package?: {
      name: string;
      packageServices?: Array<{
        service?: {
          name: string;
        } | null;
      } | null> | null;
    } | null;
  } | null> | null;
};

export type StatusBoardDocument = {
  id: number;
  description: string;
  attachment: string;
  documentType: ServiceDocumentType;
  createdAt: string;
  uploadedBy: string;
  uploadedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  documentNotes?: Array<{
    id: number;
    message: string;
    createdAt: string;
    notedBy: string;
    notedByUser?: {
      firstName: string;
      lastName: string;
      email: string;
    } | null;
  } | null> | null;
};

export type StatusBoardOrder = {
  id: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  companyInfo?: {
    name: string;
  } | null;
  serviceDocuments?: Array<StatusBoardDocument | null> | null;
  orderServices?: Array<{
    service?: {
      id: number;
      name: string;
      serviceCategoryMappings?: Array<{
        serviceCategoryId: number;
        serviceCategory?: {
          id: number;
          name: string;
        } | null;
      } | null> | null;
    } | null;
  } | null> | null;
  orderPackages?: Array<{
    package?: {
      id: number;
      name: string;
      packageServices?: Array<{
        service?: {
          id: number;
          name: string;
          serviceCategoryMappings?: Array<{
            serviceCategoryId: number;
            serviceCategory?: {
              id: number;
              name: string;
            } | null;
          } | null> | null;
        } | null;
      } | null> | null;
    } | null;
  } | null> | null;
};

export type CompanyAccount = {
  id: number;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  totalServicesCount: number;
  pendingServicesCount: number;
  processingServicesCount: number;
  completedServicesCount: number;
  totalOrdersCount: number;
  pendingOrdersCount: number;
  processingOrdersCount: number;
  completedOrdersCount: number;
  services: Array<{
    id: string;
    serviceName: string;
    status: OrderStatus;
    submitDate: string;
  }>;
  payments: Array<{
    id: string;
    referenceLabel: string;
    description: string;
    totalAmount: string;
    paidAmount: string;
    dueAmount: string;
    currency: string;
    status: string;
    latestPaymentMethod?: PaymentMethod | null;
    latestTransactionStatus?: PaymentStatus | null;
    latestActivityAt: string;
    transactionCount: number;
    transactions: Array<{
      id: number;
      transactionId: string;
      amount: string;
      currency: string;
      paymentMethod: PaymentMethod;
      status: PaymentStatus;
      createdAt: string;
    }>;
  }>;
  documents: Array<{
    id: number;
    description: string;
    attachment: string;
    documentType: ServiceDocumentType;
    orderId: number;
    createdAt: string;
    uploadedByName: string;
    note?: string | null;
  }>;
};

export type AddOrderFormData = {
  companies: Array<{
    id: number;
    name: string;
    hasPackageOrder: boolean;
    orderedPackageIds: number[];
    orderedServiceIds: number[];
    stateId: number;
    companyTypeId: number;
    serviceTypeId: number;
    userId: string;
    state?: {
      id: number;
      name: string;
      countryId: number;
      country: {
        id: number;
        name: string;
      };
    } | null;
    companyType?: {
      id: number;
      name: string;
    } | null;
    serviceType?: {
      id: number;
      name: string;
    } | null;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address?: string | null;
    } | null;
  }>;
  companyTypes: Array<{
    id: number;
    name: string;
    isActive: boolean;
  }>;
  companyServiceTypes: Array<{
    id: number;
    name: string;
    isActive: boolean;
  }>;
  countries: Array<{
    id: number;
    name: string;
    isActive: boolean;
    states?: Array<{
      id: number;
      name: string;
      fee: string;
      countryId: number;
      isActive: boolean;
    } | null> | null;
  }>;
  packages: Array<{
    id: number;
    name: string;
    countryId: number;
    currentPrice: string;
    isActive: boolean;
    packageServices?: Array<{
      serviceId: number;
      service?: {
        id: number;
        name: string;
      } | null;
    } | null> | null;
  }>;
  services: Array<{
    id: number;
    name: string;
    countryId: number;
    currentPrice?: string | null;
    isActive: boolean;
    isAddOn: boolean;
  }>;
};

export type CloudinarySignaturePayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  overwrite: string;
  uniqueFilename: string;
  useFilename: string;
  uploadPreset: string | null;
  uploadUrl: string;
};

export type UploadedFilePayload = {
  secureUrl: string;
  originalFileName: string;
};
