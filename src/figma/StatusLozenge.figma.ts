// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=201-248
// source=src/components/ui/lozenge.tsx
// component=StatusLozenge
import figma from "figma"
const instance = figma.selectedInstance

const status = instance.getEnum("Status", {
  Request: "triage",
  Processing: "in_progress",
  Stuck: "needs_info",
  Completed: "shipped",
  Done: "done",
  Closed: "closed",
})

export default {
  example: figma.code`<StatusLozenge status="${status}" />`,
  imports: ['import { StatusLozenge } from "@/components/ui/lozenge"'],
  id: "status-lozenge",
  metadata: { nestable: true },
}
