import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers.js";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

// Assumes these accounts exist, are active, and mustChangePassword is
// already false — adjust credentials/seed state if that's not the case.
const STAFF_EMAIL = "priya.nair@tiktockit.com";
const STAFF_PASSWORD = "Priya456!";
const ADMIN_EMAIL = "admin@tiktockit.com";
const ADMIN_PASSWORD = "NewSecure123!";

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test.describe(`Responsive QA — ${name}`, () => {
    test.use({ viewport: size });

    test(`Login — ${name}`, async ({ page }) => {
      await page.goto("/login");
      await page.screenshot({
        path: `../artifacts/lab-03/screenshots/authentication/login-${name}.png`,
        fullPage: true,
      });
    });

    test(`Staff Queue — ${name}`, async ({ page }) => {
      await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
      await page.waitForURL("**/queue");
      await expect(page.getByText("Loading queue…")).toHaveCount(0);
      await page.screenshot({
        path: `../artifacts/lab-03/screenshots/staff-queue/${name}.png`,
        fullPage: true,
      });
    });

    test(`Staff Ticket Detail — ${name}`, async ({ page }) => {
      await loginAs(page, STAFF_EMAIL, STAFF_PASSWORD);
      await page.waitForURL("**/queue");
      // Open whichever ticket is first in the queue — same :visible
      // dual-layout pattern as Lab 2's responsive spec.
      await page.locator("tbody tr:visible, .card:visible").first().click();
      await page.waitForURL(/\/queue\/\d+/);
      await page.getByText("Public Comments", { exact: false }).waitFor();
      await page.screenshot({
        path: `../artifacts/lab-03/screenshots/staff-ticket-detail/${name}.png`,
        fullPage: true,
      });
    });

    test(`Admin User Management — ${name}`, async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.waitForURL("**/admin/users");
      await expect(page.getByText("Loading users…")).toHaveCount(0);
      await page.screenshot({
        path: `../artifacts/lab-03/screenshots/user-management/list-${name}.png`,
        fullPage: true,
      });
    
      await page.getByText("+ Create User").click();
      await page.getByText("Create New User").waitFor();
      await page.screenshot({
        path: `../artifacts/lab-03/screenshots/user-management/create-panel-${name}.png`,
        fullPage: true,
      });
    });
  });
}