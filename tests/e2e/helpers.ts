import { expect, type Browser, type Page } from "@playwright/test";

export const PASSWORD = process.env.SEED_PASSWORD ?? "Vendoor!2026";
export const YARA = "yara@vendoor.test";
export const ZA8LOUL = "za8loul@abg.test";
export const MOSAB = "mosab@vendoor.test";

export async function signIn(browser: Browser, email: string, viewport?: { width: number; height: number }): Promise<Page> {
  const ctx = await browser.newContext(viewport ? { viewport } : {});
  const page = await ctx.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/home/);
  return page;
}

/** Files a Bug through the New request modal and returns its key. */
export async function fileBug(page: Page, title: string): Promise<string> {
  await page.getByRole("button", { name: "New request" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Bug" }).click();
  await dialog.getByLabel("Project").selectOption({ label: "BOS · Bosta integration" });
  await dialog.getByRole("radio", { name: "Exchange orders" }).click();
  await dialog.getByLabel(/^Title/).fill(title);
  await dialog.getByLabel(/^What happens now/).fill("Exchange order uploaded with full COD instead of shipping value.");
  await dialog.getByLabel(/^What should happen/).fill("Only the shipping value is collected on exchange orders.");
  await dialog.getByLabel(/^Account\(s\) affected/).fill("tamqve@outlook.com");
  await dialog.getByLabel(/^Account\(s\) affected/).press("Enter");
  await dialog.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures/screenshot.png");
  await expect(dialog.getByText("screenshot.png")).toBeVisible();
  await dialog.getByRole("button", { name: "Always" }).click();
  await dialog.getByRole("button", { name: "High" }).click();
  await dialog.getByRole("button", { name: "Submit request" }).click();
  const toast = page.getByText(/BOS-\d+ created/);
  await expect(toast).toBeVisible();
  const key = (await toast.textContent())!.match(/BOS-\d+/)![0];
  return key;
}
