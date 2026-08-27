import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequesterSelection from "../../src/pages/RequesterSelection.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

function renderSelection() {
  return render(
    <MemoryRouter>
      <RequesterProvider>
        <RequesterSelection />
      </RequesterProvider>
    </MemoryRouter>
  );
}

describe("RequesterSelection", () => {
  it("shows a loading state, then the dropdown once requesters load", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" },
    ]);
    renderSelection();
    expect(screen.getByText(/Loading requesters/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Development Requester/i)).toBeInTheDocument();
  });

  it("shows an empty state when no active requesters exist", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([]);
    renderSelection();
    expect(
      await screen.findByText(/No active Development Requesters available/i)
    ).toBeInTheDocument();
  });

  it("shows a safe error state when the API call fails", async () => {
    vi.spyOn(api, "getRequesters").mockRejectedValue(new Error("network error"));
    renderSelection();
    expect(
      await screen.findByText(/Unable to load Development Requesters/i)
    ).toBeInTheDocument();
  });

  it("disables Continue until a Requester is selected", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" },
    ]);
    renderSelection();
    const select = await screen.findByLabelText(/Development Requester/i);
    const continueBtn = screen.getByText(/Continue/i);
    expect(continueBtn).toBeDisabled();

    fireEvent.change(select, { target: { value: "1" } });
    expect(continueBtn).not.toBeDisabled();
  });
});