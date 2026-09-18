import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  getAdminUsers, createAdminUser, updateAdminUser, setAdminUserPassword,
  AdminUser, Role, ValidationError,
} from "../api.js";

type LoadState = "loading" | "loaded" | "error";
type PanelMode = "closed" | "create" | "edit";

const ROLE_BADGE: Record<Role, string> = {
  REQUESTER: "bg-secondary-subtle text-secondary-emphasis",
  IT_STAFF: "bg-primary-subtle text-primary-emphasis",
  ADMINISTRATOR: "bg-dark text-white",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");

  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  async function loadUsers() {
    setLoadState("loading");
    try {
      const data = await getAdminUsers({ search: search || undefined, role: roleFilter || undefined });
      setUsers(data);
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => { loadUsers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, roleFilter]);

  function openCreate() {
    setEditingUser(null);
    setPanelMode("create");
  }

  function openEdit(u: AdminUser) {
    setEditingUser(u);
    setPanelMode("edit");
  }

  function closePanel() {
    setPanelMode("closed");
    setEditingUser(null);
  }

  async function handleSaved() {
    closePanel();
    await loadUsers();
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className={panelMode === "closed" ? "col-12" : "col-md-8"}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="h4 mb-0">Users</h1>
            <button className="btn btn-success" onClick={openCreate}>+ Create User</button>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input className="form-control" placeholder="Search users…" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "")}>
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
          </div>

          {loadState === "loading" && <p>Loading users…</p>}
          {loadState === "error" && <div className="alert alert-danger">Unable to load users. Please try again.</div>}
          {loadState === "loaded" && users.length === 0 && <div className="alert alert-info">No users match your search/filters.</div>}

          {loadState === "loaded" && users.length > 0 && (
            <div className="table-responsive">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role.replace("_", " ")}</span></td>
                    <td>
                      <span className={`badge ${u.isActive ? "bg-success-subtle text-success-emphasis" : "bg-danger-subtle text-danger-emphasis"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td><button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(u)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {panelMode !== "closed" && (
          <div className="col-md-4">
            <UserPanel
              mode={panelMode}
              user={editingUser}
              currentUserId={currentUser!.id}
              onSaved={handleSaved}
              onCancel={closePanel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface UserPanelProps {
  mode: "create" | "edit";
  user: AdminUser | null;
  currentUserId: number;
  onSaved: () => void;
  onCancel: () => void;
}

function UserPanel({ mode, user, currentUserId, onSaved, onCancel }: UserPanelProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "REQUESTER");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [initialPassword, setInitialPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSelf = mode === "edit" && user?.id === currentUserId;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setBusy(true);
    try {
      if (mode === "create") {
        await createAdminUser({ name, email, role, isActive, initialPassword });
      } else {
        await updateAdminUser(user!.id, { name, email, role, isActive });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.errors);
      } else {
        setError(err instanceof Error ? err.message : "Unable to save user.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivateToggle() {
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      await updateAdminUser(user.id, { isActive: !user.isActive });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPassword() {
    if (!user || !newPassword) return;
    setError("");
    setBusy(true);
    try {
      await setAdminUserPassword(user.id, newPassword);
      setNewPassword("");
      setError("");
      alert("New initial password set. User must change it at next login.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set new password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <strong>{mode === "create" ? "Create New User" : "Edit User"}</strong>
        <button className="btn-close" onClick={onCancel}></button>
      </div>
      <div className="card-body">
        <form onSubmit={handleSave}>
        <div className="mb-3">
          <label className="form-label" htmlFor="userName">Full Name <span className="text-danger">*</span></label>
          <input id="userName" className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`} value={name}
          onChange={(e) => setName(e.target.value)} required />
          {fieldErrors.name && <div className="invalid-feedback d-block">{fieldErrors.name}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="userEmail">Email Address <span className="text-danger">*</span></label>
          <input id="userEmail" type="email" className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`} value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          {fieldErrors.email && <div className="invalid-feedback d-block">{fieldErrors.email}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="userRole">Role <span className="text-danger">*</span></label>
          <select id="userRole" className="form-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="REQUESTER">Requester</option>
            <option value="IT_STAFF">IT Staff</option>
            <option value="ADMINISTRATOR">Administrator</option>
          </select>
        </div>
          <div className="mb-3 form-check form-switch">
            <input className="form-check-input" type="checkbox" checked={isActive} disabled={isSelf}
              onChange={(e) => setIsActive(e.target.checked)} id="activeToggle" />
            <label className="form-check-label" htmlFor="activeToggle">Active</label>
            {isSelf && <div className="form-text">You cannot deactivate your own account.</div>}
          </div>

          {mode === "create" && (
            <div className="mb-3">
              <label className="form-label" htmlFor="initialPassword">Initial Password <span className="text-danger">*</span></label>
              <input id="initialPassword" type="text" className={`form-control ${fieldErrors.initialPassword ? "is-invalid" : ""}`}
                value={initialPassword} onChange={(e) => setInitialPassword(e.target.value)} required />
              {fieldErrors.initialPassword && <div className="invalid-feedback d-block">{fieldErrors.initialPassword}</div>}
            <div className="form-text">User must change this password at first login.</div>
          </div>
          )}

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <button type="submit" className="btn btn-success w-100 mb-2" disabled={busy}>
            {busy ? "Saving…" : "Save User"}
          </button>
        </form>

        {mode === "edit" && (
          <>
            <hr />
            <div className="mb-3">
              <label className="form-label">Set New Initial Password</label>
              <div className="d-flex gap-2">
                <input type="text" className="form-control" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
                <button className="btn btn-outline-secondary" disabled={busy || !newPassword} onClick={handleSetPassword}>
                  Set
                </button>
              </div>
              <div className="form-text">User must change this password at next login.</div>
            </div>

            <button
              className={`btn w-100 ${user!.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
              disabled={busy || isSelf}
              onClick={handleDeactivateToggle}
            >
              {user!.isActive ? "Deactivate User" : "Activate User"}
            </button>
          </>
        )}

        <button type="button" className="btn btn-link w-100 mt-2" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}