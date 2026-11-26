import type { Prisma } from "@/generated/prisma/client";

type JsonValue = Prisma.JsonValue;

/**
 * MySQL has no array columns, so lists (accounts, order codes, working days) are stored as JSON arrays.
 * These read them back as typed arrays. Anything that is not an array reads as empty, the way a NULL list did before.
 */
export function stringList(v: JsonValue | null | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function numberList(v: JsonValue | null | undefined): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}

/** A task or occurrence row with its accounts and order codes read as string arrays. */
export function withLists<T extends { accounts: JsonValue; orderCodes: JsonValue }>(row: T): Omit<T, "accounts" | "orderCodes"> & { accounts: string[]; orderCodes: string[] } {
  return { ...row, accounts: stringList(row.accounts), orderCodes: stringList(row.orderCodes) };
}
