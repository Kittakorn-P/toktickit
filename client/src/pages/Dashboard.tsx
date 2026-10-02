import { useAuth } from "../context/AuthContext.js";
import RequesterDashboard from "./RequesterDashboard.js";
import StaffDashboard from "./StaffDashboard.js";

// LAB 4 — single /dashboard route, role-branched here rather than in App.tsx
// routing, so there's one URL for every role to land on (ui-spec.md §1).
// Administrator reuses the IT Staff dashboard per the handout (§6).
export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "REQUESTER") return <RequesterDashboard />;
  return <StaffDashboard />;
}