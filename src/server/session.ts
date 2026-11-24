import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import type { Role } from "@/domain/types";

export interface CurrentMember {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: Role;
  teamId: string;
  side: "vendoor" | "abg";
}

export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const m = await db.member.findUnique({ where: { id: session.user.id }, include: { team: true } });
  if (!m || m.status === "deactivated") return null;
  // Track activity at most once per 5 minutes.
  if (!m.lastActiveAt || Date.now() - m.lastActiveAt.getTime() > 5 * 60_000) {
    await db.member.update({ where: { id: m.id }, data: { lastActiveAt: new Date() } });
  }
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    handle: m.handle,
    role: m.role as Role,
    teamId: m.teamId,
    side: m.team.side === "delivery" ? "abg" : "vendoor",
  };
});

export async function requireMember(): Promise<CurrentMember> {
  const m = await getCurrentMember();
  if (!m) redirect("/sign-in");
  return m;
}
