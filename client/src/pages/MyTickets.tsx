import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTickets, TicketListItem, PaginationMeta } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

type LoadState = "loading" | "loaded" | "error";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-success-subtle text-success-emphasis",
  MEDIUM: "bg-warning-subtle text-warning-emphasis",
  HIGH: "bg-danger-subtle text-danger-emphasis",
};

export default function MyTickets() {
  const { requester, setRequester } = useRequester();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = (location.state as { justCreated?: string } | null)?.justCreated;

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!requester) return;
    setLoadState("loading");
    getTickets(requester.id, {
      search: search || undefined,
      category: category ? Number(category) : undefined,
      requestedPriority: priority || undefined,
      status: status || undefined,
      sort,
      page,
    })
      .then((res) => {
        setTickets(res.tickets);
        setPagination(res.pagination);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, [requester, search, category, priority, status, sort, page]);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setPriority("");
    setStatus("");
    setSort("-createdAt");
    setPage(1);
  }

  function handleChangeRequester() {
    setRequester(null);
    navigate("/");
  }

  const hasActiveFilters = search || category || priority || status;
  const isTrulyEmpty = loadState === "loaded" && tickets.length === 0 && !hasActiveFilters;
  const isNoResults = loadState === "loaded" && tickets.length === 0 && !!hasActiveFilters;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-1">My Tickets</h1>
          <p className="text-muted small mb-0">
            Signed in as <strong>{requester?.name}</strong>{" "}
            <button className="btn btn-link p-0" onClick={handleChangeRequester}>
              (Change Requester)
            </button>
          </p>
        </div>
        <Link to="/create-ticket" className="btn btn-success">
          + Create Ticket
        </Link>
      </div>

      {justCreated && (
        <div className="alert alert-success">Ticket {justCreated} created successfully.</div>
      )}

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search by ticket number or summary"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={priority}
            onChange={(e) => {
              setPage(1);
              setPriority(e.target.value);
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="-updatedAt">Recently updated</option>
            <option value="ticketNumber">Ticket No. (A-Z)</option>
          </select>
        </div>
        <div className="col-md-2">
          <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {loadState === "loading" && <p>Loading tickets…</p>}
      {loadState === "error" && (
        <div className="alert alert-danger">Unable to load tickets. Please try again.</div>
      )}

      {isTrulyEmpty && (
        <div className="alert alert-info">
          You haven't created any tickets yet.{" "}
          <Link to="/create-ticket">Create your first ticket</Link>.
        </div>
      )}

      {isNoResults && (
        <div className="alert alert-warning">
          No tickets match your search/filters.{" "}
          <button className="btn btn-link p-0" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {loadState === "loaded" && tickets.length > 0 && (
        <>
          {/* Desktop table */}
          <table className="table d-none d-md-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Summary</th>
                <th>Category</th>
                <th>Requested Priority</th>
                <th>Current Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/tickets/${t.id}`)}>
                  <td>{t.ticketNumber}</td>
                  <td>{t.summary}</td>
                  <td>{t.category.name}</td>
                  <td>
                    <span className={`badge ${PRIORITY_BADGE[t.requestedPriority]}`}>
                      {t.requestedPriority}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis">
                      {t.currentStatus}
                    </span>
                  </td>
                  <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="d-md-none">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card mb-2"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <strong>{t.ticketNumber}</strong>
                    <span className="badge bg-secondary-subtle text-secondary-emphasis">
                      {t.currentStatus}
                    </span>
                  </div>
                  <p className="mb-1">{t.summary}</p>
                  <small className="text-muted">
                    Updated {new Date(t.updatedAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <nav className="d-flex justify-content-between align-items-center mt-3">
              <button
                className="btn btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-outline-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}