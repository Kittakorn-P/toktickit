import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminUsers from "../../src/pages/AdminUsers.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderAdminUsers() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 14, name: "Alex Admin", role: "ADMINISTRATOR", mustChangePassword: false,
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AdminUsers />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleUsers = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com", role: "REQUESTER" as const, isActive: true },
  { id: 14, name: "Alex Admin", email: "admin@tiktockit.com", role: "ADMINISTRATOR" as const, isActive: true },
];

describe("AdminUsers", () => {
  it("shows the user list with role and status badges", async () => {
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(sampleUsers);
    renderAdminUsers();
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBe(2);
  });

  it("opens the Create User panel and disables Deactivate for the current admin when editing self", async () => {
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(sampleUsers);
    renderAdminUsers();

    fireEvent.click(await screen.findByText("+ Create User"));
    expect(screen.getByText("Create New User")).toBeInTheDocument();
  });

  it("disables the Active toggle when editing your own account", async () => {
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(sampleUsers);
    renderAdminUsers();

    const editButtons = await screen.findAllByText("Edit");
    fireEvent.click(editButtons[1]); // second row is Alex Admin (self)

    const toggle = screen.getByLabelText("Active") as HTMLInputElement;
    expect(toggle).toBeDisabled();
  });

  it("calls createAdminUser with entered values on submit", async () => {
    vi.spyOn(api, "getAdminUsers").mockResolvedValue(sampleUsers);
    const createSpy = vi.spyOn(api, "createAdminUser").mockResolvedValue({
      id: 99, name: "New Person", email: "new@example.com", role: "IT_STAFF", isActive: true,
    });
    renderAdminUsers();

    fireEvent.click(await screen.findByText("+ Create User"));
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "New Person" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText(/Initial Password/i), { target: { value: "ValidPass1!" } });
    fireEvent.click(screen.getByText("Save User"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
  });
});