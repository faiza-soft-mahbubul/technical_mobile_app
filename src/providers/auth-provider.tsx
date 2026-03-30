import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";
import {
  DASHBOARD_PROFILE_QUERY,
  LOGIN_MUTATION,
  LOGOUT_SESSION_MUTATION,
  REFRESH_SESSION_MUTATION,
} from "@/api/documents";
import {
  executeGraphqlRequest,
  GraphqlRequestError,
  hasValidSession,
  isUnauthenticatedError,
} from "@/api/graphql";
import type { AuthSession, DashboardUser } from "@/api/types";
import { useAppConfig } from "@/providers/app-config-provider";

const SESSION_STORAGE_KEY = "mas_mobile_session";

type AuthContextValue = {
  executeAuthenticated: <TData, TVariables>(
    query: string,
    variables?: TVariables,
  ) => Promise<TData>;
  isBootstrapping: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  session: AuthSession | null;
  user: DashboardUser | null;
};

type ProfileResponse = {
  profile: DashboardUser & {
    isDeleted: boolean;
  };
};

type LoginResponse = {
  login: AuthSession;
};

type RefreshResponse = {
  refreshToken: AuthSession;
};

type LogoutResponse = {
  logout: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function canUseSecureStore() {
  return Platform.OS !== "web";
}

async function getSessionStorageValue(key: string) {
  if (!canUseSecureStore()) {
    return AsyncStorage.getItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function setSessionStorageValue(key: string, value: string) {
  if (!canUseSecureStore()) {
    await AsyncStorage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function removeSessionStorageValue(key: string) {
  if (!canUseSecureStore()) {
    await AsyncStorage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

async function readStoredSession() {
  const rawValue = await getSessionStorageValue(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as AuthSession;
    return hasValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeStoredSession(session: AuthSession | null) {
  if (!session) {
    await removeSessionStorageValue(SESSION_STORAGE_KEY);
    return;
  }

  await setSessionStorageValue(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { config } = useAppConfig();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const fetchProfile = useCallback(
    async (nextSession: AuthSession) => {
      const data = await executeGraphqlRequest<ProfileResponse, { userId: string }>({
        endpoint: config.graphqlApiUrl,
        proxyBaseUrl: config.webAppUrl,
        query: DASHBOARD_PROFILE_QUERY,
        variables: { userId: nextSession.userId },
        accessToken: nextSession.accessToken,
      });

      if (!data.profile || data.profile.isDeleted) {
        throw new GraphqlRequestError("Dashboard profile is unavailable.");
      }

      setUser({
        id: data.profile.id,
        email: data.profile.email,
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        phone: data.profile.phone,
        address: data.profile.address,
        role: data.profile.role,
        status: data.profile.status,
      });
    },
    [config.graphqlApiUrl, config.webAppUrl],
  );

  const applySession = useCallback(
    async (nextSession: AuthSession | null) => {
      setSession(nextSession);
      await writeStoredSession(nextSession);

      if (!nextSession) {
        setUser(null);
        return;
      }

      await fetchProfile(nextSession);
    },
    [fetchProfile],
  );

  useEffect(() => {
    let isMounted = true;

    readStoredSession()
      .then(async (storedSession) => {
        if (!isMounted || !storedSession || !config.graphqlApiUrl.trim()) {
          return;
        }

        try {
          await applySession(storedSession);
        } catch {
          await applySession(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [applySession, config.graphqlApiUrl]);

  const refreshSession = useCallback(async () => {
    if (!session) {
      throw new GraphqlRequestError("No session available.");
    }

    const data = await executeGraphqlRequest<RefreshResponse, { input: { refreshToken: string } }>({
      endpoint: config.graphqlApiUrl,
      proxyBaseUrl: config.webAppUrl,
      query: REFRESH_SESSION_MUTATION,
      variables: {
        input: {
          refreshToken: session.refreshToken,
        },
      },
    });

    const refreshedSession = data.refreshToken;
    await applySession(refreshedSession);
    return refreshedSession;
  }, [applySession, config.graphqlApiUrl, config.webAppUrl, session]);

  const executeAuthenticated = useCallback(
    async <TData, TVariables,>(query: string, variables?: TVariables) => {
      if (!session) {
        throw new GraphqlRequestError("Please sign in to continue.");
      }

      try {
        return await executeGraphqlRequest<TData, TVariables>({
          endpoint: config.graphqlApiUrl,
          proxyBaseUrl: config.webAppUrl,
          query,
          variables,
          accessToken: session.accessToken,
        });
      } catch (error) {
        if (!isUnauthenticatedError(error)) {
          throw error;
        }

        const refreshedSession = await refreshSession();
        return executeGraphqlRequest<TData, TVariables>({
          endpoint: config.graphqlApiUrl,
          proxyBaseUrl: config.webAppUrl,
          query,
          variables,
          accessToken: refreshedSession.accessToken,
        });
      }
    },
    [config.graphqlApiUrl, config.webAppUrl, refreshSession, session],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await executeGraphqlRequest<LoginResponse, { input: { email: string; password: string } }>({
        endpoint: config.graphqlApiUrl,
        proxyBaseUrl: config.webAppUrl,
        query: LOGIN_MUTATION,
        variables: {
          input: {
            email: email.trim().toLowerCase(),
            password,
          },
        },
      });

      await applySession(data.login);
    },
    [applySession, config.graphqlApiUrl, config.webAppUrl],
  );

  const logout = useCallback(async () => {
    if (session) {
      try {
        await executeGraphqlRequest<LogoutResponse, { input: { refreshToken: string } }>({
          endpoint: config.graphqlApiUrl,
          proxyBaseUrl: config.webAppUrl,
          query: LOGOUT_SESSION_MUTATION,
          variables: {
            input: {
              refreshToken: session.refreshToken,
            },
          },
        });
      } catch {
        // Ignore logout failures and clear locally.
      }
    }

    await applySession(null);
  }, [applySession, config.graphqlApiUrl, config.webAppUrl, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      executeAuthenticated,
      isBootstrapping,
      isSignedIn: Boolean(session && user),
      login,
      logout,
      session,
      user,
    }),
    [executeAuthenticated, isBootstrapping, login, logout, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
