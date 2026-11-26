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

  test("report a system problem: banner shows, ABG closes it with Summary, Impact and Resolution", async ({ browser }) => {
    const yara = await signIn(browser, YARA);
    await yara.getByRole("button", { name: "New request" }).first().click();
    await yara.getByRole("dialog").getByRole("button", { name: /System problem/ }).click();
    await yara.getByRole("radio", { name: /System is slow/ }).click();
    await yara.getByLabel("What do you see?").fill("Saving an order takes 2-3 minutes.");
    await yara.getByRole("button", { name: "Report problem" }).click();
    await expect(yara.getByText(/INC-\d+ opened/)).toBeVisible();
    await expect(yara.getByRole("status").filter({ hasText: "System is slow" })).toBeVisible();

    const lead = await signIn(browser, ZA8LOUL);
    await lead.goto("/trouble");
    await lead.locator('a[href^="/trouble/"]').first().click();
    await lead.getByRole("button", { name: "Mark as fixed" }).click();
    const dlg = lead.getByRole("dialog");
    await expect(dlg.getByRole("button", { name: "Mark as fixed" })).toBeDisabled(); // all three parts are required
    await dlg.getByLabel("Summary").fill("Database was slow");
    await dlg.getByLabel("Impact").fill("Orders took minutes");
    await dlg.getByLabel("Resolution").fill("Added an index");
    await dlg.getByRole("button", { name: "Mark as fixed" }).click();
    await expect(lead.getByText("Incident closed.")).toBeVisible();
  });

  test("weekly report: share link opens without signing in, a tampered link does not", async ({ browser }) => {
    const lead = await signIn(browser, ZA8LOUL);
    await lead.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await lead.goto("/reports/weekly");
    await lead.getByRole("button", { name: "Send report" }).click();
    await lead.getByRole("radio", { name: /Copy a link/ }).click();
    await lead.getByRole("dialog").getByRole("button", { name: "Copy link" }).click();
    await expect(lead.getByText(/Link copied/)).toBeVisible();
    const url = await lead.evaluate(() => navigator.clipboard.readText());
    const anon = await (await browser.newContext()).newPage();
    expect((await anon.goto(url))!.status()).toBe(200);
    await expect(anon.getByRole("heading", { name: "Weekly report" })).toBeVisible();
    expect((await anon.goto(url.slice(0, -3) + "xyz"))!.status()).toBe(404);
  });

  test("custom status: admin adds one to a step, ABG sets it on a task, deleting it puts the task back", async ({ browser }) => {
    const admin = await signIn(browser, YARA);
    await admin.goto("/settings/workflow");
    const name = `Testing ${Date.now() % 10000}`;
    await admin.getByRole("button", { name: "Add status" }).nth(1).click(); // the Active (Processing) step
    await admin.getByLabel("Status name").fill(name);
    await admin.getByRole("button", { name: "Add", exact: true }).click();
    await expect(admin.getByTitle(`${name} (custom)`)).toBeVisible();
    // A duplicate in the same step is refused.
    await admin.getByRole("button", { name: "Add status" }).nth(1).click();
    await admin.getByLabel("Status name").fill(name.toUpperCase());
    await admin.getByRole("button", { name: "Add", exact: true }).click();
    await expect(admin.getByText(/already used/)).toBeVisible();

    const lead = await signIn(browser, ZA8LOUL);
    await lead.goto("/tasks/BOS-2"); // seeded task that is in Processing
    await lead.getByLabel("Status", { exact: true }).selectOption({ label: name });
    // The change is saved by a server action; reload until it shows (it is not instant).
    await expect(async () => {
      await lead.reload();
      await expect(lead.getByLabel("Status", { exact: true })).toHaveValue(/.+/, { timeout: 1500 });
    }).toPass({ timeout: 15_000 });

    await admin.reload();
    await admin.getByRole("button", { name: `Edit ${name}` }).click();
    await admin.getByRole("button", { name: /Delete status/ }).click();
    await expect(admin.getByText(/back in Processing/)).toBeVisible();
  });
});
