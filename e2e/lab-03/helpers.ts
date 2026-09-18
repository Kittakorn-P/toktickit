import { Page } from "@playwright/test";

export async function loginAs(page: Page, email: string, password: string) {
    await page.goto("/login");
    await page.getByLabel(/Email address/i).fill(email);
    await page.getByLabel(/Password/i).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
  }