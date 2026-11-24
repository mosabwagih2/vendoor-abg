export class AppError extends Error {
  constructor(
    public code: "forbidden" | "invalid_status" | "not_found" | "invalid_input" | "conflict",
    message?: string,
  ) {
    super(message ?? code);
  }
}

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; message?: string };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.code, message: e.message };
    if (e && typeof e === "object" && "issues" in e) return { ok: false, error: "invalid_input", message: JSON.stringify((e as { issues: unknown }).issues) };
    // Let Next.js redirects/notFound propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "server_error" };
  }
}
