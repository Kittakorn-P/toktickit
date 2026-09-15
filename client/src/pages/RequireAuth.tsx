import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

interface RequireAuthProps {
  roles?: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">;
}

export default function RequireAuth({ roles }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container py-5"><p>Loading…</p></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">You don't have access to this page.</div>
      </div>
    );
  }
  return <Outlet />;
}