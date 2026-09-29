import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearToken, loadToken, login as apiLogin, logout as apiLogout, me, toApiError, type BackendUser } from '../services/api';

export type Role = 'admin' | 'employee';

type AuthState = {
  user: BackendUser | null;
  role: Role | null;
  /** Raw backend role (admin/hr/employee) — UI hides accordingly; backend still enforces. */
  backendRole: BackendUser['role'] | null;
  isLoading: boolean;
  error: string | null;
  /** Backend is the ONLY verifier: login returns JWT, /auth/me returns the role. */
  signIn: (username: string, password: string) => Promise<Role>;
  signOut: () => Promise<void>;
  userName: string;
};

const Ctx = createContext<AuthState | null>(null);

/** Map backend role -> app portal. hr rides the admin app (same tabs, backend still enforces). */
export function toPortal(r: BackendUser['role']): Role {
  return r === 'employee' ? 'employee' : 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      if (!t) {
        setIsLoading(false);
        return;
      }
      try {
        setUser(await me());
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await apiLogin(username, password);
      const u = await me();
      setUser(u);
      return toPortal(u.role);
    } catch (e) {
      const msg = e instanceof Error ? e.message : toApiError(e).message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout(true);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthState>(() => {
    const role = user ? toPortal(user.role) : null;
    return { user, role, backendRole: user?.role ?? null, isLoading, error, signIn, signOut, userName: user?.username ?? '' };
  }, [user, isLoading, error, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
