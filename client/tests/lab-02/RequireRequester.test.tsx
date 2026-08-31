import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRequester from "../../src/pages/RequireRequester.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

// AC-02: Given no Development Requester is selected, when the user attempts
// to open a Requester-scoped screen, then the Requester Selection screen is
// shown instead.
describe("RequireRequester (AC-02)", () => {
  it("redirects to the Selector when no Requester is selected", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <RequesterProvider>
          <Routes>
            <Route path="/" element={<div>Requester Selection Screen</div>} />
            <Route element={<RequireRequester />}>
              <Route path="/tickets" element={<div>My Tickets Screen</div>} />
            </Route>
          </Routes>
        </RequesterProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("Requester Selection Screen")).toBeInTheDocument();
    expect(screen.queryByText("My Tickets Screen")).not.toBeInTheDocument();
  });
});