import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStaffDashboard, StaffDashboardData } from "../api.js";
import { useAuth } from "../context/AuthContext.js";

type LoadState = "loading" | "loaded" | "error";

const STATUS_BADGE: Record<string, string> = {
  NEW: "bg-secondary-subtle text-secondary-emphasis",
  OPEN: "bg-info-subtle text-info-emphasis",
  IN_PROGRESS: "bg-warning-subtle text-warning-emphasis",
  WAITING_FOR_REQUESTER: "bg-warning-subtle text-warning-emphasis",
  RESOLVED: "bg-success-subtle text-success-emphasis",
  CLOSED: "bg-secondary-subtle text-secondary-emphasis",
  REOPENED: "bg-danger-subtle text-danger-emphasis",
  CANCELLED: "bg-secondary-subtle text-secondary-emphasis",
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<StaffDashboardData | null>(null);

  useEffect(() => {
    setLoadState("loading");
    getStaffDashboard()
      .then((d) => { setData(d); setLoadState("loaded"); })
      .catch(() => setLoadState("error"));
  }, []);

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h4 mb-1">Welcome back, {user?.name}!</h1>
        <p className="text-muted small mb-0">Here's what's happening with your queue today.</p>
      </div>

      {loadState === "loading" && (
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div className="col-6 col-md" key={i}>
              <div className="card"><div className="card-body placeholder-glow">
                <span className="placeholder col-6 d-block mb-2" />
                <span className="placeholder col-4 d-block" style={{ height: "2rem" }} />
              </div></div>
            </div>
          ))}
        </div>
      )}

      {loadState === "error" && (
        <div className="alert alert-danger">Unable to load your dashboard right now. Please try again.</div>
      )}

      {loadState === "loaded" && data && user && (
        <>
          <div className="row g-3 mb-4">
            <DashboardCard label="New" value={data.metrics.new} to="/queue?status=NEW" />
            <DashboardCard label="Open" value={data.metrics.open} to="/queue?status=OPEN" />
            <DashboardCard label="In Progress" value={data.metrics.inProgress} to="/queue?status=IN_PROGRESS" />
            <DashboardCard label="Waiting for Requester" value={data.metrics.waitingForRequester} to="/queue?status=WAITING_FOR_REQUESTER" />
            <DashboardCard label="My Assigned" value={data.metrics.myAssigned} to={`/queue?owner=${user.id}`} />
          </div>

          <div className="row g-3">
            <div className="col-md-8">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <strong>My Recent Tickets</strong>
                  <Link to="/queue" className="small">View all</Link>
                </div>
                <div className="card-body">
                  {data.recentTickets.length === 0 && (
                    <p className="text-muted mb-0">No recent activity yet.</p>
                  )}
                  {data.recentTickets.map((t) => (
                    <Link key={t.id} to={`/queue/${t.id}`} className="d-flex justify-content-between align-items-center border-bottom py-2 text-decoration-none text-reset">
                      <div>
                        <div className="fw-semibold">{t.code}</div>
                        <div className="small text-muted">{t.title}</div>
                      </div>
                      <span className={`badge ${STATUS_BADGE[t.status] ?? "bg-secondary-subtle text-secondary-emphasis"}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-header"><strong>Quick Actions</strong></div>
                <div className="card-body d-flex flex-column gap-2">
                  <Link to="/queue" className="btn btn-outline-secondary">Search Tickets</Link>
                  <Link to={`/queue?owner=${user.id}`} className="btn btn-outline-secondary">My Queue</Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <div className="col-6 col-md">
      <Link to={to} className="text-decoration-none text-reset">
        <div className="card h-100">
          <div className="card-body">
            <div className="text-muted small">{label}</div>
            <div className="h3 mb-0">{value}</div>
          </div>
        </div>
      </Link>
    </div>
  );
}