const DEFAULT_API_HOST = "127.0.0.1";
const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT?.trim() || "5000";
const DEFAULT_API_BASE = `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}/api`;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveBrowserApiBase(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || DEFAULT_API_HOST;
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}/api`;
}

export function getApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const resolvedBase = configuredBase || resolveBrowserApiBase() || DEFAULT_API_BASE;
  return stripTrailingSlash(resolvedBase);
}

export function getApiOrigin(): string {
  return new URL(getApiBase()).origin;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiBody = FormData | Record<string, unknown> | undefined;
type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

export async function apiRequest<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: ApiBody } = {},
): Promise<T> {
  const apiBase = getApiBase();
  const requestOptions: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {},
  };

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      requestOptions.body = options.body;
    } else {
      requestOptions.headers = {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      };
      requestOptions.body = JSON.stringify(options.body);
    }
  } else if (options.headers) {
    requestOptions.headers = options.headers;
  }

  const response = await fetch(`${apiBase}${path}`, requestOptions);
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.ok !== true) {
    const message = payload?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload.data;
}
