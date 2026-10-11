import { test, expect } from "@playwright/test";
import { loginAs } from "../lab-03/helpers.js";
import path from "path";

// Assumes these accounts exist, are active, and mustChangePassword is
// already false. Lab 2's original "Development Requester" dropdown picker
// was retired when Lab 3 introduced real login, so these specs now log in
// as real seeded Requesters instead of selecting one from a dropdown.
const REQUESTER_A_EMAIL = "jennifer.anderson@example.com";
const REQUESTER_A_PASSWORD = "Jennifer123!";
// CONFIRM: this second account's email/password are placeholders — adjust
// to a real, currently-working second Requester before running E2E-02.
const REQUESTER_B_EMAIL = "michael.brown@example.com";
const REQUESTER_B_PASSWORD = "Michael123!";

test.describe("E2E-01 — full ticket creation and discovery flow", () => {
  test("a Requester creates a Ticket and finds it in My Tickets", async ({ page }) => {
    await loginAs(page, REQUESTER_A_EMAIL, REQUESTER_A_PASSWORD);
    // Lab 4: every role lands on /dashboard after login (not /tickets).
    await page.waitForURL("**/dashboard");

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
    // Two separate browser contexts = two separate cookie jars, i.e. two
    // genuinely independent logged-in sessions.
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginAs(pageA, REQUESTER_A_EMAIL, REQUESTER_A_PASSWORD);
    await pageA.waitForURL("**/dashboard");

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
    await loginAs(pageB, REQUESTER_B_EMAIL, REQUESTER_B_PASSWORD); // a different Requester than A
    await pageB.waitForURL("**/dashboard");

    // Lab 2's original version of this test used pushState/popstate instead
    // of page.goto(), because the old in-memory RequesterContext (tied to
    // the retired X-Requester-Id dev picker) was wiped by a full reload.
    // That reasoning no longer applies: Lab 3's real auth lives in an
    // httpOnly session cookie, which survives a full navigation, so a plain
    // goto() is both simpler and more realistic here (a genuine fresh
    // request that the server's ownership check has to reject).
    await pageB.goto(new URL(ticketUrl).pathname);

    await expect(pageB.getByText(/Ticket not found/i)).toBeVisible();
    await expect(pageB.getByText("Requester A private ticket")).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});

test.describe("E2E-03 — attachment upload, soft-remove, blocked download", () => {
  test("a removed attachment can no longer be downloaded", async ({ page }) => {
    await loginAs(page, REQUESTER_A_EMAIL, REQUESTER_A_PASSWORD);
    await page.waitForURL("**/dashboard");

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