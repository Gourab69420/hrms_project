import { LoginForm } from '../components/LoginForm';

/** Employee portal login — employee users created by admin (linked employee_id). */
export default function EmployeeLogin() {
  return (
    <LoginForm
      portal="employee"
      title="Employee Login"
      subtitle="Your attendance, leaves, payroll & profile"
    />
  );
}
