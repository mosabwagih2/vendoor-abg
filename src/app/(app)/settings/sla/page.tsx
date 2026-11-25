import { redirect } from "next/navigation";

/** Old address. The service clock settings now live in Work week and Priorities. */
export default function SlaRedirect() {
  redirect("/settings/work-week");
}
