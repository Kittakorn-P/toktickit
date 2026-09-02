import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRequesters, Requester } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

type LoadState = "loading" | "loaded" | "empty" | "error";

export default function RequesterSelection() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const { setRequester } = useRequester();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getRequesters()
      .then((data) => {
        if (cancelled) return;
        setRequesters(data);
        setLoadState(data.length === 0 ? "empty" : "loaded");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleContinue() {
    const chosen = requesters.find((r) => r.id === selectedId);
    if (chosen) {
      setRequester(chosen);
      navigate("/tickets");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="h4 mb-2">TokTickIT</h1>
      <p className="text-muted mb-4">
        Choose a development requester to simulate the current requester
        context for Lab 2. This is for testing only and is not a login screen.
        Authentication is introduced in Lab 3.
      </p>

      {loadState === "loading" && <p>Loading requesters…</p>}

      {loadState === "error" && (
        <div className="alert alert-danger">
          Unable to load Development Requesters. Please check your connection
          and try again.
        </div>
      )}

      {loadState === "empty" && (
        <div className="alert alert-warning">
          No active Development Requesters available — contact your
          instructor.
        </div>
      )}

      {loadState === "loaded" && (
        <>
          <label htmlFor="requester-select" className="form-label">
            Development Requester <span className="text-danger">*</span>
          </label>
          <select
            id="requester-select"
            className="form-select mb-3"
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            <option value="" disabled>
              -- Select a Requester --
            </option>
            {requesters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="alert alert-success py-2 small">
            Only active development requesters are shown.
          </div>

          <button
            className="btn btn-success"
            disabled={selectedId === ""}
            onClick={handleContinue}
          >
            Continue →
          </button>
        </>
      )}
    </div>
  );
}
