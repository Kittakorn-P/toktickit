import { Page } from "@playwright/test";

export async function selectRequester(page: Page, requesterIndex = 1) {
  await page.goto("/");
  await page.getByLabel(/Development Requester/i).selectOption({ index: requesterIndex });
  await page.getByText("Continue").click();
  await page.waitForURL("**/tickets");
}