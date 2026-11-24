# Authentication library options for a Next.js App Router internal app (Prisma + PostgreSQL)

Research date: 2026-11-24. Network note: only github.com was reachable from the research session. authjs.dev, better-auth.com, lucia-auth.com and cheatsheetseries.owasp.org could not be fetched, so docs were read from their GitHub sources (the same content in .md/.mdx form). Each URL below is the page that was actually read.

Requirements: email + password sign-in, optional magic link (Resend), invite-only accounts, 30-day sessions, revoke sessions on deactivate or role change, optional TOTP 2FA for admins later.

**Overall recommendation: Better Auth** (stable line 1.7.x). Use database sessions in Postgres through the Prisma adapter with `transaction: true`. Turn sign-up off (`disableSignUp`) and create accounts with the admin plugin. Switch the password hasher to Argon2id. Do not use Lucia, which is deprecated as a library. Do not use Auth.js v5 for a new project: it has been in maintenance mode under Better Auth since Sept 2025, is still beta, and its Credentials provider forces JWT sessions, which work against revocation. The other option is to build sessions yourself following the Lucia guide. That is viable, but it means owning the password reset, rate limiting and 2FA code.

## Lucia: current status

### Takeaway
Lucia v3 was announced as deprecated on Oct 20, 2024, with bug fixes ending by March 2025. Lucia is now a learning resource: the author recommends implementing sessions yourself using the lucia-auth.com guides, with the Oslo and Arctic helper libraries. It should not be the library for a new app.

### Cited Findings
- The announcement is dated Oct 20, 2024: "I'll be deprecating Lucia v3 by March 2025." The `lucia` npm package gets bug fixes until March 2025, adapters were deprecated by end of 2024, and v3 docs and examples are no longer updated beyond quick fixes. — [Lucia discussion #1714](https://github.com/lucia-auth/lucia/discussions/1714)
- Recommended path: lucia-auth.com is now a guide to building session auth yourself. You "essentially recreate Lucia v3 in your own project" without the multi-runtime and multi-database abstraction. Oslo and Arctic remain maintained. — [Lucia discussion #1714](https://github.com/lucia-auth/lucia/discussions/1714)

### Inferences
- A roll-your-own build based on the Lucia guide gives full control: an opaque session token, a hashed token stored in Postgres, and revocation with `DELETE FROM session WHERE user_id = ...`. The team would then write and maintain password reset, invite tokens, rate limiting and TOTP themselves. For an internal app this is feasible, but it costs more and carries more risk than a maintained library.

### Gaps
- lucia-auth.com was not reachable, so the current guide pages (session-token hashing details, cookie recipe) were not re-read.

## Auth.js (NextAuth v5): status and limitations in 2026

### Takeaway
Auth.js became part of Better Auth in Sept 2025. Its maintenance now covers only security and urgent issues, and both teams recommend Better Auth for new projects. v5 had no stable-release plan in the announcement thread. For this app's needs the main limitations are that the Credentials provider requires JWT sessions, that password hashing and reset are not built in, and that revocation is weak with JWTs.

### Cited Findings
- On Sept 26, 2025 (GitHub discussion; Better Auth's blog post is dated Sept 22, 2025), Auth.js announced it is now maintained by the Better Auth team: "maintenance will continue for security and urgent issues." It calls Better Auth "the best way forward for most teams." — [next-auth discussion #13252](https://github.com/nextauthjs/next-auth/discussions/13252); [Better Auth blog (via search)](https://better-auth.com/blog/authjs-joins-better-auth)
- Better Auth recommends it for new projects "unless there are some very specific feature gaps," citing stateless sessions without a database as the main gap. — [next-auth discussion #13252](https://github.com/nextauthjs/next-auth/discussions/13252) (quoting the Better Auth blog)
- On v5, a maintainer said "We don't have any immediate plans for v5. But we'll keep maintaining both versions" (Sept 27, 2025). Asked whether v5 would leave beta, the answer was "We'll have an update soon" (Oct 28, 2025). The thread gives no stable timeline. — [next-auth discussion #13252](https://github.com/nextauthjs/next-auth/discussions/13252)
- Credentials provider docs: the library doesn't hash passwords ("Your own logic for dealing with plaintext password strings; be careful!"), and "By default, the Credentials provider does not persist data in the database." The docs push users toward OAuth, magic links or WebAuthn instead. — [Auth.js credentials docs (GitHub source)](https://github.com/nextauthjs/next-auth/blob/main/docs/pages/getting-started/authentication/credentials.mdx)
- Credentials sign-in does not create a database session, so `session: { strategy: "jwt" }` is required. When an adapter is configured, the strategy defaults to "database", and combining that with Credentials fails. — [next-auth issue #8161](https://github.com/nextauthjs/next-auth/issues/8161); [DEV guide](https://dev.to/hirodeath/nextauth-v5-sessions-jwt-or-database-untangling-the-adapter-driven-switch-with-a-production-config-43kl). These are community sources; the official docs page read does not state the JWT requirement explicitly.

### Inferences
- With JWT sessions, revoking access on deactivation or role change takes custom work: a DB lookup in the `jwt`/`session` callback, or a `tokenVersion` column. That puts back a per-request DB hit and gives up the benefit of JWTs. Password reset, invite tokens, rate limiting and TOTP would all be custom code. Combined with maintenance-only status, Auth.js does not suit this app.

### Gaps
- authjs.dev was unreachable, so I could not confirm whether v5 has shipped a stable release since late 2025. The latest discussion evidence shows it was still beta.

## Better Auth: feature fit, maturity and security record

### Takeaway
Better Auth covers almost every requirement with first-party features. Email/password ships with reset flows. The magic-link plugin is single-use and expires in 5 minutes by default. The admin plugin handles createUser, roles, ban and session revocation, and the 2FA plugin provides TOTP and backup codes. Sessions are stored in the database and can be revoked. It ships releases often (v1.7.27 on Nov 20, 2026; 1.8 in beta) and publishes security advisories actively. Several Critical and High advisories appeared in Sept to Nov 2026, so upgrades need to be kept current.

### Cited Findings
**Email/password**
- Enable with `emailAndPassword.enabled`. `disableSignUp` (default false) turns off self sign-up. The default hasher is scrypt (native to Node), and `password.hash`/`verify` can be overridden. The docs show an Argon2id example using `@node-rs/argon2`. Password length defaults: min 8, max 128. — [Better Auth email-password docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/authentication/email-password.mdx)
- Reset flow: `sendResetPassword`, then `requestPasswordReset`, then `resetPassword`. `resetPasswordTokenExpiresIn` defaults to 3600 s. The docs advise not awaiting the email send, to limit timing attacks. — [same](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/authentication/email-password.mdx)
- `revokeSessionsOnPasswordReset` defaults to **false**. Revocation and the password change are atomic only if the adapter has transactions enabled, and **the Prisma adapter needs `transaction: true`**. — [same](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/authentication/email-password.mdx)

**Magic link**
- `expiresIn` defaults to 300 s. The token is consumed atomically on first use, and `allowedAttempts` is deprecated and ignored. `disableSignUp` is available. `storeToken` defaults to `"plain"`; `"hashed"` is an option. The callback is `sendMagicLink({ email, token, url, metadata }, ctx)`, which fits Resend directly. — [Better Auth magic-link docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/magic-link.mdx)

**Admin plugin (invite-only, deactivate, role change)**
- `createUser` (email, password, name, role), `setRole`, and `banUser`. Banning blocks sign-in and "revokes all of their existing sessions", with an optional expiry. `listUserSessions`, `revokeUserSession` and `revokeUserSessions` are available. Access control is custom via `createAccessControl`. Impersonation is capped at 1 h by default, and admins cannot impersonate other admins by default. — [Better Auth admin plugin docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/admin.mdx)

**2FA plugin**
- TOTP becomes active only after the user verifies a code. Backup codes default to 10 single-use codes. Email OTP is optional. Enabling 2FA requires the password for credential accounts. Trusted devices last 30 days. Credential sign-in returns `twoFactorRedirect`. **Passwordless methods (including magic link) are not gated by 2FA by default.** Treat the TOTP URI as a secret and render the QR code locally. — [Better Auth 2FA docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/2fa.mdx)

**Sessions and revocation**
- Sessions live in a `session` table, and the token is the cookie. The default expiry is 7 days, sliding with `updateAge`. Revocation APIs are `revokeSession`, `revokeOtherSessions` and `revokeSessions`. If secondary storage (e.g. Redis) is configured, sessions go there by default unless `storeSessionInDatabase: true` is set. — [Better Auth session docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/session-management.mdx)
- Pitfall: "When `cookieCache` is enabled, revoked sessions may remain active on other devices until the cookie cache expires." To avoid this, disable the cache, use a short `maxAge`, or pass `disableCookieCache: true` on sensitive checks. — [same](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/session-management.mdx)

**Rate limiting**
- On by default in production only: 100 requests per 10 s, and `/sign-in/email` plus `/two-factor/*` are limited to 3 per 10 s. Server-side `auth.api` calls are not limited. Storage defaults to memory, which the docs call unsuitable for serverless; use `storage: "database"` or secondary storage there. Client IP comes from spoofable `X-Forwarded-For` by default, so set `ipAddressHeaders` or `trustedProxies`. — [Better Auth rate-limit docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/rate-limit.mdx)

**Next.js App Router**
- The route handler is `toNextJsHandler(auth)` at `/api/auth/[...all]`. Add the `nextCookies()` plugin last so server actions can set cookies. In RSC and server actions, call `auth.api.getSession({ headers: await headers() })`. In Next 16, `proxy.ts` can validate fully on the Node runtime. `getSessionCookie` only checks that the cookie exists and is "not secure", so it is fine for optimistic redirects but each page and action must still validate. — [Better Auth Next.js docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/integrations/next.mdx)

**Maturity and security track record**
- The latest stable is v1.7.27 (Nov 20). v1.8.0 is in beta, and patch releases land several times a week. — [Better Auth releases](https://github.com/better-auth/better-auth/releases)
- Recent advisories include **Critical** "OAuth state can be used as a Magic Link to sign in as another user" (GHSA-965c-763c-88jm, Sept 30, 2026), **High** in `@better-auth/sso` and `@better-auth/electron`, and **Moderate** issues such as "Email-change links stay valid after the address changes hands", "Email OTP attempt limit can be raced", an admin `user:update` phone-number change, and "OAuth sign-in can treat an unverified provider email as verified" (Nov 3, 2026). There is also a **Low** issue: "Concurrent requests can exceed rate limits on PostgreSQL" (drizzle adapter). — [Better Auth security advisories](https://github.com/better-auth/better-auth/security/advisories)
- Better Auth now also stewards Auth.js; the search results also mention a "Better Auth joins Vercel" post. — [Better Auth blog (search result)](https://better-auth.com/blog/better-auth-joins-vercel). I could not read it.

### Inferences
- Configuration that fits the requirements:
  - `emailAndPassword: { enabled: true, disableSignUp: true }` and `magicLink({ disableSignUp: true, storeToken: "hashed" })`.
  - `session: { expiresIn: 60*60*24*30, updateAge: 60*60*24 }`, with `cookieCache` off or a short `maxAge`.
  - `prismaAdapter(prisma, { provider: "postgresql", transaction: true })`, `admin()` and `nextCookies()`.
  - Rate limiting with `storage: "database"` and correct IP headers.
  - An Argon2id hasher and `revokeSessionsOnPasswordReset: true`.
- On deactivation call `banUser` (or `revokeUserSessions` plus a custom `active` flag). On role change call `setRole` followed by `revokeUserSessions`. setRole is not documented as revoking sessions.
- The advisory history shows a large attack surface, mostly in plugins this app won't use (OAuth, SSO, Expo, Electron). Enable only the plugins you need, pin versions, use Renovate or Dependabot, and watch the advisories feed.
- If admins get TOTP, magic link becomes a 2FA bypass, because passwordless methods are not gated by default. Either turn magic link off for admins or add a hook that blocks magic-link sign-in for users with 2FA enabled.

### Gaps
- I did not read the Prisma adapter page or the organization plugin page. The organization plugin has invitations, but it is designed for multi-tenant orgs and probably isn't needed for a single-tenant internal app. This is unverified.
- No CVE IDs or affected-version ranges were retrieved for the advisories.
- I did not verify whether `setRole` revokes or refreshes sessions, or the `updateAge` default (the docs example uses 1 day).
- No independent third-party security audit of Better Auth was found (none was searched).

## Password hashing recommendation (OWASP)

### Takeaway
Use Argon2id with at least m=19 MiB, t=2, p=1 (OWASP minimum), or m=46 MiB, t=1, p=1. Fall back to scrypt (N=2^17, r=8, p=1) if Argon2 is unavailable; that is Better Auth's default family. Use bcrypt only for legacy systems, because of its 72-byte input limit.

### Cited Findings
- Argon2id minimum configurations (equivalent): m=47104 KiB (46 MiB), t=1, p=1; m=19456 (19 MiB), t=2, p=1; m=12288, t=3; m=9216, t=4; m=7168, t=5. — [OWASP Password Storage Cheat Sheet (GitHub source)](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md)
- scrypt is for when Argon2id is unavailable: N=2^17 (128 MiB), r=8, p=1, or equivalents down to N=2^13, r=8, p=10. — [same](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md)
- bcrypt is for legacy systems only: work factor at least 10 and a 72-byte maximum input. Pre-hashing is dangerous (null bytes, password shucking). If you must pre-hash, use `bcrypt(base64(hmac-sha384(password, pepper)))`. — [same](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md)
- PBKDF2-HMAC-SHA256 needs 600,000 iterations and is the choice when FIPS-140 is required. — [same](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md)

### Inferences
- `@node-rs/argon2` (the Better Auth docs example) with m=19456, t=2, p=1 meets OWASP. Better Auth's built-in scrypt is acceptable if its parameters match OWASP, but those parameters were not verified.

### Gaps
- I did not verify Better Auth's default scrypt parameters (N/r/p) against the OWASP values.
- The cheat sheet's "last updated" date was not confirmed. The values match the long-standing OWASP guidance; there is no distinct "2025 edition".

## OWASP guidance for magic links, invites and sessions

### Takeaway
Treat magic-link and invite tokens like password-reset tokens: generate them with a CSPRNG, make them single-use and short-lived, store them hashed, build URLs from a fixed base URL (not the Host header), and serve the landing page with `Referrer-Policy: no-referrer`. For sessions, OWASP recommends an absolute timeout of hours, not 30 days, and regenerating the session after a privilege change. A 30-day session is therefore a documented risk acceptance, offset by revocation and step-up checks for admin actions.

### Cited Findings
- URL tokens must be "generated using a cryptographically secure random number generator", "invalidated after they have been used", "expire after an appropriate period" (no duration given), and "stored in a secure manner". — [OWASP Forgot Password Cheat Sheet (GitHub source)](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Forgot_Password_Cheat_Sheet.md)
- Set `Referrer-Policy: no-referrer`. "Don't rely on the Host header while creating the reset URLs." "Return a consistent message for both existent and non-existent accounts," with uniform response timing. Offer or perform invalidation of all sessions after a reset. — [same](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Forgot_Password_Cheat_Sheet.md)
- Sessions:
  - Session IDs need at least 64 bits of entropy. Cookies should be `Secure`, `HttpOnly`, `SameSite=Strict` or `Lax`, and the `__Host-` prefix is recommended.
  - Idle timeout: 15–30 min for low-risk apps. Absolute timeout: "All sessions should implement an absolute timeout", with 4–8 h suggested for office workloads.
  - The session ID "must be renewed or regenerated ... after any privilege level change".
  - Logout must invalidate the session on the server, revoking all IDs in the logical session.

  — [OWASP Session Management Cheat Sheet (GitHub source)](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Session_Management_Cheat_Sheet.md)

### Inferences
- Magic link: Better Auth's defaults (5 min expiry, single use) meet the guidance. Set `storeToken: "hashed"` to follow the "stored securely" rule.
- Invite flow (no dedicated OWASP cheat sheet found; built from the reset-token guidance):
  1. An admin creates the user with the admin `createUser` call.
  2. The app sends a one-time "set your password" link using the password-reset mechanism, or a custom invite token that is hashed, single-use, expires in 24–72 h, and is revoked when the invite is re-sent or cancelled.
  3. The invited user's email is marked verified only once the link is consumed.

  The 24–72 h figure is a judgement call; OWASP gives no number.
- Admin actions should require a fresh session or 2FA step-up, which offsets the long session. Revoke all sessions on role change to match OWASP's guidance to regenerate the session ID after a privilege change.

### Gaps
- OWASP has no invite-specific cheat sheet that I could find. Invite guidance here is inferred from the Forgot Password and Session Management sheets.
- I could not fetch the OWASP Authentication Cheat Sheet or the Multifactor Authentication Cheat Sheet (the time budget ran out).

## Other candidates (brief)

### Takeaway
Besides Better Auth, the realistic options are a roll-your-own build following the Lucia guide with Oslo and Arctic, or a hosted IdP such as Clerk, WorkOS, Auth0 or Supabase Auth. Hosted services take on credential storage and 2FA, but they add a vendor and a per-user cost. None of these was researched in depth.

### Cited Findings
- Oslo and Arctic remain maintained building blocks for DIY auth. — [Lucia discussion #1714](https://github.com/lucia-auth/lucia/discussions/1714)

### Inferences
- For a small internal app already on Prisma and Postgres, self-hosted Better Auth avoids vendor lock-in and per-MAU cost while providing reset, rate limiting, admin and TOTP out of the box.

### Gaps
- Hosted options (Clerk, WorkOS AuthKit, Auth0, Supabase Auth) and other libraries (e.g. Stack Auth) were not researched.
