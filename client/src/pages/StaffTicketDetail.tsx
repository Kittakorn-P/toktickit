import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getStaffTicketDetail, claimTicket, updateItPriority, updateTicketStatus,
  getComments, postComment, getNotes, postNote,
  StaffTicketDetail as StaffTicketDetailType, CommentItem, NoteItem,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

type LoadState = "loading" | "loaded" | "not-found" | "error";
type Tab = "comments" | "notes";
const STATUSES = ["NEW","OPEN","IN_PROGRESS","WAITING_FOR_REQUESTER","RESOLVED","CLOSED","REOPENED","CANCELLED"];
const PRIORITIES = ["LOW","MEDIUM","HIGH"];

export default function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const ticketId = Number(id);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tab, setTab] = useState<Tab>("comments");
  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);

  async function loadAll() {
    try {
      const t = await getStaffTicketDetail(ticketId);
      if (!t) return setLoadState("not-found");
      setTicket(t);
      const [c, n] = await Promise.all([getComments(ticketId), getNotes(ticketId)]);
      setComments(c);
      setNotes(n);
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ticketId]);

  async function handleClaim() {
    if (!user) return;
    setSavingField("owner"); setActionError("");
    try { await claimTicket(ticketId, user.id); await loadAll(); }
    catch { setActionError("Unable to update ticket owner."); }
    finally { setSavingField(null); }
  }

  async function handlePriorityChange(value: string) {
    setSavingField("itPriority"); setActionError("");
    try { await updateItPriority(ticketId, value); await loadAll(); }
    catch { setActionError("Unable to update IT Priority."); }
    finally { setSavingField(null); }
  }

  async function handleStatusChange(value: string) {
    setSavingField("status"); setActionError("");
    try { await updateTicketStatus(ticketId, value); await loadAll(); }
    catch { setActionError("Unable to update status."); }
    finally { setSavingField(null); }
  }

  async function handlePostComment() {
    if (!newComment.trim()) return;
    try { await postComment(ticketId, newComment.trim()); setNewComment(""); setComments(await getComments(ticketId)); }
    catch { setActionError("Unable to post comment."); }
  }

  async function handlePostNote() {
    if (!newNote.trim()) return;
    try { await postNote(ticketId, newNote.trim()); setNewNote(""); setNotes(await getNotes(ticketId)); }
    catch { setActionError("Unable to post note."); }
  }

  if (loadState === "loading") return <div className="container py-5"><p>Loading ticket…</p></div>;
  if (loadState === "not-found") return (
    <div className="container py-5"><div className="alert alert-warning">Ticket not found.</div><Link to="/queue">← Back to Queue</Link></div>
  );
  if (loadState === "error" || !ticket) return (
    <div className="container py-5"><div className="alert alert-danger">Unable to load this ticket. Please try again.</div><Link to="/queue">← Back to Queue</Link></div>
  );

  const readOnlyStyle = { background: "#F3F1E8" };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <p><Link to="/queue">← Back to Queue</Link></p>
      <h1 className="h4 mb-4">Ticket Detail</h1>

      <div className="row g-3 mb-4">
        <div className="col-md-3"><label className="form-label">Ticket No.</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.ticketNumber} /></div>
        <div className="col-md-3"><label className="form-label">Category</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.category.name} /></div>
        <div className="col-md-3"><label className="form-label">Related System</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.relatedSystem.name} /></div>
        <div className="col-md-3"><label className="form-label">Requester</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.requester.name} /></div>

        <div className="col-md-3"><label className="form-label">Requested Priority</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.requestedPriority} /></div>
        <div className="col-md-3">
          <label className="form-label">Current Status</label>
          <select className="form-select" value={ticket.currentStatus} disabled={savingField === "status"}
            onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Ticket Owner</label>
          {ticket.owner ? (
            <input className="form-control" style={readOnlyStyle} disabled value={ticket.owner.name} />
          ) : (
            <button className="btn btn-success w-100" disabled={savingField === "owner"} onClick={handleClaim}>
              {savingField === "owner" ? "Claiming…" : "Claim Ticket"}
            </button>
          )}
        </div>
        <div className="col-md-3">
          <label className="form-label">IT Priority</label>
          <select className="form-select" value={ticket.itPriority} disabled={savingField === "itPriority"}
            onChange={(e) => handlePriorityChange(e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {actionError && <div className="alert alert-danger py-2">{actionError}</div>}

      <div className="mb-3"><label className="form-label">Summary</label>
        <p className="border rounded p-2 bg-white">{ticket.summary}</p></div>
      <div className="mb-4"><label className="form-label">Description</label>
        <p className="border rounded p-2 bg-white" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p></div>

      <div className="card">
        <div className="card-header d-flex gap-2">
          <button className={`btn btn-sm ${tab === "comments" ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setTab("comments")}>
            Public Comments ({comments.length})
          </button>
          <button className={`btn btn-sm ${tab === "notes" ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setTab("notes")}>
            Internal Notes ({notes.length})
          </button>
        </div>
        <div className="card-body">
          {tab === "comments" && (
            <>
              <div className="mb-3 d-flex gap-2">
                <input className="form-control" placeholder="Type your comment here…" value={newComment}
                  onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePostComment()} />
                <button className="btn btn-success" onClick={handlePostComment}>Post Comment</button>
              </div>
              {comments.length === 0 && <p className="text-muted">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="border-bottom py-2">
                  <div className="d-flex justify-content-between"><strong>{c.author.name}</strong>
                    <small className="text-muted">{new Date(c.createdAt).toLocaleString()}</small></div>
                  <p className="mb-0">{c.content}</p>
                </div>
              ))}
            </>
          )}
          {tab === "notes" && (
            <>
              <p className="text-muted small mb-2">Internal — not visible to Requester</p>
              <div className="mb-3 d-flex gap-2">
                <input className="form-control" placeholder="Add an internal note…" value={newNote}
                  onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePostNote()} />
                <button className="btn btn-success" onClick={handlePostNote}>Post Note</button>
              </div>
              {notes.length === 0 && <p className="text-muted">No internal notes yet.</p>}
              {notes.map((n) => (
                <div key={n.id} className="border-bottom py-2" style={{ background: "#FFF8E7", borderLeft: "3px solid #B9770E", paddingLeft: 8 }}>
                  <div className="d-flex justify-content-between"><strong>{n.author.name}</strong>
                    <small className="text-muted">{new Date(n.createdAt).toLocaleString()}</small></div>
                  <p className="mb-0">{n.content}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}