import type {
  AuthResponse,
  LoginPayload,
  SessionResponse,
  SignupPayload,
} from "@/types/auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

type RequestOptions = RequestInit & { skipJson?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipJson, ...init } = options;
  const headers = new Headers(init.headers ?? {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach authentication service";
    throw new ApiError(message, 0);
  }

  if (skipJson) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function extractErrorMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") {
    return data.trim() || null;
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") {
      return record.detail;
    }
    if (Array.isArray(record.detail)) {
      const first = record.detail[0] as Record<string, unknown> | string;
      if (typeof first === "string") {
        return first;
      }
      if (first && typeof first === "object" && typeof first.msg === "string") {
        return first.msg;
      }
    }
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.error === "string") {
      return record.error;
    }
  }
  return null;
}

export function signup(payload: SignupPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSession(accessToken: string): Promise<SessionResponse> {
  return request<SessionResponse>("/auth/session", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
