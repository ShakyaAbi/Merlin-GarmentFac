import { CurrentUser } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
const tokenKey = "merlin_token";

export const getToken = () => localStorage.getItem(tokenKey);
export const setToken = (token: string) => localStorage.setItem(tokenKey, token);
export const clearToken = () => localStorage.removeItem(tokenKey);

type RequestOptions = {
  method?: string;
  body?: any;
};

export class ApiError extends Error {
  constructor(public message: string, public status: number, public details?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export const request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData = options.body instanceof FormData;
  if (isFormData) {
    delete headers["Content-Type"];
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
    });
  } catch (error) {
    throw new ApiError(
      `Unable to reach the API server at ${API_BASE}. Make sure the backend is running.`,
      0,
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }

  if (!res.ok) {
    if (res.status === 401) {
      if (path === "/auth/me") {
        clearToken();
        window.location.hash = "/";
      }
    } else if (res.status === 404 && path === "/auth/me") {
      clearToken();
      window.location.hash = "/";
    }

    const data = await res.json().catch(() => ({}));
    const message = data?.error?.message || res.statusText;
    throw new ApiError(message, res.status, data?.error?.details);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
};
