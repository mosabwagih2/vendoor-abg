// url=https://www.figma.com/design/D9LTmjjQrK0leV9tGcOA9C/Vendoor-ABG?node-id=4-26
// source=src/components/ui/badges.tsx
// component=WaitingBadge
import figma from "figma"
const instance = figma.selectedInstance

// "Your turn" is the same badge with the viewer on the waiting side; the other two show whose turn it is.
const picked = instance.getEnum("Turn", {
  "Your turn": { side: "abg", viewer: "abg" },
  "ABG's turn": { side: "abg", viewer: "vendoor" },
  "Vendoor's turn": { side: "vendoor", viewer: "abg" },
})
const turn = picked ?? { side: "abg", viewer: "abg" }

export default {
  example: figma.code`<WaitingBadge side="${turn.side}" viewerSide="${turn.viewer}" />`,
  imports: ['import { WaitingBadge } from "@/components/ui/badges"'],
  id: "waiting-badge",
  metadata: { nestable: true },
}
