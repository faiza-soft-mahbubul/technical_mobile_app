export const LOGIN_MUTATION = `
  mutation LoginDashboard($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      userId
    }
  }
`;

export const REFRESH_SESSION_MUTATION = `
  mutation RefreshDashboardSession($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
      userId
    }
  }
`;

export const LOGOUT_SESSION_MUTATION = `
  mutation LogoutDashboardSession($input: RefreshTokenInput!) {
    logout(input: $input)
  }
`;

export const DASHBOARD_PROFILE_QUERY = `
  query DashboardProfile($userId: ID!) {
    profile(userId: $userId) {
      id
      email
      firstName
      lastName
      phone
      address
      role
      status
      isDeleted
    }
  }
`;

export const OVERVIEW_STATS_QUERY = `
  query OverviewStats($input: OverviewStatsInput) {
    overviewStats(input: $input) {
      totalCompanies
      pendingOrders
      processingOrders
      completedOrders
    }
  }
`;

export const OVERVIEW_ORDERS_BY_MONTH_QUERY = `
  query OverviewOrdersByMonth($input: OverviewOrdersByMonthInput!) {
    overviewOrdersByMonth(input: $input) {
      availableYears
      selectedYear
      selectedMonth
      items {
        month
        monthLabel
        count
      }
    }
  }
`;

export const OVERVIEW_PACKAGE_DISTRIBUTION_QUERY = `
  query OverviewPackageDistribution($input: OverviewPackageDistributionInput!) {
    overviewPackageDistribution(input: $input) {
      availableYears
      selectedYear
      selectedMonth
      totalOrders
      items {
        label
        count
      }
    }
  }
`;

export const DASHBOARD_ORDERS_QUERY = `
  query DashboardOrders($input: OrdersPageInput) {
    ordersPage(input: $input) {
      items {
        id
        companyId
        companyInfo {
          name
          user {
            firstName
            lastName
            email
            phone
          }
          state {
            name
          }
        }
        price
        status
        createdAt
        llcSubmittedAt
        llcReceivedAt
        boiSubmittedAt
        boiReceivedAt
        itinSubmittedAt
        itinReceivedAt
        einSubmittedAt
        einReceivedAt
        orderServices {
          service {
            name
          }
        }
        orderPackages {
          package {
            name
            packageServices {
              service {
                name
              }
            }
          }
        }
      }
      totalCount
      page
      pageSize
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const STATUS_BOARD_ORDERS_QUERY = `
  query StatusBoardOrders($input: StatusBoardOrdersInput) {
    statusBoardOrders(input: $input) {
      items {
        id
        status
        createdAt
        updatedAt
        companyInfo {
          name
        }
        serviceDocuments {
          id
          description
          attachment
          documentType
          createdAt
          uploadedBy
          uploadedByUser {
            firstName
            lastName
            email
          }
          documentNotes {
            id
            message
            createdAt
            notedBy
            notedByUser {
              firstName
              lastName
              email
            }
          }
        }
        orderServices {
          service {
            id
            name
            serviceCategoryMappings {
              serviceCategoryId
              serviceCategory {
                id
                name
              }
            }
          }
        }
        orderPackages {
          package {
            id
            name
            packageServices {
              service {
                id
                name
                serviceCategoryMappings {
                  serviceCategoryId
                  serviceCategory {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
      totalCount
      page
      pageSize
      totalPages
      hasNextPage
      hasPreviousPage
      statusCounts {
        status
        count
      }
      categoryCounts {
        serviceCategoryId
        name
        count
      }
    }
  }
`;

export const COMPANY_ACCOUNTS_QUERY = `
  query CompanyAccounts($input: CompanyAccountsInput) {
    companyAccounts(input: $input) {
      items {
        id
        companyName
        ownerName
        email
        phone
        country
        createdAt
        updatedAt
        totalServicesCount
        pendingServicesCount
        processingServicesCount
        completedServicesCount
        totalOrdersCount
        pendingOrdersCount
        processingOrdersCount
        completedOrdersCount
        services {
          id
          serviceName
          status
          submitDate
        }
        payments {
          id
          referenceLabel
          description
          totalAmount
          paidAmount
          dueAmount
          currency
          status
          latestPaymentMethod
          latestTransactionStatus
          latestActivityAt
          transactionCount
          transactions {
            id
            transactionId
            amount
            currency
            paymentMethod
            status
            createdAt
          }
        }
        documents {
          id
          description
          attachment
          documentType
          orderId
          createdAt
          uploadedByName
          note
        }
      }
      totalCount
      page
      pageSize
      totalPages
      hasNextPage
      hasPreviousPage
      availableCountries
    }
  }
`;

export const RECENT_ACTIVITIES_QUERY = `
  query RecentActivities($input: RecentActivitiesInput) {
    recentActivities(input: $input) {
      items {
        id
        activityType
        title
        description
        laneLabel
        companyName
        orderNumber
        occurredAt
        chips
      }
      totalCount
      page
      pageSize
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const ADD_ORDER_FORM_DATA_QUERY = `
  query AddOrderFormData {
    companies {
      id
      name
      hasPackageOrder
      orderedPackageIds
      orderedServiceIds
      stateId
      state {
        id
        name
        countryId
        country {
          id
          name
        }
      }
      companyTypeId
      companyType {
        id
        name
      }
      serviceTypeId
      serviceType {
        id
        name
      }
      userId
      user {
        id
        firstName
        lastName
        email
        phone
        address
      }
    }
    companyTypes {
      id
      name
      isActive
    }
    companyServiceTypes {
      id
      name
      isActive
    }
    countries {
      id
      name
      isActive
      states {
        id
        name
        fee
        countryId
        isActive
      }
    }
    packages {
      id
      name
      countryId
      currentPrice
      isActive
      packageServices {
        serviceId
        service {
          id
          name
        }
      }
    }
    services {
      id
      name
      countryId
      currentPrice
      isActive
      isAddOn
    }
  }
`;

export const CREATE_USER_MUTATION = `
  mutation AdminCreateDashboardUser($input: AdminCreateUserInput!) {
    adminCreateUser(input: $input) {
      id
      email
      firstName
      lastName
      phone
      address
      role
      status
    }
  }
`;

export const CREATE_COMPANY_MUTATION = `
  mutation CreateDashboardCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      stateId
      companyTypeId
      serviceTypeId
      userId
    }
  }
`;

export const CREATE_ORDER_MUTATION = `
  mutation CreateDashboardOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      companyId
      price
      status
      startDate
      endDate
      orderServices {
        serviceId
      }
      orderPackages {
        packageId
      }
    }
  }
`;

export const CREATE_PAYMENT_MUTATION = `
  mutation CreateDashboardPayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      amount
      currency
      paymentMethod
      status
      transactionId
    }
  }
`;

export const SUBMIT_ORDER_DOCUMENTS_MUTATION = `
  mutation SubmitOrderDocuments($input: SubmitOrderDocumentsInput!) {
    submitOrderDocuments(input: $input) {
      orderId
      orderStatus
      submittedDocumentCount
      submittedServiceCount
      createdServiceDocumentCount
      createdDocumentNoteCount
    }
  }
`;
