const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface Requester {
  id: number;
  name: string;
  email: string;
}

// Every request that needs ownership context should spread these headers in.
export function requesterHeaders(requesterId: number): HeadersInit {
  return { "X-Requester-Id": String(requesterId) };
}

// Issue 2 + Issue 4 — unchanged from Lab 1.
export async function checkSystem(): Promise<SystemStatus> {
  const res = await fetch(`${API_URL}/api/health`);
  const categories = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("API health have an issues");
  }
  if (!categories.ok) {
    throw new Error("API categories have an issues");
  }
  return { online: true, categories: await categories.json() };
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 7: Development Requester context
// ---------------------------------------------------------------------------
export async function getRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Unable to load Development Requesters");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 16: Create Ticket
// ---------------------------------------------------------------------------
export interface RelatedSystem {
  id: number;
  name: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldErrors {
  [field: string]: string;
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error("Unable to load categories");
  return res.json();
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) throw new Error("Unable to load related systems");
  return res.json();
}

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
}

export class ValidationError extends Error {
  errors: FieldErrors;
  constructor(errors: FieldErrors) {
    super("Validation failed");
    this.errors = errors;
  }
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const res = await authFetch("/api/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (res.status === 400) {
    const body = await res.json();
    throw new ValidationError(body.errors ?? {});
  }
  if (!res.ok) {
    throw new Error("Unable to create ticket. Please try again.");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 18: My Tickets
// ---------------------------------------------------------------------------
export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketListParams {
  search?: string;
  category?: number;
  requestedPriority?: string;
  status?: string;
  sort?: string;
  page?: number;
}

export async function getTickets(
  params: TicketListParams = {}
): Promise<{ tickets: TicketListItem[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", String(params.category));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));

  const res = await authFetch(`/api/tickets?${query.toString()}`);
  if (!res.ok) throw new Error("Unable to load tickets.");
  return res.json();
}

export interface TicketDetail extends Ticket {
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
}

export interface AttachmentMeta {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removedAt: string | null;
  createdAt: string;
}

export async function getTicketDetail(ticketId: number): Promise<TicketDetail | null> {
  const res = await authFetch(`/api/tickets/${ticketId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Unable to load ticket.");
  return res.json();
}

export async function getAttachments(ticketId: number): Promise<AttachmentMeta[]> {
  const res = await authFetch(`/api/tickets/${ticketId}/attachments`);
  if (!res.ok) throw new Error("Unable to load attachments.");
  const body = await res.json();
  return body.attachments;
}

export async function uploadAttachment(ticketId: number, file: File): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: formData, // authFetch skips Content-Type for FormData automatically
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Upload failed.");
  }
  return res.json();
}

export async function removeAttachment(attachmentId: number): Promise<void> {
  const res = await authFetch(`/api/attachments/${attachmentId}/remove`, { method: "PATCH" });
  if (!res.ok) throw new Error("Unable to remove attachment.");
}

export async function downloadAttachment(attachmentId: number, filename: string): Promise<void> {
  const res = await authFetch(`/api/attachments/${attachmentId}/download`);
  if (!res.ok) throw new Error("Unable to download attachment.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Lab 3 — Auth. All authenticated calls need credentials: "include" so the
// session cookie actually gets sent. None of the Lab 2 functions above do
// this — they don't need to, since they use the X-Requester-Id header, not
// a cookie. Every NEW function below goes through this helper instead.
// ---------------------------------------------------------------------------
async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
}

export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  role: Role;
  mustChangePassword: boolean;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: { id: number; name: string; role: Role }; mustChangePassword: boolean }> {
  const res = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? "Invalid email or password.");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await authFetch("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await authFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Unable to load current user.");
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await authFetch("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? "Unable to change password.");
  }
}

// ---------------------------------------------------------------------------
// Lab 3 — IT Staff Ticket Queue + Ticket Detail
// ---------------------------------------------------------------------------
export interface StaffTicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: { id: number; name: string };
  requestedPriority: string;
  itPriority: string;
  currentStatus: string;
  owner: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueParams {
  search?: string;
  category?: number;
  itPriority?: string;
  status?: string;
  owner?: string;
  sort?: string;
  page?: number;
}

export async function getStaffQueue(
  params: StaffQueueParams = {}
): Promise<{ tickets: StaffTicketListItem[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", String(params.category));
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.status) query.set("status", params.status);
  if (params.owner) query.set("owner", params.owner);
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));

  const res = await authFetch(`/api/staff/tickets?${query.toString()}`);
  if (!res.ok) throw new Error("Unable to load queue.");
  return res.json();
}

export interface StaffTicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  owner: { id: number; name: string } | null;
  requestedPriority: string;
  itPriority: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export async function getStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail | null> {
  const res = await authFetch(`/api/staff/tickets/${ticketId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Unable to load ticket.");
  return res.json();
}

export async function claimTicket(
  ticketId: number,
  ownerId: number
): Promise<{ id: number; owner: { id: number; name: string } }> {
  const res = await authFetch(`/api/staff/tickets/${ticketId}/claim`, {
    method: "PATCH",
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) throw new Error("Unable to update ticket owner.");
  return res.json();
}

export async function updateItPriority(ticketId: number, itPriority: string) {
  const res = await authFetch(`/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ itPriority }),
  });
  if (!res.ok) throw new Error("Unable to update priority.");
  return res.json();
}

export async function updateTicketStatus(ticketId: number, status: string) {
  const res = await authFetch(`/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Unable to update status.");
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Public Comments (shared) + Internal Notes (staff/admin only)
// ---------------------------------------------------------------------------
export interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; role: Role };
}

export async function getComments(ticketId: number): Promise<CommentItem[]> {
  const res = await authFetch(`/api/tickets/${ticketId}/comments`);
  if (!res.ok) throw new Error("Unable to load comments.");
  const body = await res.json();
  return body.comments;
}

export async function postComment(ticketId: number, content: string): Promise<CommentItem> {
  const res = await authFetch(`/api/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Unable to post comment.");
  return res.json();
}

export interface NoteItem {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string };
}

export async function getNotes(ticketId: number): Promise<NoteItem[]> {
  const res = await authFetch(`/api/tickets/${ticketId}/notes`);
  if (!res.ok) throw new Error("Unable to load notes.");
  const body = await res.json();
  return body.notes;
}

export async function postNote(ticketId: number, content: string): Promise<NoteItem> {
  const res = await authFetch(`/api/tickets/${ticketId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Unable to post note.");
  return res.json();
}