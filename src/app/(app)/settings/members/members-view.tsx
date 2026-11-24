"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { RelativeTime } from "@/components/ui/badges";
import { useApp } from "@/components/layout/app-context";
import { can } from "@/domain/policy";
import { ROLES, type Role } from "@/domain/types";
import { addMemberAction, changeRoleAction, setMemberStatusAction } from "@/server/actions/settings";

interface M {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  side: "abg" | "vendoor";
  lastActiveAt: string | null;
}

export function MembersView({ members, meId }: { members: M[]; meId: string }) {
  const t = useTranslations("settings");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const { me } = useApp();
  const full = can(me, "manage_members");
  const abgOnly = !full && can(me, "manage_abg_members");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(abgOnly ? "abg_member" : "requester");
  const manageable = (m: M) => m.id !== meId && (full || (abgOnly && m.role === "abg_member"));
  return (
    <div className="space-y-6">
      {(full || abgOnly) && (
        <form
          className="grid items-end gap-2 rounded-card border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_160px_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await addMemberAction({ name, email, role });
            if (r.ok) {
              toast.success(t("memberAdded"));
              setName("");
              setEmail("");
            } else toast.error(r.error === "forbidden" ? tc("forbidden") : tc("error"));
          }}
        >
          <div>
            <Label htmlFor="m-name">{t("name")}</Label>
            <Input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="m-email">{t("email")}</Label>
            <Input id="m-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="m-role">{t("role")}</Label>
            <Select id="m-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(abgOnly ? (["abg_member"] as const) : ROLES).map((r) => (
                <option key={r} value={r}>
                  {tr(r)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary">
            <UserPlus size={14} aria-hidden />
            {t("invite")}
          </Button>
        </form>
      )}
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[640px] text-ui">
          <thead className="bg-subtle text-meta text-fg-secondary">
            <tr>
              <th scope="col" className="px-4 py-2 text-start font-medium">{t("name")}</th>
              <th scope="col" className="px-2 py-2 text-start font-medium">{t("team")}</th>
              <th scope="col" className="px-2 py-2 text-start font-medium">{t("role")}</th>
              <th scope="col" className="px-2 py-2 text-start font-medium">{t("status")}</th>
              <th scope="col" className="px-4 py-2 text-end font-medium" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.name} size={24} />
                    <div className="min-w-0">
                      <div className="font-medium">{m.name}</div>
                      <div className="truncate text-meta text-fg-secondary">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-fg-secondary">{m.side === "abg" ? "ABG" : "Vendoor"}</td>
                <td className="px-2 py-2">
                  {full && m.id !== meId ? (
                    <Select aria-label={`${t("role")} ${m.name}`} value={m.role} className="h-7 w-auto" onChange={async (e) => ((await changeRoleAction(m.id, e.target.value)).ok ? toast.success(tc("saved")) : toast.error(tc("error")))}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {tr(r)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    tr(m.role)
                  )}
                </td>
                <td className="px-2 py-2 text-fg-secondary">
                  {t(m.status as "active")}
                  {m.lastActiveAt && (
                    <span className="block text-meta">
                      <RelativeTime at={m.lastActiveAt} className="text-meta" />
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-end">
                  {manageable(m) && (
                    <Button size="sm" variant={m.status === "deactivated" ? "secondary" : "dangerOutline"} onClick={() => setMemberStatusAction(m.id, m.status === "deactivated" ? "active" : "deactivated")}>
                      {m.status === "deactivated" ? t("reactivate") : t("deactivate")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
