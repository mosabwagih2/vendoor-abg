import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { NOTIFICATION_KINDS } from "@/server/notify";
import { NotificationSettings } from "./notification-settings";

export const metadata = { title: "Notifications" };

export default async function NotificationsSettingsPage() {
  const me = await requireMember();
  const prefs = await db.notificationPref.findMany({ where: { memberId: me.id } });
  return (
    <NotificationSettings
      rows={Object.entries(NOTIFICATION_KINDS).map(([kind, def]) => {
        const p = prefs.find((x) => x.event === kind);
        return { kind, emailAvailable: def.email, inApp: p?.inApp ?? true, email: p?.email ?? true };
      })}
    />
  );
}
