import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChangePassword from "../../src/pages/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

function renderChangePassword() {
  vi.spyOn(api, "getCurrentUser").mockResolvedValue({
    id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: true,
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ChangePassword", () => {
  it("disables Continue until all password rules pass and confirmation matches", async () => {
    renderChangePassword();
    const button = await screen.findByText("Continue");
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Current \(temporary\) password/i), { target: { value: "OldPass1!" } });
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "weak" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "NewSecure123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "NewSecure123!" } });
    expect(button).not.toBeDisabled();
  });

  it("shows an error when confirmation does not match", async () => {
    renderChangePassword();
    fireEvent.change(await screen.findByLabelText(/Current \(temporary\) password/i), { target: { value: "OldPass1!" } });
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "NewSecure123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "Different123!" } });

    // Confirm mismatch keeps the button disabled rather than allowing submit
    expect(screen.getByText("Continue")).toBeDisabled();
  });

  it("calls changePassword with entered values on submit", async () => {
    const changeSpy = vi.spyOn(api, "changePassword").mockResolvedValue();
    vi.spyOn(api, "getCurrentUser")
      .mockResolvedValueOnce({ id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: true })
      .mockResolvedValueOnce({ id: 1, name: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false });
    renderChangePassword();

    fireEvent.change(await screen.findByLabelText(/Current \(temporary\) password/i), { target: { value: "OldPass1!" } });
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "NewSecure123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "NewSecure123!" } });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith("OldPass1!", "NewSecure123!");
    });
  });
});