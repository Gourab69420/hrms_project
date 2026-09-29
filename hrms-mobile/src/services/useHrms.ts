/**
 * Live-only data layer — React Query over FastAPI. No mocks.
 * Every screen shows loading / error / empty states from real responses.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/AuthContext';
import {
  api,
  applyLeave,
  employeeAttendance,
  employeePayroll,
  listAllAttendance,
  listAllLeaves,
  listEmployees,
  listMyLeaves,
  setLeaveStatus,
  toApiError,
  type BackendEmployee,
  type BackendLeave,
} from './api';

export const qError = (e: unknown) => toApiError(e).message;

export type UIEmployee = {
  id: number;
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  department_id: number | null;
  status: 'Active' | 'On Leave';
  hire_date: string;
};

export type UILeave = {
  id: number;
  tag: string;
  employee: string;
  code: string;
  type: string;
  start: string;
  end: string;
  days: string;
  reason: string;
  appliedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export type Dept = { id: number; name: string };

const cap = (s: string) => (s === 'pending' ? 'Pending' : s === 'approved' ? 'Approved' : 'Rejected') as UILeave['status'];

const fmtType = (t: string) =>
  /sick/i.test(t) ? 'Sick Leave' : /casual/i.test(t) ? 'Casual Leave' : /medical/i.test(t) ? 'Medical Leave' : t;

export function useDepartments() {
  const q = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get<Dept[]>('/departments/')).data,
    staleTime: 5 * 60_000,
  });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null };
}

function toUIEmployee(e: BackendEmployee, deptById: Map<number, string>): UIEmployee {
  return {
    id: e.id,
    code: `EMP-${String(e.id).padStart(4, '0')}`,
    first_name: e.first_name,
    last_name: e.last_name,
    email: e.email,
    phone: e.phone ?? '',
    position: e.position ?? '',
    department: e.department_id != null ? (deptById.get(e.department_id) ?? '—') : '—',
    department_id: e.department_id,
    status: e.is_active ? 'Active' : 'On Leave',
    hire_date: e.hire_date ?? '',
  };
}

export function leaveToUI(l: BackendLeave, byId: Map<number, BackendEmployee>): UILeave {
  const emp = byId.get(l.employee_id);
  return {
    id: l.id,
    tag: `#L-${l.id}`,
    employee: emp ? `${emp.first_name} ${emp.last_name}` : `EMP-${l.employee_id}`,
    code: emp ? `EMP-${String(emp.id).padStart(4, '0')}` : `EMP-${l.employee_id}`,
    type: fmtType(l.leave_type),
    start: l.start_date,
    end: l.end_date,
    days: l.start_date === l.end_date ? l.start_date : `${l.start_date} → ${l.end_date}`,
    reason: l.reason ?? '',
    appliedOn: l.created_at ? l.created_at.slice(0, 10) : l.start_date,
    status: cap(l.status),
  };
}

/* ---------- admin ---------- */

export function useEmployees(search = '') {
  const { data: depts } = useDepartments();
  const q = useQuery({
    queryKey: ['employees', search],
    queryFn: () => listEmployees(search),
  });
  const deptById = new Map((depts ?? []).map((d) => [d.id, d.name]));
  return {
    data: (q.data ?? []).map((e) => toUIEmployee(e, deptById)),
    isLoading: q.isLoading,
    error: q.error ? qError(q.error) : null,
    refetch: q.refetch,
  };
}

export function useEmployee(id: number) {
  const { data: depts } = useDepartments();
  const q = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => (await api.get<BackendEmployee>(`/employees/${id}`)).data,
    enabled: Number.isFinite(id),
  });
  const deptById = new Map((depts ?? []).map((d) => [d.id, d.name]));
  return {
    data: q.data ? toUIEmployee(q.data, deptById) : null,
    isLoading: q.isLoading,
    error: q.error ? qError(q.error) : null,
  };
}

export function useAdminLeaveQueue() {
  const empQ = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees() });
  const q = useQuery({ queryKey: ['leaves-all'], queryFn: listAllLeaves });
  const byId = new Map((empQ.data ?? []).map((e) => [e.id, e]));
  return {
    data: (q.data ?? []).map((l) => leaveToUI(l, byId)),
    isLoading: q.isLoading || empQ.isLoading,
    error: q.error ? qError(q.error) : (empQ.error ? qError(empQ.error) : null),
    refetch: () => {
      q.refetch();
      empQ.refetch();
    },
  };
}

export function useDashboardLeaves() {
  const { data, isLoading, error, refetch } = useAdminLeaveQueue();
  return { data: data.filter((l) => l.status === 'Pending').slice(0, 5), isLoading, error, refetch };
}

export type DashboardStats = {
  user: string;
  date: string;
  totalStaff: number;
  totalStaffDelta: string;
  presentToday: number;
  turnout: string;
  pendingLeaves: number;
  payrollCycle: string;
  payrollMonth: string;
  onsite: number;
  remote: number;
  onLeave: number;
};

export function useDashboardStats() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () =>
      (
        await api.get<{
          total_staff: number;
          present_today: number;
          turnout_pct: number;
          pending_leaves: number;
          on_leave_today: number;
          date: string;
        }>('/dashboard/stats')
      ).data,
    enabled: !!user,
  });
  const s = q.data;
  const data: DashboardStats | null = s
    ? {
        user: user?.username.split('@')[0] ?? 'Admin',
        date: new Date(s.date + 'T00:00:00').toDateString(),
        totalStaff: s.total_staff,
        totalStaffDelta: '',
        presentToday: s.present_today,
        turnout: `${s.turnout_pct}% turnout`,
        pendingLeaves: s.pending_leaves,
        payrollCycle: '—',
        payrollMonth: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        onsite: s.present_today,
        remote: 0,
        onLeave: s.on_leave_today,
      }
    : null;
  return { data, isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useAdminPayrolls() {
  const empQ = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees() });
  const q = useQuery({
    queryKey: ['payrolls-all'],
    queryFn: async () => (await api.get('/payroll/')).data as {
      id: number;
      employee_id: number;
      month: number;
      year: number;
      basic_salary: number;
      bonuses: number;
      deductions: number;
      net_salary: number;
      paid_at: string | null;
    }[],
  });
  const byId = new Map((empQ.data ?? []).map((e) => [e.id, e]));
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  return {
    data: (q.data ?? []).map((p) => {
      const emp = byId.get(p.employee_id);
      return {
        id: p.id,
        name: emp ? `${emp.first_name} ${emp.last_name}` : `EMP-${p.employee_id}`,
        code: `EMP-${String(p.employee_id).padStart(4, '0')}`,
        net: fmt(p.net_salary),
        status: p.paid_at ? 'Processed' : 'Pending',
        month: p.month,
        year: p.year,
      };
    }),
    isLoading: q.isLoading || empQ.isLoading,
    error: q.error ? qError(q.error) : null,
    refetch: q.refetch,
  };
}

/* ---------- employee ---------- */

export function useMyProfile() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['employee-me'],
    queryFn: async () => (await api.get<BackendEmployee>('/employees/me')).data,
    enabled: !!user?.employee_id,
  });
  return { data: q.data ?? null, isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useEmployeeHome() {
  const { user } = useAuth();
  const leavesQ = useQuery({
    queryKey: ['leaves-my'],
    queryFn: listMyLeaves,
    enabled: !!user,
  });
  const payQ = useQuery({
    queryKey: ['payroll-mine', user?.employee_id],
    queryFn: () => employeePayroll(user!.employee_id!),
    enabled: !!user?.employee_id,
  });
  const pendingLeaves = (leavesQ.data ?? []).filter((l) => l.status === 'pending').length;
  const last = (payQ.data ?? []).slice(-1)[0];
  return {
    data: {
      user: user?.username.split('@')[0] ?? 'there',
      date: new Date().toDateString(),
      pendingLeaves,
      lastNetSalary: last ? Math.round(last.net_salary).toLocaleString('en-IN') : '—',
    },
    isLoading: leavesQ.isLoading || payQ.isLoading,
    error: leavesQ.error ? qError(leavesQ.error) : null,
  };
}

export function useMyLeaves() {
  const { user } = useAuth();
  const empQ = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees() });
  const q = useQuery({ queryKey: ['leaves-my'], queryFn: listMyLeaves, enabled: !!user });
  const byId = new Map((empQ.data ?? []).map((e) => [e.id, e]));
  return {
    data: (q.data ?? []).map((l) => leaveToUI(l, byId)),
    isLoading: q.isLoading,
    error: q.error ? qError(q.error) : null,
    refetch: q.refetch,
  };
}

export function usePayroll() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['payroll-mine', user?.employee_id],
    queryFn: () => employeePayroll(user!.employee_id!),
    enabled: !!user?.employee_id,
  });
  const rows = q.data ?? [];
  const last = rows.slice(-1)[0];
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const monthName = (m: number, y: number) =>
    new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const statRows = (p: typeof last) =>
    p
      ? [
          { l: 'Basic Salary', r: fmt(p.basic_salary) },
          ...(p.hra ? [{ l: 'HRA', r: fmt(p.hra) }] : []),
          ...(p.conveyance ? [{ l: 'Conveyance', r: fmt(p.conveyance) }] : []),
          ...(p.special_allowance ? [{ l: 'Special Allowance', r: fmt(p.special_allowance) }] : []),
          ...(p.bonuses ? [{ l: 'Bonuses', r: fmt(p.bonuses) }] : []),
          ...(p.pf_amount ? [{ l: 'PF (employee)', r: `-${fmt(p.pf_amount)}` }] : []),
          ...(p.esi_amount ? [{ l: 'ESI (employee)', r: `-${fmt(p.esi_amount)}` }] : []),
          ...(p.pt_amount ? [{ l: 'Prof. Tax (WB)', r: `-${fmt(p.pt_amount)}` }] : []),
          ...(p.tds_amount ? [{ l: 'TDS (est.)', r: `-${fmt(p.tds_amount)}` }] : []),
          ...(p.loan_deduction ? [{ l: 'Loan EMI', r: `-${fmt(p.loan_deduction)}` }] : []),
        ]
      : [];
  return {
    data: last
      ? {
          current: {
            id: last.id,
            month: monthName(last.month, last.year),
            cycle: `${monthName(last.month, last.year)} Cycle`,
            net: fmt(last.net_salary),
            payrollId: `#${last.id}`,
            status: last.paid_at ? 'Processed' : 'Pending',
            basic: fmt(last.basic_salary),
            allowances: fmt(last.bonuses),
            gross: fmt(last.basic_salary + last.bonuses),
            deductions: fmt(last.deductions),
            breakdown: statRows(last),
            raw: last,
          },
          history: rows.slice(0, -1).reverse().map((p) => ({
            id: p.id,
            month: monthName(p.month, p.year),
            amount: fmt(p.net_salary),
            disbursed: p.paid_at ? p.paid_at.slice(0, 10) : 'Pending',
            raw: p,
          })),
        }
      : null,
    isLoading: q.isLoading,
    error: q.error ? qError(q.error) : null,
    refetch: q.refetch,
  };
}

export function useMyAttendance() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['attendance-mine', user?.employee_id],
    queryFn: () => employeeAttendance(user!.employee_id!),
    enabled: !!user?.employee_id,
  });
  const rows = [...(q.data ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = new Date().toISOString().slice(0, 10);
  const todays = rows.find((r) => r.date === today) ?? null;
  return { data: rows, todays, isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

/* ---------- mutations ---------- */

export function usePunch() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => (await api.post('/attendance/punch')).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-mine', user?.employee_id] });
      qc.invalidateQueries({ queryKey: ['attendance-all'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: async (e: unknown) => {
      // No network: keep the tap — it flushes on reconnect (basement-parking proof).
      const axiosErr = e as { response?: unknown; message?: string };
      if (!axiosErr.response) {
        const { queuePunch } = await import('./offlineQueue');
        await queuePunch();
      }
    },
  });
}

export function useLeaveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => setLeaveStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves-all'] });
      qc.invalidateQueries({ queryKey: ['leaves-my'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/leaves/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves-my'] });
      qc.invalidateQueries({ queryKey: ['leaves-all'] });
    },
  });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves-my'] });
      qc.invalidateQueries({ queryKey: ['leaves-all'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      position?: string;
      department_id?: number | null;
    }) => (await api.post('/employees/', p)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useCreatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      employee_id: number;
      month: number;
      year: number;
      basic_salary: number;
      bonuses?: number;
      deductions?: number;
    }) => (await api.post('/payroll/', p)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-mine'] });
    },
  });
}

/* ---------- Phase-2 modules ---------- */

export function useBalancesMine() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['balances-mine'],
    queryFn: () => import('./api').then((m) => m.getBalancesMine()),
    enabled: !!user?.employee_id,
  });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useHolidays() {
  const q = useQuery({ queryKey: ['holidays'], queryFn: () => import('./api').then((m) => m.getHolidays()) });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useAnnouncements() {
  const q = useQuery({
    queryKey: ['announcements'],
    queryFn: () => import('./api').then((m) => m.getAnnouncements()),
  });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function usePolls() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['polls'], queryFn: () => import('./api').then((m) => m.getPolls()) });
  const vote = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: number; optionId: number }) =>
      import('./api').then((m) => m.votePoll(pollId, optionId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['polls'] }),
  });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch, vote };
}

export function useMyRegs() {
  const q = useQuery({ queryKey: ['regs-my'], queryFn: () => import('./api').then((m) => m.getMyRegs()) });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useMyLoans() {
  const q = useQuery({ queryKey: ['loans-my'], queryFn: () => import('./api').then((m) => m.getMyLoans()) });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useMyTickets() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['tickets-my'], queryFn: () => import('./api').then((m) => m.getMyTickets()) });
  const open = useMutation({
    mutationFn: (p: { category: string; subject: string; body?: string }) =>
      import('./api').then((m) => m.openTicket(p)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets-my'] }),
  });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch, open };
}

export function useMyExit() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['exit-my'], queryFn: () => import('./api').then((m) => m.getMyExit()) });
  const submit = useMutation({
    mutationFn: (p: { resignation_date: string; last_working_date: string; notes?: string }) =>
      import('./api').then((m) => m.resign(p)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exit-my'] }),
  });
  return { data: q.data ?? null, isLoading: q.isLoading, error: null, refetch: q.refetch, submit };
}

export function useMyDocs() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['docs-my', user?.employee_id],
    queryFn: () => import('./api').then((m) => m.getMyDocs(user!.employee_id!)),
    enabled: !!user?.employee_id,
  });
  return { data: q.data ?? [], isLoading: q.isLoading, error: q.error ? qError(q.error) : null, refetch: q.refetch };
}

export function useInbox() {
  const q = useQuery({ queryKey: ['inbox'], queryFn: () => import('./api').then((m) => m.getInbox()) });
  return {
    data: q.data ?? { leaves: 0, regularizations: 0, tickets: 0, exits: 0 },
    isLoading: q.isLoading,
    error: q.error ? qError(q.error) : null,
    refetch: q.refetch,
  };
}
