import { test, expect } from "@playwright/test";
import { selectRequester } from "./helpers.js";
import path from "path";

test.describe("E2E-01 — full ticket creation and discovery flow", () => {
  test("a Requester creates a Ticket and finds it in My Tickets", async ({ page }) => {
    await selectRequester(page);

    await page.getByText("+ Create Ticket").click();
    await page.waitForURL("**/create-ticket");

    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Related System").selectOption({ index: 1 });
    await page.getByLabel("Requested Priority").selectOption({ index: 1 });
    await page.getByLabel("Summary").fill("E2E flow test ticket");
    await page.getByLabel("Description").fill("Created during the E2E-01 test flow.");
    await page.getByText("Submit Ticket").click();

    await page.waitForURL("**/tickets");
    await expect(page.getByText(/created successfully/i)).toBeVisible();

    // Confirm it's actually findable in the list, not just the success banner.
    await page.getByPlaceholder(/Search by ticket number/i).fill("E2E flow test ticket");
    await expect(page.getByText("E2E flow test ticket").first()).toBeVisible();
  });
});

test.describe("E2E-02 — cross-Requester access is blocked", () => {
  test("Requester B cannot view a Ticket URL belonging to Requester A", async ({ browser }) => {
    // Two separate browser contexts simulate two separate Requester sessions,
    // since our RequesterContext is in-memory per tab/session.
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await selectRequester(pageA, 1);

    await pageA.getByText("+ Create Ticket").click();
    await pageA.waitForURL("**/create-ticket");
    await pageA.getByLabel("Category").selectOption({ index: 1 });
    await pageA.getByLabel("Related System").selectOption({ index: 1 });
    await pageA.getByLabel("Requested Priority").selectOption({ index: 1 });
    await pageA.getByLabel("Summary").fill("Requester A private ticket");
    await pageA.getByLabel("Description").fill("Should not be visible to Requester B.");
    await pageA.getByText("Submit Ticket").click();
    await pageA.waitForURL("**/tickets");

    await pageA.locator("tbody tr:visible, .card:visible").first().click();
    await pageA.waitForURL(/\/tickets\/(\d+)/);
    const ticketUrl = pageA.url();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await selectRequester(pageB, 2); // a different Requester than A

    // Deliberately NOT using page.goto() here: a full navigation reloads the
    // SPA and wipes the in-memory RequesterContext (BR-05 has no persistence
    // across reload), which would trigger the AC-02 "no Requester selected"
    // redirect instead of the AC-03 ownership check we're actually testing.
    // Client-side routing (pushState + popstate) preserves Requester B's
    // session so we genuinely exercise the ownership block.
    const ticketPath = new URL(ticketUrl).pathname;
    await pageB.evaluate((path) => {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, ticketPath);

    await expect(pageB.getByText(/Ticket not found/i)).toBeVisible();
    await expect(pageB.getByText("Requester A private ticket")).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});

test.describe("E2E-03 — attachment upload, soft-remove, blocked download", () => {
  test("a removed attachment can no longer be downloaded", async ({ page }) => {
    await selectRequester(page);

    await page.getByText("+ Create Ticket").click();
    await page.waitForURL("**/create-ticket");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Related System").selectOption({ index: 1 });
    await page.getByLabel("Requested Priority").selectOption({ index: 1 });
    await page.getByLabel("Summary").fill("E2E attachment lifecycle ticket");
    await page.getByLabel("Description").fill("Testing upload, remove, and blocked download.");
    await page.getByText("Submit Ticket").click();
    await page.waitForURL("**/tickets");

    await page.locator("tbody tr:visible, .card:visible").first().click();
    await page.waitForURL(/\/tickets\/\d+/);
    await page.getByText("Attachments", { exact: true }).waitFor();

    // Upload a real small PNG fixture.
    const fixturePath = path.join(__dirname, "fixtures", "test-image.png");
    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await expect(page.getByText("test-image.png")).toBeVisible();

    // Remove it, confirming the native dialog.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Removed")).toBeVisible();

    // Download and Remove buttons should no longer exist for this attachment.
    await expect(page.getByRole("button", { name: "Download" })).not.toBeVisible();
  });
});