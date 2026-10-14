import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffDashboard from "../../src/pages/StaffDashboard.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderDashboard() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 10, name: "Priya Nair", role: "IT_STAFF", mustChangePassword: false,
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <StaffDashboard />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleData = {
  metrics: { new: 14, open: 23, inProgress: 18, waitingForRequester: 7, myAssigned: 16 },
  recentTickets: [
    { id: 1, code: "TKT-2026-000001", title: "Laptop battery drains quickly", status: "IN_PROGRESS", updatedAt: "2026-01-01T00:00:00Z" },
  ],
};

describe("StaffDashboard", () => {
  it("renders metric values", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(sampleData);
    renderDashboard();

    expect(await screen.findByText("14")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("links each metric card to the correctly filtered queue, with My Assigned using the caller's own id", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(sampleData);
    renderDashboard();
    await screen.findByText("14");

    expect(screen.getByRole("link", { name: /^New/ })).toHaveAttribute("href", "/queue?status=NEW");
    expect(screen.getByRole("link", { name: /^Open/ })).toHaveAttribute("href", "/queue?status=OPEN");
    expect(screen.getByRole("link", { name: /In Progress/ })).toHaveAttribute("href", "/queue?status=IN_PROGRESS");
    expect(screen.getByRole("link", { name: /Waiting for Requester/ })).toHaveAttribute("href", "/queue?status=WAITING_FOR_REQUESTER");
    expect(screen.getByRole("link", { name: /My Assigned/ })).toHaveAttribute("href", "/queue?owner=10");
  });

  it("renders recent tickets with a link into the staff detail page", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(sampleData);
    renderDashboard();

    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TKT-2026-000001/ })).toHaveAttribute("href", "/queue/1");
  });

  it("shows an empty state when there are no recent tickets", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue({
      metrics: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0 },
      recentTickets: [],
    });
    renderDashboard();
    expect(await screen.findByText("No recent activity yet.")).toBeInTheDocument();
  });

  it("shows an error state when the dashboard fails to load", async () => {
    vi.spyOn(api, "getStaffDashboard").mockRejectedValue(new Error("fail"));
    renderDashboard();
    expect(await screen.findByText(/Unable to load your dashboard/i)).toBeInTheDocument();
  });

  it("Quick Actions' My Queue link also scopes to the caller's own id", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(sampleData);
    renderDashboard();
    await screen.findByText("14");

    expect(screen.getByRole("link", { name: "My Queue" })).toHaveAttribute("href", "/queue?owner=10");
  });
});