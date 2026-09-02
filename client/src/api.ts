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

export async function createTicket(
  requesterId: number,
  input: CreateTicketInput
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...requesterHeaders(requesterId),
    },
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
  requesterId: number,
  params: TicketListParams = {}
): Promise<{ tickets: TicketListItem[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", String(params.category));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: requesterHeaders(requesterId),
  });
  if (!res.ok) throw new Error("Unable to load tickets.");
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 — Issue 19: Ticket Detail + Attachments
// ---------------------------------------------------------------------------
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

export async function getTicketDetail(
  requesterId: number,
  ticketId: number
): Promise<TicketDetail | null> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: requesterHeaders(requesterId),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Unable to load ticket.");
  return res.json();
}

export async function getAttachments(
  requesterId: number,
  ticketId: number
): Promise<AttachmentMeta[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    headers: requesterHeaders(requesterId),
  });
  if (!res.ok) throw new Error("Unable to load attachments.");
  const body = await res.json();
  return body.attachments;
}

export async function uploadAttachment(
  requesterId: number,
  ticketId: number,
  file: File
): Promise<AttachmentMeta> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: requesterHeaders(requesterId), // no Content-Type: browser sets multipart boundary
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Upload failed.");
  }
  return res.json();
}

export async function removeAttachment(requesterId: number, attachmentId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "PATCH",
    headers: requesterHeaders(requesterId),
  });
  if (!res.ok) throw new Error("Unable to remove attachment.");
}

export async function downloadAttachment(
  requesterId: number,
  attachmentId: number,
  filename: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    headers: requesterHeaders(requesterId),
  });
  if (!res.ok) throw new Error("Unable to download attachment.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}