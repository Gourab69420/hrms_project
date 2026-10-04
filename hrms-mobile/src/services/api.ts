import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

export const TOKEN_KEY = 'hrms_jwt';
const REFRESH_KEY = 'hrms_refresh';

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

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && cfg && !cfg._retried && !cfg.url?.includes('/auth/')) {
      cfg._retried = true;
      if (await refreshSession()) {
        const t = await loadToken();
        if (t) {
          cfg.headers = cfg.headers ?? {};
          (cfg.headers as Record<string, string>).Authorization = `Bearer ${t}`;
        }
        return api(cfg);
      }
    }
    return Promise.reject(error);
  },
);

let memToken: string | null = null;
let memRefresh: string | null = null;

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
  memRefresh = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

async function saveRefresh(token: string) {
  memRefresh = token;
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  } catch {
    /* web fallback */
  }
}

async function loadRefresh(): Promise<string | null> {
  if (memRefresh) return memRefresh;
  try {
    const t = await SecureStore.getItemAsync(REFRESH_KEY);
    if (t) memRefresh = t;
    return t;
  } catch {
    return memRefresh;
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
  hra: number;
  conveyance: number;
  special_allowance: number;
  pf_amount: number;
  esi_amount: number;
  pt_amount: number;
  tds_amount: number;
  loan_deduction: number;
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
  const res = await api.post<{ access_token: string; token_type: string; refresh_token?: string }>(
    '/auth/login',
    form.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  await saveToken(res.data.access_token);
  if (res.data.refresh_token) await saveRefresh(res.data.refresh_token);
  return res.data.access_token;
}

/** Rotate session using the stored refresh token. Returns false when re-login is needed. */
export async function refreshSession(): Promise<boolean> {
  const rt = await loadRefresh();
  if (!rt) return false;
  try {
    const res = await api.post<{ access_token: string; refresh_token?: string }>('/auth/refresh', {
      refresh_token: rt,
    });
    await saveToken(res.data.access_token);
    if (res.data.refresh_token) await saveRefresh(res.data.refresh_token);
    return true;
  } catch {
    await clearToken();
    return false;
  }
}

export async function logout(remote = true): Promise<void> {
  if (remote) {
    const rt = await loadRefresh();
    try {
      if (rt) await api.post('/auth/logout', { refresh_token: rt });
      else await api.post('/auth/logout');
    } catch {
      /* still clear locally */
    }
  }
  await clearToken();
}

export async function registerPushToken(expoPushToken: string): Promise<void> {
  await api.post('/auth/push-token', { expo_push_token: expoPushToken });
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

/* ---------- Phase-2 modules ---------- */

export type Balance = {
  leave_type: string;
  year: number;
  entitled: number;
  used: number;
  remaining: number;
  paid: boolean;
};

export type Holiday = { id: number; date: string; name: string; description: string | null; source?: string };
export type ExternalStatus = { configured: boolean; table: string; hint: string | null };
export type Shift = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  late_after: string;
  weekly_offs: string;
  description: string | null;
};
export type LeaveType = { id: number; name: string; yearly_quota: number; paid: boolean; description: string | null };
export type Announcement = { id: number; title: string; body: string; audience: string; created_at: string };
export type PollOption = { id: number; text: string; votes: number };
export type Poll = {
  id: number;
  question: string;
  active: boolean;
  my_vote: number | null;
  options: PollOption[];
  created_at: string;
};
export type Reg = {
  id: number;
  employee_id: number;
  date: string;
  req_check_in: string | null;
  req_check_out: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
export type Loan = {
  id: number;
  employee_id: number;
  principal: number;
  monthly_installment: number;
  remaining: number;
  status: string;
  created_at: string;
};
export type SalaryStruct = {
  id: number;
  employee_id: number;
  basic: number;
  hra: number;
  conveyance: number;
  special_allowance: number;
  pf_applicable: boolean;
  esi_applicable: boolean;
  effective_from: string;
  created_at: string;
};
export type Ticket = {
  id: number;
  employee_id: number;
  category: string;
  subject: string;
  body: string | null;
  status: string;
  created_at: string;
};
export type ExitRow = {
  id: number;
  employee_id: number;
  resignation_date: string;
  last_working_date: string;
  status: string;
  fnf_amount: number | null;
  notes: string | null;
  created_at: string;
};
export type Doc = {
  id: number;
  employee_id: number;
  doc_type: string;
  file_name: string;
  created_at: string;
};
export type Audit = {
  id: number;
  actor_user_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string | null;
  created_at: string;
};
export type Inbox = { leaves: number; regularizations: number; tickets: number; exits: number };

export const getBalancesMine = () => api.get<Balance[]>('/leave-balances/me').then((r) => r.data);
export const getBalancesOf = (id: number) =>
  api.get<Balance[]>(`/leave-balances/employee/${id}`).then((r) => r.data);
export const getLeaveTypes = () => api.get<LeaveType[]>('/leave-types/').then((r) => r.data);
export const createLeaveType = (p: { name: string; yearly_quota: number; paid: boolean; description?: string }) =>
  api.post('/leave-types/', p).then((r) => r.data);

export const getHolidays = () => api.get<Holiday[]>('/holidays/').then((r) => r.data);
export const getExternalStatus = () => api.get<ExternalStatus>('/holidays/external/status').then((r) => r.data);
export const syncHolidays = () =>
  api.post<{ added: number; updated: number; source: string }>('/holidays/sync').then((r) => r.data);
export const createHoliday = (p: { date: string; name: string; description?: string }) =>
  api.post('/holidays/', p).then((r) => r.data);
export const deleteHoliday = (id: number) => api.delete(`/holidays/${id}`);

export const getShifts = () => api.get<Shift[]>('/shifts/').then((r) => r.data);
export const createShift = (p: {
  name: string;
  start_time: string;
  end_time: string;
  late_after: string;
  weekly_offs?: string;
  description?: string;
}) => api.post('/shifts/', p).then((r) => r.data);
export const deleteShift = (id: number) => api.delete(`/shifts/${id}`);

export const getAnnouncements = () => api.get<Announcement[]>('/announcements/').then((r) => r.data);
export const createAnnouncement = (p: { title: string; body: string; audience?: string }) =>
  api.post('/announcements/', p).then((r) => r.data);
export const deleteAnnouncement = (id: number) => api.delete(`/announcements/${id}`);

export const getPolls = () => api.get<Poll[]>('/polls/').then((r) => r.data);
export const createPoll = (p: { question: string; options: string[] }) =>
  api.post('/polls/', p).then((r) => r.data);
export const votePoll = (pollId: number, optionId: number) =>
  api.post<Poll>(`/polls/${pollId}/vote`, { option_id: optionId }).then((r) => r.data);

export const getMyRegs = () => api.get<Reg[]>('/regularization/my').then((r) => r.data);
export const getTeamRegs = () => api.get<Reg[]>('/regularization/team').then((r) => r.data);
export const getAllRegs = () => api.get<Reg[]>('/regularization/').then((r) => r.data);
export const createReg = (p: { date: string; req_check_in?: string; req_check_out?: string; reason?: string }) =>
  api.post('/regularization/', p).then((r) => r.data);
export const decideReg = (id: number, status: 'approved' | 'rejected') =>
  api.patch(`/regularization/${id}/status`, { status }).then((r) => r.data);

export const getMyLoans = () => api.get<Loan[]>('/loans/my').then((r) => r.data);
export const getEmployeeLoans = (id: number) => api.get<Loan[]>(`/loans/employee/${id}`).then((r) => r.data);
export const createLoan = (p: { employee_id: number; principal: number; monthly_installment: number }) =>
  api.post('/loans/', p).then((r) => r.data);
export const getStructures = (id: number) =>
  api.get<SalaryStruct[]>(`/salary-structures/employee/${id}`).then((r) => r.data);
export const setStructure = (p: {
  employee_id: number;
  basic: number;
  hra?: number;
  conveyance?: number;
  special_allowance?: number;
  pf_applicable?: boolean;
  esi_applicable?: boolean;
  effective_from: string;
}) => api.post('/salary-structures/', p).then((r) => r.data);

export const getMyTickets = () => api.get<Ticket[]>('/tickets/my').then((r) => r.data);
export const getAllTickets = () => api.get<Ticket[]>('/tickets/').then((r) => r.data);
export const openTicket = (p: { category: string; subject: string; body?: string }) =>
  api.post('/tickets/', p).then((r) => r.data);
export const setTicketStatus = (id: number, status: string) =>
  api.patch(`/tickets/${id}`, { status }).then((r) => r.data);

export const getMyExit = () =>
  api.get<ExitRow>('/exits/my').then((r) => r.data).catch(() => null);
export const getAllExits = () => api.get<ExitRow[]>('/exits/').then((r) => r.data);
export const resign = (p: { resignation_date: string; last_working_date: string; notes?: string }) =>
  api.post('/exits/', p).then((r) => r.data);
export const reviewExit = (id: number, p: { status?: string; fnf_amount?: number; notes?: string }) =>
  api.patch(`/exits/${id}`, p).then((r) => r.data);

export const getMyDocs = (empId: number) => api.get<Doc[]>(`/documents/employee/${empId}`).then((r) => r.data);
export const downloadDocUrl = (id: number) => `${API_URL}/documents/${id}/download`;

export type Department = { id: number; name: string; description: string | null; created_at: string };

export const getDepartments = () => api.get<Department[]>('/departments/').then((r) => r.data);
export const createDepartment = (p: { name: string; description?: string }) =>
  api.post('/departments/', p).then((r) => r.data);
export const deleteDepartment = (id: number) => api.delete(`/departments/${id}`);

export const updateEmployee = (id: number, p: Record<string, unknown>) =>
  api.patch(`/employees/${id}`, p).then((r) => r.data);
export const deleteEmployeeFull = (id: number) =>
  api.delete(`/employees/${id}/full`).then((r) => r.data as { deleted: string; removed: Record<string, number> });

export const getAudit = (skip = 0, mine = false) =>
  api.get<Audit[]>('/audit-logs/', { params: { skip, mine } }).then((r) => r.data);
export const getInbox = () => api.get<Inbox>('/approvals/inbox').then((r) => r.data);
export const getRegPendingCount = () =>
  api.get<{ pending: number }>('/regularization/pending/count').then((r) => r.data.pending);
export const autoPunchOut = () =>
  api.post<{ closed: number; at: string }>('/attendance/auto-punch-out').then((r) => r.data);
export const getTeam = () => api.get<BackendEmployee[]>('/employees/team').then((r) => r.data);
