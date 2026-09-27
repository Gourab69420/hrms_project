/**
 * Mock data matching backend shapes (HRMS2/app/schemas.py) + Stitch screen content.
 * SWAP POINT: when USE_MOCK=false, useHrms.ts calls api.ts instead — no component changes.
 */

export type Role = 'admin' | 'employee';

export type Employee = {
  id: number;
  code: string; // EMP-xxx display code (backend id is numeric)
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  location: string;
  status: 'Active' | 'On Leave';
  hire_date: string;
};

export type LeaveRequest = {
  id: string; // #L-xxxx display
  employee: string;
  code: string;
  type: 'Casual Leave' | 'Sick Leave' | 'Medical Leave';
  start: string;
  end: string;
  days: string;
  reason: string;
  appliedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export const dashboardStats = {
  user: 'Diptokrit',
  date: 'Monday, 14 September 2026',
  totalStaff: 82,
  totalStaffDelta: '+3 this month',
  presentToday: 74,
  turnout: '90.2% turnout',
  pendingLeaves: 5,
  payrollCycle: 'Processed',
  payrollMonth: 'Sep 2026',
  onsite: 53,
  remote: 21,
  onLeave: 8,
};

export const dashboardLeaves: LeaveRequest[] = [
  {
    id: '#L-1082',
    employee: 'John Doe',
    code: 'EMP-0102',
    type: 'Casual Leave',
    start: '12 Sep',
    end: '13 Sep',
    days: '12–13 Sep',
    reason: 'Attending family reunion and personal matters',
    appliedOn: '08 Sep 2026',
    status: 'Pending',
  },
  {
    id: '#L-1074',
    employee: 'Gourab Samanta',
    code: 'EMP-0104',
    type: 'Medical Leave',
    start: '11 Sep',
    end: '11 Sep',
    days: '11 Sep',
    reason: 'Doctor advised rest post viral fever',
    appliedOn: '09 Sep 2026',
    status: 'Approved',
  },
];

export const employees: Employee[] = [
  { id: 104, code: 'EMP-0104', first_name: 'Gourab', last_name: 'Samanta', email: 'gourab@company.com', phone: '+91 98765 43210', position: 'Head of Information Technology', department: 'IT', location: 'Remote', status: 'Active', hire_date: '2024-09-11' },
  { id: 105, code: 'EMP-0105', first_name: 'Aparna', last_name: 'B', email: 'aparna@company.com', phone: '+91 98765 43211', position: 'Software Engineer', department: 'Engineering', location: 'HQ Floor 3', status: 'Active', hire_date: '2024-06-01' },
  { id: 106, code: 'EMP-0106', first_name: 'Rahul', last_name: 'Singh', email: 'rahul@company.com', phone: '+91 98765 43212', position: 'Backend Developer', department: 'Engineering', location: 'HQ Floor 3', status: 'Active', hire_date: '2024-03-15' },
  { id: 92, code: 'EMP-0092', first_name: 'Sarah', last_name: 'Jenkins', email: 'sarah@company.com', phone: '+91 98765 43213', position: 'HR Specialist', department: 'People Ops', location: 'Floor 2', status: 'Active', hire_date: '2023-11-20' },
  { id: 78, code: 'EMP-0078', first_name: 'David', last_name: 'Miller', email: 'david@company.com', phone: '+91 98765 43214', position: 'Financial Analyst', department: 'Finance', location: 'Floor 4', status: 'On Leave', hire_date: '2023-08-05' },
];

export const adminLeaveQueue: LeaveRequest[] = [
  { id: '#L-1082', employee: 'Gourab Samanta', code: 'EMP-0104', type: 'Casual Leave', start: '12 Sep', end: '13 Sep', days: '12 Sep – 13 Sep (2 Days)', reason: 'Attending family reunion and personal matters', appliedOn: '08 Sep 2026', status: 'Pending' },
  { id: '#L-1083', employee: 'John Doe', code: 'EMP-0102', type: 'Sick Leave', start: '14 Sep', end: '14 Sep', days: '14 Sep (1 Day)', reason: 'Viral fever consultation & rest', appliedOn: '09 Sep 2026', status: 'Pending' },
  { id: '#L-1074', employee: 'Sarah Jenkins', code: 'EMP-0092', type: 'Medical Leave', start: '05 Sep', end: '07 Sep', days: '05 Sep – 07 Sep (3 Days)', reason: 'Dental surgery & recovery procedure', appliedOn: '01 Sep 2026', status: 'Approved' },
  { id: '#L-1061', employee: 'Michael Ross', code: 'EMP-0078', type: 'Casual Leave', start: '28 Aug', end: '28 Aug', days: '28 Aug (1 Day)', reason: 'Sprint release blackout window overlap', appliedOn: '26 Aug 2026', status: 'Rejected' },
];

/** Employee-side mocks (Home / Attendance / Leaves / Payroll / Profile) */
export const employeeHome = {
  user: 'Gourab',
  date: 'Wed Sep 23 2026',
  pendingLeaves: 0,
  lastNetSalary: '6,969,804',
};

export const attendanceToday = {
  date: '2026-09-24',
  punchedIn: true,
  session: '06h 16m 38s',
  punchInAt: '09:00:00 AM',
  checkIn: '09:00:00',
  checkOut: '--:--:--',
  workHours: '6.24 hrs',
  status: 'Present' as const,
};

export const attendanceLog = [
  { date: '2026-09-23', status: 'Present', in: '09:02:11', out: '17:05:40', hours: '8.0 hrs', note: 'Completed' },
  { date: '2026-09-22', status: 'Present', in: '08:55:04', out: '17:30:19', hours: '8.5 hrs', note: '+0.5 OT' },
  { date: '2026-09-21', status: 'Present', in: '09:12:00', out: '17:15:30', hours: '8.0 hrs', note: 'Late Entry' },
  { date: '2026-09-18', status: 'Approved Leave', in: 'Medical Leave', out: '', hours: '0.0 hrs', note: 'Paid' },
];

export const myLeaves: LeaveRequest[] = [
  { id: '#L-1082', employee: 'Me', code: 'EMP-0104', type: 'Casual Leave', start: '2026-09-14', end: '2026-09-14', days: '2026-09-14 → 2026-09-14 • 1 Day', reason: 'Personal family commitment', appliedOn: '08 Sep 2026', status: 'Pending' },
  { id: '#L-1074', employee: 'Me', code: 'EMP-0104', type: 'Medical Leave', start: '2026-08-22', end: '2026-08-23', days: '2026-08-22 → 2026-08-23 • 2 Days', reason: 'Doctor advised rest post viral fever', appliedOn: '20 Aug 2026', status: 'Approved' },
  { id: '#L-1061', employee: 'Me', code: 'EMP-0104', type: 'Casual Leave', start: '2026-07-15', end: '2026-07-15', days: '2026-07-15 → 2026-07-15 • 1 Day', reason: 'Personal relocation errands', appliedOn: '10 Jul 2026', status: 'Approved' },
  { id: '#L-1049', employee: 'Me', code: 'EMP-0104', type: 'Sick Leave', start: '2026-06-02', end: '2026-06-05', days: '2026-06-02 → 2026-06-05 • 4 Days', reason: 'Severe seasonal flu requiring recovery', appliedOn: '28 May 2026', status: 'Rejected' },
];

export const payrollCurrent = {
  month: 'Sep 2026',
  cycle: 'Sep 01 - Sep 30, 2026 Cycle',
  net: '₹46,000',
  payrollId: '#104',
  status: 'Processed',
  basic: '₹35,000',
  allowances: '₹16,000',
  gross: '₹51,000',
  deductions: '₹5,000',
};

export const payrollHistory = [
  { month: 'August 2026', amount: '₹46,000', disbursed: 'Aug 31' },
  { month: 'July 2026', amount: '₹45,500', disbursed: 'Jul 31' },
  { month: 'June 2026', amount: '₹45,500', disbursed: 'Jun 30' },
  { month: 'May 2026', amount: '₹45,500', disbursed: 'May 31' },
];

export const profile = {
  name: 'Gourab Samanta',
  code: 'EMP-002',
  role: 'Software Engineer • Full-time',
  department: 'Information Technology',
  designation: 'Software Engineer',
  username: 'gourab',
  email: 'gourab@company.com',
  phone: '+91 98765 43210',
  doj: 'September 11, 2024',
};
