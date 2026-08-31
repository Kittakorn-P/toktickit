import { Page } from "@playwright/test";

export async function selectRequester(page: Page) {
  await page.goto("/");
  await page.getByLabel(/Development Requester/i).selectOption({ index: 1 });
  await page.getByText("Continue").click();
  await page.waitForURL("**/tickets");
}