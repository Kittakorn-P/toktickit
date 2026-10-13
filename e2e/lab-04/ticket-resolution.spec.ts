import { test, expect } from "@playwright/test";
import { loginAs } from "../lab-03/helpers.js";

// Assumes these accounts exist, are active, and mustChangePassword is
// already false — adjust credentials/seed state if that's not the case.
const REQUESTER_EMAIL = "jennifer.anderson@example.com";
const REQUESTER_PASSWORD = "Jennifer123!";
const STAFF_EMAIL = "priya.nair@tiktockit.com";
const STAFF_PASSWORD = "Priya456!";

async function logout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL("**/login");
}

async function createTicket(page: import("@playwright/test").Page, summary: string) {
  await page.goto("/create-ticket");
  await page.locator("#category").selectOption({ index: 1 });
  await page.locator("#relatedSystem").selectOption({ index: 1 });
  await page.locator("#priority").selectOption("MEDIUM");
  await page.locator("#summary").fill(summary);
  await page.locator("#description").fill(`E2E ticket-resolution spec: ${summary}`);
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await page.waitForURL("**/tickets");
}

test.describe("Ticket resolution flow — Looks Resolved, formal resolve, Reopen (AC-04, AC-05, E2E-02)", () => {
  test("status only changes on IT Staff action, and the advisory flag stays visible throughout", async ({ page }) => {
    const marker = `E2E resolution flow ${Date.now()}`;

    // --- Requester: create a fresh ticket and mark it "looks resolved" ---
    await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await page.waitForURL("**/dashboard");
    await createTicket(page, marker);

    await page.getByPlaceholder(/Search by ticket number/i).fill(marker);
    await page.locator("tbody tr:visible, .card:visible").first().click();
    await page.waitForURL(/\/tickets\/\d+/);
    const requesterTicketUrl = page.url();

    await page.getByRole("button", { name: "Mark Problem as Resolved" }).click();
    await expect(page.getByText("✓ Marked as appears resolved")).toBeVisible();
    // Status must NOT have changed just from this advisory flag. These
    // "Current Status" inputs have no htmlFor/label pairing to query by
    // (same gap noted for Priority/Owner elsewhere), so target by value
    // directly instead of Playwright's getByLabel.
    await expect(page.locator('input[value="NEW"]')).toBeVisible();

    await logout(page);

    // --- IT Staff: sees the flag, then formally resolves through the matrix ---
    await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.waitForURL("**/dashboard");
    await page.goto("/queue");
    await page.getByPlaceholder(/Search by ticket number/i).fill(marker);
    await page.locator("tbody tr:visible, .card:visible").first().click();
    await page.waitForURL(/\/queue\/\d+/);

    await expect(page.getByText("Requester indicates resolved")).toBeVisible();

    const statusSelect = page.getByTestId("status-select");
    await statusSelect.selectOption("OPEN");
    await expect(statusSelect).toHaveValue("OPEN");
    await statusSelect.selectOption("IN_PROGRESS");
    await expect(statusSelect).toHaveValue("IN_PROGRESS");
    await statusSelect.selectOption("RESOLVED");
    await expect(statusSelect).toHaveValue("RESOLVED");

    await logout(page);

    // --- Requester: sees Resolved, and can now Reopen ---
    await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await page.waitForURL("**/dashboard");
    await page.goto(requesterTicketUrl);
    await expect(page.locator('input[value="RESOLVED"]')).toBeVisible();

    await page.getByRole("button", { name: "Reopen Ticket" }).click();
    await expect(page.locator('input[value="REOPENED"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Reopen Ticket" })).not.toBeVisible();
  });

  test("a Requester cannot reach any status transition other than Reopen (UI never offers one)", async ({ page }) => {
    const marker = `E2E no-shortcut flow ${Date.now()}`;
    await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await page.waitForURL("**/dashboard");
    await createTicket(page, marker);
    await page.getByPlaceholder(/Search by ticket number/i).fill(marker);
    await page.locator("tbody tr:visible, .card:visible").first().click();
    await page.waitForURL(/\/tickets\/\d+/);

    // The Requester's Ticket Detail screen has no status <select> at all —
    // only the Mark-Resolved and (conditionally) Reopen buttons.
    await expect(page.getByTestId("status-select")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reopen Ticket" })).not.toBeVisible();
  });
});