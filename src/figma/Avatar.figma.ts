// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=5-68
// source=src/components/ui/avatar.tsx
// component=Avatar
import figma from "figma"

export default {
  example: figma.code`<Avatar name={member.name} size={24} />`,
  imports: ['import { Avatar } from "@/components/ui/avatar"'],
  id: "avatar",
  metadata: { nestable: true },
}
