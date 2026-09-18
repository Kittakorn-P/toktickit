import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { changePassword } from "../api.js";

export default function ChangePassword() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const rules = {
    length: next.length >= 8,
    upperLower: /[a-z]/.test(next) && /[A-Z]/.test(next),
    numberSpecial: /\d/.test(next) && /[^A-Za-z0-9]/.test(next),
  };
  const allRulesPass = rules.length && rules.upperLower && rules.numberSpecial;
  const matches = next.length > 0 && next === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!allRulesPass) return setError("Password does not meet the requirements below.");
    if (!matches) return setError("New password and confirmation do not match.");
    setBusy(true);
    try {
      await changePassword(current, next);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 400 }}>
      <div className="card">
        <div className="card-body">
          <h1 className="h5 mb-1">Change Your Password</h1>
          <p className="text-muted small mb-4">You must change your password to continue.</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="currentPassword">Current (temporary) password</label>
              <input id="currentPassword" type="password" className="form-control" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="newPassword">New password</label>
              <input id="newPassword" type="password" className="form-control" value={next} onChange={(e) => setNext(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="confirmPassword">Confirm new password</label>
              <input id="confirmPassword" type="password" className="form-control" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <ul className="list-unstyled small mb-3">
              <li className={rules.length ? "text-success" : "text-muted"}>{rules.length ? "✓" : "○"} At least 8 characters</li>
              <li className={rules.upperLower ? "text-success" : "text-muted"}>{rules.upperLower ? "✓" : "○"} Upper and lower case letters</li>
              <li className={rules.numberSpecial ? "text-success" : "text-muted"}>{rules.numberSpecial ? "✓" : "○"} A number and a special character</li>
            </ul>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button type="submit" className="btn btn-success w-100" disabled={busy || !allRulesPass || !matches}>
              {busy ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}