import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import TicketDetail from "../../src/pages/TicketDetail.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

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

function renderDetail(ticketId = "1") {
  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <Seeded>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </Seeded>
    </MemoryRouter>
  );
}

const sampleTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  requestedPriority: "MEDIUM",
  currentStatus: "NEW",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Corporate Laptop" },
};

describe("TicketDetail", () => {
  it("renders owned ticket details and attachments", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(sampleTicket);
    vi.spyOn(api, "getAttachments").mockResolvedValue([
      {
        id: 1,
        originalFilename: "screenshot.png",
        mimeType: "image/png",
        sizeBytes: 1000,
        isRemoved: false,
        removedAt: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    renderDetail();
    expect(await screen.findByDisplayValue("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
  });

  it("shows a not-found message for a ticket that does not exist or is not owned", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(null);
    renderDetail("9999");
    expect(
      await screen.findByText(/Ticket not found/i)
    ).toBeInTheDocument();
  });

  it("removes an attachment after confirmation and hides its download/remove buttons", async () => {
    vi.spyOn(api, "getTicketDetail").mockResolvedValue(sampleTicket);
    vi.spyOn(api, "getAttachments")
      .mockResolvedValueOnce([
        {
          id: 1,
          originalFilename: "screenshot.png",
          mimeType: "image/png",
          sizeBytes: 1000,
          isRemoved: false,
          removedAt: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          originalFilename: "screenshot.png",
          mimeType: "image/png",
          sizeBytes: 1000,
          isRemoved: true,
          removedAt: "2026-01-02T00:00:00Z",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ]);
    vi.spyOn(api, "removeAttachment").mockResolvedValue();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderDetail();
    const removeBtn = await screen.findByText("Remove");
    fireEvent.click(removeBtn);

    expect(await screen.findByText("Removed")).toBeInTheDocument();
    expect(screen.queryByText("Download")).not.toBeInTheDocument();
  });
});