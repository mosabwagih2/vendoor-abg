# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows.spec.ts >> Phase 1 main flows >> custom status: admin adds one to a step, ABG sets it on a task, deleting it puts the task back
- Location: tests/e2e/flows.spec.ts:137:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Status', { exact: true })
Expected pattern: /.+/
Received string:  ""
Timeout: 5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Status', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Status', { exact: true })
    14 × locator resolved to <select id="p-status" class="w-full rounded-control border border-border bg-surface px-2.5 text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 aria-[invalid=true]:border-danger pe-7 h-7">…</select>
       - unexpected value ""

```

```yaml
- combobox "Status":
  - option "Processing" [selected]
  - option "Testing 1829"
```

# Test source

```ts
  55  |     await lead.getByRole("button", { name: "Accept" }).first().click();
  56  |     await lead.getByRole("dialog").getByRole("button", { name: "Accept" }).click();
  57  |     await expect(lead.getByText(`${key} moved to Processing`)).toBeVisible();
  58  |     await lead.getByRole("button", { name: "Start" }).click();
  59  |     await expect(lead.getByText(`${key} moved to Processing`)).toBeVisible();
  60  |     await lead.getByRole("button", { name: "Mark shipped" }).click();
  61  |     await lead.getByRole("dialog").getByRole("button", { name: "Mark shipped" }).click();
  62  |     await expect(lead.getByText(`${key} moved to Completed`)).toBeVisible();
  63  | 
  64  |     await yara.goto(`/tasks/${key}`);
  65  |     await yara.getByRole("button", { name: "Still broken" }).first().click();
  66  |     const dlg = yara.getByRole("dialog");
  67  |     await dlg.getByRole("button", { name: "Still broken" }).click();
  68  |     await expect(dlg.getByRole("alert")).toBeVisible(); // note is required
  69  |     await dlg.getByLabel("What is still broken?").fill("Still charges full COD on exchange order si1267.");
  70  |     await dlg.getByRole("button", { name: "Still broken" }).click();
  71  |     await expect(yara.getByText(`${key} moved to Processing`)).toBeVisible();
  72  |     await yara.reload();
  73  |     await expect(yara.locator("dt", { hasText: "Reopen count" }).locator("xpath=..").getByText("1")).toBeVisible();
  74  |   });
  75  | 
  76  |   test("Account access: email and password are visible with copy buttons, extra accounts append", async ({ browser }) => {
  77  |     const lead = await signIn(browser, ZA8LOUL);
  78  |     await lead.goto("/tasks/ACC-1");
  79  |     await lead.getByRole("button", { name: "Add account" }).click();
  80  |     await lead.locator("#c-user-new").fill("ve5372@vendoor.test");
  81  |     await lead.locator("#c-pass-new").fill("Ve5372!secret");
  82  |     await lead.getByRole("button", { name: "Save" }).click();
  83  |     await expect(lead.locator("#c-user-new")).toHaveCount(0); // editor closed
  84  |     await expect(lead.getByText("ve5372@vendoor.test").first()).toBeVisible();
  85  |     await expect(lead.getByText("Ve5372!secret").first()).toBeVisible();
  86  |     await expect(lead.getByRole("button", { name: /^Copy/ }).first()).toBeVisible();
  87  |   });
  88  | 
  89  |   test("credential guard offers to move a pasted password into Account access", async ({ browser }) => {
  90  |     const yara = await signIn(browser, YARA);
  91  |     await yara.goto("/tasks/ORD-2");
  92  |     await yara.getByPlaceholder(/Write a comment/).fill("arc login\narc@vendoor.test\npassword: Arc#2026x");
  93  |     await yara.getByRole("button", { name: "Comment", exact: true }).click();
  94  |     await expect(yara.getByRole("heading", { name: "This looks like a password" })).toBeVisible();
  95  |     await yara.getByRole("button", { name: "Move to Account access" }).click();
  96  |     await expect(yara.getByPlaceholder(/Write a comment/)).toHaveValue(/\[see Account access\]/);
  97  |   });
  98  | 
  99  |   test("report a system problem: banner shows, ABG closes it with Summary, Impact and Resolution", async ({ browser }) => {
  100 |     const yara = await signIn(browser, YARA);
  101 |     await yara.getByRole("button", { name: "New request" }).first().click();
  102 |     await yara.getByRole("dialog").getByRole("button", { name: /System problem/ }).click();
  103 |     await yara.getByRole("radio", { name: /System is slow/ }).click();
  104 |     await yara.getByLabel("What do you see?").fill("Saving an order takes 2-3 minutes.");
  105 |     await yara.getByRole("button", { name: "Report problem" }).click();
  106 |     await expect(yara.getByText(/INC-\d+ opened/)).toBeVisible();
  107 |     await expect(yara.getByRole("status").filter({ hasText: "System is slow" })).toBeVisible();
  108 | 
  109 |     const lead = await signIn(browser, ZA8LOUL);
  110 |     await lead.goto("/trouble");
  111 |     await lead.locator('a[href^="/trouble/"]').first().click();
  112 |     await lead.getByRole("button", { name: "Mark as fixed" }).click();
  113 |     const dlg = lead.getByRole("dialog");
  114 |     await expect(dlg.getByRole("button", { name: "Mark as fixed" })).toBeDisabled(); // all three parts are required
  115 |     await dlg.getByLabel("Summary").fill("Database was slow");
  116 |     await dlg.getByLabel("Impact").fill("Orders took minutes");
  117 |     await dlg.getByLabel("Resolution").fill("Added an index");
  118 |     await dlg.getByRole("button", { name: "Mark as fixed" }).click();
  119 |     await expect(lead.getByText("Incident closed.")).toBeVisible();
  120 |   });
  121 | 
  122 |   test("weekly report: share link opens without signing in, a tampered link does not", async ({ browser }) => {
  123 |     const lead = await signIn(browser, ZA8LOUL);
  124 |     await lead.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  125 |     await lead.goto("/reports/weekly");
  126 |     await lead.getByRole("button", { name: "Send report" }).click();
  127 |     await lead.getByRole("radio", { name: /Copy a link/ }).click();
  128 |     await lead.getByRole("dialog").getByRole("button", { name: "Copy link" }).click();
  129 |     await expect(lead.getByText(/Link copied/)).toBeVisible();
  130 |     const url = await lead.evaluate(() => navigator.clipboard.readText());
  131 |     const anon = await (await browser.newContext()).newPage();
  132 |     expect((await anon.goto(url))!.status()).toBe(200);
  133 |     await expect(anon.getByRole("heading", { name: "Weekly report" })).toBeVisible();
  134 |     expect((await anon.goto(url.slice(0, -3) + "xyz"))!.status()).toBe(404);
  135 |   });
  136 | 
  137 |   test("custom status: admin adds one to a step, ABG sets it on a task, deleting it puts the task back", async ({ browser }) => {
  138 |     const admin = await signIn(browser, YARA);
  139 |     await admin.goto("/settings/workflow");
  140 |     const name = `Testing ${Date.now() % 10000}`;
  141 |     await admin.getByRole("button", { name: "Add status" }).nth(1).click(); // the Active (Processing) step
  142 |     await admin.getByLabel("Status name").fill(name);
  143 |     await admin.getByRole("button", { name: "Add", exact: true }).click();
  144 |     await expect(admin.getByTitle(`${name} (custom)`)).toBeVisible();
  145 |     // A duplicate in the same step is refused.
  146 |     await admin.getByRole("button", { name: "Add status" }).nth(1).click();
  147 |     await admin.getByLabel("Status name").fill(name.toUpperCase());
  148 |     await admin.getByRole("button", { name: "Add", exact: true }).click();
  149 |     await expect(admin.getByText(/already used/)).toBeVisible();
  150 | 
  151 |     const lead = await signIn(browser, ZA8LOUL);
  152 |     await lead.goto("/tasks/BOS-2"); // seeded task that is in Processing
  153 |     await lead.getByLabel("Status", { exact: true }).selectOption({ label: name });
  154 |     await lead.reload();
> 155 |     await expect(lead.getByLabel("Status", { exact: true })).toHaveValue(/.+/);
      |                                                              ^ Error: expect(locator).toHaveValue(expected) failed
  156 | 
  157 |     await admin.reload();
  158 |     await admin.getByRole("button", { name: `Edit ${name}` }).click();
  159 |     await admin.getByRole("button", { name: /Delete status/ }).click();
  160 |     await expect(admin.getByText(/back in Processing/)).toBeVisible();
  161 |   });
  162 | });
  163 | 
```