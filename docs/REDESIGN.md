# Redesign: "Warm Ink" (Vendoor × ABG Work Tracker)

Why: the first UI followed the PRD tokens literally (white page, gray borders, small rows) and read as a generic, dated admin tool.
This redesign keeps every PRD rule (status icons + labels, Waiting on, 24 px targets, AA contrast, logical CSS) and changes the visual language and the structure of the key screens.

## 1. What 15 reference screens teach us (Mobbin)

| Product | What it does well | What we take | What we avoid |
|---|---|---|---|
| **Linear** (list, issue, mobile) | Content sits on a floating rounded panel over a tinted canvas; hairline borders; property chips under the title on mobile; glass pill buttons; "Display" as one bottom sheet | Inset panel (r 18) on a warm canvas; chip row for properties on mobile; one Display sheet | Tiny 12 px density everywhere; gray-on-gray text |
| **Attio** (record, table) | 3 zones: property rail, activity timeline, tabs; timeline cards with a colored left rule; sidebar count badges | Activity as cards with a colored rule per event type; tabs under the header | Heavy left rail on narrow screens |
| **Vercel** (deployments, overview) | Mono for IDs and hashes; status = dot + word; rows that read as a table without lines; strong dark mode | Geist Mono for IDs, order codes, accounts; status dot + label; dark theme from the same tokens | Dense black chrome by default |
| **Stripe** (home, balances) | KPI cards with sparkline, soft tinted header band, one accent | Release card with a 3-color progress bar; one accent for "your turn" | Chart-heavy home (we have no analytics in Phase 1) |
| **Jira** (issue, board, For you) | Right-hand details panel with collapsible sections; sub-tasks with a progress bar; quick reply chips; "Assigned to me" list | Properties panel (but grouped, not a form); progress bar on sub-tasks; quick replies | Dense toolbar, many tabs, stacked gray boxes |
| **monday.com** (table) | Full-cell colored status pills scan instantly | Soft filled status pill in lists (not full-cell, not saturated) | Rainbow palette; 6 competing colors per row |
| **Notion** (database) | Tinted tag chips; floating contextual bar when rows are selected | Floating bulk bar at the bottom of the list | Empty-table look |
| **Zendesk** (ticket) | Conversation in the center, composer pinned at the bottom with a split "Submit as …" button; "updates to your tickets" feed | Pinned composer; split button for "Comment / Comment internally" | Flat toolbars, teal/black chrome |
| **Basecamp** (home) | Calm greeting, warm friendly tone, activity with colored type dots | Editorial greeting (serif), colored dots for event types | Low information density |
| **Upwork** (pending contract) | "Waiting for X to approve" with a bold pill CTA | A visible *turn* state with a big action on the card | Green everywhere |

## 2. The big ideas

1. **Turn-first.** Everything answers "whose turn is it?". The accent color (cobalt) means *your turn* and nothing else: the Your turn badge, the Answer button, the sidebar count, the card outline.
2. **Journey bar.** Every task shows a 5-segment bar (Triage → Planned → In progress → Shipped → Done). Segments before the current step are ink, the current one takes its status color, later ones are empty. It replaces guessing from status names and works in lists, cards and the task page.
3. **Floating panel.** Warm canvas (#F3F2EE) with a white inset panel (radius 18, hairline border, 2 px shadow). Sidebar sits on the canvas with no border.
4. **Editorial warmth.** Greeting and big numbers in Instrument Serif; UI in Inter; IDs in Geist Mono. Arabic later: IBM Plex Sans Arabic (available in Penpot too).
5. **Evidence first.** Attachments, voice notes and account access are first-class blocks, not footnotes.

## 3. Tokens

| Token | Value | Use |
|---|---|---|
| canvas | #F3F2EE | App background behind the panel |
| surface | #FFFFFF | Panel, cards, modals |
| subtle / sunken | #F7F7F4 / #EFEEEA | Hover, quotes, chips |
| line / line-strong | #E7E6E0 / #D5D4CC | Hairlines / controls |
| ink | #15161A | Text, primary button |
| ink-2 / ink-3 | #4A4D59 / #6B6E7A | Secondary / meta text (both ≥ 4.5:1 on white) |
| signal | #2563EB (deep #1D4ED8, soft #EAF0FF) | Your turn, links, focus |
| Triage / Needs info / Planned / In progress / Shipped / Reopened / Done / Closed | #8B5CF6 / #2563EB / #8B8D98 / #F59E0B / #2563EB / #EF4444 / #16A06A / #B4B6C0 | Status icons (never color alone) |
| Urgent / High / Medium / Low | #EF4444 / #F97316 / #F59E0B / #8B8D98 | Priority icons |
| Radius | 10 controls, 14 cards, 18 panel, 22 modals | |
| Type | Display 46 serif · Title 22/600 · Heading 15/600 · Body 14 · UI 13 · Meta 12 · Mono 12 | Inter Tight can replace Inter for headings |

## 4. Screens in the file (the full workflow, start to end)

| # | Screen | Side | What is new |
|---|---|---|---|
| 1 | Sign in | both | Split layout: left calm brand panel with the journey bar, right form |
| 2 | Home (Vendoor) | Vendoor | **Your turn** cards with inline Works / Still broken / Answer; ABG list with journey bars; last release and activity |
| 3 | New request | Vendoor | 3 steps with big type tiles, typed fields, voice note, account access, live duplicate hint |
| 4 | Filed | Vendoor | Toast with ID and "Waiting on ABG: reply due in 1 h" |
| 5 | Requests (triage) | ABG | Queue + detail, SLA countdown ring, 4 big actions (Accept / Ask / Decline / Merge) |
| 6 | Accept dialog | ABG | Priority tiles, assignee, due date prefilled from SLA |
| 7 | Tasks list | both | Grouped list, journey bars, view chips, floating bulk bar |
| 8 | Board | both | Columns by status, card with journey dot and Waiting on |
| 9 | Task (in progress, ABG) | ABG | Turn banner, pinned decision, account access, activity cards |
| 10 | Task (shipped, Vendoor) | Vendoor | Banner turns cobalt with **Works / Still broken** |
| 11 | Still broken | Vendoor | Note + evidence, reopen count preview |
| 12 | Release | ABG | Record a release: pick tasks, preview who is notified |
| 13 | Inbox / My work | both | List + detail with unread dots |
| 14-16 | Mobile: Home, Task with sticky verify bar, New request with voice note | Vendoor | Bottom bar, glass pills, bottom sheets |

## 5. Mapping to the code

The Next.js app already has the structure; the redesign is mostly `globals.css` tokens, the shell (`app-shell.tsx`), `task-row.tsx`, `home-view.tsx`, `task-view.tsx` (turn banner and journey bar) and the new-request dialog. After you approve the Penpot file, I'll apply it screen by screen and re-run the tests.
