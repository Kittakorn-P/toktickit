import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateTicket from "../../src/pages/CreateTicket.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { useEffect } from "react";

// Helper: seeds the RequesterContext with a fake selected Requester before
// each test renders CreateTicket, since it depends on that context.
function Seeded({ children }: { children: React.ReactNode }) {
  function Setter() {
    const { setRequester } = useRequester();
    useEffect(() => {
      setRequester({ id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" });
    }, [setRequester]);
    return null;
  }
  return (
    <RequesterProvider>
      <Setter />
      {children}
    </RequesterProvider>
  );
}

function renderCreateTicket() {
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
  return render(
    <MemoryRouter>
      <Seeded>
        <CreateTicket />
      </Seeded>
    </MemoryRouter>
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Requested Priority/i), { target: { value: "MEDIUM" } });
  fireEvent.change(screen.getByLabelText(/Summary/i), {
    target: { value: "Laptop battery drains quickly" },
  });
  fireEvent.change(screen.getByLabelText(/Description/i), {
    target: { value: "Drains fast even when idle." },
  });
}

describe("CreateTicket", () => {
  it("shows a field error and does not submit when Summary is empty", async () => {
    renderCreateTicket();
    await screen.findByText(/Corporate Laptop/i);

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Requested Priority/i), { target: { value: "MEDIUM" } });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Some description text." },
    });

    const createSpy = vi.spyOn(api, "createTicket");
    fireEvent.click(screen.getByText("Submit Ticket"));

    expect(await screen.findByText(/Summary is required/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("submits successfully and does not show an error", async () => {
    renderCreateTicket();
    await screen.findByText(/Corporate Laptop/i);
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Laptop battery drains quickly",
      description: "Drains fast even when idle.",
      requestedPriority: "MEDIUM",
      currentStatus: "NEW",
      createdAt: "",
      updatedAt: "",
    });

    fillValidForm();
    fireEvent.click(screen.getByText("Submit Ticket"));

    await waitFor(() => {
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });
  });

  it("shows a safe error and preserves entered values when the API call fails", async () => {
    renderCreateTicket();
    await screen.findByText(/Corporate Laptop/i);
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("network error"));

    fillValidForm();
    fireEvent.click(screen.getByText("Submit Ticket"));

    expect(await screen.findByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Summary/i)).toHaveValue("Laptop battery drains quickly");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Drains fast even when idle.");
  });
});