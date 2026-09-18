import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function Home() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "REQUESTER") return <Navigate to="/tickets" replace />;
  if (user.role === "ADMINISTRATOR") return <Navigate to="/admin/users" replace />;
  return <Navigate to="/queue" replace />;
}