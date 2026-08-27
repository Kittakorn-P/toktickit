import { useRequester } from "../context/RequesterContext.js";
import { Navigate, Outlet } from "react-router-dom";

// AC-02: Given no Development Requester is selected, when the user attempts
// to open a Requester-scoped screen, then the Requester Selection screen is
// shown instead.
export default function RequireRequester() {
  const { requester } = useRequester();
  if (!requester) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
