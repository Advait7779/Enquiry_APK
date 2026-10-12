import { FeeSummary, FeeTransaction, ILawyer, NotificationJob, NotificationSettings } from './types';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const API_BASE = configuredBase
  ? (/\/api\/v1$/i.test(configuredBase) ? configuredBase : `${configuredBase}/api/v1`)
  : '/api/v1';
const TOKEN_KEY = 'advocate_admin_token';
const USER_KEY = 'advocate_admin_user';

export interface LedgerFilters {
  period?: 'today' | 'yesterday' | 'month' | 'year';
  from?: string;
  to?: string;
  lawyerId?: string;
  purpose?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: LedgerFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function readJson(res: Response): Promise<any> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON proxy errors are handled by the status below.
  }
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('admin-auth-expired'));
  }
  if (!res.ok) {
    const validationErrors = Array.isArray(data?.errors)
      ? data.errors.filter((error: unknown): error is string => typeof error === 'string').join('; ')
      : '';
    throw new Error(data?.message || validationErrors || `Request failed with HTTP ${res.status}`);
  }
  return data;
}

export const adminApi = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string, username: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getUsername(): string {
    return localStorage.getItem(USER_KEY) || 'Administrator';
  },

  headers(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },

  async login(password: string, username: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await readJson(res);
    if (!data?.success || !data?.data?.token) throw new Error('The server did not return a login session.');
    if (data.data.role !== 'admin') throw new Error('This portal is restricted to the chamber administrator.');
    this.setToken(data.data.token, data.data.username || username);
    return true;
  },

  async validateSession(): Promise<boolean> {
    if (!this.getToken()) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/session`, { headers: this.headers() });
      const data = await readJson(res);
      if (data?.data?.role !== 'admin') {
        this.clearToken();
        return false;
      }
      return true;
    } catch {
      this.clearToken();
      return false;
    }
  },

  async getFeesSummary(period?: string, lawyerId?: string): Promise<FeeSummary> {
    const query = buildQuery({ period: period as LedgerFilters['period'], lawyerId });
    const data = await readJson(await fetch(`${API_BASE}/admin/fees/summary${query}`, { headers: this.headers() }));
    return data.data;
  },

  async getFeesLedger(filters: LedgerFilters): Promise<{
    items: FeeTransaction[];
    total: number;
    totalFees: number;
    page: number;
    totalPages: number;
  }> {
    const data = await readJson(await fetch(`${API_BASE}/admin/fees/ledger${buildQuery(filters)}`, { headers: this.headers() }));
    return {
      items: data.data || [],
      total: data.pagination?.total || 0,
      totalFees: data.totalFees || 0,
      page: data.pagination?.page || 1,
      totalPages: data.pagination?.totalPages || 1,
    };
  },

  async getLawyers(): Promise<ILawyer[]> {
    const data = await readJson(await fetch(`${API_BASE}/lawyers`, { headers: this.headers() }));
    return data.data || [];
  },

  async createLawyer(lawyer: {
    name: string;
    username: string;
    password: string;
    phone?: string;
    email?: string;
    assignedTasks: string[];
    isActive?: boolean;
  }): Promise<ILawyer> {
    const data = await readJson(await fetch(`${API_BASE}/lawyers`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(lawyer),
    }));
    return data.data;
  },

  async updateLawyer(id: string, updates: Partial<ILawyer> & { password?: string }): Promise<ILawyer> {
    const data = await readJson(await fetch(`${API_BASE}/lawyers/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: this.headers(), body: JSON.stringify(updates),
    }));
    return data.data;
  },

  async deleteLawyer(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/lawyers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) {
      await readJson(res);
    }
  },

  async downloadFeesCsv(filters: LedgerFilters): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/fees/export/csv${buildQuery(filters)}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      await readJson(res);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lawyer_fees_collection_ledger.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  async getSettings(): Promise<NotificationSettings> {
    const data = await readJson(await fetch(`${API_BASE}/settings`, {
      headers: this.headers(),
    }));
    return data.data;
  },

  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const data = await readJson(await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(settings),
    }));
    return data.data;
  },

  async testNotificationChannel(
    channel: 'sms' | 'rcs' | 'whatsapp' | 'voiceCall',
    testPhone: string,
    customUrl?: string
  ): Promise<{ success: boolean; message: string; status: number }> {
    const data = await readJson(await fetch(`${API_BASE}/settings/test`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ channel, testPhone, customUrl }),
    }));
    return data;
  },

  async getNotificationJobs(status?: 'FAILED', page = 1): Promise<{ items: NotificationJob[]; total: number; failedCount: number }> {
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) query.set('status', status);
    const data = await readJson(await fetch(`${API_BASE}/settings/jobs?${query}`, { headers: this.headers() }));
    return { items: data.data || [], total: data.pagination?.total || 0, failedCount: data.failedCount || 0 };
  },

  async retryNotificationJob(id: string): Promise<void> {
    await readJson(await fetch(`${API_BASE}/settings/jobs/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      headers: this.headers(),
    }));
  },
};
