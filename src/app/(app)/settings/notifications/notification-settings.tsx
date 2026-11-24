"use client";
import { useTranslations } from "next-intl";
import { setNotificationPrefAction } from "@/server/actions/misc";

export function NotificationSettings({ rows }: { rows: Array<{ kind: string; emailAvailable: boolean; inApp: boolean; email: boolean }> }) {
  const t = useTranslations("settings");
  const ti = useTranslations("inbox");
  return (
    <table className="w-full rounded-card border border-border bg-surface text-ui">
      <thead className="bg-subtle text-meta text-fg-secondary">
        <tr>
          <th scope="col" className="px-4 py-2 text-start font-medium">{t("event")}</th>
          <th scope="col" className="px-4 py-2 font-medium">{t("inAppOn")}</th>
          <th scope="col" className="px-4 py-2 font-medium">{t("emailOn")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const label = ti(`kind.${r.kind.replace(".", "_")}` as "kind.task_new_request");
          return (
            <tr key={r.kind} className="border-t border-border">
              <th scope="row" className="px-4 py-2 text-start font-normal">{label}</th>
              <td className="px-4 py-2 text-center">
                <input type="checkbox" className="h-4 w-4" aria-label={`${label}: ${t("inAppOn")}`} defaultChecked={r.inApp} onChange={(e) => setNotificationPrefAction(r.kind, "inApp", e.target.checked)} />
              </td>
              <td className="px-4 py-2 text-center">
                {r.emailAvailable ? <input type="checkbox" className="h-4 w-4" aria-label={`${label}: ${t("emailOn")}`} defaultChecked={r.email} onChange={(e) => setNotificationPrefAction(r.kind, "email", e.target.checked)} /> : <span className="text-fg-muted">—</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
