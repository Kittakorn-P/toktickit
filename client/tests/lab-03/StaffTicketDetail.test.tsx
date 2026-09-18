import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StaffTicketDetail from "../../src/pages/StaffTicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderDetail(ticketId = "1") {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 10, name: "Priya Nair", role: "IT_STAFF", mustChangePassword: false,
  });
  return render(
    <MemoryRouter initialEntries={[`/queue/${ticketId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/queue/:id" element={<StaffTicketDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleTicket = {
  id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Corporate Laptop" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" },
  owner: null, requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

describe("StaffTicketDetail", () => {
  it("shows a Claim button when the ticket is unassigned", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(sampleTicket);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);

    renderDetail();
    expect(await screen.findByText("Claim Ticket")).toBeInTheDocument();
  });

  it("calls claimTicket when Claim is clicked", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(sampleTicket);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    const claimSpy = vi.spyOn(api, "claimTicket").mockResolvedValue({ id: 1, owner: { id: 10, name: "Priya Nair" } });

    renderDetail();
    fireEvent.click(await screen.findByText("Claim Ticket"));

    expect(claimSpy).toHaveBeenCalledWith(1, 10);
  });

  it("distinguishes Internal Notes from Public Comments via separate tabs", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue({ ...sampleTicket, owner: { id: 10, name: "Priya Nair" } });
    vi.spyOn(api, "getComments").mockResolvedValue([
      { id: 1, content: "Public update", createdAt: "2026-01-01T00:00:00Z", author: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" } },
    ]);
    vi.spyOn(api, "getNotes").mockResolvedValue([
      { id: 1, content: "Internal escalation note", createdAt: "2026-01-01T00:00:00Z", author: { id: 10, name: "Priya Nair" } },
    ]);

    renderDetail();
    expect(await screen.findByText("Public update")).toBeInTheDocument();
    expect(screen.queryByText("Internal escalation note")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Internal Notes/));
    expect(await screen.findByText("Internal escalation note")).toBeInTheDocument();
    expect(screen.queryByText("Public update")).not.toBeInTheDocument();
  });

  it("shows a not-found message for a ticket that does not exist", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(null);
    renderDetail("9999");
    expect(await screen.findByText(/Ticket not found/i)).toBeInTheDocument();
  });
});