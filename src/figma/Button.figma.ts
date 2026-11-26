// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=4-16
// source=src/components/ui/button.tsx
// component=Button
import figma from "figma"
const instance = figma.selectedInstance

const variant = instance.getEnum("Kind", {
  Ink: "dark",
  Signal: "primary",
  Success: "success",
  Outline: "secondary",
  Danger: "danger",
  Ghost: "ghost",
})

export default {
  example: figma.code`<Button variant="${variant}">Button</Button>`,
  imports: ['import { Button } from "@/components/ui/button"'],
  id: "button",
  metadata: { nestable: true },
}
