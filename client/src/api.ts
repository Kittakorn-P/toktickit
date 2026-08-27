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

// Helper for future Requester-scoped calls (Create Ticket, My Tickets, etc.)
// Every request that needs ownership context should spread these headers in.
export function requesterHeaders(requesterId: number): HeadersInit {
  return { "X-Requester-Id": String(requesterId) };
}
