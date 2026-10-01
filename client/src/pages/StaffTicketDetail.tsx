import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getStaffTicketDetail, claimTicket, updateItPriority, updateTicketStatus,
  getComments, postComment, getNotes, postNote,
  getStaffTicketActions, createAction, updateAction,
  StaffTicketDetail as StaffTicketDetailType, CommentItem, NoteItem, ActionTaken,
  ValidationError, ConflictError, FieldErrors,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";
import { allowedTransitions, TERMINAL_STATUSES, TicketStatus } from "../utils/ticketTransitions.js";

type LoadState = "loading" | "loaded" | "not-found" | "error";
type Tab = "comments" | "notes";
const PRIORITIES = ["LOW","MEDIUM","HIGH"];

export default function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const ticketId = Number(id);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [actions, setActions] = useState<ActionTaken[]>([]); // LAB 4
  const [tab, setTab] = useState<Tab>("comments");
  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);

  // LAB 4 — Actions Taken form state
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [formDescription, setFormDescription] = useState("");
  const [formResult, setFormResult] = useState("");
  const [formFollowUpRequired, setFormFollowUpRequired] = useState(false);
  const [formFollowUpNote, setFormFollowUpNote] = useState("");
  const [formAttachmentNotes, setFormAttachmentNotes] = useState("");
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  async function loadAll() {
    try {
      const t = await getStaffTicketDetail(ticketId);
      if (!t) return setLoadState("not-found");
      setTicket(t);
      const [c, n, a] = await Promise.all([
        getComments(ticketId),
        getNotes(ticketId),
        getStaffTicketActions(ticketId), // LAB 4
      ]);
      setComments(c);
      setNotes(n);
      setActions(a);
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

  // LAB 4: passes the ticket's current updatedAt for optimistic concurrency,
  // and tells a stale-data conflict apart from an invalid transition.
  async function handleStatusChange(value: string) {
    if (!ticket) return;
    setSavingField("status"); setActionError("");
    try {
      await updateTicketStatus(ticketId, value, ticket.updatedAt);
      await loadAll();
    } catch (err) {
      if (err instanceof ConflictError) {
        setActionError("This ticket was updated elsewhere — refreshed with the latest data.");
        await loadAll();
      } else {
        setActionError(err instanceof Error ? err.message : "Unable to update status.");
      }
    } finally {
      setSavingField(null);
    }
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

  // ---------------------------------------------------------------------
  // LAB 4 — Actions Taken
  // ---------------------------------------------------------------------
  function openAddActionForm() {
    setEditingActionId(null);
    setFormDescription("");
    setFormResult("");
    setFormFollowUpRequired(false);
    setFormFollowUpNote("");
    setFormAttachmentNotes("");
    setFormErrors({});
    setShowActionForm(true);
  }

  function openEditActionForm(a: ActionTaken) {
    setEditingActionId(a.id);
    setFormDescription(a.description);
    setFormResult(a.result);
    setFormFollowUpRequired(a.followUpRequired);
    setFormFollowUpNote(a.followUpNote ?? "");
    setFormAttachmentNotes(a.attachmentNotes ?? "");
    setFormErrors({});
    setShowActionForm(true);
  }

  function closeActionForm() {
    setShowActionForm(false);
    setEditingActionId(null);
    setFormErrors({});
  }

  // Submit button is disabled while formSubmitting is true, and this guard
  // is a second line of defense against a double-click firing two submits
  // before the first re-render lands (review-fix backstop also exists
  // server-side for the create case).
  async function handleSubmitAction() {
    if (formSubmitting) return;
    setFormSubmitting(true);
    setFormErrors({});
    try {
      if (editingActionId !== null) {
        const current = actions.find((a) => a.id === editingActionId);
        if (!current) throw new Error("This action is no longer available. Refreshing…");
        await updateAction(ticketId, editingActionId, {
          description: formDescription.trim(),
          result: formResult.trim(),
          followUpRequired: formFollowUpRequired,
          followUpNote: formFollowUpRequired ? formFollowUpNote.trim() : null,
          attachmentNotes: formAttachmentNotes.trim() || null,
          updatedAt: current.updatedAt,
        });
      } else {
        await createAction(ticketId, {
          description: formDescription.trim(),
          result: formResult.trim(),
          followUpRequired: formFollowUpRequired,
          followUpNote: formFollowUpRequired ? formFollowUpNote.trim() : undefined,
          attachmentNotes: formAttachmentNotes.trim() || undefined,
        });
      }
      closeActionForm();
      await loadAll();
    } catch (err) {
      if (err instanceof ValidationError) {
        setFormErrors(err.errors);
      } else if (err instanceof ConflictError) {
        setFormErrors({ _: "This action was updated elsewhere — refreshing." });
        await loadAll();
      } else {
        setFormErrors({ _: err instanceof Error ? err.message : "Unable to save action." });
      }
    } finally {
      setFormSubmitting(false);
    }
  }

  if (loadState === "loading") return <div className="container py-5"><p>Loading ticket…</p></div>;
  if (loadState === "not-found") return (
    <div className="container py-5"><div className="alert alert-warning">Ticket not found.</div><Link to="/queue">← Back to Queue</Link></div>
  );
  if (loadState === "error" || !ticket) return (
    <div className="container py-5"><div className="alert alert-danger">Unable to load this ticket. Please try again.</div><Link to="/queue">← Back to Queue</Link></div>
  );

  const readOnlyStyle = { background: "#F3F1E8" };
  const currentStatus = ticket.currentStatus as TicketStatus;
  const nextStatusOptions = user ? allowedTransitions(currentStatus, user.role) : [];
  const statusSelectDisabled = savingField === "status" || nextStatusOptions.length === 0;
  const ticketIsTerminal = TERMINAL_STATUSES.includes(currentStatus);

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
          <label className="form-label">
            Current Status
            {ticket.looksResolvedByRequester && (
              <span className="badge bg-info text-dark ms-2">Requester indicates resolved</span>
            )}
          </label>
          <select className="form-select" data-testid="status-select" value={currentStatus} disabled={statusSelectDisabled}
            onChange={(e) => handleStatusChange(e.target.value)}>
            <option value={currentStatus}>{currentStatus.replace(/_/g, " ")}</option>
            {nextStatusOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          {nextStatusOptions.length === 0 && (
            <div className="form-text">No further transitions available from this status.</div>
          )}
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

      {/* LAB 4 — Actions Taken */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Actions Taken ({actions.length})</strong>
          {!ticketIsTerminal && !showActionForm && (
            <button className="btn btn-sm btn-success" onClick={openAddActionForm}>+ Add Action</button>
          )}
        </div>
        <div className="card-body">
          {ticketIsTerminal && (
            <p className="text-muted small">
              This ticket is {currentStatus.toLowerCase()} — actions can no longer be added or edited.
            </p>
          )}

          {showActionForm && (
            <div className="border rounded p-3 mb-3 bg-white">
              <h2 className="h6">{editingActionId !== null ? "Edit Action" : "Add Action"}</h2>
              {formErrors._ && <div className="alert alert-danger py-2">{formErrors._}</div>}

              <div className="mb-2">
                <label className="form-label" htmlFor="action-description">Action Description</label>
                <textarea id="action-description" className="form-control" rows={2}
                  value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                {formErrors.description && <div className="text-danger small">{formErrors.description}</div>}
              </div>

              <div className="mb-2">
                <label className="form-label" htmlFor="action-result">Result</label>
                <textarea id="action-result" className="form-control" rows={2}
                  value={formResult} onChange={(e) => setFormResult(e.target.value)} />
                {formErrors.result && <div className="text-danger small">{formErrors.result}</div>}
              </div>

              <div className="mb-2 form-check">
                <input type="checkbox" className="form-check-input" id="action-followup"
                  checked={formFollowUpRequired} onChange={(e) => setFormFollowUpRequired(e.target.checked)} />
                <label className="form-check-label" htmlFor="action-followup">Follow-Up Required?</label>
              </div>

              {formFollowUpRequired && (
                <div className="mb-2">
                  <label className="form-label" htmlFor="action-followup-note">Follow-up Note</label>
                  <textarea id="action-followup-note" className="form-control" rows={2}
                    value={formFollowUpNote} onChange={(e) => setFormFollowUpNote(e.target.value)} />
                  {formErrors.followUpNote && <div className="text-danger small">{formErrors.followUpNote}</div>}
                </div>
              )}
              {/* Defensive fallback: if the API ever returns a followUpNote
                  error while the checkbox is unchecked (shouldn't normally
                  happen, since the server only validates it when
                  followUpRequired is true), still surface it instead of
                  silently swallowing it. */}
              {!formFollowUpRequired && formErrors.followUpNote && (
                <div className="text-danger small mb-2">{formErrors.followUpNote}</div>
              )}

              <div className="mb-3">
                <label className="form-label" htmlFor="action-attachment-notes">Attachment Notes</label>
                <input id="action-attachment-notes" className="form-control"
                  placeholder="e.g. see screenshot IMG_0231.jpg in ticket folder"
                  value={formAttachmentNotes} onChange={(e) => setFormAttachmentNotes(e.target.value)} />
                {formErrors.attachmentNotes && <div className="text-danger small">{formErrors.attachmentNotes}</div>}
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-success" disabled={formSubmitting} onClick={handleSubmitAction}>
                  {formSubmitting ? "Saving…" : editingActionId !== null ? "Save Changes" : "Add Action"}
                </button>
                <button className="btn btn-outline-secondary" disabled={formSubmitting} onClick={closeActionForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actions.length === 0 && !showActionForm && <p className="text-muted">No actions recorded yet.</p>}
          {actions.map((a) => (
            <div key={a.id} className="border-bottom py-2">
              <div className="d-flex justify-content-between align-items-start">
                <strong>{new Date(a.actionDateTime).toLocaleString()}</strong>
                {a.followUpRequired ? (
                  <span className="badge bg-warning text-dark">⚠ Follow-up needed</span>
                ) : (
                  <span className="badge bg-secondary">✓ No follow-up</span>
                )}
              </div>
              <p className="mb-1"><strong>Description:</strong> {a.description}</p>
              <p className="mb-1"><strong>Result:</strong> {a.result}</p>
              {a.followUpRequired && a.followUpNote && (
                <p className="mb-1"><strong>Follow-up note:</strong> {a.followUpNote}</p>
              )}
              {a.attachmentNotes && (
                <p className="mb-1 text-muted"><strong>Attachment notes:</strong> {a.attachmentNotes}</p>
              )}
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Performed by {a.performedBy.name}</small>
                {!ticketIsTerminal && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditActionForm(a)}>Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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