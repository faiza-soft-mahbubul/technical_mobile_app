import type { AuthSession, GraphqlResponse } from "./types";

export class GraphqlRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

function getErrorDetails(response: GraphqlResponse<unknown>) {
  const firstError = response.errors?.[0];

  if (!firstError) {
    return {
      code: undefined,
      message: "Request failed.",
      details: [] as string[],
    };
  }

  const rawMessage = firstError.extensions?.originalError?.message;
  const details = Array.isArray(rawMessage)
    ? rawMessage
    : rawMessage
      ? [rawMessage]
      : [];

  return {
    code: firstError.extensions?.code,
    message: details[0] || firstError.message || "Request failed.",
    details,
  };
}

const REQUEST_TIMEOUT_MS = 15_000;

function ensureBaseUrl(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return value.trim().replace(/\/$/, "");
}

function resolveRequestEndpoint(options: {
  endpoint: string;
  proxyBaseUrl?: string;
}) {
  const endpoint = ensureBaseUrl(options.endpoint) ?? options.endpoint;
  const proxyBaseUrl = ensureBaseUrl(options.proxyBaseUrl);

  return endpoint || (proxyBaseUrl ? `${proxyBaseUrl}/api/graphql` : endpoint);
}

export async function executeGraphqlRequest<TData, TVariables>(options: {
  endpoint: string;
  query: string;
  variables?: TVariables;
  accessToken?: string;
  proxyBaseUrl?: string;
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const targetEndpoint = resolveRequestEndpoint(options);

  try {
    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.accessToken
          ? {
              authorization: `Bearer ${options.accessToken}`,
            }
          : {}),
      },
      body: JSON.stringify({
        query: options.query,
        variables: options.variables ?? {},
      }),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    const payload = rawBody
      ? (JSON.parse(rawBody) as GraphqlResponse<TData>)
      : undefined;

    if (payload?.errors?.length) {
      const error = getErrorDetails(payload);
      throw new GraphqlRequestError(error.message, error.code, error.details);
    }

    if (!response.ok || !payload?.data) {
      throw new GraphqlRequestError(
        payload?.errors?.[0]?.message ||
          (response.status >= 500
            ? "The server is temporarily unavailable. Please try again."
            : "Server request failed."),
      );
    }

    return payload.data;
  } catch (error) {
    if (error instanceof GraphqlRequestError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new GraphqlRequestError("The server returned an invalid response.");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GraphqlRequestError(
        "The request timed out. Please check the connection and try again.",
      );
    }

    throw new GraphqlRequestError(
      error instanceof Error
        ? error.message || "Unable to reach the server."
        : "Unable to reach the server.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isUnauthenticatedError(error: unknown) {
  return (
    error instanceof GraphqlRequestError &&
    (error.code === "UNAUTHENTICATED" ||
      error.message.toLowerCase().includes("unauthenticated"))
  );
}

export function hasValidSession(session: AuthSession | null): session is AuthSession {
  return Boolean(
    session?.accessToken.trim() &&
      session.refreshToken.trim() &&
      session.userId.trim(),
  );
}
