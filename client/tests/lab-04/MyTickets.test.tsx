import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyTickets from "../../src/pages/MyTickets.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderWithQuery(search: string) {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
  });
  return render(
    <MemoryRouter initialEntries={[`/tickets${search}`]}>
      <AuthProvider>
        <MyTickets />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("MyTickets — reads initial filters from the URL (Lab 4 drill-down)", () => {
  it("passes a multi-status group from a Dashboard 'My Open Tickets' link straight through to the API", async () => {
    const getTicketsSpy = vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("?status=NEW,OPEN,REOPENED");
    await screen.findByText(/haven't created any tickets yet|No tickets match/i);

    expect(getTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "NEW,OPEN,REOPENED" }));
  });

  it("passes a single status from a 'Resolved' or 'Closed' link through unchanged", async () => {
    const getTicketsSpy = vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("?status=RESOLVED");
    await screen.findByText(/No tickets match|haven't created/i);

    expect(getTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "RESOLVED" }));
  });

  it("defaults to no filters when no query string is present", async () => {
    const getTicketsSpy = vi.spyOn(api, "getTickets").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("");
    await screen.findByText(/haven't created any tickets yet/i);

    expect(getTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({
      status: undefined, search: undefined, category: undefined, requestedPriority: undefined,
    }));
  });
});