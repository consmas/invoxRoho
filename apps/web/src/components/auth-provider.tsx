"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, login as loginRequest } from "@/src/lib/api";
import { setAuthToken } from "@/src/lib/api/client";
import type { AuthUser } from "@/src/lib/api/types";
import { PERMISSION_ALIASES, type PermissionKey } from "@/src/lib/permissions";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: PermissionKey | string) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = "invox.accessToken";
const USER_KEY = "invox.user";
const SUPER_ADMIN_ROLES = new Set(["PLATFORM_ADMIN", "PLATFORM_ADMINISTRATOR"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      const storedToken = window.localStorage.getItem(TOKEN_KEY);
      const storedUser = window.localStorage.getItem(USER_KEY);
      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
      }
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as AuthUser);
        } catch {
          window.localStorage.removeItem(USER_KEY);
        }
      }
      if (storedToken) {
        try {
          const currentUser = (await getMe()) as AuthUser;
          if (!cancelled) {
            window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
            setUser(currentUser);
          }
        } catch {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(USER_KEY);
          setAuthToken(null);
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
        }
      }
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email, password });
    window.localStorage.setItem(TOKEN_KEY, response.accessToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setAuthToken(response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const can = useCallback(
    (permission: PermissionKey | string) =>
      user
        ? hasPermission(user.permissions, permission) ||
          user.roles.some((role) => SUPER_ADMIN_ROLES.has(role))
        : false,
    [user],
  );

  const value = useMemo(
    () => ({ user, token, ready, login, logout, can }),
    [user, token, ready, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function hasPermission(permissions: string[], permission: PermissionKey | string) {
  if (permissions.includes(permission)) {
    return true;
  }
  const aliases = PERMISSION_ALIASES[permission] ?? [];
  if (aliases.some((alias) => permissions.includes(alias))) {
    return true;
  }
  return Object.entries(PERMISSION_ALIASES).some(
    ([source, mapped]) =>
      mapped.includes(permission) && permissions.includes(source),
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
