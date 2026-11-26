// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=5-54
// source=src/components/icons/priority-icon.tsx
// component=PriorityIcon
import figma from "figma"
const instance = figma.selectedInstance

const priority = instance.getEnum("Priority", {
  Highest: "highest",
  High: "high",
  Medium: "medium",
  Low: "low",
  Lowest: "lowest",
})

export default {
  example: figma.code`<PriorityIcon priority="${priority}" />`,
  imports: ['import { PriorityIcon } from "@/components/icons/priority-icon"'],
  id: "priority-icon",
  metadata: { nestable: true },
}
