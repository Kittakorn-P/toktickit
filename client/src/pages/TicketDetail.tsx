import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getTicketDetail, getAttachments, uploadAttachment, removeAttachment, downloadAttachment,
  getComments, postComment,
  TicketDetail as TicketDetailType, AttachmentMeta, CommentItem,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

type LoadState = "loading" | "loaded" | "not-found" | "error";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ACTIVE = 5;

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [resolvedNoted, setResolvedNoted] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketId = Number(id);

  async function loadAll() {
    try {
      const t = await getTicketDetail(ticketId);
      if (!t) return setLoadState("not-found");
      setTicket(t);
      const [a, c] = await Promise.all([getAttachments(ticketId), getComments(ticketId)]);
      setAttachments(a);
      setComments(c);
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ticketId]);

  const activeCount = attachments.filter((a) => !a.isRemoved).length;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Allowed: JPG, PNG, WEBP, PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("File exceeds 5MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (activeCount >= MAX_ACTIVE) {
      setUploadError("Maximum of 5 active attachments reached.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      await uploadAttachment(ticketId, file);
      await loadAll();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove(attachmentId: number) {
    if (!window.confirm("Remove this attachment? This cannot be undone.")) return;
    try {
      await removeAttachment(attachmentId);
      await loadAll();
    } catch {
      setUploadError("Unable to remove attachment. Please try again.");
    }
  }

  async function handleDownload(attachmentId: number, filename: string) {
    try {
      await downloadAttachment(attachmentId, filename);
    } catch {
      setUploadError("Unable to download attachment.");
    }
  }

  async function handlePostComment() {
    if (!newComment.trim()) return;
    try {
      await postComment(ticketId, newComment.trim());
      setNewComment("");
      setComments(await getComments(ticketId));
    } catch {
      setUploadError("Unable to post comment.");
    }
  }

  // BR-05: this only posts a Public Comment noting the Requester's
  // observation — it never changes currentStatus. Only IT Staff/Admin can
  // do that, via the staff-only status endpoint.
  async function handleMarkResolved() {
    try {
      await postComment(ticketId, "Requester has indicated this problem appears resolved.");
      setComments(await getComments(ticketId));
      setResolvedNoted(true);
    } catch {
      setUploadError("Unable to submit. Please try again.");
    }
  }

  if (loadState === "loading") return <div className="container py-5"><p>Loading ticket…</p></div>;
  if (loadState === "not-found") return (
    <div className="container py-5">
      <div className="alert alert-warning">Ticket not found. It may not exist or you may not have access to it.</div>
      <Link to="/tickets">← Back to My Tickets</Link>
    </div>
  );
  if (loadState === "error" || !ticket) return (
    <div className="container py-5">
      <div className="alert alert-danger">Unable to load this ticket. Please try again.</div>
      <Link to="/tickets">← Back to My Tickets</Link>
    </div>
  );

  const readOnlyStyle = { background: "#F3F1E8" };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <p><Link to="/tickets">← Back to My Tickets</Link></p>
      <h1 className="h4 mb-4">Ticket Detail</h1>

      <div className="row g-3 mb-4">
        <div className="col-md-3"><label className="form-label">Ticket No.</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.ticketNumber} /></div>
        <div className="col-md-3"><label className="form-label">Ticket Date</label>
          <input className="form-control" style={readOnlyStyle} disabled value={new Date(ticket.createdAt).toLocaleString()} /></div>
        <div className="col-md-3"><label className="form-label">Category</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.category.name} /></div>
        <div className="col-md-3"><label className="form-label">Related System</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.relatedSystem.name} /></div>
        <div className="col-md-4"><label className="form-label">Requester</label>
          <input className="form-control" style={readOnlyStyle} disabled value={user?.name ?? ""} /></div>
        <div className="col-md-4"><label className="form-label">Requested Priority</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.requestedPriority} /></div>
        <div className="col-md-4"><label className="form-label">Current Status</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.currentStatus.replace(/_/g, " ")} /></div>
      </div>

      <div className="mb-3"><label className="form-label">Summary</label>
        <p className="border rounded p-2 bg-white">{ticket.summary}</p></div>
      <div className="mb-3"><label className="form-label">Description</label>
        <p className="border rounded p-2 bg-white" style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p></div>

      <div className="mb-4">
        <button className="btn btn-outline-success" disabled={resolvedNoted} onClick={handleMarkResolved}>
          {resolvedNoted ? "✓ Marked as appears resolved" : "Mark Problem as Resolved"}
        </button>
        {resolvedNoted && <p className="text-muted small mt-1">Thanks — IT Staff will confirm final resolution.</p>}
      </div>

      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Attachments</strong>
          <div>
            <input ref={fileInputRef} type="file" className="d-none" id="attachment-upload" onChange={handleFileSelect}
              disabled={uploading || activeCount >= MAX_ACTIVE} />
            <label htmlFor="attachment-upload" className={`btn btn-sm btn-success ${uploading || activeCount >= MAX_ACTIVE ? "disabled" : ""}`}>
              {uploading ? "Uploading…" : "+ Add Attachment"}
            </label>
          </div>
        </div>
        <div className="card-body">
          {uploadError && <div className="alert alert-danger py-2">{uploadError}</div>}
          {activeCount >= MAX_ACTIVE && <p className="text-muted small">Maximum of 5 active attachments reached.</p>}
          {attachments.length === 0 && <p className="text-muted">No attachments yet.</p>}
          {attachments.map((a) => (
            <div key={a.id} className={`d-flex justify-content-between align-items-center border-bottom py-2 ${a.isRemoved ? "text-muted" : ""}`}>
              <span style={a.isRemoved ? { textDecoration: "line-through" } : {}}>
                {a.originalFilename}{a.isRemoved && <span className="badge bg-secondary ms-2">Removed</span>}
              </span>
              {!a.isRemoved && (
                <span>
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleDownload(a.id, a.originalFilename)}>Download</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(a.id)}>Remove</button>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><strong>Public Comments ({comments.length})</strong></div>
        <div className="card-body">
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
        </div>
      </div>
    </div>
  );
}