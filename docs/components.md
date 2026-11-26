# Figma components → code

Code Connect is not available on our Figma plan, so this file is the map between the components on the Figma page **Design system** (file `D9LTmjjQrK0leV9tGcOA9C`) and the code that implements them. Find a component in Figma, read its row here, open the file.

The Design system page was updated in Nov 2026 to the current names (five statuses, five priorities, four-step journey), so the Figma variants and the code now agree.

| Figma component (node) | Figma variants | Code | Props that matter |
|---|---|---|---|
| **Button** (4:16) | Kind = Ink, Signal, Success, Outline, Danger, Ghost | `src/components/ui/button.tsx` → `Button` | `variant`: Ink → `dark`, Signal → `primary` with `bg-accent text-white` (used in Create), Success → `success`, Outline → `secondary`, Danger → `danger`, Ghost → `ghost`. Also `dangerOutline`, `waiting`. `size`: `sm`, `md`, `lg`, `icon`, `iconMd`. `asChild` for links. |
| **Waiting badge** (4:26) | Turn = Your turn, ABG's turn, Vendoor's turn | `src/components/ui/badges.tsx` → `WaitingBadge` | `side` (`"abg"`, `"vendoor"`, `null`) and `viewerSide`. "Your turn" appears when `side === viewerSide`. `quiet` for the grey form. |
| **Journey bar** (4:57) | Step = Request, Processing, Stuck, Completed, Done | `src/components/task/journey-bar.tsx` → `JourneyBar`, `JourneyStepper` | `status` (internal status). Four segments; Stuck is the Processing step drawn in red. `width` in px. |
| **Status icon** (5:33) | Status = Request, Stuck, Processing, Completed, Done, Closed | `src/components/icons/status-icon.tsx` → `StatusIcon` | `status`, `label`. The code keeps eight internal statuses and folds them into the five names in `src/domain/status-display.ts` (Planned, In progress and Reopened all show as Processing). |
| **Priority icon** (5:54) | Priority = Highest, High, Medium, Low, Lowest | `src/components/icons/priority-icon.tsx` → `PriorityIcon` | `priority` (`highest` … `lowest`). `suggested` draws it faded. `PriorityBadge` adds the label. |
| **Status lozenge** | Status = Request, Processing, Stuck, Completed, Done, Closed | `src/components/ui/lozenge.tsx` → `StatusLozenge` | `status`; `custom` = `{ name, color }` replaces the step name and colour for a custom status. |
| **SLA pill** (5:67) | State = At risk, Breached, Met, Paused | `src/components/ui/badges.tsx` → `SlaBadge` | `sla` = `{ kind, state, dueAt }`. State names: At risk → `at_risk`, Breached → `breached`, Paused → `paused`, Met → shown by the "On time" state. |
| **Avatar** (5:68) | none | `src/components/ui/avatar.tsx` → `Avatar` | `name`, `size` (px). No name draws the dashed "Unassigned" circle. |

## Components that are in the screens but not on the Design system page

These are drawn directly in the screen frames. Search for the screen number (in brackets) in Figma.

| Design | Code |
|---|---|
| Notifications drawer (5.2) | `src/components/layout/notifications-drawer.tsx` |
| ⌘K search (5.9) | `src/components/layout/command-palette.tsx` (logic in `src/domain/palette.ts`) |
| Profile menu (5.10) | bottom of `src/components/layout/sidebar.tsx` |
| Incident banner (7.4) | `src/components/layout/incident-banner.tsx` |
| Incident page and timeline (7.2) | `src/app/(app)/trouble/[number]/page.tsx`, `src/components/trouble/*` |
| Report a problem (7.3) | `IncidentForm` in `src/components/forms/new-request.tsx` |
| New request (1.4) | `src/components/forms/new-request.tsx` |
| Accounts card (1.3, 2.3) | `src/components/task/credentials-card.tsx` |
| Release status card (4.4) | `src/app/(app)/releases/release-status-card.tsx` |
| Calendar (3.3) and Timeline (3.4) | `src/app/(app)/tasks/calendar-view.tsx`, `timeline-view.tsx` |
| Send weekly report (8.2) | `src/app/(app)/reports/weekly/send-report-dialog.tsx` |
| Workflow settings (5.1) | `src/app/(app)/settings/workflow/workflow-editor.tsx` |

## Tokens

Colours, radii and shadows are CSS variables in `src/app/globals.css` and used through Tailwind names (`bg-accent`, `text-fg-secondary`, `border-border`, `rounded-card`). Project dot colours are in `src/lib/project-colors.ts`.

## Code Connect (ready, not active yet)

The templates are written: one file per component in `src/figma/*.figma.ts` (Button, WaitingBadge, JourneyBar, StatusIcon, PriorityIcon, StatusLozenge, SlaPill, Avatar), with `figma.config.json` at the root. `pnpm figma:check` type-checks them and `npx figma connect parse` confirms Figma's CLI reads all of them.

They do nothing in Figma until two things are true:

1. The Figma plan is **Organization or Enterprise** (Code Connect is not available on Free, Professional or Education).
2. The components on the Design system page are **published** to a team library (Assets > Publish).

Then, with a Figma personal access token that has the Code Connect scope:

```bash
export FIGMA_ACCESS_TOKEN=...   # never commit it
pnpm figma:publish
```

The `url=` line at the top of each template holds the Figma node. If a component is rebuilt in Figma, update that node id.

Not connected on purpose: the custom-status chip (a runtime colour, not a variant), and the screens (they are layouts, not components).
