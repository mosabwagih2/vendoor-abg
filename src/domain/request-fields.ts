import type { TaskType } from "./types";

/** PRD 6.7 field table: which detail fields each request type shows and requires. */
export type FieldRule = "required" | "optional" | "hidden";
export type RequestField =
  | "currentBehaviour"
  | "expectedBehaviour"
  | "accounts"
  | "orderCodes"
  | "attachments"
  | "howOften"
  | "suggestedPriority"
  | "whyItMatters";

export const FIELD_RULES: Record<Exclude<TaskType, "ops">, Record<RequestField, FieldRule | "required_if_order">> = {
  bug: {
    currentBehaviour: "required",
    expectedBehaviour: "required",
    accounts: "required",
    orderCodes: "required_if_order",
    attachments: "required",
    howOften: "required",
    suggestedPriority: "required",
    whyItMatters: "optional",
  },
  change: {
    currentBehaviour: "required",
    expectedBehaviour: "required",
    accounts: "optional",
    orderCodes: "optional",
    attachments: "optional",
    howOften: "hidden",
    suggestedPriority: "required",
    whyItMatters: "required",
  },
  feature: {
    currentBehaviour: "optional",
    expectedBehaviour: "required",
    accounts: "optional",
    orderCodes: "hidden",
    attachments: "optional",
    howOften: "hidden",
    suggestedPriority: "required",
    whyItMatters: "required",
  },
  question: {
    currentBehaviour: "optional",
    expectedBehaviour: "optional",
    accounts: "optional",
    orderCodes: "optional",
    attachments: "optional",
    howOften: "hidden",
    suggestedPriority: "hidden",
    whyItMatters: "hidden",
  },
};

export interface RequestDraft {
  type: TaskType;
  title: string;
  currentBehaviour?: string | null;
  expectedBehaviour?: string | null;
  whyItMatters?: string | null;
  howOften?: string | null;
  isOrderRelated?: boolean;
  accounts?: string[];
  orderCodes?: string[];
  suggestedPriority?: string | null;
  attachments?: unknown[];
  parentId?: string | null;
}

/** Returns the list of missing required fields. Same rules on client and server. */
export function missingFields(d: RequestDraft): string[] {
  const errs: string[] = [];
  const has = (s?: string | null) => !!s && s.trim().length > 0;
  if (!has(d.title)) errs.push("title");
  if (d.parentId || d.type === "ops") return errs;
  const rules = FIELD_RULES[d.type];
  for (const [field, rule] of Object.entries(rules) as Array<[RequestField, FieldRule | "required_if_order"]>) {
    const required = rule === "required" || (rule === "required_if_order" && !!d.isOrderRelated);
    if (!required) continue;
    const v = d[field as keyof RequestDraft];
    const ok = Array.isArray(v) ? v.length > 0 : typeof v === "string" ? has(v) : !!v;
    if (!ok) errs.push(field);
  }
  return errs;
}
