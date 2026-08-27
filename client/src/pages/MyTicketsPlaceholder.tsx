import { useRequester } from "../context/RequesterContext.js";
import { useNavigate, Link, useLocation } from "react-router-dom";

// TEMPORARY placeholder — real My Tickets list is built in Issue 18.
// This exists now only to prove Requester context + routing work end to end.
export default function MyTicketsPlaceholder() {
  const { requester, setRequester } = useRequester();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = (location.state as { justCreated?: string } | null)?.justCreated;

  function handleChangeRequester() {
    setRequester(null);
    navigate("/");
  }

  return (
    <div className="container py-5">
      <p>
        Signed in as <strong>{requester?.name}</strong>{" "}
        <button className="btn btn-link p-0" onClick={handleChangeRequester}>
          (Change Requester)
        </button>
      </p>
      {justCreated && (
        <div className="alert alert-success">
          Ticket {justCreated} created successfully.
        </div>
      )}
      <p>
        <Link to="/create-ticket" className="btn btn-success">
          + Create Ticket
        </Link>
      </p>
      <p className="text-muted">My Tickets list — coming in Issue 18.</p>
    </div>
  );
}