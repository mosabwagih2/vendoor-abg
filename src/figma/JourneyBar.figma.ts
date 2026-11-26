// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=4-57
// source=src/components/task/journey-bar.tsx
// component=JourneyBar
import figma from "figma"
const instance = figma.selectedInstance

// The app keeps eight internal statuses; each Figma step maps to one that draws that step.
const status = instance.getEnum("Step", {
  Request: "triage",
  Processing: "in_progress",
  Stuck: "needs_info",
  Completed: "shipped",
  Done: "done",
})

export default {
  example: figma.code`<JourneyBar status="${status}" />`,
  imports: ['import { JourneyBar } from "@/components/task/journey-bar"'],
  id: "journey-bar",
  metadata: { nestable: true },
}
