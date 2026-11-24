"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useApp } from "@/components/layout/app-context";
import { can } from "@/domain/policy";
import { saveProjectAction } from "@/server/actions/settings";

interface P {
  id?: string;
  key: string;
  name: string;
  description: string;
  health: "on_track" | "at_risk" | "off_track";
  vendoorLeadId: string | null;
  abgLeadId: string | null;
  categories: string[];
}

export function ProjectsSettings({ projects }: { projects: P[] }) {
  const t = useTranslations("settings");
  const { me } = useApp();
  const editable = can(me, "manage_projects");
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {editable && !adding && (
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={14} aria-hidden />
          {t("addProject")}
        </Button>
      )}
      {adding && <ProjectForm p={{ key: "", name: "", description: "", health: "on_track", vendoorLeadId: null, abgLeadId: null, categories: ["Other"] }} editable onDone={() => setAdding(false)} />}
      {projects.map((p) => (
        <ProjectForm key={p.id} p={p} editable={editable} />
      ))}
    </div>
  );
}

function ProjectForm({ p, editable, onDone }: { p: P; editable: boolean; onDone?: () => void }) {
  const t = useTranslations("settings");
  const tp = useTranslations("projects");
  const tc = useTranslations("common");
  const { members } = useApp();
  const [v, setV] = useState({ ...p, categoriesText: p.categories.join("\n") });
  const id = p.id ?? "new";
  return (
    <details className="rounded-card border border-border bg-surface" open={!p.id}>
      <summary className="cursor-pointer px-4 py-2.5 text-ui">
        <span className="me-2 font-mono text-[12px] text-fg-secondary">{p.key || "NEW"}</span>
        {p.name}
      </summary>
      <form
        className="grid gap-3 border-t border-border p-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await saveProjectAction({ id: p.id, key: v.key.toUpperCase(), name: v.name, description: v.description, health: v.health, vendoorLeadId: v.vendoorLeadId, abgLeadId: v.abgLeadId, categories: v.categoriesText.split("\n") });
          if (r.ok) {
            toast.success(tc("saved"));
            onDone?.();
          } else toast.error(r.error === "forbidden" ? tc("forbidden") : tc("error"));
        }}
      >
        <fieldset disabled={!editable} className="contents">
          <div>
            <Label htmlFor={`pk-${id}`}>{t("key")}</Label>
            <Input id={`pk-${id}`} value={v.key} disabled={!!p.id} maxLength={5} className="font-mono uppercase" onChange={(e) => setV({ ...v, key: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`pn-${id}`}>{t("name")}</Label>
            <Input id={`pn-${id}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`pv-${id}`}>{tp("vendoorLead")}</Label>
            <Select id={`pv-${id}`} value={v.vendoorLeadId ?? ""} onChange={(e) => setV({ ...v, vendoorLeadId: e.target.value || null })}>
              <option value="">—</option>
              {members.filter((m) => m.side === "vendoor").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`pa-${id}`}>{tp("abgLead")}</Label>
            <Select id={`pa-${id}`} value={v.abgLeadId ?? ""} onChange={(e) => setV({ ...v, abgLeadId: e.target.value || null })}>
              <option value="">—</option>
              {members.filter((m) => m.side === "abg").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`ph-${id}`}>{tp("health")}</Label>
            <Select id={`ph-${id}`} value={v.health} onChange={(e) => setV({ ...v, health: e.target.value as P["health"] })}>
              {(["on_track", "at_risk", "off_track"] as const).map((h) => (
                <option key={h} value={h}>
                  {tp(h)}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:row-span-2">
            <Label htmlFor={`pc-${id}`}>{t("categories")}</Label>
            <Textarea id={`pc-${id}`} rows={5} value={v.categoriesText} onChange={(e) => setV({ ...v, categoriesText: e.target.value })} />
            <p className="mt-1 text-meta text-fg-muted">{t("categoriesHint")}</p>
          </div>
          <div>
            <Label htmlFor={`pd-${id}`}>{tc("more")}</Label>
            <Textarea id={`pd-${id}`} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </div>
          {editable && (
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" size="sm" variant="primary">
                {tc("save")}
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </details>
  );
}
