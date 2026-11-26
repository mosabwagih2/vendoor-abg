# Vendoor × ABG Work Tracker

Phase 1 of the PRD (`docs/PRD.md`): requests, triage, tasks (list and board), task page with verify / reopen,
releases, Home, My work, Inbox, in-app and email notifications, the seeded backlog, and **Account access**
(encrypted logins with one-click copy).

Plan: `docs/PLAN.md` · Design references: `docs/DESIGN-REFERENCES.md` · Research: `docs/research/` · Screens: `docs/screenshots/`

## Run it on your computer

You need: **Node.js 22**, **pnpm** (`npm i -g pnpm`), **Docker Desktop** (for MySQL) and, for voice notes and
videos to be converted for every browser, **ffmpeg** on the PATH (`winget install ffmpeg` on Windows).

```bash
pnpm install
docker compose up -d
cp .env.example .env
```

Fill the three secrets in `.env` (any random 32-byte base64 values), for example with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` run three times:
`BETTER_AUTH_SECRET`, `CREDENTIALS_KEY`, `FILE_URL_SECRET`.

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 and sign in with any seeded account; the password is `Vendoor!2026`.

| Person | Email | Role |
|---|---|---|
| Mohammed Wagih | mohammed@vendoor.test | Owner |
| Yara | yara@vendoor.test | Admin |
| Mosab Wagih | mosab@vendoor.test | Requester |
| Abdel-fattah | abdelfattah@vendoor.test | Requester |
| Eng. Mohamed Adel | mohamed.adel@vendoor.test | Requester |
| Za8loul | za8loul@abg.test | ABG Lead |
| Ahmed Shiha | ahmed.shiha@abg.test | ABG Member |
| Ahmed Kamal Soliman | ahmed.kamal@abg.test | ABG Member |

Emails are placeholders until the real ones are confirmed. Emails are printed in the terminal (`EMAIL_DRIVER=console`);
set `EMAIL_DRIVER=resend` and `RESEND_API_KEY` to send real mail. Files are stored in `./storage` (`STORAGE_DRIVER=local`);
set `STORAGE_DRIVER=s3` and the `S3_*` variables for an S3/R2 bucket.

`pnpm db:reset` wipes the database and seeds it again.

## Background worker

`pnpm dev` also starts `scripts/worker.ts`. It sends emails, converts media, sends the verify reminder, and sends the weekly report by email to the ABG leads every Thursday when the work day ends (switch it off in Settings > General). On a server, run `pnpm worker` as its own process.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
```

`pnpm e2e` needs `pnpm dev:web` running and `npx playwright install chromium` once. If the browser is installed somewhere else, point `PW_CHROMIUM_PATH` at it.

## Deploying

`docs/deploy-cpanel.md`: GitHub to cPanel, step by step (Node app, PostgreSQL, cron worker).

## Design to code

`docs/components.md` maps each Figma component to the file that implements it.

## Where things are

| Path | What |
|---|---|
| `src/domain/` | Pure rules, no I/O, all unit-tested: permission matrix (`policy.ts`), workflow and Waiting on (`workflow.ts`), five display statuses (`status-display.ts`), SLA working hours (`sla.ts`), inbox tabs (`inbox.ts`), release states (`release-state.ts`), incidents (`incident.ts`), work week Sat to Thu (`week.ts`), credential guard and copy format |
| `src/server/services/` | All writes. Every status change, field change and comment writes an ActivityEvent; permissions are checked here, on the server |
| `src/server/actions/` | Server actions (validated with zod) used by the UI |
| `src/app/(app)/` | Thin pages: home, inbox, requests (triage), my-work, tasks, releases, trouble (incidents), reports and reports/weekly, projects, settings. Each has `loading.tsx`/`error.tsx` at the frame level |
| `src/components/` | Feature folders (`task`, `trouble`, `forms`, `layout`) and the UI kit in `ui/` |
| `tests/unit`, `tests/e2e` | Vitest for the domain rules, Playwright for the main flows and accessibility |
| `scripts/worker.ts` | Background worker: emails, ffmpeg media conversion, 3-working-day verify reminder |
| `prisma/` | Schema, migrations, seed (people, 11 projects, SLA, Egypt holidays, PRD 11.1 backlog) |
| `messages/en.json` | All UI text (Arabic file goes next to it later) |
