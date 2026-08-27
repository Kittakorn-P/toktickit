import { useRequester } from "../context/RequesterContext.js";
import { useNavigate } from "react-router-dom";

// TEMPORARY placeholder — real My Tickets list is built in Issue 11.
// This exists now only to prove Requester context + routing work end to end.
export default function MyTicketsPlaceholder() {
  const { requester, setRequester } = useRequester();
  const navigate = useNavigate();

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
      <p className="text-muted">My Tickets list — coming in Issue 11.</p>
    </div>
  );
}
