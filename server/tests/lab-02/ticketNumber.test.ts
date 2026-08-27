import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "../../src/utils/ticketNumber.js";

describe("formatTicketNumber", () => {
  it("formats with zero-padded id and given year", () => {
    expect(formatTicketNumber(42, 2026)).toBe("TKT-2026-000042");
  });

  it("pads ids up to 6 digits", () => {
    expect(formatTicketNumber(1, 2026)).toBe("TKT-2026-000001");
  });

  it("does not truncate ids longer than 6 digits", () => {
    expect(formatTicketNumber(1234567, 2026)).toBe("TKT-2026-1234567");
  });
});