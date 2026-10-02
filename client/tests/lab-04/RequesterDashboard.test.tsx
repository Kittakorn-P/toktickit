import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequesterDashboard from "../../src/pages/RequesterDashboard.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderDashboard() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false,
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RequesterDashboard />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleData = {
  metrics: { myOpen: 3, inProgress: 2, resolved: 5, closed: 12 },
  recentTickets: [
    { id: 1, code: "TKT-2026-000001", title: "Laptop battery drains quickly", status: "IN_PROGRESS", updatedAt: "2026-01-01T00:00:00Z" },
  ],
};

describe("RequesterDashboard", () => {
  it("renders metric values", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(sampleData);
    renderDashboard();

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("links each metric card to the correctly filtered ticket list", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(sampleData);
    renderDashboard();
    await screen.findByText("3");

    expect(screen.getByRole("link", { name: /My Open Tickets/ }))
      .toHaveAttribute("href", "/tickets?status=NEW,OPEN,REOPENED");
    expect(screen.getByRole("link", { name: /In Progress/ }))
      .toHaveAttribute("href", "/tickets?status=IN_PROGRESS,WAITING_FOR_REQUESTER");
    expect(screen.getByRole("link", { name: /Resolved/ }))
      .toHaveAttribute("href", "/tickets?status=RESOLVED");
    expect(screen.getByRole("link", { name: /Closed/ }))
      .toHaveAttribute("href", "/tickets?status=CLOSED");
  });

  it("renders recent tickets with a link into the detail page", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(sampleData);
    renderDashboard();

    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TKT-2026-000001/ })).toHaveAttribute("href", "/tickets/1");
  });

  it("shows an empty state when there are no recent tickets", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({
      metrics: { myOpen: 0, inProgress: 0, resolved: 0, closed: 0 },
      recentTickets: [],
    });
    renderDashboard();
    expect(await screen.findByText("No recent activity yet.")).toBeInTheDocument();
  });

  it("shows an error state when the dashboard fails to load", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockRejectedValue(new Error("fail"));
    renderDashboard();
    expect(await screen.findByText(/Unable to load your dashboard/i)).toBeInTheDocument();
  });

  it("has Quick Actions linking to Create Ticket and My Tickets", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue(sampleData);
    renderDashboard();
    await screen.findByText("3");

    expect(screen.getByRole("link", { name: "+ Create Ticket" })).toHaveAttribute("href", "/create-ticket");
    expect(screen.getByRole("link", { name: "View My Tickets" })).toHaveAttribute("href", "/tickets");
  });
});