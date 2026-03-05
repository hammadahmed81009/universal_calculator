import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { parseApiError } from './api/errors';

export type Params = Record<string, string | number | boolean | undefined | null>;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: false,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize errors for consistent handling in React Query and UI.
    throw parseApiError(error);
  }
);

export async function apiGet<T = unknown>(
  url: string,
  config?: AxiosRequestConfig & { params?: Params }
): Promise<T> {
  const res = await apiClient.get<T>(url, config);
  return res.data;
}

export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.post<T>(url, data, config);
  return res.data;
}

export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.put<T>(url, data, config);
  return res.data;
}

export { apiClient };
