import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import { CreateEnquiryInput, EnquiryPage, IEnquiry } from '../types';

declare const process: { env: Record<string, string | undefined> };

export interface EnquiryFilter {
  search?: string;
  date?: string;
  start?: string;
  end?: string;
  period?: 'today' | 'month' | 'year';
}

function normalizeBaseUrl(value: string): string {
  let clean = value.trim();
  if (!clean) throw new Error('Backend URL is required.');
  if (Platform.OS === 'web' && clean.startsWith('/')) {
    clean = `/${clean.replace(/^\/+|\/+$/g, '')}`;
    return /\/api\/v1$/i.test(clean) ? clean : `${clean}/api/v1`;
  }
  if (!/^https?:\/\//i.test(clean)) clean = `http://${clean}`;
  clean = clean.replace(/\/+$/, '');
  if (!/\/api\/v1$/i.test(clean)) clean += '/api/v1';
  const parsed = new URL(clean);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Enter a valid HTTP or HTTPS backend URL.');
  return clean;
}

function hostFromUri(uri?: string): string | null {
  if (!uri) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(uri) ? uri : `http://${uri}`);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (Platform.OS === 'web') return '/api/v1';

  const expoHost = hostFromUri(
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
  );
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:5000/api/v1`;
  }

  const scriptHost = hostFromUri(NativeModules.SourceCode?.scriptURL);
  if (scriptHost && scriptHost !== 'localhost' && scriptHost !== '127.0.0.1') {
    return `http://${scriptHost}:5000/api/v1`;
  }
  return `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:5000/api/v1`;
}

const baseUrl = getBaseUrl();
const apiKey = (process.env.EXPO_PUBLIC_API_KEY || '').trim();
let accessToken = '';

function requestOptions(timeout: number) {
  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return { timeout, headers: Object.keys(headers).length > 0 ? headers : undefined };
}

function apiError(error: unknown): Error {
  const axiosError = error as AxiosError<{ message?: string; errors?: string[] }>;
  if (axiosError.response?.status === 401) {
    return new Error(axiosError.response.data?.message || 'Your login session is missing or has expired.');
  }
  if (axiosError.response?.status === 409) {
    return new Error(axiosError.response.data?.message || 'This record changed on another device. Refresh and try again.');
  }
  const serverMessage = axiosError.response?.data?.message;
  const validationMessage = axiosError.response?.data?.errors?.join('\n');
  if (validationMessage || serverMessage) return new Error(validationMessage || serverMessage);
  if (axiosError.code === 'ECONNABORTED') return new Error('The server took too long to respond. Check the connection and try again.');
  if (axiosError.isAxiosError) return new Error('Cannot reach the office server. Check the network and try again.');
  return error instanceof Error ? error : new Error('Unexpected server error.');
}

function assertData<T>(responseData: { success?: boolean; data?: T }, fallbackMessage: string): T {
  if (responseData?.success && responseData.data !== undefined) return responseData.data;
  throw new Error(fallbackMessage);
}

async function readWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const retryable = axiosError.isAxiosError && (!axiosError.response || status === 502 || status === 503 || status === 504);
    if (!retryable) throw error;
    await new Promise((resolve) => setTimeout(resolve, 350));
    return operation();
  }
}

export const apiClient = {
  getBaseUrl: (): string => baseUrl,

  setAccessToken(token: string | null): void {
    accessToken = token?.trim() || '';
  },

  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    try {
      const response = await axios.post(
        `${baseUrl}/auth/login`,
        { username, password },
        { timeout: 10000 },
      );
      return assertData<{ token: string; username: string }>(response.data, 'The server did not return a login session.');
    } catch (error) {
      throw apiError(error);
    }
  },

  async validateSession(): Promise<{ username: string }> {
    try {
      const response = await axios.get(`${baseUrl}/auth/session`, requestOptions(8000));
      return assertData<{ username: string }>(response.data, 'The server did not confirm the login session.');
    } catch (error) {
      throw apiError(error);
    }
  },

  async getEnquiryPage(
    filter: EnquiryFilter = {},
    page = 1,
    pageSize = 10,
  ): Promise<EnquiryPage> {
    try {
      const response = await readWithRetry(() => axios.get(`${baseUrl}/enquiries`, {
        ...requestOptions(8000),
        params: { ...filter, page, pageSize },
      }));
      const items = assertData<IEnquiry[]>(response.data, 'The server returned an invalid enquiry list.');
      const pagination = response.data?.pagination;
      if (!pagination || typeof pagination.total !== 'number') {
        throw new Error('The server returned invalid pagination information.');
      }
      return { items, ...pagination } as EnquiryPage;
    } catch (error) {
      throw apiError(error);
    }
  },

  async getEnquiries(filter: EnquiryFilter = {}): Promise<IEnquiry[]> {
    const page = await this.getEnquiryPage(filter, 1, 200);
    return page.items;
  },

  async getEnquiryById(id: string): Promise<IEnquiry | null> {
    try {
      const response = await readWithRetry(() => axios.get(`${baseUrl}/enquiries/${encodeURIComponent(id)}`, requestOptions(8000)));
      return assertData<IEnquiry>(response.data, 'The server returned an invalid enquiry.');
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) return null;
      throw apiError(error);
    }
  },

  async createEnquiry(input: CreateEnquiryInput): Promise<IEnquiry> {
    try {
      const response = await axios.post(`${baseUrl}/enquiries`, input, requestOptions(10000));
      return assertData<IEnquiry>(response.data, 'The server did not confirm that the client was saved.');
    } catch (error) {
      throw apiError(error);
    }
  },

  getCsvDownloadRequest(filter: EnquiryFilter = {}): { url: string; headers?: Record<string, string> } {
    const query = Object.entries(filter)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return {
      url: `${baseUrl}/enquiries/export/csv${query ? `?${query}` : ''}`,
      headers: requestOptions(30000).headers,
    };
  },

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await readWithRetry(() => axios.get(`${baseUrl}/stats/today`, requestOptions(8000)));
      return response.status === 200 && response.data?.success
        ? { ok: true, message: 'The office server and database are reachable.' }
        : { ok: false, message: 'The server returned an unexpected response.' };
    } catch (error) {
      return { ok: false, message: apiError(error).message };
    }
  },
};
