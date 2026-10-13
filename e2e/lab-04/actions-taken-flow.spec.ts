import { test, expect } from "@playwright/test";
import { loginAs } from "../lab-03/helpers.js";

// Assumes these accounts exist, are active, and mustChangePassword is
// already false — adjust credentials/seed state if that's not the case
// (same assumption Lab 3's responsive.spec.ts makes).
const STAFF_EMAIL = "priya.nair@tiktockit.com";
const STAFF_PASSWORD = "Priya456!";

test.describe("Actions Taken — create flow (AC-01, AC-03)", () => {
  test("IT Staff adds an Action Taken and it appears in the list", async ({ page }) => {
    await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
    // Lab 4: every role lands on /dashboard after login now, not /queue —
    // navigate there explicitly.
    await page.waitForURL("**/dashboard");
    await page.goto("/queue");

    // Same :visible dual-layout pattern as Lab 3's responsive spec — picks
    // whichever ticket is first in the queue, desktop table or mobile card.
    await page.locator("tbody tr:visible, .card:visible").first().click();
    await page.waitForURL(/\/queue\/\d+/);

    await page.getByRole("button", { name: "+ Add Action" }).click();
    const marker = `E2E action ${Date.now()}`;
    await page.getByLabel("Action Description").fill(marker);
    await page.getByLabel("Result").fill("E2E: no issue found, informational check only.");
    await page.getByRole("button", { name: "Add Action", exact: true }).click();

    await expect(page.getByText(marker)).toBeVisible();
    // Form should close back to the list, not linger open.
    await expect(page.getByLabel("Action Description")).not.toBeVisible();
  });

  test("submitting with Follow-Up checked but no note shows a validation error and keeps the form open", async ({ page }) => {
    await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
    // Lab 4: every role lands on /dashboard after login now, not /queue —
    // navigate there explicitly.
    await page.waitForURL("**/dashboard");
    await page.goto("/queue");
    await page.locator("tbody tr:visible, .card:visible").first().click();
    await page.waitForURL(/\/queue\/\d+/);

    await page.getByRole("button", { name: "+ Add Action" }).click();
    // Distinct strings for description vs. result — identical text in both
    // fields made the final assertion ambiguous (matched two textareas).
    await page.getByLabel("Action Description").fill("E2E: validation check description.");
    await page.getByLabel("Result").fill("E2E: validation check result.");
    await page.getByLabel("Follow-Up Required?").check();
    // Follow-up note deliberately left empty.
    await page.getByRole("button", { name: "Add Action", exact: true }).click();

    await expect(page.getByText("Follow-up note is required when follow-up is needed.")).toBeVisible();
    await expect(page.getByLabel("Action Description")).toBeVisible();

    // Fill it in and confirm the same form now submits successfully.
    await page.getByLabel("Follow-up Note").fill("E2E: following up in 2 days.");
    await page.getByRole("button", { name: "Add Action", exact: true }).click();
    await expect(page.getByText("E2E: validation check description.")).toBeVisible();
  });
});