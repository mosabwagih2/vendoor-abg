import { expect, test } from "@playwright/test";
import { fileBug, signIn, YARA, ZA8LOUL } from "./helpers";

test.describe("Phase 1 main flows", () => {
  test("file a bug → triage accept → ship via release → verify Done", async ({ browser }) => {
    const yara = await signIn(browser, YARA);
    const key = await fileBug(yara, `E2E exchange COD ${Date.now()}`);

    // Vendoor sees Requests read-only: no Accept button.
    await yara.goto(`/requests?peek=${key}`);
    await expect(yara.getByText(/Read-only/)).toBeVisible();
    await expect(yara.getByRole("button", { name: "Accept" })).toHaveCount(0);

    // ABG lead triages: accept with priority and assignee, due date from SLA.
    const lead = await signIn(browser, ZA8LOUL);
    await lead.goto(`/requests?peek=${key}`);
    await lead.getByRole("button", { name: "Accept" }).first().click();
    const dlg = lead.getByRole("dialog");
    await dlg.getByRole("button", { name: "Highest" }).click();
    await dlg.getByRole("button", { name: "Accept" }).click();
    await expect(lead.getByText(`${key} moved to Processing`)).toBeVisible();

    await lead.goto(`/tasks/${key}`);
    await lead.getByRole("button", { name: "Start" }).click();
    await expect(lead.getByText(`${key} moved to Processing`)).toBeVisible();

    // Record a release with this task: it moves to Shipped.
    await lead.goto("/releases");
    await lead.getByRole("button", { name: "Record a release" }).click();
    const rel = lead.getByRole("dialog");
    await rel.getByRole("textbox", { name: "Notes" }).fill("Fix exchange COD");
    const row = rel.locator("label", { hasText: key });
    await row.locator('input[type="checkbox"]').check();
    await rel.getByRole("button", { name: "Record release" }).click();
    await expect(lead.getByText(/recorded\./)).toBeVisible();

    // ABG cannot verify (server-enforced rule; the UI offers nothing either).
    await lead.goto(`/tasks/${key}`);
    await expect(lead.getByRole("button", { name: "Works" })).toHaveCount(0);

    // Requester verifies from Home without leaving it.
    await yara.goto("/home");
    const card = yara.locator("li", { hasText: key });
    await card.getByRole("button", { name: "Works" }).click();
    await expect(yara.getByText(`${key} moved to Done`)).toBeVisible();
    await yara.goto(`/tasks/${key}`);
    await expect(yara.getByText(/Verified by Yara/)).toBeVisible();
  });

  test("ship → Still broken (note required) → Reopened, reopen count 1", async ({ browser }) => {
    const yara = await signIn(browser, YARA);
    const key = await fileBug(yara, `E2E reopen ${Date.now()}`);
    const lead = await signIn(browser, ZA8LOUL);
    await lead.goto(`/tasks/${key}`);
    await lead.getByRole("button", { name: "Accept" }).first().click();
    await lead.getByRole("dialog").getByRole("button", { name: "Accept" }).click();
    await expect(lead.getByText(`${key} moved to Processing`)).toBeVisible();
    await lead.getByRole("button", { name: "Start" }).click();
    await expect(lead.getByText(`${key} moved to Processing`)).toBeVisible();
    await lead.getByRole("button", { name: "Mark shipped" }).click();
    await lead.getByRole("dialog").getByRole("button", { name: "Mark shipped" }).click();
    await expect(lead.getByText(`${key} moved to Completed`)).toBeVisible();

    await yara.goto(`/tasks/${key}`);
    await yara.getByRole("button", { name: "Still broken" }).first().click();
    const dlg = yara.getByRole("dialog");
    await dlg.getByRole("button", { name: "Still broken" }).click();
    await expect(dlg.getByRole("alert")).toBeVisible(); // note is required
    await dlg.getByLabel("What is still broken?").fill("Still charges full COD on exchange order si1267.");
    await dlg.getByRole("button", { name: "Still broken" }).click();
    await expect(yara.getByText(`${key} moved to Processing`)).toBeVisible();
    await yara.reload();
    await expect(yara.locator("dt", { hasText: "Reopen count" }).locator("xpath=..").getByText("1")).toBeVisible();
  });

  test("Account access: email and password are visible with copy buttons, extra accounts append", async ({ browser }) => {
    const lead = await signIn(browser, ZA8LOUL);
    await lead.goto("/tasks/ACC-1");
    await lead.getByRole("button", { name: "Add account" }).click();
    await lead.locator("#c-user-new").fill("ve5372@vendoor.test");
    await lead.locator("#c-pass-new").fill("Ve5372!secret");
    await lead.getByRole("button", { name: "Save" }).click();
    await expect(lead.locator("#c-user-new")).toHaveCount(0); // editor closed
    await expect(lead.getByText("ve5372@vendoor.test").first()).toBeVisible();
    await expect(lead.getByText("Ve5372!secret").first()).toBeVisible();
    await expect(lead.getByRole("button", { name: /^Copy/ }).first()).toBeVisible();
  });

  test("credential guard offers to move a pasted password into Account access", async ({ browser }) => {
    const yara = await signIn(browser, YARA);
    await yara.goto("/tasks/ORD-2");
    await yara.getByPlaceholder(/Write a comment/).fill("arc login\narc@vendoor.test\npassword: Arc#2026x");
    await yara.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(yara.getByRole("heading", { name: "This looks like a password" })).toBeVisible();
    await yara.getByRole("button", { name: "Move to Account access" }).click();
    await expect(yara.getByPlaceholder(/Write a comment/)).toHaveValue(/\[see Account access\]/);
  });
});
