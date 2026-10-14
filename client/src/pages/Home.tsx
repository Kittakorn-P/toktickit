import { Navigate } from "react-router-dom";

// LAB 4: Dashboard is now the landing page for every role (ui-spec.md §1),
// replacing the old per-role redirect (Requester -> /tickets, Admin ->
// /admin/users, IT Staff -> /queue). The Dashboard route itself picks which
// dashboard to render based on role.
export default function Home() {
  return <Navigate to="/dashboard" replace />;
}