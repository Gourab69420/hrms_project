import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

export const TOKEN_KEY = 'hrms_jwt';

/** Axios instance used by ALL backend calls. Nothing in components should import axios directly. */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (cfg) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      cfg.headers = cfg.headers ?? {};
      (cfg.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore unavailable on web — try in-memory fallback below
    if (memToken) {
      cfg.headers = cfg.headers ?? {};
      (cfg.headers as Record<string, string>).Authorization = `Bearer ${memToken}`;
    }
  }
  return cfg;
});

let memToken: string | null = null;

export async function saveToken(token: string) {
  memToken = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* web fallback: in-memory only */
  }
}

export async function loadToken(): Promise<string | null> {
  if (memToken) return memToken;
  try {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    if (t) memToken = t;
    return t;
  } catch {
    return memToken;
  }
}

export async function clearToken() {
  memToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export type ApiError = { message: string; status?: number };

export function toApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { detail?: string | { msg?: string }[] } | undefined;
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((d) => d.msg).join(', ')
          : undefined;
    return { message: detail ?? e.message ?? 'Network error', status: e.response?.status };
  }
  return { message: e instanceof Error ? e.message : 'Unknown error' };
}

/* ---------- Backend types (mirror HRMS2/app/schemas.py) ---------- */

export type BackendUser = {
  id: number;
  username: string;
  role: 'admin' | 'hr' | 'employee';
  is_active: boolean;
  employee_id: number | null;
};

export type BackendEmployee = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  hire_date: string | null;
  department_id: number | null;
  is_active: boolean;
  created_at: string;
};

export type BackendLeave = {
  id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type BackendAttendance = {
  id: number;
  employee_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
};

export type BackendPayroll = {
  id: number;
  employee_id: number;
  month: number;
  year: number;
  basic_salary: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  paid_at: string | null;
  created_at: string;
};

/* ---------- Calls ---------- */

/** POST /auth/login — OAuth2 form (username + password fields). */
export async function login(username: string, password: string): Promise<string> {
  const form = new URLSearchParams();
  form.append('username', username.trim());
  form.append('password', password);
  const res = await api.post<{ access_token: string; token_type: string }>(
    '/auth/login',
    form.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  await saveToken(res.data.access_token);
  return res.data.access_token;
}

export async function me(): Promise<BackendUser> {
  const res = await api.get<BackendUser>('/auth/me');
  return res.data;
}

export async function listEmployees(search = '', skip = 0, limit = 100): Promise<BackendEmployee[]> {
  const res = await api.get<BackendEmployee[]>('/employees/', {
    params: { search: search || undefined, skip, limit },
  });
  return res.data;
}

export async function listAllLeaves(): Promise<BackendLeave[]> {
  const res = await api.get<BackendLeave[]>('/leaves/');
  return res.data;
}

export async function listMyLeaves(): Promise<BackendLeave[]> {
  const res = await api.get<BackendLeave[]>('/leaves/my');
  return res.data;
}

export async function applyLeave(payload: {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
}): Promise<BackendLeave> {
  const res = await api.post<BackendLeave>('/leaves/', payload);
  return res.data;
}

export async function setLeaveStatus(id: number, status: 'approved' | 'rejected'): Promise<BackendLeave> {
  const res = await api.patch<BackendLeave>(`/leaves/${id}/status`, { status });
  return res.data;
}

export async function listAllAttendance(): Promise<BackendAttendance[]> {
  const res = await api.get<BackendAttendance[]>('/attendance/');
  return res.data;
}

export async function employeeAttendance(empId: number): Promise<BackendAttendance[]> {
  const res = await api.get<BackendAttendance[]>(`/attendance/employee/${empId}`);
  return res.data;
}

export async function employeePayroll(empId: number): Promise<BackendPayroll[]> {
  const res = await api.get<BackendPayroll[]>(`/payroll/employee/${empId}`);
  return res.data;
}

export const endpoints = {
  login: '/auth/login',
  me: '/auth/me',
  employees: '/employees/',
  attendance: '/attendance/',
  leaves: '/leaves/',
  myLeaves: '/leaves/my',
  payroll: '/payroll/',
} as const;
