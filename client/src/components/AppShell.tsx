import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <nav className="px-3 py-2" style={{ background: "#006B3C" }}>
        <div className="d-flex align-items-center justify-content-between">
          <Link to="/" className="text-white fw-bold text-decoration-none">TokTickIT</Link>
          <button
            className="btn btn-outline-light btn-sm d-md-none"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <div className="d-none d-md-flex align-items-center gap-4">
            {user?.role === "REQUESTER" && (
              <>
                <Link to="/tickets" className="text-white text-decoration-none">My Tickets</Link>
                <Link to="/create-ticket" className="text-white text-decoration-none">Create Ticket</Link>
              </>
            )}
            {(user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") && (
              <Link to="/queue" className="text-white text-decoration-none">My Queue</Link>
            )}
            {user?.role === "ADMINISTRATOR" && (
              <Link to="/admin/users" className="text-white text-decoration-none">Users</Link>
            )}
          </div>
          <div className="d-none d-md-flex align-items-center gap-2">
            <span className="text-white small">{user?.name} · {user?.role}</span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {menuOpen && (
          <div className="d-md-none d-flex flex-column gap-2 mt-2 pt-2 border-top border-light">
            {user?.role === "REQUESTER" && (
              <>
                <Link to="/tickets" className="text-white text-decoration-none" onClick={() => setMenuOpen(false)}>My Tickets</Link>
                <Link to="/create-ticket" className="text-white text-decoration-none" onClick={() => setMenuOpen(false)}>Create Ticket</Link>
              </>
            )}
            {(user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") && (
              <Link to="/queue" className="text-white text-decoration-none" onClick={() => setMenuOpen(false)}>My Queue</Link>
            )}
            {user?.role === "ADMINISTRATOR" && (
              <Link to="/admin/users" className="text-white text-decoration-none" onClick={() => setMenuOpen(false)}>Users</Link>
            )}
            <span className="text-white small">{user?.name} · {user?.role}</span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </nav>
      <Outlet />
    </>
  );
}