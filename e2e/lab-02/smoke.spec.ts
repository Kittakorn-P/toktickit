import { test, expect } from "@playwright/test";

test("smoke: Requester Selection screen loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("TokTickIT")).toBeVisible();
});