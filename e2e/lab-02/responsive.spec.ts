import { test } from "@playwright/test";
import { loginAs } from "../lab-03/helpers.js";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

// Assumes this account exists, is active, and mustChangePassword is already
// false. Lab 2's original "Development Requester" dropdown picker was
// retired when Lab 3 introduced real login, so these specs now log in as a
// real seeded Requester instead of selecting one from a dropdown.
const REQUESTER_EMAIL = "jennifer.anderson@example.com";
const REQUESTER_PASSWORD = "Jennifer123!";

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test.describe(`Responsive QA — ${name}`, () => {
    test.use({ viewport: size });

    test(`Create Ticket — ${name}`, async ({ page }) => {
      await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
      // Lab 4: every role lands on /dashboard after login (not /tickets).
      // "+ Create Ticket" is also a Quick Action there, so the click still works.
      await page.waitForURL("**/dashboard");
      await page.getByText("+ Create Ticket").click();
      await page.waitForURL("**/create-ticket");
      await page.screenshot({
        path: `../artifacts/lab-02/screenshots/create-ticket/${name}.png`,
        fullPage: true,
      });
    });

    test(`My Tickets — ${name}`, async ({ page }) => {
      await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
      await page.waitForURL("**/dashboard");
      // Old selectRequester() used to land straight on /tickets; now it has
      // to be navigated to explicitly.
      await page.goto("/tickets");
      // Wait on the page's <h1> by role, not by text: the nav also has a
      // "My Tickets" link, which is hidden behind the hamburger on mobile
      // and comes first in DOM order, so a text match + .first() picks the
      // hidden one and waits forever at narrow viewports.
      await page.getByRole("heading", { name: "My Tickets" }).waitFor();
      await page.screenshot({
        path: `../artifacts/lab-02/screenshots/my-tickets/${name}.png`,
        fullPage: true,
      });
    });

    test(`Ticket Detail — ${name}`, async ({ page }) => {
      await loginAs(page, REQUESTER_EMAIL, REQUESTER_PASSWORD);
      await page.waitForURL("**/dashboard");
      // Create a ticket first so there's a real detail page to screenshot.
      await page.getByText("+ Create Ticket").click();
      await page.waitForURL("**/create-ticket");
      await page.getByLabel("Category").selectOption({ index: 1 });
      await page.getByLabel("Related System").selectOption({ index: 1 });
      await page.getByLabel("Requested Priority").selectOption({ index: 1 });
      await page.getByLabel("Summary").fill("Responsive QA screenshot ticket");
      await page
        .getByLabel("Description")
        .fill("Ticket created for responsive/visual QA screenshots.");
      await page.getByText("Submit Ticket").click();
      await page.waitForURL("**/tickets");

      // Open the ticket we just created (first row/card in the list).
      // Both the desktop table row and mobile card exist in the DOM at all
      // times (CSS just toggles visibility) — :visible ensures we click
      // whichever one is actually shown at the current viewport.
      await page.locator("tbody tr:visible, .card:visible").first().click();
      await page.waitForURL(/\/tickets\/\d+/);
      // waitForURL only confirms navigation — wait for the actual ticket
      // data to finish loading before screenshotting, or we capture the
      // "Loading ticket…" placeholder instead of real content.
      await page.getByText("Attachments", { exact: true }).waitFor();

      await page.screenshot({
        path: `../artifacts/lab-02/screenshots/ticket-detail/${name}.png`,
        fullPage: true,
      });
    });
  });
}