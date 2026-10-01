import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StaffTicketDetail from "../../src/pages/StaffTicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { ValidationError } from "../../src/api.js";

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

function baseTicket(overrides: Partial<Parameters<typeof mockTicket>[0]> = {}) {
  return mockTicket(overrides);
}

function mockTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, ticketNumber: "TKT-2026-000001", summary: "Laptop battery drains quickly",
    description: "Drains fast even when idle.",
    category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Corporate Laptop" },
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" },
    owner: { id: 10, name: "Priya Nair" }, requestedPriority: "MEDIUM", itPriority: "MEDIUM",
    currentStatus: "NEW", looksResolvedByRequester: false,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const sampleAction = {
  id: 100, ticketId: 1, actionDateTime: "2026-01-02T09:00:00Z",
  description: "Investigated the issue.", result: "Root cause identified.",
  performedBy: { id: 10, name: "Priya Nair" },
  followUpRequired: true, followUpNote: "Waiting on vendor patch.", attachmentNotes: null,
  createdAt: "2026-01-02T09:00:00Z", updatedAt: "2026-01-02T09:00:00Z",
};

describe("StaffTicketDetail — Actions Taken (Lab 4)", () => {
  it("renders an existing action's fields", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket());
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([sampleAction]);

    renderDetail();

    expect(await screen.findByText("Investigated the issue.")).toBeInTheDocument();
    expect(screen.getByText("Root cause identified.")).toBeInTheDocument();
    expect(screen.getByText("Waiting on vendor patch.")).toBeInTheDocument();
    expect(screen.getByText(/Performed by Priya Nair/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up needed/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no actions yet", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket());
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);

    renderDetail();
    expect(await screen.findByText("No actions recorded yet.")).toBeInTheDocument();
  });

  it("submits a new action with the form's values", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket());
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);
    const createSpy = vi.spyOn(api, "createAction").mockResolvedValue(sampleAction);

    renderDetail();
    fireEvent.click(await screen.findByText("+ Add Action"));

    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "Checked cables." } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "No fault found." } });
    fireEvent.click(screen.getByRole("button", { name: "Add Action" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(1, expect.objectContaining({
      description: "Checked cables.",
      result: "No fault found.",
      followUpRequired: false,
    })));
  });

  it("reveals the follow-up note field only when Follow-Up Required is checked, and includes it on submit", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket());
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);
    const createSpy = vi.spyOn(api, "createAction").mockResolvedValue(sampleAction);

    renderDetail();
    fireEvent.click(await screen.findByText("+ Add Action"));

    expect(screen.queryByLabelText("Follow-up Note")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Follow-Up Required?"));
    expect(screen.getByLabelText("Follow-up Note")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "Escalated." } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Pending." } });
    fireEvent.change(screen.getByLabelText("Follow-up Note"), { target: { value: "Check back Friday." } });
    fireEvent.click(screen.getByRole("button", { name: "Add Action" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(1, expect.objectContaining({
      followUpRequired: true,
      followUpNote: "Check back Friday.",
    })));
  });

  it("shows a field-level error from the API instead of closing the form", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket());
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);
    vi.spyOn(api, "createAction").mockRejectedValue(
      new ValidationError({ followUpNote: "Follow-up note is required when follow-up is needed." })
    );

    renderDetail();
    fireEvent.click(await screen.findByText("+ Add Action"));
    fireEvent.change(screen.getByLabelText("Action Description"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "y" } });
    // Realistic trigger for this error: the box is checked but the note is
    // left empty — the server only ever validates followUpNote when
    // followUpRequired is true, so that's the only way this 422 occurs.
    fireEvent.click(screen.getByLabelText("Follow-Up Required?"));
    fireEvent.click(screen.getByRole("button", { name: "Add Action" }));

    expect(await screen.findByText("Follow-up note is required when follow-up is needed.")).toBeInTheDocument();
    // Form should still be open, not silently discarded.
    expect(screen.getByLabelText("Action Description")).toBeInTheDocument();
  });

  it("pre-fills the form and calls updateAction with the action's updatedAt when editing", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket());
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([sampleAction]);
    const updateSpy = vi.spyOn(api, "updateAction").mockResolvedValue(sampleAction);

    renderDetail();
    fireEvent.click(await screen.findByText("Edit"));

    expect(screen.getByLabelText("Action Description")).toHaveValue("Investigated the issue.");

    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Confirmed fixed." } });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith(1, 100, expect.objectContaining({
      result: "Confirmed fixed.",
      updatedAt: sampleAction.updatedAt,
    })));
  });

  it("hides Add/Edit controls and shows a notice once the ticket is Closed", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket({ currentStatus: "CLOSED" }));
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([sampleAction]);

    renderDetail();
    await screen.findByText("Investigated the issue.");

    expect(screen.queryByText("+ Add Action")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.getByText(/actions can no longer be added or edited/)).toBeInTheDocument();
  });
});

describe("StaffTicketDetail — status control restricted to the transition matrix (Lab 4)", () => {
  it("offers only OPEN and CANCELLED from a NEW ticket, not every status", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket({ currentStatus: "NEW" }));
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);

    renderDetail();
    const select = await screen.findByTestId("status-select");
    const values = within(select).getAllByRole("option").map((o) => (o as HTMLOptionElement).value);

    expect(values).toEqual(expect.arrayContaining(["NEW", "OPEN", "CANCELLED"]));
    expect(values).not.toContain("IN_PROGRESS");
    expect(values).not.toContain("RESOLVED");
  });

  it("disables the status control on a terminal (CANCELLED) ticket and shows a reason", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket({ currentStatus: "CANCELLED" }));
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);

    renderDetail();
    const select = await screen.findByTestId("status-select");
    expect(select).toBeDisabled();
    expect(screen.getByText("No further transitions available from this status.")).toBeInTheDocument();
  });

  it("sends the ticket's updatedAt when changing status", async () => {
    const ticket = baseTicket({ currentStatus: "NEW", updatedAt: "2026-03-01T00:00:00Z" });
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(ticket);
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);
    const statusSpy = vi.spyOn(api, "updateTicketStatus").mockResolvedValue({ id: 1, currentStatus: "OPEN" });

    renderDetail();
    const select = await screen.findByTestId("status-select");
    fireEvent.change(select, { target: { value: "OPEN" } });

    await waitFor(() => expect(statusSpy).toHaveBeenCalledWith(1, "OPEN", "2026-03-01T00:00:00Z"));
  });

  it("shows the 'Requester indicates resolved' badge when the flag is set", async () => {
    vi.spyOn(api, "getStaffTicketDetail").mockResolvedValue(baseTicket({ looksResolvedByRequester: true }));
    vi.spyOn(api, "getComments").mockResolvedValue([]);
    vi.spyOn(api, "getNotes").mockResolvedValue([]);
    vi.spyOn(api, "getStaffTicketActions").mockResolvedValue([]);

    renderDetail();
    expect(await screen.findByText("Requester indicates resolved")).toBeInTheDocument();
  });
});