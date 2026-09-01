import { test } from "@playwright/test";
import { selectRequester } from "./helpers.js";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test.describe(`Responsive QA — ${name}`, () => {
    test.use({ viewport: size });

    test(`Create Ticket — ${name}`, async ({ page }) => {
      await selectRequester(page);
      await page.getByText("+ Create Ticket").click();
      await page.waitForURL("**/create-ticket");
      await page.screenshot({
        path: `../artifacts/lab-02/screenshots/create-ticket/${name}.png`,
        fullPage: true,
      });
    });

    test(`My Tickets — ${name}`, async ({ page }) => {
      await selectRequester(page);
      await page.screenshot({
        path: `../artifacts/lab-02/screenshots/my-tickets/${name}.png`,
        fullPage: true,
      });
    });

    test(`Ticket Detail — ${name}`, async ({ page }) => {
      await selectRequester(page);
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