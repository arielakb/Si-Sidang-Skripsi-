import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

type ProtectedRouteProps = {
  roles?: string[];
  permissions?: string[];
};

export default function ProtectedRoute({
  roles,
  permissions
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="screen-center">
        <div className="card">Memuat sesi...</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !hasRole(roles)) {
    return <Navigate to="/app" replace />;
  }

  if (
    permissions &&
    permissions.length > 0 &&
    !hasPermission(permissions)
  ) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}