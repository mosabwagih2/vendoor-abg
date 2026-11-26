// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=5-67
// source=src/components/ui/badges.tsx
// component=SlaBadge
import figma from "figma"
const instance = figma.selectedInstance

// SlaBadge takes the computed SLA of a task. "Met" is shown by the "ok" state once the target was reached.
const state = instance.getEnum("State", {
  "At risk": "at_risk",
  Breached: "breached",
  Met: "ok",
  Paused: "paused",
})

export default {
  example: figma.code`<SlaBadge sla={{ kind: "resolution", state: "${state}", dueAt: task.sla?.dueAt ?? null }} />`,
  imports: ['import { SlaBadge } from "@/components/ui/badges"'],
  id: "sla-pill",
  metadata: { nestable: true },
}
