import { requireMember } from "@/server/session";
import { ProfileSettings } from "./profile-settings";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requireMember();
  return <ProfileSettings name={me.name} email={me.email} />;
}
