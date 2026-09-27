import { LoginForm } from '../components/LoginForm';

/** Admin portal login — master admin: gourabsamanta35@gmail.com / Gourab@2005 */
export default function AdminLogin() {
  return (
    <LoginForm
      portal="admin"
      title="Admin Login"
      subtitle="Manage staff, attendance, leaves & payroll"
    />
  );
}
