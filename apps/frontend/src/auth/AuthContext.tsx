import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken
} from "./token";
import type { AuthUser, LoginPayload, LoginResponse, MeResponse } from "./auth-types";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permissions: string | string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const response = await api.get<MeResponse>("/auth/me");
    setUser(response.data.data);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const token = getAccessToken();

      if (token) {
        await refreshMe();
        return;
      }

      const refreshResponse = await api.post<LoginResponse>("/auth/refresh");
      const accessToken = refreshResponse.data.data.accessToken;

      setAccessToken(accessToken);
      setUser(refreshResponse.data.data.user);
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await api.post<LoginResponse>("/auth/login", payload);
    setAccessToken(response.data.data.accessToken);
    setUser(response.data.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (roles: string | string[]) => {
      if (!user) return false;

      const roleList = Array.isArray(roles) ? roles : [roles];

      return roleList.some((role) => user.roles.includes(role));
    },
    [user]
  );

  const hasPermission = useCallback(
    (permissions: string | string[]) => {
      if (!user) return false;

      const permissionList = Array.isArray(permissions)
        ? permissions
        : [permissions];

      return permissionList.some((permission) =>
        user.permissions.includes(permission)
      );
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshMe,
      hasRole,
      hasPermission
    }),
    [
      user,
      isLoading,
      login,
      logout,
      refreshMe,
      hasRole,
      hasPermission
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}