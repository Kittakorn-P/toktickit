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