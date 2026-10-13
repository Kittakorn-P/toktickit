import { test, expect } from "@playwright/test";
import { loginAs } from "../lab-03/helpers.js";

// Assumes these accounts exist, are active, and mustChangePassword is
// already false — adjust credentials/seed state if that's not the case.
const REQUESTER_EMAIL = "jennifer.anderson@example.com";
const REQUESTER_PASSWORD = "Jennifer123!";
const STAFF_EMAIL = "priya.nair@tiktockit.com";
const STAFF_PASSWORD = "Priya456!";

test.describe("Dashboards — landing page and drill-down (AC-02, E2E-03, E2E-04)", () => {
  test("Requester lands on /dashboard after login and can drill into a metric", async ({ page }) => {
    await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await page.waitForURL("**/dashboard");

    // exact: true — getByText is case-insensitive by default, and a ticket's
    // status badge (e.g. "IN PROGRESS", "RESOLVED") would otherwise also
    // match these card-label checks.
    await expect(page.getByText("My Open Tickets", { exact: true })).toBeVisible();
    await expect(page.getByText("In Progress", { exact: true })).toBeVisible();
    await expect(page.getByText("Resolved", { exact: true })).toBeVisible();
    await expect(page.getByText("Closed", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: /My Open Tickets/ }).click();
    await page.waitForURL(/\/tickets\?status=NEW,OPEN,REOPENED/);
    // Whatever the result — a filtered list or a no-results state — the
    // page itself should load without error.
    // By role, not text: the nav also has a "My Tickets" link, so a plain
    // text match hits both it and the page <h1> and trips strict mode.
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  });

  test("Requester dashboard only ever shows that Requester's own data", async ({ page }) => {
    await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
    await page.waitForURL("**/dashboard");
    await expect(page.getByText(`Welcome back, `)).toBeVisible();
    // Ownership itself is enforced server-side (AC-02/AUTH-06, covered by
    // the API test suite) — this just confirms the dashboard renders
    // without leaking a cross-user error or blank state.
    await expect(page.getByText("Unable to load your dashboard")).not.toBeVisible();
  });

  test("IT Staff lands on /dashboard and 'My Assigned' drills into their own queue", async ({ page }) => {
    await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.waitForURL("**/dashboard");

    await expect(page.getByText("New", { exact: true })).toBeVisible();
    await expect(page.getByText("My Assigned")).toBeVisible();

    await page.getByRole("link", { name: /My Assigned/ }).click();
    await page.waitForURL(/\/queue\?owner=\d+/);
    await expect(page.getByText("My Assigned Tickets")).toBeVisible();
  });

  test("Dashboard nav item shows the active-page indication when on /dashboard", async ({ page }) => {
    await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.waitForURL("**/dashboard");
    const dashboardLink = page.getByRole("link", { name: "Dashboard" });
    await expect(dashboardLink).toHaveClass(/fw-bold/);
  });
});