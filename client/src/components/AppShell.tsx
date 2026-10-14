import { useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

// LAB 4: switched from plain Link to NavLink for every nav item so there's
// an actual active-page indication (ui-spec.md §1/§6 checklist) — the
// previous version had no active-state styling at all, for any item.
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-white text-decoration-none${isActive ? " fw-bold text-decoration-underline" : ""}`;

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
            {/* LAB 4: Dashboard nav item, same for every authenticated role */}
            <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
            {user?.role === "REQUESTER" && (
              <>
                <NavLink to="/tickets" className={navLinkClass}>My Tickets</NavLink>
                <NavLink to="/create-ticket" className={navLinkClass}>Create Ticket</NavLink>
              </>
            )}
            {(user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") && (
              <NavLink to="/queue" className={navLinkClass}>My Queue</NavLink>
            )}
            {user?.role === "ADMINISTRATOR" && (
              <NavLink to="/admin/users" className={navLinkClass}>Users</NavLink>
            )}
          </div>
          <div className="d-none d-md-flex align-items-center gap-2">
            <span className="text-white small">{user?.name} · {user?.role}</span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {menuOpen && (
          <div className="d-md-none d-flex flex-column gap-2 mt-2 pt-2 border-top border-light">
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
            {user?.role === "REQUESTER" && (
              <>
                <NavLink to="/tickets" className={navLinkClass} onClick={() => setMenuOpen(false)}>My Tickets</NavLink>
                <NavLink to="/create-ticket" className={navLinkClass} onClick={() => setMenuOpen(false)}>Create Ticket</NavLink>
              </>
            )}
            {(user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") && (
              <NavLink to="/queue" className={navLinkClass} onClick={() => setMenuOpen(false)}>My Queue</NavLink>
            )}
            {user?.role === "ADMINISTRATOR" && (
              <NavLink to="/admin/users" className={navLinkClass} onClick={() => setMenuOpen(false)}>Users</NavLink>
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