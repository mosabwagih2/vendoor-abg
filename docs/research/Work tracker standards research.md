# Build the Vendoor↔ABG tracker on proven standards

The tracker should copy the industry's settled patterns rather than invent new ones. Use a Linear/Plane-style triage queue (Accept, Decline, Duplicate, Snooze). Classify items with the ITIL types. Measure SLAs in business minutes against an editable Africa/Cairo calendar running Sun–Thu, and pause the clock only while the item waits on Vendoor. Split ABG's "Resolved" from Vendoor's "Done", and add a verification step between them. For the stack, choose **Better Auth**: Lucia is deprecated, and Auth.js has been in maintenance mode under the Better Auth team since September 2025. **Transcode every upload**: video goes to H.264/AAC MP4 and audio to AAC .m4a, with the original kept. Ogg Opus voice notes now play in every current browser, but iPhones on iOS 18.3 or earlier still cannot play them, and iPhone HEVC .mov files are unreliable on Windows, Android and Firefox. The WCAG 2.2 AA requirements most likely to catch a dense kanban app are 2.5.7 (provide a "Move to…" menu, not just drag), 2.5.8 (24×24 px targets) and 2.4.11 (sticky chrome must not fully hide focus). For credentials, use a client-side, warn-only detector that combines known token formats, English, Arabic and Franco-Arabic keyword-plus-value patterns, and email-then-password line pairs. No published detector covers Arabic, so this lexicon has to be tuned on real tickets.

## Intake splits incidents from requests, and only Vendoor closes

**Triage.** Linear's triage inbox has four actions: Accept, Decline, Mark as duplicate and Snooze. Merging a duplicate moves its attachments and customer requests onto the canonical issue and closes the duplicate ([Linear Docs: Triage](https://linear.app/docs/triage)). A newer changelog entry adds a dedicated Duplicate status, and when the original is completed, the linked external tickets reopen ([Linear changelog](https://linear.app/changelog/page/2)). Plane uses a small status enum for the same model: Pending −2, Rejected −1, Snoozed 0, Accepted 1, Duplicate 2. Its `duplicate_to` field records the target ([Plane API](https://developers.plane.so/api-reference/intake-issue/update-intake-issue-detail)), and the starting workflow state is chosen when an item is accepted ([Plane Docs: Intake](https://docs.plane.so/core-concepts/intake)).

**Item types.** ITIL 4 defines each type by what success means. An **incident** is an unplanned interruption, and the goal is to restore service, often with a workaround. A **service request** is a predefined, routine ask. A **problem** is the cause, or potential cause, of one or more incidents, and a permanent fix usually requires a **change** ([InvGate](https://blog.invgate.com/itil-ticket-types); [customerexperience.io](https://customerexperience.io/blog/incident-vs-service-request-difference-examples)). These definitions come from secondary sources quoting ITIL. Check the exact wording against the ITIL 4 practice guides before it goes into a contract.

**SLA clocks.** The help-desk tools agree on the mechanics. Zendesk counts first reply only from the first *public* agent comment, not internal notes ([Zendesk SLA policies](https://support.zendesk.com/hc/en-us/articles/4408829459866-Defining-SLA-policies)). Freshdesk excludes private notes and automated notifications ([Macha](https://www.getmacha.com/blog/freshdesk-sla-policies-explained)). Each target can run on business hours or calendar hours, and holidays count as non-working time ([Freshdesk](https://support.freshdesk.com/support/solutions/articles/37627-what-are-business-hours-and-calendar-hours-)). Out of the box, ServiceNow pauses incident SLAs only for "Awaiting caller", and practitioners argue that only states the customer controls should pause the clock ([ServiceNow Community](https://www.servicenow.com/community/incident-management-forum/incident-on-hold-and-sla-pause-conditions/m-p/2871776)). Its default workflow warns at **50%, 75% and 100%** of elapsed time, and escalates to the manager from 75% ([ServiceNow Community](https://www.servicenow.com/community/itsm-forum/in-default-sla-when-and-how-many-notifications-are-sent/m-p/496521)). A pause has a known failure mode: a ticket left in "Waiting for customer" shows a healthy SLA forever. Pair the pause with reminders and a timeout ([Atlassian Community](https://community.atlassian.com/forums/Jira-Service-Management/Pause-time-on-issues-while-waiting-for-customer/qaq-p/1441213); [ResumeLens](https://www.resumelens.org/blog/jira/jira-service-management-sla)). When a resolved ticket is reopened, Freshdesk resumes the existing clock rather than starting a fresh one ([Freshdesk](https://support.freshdesk.com/support/solutions/articles/225357-will-the-reopening-of-a-resolved-ticket-count-against-average-resolution-time-)).

**Verified resolution and auto-close.** ITIL practice expects the customer to confirm a resolution before the item closes ([Advisera](https://advisera.com/20000academy/knowledgebase/incident-resolution-closure-waiting-fat-lady-sing/)). Tools differ on how long they wait without an answer. Jira Service Management's template auto-closes resolved requests after **3 business days** ([Atlassian](https://support.atlassian.com/jira-service-management-cloud/docs/auto-close-resolved-service-requests/)). Zendesk closes Solved tickets after **4 days**, and once a ticket is Closed, any later reply becomes a linked follow-up ticket ([Zendesk lifecycle](https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses)). Common ITIL implementations wait about **5 business days** ([ManageEngine](https://www.manageengine.com/products/service-desk/itsm/itil-best-practices.html)). The tracker's rule that only Vendoor marks Done conflicts with a silent auto-close. A timeout should therefore land in a separate state and never count as verified. Sources call a reopen rate under 5% healthy ([Giva](https://www.givainc.com/blog/ticket-reopen-rate-causes/)), but those benchmarks come from vendor blogs, not from a standards body.

| Decision | Build rule |
|---|---|
| Intake states | `pending · accepted · declined(reason required, visible to Vendoor) · snoozed(wake_at) · duplicate(duplicate_of)`. Duplicate is its own terminal state, separate from Declined. Merging moves attachments and the requester to the canonical item and notifies them when it reaches Done. |
| Types | Bug in production = Incident (with severity). Feature/change = Change. Access/info = Service request. Root-cause investigation = Problem, linked to its incidents. Incidents at Sev1–2 need a root-cause or problem link before Done. |
| Workflow | Triage → Todo → In progress → Waiting for Vendoor → **Resolved (ABG)** → Awaiting verification → **Done (Vendoor only)**. Rejecting verification returns the item to In progress with a required reason and increments `reopen_count`. |
| SLA clocks | Two clocks, first response and resolution, set per type × severity and counted in business minutes. First response = the first ABG comment Vendoor can see; internal notes, auto-acknowledgements and status-only changes don't count. Only Waiting for Vendoor and Awaiting verification pause the clocks. Warn at 50% (assignee) and 75% (assignee + lead); breach at 100%. A reopen resumes the original clock and keeps any breach. |
| Auto-close | Remind at business day 3 and 7 of Awaiting verification. After N business days (set in the contract, default 10), move to **"Closed – not verified"**, never to Done. A regression reported after Done opens a new linked item. |
| Metrics | Verification rejection rate, post-Done regression rate within 30 days, SLA attainment by type and severity. Send CSAT only when Vendoor marks Done. |

## WCAG 2.2 AA pressure points: drag, targets, focus and toasts

**Dragging (2.5.7).** Anything done by dragging must also work with a single pointer and no drag. Keyboard support does **not** satisfy 2.5.7, so dnd-kit's keyboard sensor alone fails it. W3C's own example is a task board with a pop-up "move" menu ([W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)). Atlassian recommends exactly this: put a button-triggered menu of move outcomes next to, or on, the drag handle, and announce the result through a live region ([Atlassian Pragmatic DnD a11y](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/)). dnd-kit covers keyboard dragging and lets you customise and localise the screen-reader instructions and announcements ([dnd-kit accessibility](https://docs.dndkit.com/guides/accessibility)).

**Target size (2.5.8).** Targets must be at least **24×24 CSS px**. A smaller target passes only if a 24 px circle centred on it intersects no other target and no other undersized target's circle ([W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)). Dense rows of status, priority and assignee icons at 375 px are where this fails, and axe-core's `target-size` rule catches it ([Deque](https://dequeuniversity.com/rules/axe/4.6/target-size)).

**Focus visibility (2.4.11).** At AA, a sticky header, peek panel or toast may partly cover the focused element but must never cover it entirely ([W3C Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).

**Toasts with Undo.** These are contested, so design defensively. Screen readers read "Undo" as plain text, and the toast may be gone before the user reaches it ([Scott O'Hara](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html)). GitLab advises keeping actions out of the status region, because a time limit on them risks failing 2.2.1 ([GitLab Pajamas #2771](https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com/-/issues/2771)).

**Markup.** Grid roles belong only on real spreadsheet-style widgets. Making rows clickable does not justify `role="grid"` ([Roselli](https://adrianroselli.com/2024/07/be-careful-using-grid.html)). A native `<table>` is the default ([MDN](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/Table_Role)).

**Login.** Accessible authentication (3.3.8) is met if fields accept paste and autofill. Use `autocomplete` per technique H100, and avoid failure F109 by never blocking paste. Magic links pass outright ([W3C 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html); [W3C F109](https://w3.org/WAI/WCAG22/Techniques/failures/F109)).

**Uploaded media.** A voice note is audio-only content and needs a transcript. WCAG has no exemption for user-generated content. A platform's options are a "partial conformance – third-party content" statement plus tools that make captions and transcripts easy to add ([W3C wiki](https://www.w3.org/WAI/GL/wiki/Understanding_Partial_Conformance_-_Third_Party_Content)).

**Testing.** Automated scans catch only a subset of these issues ([Playwright](https://playwright.dev/docs/accessibility-testing)).

| Decision | Build rule |
|---|---|
| Kanban | dnd-kit for pointer and keyboard drag, with localised announcements ("Moved ENG-123 to In progress, position 1 of 3"). Every card also gets a **"Move to…" menu button** listing columns and positions. Focus returns to the moved card after a drop. |
| List | One `<table>` per status group, headed by a `<h2>` with a count. Collapsing uses `<button aria-expanded>` (the disclosure pattern), not treegrid. Row pickers are `<button aria-haspopup>` with names like "Status: In progress, change status". |
| Density | 24×24 px minimum hit area, padded with pseudo-elements where needed. 44 px on touch is preferred but not required. Status and priority use icon shape and text as well as colour. Icons, focus rings and drop indicators meet 3:1 contrast. |
| Focus | Set `scroll-padding` to the height of the sticky header and toasts. The peek panel is a non-modal `<aside>` on desktop and a modal dialog at 375 px. Closing a dialog returns focus to the element that opened it. |
| Toasts | Mount a persistent `role="status"` region at page load. Undo is a real button outside the live text. Toasts last at least 10 s and pause on hover or focus. Ctrl/Cmd+Z undoes. An Archive and activity log means a missed toast never loses work. |
| Media | Native `<audio>`/`<video controls>`, no autoplay, WebVTT track upload, optional machine transcript with an edit step, and a "No transcript" badge. |
| CI | `@axe-core/playwright` per view state (list, board, peek, modal, toast, 375 px), plus scripted keyboard tests for the move menu, Escape and focus return, and toast Undo. Manual NVDA and VoiceOver pass before release. |

## Transcode everything, because three platforms still break

**WhatsApp voice notes.** Exports are Ogg Opus, mono, from about 16 kHz input, saved as `.opus` (Android `PTT-YYYYMMDD-WA####.opus`, iOS `########-AUDIO-….opus`). Meta's platform requires `audio/ogg` with the Opus codec ([Meta WhatsApp audio messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/audio-messages); [ffmpeg-user](https://ffmpeg.org/pipermail/ffmpeg-user/2019-July/044853.html)).

**Opus playback.** Safari added Ogg Opus playback only in **Safari 18.4 (iOS/macOS, 31 March 2025)**, so iPhones on iOS 18.3 or earlier cannot play WhatsApp voice notes ([Apple Safari 18.4 notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)). The same release added WebM to Safari's MediaRecorder. Recording Ogg Opus in Safari is still reported to fail ([frequal.com](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html)).

**iPhone video.** iPhones record HEVC in .mov by default. Chrome decodes HEVC only with a hardware decoder (since Chrome 107), and Windows also needs the HEVC Video Extensions ([Android Police](https://www.androidpolice.com/google-chrome-107/); [Plex forum](https://forums.plex.tv/t/updating-chrome-profile-for-hevc-chrome-107/816329)). In practice, iPhone .mov files play in Safari but often fail in Chrome and Firefox ([Discourse meta](https://meta.discourse.org/t/iphone-video-mov-does-not-play-in-chrome-or-ff/163572)).

**In-browser recording.** Each engine writes a different container. Chrome defaults to WebM/Opus and has offered MP4 (H.264 + AAC) since **Chrome 126** ([blink-dev](https://groups.google.com/a/chromium.org/g/blink-dev/c/p1OMVj1FrMI)). Firefox writes Ogg/Opus ([Mozilla bug 1631143](https://bugzilla.mozilla.org/show_bug.cgi?id=1631143)). Safari writes MP4/AAC. Chrome's WebM recordings have historically lacked duration and seek cues, which breaks seeking until a remux fixes the file ([addpipe](https://blog.addpipe.com/duration-in-webm-videos-produced-by-chrome/); [Remotion](https://remotion.dev/docs/webcodecs/fix-mediarecorder-video)).

**Cost and uploads.** Transcoding is cheap. MediaConvert starts around **$0.0075 per output minute** ([AWS](https://aws.amazon.com/mediaconvert/pricing)). Voice notes are about 120 KB per minute, so they convert almost instantly. A single presigned PUT can carry 100 MB, since the single-request limit is 5 GB. Multipart uploads (5 MiB–5 GiB parts) add per-part retry, which matters on mobile networks. Either way, bucket CORS must expose `ETag` ([AWS S3 limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html); [AWS SDK CORS](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/cors.html)).

| Decision | Build rule |
|---|---|
| Is transcoding needed? | **Yes.** Keep the original and also serve `play.m4a` (AAC 64k mono, faststart) for all audio, and `play.mp4` (H.264 High, yuv420p, AAC, `+faststart`, max 1080p) for all video. If ffprobe shows H.264 + AAC already, remux with `-c copy` instead of re-encoding. Add a tonemap step for HDR iPhone clips. |
| Type detection | Sniff on the server from magic bytes or ffprobe (`OggS`+`OpusHead`), because browser `File.type` is unreliable for .opus and .mov. Serve `.opus` as `audio/ogg; codecs=opus`. The server decides the Content-Type that goes into the presigned URL. |
| Recorder | Feature-detect types in this order: `audio/mp4;codecs=mp4a.40.2` → `audio/mp4` → `audio/webm;codecs=opus` → `audio/ogg;codecs=opus`. Record with `start(1000)` chunks, cap recordings at 15 minutes, stop on `visibilitychange`, and upload `recorder.mimeType` with a client-measured duration. |
| Pipeline | Presigned multipart upload (via Uppy) for files over 20 MB, a single PUT below that → S3 event → SQS → Fargate worker (ffmpeg + BBC `audiowaveform` JSON peaks + poster JPEG) → status `processing → ready/failed`. While processing, play the original only if `canPlayType` succeeds. Abort incomplete multipart uploads after 7 days. |

## Better Auth is the only maintained fit for password plus magic link

**Lucia.** The author deprecated Lucia v3 on **20 October 2024**, with bug fixes ending in March 2025. Lucia is now a guide for writing your own session handling with the Oslo and Arctic libraries ([Lucia #1714](https://github.com/lucia-auth/lucia/discussions/1714)).

**Auth.js v5.** Since **September 2025** the Better Auth team has maintained Auth.js for "security and urgent issues" only and recommends Better Auth for new projects. v5 had no stable-release timeline ([next-auth #13252](https://github.com/nextauthjs/next-auth/discussions/13252)). Its Credentials provider does not hash passwords ([Auth.js docs](https://github.com/nextauthjs/next-auth/blob/main/docs/pages/getting-started/authentication/credentials.mdx)). It also, in practice, forces JWT sessions ([next-auth #8161](https://github.com/nextauthjs/next-auth/issues/8161)), which undermines revoking sessions when a user is deactivated or changes role.

**Better Auth features.** It ships the needed pieces as first-party features ([email-password](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/authentication/email-password.mdx); [magic link](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/magic-link.mdx); [admin](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/admin.mdx)):

- email and password with `disableSignUp` and a reset flow
- single-use magic links that expire after 5 minutes
- an admin plugin with `createUser`, `setRole`, and `banUser`, which revokes sessions
- database sessions that can be revoked

**Better Auth caveats.** Each needs a configuration decision:

- `revokeSessionsOnPasswordReset` defaults to false.
- The Prisma adapter needs `transaction: true` for that revocation to be atomic.
- `cookieCache` can keep revoked sessions alive on other devices ([session docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/session-management.mdx)).
- The rate limiter stores counts in memory by default, which the docs call unsuitable for serverless. It also trusts the spoofable `X-Forwarded-For` header unless configured otherwise ([rate-limit docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/rate-limit.mdx)).
- 2FA does not gate passwordless sign-in by default, so a magic link bypasses an admin's TOTP ([2FA docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/2fa.mdx)).

**Security record.** Releases ship several times a week (v1.7.27 on 20 November 2026). Advisories have been serious, including a **Critical** one in September 2026 in which an OAuth state value could be used as a magic link to sign in as another user ([advisories](https://github.com/better-auth/better-auth/security/advisories)). Most of the affected surface is OAuth, SSO and Electron, which this app won't enable. Even so, dependency hygiene is mandatory.

**Password hashing.** OWASP's floor for Argon2id is m=19 MiB, t=2, p=1 ([OWASP Password Storage](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Password_Storage_Cheat_Sheet.md)).

**30-day sessions.** These are a deliberate departure from OWASP, which suggests an absolute timeout of 4–8 hours and a new session ID after any privilege change ([OWASP Session Management](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Session_Management_Cheat_Sheet.md)).

| Decision | Build rule |
|---|---|
| Library | Better Auth 1.7.x, version pinned, with Renovate and the GHSA advisory feed watched. Enable only email-password, magic-link, admin, nextCookies and, later, 2FA. |
| Config | `emailAndPassword {enabled, disableSignUp: true}`, Argon2id (`@node-rs/argon2`, m=19456 KiB, t=2, p=1), `revokeSessionsOnPasswordReset: true`, `prismaAdapter(...,{transaction:true})`, `magicLink({disableSignUp:true, storeToken:"hashed"})` sent through Resend, and sessions `expiresIn` 30 d with `updateAge` 1 d and `cookieCache` off. |
| Invites | An admin calls `createUser`, then the app sends a hashed, single-use "set password" link valid for 72 h. Email counts as verified once the link is used. Build links from a fixed base URL and send `Referrer-Policy: no-referrer` on landing pages. |
| Revocation | Deactivating a user calls `banUser`. A role change calls `setRole` and then `revokeUserSessions`. Admin actions require a fresh session or 2FA step-up. Disable magic-link sign-in for users with 2FA. |
| Rate limits | `storage: "database"` and set `trustedProxies`/`ipAddressHeaders` to the real proxy. Every RSC and server action validates with `auth.api.getSession`. Middleware only does the optimistic cookie-presence check. |

## Cairo's calendar is data, not code

**Working week.** Egypt's weekend is **Friday–Saturday**, and the private sector mostly works Sunday–Thursday ([The National](https://www.thenationalnews.com/mena/2021/12/07/when-is-the-weekend-in-the-arab-world)). The legal maximum is 8 hours a day and 48 a week under Labour Law 14/2025, in force since 1 September 2025 ([Deloitte](https://www.deloitte.com/middle-east/en/services/tax/perspectives/egypt-new-labor-law-entering-into-effect.html)).

**Holidays.** Holiday dates are set by decree, Islamic dates follow the moon sighting, and mid-week holidays are routinely moved to Thursday to make a long weekend. Examples from 2026:

- Eid al-Fitr ran **Thu 19 – Mon 23 Mar** ([Egypt Today](https://www.egypttoday.com/Article/1/145578/Egypt-announces-five-day-paid-vacation-for-Eid-al-Fitr)).
- Arafat and Eid al-Adha ran **Tue 26 – Sun 31 May** ([Egypt Today](https://www.egypttoday.com/Article/1/147342/Minister-of-Labor-Eid-al-Adha-holiday-from-Tuesday-May)).
- June 30 was observed **Thu 2 Jul** ([Ahram](https://english.ahram.org.eg/News/571617.aspx)).
- The Prophet's Birthday moved to **Thu 27 Aug** ([Egypt Today](https://www.egypttoday.com/Article/4/148998/Egypt%E2%80%99s-Prime-Minister-Mostafa-Madbouly-Declares-Thursday-August-27-a)).

**2027.** Nothing had been announced as of mid-2026 ([Wego](https://blog.wego.com/eid-al-adha-egypt-holidays/)). The estimates are Eid al-Fitr about 9/10–12 Mar and Eid al-Adha about 15–19 May. Sources disagree by a day ([Calendarific 2027](https://calendarific.com/holidays/2027/EG)).

**Ramadan.** Shorter Ramadan hours are a strong custom, but no clear private-sector rule exists. One careers source cites a cut from 8 to 7 hours ([Wuzzuf](https://wuzzuf.net/careers/?p=2713)).

**DST.** Egypt brought DST back in 2023. tzdata encodes it as an open-ended rule: forward at 00:00 on the last Friday of April, back at 24:00 on the last Thursday of October ([tz africa](https://raw.githubusercontent.com/eggert/tz/main/africa)). In UTC terms, 2026 ran 2026-04-23T22:00Z to 2026-10-29T21:00Z, and 2027 runs **2027-04-29T22:00Z to 2027-10-28T21:00Z**. Both transitions fall in the night between Thursday and Friday, so a Sun–Thu working window never straddles one. Every business day is exactly 8 real hours, and only SLAs counted in calendar hours see a 23- or 25-hour day. Client clocks are not reliable: Microsoft reported that some Windows builds applied the 2026 start on the wrong Thursday ([Microsoft Tech Community](https://techcommunity.microsoft.com/blog/DSTBlog/interim-guidance-for-egypt-dst-changes-2026/4512409)).

| Decision | Build rule |
|---|---|
| Calendar model | One business calendar per contract: zone `Africa/Cairo`, working days Sun–Thu, hours **10:00–18:00** (editable). The `holiday` table holds `{date, name, scope: public/private/banks/christians, status: estimated/confirmed, source_url}`, with 2027 seeded as *estimated*. An admin confirms each date when its decree is published, often only days ahead. |
| Ramadan | A "season" record with its own start and end dates and hours, e.g. 10:00–16:00, set by an admin each year (2027 ≈ 8 Feb–8 Mar). |
| SLA math | Store UTC only. Compute on the server (Node with current ICU/tzdata) using `@date-fns/tz` `TZDate`, or Temporal with a polyfill. Walk the local dates, intersect each with the working window, subtract holidays and pause intervals, and sum business minutes. Recompute open items when a holiday is added or moved. Never use fixed +02/+03 offsets. |
| Ops | Treat a tzdata/Node upgrade as a runbook item, because Egypt has changed DST at short notice before. Show SLA due times in Cairo time with the zone label. |

## Credential guard: warn on patterns, never block

**Known token formats.** Gitleaks' default rules are high-precision regexes, for example:

- AWS `\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\b`
- Google API keys `AIza[\w-]{35}`
- JWTs beginning `ey…​.ey…`
- PEM `-----BEGIN … PRIVATE KEY-----`
- Shopify `shpat_`, GitHub `ghp_`, Stripe `sk_live_` and Slack `xoxb-`

Its generic rule gates keyword-plus-assignment matches at **Shannon entropy 3.5** behind a large stopword list ([gitleaks.toml](https://raw.githubusercontent.com/gitleaks/gitleaks/master/config/gitleaks.toml)).

**Keyword detection.** detect-secrets' KeywordDetector matches `password|passwd|pwd|secret|api_?key|…` and even Spanish *contraseña*. Its bare high-entropy thresholds are 4.5 for base64 and 3.0 for hex ([keyword.py](https://raw.githubusercontent.com/Yelp/detect-secrets/master/detect_secrets/plugins/keyword.py); [detect-secrets](https://github.com/Yelp/detect-secrets)).

**Limits of regex.** GitHub concluded that regex alone fails on human-chosen passwords and moved to LLM-based context detection ([GitHub blog](https://github.blog/engineering/platform-security/finding-leaked-passwords-with-ai-how-we-built-copilot-secret-scanning/)).

**Arabic.** No published detector covers Arabic or Franco-Arabic keywords. The lexicon below is a reasoned proposal from the research, not a validated standard. The same goes for Bosta: its API key has no documented prefix or format, so it can only be caught from context ([Bosta docs](https://docs.bosta.co/docs/how-to/get-your-api-key/)).

| Decision | Build rule |
|---|---|
| Where | Client-side, on paste and before submit, in descriptions, comments and the titles of uploaded text files. **Warn, don't block**: "This looks like a password. Share it through [vault/1Password link] instead." Options are *Remove it* or *Post anyway*. Log only the fact that a warning was shown, never the value. |
| High confidence | The gitleaks token regexes above, plus PEM blocks, plus a keyword with an assigned value. |
| Keywords (normalised) | First normalise the text: lowercase, strip tashkeel and tatweel, unify أ/إ/آ→ا, ة→ه, ى→ي. **English:** password, passwd, pwd, pass, passcode, pin, secret, token, api key, credentials, creds, username/user. **Arabic:** باسورد/الباسورد/باس، كلمة السر، كلمة المرور، الرقم السري، كود الدخول، يوزر/اليوزر نيم، اسم المستخدم. **Franco-Arabic:** el pass, el password, el user, pass bta3, kelmet el ser. |
| Assignment | The keyword is followed within about 3 tokens by `: = - ->`, "is", "huwa/howa", هو/هي or بتاعه, then a value of 6 or more non-space characters. A keyword alone on one line with the value on the next line also counts. Values typed by people, like "Ahmed@2024", have low entropy, so check for a mix of character types instead of applying an entropy threshold. |
| Medium | A line with an email or an Egyptian mobile number (`01[0125]\d{8}`), followed within 2 lines by a single 6–64-character token that mixes character types and is not a word or URL. Also Bosta/بوسطة + key/token/Authorization + a long value. |
| Suppress | Topic phrases: forgot/reset/change password, password field/page/flow, OTP, نسيت كلمة السر, تغيير الباسورد. A keyword with no value after it. Placeholder values like `****`, `<password>`, 123456 or "same". A value that is a URL or ticket ID. An OTP mentioned in a bug report is low confidence at most. |
| Tuning | Ship in log-only mode for 2 weeks on real tickets, measure precision, then turn on the warning UI. Re-tune the Arabic lexicon every quarter. |

## Conclusion

The six areas share one design principle: **the rules are configuration, and the evidence must be auditable**. Egyptian holidays move by decree days in advance. SLA pause semantics are contract terms. The Arabic credential lexicon must be tuned on real data. Better Auth's security posture depends on release-by-release vigilance. Each of these belongs in admin-editable data with provenance (source URL, estimated vs confirmed, version pin), not in code. Treat the "only Vendoor marks Done" rule the same way. It is a strength, because it turns ITIL's customer-confirmation step into an enforced rule, but it needs the "Closed – not verified" outlet and SLA pauses that Vendoor controls. Otherwise ABG's metrics are hostage to Vendoor's responsiveness. Agree that trade-off in the contract before writing code.

The biggest residual uncertainties:

- 2027 Islamic holiday dates and their Thursday moves, which cannot be known until the decrees.
- Whether iOS ≤ 18.3 devices still appear among Vendoor's users. If they don't, the AAC audio rendition becomes optional rather than required.
- The exact ITIL 4 wording, which came via secondary sources.
- The still-contested question of whether an auto-dismissing Undo toast fails 2.2.1.

None of these blocks the build. Each one needs a configuration knob rather than a hard-coded value.
