"use client";
import { createContext, useContext } from "react";
import type { Role } from "@/domain/types";

export interface MemberLite {
  id: string;
  name: string;
  handle: string;
  role: Role;
  side: "abg" | "vendoor";
}

export interface ProjectLite {
  id: string;
  key: string;
  name: string;
  categories: Array<{ id: string; name: string }>;
}

export interface AppCtx {
  me: { id: string; name: string; email: string; role: Role; side: "abg" | "vendoor"; handle: string };
  members: MemberLite[];
  projects: ProjectLite[];
  openNewRequest: (opts?: { parentId?: string; projectId?: string; incident?: boolean }) => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp outside AppShell");
  return c;
}
