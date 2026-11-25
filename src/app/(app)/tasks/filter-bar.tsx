"use client";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, X, SlidersHorizontal, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Menu, MenuContent, MenuItem, MenuTrigger, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusIcon } from "@/components/icons/status-icon";
import { PriorityIcon } from "@/components/icons/priority-icon";
import { useApp } from "@/components/layout/app-context";
import { cn } from "@/lib/cn";
import { ALL_PROPS, DEFAULT_FILTERS, QUICK_FILTERS, activeQuick, quickPatch, type TaskDisplay, type TaskFilters } from "@/lib/filters";
import { GROUP_MEMBERS, GROUP_REPRESENTATIVE, STATUS_GROUPS, type StatusGroup } from "@/domain/status-display";
import { PRIORITIES, TASK_TYPES } from "@/domain/types";

type Opt = { value: string; label: string; icon?: React.ReactNode };

function MultiFilter({ label, values, options, onChange }: { label: string; values: string[]; options: Opt[]; onChange: (v: string[]) => void }) {
  const tc = useTranslations("common");
  const active = values.length > 0;
  const shown = options.filter((o) => values.includes(o.value)).map((o) => o.label);
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "inline-flex h-7 max-w-[240px] items-center gap-1 rounded-full border px-2.5 text-meta",
          active ? "border-accent/50 bg-info-subtle text-fg" : "border-dashed border-border text-fg-secondary hover:bg-subtle",
        )}
      >
        <span className="font-medium">{label}</span>
        {active && <span className="truncate">: {shown.length > 2 ? `${shown.length}` : shown.join(", ")}</span>}
        <ChevronDown size={12} aria-hidden />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>{label}</MenuLabel>
        {options.map((o) => (
          <MenuItem key={o.value} checked={values.includes(o.value)} onSelect={(e) => (e.preventDefault(), onChange(values.includes(o.value) ? values.filter((v) => v !== o.value) : [...values, o.value]))}>
            {o.icon}
            {o.label}
          </MenuItem>
        ))}
        {active && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => onChange([])}>{tc("clear")}</MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

function SingleFilter({ label, value, options, onChange }: { label: string; value: string; options: Opt[]; onChange: (v: string) => void }) {
  const tc = useTranslations("common");
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-meta",
          value ? "border-accent/50 bg-info-subtle text-fg" : "border-dashed border-border text-fg-secondary hover:bg-subtle",
        )}
      >
        <span className="font-medium">{label}</span>
        {value && <span>: {options.find((o) => o.value === value)?.label}</span>}
        <ChevronDown size={12} aria-hidden />
      </MenuTrigger>
      <MenuContent>
        {options.map((o) => (
          <MenuItem key={o.value} checked={value === o.value} onSelect={() => onChange(value === o.value ? "" : o.value)}>
            {o.label}
          </MenuItem>
        ))}
        {value && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => onChange("")}>{tc("clear")}</MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );
}

export function FilterBar({ filters, onChange }: { filters: TaskFilters; onChange: (f: Partial<TaskFilters>) => void }) {
  const t = useTranslations();
  const { projects, members, me } = useApp();
  const quick = activeQuick(filters, me.side);
  const any = JSON.stringify({ ...filters, q: "" }) !== JSON.stringify({ ...DEFAULT_FILTERS, q: "" }) || !!filters.q;
  const people = [{ value: "me", label: t("common.me") }, ...members.map((m) => ({ value: m.id, label: m.name }))];
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
      <div className="relative me-1 w-full sm:w-64">
        <Search size={14} className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-fg-secondary" aria-hidden />
        <SearchBox key={filters.q} initial={filters.q} onSearch={(q) => onChange({ q })} placeholder={t("tasks.searchPlaceholder")} label={t("common.search")} />
      </div>
      <div role="group" aria-label={t("tasks.quick.label")} className="me-1 flex items-center gap-1.5">
        {QUICK_FILTERS.map((q) => (
          <button
            key={q}
            type="button"
            aria-pressed={quick === q}
            onClick={() => onChange(quickPatch(q, me.side))}
            className={cn("h-8 rounded-full border px-3 text-[13px] font-semibold", quick === q ? "border-fg bg-fg text-white" : "border-border bg-surface text-fg-secondary hover:bg-subtle")}
          >
            {t(`tasks.quick.${q}`)}
          </button>
        ))}
      </div>
      <MultiFilter label={t("tasks.filters.project")} values={filters.project} options={projects.map((p) => ({ value: p.key, label: `${p.key} · ${p.name}` }))} onChange={(v) => onChange({ project: v })} />
      <MultiFilter
        label={t("tasks.filters.status")}
        values={STATUS_GROUPS.filter((g) => GROUP_MEMBERS[g].every((m) => filters.status.includes(m)))}
        options={STATUS_GROUPS.map((g) => ({ value: g, label: t(`statusGroup.${g}`), icon: <StatusIcon status={GROUP_REPRESENTATIVE[g]} /> }))}
        onChange={(v) => onChange({ status: (v as StatusGroup[]).flatMap((g) => GROUP_MEMBERS[g]) })}
      />
      <MultiFilter label={t("tasks.filters.type")} values={filters.type} options={TASK_TYPES.map((s) => ({ value: s, label: t(`type.${s}`) }))} onChange={(v) => onChange({ type: v as TaskFilters["type"] })} />
      <MultiFilter
        label={t("tasks.filters.priority")}
        values={filters.priority}
        options={PRIORITIES.map((s) => ({ value: s, label: t(`priority.${s}`), icon: <PriorityIcon priority={s} /> }))}
        onChange={(v) => onChange({ priority: v as TaskFilters["priority"] })}
      />
      <MultiFilter label={t("tasks.filters.waiting")} values={filters.waiting} options={[{ value: "abg", label: t("waiting.abg") }, { value: "vendoor", label: t("waiting.vendoor") }]} onChange={(v) => onChange({ waiting: v as TaskFilters["waiting"] })} />
      <MultiFilter label={t("tasks.filters.assignee")} values={filters.assignee} options={[...people.filter((p) => p.value === "me" || members.find((m) => m.id === p.value)?.side === "abg"), { value: "none", label: t("tasks.filters.none") }]} onChange={(v) => onChange({ assignee: v })} />
      <MultiFilter label={t("tasks.filters.requester")} values={filters.requester} options={people} onChange={(v) => onChange({ requester: v })} />
      <SingleFilter label={t("tasks.filters.due")} value={filters.due} options={(["overdue", "today", "week"] as const).map((d) => ({ value: d, label: t(`tasks.filters.${d}`) }))} onChange={(v) => onChange({ due: v as TaskFilters["due"] })} />
      <SingleFilter label={t("tasks.filters.created")} value={filters.created} options={(["7d", "30d", "90d"] as const).map((d) => ({ value: d, label: t(`tasks.filters.${d}`) }))} onChange={(v) => onChange({ created: v as TaskFilters["created"] })} />
      <button
        type="button"
        aria-pressed={filters.hasOccurrences}
        onClick={() => onChange({ hasOccurrences: !filters.hasOccurrences })}
        className={cn("inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-meta", filters.hasOccurrences ? "border-accent/50 bg-info-subtle" : "border-dashed border-border text-fg-secondary hover:bg-subtle")}
      >
        {filters.hasOccurrences && <Check size={12} aria-hidden />}
        {t("tasks.filters.hasOccurrences")}
      </button>
      {any && (
        <Button size="sm" variant="ghost" onClick={() => onChange({ ...DEFAULT_FILTERS })}>
          <X size={12} aria-hidden />
          {t("tasks.clearFilters")}
        </Button>
      )}
    </div>
  );
}

function SearchBox({ initial, onSearch, placeholder, label }: { initial: string; onSearch: (q: string) => void; placeholder: string; label: string }) {
  const [q, setQ] = useState(initial);
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });
  useEffect(() => {
    if (q === initial) return;
    const id = setTimeout(() => onSearchRef.current(q), 300);
    return () => clearTimeout(id);
  }, [q, initial]);
  return <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={label} className="h-7 ps-7" />;
}

export function DisplayMenu({ display, onChange }: { display: TaskDisplay; onChange: (d: Partial<TaskDisplay>) => void }) {
  const t = useTranslations("tasks");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm">
          <SlidersHorizontal size={14} aria-hidden />
          {t("display")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <div className="grid grid-cols-[96px_1fr] items-center gap-2 text-ui">
          <label htmlFor="d-group" className="text-fg-secondary">
            {t("grouping")}
          </label>
          <Select id="d-group" value={display.group} onChange={(e) => onChange({ group: e.target.value as TaskDisplay["group"] })} className="h-7">
            {(["status", "project", "priority", "assignee", "waiting", "none"] as const).map((g) => (
              <option key={g} value={g}>
                {t(`group.${g}`)}
              </option>
            ))}
          </Select>
          <label htmlFor="d-order" className="text-fg-secondary">
            {t("ordering")}
          </label>
          <Select id="d-order" value={display.order} onChange={(e) => onChange({ order: e.target.value as TaskDisplay["order"] })} className="h-7">
            {(["priority", "due", "updated", "created"] as const).map((g) => (
              <option key={g} value={g}>
                {t(`order.${g}`)}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center justify-between text-ui">
          {t("showClosed")}
          <input type="checkbox" className="h-4 w-4" checked={display.showClosed} onChange={(e) => onChange({ showClosed: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between text-ui">
          {t("showSubtasks")}
          <input type="checkbox" className="h-4 w-4" checked={display.showSubtasks} onChange={(e) => onChange({ showSubtasks: e.target.checked })} />
        </label>
        <div>
          <div className="mb-1.5 text-meta text-fg-secondary">{t("properties")}</div>
          <div className="flex flex-wrap gap-1">
            {ALL_PROPS.map((p) => {
              const on = display.props.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ props: on ? display.props.filter((x) => x !== p) : [...display.props, p] })}
                  className={cn("h-6 rounded-full border px-2 text-meta", on ? "border-primary bg-primary text-primary-fg" : "border-border text-fg-secondary")}
                >
                  {t(`col.${p}`)}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
