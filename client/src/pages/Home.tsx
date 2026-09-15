import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function Home() {
  const { user } = useAuth();
  if (!user) return null; // RequireAuth above this route already handles the unauthenticated case
  if (user.role === "REQUESTER") return <Navigate to="/tickets" replace />;
  return <Navigate to="/queue" replace />;
}