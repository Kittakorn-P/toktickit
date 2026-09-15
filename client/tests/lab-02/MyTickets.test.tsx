import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyTickets from "../../src/pages/MyTickets.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderMyTickets() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MyTickets />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleTicket = {
  id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop battery drains quickly",
  category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Corporate Laptop" },
  requestedPriority: "MEDIUM", currentStatus: "NEW",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("MyTickets", () => {
  it("shows the empty state when the requester has zero tickets and no filters are active", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    renderMyTickets();
    expect(await screen.findByText(/haven't created any tickets yet/i)).toBeInTheDocument();
  });

  it("shows the ticket list when tickets exist", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [sampleTicket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
    renderMyTickets();
    expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);
  });

  it("shows a no-results state distinct from the empty state when a search matches nothing", async () => {
    vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    renderMyTickets();
    const searchBox = await screen.findByPlaceholderText(/Search by ticket number/i);
    fireEvent.change(searchBox, { target: { value: "nonexistent" } });
    expect(await screen.findByText(/No tickets match your search\/filters/i)).toBeInTheDocument();
  });
});