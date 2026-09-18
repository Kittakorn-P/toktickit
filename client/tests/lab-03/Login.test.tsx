import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../../src/pages/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderLogin() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login", () => {
  it("disables Sign In until both fields are filled", async () => {
    renderLogin();
    const button = await screen.findByText("Sign In");
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "pw" } });
    expect(button).not.toBeDisabled();
  });

  it("shows a generic error on invalid credentials", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid email or password."));
    renderLogin();

    fireEvent.change(await screen.findByLabelText(/Email address/i), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "wrongpw" } });
    fireEvent.click(screen.getByText("Sign In"));

    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
  });

  it("calls login with the entered credentials on submit", async () => {
    const loginSpy = vi.spyOn(api, "login").mockResolvedValue({
      user: { id: 1, name: "Jennifer Anderson", role: "REQUESTER" },
      mustChangePassword: false,
    });
    renderLogin();

    fireEvent.change(await screen.findByLabelText(/Email address/i), { target: { value: "jennifer@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "Jennifer123!" } });
    fireEvent.click(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("jennifer@example.com", "Jennifer123!");
    });
  });
});