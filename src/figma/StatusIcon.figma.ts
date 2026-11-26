// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=5-33
// source=src/components/icons/status-icon.tsx
// component=StatusIcon
import figma from "figma"
const instance = figma.selectedInstance

const status = instance.getEnum("Status", {
  Request: "triage",
  Stuck: "needs_info",
  Processing: "in_progress",
  Completed: "shipped",
  Done: "done",
  Closed: "closed",
})

export default {
  example: figma.code`<StatusIcon status="${status}" />`,
  imports: ['import { StatusIcon } from "@/components/icons/status-icon"'],
  id: "status-icon",
  metadata: { nestable: true },
}
