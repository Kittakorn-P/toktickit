import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";
import { fireEvent } from "@testing-library/react";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [{ id: 1, name: "Account and Access" }],
    });
  
    render(<App />);
    fireEvent.click(screen.getByText("Check System"));
  
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("offline"));

    render(<App />);
    fireEvent.click(screen.getByText("Check System"));

    expect(await screen.findByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  }
  );
});
