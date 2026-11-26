# Build plan: Vendoor × ABG Work Tracker, Phase 1

Status: **draft, waiting for approval. No code written yet.**
Source of truth: `docs/PRD.md` (converted from the uploaded .docx, diagrams in `docs/media/`).

---

## 0. What Phase 1 is (my reading of the PRD)

Goal (12.1): every request lives in the app, and Vendoor confirms every fix.

| In Phase 1 | PRD | Not in Phase 1 (only the data model is ready for it) |
|---|---|---|
| Sign-in, members, roles, projects, Settings (members, projects, SLA calendar, notification prefs, profile) | 3.3, 6.14 | Reports dashboard (6.10), Team page (6.9) |
| New request with typed fields, attachments, voice notes, credential guard | 6.7 | Project updates and weekly report (6.8.3, 6.8.4) |
| Requests triage: Accept / Ask / Decline / Merge | 6.4 | Incidents UI (6.12) |
| Tasks list + board, filters, Display menu, saved views, bulk, CSV | 6.5 | SLA at-risk / breach **alerts**, Inbox grouping, digests (7) |
| Task page with verify / reopen, decision, sub-tasks, occurrences, relations, activity, quick replies | 6.6 | ⌘K command menu, full keyboard shortcuts (6.13, 9.5) |
| Home and My work | 6.1, 6.3 | Dark theme, Arabic RTL UI, audit log UI, full data export, WhatsApp |
| Releases (incl. upcoming release) | 6.11 | 2FA |
| In-app + email notifications for the Phase 1 events | 7 | |
| Seed backlog | 11.1 | |

SLA **calculation** is Phase 1 (triage countdown FR-4.1, due-date prefill on Accept, overdue). Only the SLA **alerts** are Phase 2.

---

## 1. Stack

| Concern | Choice | Note |
|---|---|---|
| Framework | Next.js (App Router, latest stable) + TypeScript strict | Server Components for reads, Server Actions for writes |
| DB | PostgreSQL 16 + Prisma (since moved to **MySQL 8**: see `prisma/migrations/*_init_mysql`; duplicate hints use a TypeScript trigram match, `src/domain/trigram.ts`) | Full-text search with a generated `tsvector` column (raw SQL migration) + `pg_trgm` for duplicate hints |
| UI | Tailwind CSS v4 (tokens in `@theme` from section 9) + shadcn/ui (Radix) + Lucide | Inter + JetBrains Mono via `next/font` |
| Auth | **Proposed: Better Auth** (email + password with Argon2id, magic-link plugin via Resend, admin plugin, DB sessions 30 days). Needs your OK; see section 10 | Lucia was deprecated in 2024. Auth.js joined Better Auth in Sept 2025, is security-fixes-only, and v5 never left beta |
| Validation | Zod, shared by forms and server actions | |
| Rich text | Tiptap (StarterKit + Link + Image + Mention + CodeBlock) | Stored as JSON + plain text copy for search and credential guard |
| Lists | TanStack Table + TanStack Virtual | 1,000 rows < 1 s |
| Board | dnd-kit | |
| i18n | next-intl, `messages/en.json` | Every string; `dir` attribute wired; logical CSS only (`ps-`, `me-`, `start-`, `end-`) + lint rule banning `pl-/pr-/ml-/mr-/left-/right-/text-left/text-right` |
| Dates | date-fns + @date-fns/tz, `Africa/Cairo` | All storage in UTC `timestamptz` |
| Files | S3-compatible (AWS S3 / Cloudflare R2 / MinIO in dev), browser uploads straight to the bucket with presigned PUT (multipart above 20 MB), reads via 1 h signed GET | App server never streams 100 MB bodies |
| Email | Resend (SMTP adapter as fallback) + React Email templates | Plain, single action |
| Jobs | pg-boss (Postgres-backed queue) in a small worker process (Docker image with ffmpeg + audiowaveform) | Email, 3-working-day verify reminder, **media processing** (section 10). Needs a long-running process, see hosting question |
| Real time (5 s) | Phase 1: lightweight polling (`/api/changes?since=`) that triggers `router.refresh()` on open pages | SSE later without changing the data model |
| Tests | Vitest (logic, permission matrix, workflow, SLA, guard), Playwright (flows, 375 px, axe accessibility checks) | |
| Lint | ESLint (next + typescript-eslint strict + jsx-a11y + i18next/no-literal-string) + Prettier | No hard-coded strings in components is enforced by lint |

---

## 2. Folder structure

```
.
├─ docs/                    PRD.md, PLAN.md, media/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/           incl. raw SQL: tsvector, pg_trgm, check constraints
│  └─ seed/
│     ├─ index.ts           idempotent (upsert by natural keys)
│     ├─ people.ts          section 3.1
│     ├─ projects.ts        section 4.4 + quick-pick categories
│     ├─ sla.ts             section 4.3 defaults, calendar
│     └─ backlog.ts         section 11.1 (M10)
├─ messages/en.json         all UI strings
├─ src/
│  ├─ app/
│  │  ├─ (auth)/sign-in, check-email, invite/[token], reset-password
│  │  ├─ (app)/layout.tsx   sidebar shell + mobile bottom bar + task peek panel
│  │  │  ├─ home/  inbox/  my-work/  requests/  new/
│  │  │  ├─ tasks/          list + board (?view=, filters in URL)
│  │  │  ├─ tasks/[key]/    full task page (BOS-14)
│  │  │  ├─ projects/  projects/[key]/   (minimal in Phase 1)
│  │  │  ├─ releases/  releases/[number]/
│  │  │  └─ settings/members|projects|sla|notifications|profile
│  │  └─ api/
│  │     ├─ auth/[...nextauth]
│  │     ├─ uploads/presign      POST  (and multipart create/complete)
│  │     ├─ files/[id]           GET → 302 to 1 h signed URL (after auth check)
│  │     ├─ tasks/export         GET CSV of current filters
│  │     ├─ changes              GET polling for real time
│  │     └─ health
│  ├─ server/               server-only code (imports 'server-only')
│  │  ├─ db.ts
│  │  ├─ auth/              Auth.js config, getCurrentMember()
│  │  ├─ policy/            permission matrix 3.3: can(actor, action, subject)
│  │  ├─ workflow/          statuses, transitions table, waitingOn(), engine.transition()
│  │  ├─ sla/               working-time calendar + SLA calculator (pure, no DB)
│  │  ├─ services/          tasks, triage, comments, occurrences, relations, releases,
│  │  │                     attachments, views, members, projects, notifications
│  │  ├─ actions/           thin 'use server' wrappers: zod parse → service
│  │  ├─ activity/          recordEvent() used by every service mutation
│  │  ├─ notify/            event → recipients rules (section 7), in-app + email enqueue
│  │  ├─ storage/           S3 client, presign, key layout
│  │  ├─ email/             templates + transport
│  │  └─ jobs/              pg-boss worker entry, scheduled jobs
│  ├─ lib/                  isomorphic pure code: credential-guard, task-key, filters codec,
│  │                        date formatting, file-type rules
│  ├─ components/
│  │  ├─ ui/                shadcn primitives (restyled to tokens)
│  │  ├─ icons/             StatusIcon, PriorityIcon (SVG per 9.2, with aria-label)
│  │  ├─ task/              TaskRow, TaskCard, PropertyChip, ActionBar, ActivityFeed,
│  │  │                     OccurrenceForm, AttachmentList, AudioPlayer, VoiceRecorder …
│  │  ├─ layout/            Sidebar, BottomBar, PageHeader, Peek panel
│  │  └─ forms/             NewRequest, Accept, AskInfo, Decline, Merge, Reopen …
│  ├─ i18n/                 next-intl config
│  └─ styles/tokens.css     section 9 tokens as CSS variables (light + dark values)
├─ tests/
│  ├─ unit/                 sla, workflow, policy, credential-guard, filters codec …
│  ├─ integration/          services against a real test Postgres
│  └─ e2e/                  Playwright
├─ worker/                  pg-boss worker entry (same code base)
├─ docker-compose.yml       postgres + minio + mailpit for local dev
└─ .env.example
```

---

## 3. Prisma schema draft

Notes on deviations from PRD section 8 (all additive, reasons inline):
- **Attachment** uses nullable FKs (taskId / commentId / occurrenceId / incidentId) + a CHECK "exactly one" instead of `owner_type/owner_id`, so the DB keeps referential integrity.
- **ReleaseTask** join table instead of only `Task.release_id`: a task reopened and re-shipped belongs to two releases; FR-11.3 "Regressed" needs that history. `Task.currentReleaseId` is kept for the property column.
- **TaskStatusSpan**: one row per time a task sits in a status. Makes SLA pause maths, "age in status" and Phase 2 aging/throughput reports cheap. ActivityEvent is still written for every change.
- **Task.createdById** separate from **requesterId**: rule 11.2.6 lets Yara file on behalf of ops staff.
- **Task.previousStatus**: Answer on Needs info returns to the ABG status it came from.
- **TaskKeyAlias**: if a task moves project (bulk action), BOS-14 becomes ORD-31 and old links keep working.
- Typed request fields are real columns (fixed fields, no custom fields per 2.2).
- Phase 2 tables (Incident, IncidentTimelineEntry, ProjectUpdate) are created now so Phase 2 adds no breaking migration.

```prisma
generator client { provider = "prisma-client-js" previewFeatures = ["fullTextSearchPostgres"] }
datasource db  { provider = "postgresql" url = env("DATABASE_URL") }

enum Role          { owner admin requester abg_lead abg_member }
enum TeamSide      { requester delivery }            // Vendoor, ABG
enum MemberStatus  { invited active deactivated }
enum TaskType      { bug change feature question ops }
enum TaskStatus    { triage needs_info planned in_progress shipped reopened done closed }
enum Priority      { urgent high medium low }
enum CloseReason   { duplicate wont_do canceled }
enum HowOften      { once sometimes always }
enum RelationKind  { related blocks duplicate_of }
enum ReleaseType   { planned hotfix }
enum ReleaseState  { upcoming released }
enum Health        { on_track at_risk off_track }
enum IncidentState { investigating identified monitoring resolved }
enum Channel       { in_app email whatsapp }
enum CommentKind   { comment ask_info answer reopen_note status_request close_note }

model Workspace {
  id              String   @id @default(uuid()) @db.Uuid
  name            String
  timezone        String   @default("Africa/Cairo")
  workingDays     Int[]    @default([0,1,2,3,4])      // 0 = Sunday
  workDayStartMin Int      @default(600)               // 10:00
  workDayEndMin   Int      @default(1080)              // 18:00
  verifyReminderWorkingDays Int @default(3)
  unverifiedWorkingDays     Int @default(7)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  teams Team[]  projects Project[]  holidays Holiday[]  slaTargets SlaTarget[]
}

model SlaTarget {                     // section 4.3, editable in Settings
  id                   String   @id @default(uuid()) @db.Uuid
  workspaceId          String   @db.Uuid
  priority             Priority
  firstResponseMinutes Int                          // working minutes
  resolutionMinutes    Int?                         // null = none (Low)
  workspace Workspace @relation(fields: [workspaceId], references: [id])
  @@unique([workspaceId, priority])
}

model Holiday {
  id String @id @default(uuid()) @db.Uuid
  workspaceId String @db.Uuid
  date DateTime @db.Date
  name String
  workspace Workspace @relation(fields: [workspaceId], references: [id])
  @@unique([workspaceId, date])
}

model Team {
  id String @id @default(uuid()) @db.Uuid
  workspaceId String @db.Uuid
  name String
  side TeamSide
  workspace Workspace @relation(fields: [workspaceId], references: [id])
  members Member[]
  @@unique([workspaceId, side])
}

model Member {
  id             String       @id @default(uuid()) @db.Uuid
  teamId         String       @db.Uuid
  name           String
  handle         String       @unique                 // /team/ahmed-shiha, @mentions
  email          String       @unique
  emailVerified  DateTime?    @db.Timestamptz
  passwordHash   String?
  avatarKey      String?
  role           Role
  status         MemberStatus @default(invited)
  sessionVersion Int          @default(0)
  locale         String       @default("en")
  theme          String       @default("light")
  lastActiveAt   DateTime?    @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  team Team @relation(fields: [teamId], references: [id])
  notificationPrefs NotificationPref[]
  // + back-relations
}

model NotificationPref {
  memberId String  @db.Uuid
  event    String                                   // e.g. "task.shipped"
  inApp    Boolean @default(true)
  email    Boolean @default(true)
  whatsapp Boolean @default(false)                  // phase 3
  member Member @relation(fields: [memberId], references: [id])
  @@id([memberId, event])
}

model Invitation {
  id String @id @default(uuid()) @db.Uuid
  email String
  role Role
  teamId String @db.Uuid
  tokenHash String @unique
  invitedById String @db.Uuid
  expiresAt DateTime @db.Timestamptz
  acceptedAt DateTime? @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz
}

model VerificationToken {               // Auth.js magic link
  identifier String
  token      String @unique
  expires    DateTime @db.Timestamptz
  @@unique([identifier, token])
}

model Project {
  id             String  @id @default(uuid()) @db.Uuid
  workspaceId    String  @db.Uuid
  key            String  @unique                   // BOS
  name           String
  description    String?
  health         Health  @default(on_track)
  vendoorLeadId  String? @db.Uuid
  abgLeadId      String? @db.Uuid
  nextTaskNumber Int     @default(1)               // atomic increment on create
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  categories ProjectCategory[]  tasks Task[]  updates ProjectUpdate[]
}

model ProjectCategory {                 // quick-pick on New request
  id String @id @default(uuid()) @db.Uuid
  projectId String @db.Uuid
  name String
  position Int
  archivedAt DateTime? @db.Timestamptz
  project Project @relation(fields: [projectId], references: [id])
}

model Task {
  id                String      @id @default(uuid()) @db.Uuid
  projectId         String      @db.Uuid
  number            Int
  key               String      @unique              // BOS-14
  title             String
  description       Json?                            // Tiptap doc
  descriptionText   String      @default("")
  type              TaskType
  status            TaskStatus  @default(triage)
  previousStatus    TaskStatus?                      // to return to after Needs info
  statusChangedAt   DateTime    @db.Timestamptz
  priority          Priority?                        // set by ABG on Accept
  suggestedPriority Priority?
  categoryId        String?     @db.Uuid
  requesterId       String      @db.Uuid
  createdById       String      @db.Uuid
  assigneeId        String?     @db.Uuid
  parentId          String?     @db.Uuid             // sub-tasks
  currentReleaseId  String?     @db.Uuid
  // typed request fields (6.7)
  currentBehaviour  String?
  expectedBehaviour String?
  whyItMatters      String?
  howOften          HowOften?
  isOrderRelated    Boolean     @default(false)
  accounts          String[]
  orderCodes        String[]
  // decision (6.3)
  decisionText      String?
  decisionUpdatedAt DateTime?   @db.Timestamptz
  decisionUpdatedById String?   @db.Uuid
  // dates and SLA (stored = latest computed; recomputed on pause/resume/priority change)
  dueAt                  DateTime? @db.Timestamptz
  slaFirstResponseDueAt  DateTime? @db.Timestamptz
  slaResolutionDueAt     DateTime? @db.Timestamptz
  slaClockStartedAt      DateTime? @db.Timestamptz   // createdAt, or launch date for seed
  firstResponseAt        DateTime? @db.Timestamptz
  shippedAt              DateTime? @db.Timestamptz
  verifyReminderSentAt   DateTime? @db.Timestamptz
  verifiedAt             DateTime? @db.Timestamptz
  verifiedById           String?   @db.Uuid
  reopenCount            Int       @default(0)
  closeReason            CloseReason?
  closedAt               DateTime? @db.Timestamptz
  occurrenceCount        Int       @default(0)       // denormalised counter
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  // search_vector tsvector GENERATED ALWAYS (raw SQL), GIN index; trigram index on title
  project Project @relation(fields: [projectId], references: [id])
  parent  Task?   @relation("Subtasks", fields: [parentId], references: [id])
  subtasks Task[] @relation("Subtasks")
  @@unique([projectId, number])
  @@index([status]) @@index([assigneeId, status]) @@index([requesterId, status])
  @@index([projectId, status]) @@index([dueAt]) @@index([updatedAt])
}

model TaskKeyAlias { key String @id  taskId String @db.Uuid }

model TaskStatusSpan {                  // one row per stay in a status
  id String @id @default(uuid()) @db.Uuid
  taskId String @db.Uuid
  status TaskStatus
  enteredAt DateTime @db.Timestamptz
  leftAt DateTime? @db.Timestamptz
  actorId String? @db.Uuid
  @@index([taskId, enteredAt])
}

model Follower {
  taskId String @db.Uuid
  memberId String @db.Uuid
  following Boolean @default(true)       // false = explicitly unfollowed; auto-follow won't re-add
  source String                          // requester|assignee|commenter|mention|manual
  @@id([taskId, memberId])
}

model Occurrence {
  id String @id @default(uuid()) @db.Uuid
  taskId String @db.Uuid
  reportedById String @db.Uuid
  accounts String[]
  orderCodes String[]
  happenedAt DateTime @db.Timestamptz
  note String?
  mergedFromTaskId String? @db.Uuid       // when a request was merged in
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
}

model Comment {
  id String @id @default(uuid()) @db.Uuid
  taskId String @db.Uuid
  authorId String @db.Uuid
  kind CommentKind @default(comment)
  body Json
  bodyText String
  isInternal Boolean @default(false)      // ABG only
  editedAt DateTime? @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  reactions Reaction[]
}

model Reaction {
  commentId String @db.Uuid
  memberId String @db.Uuid
  emoji String
  createdAt DateTime @default(now()) @db.Timestamptz
  @@id([commentId, memberId, emoji])
}

model Attachment {
  id String @id @default(uuid()) @db.Uuid
  taskId String? @db.Uuid
  commentId String? @db.Uuid
  occurrenceId String? @db.Uuid
  incidentId String? @db.Uuid
  uploadedById String @db.Uuid
  storageKey String @unique
  fileName String
  mime String
  size BigInt
  durationSec Float?
  width Int?  height Int?
  thumbnailKey String?
  status String @default("pending")      // pending → ready after upload confirmed
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  // CHECK: exactly one of taskId/commentId/occurrenceId/incidentId (raw SQL)
}

model TaskRelation {
  id String @id @default(uuid()) @db.Uuid
  fromTaskId String @db.Uuid
  toTaskId String @db.Uuid
  kind RelationKind
  createdById String @db.Uuid
  createdAt DateTime @default(now()) @db.Timestamptz
  @@unique([fromTaskId, toTaskId, kind])
}

model Release {
  id String @id @default(uuid()) @db.Uuid
  number String @unique                   // R-2026-11-22, R-2026-11-22-2
  state ReleaseState
  type ReleaseType
  targetDate DateTime? @db.Timestamptz    // upcoming
  releasedAt DateTime? @db.Timestamptz
  notes Json?
  createdById String @db.Uuid
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  tasks ReleaseTask[]
}

model ReleaseTask {
  releaseId String @db.Uuid
  taskId String @db.Uuid
  addedAt DateTime @default(now()) @db.Timestamptz
  @@id([releaseId, taskId])
}

model Incident {                         // Phase 2 UI; table now
  id String @id @default(uuid()) @db.Uuid
  number Int @unique                      // INC-7
  title String
  scope String
  state IncidentState
  startedAt DateTime @db.Timestamptz
  resolvedAt DateTime? @db.Timestamptz
  impact String?
  rootCause String?
  followUpTaskId String? @db.Uuid
  followUpNoneReason String?
  openedById String @db.Uuid
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
  timeline IncidentTimelineEntry[]
}

model IncidentTimelineEntry {
  id String @id @default(uuid()) @db.Uuid
  incidentId String @db.Uuid
  authorId String @db.Uuid
  state IncidentState?
  body String
  at DateTime @default(now()) @db.Timestamptz
  incident Incident @relation(fields: [incidentId], references: [id])
}

model ProjectUpdate {                    // Phase 2 UI; table now
  id String @id @default(uuid()) @db.Uuid
  projectId String @db.Uuid
  authorId String @db.Uuid
  health Health
  body Json
  periodStart DateTime @db.Date
  periodEnd DateTime @db.Date
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  project Project @relation(fields: [projectId], references: [id])
}

model ActivityEvent {
  id          String   @id @default(uuid()) @db.Uuid
  actorId     String?  @db.Uuid              // null = system (e.g. release job)
  subjectType String                         // task|comment|release|member|project|incident
  subjectId   String   @db.Uuid
  taskId      String?  @db.Uuid              // denormalised for task history queries
  verb        String                         // created, status_changed, field_changed, commented,
                                             // verified, reopened, merged, occurrence_added,
                                             // decision_changed, description_edited,
                                             // credential_guard_override, status_requested …
  field       String?
  fromValue   Json?
  toValue     Json?
  isInternal  Boolean  @default(false)       // hidden from Vendoor (internal notes)
  meta        Json?
  at          DateTime @default(now()) @db.Timestamptz
  @@index([taskId, at]) @@index([at]) @@index([subjectType, subjectId])
}

model Notification {
  id String @id @default(uuid()) @db.Uuid
  memberId String @db.Uuid
  eventId String @db.Uuid
  taskId String? @db.Uuid
  kind String                              // task.shipped, task.mentioned …
  channel Channel
  readAt DateTime? @db.Timestamptz
  snoozedUntil DateTime? @db.Timestamptz
  sentAt DateTime? @db.Timestamptz         // email delivered
  createdAt DateTime @default(now()) @db.Timestamptz
  @@index([memberId, readAt, createdAt])
}

model SavedView {
  id String @id @default(uuid()) @db.Uuid
  ownerId String? @db.Uuid
  isShared Boolean @default(false)
  name String
  filters Json
  display Json
  position Int @default(0)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt      @db.Timestamptz
  archivedAt DateTime? @db.Timestamptz
}
```
(Relations/back-relations abbreviated; the real file will declare every FK with `onDelete: Restrict`, since deletes are soft.)

---

## 4. Workflow engine (the heart of M2)

One table drives the server, the action bar, the board drop rules and the tests.

| From → To | Action | Who (server-enforced) | Required input | Side effects |
|---|---|---|---|---|
| triage → planned | Accept | ABG Lead, ABG Member | priority, assignee, due (prefilled) | first response stamped, SLA due dates set |
| triage → closed | Decline | ABG | reason | closeReason=wont_do, first response |
| triage → closed | Merge | ABG | target task | occurrence created on target, attachments + followers moved, closeReason=duplicate, relation duplicate_of |
| any ABG status (triage, planned, in_progress, reopened) → needs_info | Ask for info | ABG | comment | previousStatus saved, SLA paused, first response if from triage |
| needs_info → previousStatus | Answer | Vendoor (any Vendoor member, see Q) | comment | SLA resumes, due dates shifted by paused working time |
| planned / reopened → in_progress | Start | ABG | | |
| in_progress → shipped | Mark shipped | ABG | optional release | shippedAt, notify requester + followers |
| shipped → done | Works | requester of this task, Admin, Owner | | verifiedAt/By, notify assignee + followers |
| shipped → reopened | Still broken | requester, Admin, Owner | note (+ attachments) | reopenCount++, notify assignee + ABG Lead |
| non-terminal → closed | Cancel | requester (own), Admin, Owner | reason | closeReason=canceled |

`waitingOn(status)`: triage/planned/in_progress/reopened → ABG; needs_info/shipped → Vendoor; done/closed → nobody.
Every transition runs in one DB transaction: check policy → check transition → update task → close/open TaskStatusSpan → recompute SLA → ActivityEvent → enqueue notifications. A rejected call returns a typed error; the UI shows a toast and snaps back.

## 5. SLA module (`src/server/sla`, pure functions, no DB)

- `WorkCalendar { tz, workingDays, startMin, endMin, holidays }`
- `addWorkingMinutes(calendar, start, minutes): Date`
- `workingMinutesBetween(calendar, a, b): number`
- `computeSla({ calendar, targets, priority, clockStart, pauses[], firstResponseAt, now }) → { firstResponseDueAt, resolutionDueAt, state: ok | at_risk | breached | paused, remainingMinutes }`
- "1 working day" = 8 working hours (480 min); targets stored in minutes.
- Unit tests: start on Friday/Saturday, start before 10:00 / after 18:00, crossing a weekend, crossing a holiday, Needs info pause across a weekend, multiple pauses, priority change mid-way, at-risk threshold (25 % left), exact boundaries (17:59, 18:00, 10:00), DST safety (Egypt has DST since 2023; all maths done in Cairo wall-clock via @date-fns/tz).

---

## 6. Routes / pages (Phase 1)

| URL | Purpose | Milestone |
|---|---|---|
| /sign-in, /check-email, /invite/[token], /reset-password | Auth | M1 |
| /home | FR-1.1–1.5 (no incident banner until Phase 2) | M7 |
| /inbox | Basic list + task pane, Unread/All filters, mark read (no grouping/snooze: Phase 2) | M9 |
| /my-work | 4 tabs | M7 |
| /requests | Triage queue, read-only for Vendoor | M4 |
| /tasks?view=list\|board&… | List, board, filters, display, saved views, bulk, CSV | M5 |
| /tasks/[key] | Full task page; also opens as peek panel (`?peek=BOS-14`) from any list | M6 |
| /new | Full-page New request (mobile); modal everywhere else (C) | M3 |
| /projects, /projects/[key] | Minimal: list + pre-filtered tasks (full 6.8 is Phase 2) | M5 |
| /releases, /releases/[number] | List, record, upcoming, release page | M8 |
| /settings/members, /projects, /sla, /notifications, /profile | 6.14 (no audit log UI) | M1 (members, projects, profile), M2 (sla), M9 (notifications) |

Sidebar Phase 1: Search box (filters Tasks; ⌘K is phase 3), New request, Home, Inbox, My work, Requests, Tasks, Projects, Releases, Settings. Team / Incidents / Reports hidden until Phase 2 (see question).

## 7. Server actions and API endpoints

All in `src/server/actions`, each = zod schema → `requireMember()` → `policy.assert()` → service → `revalidatePath`.

- **auth/members**: `signInWithPassword`, `requestMagicLink`, `inviteMember`, `resendInvite`, `acceptInvite`, `changeRole`, `deactivateMember`, `updateProfile`, `changePassword`, `requestPasswordReset`
- **projects**: `createProject`, `updateProject`, `archiveProject`, `upsertCategories`
- **settings**: `updateSlaTargets`, `updateWorkCalendar`, `addHoliday`, `removeHoliday`, `updateNotificationPrefs`
- **requests**: `createRequest` (typed fields by type, credential guard ack, attachments), `findPossibleDuplicates` (trigram, same project, open), `addOccurrenceFromNewRequest`
- **triage**: `acceptRequest`, `askForInfo`, `declineRequest`, `mergeRequest`
- **workflow**: `answerNeedsInfo`, `startTask`, `markShipped`, `verifyWorks`, `reportStillBroken`, `cancelTask`, `undoTransition` (5 s, same actor)
- **task fields**: `updateTitle`, `updateDescription` (versioned), `setDecision`, `setPriority` / `suggestPriority`, `setAssignee`, `setDueDate`, `setType`, `setProject`, `setCategory`, `setAccounts`, `setOrderCodes`, `follow` / `unfollow`
- **sub-tasks**: `createSubtask`, `createSubtasksFromList` (FR-7.6)
- **occurrences**: `addOccurrence`, `editOccurrence`, `archiveOccurrence`
- **relations**: `addRelation`, `removeRelation`
- **comments**: `addComment` (mentions, internal flag, quick reply kinds), `editComment` (15 min), `deleteComment`, `toggleReaction`, `requestStatusUpdate` ("Any update?")
- **bulk**: `bulkUpdate` (priority, assignee, project, due; ABG), `bulkClose`, `bulkVerify` (Vendoor, shipped only); per-row policy check, partial-failure report
- **views**: `saveView`, `updateView`, `deleteView`
- **releases**: `createUpcomingRelease`, `recordRelease`, `addTasksToRelease`
- **notifications**: `markRead`, `markAllRead`
- **API routes**: `POST /api/uploads/presign` (type + size whitelist, 100 MB), `POST /api/uploads/complete`, `GET /api/files/[id]`, `GET /api/tasks/export`, `GET /api/changes`, `/api/auth/*`, `GET /api/health`
- **Jobs (worker)**: `send-email`, `verify-reminder` (hourly scan: shipped ≥ 3 working days, not reminded), `triage-email-digest` (every 2 h, if kept in Phase 1)

---

## 8. Milestones and what each one is tested on

Every milestone ends with: `pnpm lint`, `pnpm typecheck`, `pnpm test` (+ `pnpm e2e` from M3), a short "what works / how to run" note, and a stop for your review.

| # | Scope | Tests |
|---|---|---|
| **M1** | Repo, docker-compose (Postgres, MinIO, Mailpit), tokens (`tokens.css` + Tailwind `@theme`, light values; dark values defined but no switch), fonts, StatusIcon/PriorityIcon, shadcn base, i18n plumbing + lint rule, sidebar shell + mobile bottom bar, Auth.js (password + magic link), invitations, members/roles settings, projects settings with categories, profile, policy module (full 3.3 matrix), seed: workspace, 2 teams, people (3.1), 11 projects (4.4), SLA defaults | Unit: policy matrix (every role × every action, table-driven). Integration: invite → accept → sign in; deactivated member cannot sign in. E2E: sign in, sidebar navigation, 375 px layout, axe check on shell |
| **M2** | Full Prisma schema + raw SQL migrations, workflow engine, TaskStatusSpan, ActivityEvent writer, SLA module, SLA/calendar settings page, task-key allocation | Unit: every allowed and forbidden transition per role (incl. "ABG cannot verify", "requester cannot verify someone else's task", "Admin can verify any"), waitingOn for every status, SLA suite (section 5 list), key allocation under concurrency. Integration: transition writes span + event + updates SLA |
| **M3** | New request modal/page, progressive steps, typed fields per type table, categories, uploads (presign, multipart, progress, paste, drag-drop), voice recorder (5 min), duplicate hints, credential guard (client warning + server re-check + logged override), local draft, toast with ID | Unit: field rules per type (zod), credential guard patterns (EN + Arabic "باسورد", `pass:`, line after email; no false positive on normal text), file whitelist/size. E2E: file a Bug with screenshot at 375 px; Bug without attachment blocked; guard warning shown and override logged; voice note upload and playback |
| **M4** | Requests page: oldest first, age, first-response countdown (amber < 25 %, red breached), Accept / Ask / Decline / Merge in row and panel, Vendoor read-only | Integration: accept with no due uses SLA target; ask without text rejected by server; merge moves attachments + followers and creates occurrence; Vendoor calling accept action gets 403. E2E: triage each action |
| **M5** | Tasks list (virtualised, grouped, collapsible), board (dnd with policy-aware drop + snap back), filter chips in URL, Display menu, default views (8), saved views, inline edit, bulk actions, minimal Projects pages, text search | Unit: filter ↔ URL codec. Integration: bulk partial failure. Perf: seed 1,000 tasks, Playwright asserts list render < 1 s. E2E: Vendoor drag into In progress snaps back with toast |
| **M6** | Task page: breadcrumb, action bar per status × role, description (Tiptap, versioned), pinned decision, sub-tasks + progress, occurrences, attachments with image/video/audio preview, relations, properties column, activity tabs (All / Comments / History), mentions, reactions, 15-min edit, internal notes, quick replies, follow, peek panel, Undo 5 s | Integration: internal notes and their events never returned to Vendoor; reopen requires note; reopen count increments; Done shows verifier + time. E2E: Still broken without note cannot submit; verify works; 375 px task page |
| **M7** | Home (greeting + summary sentence, Waiting on you cards with inline actions, Overdue, Recently shipped, Activity, empty states, upcoming release line), My work tabs | Integration: "waiting on you" query per role. E2E: Vendoor with 3 shipped tasks sees 3 cards; Works sets Done without leaving Home; empty Home shows "You're all caught up" |
| **M8** | Releases list, record release (auto number + suffix), upcoming release, release page with per-task verification state and "Regressed" | Unit: release numbering. Integration: recording moves picked tasks to Shipped, writes events, notifies requesters; non-ABG gets 403 |
| **M9** | Notification rules (Phase 1 events), in-app Inbox (basic), unread badge, email via worker + templates, per-user prefs, 10-min de-dup per task, never notify self, 3-working-day verify reminder, "Any update?" | Unit: recipient rules table per event; self-exclusion; 10-min throttle. Integration: email rendered with subject format `[BOS-14] Shipped: please test` (Mailpit in dev) |
| **M10** | Seed backlog 11.1 as real tasks (+ seeded incident record), CSV export of current view, Playwright flows | E2E: file a bug → triage accept → start → record release → requester verifies → Done; and shipped → Still broken → Reopened (count = 1). CSV matches visible view |

---

## 9. Assumptions I will make unless you say otherwise

1. "1 working day" = 8 working hours; SLA targets stored in working minutes.
2. Resolution clock runs from creation until **Shipped** (Shipped is waiting on Vendoor). On Reopen it resumes from where it stopped (no new budget). Needs info pauses both clocks.
3. Internal ABG notes do **not** count as first response; public ABG comments do.
4. Due date is a date shown absolute ("Thu 26 Nov"); it becomes overdue after the end of that working day (18:00 Cairo).
5. Changing priority after Accept recomputes SLA targets; it does not move a due date the ABG member already set by hand.
6. Undo (5 s) = a compensating transition allowed only for the same actor within 5 s; both events stay in History.
7. Sub-tasks are normal Tasks with `parentId`, created by ABG or the requester, they **skip Triage** (start as Planned when ABG creates them, Triage when Vendoor creates them? see Q), never appear as separate cards on Home; parent can be verified independently of sub-task status.
8. Vendoor can verify a parent even if a sub-task is open (with a warning).
9. Saved views: personal by default; Owner, Admin and ABG Lead can share a view with everyone.
10. Moving a task to another project gives it a new key; the old key keeps redirecting.

---

## 10. Changes from the design references and research

Sources: `docs/DESIGN-REFERENCES.md` (Mobbin, screen by screen) and `reports/Work tracker standards research.md` (deep research, with links).

**Workflow and SLA (Linear Triage, Plane Intake, Jira SM, ITIL 4, ServiceNow/Zendesk/Freshdesk)**
- Our model already matches the standard: Needs info is "Waiting for customer" (SLA paused), and Shipped is "Resolved, awaiting customer verification". Done is "Closed", and only the client can set it.
- First response counts only a **public** ABG reply or a triage action. Internal notes never count (Zendesk and Freshdesk do the same). This settles assumption 3.
- Reopen **continues the original resolution clock** instead of starting a new one (as Freshdesk does). This settles assumption 2.
- Merge into: moves attachments, occurrences and followers to the target, the same way Linear handles duplicates.
- The PRD says shipped tasks are never auto-closed. We keep that: reminder at 3 working days, "Unverified" badge at 7. This deliberately differs from the ITSM norm of auto-closing after 3 to 5 days.
- SLA warnings in Phase 2 use the PRD's 25 %-left threshold. ServiceNow's default is 50 % and 75 % used, so the threshold stays a setting.
- Possible addition from Linear and Plane: **Snooze** in triage. It is not in the PRD (see question Q15).

**Calendar (Egypt)**
- The working week is Sun–Thu (Labour Law 14/2025). Hours default to 10:00–18:00 and stay a setting.
- Holidays are **editable data** marked `estimated` or `confirmed`, because Islamic dates depend on the moon and holidays are often moved to Thursday by decree. The seed loads the confirmed 2026 dates and the estimated 2027 ones.
- Africa/Cairo DST (since 2023): clocks go forward on the last Friday of April and back at the end of the last Thursday of October. Both changes fall at midnight Thursday to Friday, so a working window is never cut. All maths runs on the server through `@date-fns/tz`, and tests cover 2026-04-24 and 2026-10-29.
- Add an optional **work season** (for example Ramadan, with shorter hours) to the calendar model now: a `WorkSeason { start, end, startMin, endMin }` table. The UI comes later.

**Attachments (media compatibility)**
- WhatsApp `.opus` files are Ogg Opus. They play natively everywhere except iOS before 18.4. iPhone `.mov` files are mostly HEVC and **do not play reliably in Chrome or Firefox**. Chrome's MediaRecorder WebM has no duration or seek index.
- **Decision:** keep the original file and have a worker create:
  - audio: AAC `.m4a` for playback
  - video: H.264/AAC `.mp4` with faststart, copied without re-encoding when the input is already H.264
  - a poster JPEG
  - ffprobe duration
  - waveform JSON
- The player uses the derived file and falls back to the original plus a Download link while processing runs ("Processing…" state).
- Check the file type on the server from its first bytes. Browsers report odd or empty MIME types for `.opus` and `.mov`.
- Upload with S3 multipart (retries per part on mobile). The bucket CORS must expose `ETag`, and a lifecycle rule aborts incomplete uploads.
- Recorder preference: `audio/mp4` (AAC), then `audio/webm;codecs=opus`, then `audio/ogg;codecs=opus`. Everything is normalised to m4a afterwards.
- Data model: add `Attachment.originalKey`, `playbackKey`, `posterKey`, `waveform Json`, `processingState (pending|ready|failed)`.

**Accessibility (WCAG 2.2 AA)**
- Board: dnd-kit with its keyboard sensor, **plus a "Move to…" menu on every card**. WCAG 2.5.7 requires a non-drag alternative, and keyboard support alone does not count. The same move rules apply in both.
- The list is a semantic `<table>` with links and buttons, and each group header is a disclosure button. No ARIA grid.
- Status and priority icons use `role="img"` with a label, or are `aria-hidden` when the text label is visible.
- Targets are at least 24×24 px (2.5.8), which matters for icon chips in 36 px rows.
- Focus is never hidden behind sticky headers or toasts (2.4.11), handled with `scroll-padding`. The peek panel becomes a full modal at 375 px.
- Undo toast: a polite live region that pauses on hover or focus, plus Ctrl/Cmd+Z. History always offers a lasting way back, so we don't depend on a 5 s window.
- Sign-in: password and code fields allow paste and autofill (3.3.8).
- Tests: `@axe-core/playwright` on every page, plus keyboard-only Playwright tests for the board, triage and verify.

**Auth**
- Proposed: **Better Auth** in place of Auth.js. It covers email + password, magic link, invite-only accounts (sign-up disabled, admin creates users), DB sessions with revoke-all on deactivate or role change, and a TOTP plugin for later.
- Hardening:
  - cookie cache off
  - `revokeSessionsOnPasswordReset: true`
  - rate-limit counts stored in the DB, with trusted proxy headers
  - magic-link tokens stored hashed
  - magic link disabled for Owner and Admin once 2FA is on
  - every page and action validates the session on the server
  - only the plugins we use, with pinned versions
- Passwords: Argon2id (m = 19 MiB, t = 2, p = 1, OWASP).

**Credential guard (FR-6.11)**
- One shared pure function runs in the browser for the warning and on the server for the log. It returns `none | medium | high`.
- High:
  - a keyword followed by a value: `password`, `pass`, `pwd`, `باسورد`, `كلمة السر`, `كلمة المرور`, `الرقم السري`, Franco "el pass"
  - known token formats: AWS `AKIA…`, Google `AIza…`, JWT, PEM private key, Shopify `shpat_…`
- Medium: an email or Egyptian mobile number followed by a line that looks like a password (single token, mixed classes, entropy check).
- Suppressed: topic phrases with no value after them, such as "forgot password", "reset password OTP" and "نسيت كلمة السر". These are real bug reports in the seed backlog (ACC "Forgot-password code not sent"), so the test suite includes them as must-not-warn cases.
- It never blocks. An override is logged as `credential_guard_override` without storing the matched text.
