import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffQueue from "../../src/pages/StaffQueue.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderQueue() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 10, name: "Priya Nair", role: "IT_STAFF", mustChangePassword: false,
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StaffQueue />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleTicket = {
  id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop battery drains quickly",
  category: { id: 1, name: "Hardware" }, requestedPriority: "MEDIUM", itPriority: "HIGH",
  currentStatus: "IN_PROGRESS", owner: { id: 10, name: "Priya Nair" },
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("StaffQueue", () => {
  it("shows the empty state when the queue has no tickets and no filters are active", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    renderQueue();
    expect(await screen.findByText(/No tickets in the queue/i)).toBeInTheDocument();
  });

  it("shows the ticket list when tickets exist", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [sampleTicket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
    renderQueue();
    expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);
  });

  it("shows a no-results state distinct from the empty state when a search matches nothing", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    renderQueue();
    const searchBox = await screen.findByPlaceholderText(/Search by ticket number/i);
    fireEvent.change(searchBox, { target: { value: "nonexistent" } });
    expect(await screen.findByText(/No tickets match your search\/filters/i)).toBeInTheDocument();
  });

  it("shows an unassigned label when a ticket has no owner", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [{ ...sampleTicket, owner: null }],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
    renderQueue();
    expect((await screen.findAllByText("Unassigned")).length).toBeGreaterThan(0);
  });
});