import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_URL = "/api";
const STORAGE_KEY = "censo:accessToken";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    try { localStorage.setItem(STORAGE_KEY, token); } catch { /* no-op */ }
  } else {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
  }
}

export function getAccessToken() {
  return accessToken;
}

export function restoreAccessToken(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      accessToken = saved;
      return saved;
    }
  } catch { /* no-op */ }
  return null;
}

let accessToken: string | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, null, { withCredentials: true });
    const token = data.accessToken as string;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined;

    // No reintentar si el error viene del propio refresh o login
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }
    if (originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;
      refreshing ??= refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (!newToken) {
        return Promise.reject(error);
      }
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);
