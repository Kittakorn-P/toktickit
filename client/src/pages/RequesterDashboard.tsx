import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRequesterDashboard, RequesterDashboardData } from "../api.js";
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

export default function RequesterDashboard() {
  const { user } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<RequesterDashboardData | null>(null);

  useEffect(() => {
    setLoadState("loading");
    getRequesterDashboard()
      .then((d) => { setData(d); setLoadState("loaded"); })
      .catch(() => setLoadState("error"));
  }, []);

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h4 mb-1">Welcome back, {user?.name}!</h1>
        <p className="text-muted small mb-0">Here's the latest on your requests.</p>
      </div>

      {loadState === "loading" && (
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div className="col-6 col-md-3" key={i}>
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

      {loadState === "loaded" && data && (
        <>
          <div className="row g-3 mb-4">
            <DashboardCard label="My Open Tickets" value={data.metrics.myOpen} to="/tickets?status=NEW,OPEN,REOPENED" />
            <DashboardCard label="In Progress" value={data.metrics.inProgress} to="/tickets?status=IN_PROGRESS,WAITING_FOR_REQUESTER" />
            <DashboardCard label="Resolved" value={data.metrics.resolved} to="/tickets?status=RESOLVED" />
            <DashboardCard label="Closed" value={data.metrics.closed} to="/tickets?status=CLOSED" />
          </div>

          <div className="row g-3">
            <div className="col-md-8">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <strong>My Recent Tickets</strong>
                  <Link to="/tickets" className="small">View all</Link>
                </div>
                <div className="card-body">
                  {data.recentTickets.length === 0 && (
                    <p className="text-muted mb-0">No recent activity yet.</p>
                  )}
                  {data.recentTickets.map((t) => (
                    <Link key={t.id} to={`/tickets/${t.id}`} className="d-flex justify-content-between align-items-center border-bottom py-2 text-decoration-none text-reset">
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
                  <Link to="/create-ticket" className="btn btn-success">+ Create Ticket</Link>
                  <Link to="/tickets" className="btn btn-outline-secondary">View My Tickets</Link>
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
    <div className="col-6 col-md-3">
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