/**
 * Credential guard (PRD FR-6.11, adapted: the app now has an "Account access" field for logins).
 * Detects passwords pasted into free text so the UI can offer to move them into the encrypted Account access field.
 * Never blocks. Runs in the browser (warning) and on the server (logging an override).
 * Heuristics follow gitleaks / detect-secrets (keyword + value, known token formats) plus Arabic and Franco-Arabic keywords.
 */

export type GuardLevel = "none" | "medium" | "high";

export interface GuardFinding {
  kind: "keyword_value" | "token" | "email_then_secret";
  level: Exclude<GuardLevel, "none">;
  /** Index range in the original text of the secret-looking value. */
  start: number;
  end: number;
}

export interface GuardResult {
  level: GuardLevel;
  findings: GuardFinding[];
  /** Best-effort extraction to prefill the Account access form. */
  suggestion: { username?: string; password?: string } | null;
}

// Arabic normalisation: unify alef/yeh/teh marbuta forms and strip tatweel and diacritics.
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

const KEYWORDS = [
  "password",
  "passwd",
  "pass",
  "pwd",
  "pw",
  "passcode",
  "secret",
  "api key",
  "apikey",
  "api_key",
  "token",
  "access key",
  "private key",
  // Arabic (normalised forms)
  "باسورد",
  "الباسورد",
  "باس",
  "الباس",
  "كلمه السر",
  "كلمه المرور",
  "كلمه سر",
  "الرقم السري",
  "رقم سري",
  "الرمز السري",
  // Franco-Arabic
  "el pass",
  "elpass",
  "kelmet el ser",
  "kelmet elser",
];

const USER_KEYWORDS = ["email", "e-mail", "user", "username", "login", "يوزر", "اليوزر", "الايميل", "ايميل", "اسم المستخدم", "el user", "el email"];

/** Phrases that talk about passwords without containing one (real bug reports). */
const TOPIC_PHRASES = [
  /forgot(ten)?[\s-]*pass(word)?/i,
  /reset[\s-]*pass(word)?/i,
  /change[\s-]*pass(word)?/i,
  /pass(word)?[\s-]*(reset|otp|code|field|page|policy|rule)/i,
  /\botp\b/i,
  /نسيت\s*(كلمه|الباسورد|الباس)/,
  /(تغيير|استرجاع|اعاده تعيين)\s*(كلمه|الباسورد)/,
];

const PLACEHOLDERS = /^(x+|\*+|\.+|-+|_+|null|none|n\/a|tbd|redacted|hidden|secret|password|\?+|<.*>|\[.*\]|{.*})$/i;

const TOKEN_PATTERNS: Array<{ re: RegExp }> = [
  { re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g }, // AWS access key id
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g }, // Google API key
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g }, // JWT
  { re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g }, // PEM private key
  { re: /\bshp(?:at|ca|pa|ss)_[a-fA-F0-9]{32}\b/g }, // Shopify
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g }, // GitHub
  { re: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g }, // Stripe
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g }, // Slack
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const EG_MOBILE_RE = /(?:\+?20|0)1[0125]\d{8}\b/;

/** Shannon entropy in bits per char. */
export function entropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** A single token that looks like a password: 6–64 chars, no spaces, mixed character classes or decent entropy. */
export function looksLikeSecret(value: string): boolean {
  const v = value.trim();
  if (v.length < 4 || v.length > 128 || /\s/.test(v)) return false;
  if (PLACEHOLDERS.test(v)) return false;
  if (EMAIL_RE.test(v)) return false;
  if (/^https?:\/\//i.test(v)) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length;
  if (v.length >= 6 && classes >= 2) return true;
  return v.length >= 8 && entropy(v) >= 3;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// keyword, optional "is"/"howa"/"هو", then a separator (: = - is) and a value.
const KEYWORD_VALUE_RE = new RegExp(
  `(^|[^\\p{L}\\p{N}_])(${KEYWORDS.map(escapeRe).join("|")})\\s*(?:is|howa|hya|هو|هي|بتاعه|bta3o|bta3ha)?\\s*[:=\\-–>]+\\s*(\\S+)|(^|[^\\p{L}\\p{N}_])(${KEYWORDS.map(escapeRe).join("|")})\\s+(?:is|howa|هو|هي)\\s+(\\S+)`,
  "giu",
);

export function analyzeText(input: string): GuardResult {
  const text = normalizeArabic(input);
  const findings: GuardFinding[] = [];
  let password: string | undefined;
  let username: string | undefined;

  // 1. Known token formats: high.
  for (const { re } of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      findings.push({ kind: "token", level: "high", start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
    }
  }

  // 2. Keyword followed by a value: high, unless it's a placeholder or a topic phrase without a value.
  KEYWORD_VALUE_RE.lastIndex = 0;
  for (const m of text.matchAll(KEYWORD_VALUE_RE)) {
    const value = (m[3] ?? m[6] ?? "").replace(/[.,;)]+$/, "");
    if (!value || PLACEHOLDERS.test(value)) continue;
    const surrounding = text.slice(Math.max(0, (m.index ?? 0) - 20), (m.index ?? 0) + m[0].length + 5);
    const isTopic = TOPIC_PHRASES.some((r) => r.test(surrounding));
    const secretish = looksLikeSecret(value);
    if (isTopic && !secretish) continue;
    if (!secretish && value.length < 4) continue;
    const start = (m.index ?? 0) + m[0].lastIndexOf(value);
    findings.push({ kind: "keyword_value", level: "high", start, end: start + value.length });
    password ??= value;
  }

  // 3. Email or Egyptian mobile line followed by a password-looking line: medium.
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idMatch = line.match(EMAIL_RE) ?? line.match(EG_MOBILE_RE);
    if (idMatch) {
      username ??= idMatch[0];
      // Same line: "email / secret" or next non-empty line is a single secret-looking token.
      const rest = line.slice((idMatch.index ?? 0) + idMatch[0].length).replace(/^[\s:/|,-]+/, "");
      const candidates: Array<{ value: string; at: number }> = [];
      if (rest && !/\s/.test(rest.trim())) candidates.push({ value: rest.trim(), at: offset + line.lastIndexOf(rest.trim()) });
      let j = i + 1;
      let nextOffset = offset + line.length + 1;
      while (j < lines.length && lines[j].trim() === "") {
        nextOffset += lines[j].length + 1;
        j++;
      }
      if (j < lines.length) {
        const next = lines[j].trim().replace(/^(pass(word)?|pwd|باسورد|الباسورد|كلمه السر)\s*[:=-]?\s*/i, "");
        if (next && !/\s/.test(next)) candidates.push({ value: next, at: nextOffset + lines[j].indexOf(next) });
      }
      for (const c of candidates) {
        if (looksLikeSecret(c.value) && !EMAIL_RE.test(c.value)) {
          findings.push({ kind: "email_then_secret", level: "medium", start: c.at, end: c.at + c.value.length });
          password ??= c.value;
          break;
        }
      }
    }
    offset += line.length + 1;
  }

  // Username keyword ("user: x")
  if (!username) {
    const um = text.match(new RegExp(`(?:${USER_KEYWORDS.map(escapeRe).join("|")})\\s*[:=-]\\s*(\\S+)`, "iu"));
    if (um) username = um[1];
  }

  const level: GuardLevel = findings.some((f) => f.level === "high") ? "high" : findings.length ? "medium" : "none";
  // Map positions back: normalisation keeps string length for the characters we change except removed diacritics.
  // Positions are therefore approximate for Arabic text with diacritics; they are only used for highlighting.
  return {
    level,
    findings,
    suggestion: level === "none" ? null : { username, password },
  };
}

/** Replace detected secrets in the text with a placeholder (used by "Move to Account access"). */
export function redactSecrets(input: string, result: GuardResult = analyzeText(input)): string {
  if (result.level === "none" || normalizeArabic(input).length !== input.length) {
    // Fall back to value replacement when positions may have shifted.
    let out = input;
    if (result.suggestion?.password) out = out.split(result.suggestion.password).join("[see Account access]");
    return out;
  }
  const sorted = [...result.findings].sort((a, b) => b.start - a.start);
  let out = input;
  for (const f of sorted) out = out.slice(0, f.start) + "[see Account access]" + out.slice(f.end);
  return out;
}
