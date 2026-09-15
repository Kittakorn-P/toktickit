import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.js";
import RequireAuth from "./pages/RequireAuth.js";
import AppShell from "./components/AppShell.js";
import Login from "./pages/Login.js";
import ChangePassword from "./pages/ChangePassword.js";
import MyTickets from "./pages/MyTickets.js";
import CreateTicket from "./pages/CreateTicket.js";
import TicketDetail from "./pages/TicketDetail.js";
import StaffQueue from "./pages/StaffQueue.js";
import StaffTicketDetail from "./pages/StaffTicketDetail.js";
import HealthCheck from "./pages/HealthCheck.js";
import Home from "./pages/Home.js";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/health" element={<HealthCheck />} />

          <Route element={<RequireAuth />}>
            <Route path="/change-password" element={<ChangePassword />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={["REQUESTER"]} />}>
            <Route element={<AppShell />}>
              <Route path="/tickets" element={<MyTickets />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/create-ticket" element={<CreateTicket />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={["IT_STAFF", "ADMINISTRATOR"]} />}>
            <Route element={<AppShell />}>
              <Route path="/queue" element={<StaffQueue />} />
              <Route path="/queue/:id" element={<StaffTicketDetail />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}