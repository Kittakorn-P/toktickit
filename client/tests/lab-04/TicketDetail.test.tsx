import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TicketDetail from "../../src/pages/TicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderDetail(ticketId = "1") {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
  });
  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, ticketNumber: "TKT-2026-000001", requesterId: 1, categoryId: 1, relatedSystemId: 1,
    summary: "Laptop battery drains quickly", description: "Drains fast even when idle.",
    category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Corporate Laptop" },
    requestedPriority: "MEDIUM", currentStatus: "IN_PROGRESS", looksResolvedByRequester: false,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const sampleAction = {
  id: 100, ticketId: 1, actionDateTime: "2026-01-02T09:00:00Z",
  description: "Investigated the issue.", result: "Root cause identified.",
  performedBy: { id: 10, name: "Priya Nair" },
  followUpRequired: false, followUpNote: null, attachmentNotes: "See IMG_0231.jpg",
  createdAt: "2026-01-02T09:00:00Z", updatedAt: "2026-01-02T09:00:00Z",
};

describe("TicketDetail — Actions Taken is read-only for Requesters (Lab 4, FR-05)", () => {
  it("shows action fields but no create/edit controls", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket());
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([sampleAction]);

    renderDetail();

    expect(await screen.findByText("Investigated the issue.")).toBeInTheDocument();
    expect(screen.getByText(/Performed by Priya Nair/)).toBeInTheDocument();
    expect(screen.queryByText("+ Add Action")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no actions yet", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket());
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

    renderDetail();
    expect(await screen.findByText("No actions recorded yet.")).toBeInTheDocument();
  });
});

describe("TicketDetail — Looks Resolved and Reopen (Lab 4, BR-06/BR-07)", () => {
  it("calls setLooksResolved with the ticket id and true", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket());
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
    const resolveSpy = vi.spyOn(api, "setLooksResolved").mockResolvedValue({ id: 1, looksResolvedByRequester: true });

    renderDetail();
    fireEvent.click(await screen.findByText("Mark Problem as Resolved"));

    expect(resolveSpy).toHaveBeenCalledWith(1, true);
  });

  it("reflects the persisted flag on reload, unlike the old non-persisted comment approach", async () => {
    const getSpy = vi.spyOn(api, "getTicketDetail")
      .mockResolvedValueOnce(mockTicket({ looksResolvedByRequester: false }))
      .mockResolvedValue(mockTicket({ looksResolvedByRequester: true }));
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
    vi.spyOn(api, "setLooksResolved").mockResolvedValue({ id: 1, looksResolvedByRequester: true });

    renderDetail();
    fireEvent.click(await screen.findByText("Mark Problem as Resolved"));

    expect(await screen.findByText("✓ Marked as appears resolved")).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2); // initial load + reload after the flag was set
  });

  it("does not show a Reopen button unless the ticket is Resolved", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket({ currentStatus: "IN_PROGRESS" }));
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

    renderDetail();
    await screen.findByText("Mark Problem as Resolved");
    expect(screen.queryByText("Reopen Ticket")).not.toBeInTheDocument();
  });

  it("shows Reopen on a Resolved ticket and calls reopenTicket when clicked", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket({ currentStatus: "RESOLVED" }));
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]);
    const reopenSpy = vi.spyOn(api, "reopenTicket").mockResolvedValue({ id: 1, currentStatus: "REOPENED" });

    renderDetail();
    fireEvent.click(await screen.findByText("Reopen Ticket"));

    await waitFor(() => expect(reopenSpy).toHaveBeenCalledWith(1));
  });

  it("disables the Mark Resolved button once already marked", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(mockTicket({ looksResolvedByRequester: true }));
    vi.spyOn(api, "getAttachments").mockResolvedValue([]);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue([]);

    renderDetail();
    const button = await screen.findByText("✓ Marked as appears resolved");
    expect(button).toBeDisabled();
  });
});