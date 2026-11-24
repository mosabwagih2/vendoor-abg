import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, YARA } from "./helpers";

test("Home, task page and verify actions work at 375 px", async ({ browser }) => {
  const page = await signIn(browser, YARA, { width: 375, height: 812 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.goto("/tasks/INF-1");
  await expect(page.getByRole("button", { name: "Works" }).first()).toBeVisible();
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow2).toBeLessThanOrEqual(1);
});

test("no serious accessibility violations on Home and Tasks", async ({ browser }) => {
  const page = await signIn(browser, YARA);
  for (const path of ["/home", "/tasks", "/tasks/BOS-1"]) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});
