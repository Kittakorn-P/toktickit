import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  getRelatedSystems,
  createTicket,
  Category,
  RelatedSystem,
  FieldErrors,
  ValidationError,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

type SubmitState = "idle" | "submitting" | "error";

export default function CreateTicket() {
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [refDataError, setRefDataError] = useState(false);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [priority, setPriority] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    Promise.all([getCategories(), getRelatedSystems()])
      .then(([cats, systems]) => {
        setCategories(cats);
        setRelatedSystems(systems);
      })
      .catch(() => setRefDataError(true));
  }, []);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!summary.trim()) errors.summary = "Summary is required.";
    if (!description.trim()) errors.description = "Description is required.";
    if (!categoryId) errors.categoryId = "Category is required.";
    if (!relatedSystemId) errors.relatedSystemId = "Related System is required.";
    if (!priority) errors.requestedPriority = "Requested Priority is required.";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitState === "submitting" || !requester) return;

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitState("submitting");
    setFieldErrors({});
    setSubmitError("");

    try {
      const ticket = await createTicket(requester.id, {
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary,
        description,
        requestedPriority: priority,
      });
      navigate("/tickets", { state: { justCreated: ticket.ticketNumber } });
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.errors);
        setSubmitState("idle");
      } else {
        // BR-12: entered values remain in the form; only the error changes.
        setSubmitError("Something went wrong. Please try again.");
        setSubmitState("error");
      }
    }
  }

  if (refDataError) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          Unable to load reference data. Please refresh and try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-4">Create Ticket</h1>

      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Ticket Number</label>
            <input
              className="form-control"
              style={{ background: "#F3F1E8" }}
              disabled
              value="Will be generated on submit"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Ticket Date</label>
            <input
              className="form-control"
              style={{ background: "#F3F1E8" }}
              disabled
              value={new Date().toLocaleString()}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Requester</label>
          <input
            className="form-control"
            style={{ background: "#F3F1E8" }}
            disabled
            value={requester?.name ?? ""}
          />
        </div>

        <div className="row mb-3">
          <div className="col-md-4">
            <label htmlFor="category" className="form-label">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="category"
              className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              disabled={submitState === "submitting"}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              <option value="" disabled>
                -- Select --
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <div className="invalid-feedback d-block">{fieldErrors.categoryId}</div>
            )}
          </div>

          <div className="col-md-4">
            <label htmlFor="relatedSystem" className="form-label">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="relatedSystem"
              className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              disabled={submitState === "submitting"}
              onChange={(e) => setRelatedSystemId(Number(e.target.value))}
            >
              <option value="" disabled>
                -- Select --
              </option>
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.relatedSystemId && (
              <div className="invalid-feedback d-block">{fieldErrors.relatedSystemId}</div>
            )}
          </div>

          <div className="col-md-4">
            <label htmlFor="priority" className="form-label">
              Requested Priority <span className="text-danger">*</span>
            </label>
            <select
              id="priority"
              className={`form-select ${fieldErrors.requestedPriority ? "is-invalid" : ""}`}
              value={priority}
              disabled={submitState === "submitting"}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="" disabled>
                -- Select --
              </option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            {fieldErrors.requestedPriority && (
              <div className="invalid-feedback d-block">{fieldErrors.requestedPriority}</div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="summary" className="form-label">
            Summary <span className="text-danger">*</span>
          </label>
          <input
            id="summary"
            className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
            value={summary}
            disabled={submitState === "submitting"}
            onChange={(e) => setSummary(e.target.value)}
          />
          {fieldErrors.summary && (
            <div className="invalid-feedback d-block">{fieldErrors.summary}</div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="form-label">
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
            rows={5}
            value={description}
            disabled={submitState === "submitting"}
            onChange={(e) => setDescription(e.target.value)}
          />
          {fieldErrors.description && (
            <div className="invalid-feedback d-block">{fieldErrors.description}</div>
          )}
        </div>

        {submitState === "error" && (
          <div className="alert alert-danger">{submitError}</div>
        )}

        <button
          type="submit"
          className="btn btn-success"
          disabled={submitState === "submitting"}
        >
          {submitState === "submitting" ? "Submitting…" : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}