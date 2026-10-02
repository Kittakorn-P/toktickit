import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffQueue from "../../src/pages/StaffQueue.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderWithQuery(search: string) {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 10, name: "Priya Nair", role: "IT_STAFF", mustChangePassword: false,
  });
  return render(
    <MemoryRouter initialEntries={[`/queue${search}`]}>
      <AuthProvider>
        <StaffQueue />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("StaffQueue — reads initial filters from the URL (Lab 4 drill-down)", () => {
  it("passes owner=<id> from the 'My Assigned' dashboard link through to the API", async () => {
    const getStaffQueueSpy = vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("?owner=10");
    await screen.findByText(/No tickets in the queue|No tickets match/i);

    expect(getStaffQueueSpy).toHaveBeenCalledWith(expect.objectContaining({ owner: "10" }));
  });

  it("shows the 'My Assigned Tickets' heading when the owner param matches the current user", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("?owner=10");
    expect(await screen.findByText("My Assigned Tickets")).toBeInTheDocument();
  });

  it("passes a single status from a status-card link through unchanged", async () => {
    const getStaffQueueSpy = vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("?status=WAITING_FOR_REQUESTER");
    await screen.findByText(/No tickets in the queue|No tickets match/i);

    expect(getStaffQueueSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "WAITING_FOR_REQUESTER" }));
  });

  it("defaults to no filters and the plain 'My Queue' heading when no query string is present", async () => {
    vi.spyOn(api, "getStaffQueue").mockResolvedValue({
      tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });

    renderWithQuery("");
    expect(await screen.findByText("My Queue")).toBeInTheDocument();
  });
});