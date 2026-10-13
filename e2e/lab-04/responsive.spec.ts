import { test, expect } from "@playwright/test";
import { loginAs } from "../lab-03/helpers.js";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

// Assumes these accounts exist, are active, and mustChangePassword is
// already false — adjust credentials/seed state if that's not the case
// (same assumption Lab 3's responsive.spec.ts makes).
const REQUESTER_EMAIL = "jennifer.anderson@example.com";
const REQUESTER_PASSWORD = "Jennifer123!";
const STAFF_EMAIL = "priya.nair@tiktockit.com";
const STAFF_PASSWORD = "Priya456!";

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test.describe(`Lab 4 Responsive QA — ${name}`, () => {
    test.use({ viewport: size });

    test(`Requester Dashboard — ${name}`, async ({ page }) => {
      await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
      await page.waitForURL("**/dashboard");
      await expect(page.getByText("My Open Tickets")).toBeVisible();
      await page.screenshot({
        path: `../artifacts/lab-04/screenshots/requester-dashboard/${name}.png`,
        fullPage: true,
      });
    });

    test(`Staff Dashboard — ${name}`, async ({ page }) => {
      await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
      await page.waitForURL("**/dashboard");
      await expect(page.getByText("My Assigned")).toBeVisible();
      await page.screenshot({
        path: `../artifacts/lab-04/screenshots/staff-dashboard/${name}.png`,
        fullPage: true,
      });
    });

    test(`Actions Taken panel (empty + populated) — ${name}`, async ({ page }) => {
      await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
      // Lab 4: every role lands on /dashboard after login now, not /queue —
      // navigate there explicitly.
      await page.waitForURL("**/dashboard");
      await page.goto("/queue");
      await page.locator("tbody tr:visible, .card:visible").first().click();
      await page.waitForURL(/\/queue\/\d+/);
      await page.getByText("Actions Taken", { exact: false }).waitFor();
      await page.screenshot({
        path: `../artifacts/lab-04/screenshots/actions-taken/list-${name}.png`,
        fullPage: true,
      });

      // Also capture the Add Action form itself, open.
      const addButton = page.getByRole("button", { name: "+ Add Action" });
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.getByLabel("Action Description").waitFor();
        await page.screenshot({
          path: `../artifacts/lab-04/screenshots/actions-taken/add-form-${name}.png`,
          fullPage: true,
        });
      }
    });
  });
}