/** What "Copy both" puts on the clipboard: the login on one line, the password on the next. Empty parts are left out. */
export function credentialCopyText(c: { username?: string | null; password?: string | null }): string {
  return [c.username, c.password].filter((x): x is string => !!x && x.length > 0).join("\n");
}
