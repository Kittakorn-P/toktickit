import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HealthCheck from "../../src/pages/HealthCheck.js";
import * as api from "../../src/api.js";
import { fireEvent } from "@testing-library/react";

// Moved from testing <App /> directly to testing <HealthCheck /> directly.
// App.tsx is now a router shell (Lab 2, Issue 7); the health-check UI itself
// was extracted unchanged into pages/HealthCheck.tsx. Behavior asserted here
// is identical to the original Lab 1 test — only the render target changed.
describe("HealthCheck", () => {
  it("renders the TokTickIT heading", () => {
    render(<HealthCheck />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [{ id: 1, name: "Account and Access" }],
    });
    render(<HealthCheck />);
    fireEvent.click(screen.getByText("Check System"));
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("offline"));

    render(<HealthCheck />);
    fireEvent.click(screen.getByText("Check System"));

    expect(
      await screen.findByText(/Unable to connect to TokTickIT API/i)
    ).toBeInTheDocument();
  });
});