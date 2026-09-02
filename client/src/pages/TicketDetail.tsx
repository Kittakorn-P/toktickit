import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getTicketDetail,
  getAttachments,
  uploadAttachment,
  removeAttachment,
  downloadAttachment,
  TicketDetail as TicketDetailType,
  AttachmentMeta,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

type LoadState = "loading" | "loaded" | "not-found" | "error";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ACTIVE = 5;

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { requester } = useRequester();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketId = Number(id);

  async function loadAll() {
    if (!requester) return;
    try {
      const t = await getTicketDetail(requester.id, ticketId);
      if (!t) {
        setLoadState("not-found");
        return;
      }
      setTicket(t);
      const a = await getAttachments(requester.id, ticketId);
      setAttachments(a);
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requester, ticketId]);

  const activeCount = attachments.filter((a) => !a.isRemoved).length;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !requester) return;
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
      await uploadAttachment(requester.id, ticketId, file);
      await loadAll();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove(attachmentId: number) {
    if (!requester) return;
    if (!window.confirm("Remove this attachment? This cannot be undone.")) return;
    try {
      await removeAttachment(requester.id, attachmentId);
      await loadAll();
    } catch {
      setUploadError("Unable to remove attachment. Please try again.");
    }
  }

  async function handleDownload(attachmentId: number, filename: string) {
    if (!requester) return;
    try {
      await downloadAttachment(requester.id, attachmentId, filename);
    } catch {
      setUploadError("Unable to download attachment.");
    }
  }

  if (loadState === "loading") {
    return (
      <div className="container py-5">
        <p>Loading ticket…</p>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          Ticket not found. It may not exist or you may not have access to it.
        </div>
        <Link to="/tickets">← Back to My Tickets</Link>
      </div>
    );
  }

  if (loadState === "error" || !ticket) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Unable to load this ticket. Please try again.</div>
        <Link to="/tickets">← Back to My Tickets</Link>
      </div>
    );
  }

  const readOnlyStyle = { background: "#F3F1E8" };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <p>
        <Link to="/tickets">← Back to My Tickets</Link>
      </p>
      <h1 className="h4 mb-4">Ticket Detail</h1>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <label className="form-label">Ticket No.</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.ticketNumber} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Ticket Date</label>
          <input
            className="form-control"
            style={readOnlyStyle}
            disabled
            value={new Date(ticket.createdAt).toLocaleString()}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Category</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.category.name} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Related System</label>
          <input
            className="form-control"
            style={readOnlyStyle}
            disabled
            value={ticket.relatedSystem.name}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Requester</label>
          <input className="form-control" style={readOnlyStyle} disabled value={requester?.name ?? ""} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Requested Priority</label>
          <input
            className="form-control"
            style={readOnlyStyle}
            disabled
            value={ticket.requestedPriority}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Current Status</label>
          <input className="form-control" style={readOnlyStyle} disabled value={ticket.currentStatus} />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Summary</label>
        <p className="border rounded p-2 bg-white">{ticket.summary}</p>
      </div>
      <div className="mb-4">
        <label className="form-label">Description</label>
        <p className="border rounded p-2 bg-white" style={{ whiteSpace: "pre-wrap" }}>
          {ticket.description}
        </p>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Attachments</strong>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="d-none"
              id="attachment-upload"
              onChange={handleFileSelect}
              disabled={uploading || activeCount >= MAX_ACTIVE}
            />
            <label
              htmlFor="attachment-upload"
              className={`btn btn-sm btn-success ${
                uploading || activeCount >= MAX_ACTIVE ? "disabled" : ""
              }`}
            >
              {uploading ? "Uploading…" : "+ Add Attachment"}
            </label>
          </div>
        </div>
        <div className="card-body">
          {uploadError && <div className="alert alert-danger py-2">{uploadError}</div>}
          {activeCount >= MAX_ACTIVE && (
            <p className="text-muted small">Maximum of 5 active attachments reached.</p>
          )}

          {attachments.length === 0 && <p className="text-muted">No attachments yet.</p>}

          {attachments.map((a) => (
            <div
              key={a.id}
              className={`d-flex justify-content-between align-items-center border-bottom py-2 ${
                a.isRemoved ? "text-muted" : ""
              }`}
            >
              <span style={a.isRemoved ? { textDecoration: "line-through" } : {}}>
                {a.originalFilename}
                {a.isRemoved && <span className="badge bg-secondary ms-2">Removed</span>}
              </span>
              {!a.isRemoved && (
                <span>
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => handleDownload(a.id, a.originalFilename)}
                  >
                    Download
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleRemove(a.id)}
                  >
                    Remove
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}