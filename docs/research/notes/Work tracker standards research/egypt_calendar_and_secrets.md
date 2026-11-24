# Egypt working calendar for SLA math and detecting credentials in free text

Research date: 2026-11-24. Network note: timeanddate.com, officeholidays.com, presidency.eg and techcommunity.microsoft.com could not be fetched from this session (they are blocked by the network allowlist). Facts from them come from search-result snippets only. raw.githubusercontent.com could be fetched, so the tzdata, gitleaks and detect-secrets facts were checked against the source files.

## A1. Working week and typical hours

### Takeaway
The private sector usually works Sunday to Thursday, with Friday and Saturday as the weekend. The legal cap is 8 hours a day and 48 hours a week. Labour Law No. 14 of 2025 has been in force since 1 Sept 2025. A default of 10:00–18:00 Sun–Thu in Africa/Cairo is reasonable, but it should be configurable.

### Cited Findings
- Egypt's weekend is Friday and Saturday. Most private-sector employees work five days, usually Sunday to Thursday. Some companies work a half day on Thursday. — [The National](https://www.thenationalnews.com/mena/2021/12/07/when-is-the-weekend-in-the-arab-world); [Replicon](https://www.replicon.com/?p=126809)
- Normal hours may not exceed 8 a day or 48 a week. — [Wuzzuf guide to Law 14/2025 hours](https://wuzzuf.net/careers/?p=2713); [Pebl](https://help.hellopebl.com/en-US/pebl/article/dlOVuD55-working-hours-and-overtime-in-egypt)
- New Labour Law No. 14 of 2025 took effect 1 Sept 2025. — [Deloitte](https://www.deloitte.com/middle-east/en/services/tax/perspectives/egypt-new-labor-law-entering-into-effect.html); [EY](https://www.ey.com/en_gl/technical/tax-alerts/egypt-enacts-new-labor-law-with-changes-affecting-employers-beginning-1-september-2025)
- Official paid holidays for private-sector workers are set by Ministerial Decree No. 294 of 2025. Each year the Labour Minister announces the actual dates under Art. 129 of Law 14/2025, usually matching the PM's public-sector decree. — [Al Tamimi](https://www.tamimi.com/news/ministerial-decree-setting-official-paid-holidays-for-workers-no-294-of-2025); [Egypt Today](https://www.egypttoday.com/Article/1/147342/Minister-of-Labor-Eid-al-Adha-holiday-from-Tuesday-May)
- In March 2026 the government discussed remote-work days and early closures to save energy. — [Enterprise](https://enterpriseam.com/egypt/2026/03/25/as-the-govt-mulls-remote-work-days-could-we-potentially-see-a-four-day-workweek/); [Financial Express](https://today.thefinancialexpress.com.bd/print/egypt-orders-early-closures-remote-work-1774802246)

### Inferences
- I found no source for "typical tech-company hours". Cairo tech firms commonly work 9:00–17:00 or 10:00–18:00 Sun–Thu, many with hybrid or flexible time. Make the working days and hours a per-workspace setting, defaulting to Sun–Thu, 10:00–18:00.
- Allow a per-date holiday override list. Egyptian holiday dates are announced by decree, often only days ahead, so they cannot be fully computed in advance.

### Gaps
- No authoritative survey of tech-sector office hours in Egypt.

## A2. Public holidays 2026 (actual) and 2027 (provisional)

### Takeaway
Since about 2020, holidays that fall mid-week are usually moved to the following Thursday, giving a 3-day weekend. Islamic holidays are confirmed only around a week before, after the moon sighting. 2026 dates below come from official announcements where noted. All 2027 Islamic dates are estimates. Store holidays as data that an admin can edit, not as code.

### Cited Findings: 2026 (observed days off)
| Holiday | Nominal date | Observed day(s) off | Source |
|---|---|---|---|
| Coptic Christmas | Wed 7 Jan | 7 Jan (no source found for a move) | [Calendarific](https://calendarific.com/holidays/2026/EG) |
| Jan 25 Revolution / Police Day | Sun 25 Jan | 25 Jan | [Calendarific](https://calendarific.com/holidays/2026/EG) |
| Eid al-Fitr | 1 Shawwal ≈ Fri 20 Mar | **Thu 19 – Mon 23 Mar** (5 days, public and private sectors). Banks: 19–24 Mar | [Egypt Today (private sector)](https://www.egypttoday.com/Article/1/145578/Egypt-announces-five-day-paid-vacation-for-Eid-al-Fitr); [Ahram](https://english.ahram.org.eg/News/563890.aspx); [Egypt Independent (CBE)](https://www.egyptindependent.com/cbe-announces-extended-bank-holiday-for-eid-al-fitr-2026/) |
| Sham El-Nessim | Mon 13 Apr (day after Orthodox Easter, 12 Apr) | 13 Apr | Computed from the Orthodox Easter algorithm. Not checked against a 2026 announcement |
| Sinai Liberation Day | Sat 25 Apr | Falls on the weekend | [Calendarific](https://calendarific.com/holidays/2026/EG) |
| Labour Day | Fri 1 May | Reported moved to Thu 7 May | [visaboards (secondary)](https://visaboards.com/public-holidays-in-egypt) |
| Arafat Day + Eid al-Adha | Tue 26 May + Wed 27 May | **Tue 26 – Sun 31 May** (6 days; PM Decree 1516/2026, private sector the same) | [Egypt Today](https://www.egypttoday.com/Article/1/147342/Minister-of-Labor-Eid-al-Adha-holiday-from-Tuesday-May); [cairo.gov.eg](https://www.cairo.gov.eg/en/news/2026/may/19-2026/d1c50de4c7d743e9b9bcd7f5971a4e6b); [Arab Finance](https://arabfinance.com/en/news/newdetails/egypt-declares-six-day-holiday-for-private-sector-on-eid-el-adha) |
| Islamic New Year 1448 | ≈ Tue 16 / Wed 17 Jun | Thu 18 Jun (Presidency list, via search snippet) | [presidency.eg](https://www.presidency.eg/en/%D9%85%D8%B5%D8%B1/%D8%A7%D9%84%D8%B9%D8%B7%D9%84%D8%A7%D8%AA-%D8%A7%D9%84%D8%B1%D8%B3%D9%85%D9%8A%D8%A9/) |
| June 30 Revolution | Tue 30 Jun | **Thu 2 Jul** | [Ahram](https://english.ahram.org.eg/News/571617.aspx) |
| July 23 Revolution | Thu 23 Jul | 23 Jul | [Ahram](https://english.ahram.org.eg/News/573142.aspx) |
| Prophet's Birthday (Mawlid) | Tue 25 Aug (12 Rabi' I 1448) | **Thu 27 Aug** (moved by the PM; Labour Ministry applied it to the private sector) | [Egypt Today (PM)](https://www.egypttoday.com/Article/4/148998/Egypt%E2%80%99s-Prime-Minister-Mostafa-Madbouly-Declares-Thursday-August-27-a); [Egypt Today (private)](https://www.egypttoday.com/Article/1/149004/Ministry-of-Labor-August-27-official-paid-holiday-for-private) |
| Armed Forces Day | Tue 6 Oct | Reported moved to Thu 8 Oct | [visaboards (secondary)](https://visaboards.com/public-holidays-in-egypt) |

- Coptic Christian employees get extra religious days: Coptic Christmas, Coptic Easter and related days. Some announcements give them separate private-sector days off. — [Egypt Independent](https://www.egyptindependent.com/five-day-holiday-starts-on-thursday-for-coptic-christian-employees-in-private-sector)
- The holiday is moved to Thursday by a cabinet decree each time, not by a fixed rule. Officeholidays notes that most mid-week holidays have moved to Thursday since 2020. — [Officeholidays (search snippet)](https://www.officeholidays.com/guide/egypt)
- Timeanddate pages conflict over whether Eid al-Fitr 2026 is a public holiday. The official decrees settle it. — [timeanddate](https://www.timeanddate.com/holidays/egypt/eid-al-fitr-4) vs [Egypt Today](https://www.egypttoday.com/Article/1/145578/Egypt-announces-five-day-paid-vacation-for-Eid-al-Fitr)

### Cited Findings: 2027 (provisional; nothing officially announced as of Jun 2026)
| Holiday | Nominal date | Note |
|---|---|---|
| Coptic Christmas | Thu 7 Jan | Fixed |
| Jan 25 Revolution | Mon 25 Jan | Likely moved to Thu |
| Ramadan begins | ≈ 8 Feb | Estimate |
| Eid al-Fitr | ≈ Tue 9 / Wed 10 – 12 Mar | Sources differ: [Calendarific](https://calendarific.com/holidays/2027/EG) says 10 Mar, publicholidays.me says 9 Mar |
| Sinai Liberation | Sun 25 Apr | Likely moved to Thu |
| Labour Day | Sat 1 May | Weekend |
| Sham El-Nessim | Mon 3 May | Orthodox Easter is 2 May 2027 (computed) |
| Arafat + Eid al-Adha | ≈ Sat 15 May; Eid ≈ 16–19 May | Estimate ([Calendarific](https://calendarific.com/holidays/2027/EG)) |
| Islamic New Year 1449 | ≈ 6–7 Jun | Estimate |
| June 30 Revolution | Wed 30 Jun | Likely moved to Thu 1 Jul |
| July 23 Revolution | Fri 23 Jul | Weekend |
| Prophet's Birthday | ≈ 14–15 Aug | Estimate |
| Armed Forces Day | Wed 6 Oct | Calendarific shows a substitute day on Thu 7 Oct |
- No official 2027 Eid al-Adha announcement as of the 10 Jun 2026 update. — [Wego](https://blog.wego.com/eid-al-adha-egypt-holidays/)

### Inferences
- Model holidays as `{date, name, scope: public|private|banks|christians, source, status: estimated|confirmed}`. Seed estimates for the next year and let an admin confirm or shift them once the decree is out. Banks often get an extra day beyond the private sector (Eid al-Fitr 2026).
- Weekdays for 2026 and 2027 were checked in code.

### Gaps
- No primary source for whether Labour Day and Armed Forces Day 2026 actually moved (secondary site only). No 2026 Sham El-Nessim announcement fetched. No primary source on 2027 Thursday moves (these are decided case by case).

## A3. DST: rules since 2023, tzdata encoding and JS implications

### Takeaway
Egypt brought DST back in 2023. Clocks go forward at 00:00 on the last Friday of April and back at 24:00 (midnight) at the end of the last Thursday of October. tzdata encodes this as an open-ended rule (`2023 max`). Both changes happen at night on a Thu/Fri boundary, so a 10:00–18:00 Sun–Thu window is never cut. Still, do all arithmetic with IANA zone `Africa/Cairo`, never with fixed offsets.

### Cited Findings
- tzdata `africa` file (current main), verbatim:
  ```
  Rule  Egypt 2023 max - Apr lastFri  0:00 1:00 S
  Rule  Egypt 2023 max - Oct lastThu 24:00 0    -
  Zone  Africa/Cairo 2:05:09 - LMT 1900 Oct
                     2:00 Egypt EE%sT
  ```
  The commentary cites the cabinet announcement of 2023-03-01 ("from last Friday of April to last Thursday of October"). Eggert assumed transitions at 00:00 and 24:00. — [eggert/tz africa](https://raw.githubusercontent.com/eggert/tz/main/africa)
- 2026: DST starts Fri 24 Apr 00:00 (→ +03 EEST) and ends Fri 30 Oct 00:00 (= Thu 29 Oct 24:00, → +02 EET). — [timeanddate](https://www.timeanddate.com/time/change/egypt?year=2026). Confirmed with Node 22 (ICU tz 2026e): offset changes at 2026-04-23T22:00Z and 2026-10-29T21:00Z.
- 2027 (same rule, computed with Node/ICU): starts Fri 30 Apr 00:00 (2027-04-29T22:00Z), ends Thu 28 Oct 24:00 (2027-10-28T21:00Z).
- Microsoft reported that some Windows versions applied Egypt's 2026 DST start on the last *Thursday* of April (30 Apr) instead of 24 Apr, and issued interim guidance. Client OS clocks can be wrong. — [Microsoft Tech Community](https://techcommunity.microsoft.com/blog/DSTBlog/interim-guidance-for-egypt-dst-changes-2026/4512409) (search snippet only)
- time.now lists the times as "23 Apr 23:59" and "29 Oct". This looks like a different notation for the same instants. — [time.now](https://time.now/time/change/egypt/)
- `@date-fns/tz` gives `TZDate`, which does calculations in a named IANA zone. The older `date-fns-tz` uses Intl, so no tz data is bundled. — [@date-fns/tz README](https://app.unpkg.com/@date-fns/tz@1.3.1/files/README.md); [date-fns-tz npm](https://www.npmjs.com/package/date-fns-tz)
- Temporal (`Temporal.ZonedDateTime`) is reported as Stage 4 / ES2026, shipping in Firefox 139+, Chromium 144+ and Node 26+, but not Safari, so a polyfill is still needed. This is a secondary source. Node 22 here has no `Temporal` global. — [OpenReplay](https://blog.openreplay.com/javascript-time-zones/)

### Inferences
- SLA algorithm: store instants as UTC. To add N business hours, walk day by day in `Africa/Cairo` wall time. For each local date that is a working day and not a holiday, build the instants for 10:00 and 18:00 local with the zone (TZDate / `Temporal.PlainDateTime.toZonedDateTime('Africa/Cairo')`), clip them to the interval, and add up the durations. Because the transitions are at midnight Thu→Fri, every working day is exactly 8 real hours. Only "calendar-hours" SLAs that cross the change night are affected, as 23- or 25-hour days.
- Ambiguous hour: 23:00–24:00 local on the last Thursday of October happens twice. Skipped hour: 00:00–01:00 local on the last Friday of April does not exist. Use `disambiguation: 'compatible'` (Temporal), or rely on TZDate's default, when parsing user-entered local times in those windows.
- Do the calculation on the server (Node with up-to-date ICU), or ship a recent tzdata, rather than trust client clocks, given the Windows issue. Egypt has changed DST policy at short notice many times (2014–2016, then 2023). Plan to update Node/ICU tzdata when it changes again.

### Gaps
- Could not fetch the IANA NEWS file or the Microsoft post in full. No 2026 Egyptian change to the rule was found; the rule still reads `2023 max`.

## A4. Ramadan reduced working hours

### Takeaway
Shorter Ramadan hours are a strong custom in Egypt, but the private sector has no clear statutory rule. Government and banks get official reduced schedules each year. Model Ramadan as a configurable "calendar season" with its own hours, such as 10:00–15:00 or 7 hours instead of 8.

### Cited Findings
- Law 14/2025 does not explicitly set Ramadan hours. Common practice is a one-hour cut, from 8 to 7 hours, for Muslim employees. — [Wuzzuf](https://wuzzuf.net/careers/?p=2713) (careers site, not official)
- A news item reports reduced private-sector hours in Ramadan (details not fetched). — [CairoScene](https://cairoscene.com/Buzz/Reduced-Working-Hours-for-Private-Sector-Employees-During-Ramadan)
- The CBE announces Ramadan banking hours each year, including for 2026. — [Egypt Independent](https://www.egyptindependent.com/here-are-the-bank-working-hours-for-ramadan-2026/)
- In 2026 shops and cafés could stay open until 2:00 AM during Ramadan and Eid (closing hours, not working hours). — [Egyptian Streets](https://egyptianstreets.com/2026/02/16/shops-and-cafes-to-stay-open-until-2am-throughout-ramadan-and-eid-in-egypt/)
- For comparison, the UAE cuts private-sector hours by 2 hours a day, and Oman sets 6 hours a day / 30 a week for Muslim staff. — [MoHRE](https://mohre.gov.ae/en/media-center/news/12/2/2026/reduction-of-working-hours-for-private-sector-employees-by-two-hours-daily-during-the-holy-month-of); [Gulf News](https://gulfnews.com/world/gulf/oman/ramadan-2026-oman-announces-reduced-working-hours-for-public-and-private-sectors-1.500438641)

### Inferences
- Ramadan 2026 was about 18/19 Feb to 18 Mar, and Ramadan 2027 is about 8 Feb to 8 Mar (astronomical estimates; no confirmed source fetched). Let admins set the season's start and end dates and hours.

### Gaps
- No Ministry of Labour circular on private-sector Ramadan hours found. CBE Ramadan 2026 hours not captured.

## B. Detecting passwords and credentials in free text (warn, don't block)

### Takeaway
Combine three signals. (1) High-precision token formats: AWS, Google, JWT, PEM private keys, Shopify, GitHub, Stripe, Slack. (2) Keyword plus assignment patterns, gated by an entropy check and stopwords, as in gitleaks generic-api-key and detect-secrets KeywordDetector. (3) Context patterns for chat text, such as an Arabic or English credential keyword followed by a value, or an email line followed by a password-like line. Score confidence and show a soft warning. Suppress the warning when the keyword is used as a topic ("reset password", "OTP") with no value attached.

### Cited Findings: gitleaks (default `config/gitleaks.toml`)
- `generic-api-key`: regex `(?i)[\w.-]{0,50}?(?:access|auth|(?-i:[Aa]pi|API)|credential|creds|key|passw(?:or)?d|secret|token)(?:[ \t\w.-]{0,20})…` followed by an assignment operator and a value. **entropy = 3.5**. Keywords: access, api, auth, key, credential, creds, passwd, password, secret, token. A large stopword list (hundreds of entries, for example "000000", "aaaaaa", "about", "admin", "password", "token") suppresses placeholder values. — [gitleaks.toml](https://raw.githubusercontent.com/gitleaks/gitleaks/master/config/gitleaks.toml)
- Specific rules, verbatim from the same file:
  - AWS: `\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\b` (entropy 3)
  - Google/GCP API key: `\b(AIza[\w-]{35})(?:[\x60'"\s;]|\\[nr]|$)` (entropy 4)
  - JWT: `\b(ey[a-zA-Z0-9]{17,}\.ey[a-zA-Z0-9\/\\_-]{17,}\.(?:[a-zA-Z0-9\/\\_-]{10,}={0,2})?)…` (entropy 3)
  - Private key: `(?i)-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----[\s\S-]{64,}?KEY(?: BLOCK)?-----`
  - Shopify: `shpat_|shpca_|shppa_|shpss_` + `[a-fA-F0-9]{32}`
  - GitHub PAT: `ghp_[0-9a-zA-Z]{36}`; Slack bot: `xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*`; Stripe: `\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})`
- Older gitleaks generic rule used a quoted 8–64-character value with entropy 3.7. — [Debian gitleaks 8.16 testdata](https://sources.debian.org/src/gitleaks/8.16.0-1/testdata/config/generic.toml)

### Cited Findings: detect-secrets (Yelp)
- KeywordDetector DENYLIST, verbatim: `api_?key, auth_?key, service_?key, account_?key, db_?key, database_?key, priv_?key, private_?key, client_?key, db_?pass, database_?pass, key_?pass, password, passwd, pwd, secret, contraseña, contrasena`. It matches colon (`key: value`), `=`/`==`/`!=`, `=>`, `:=`, and reverse comparison forms. For most code file types it requires quoted values to cut false positives. The value must start with word characters. — [keyword.py](https://raw.githubusercontent.com/Yelp/detect-secrets/master/detect_secrets/plugins/keyword.py)
- High-entropy defaults: Base64 limit **4.5**, Hex limit **3.0** (Shannon bits per char, range 0–8). Lowering them catches more and gives more false positives. — [detect-secrets README](https://github.com/Yelp/detect-secrets)

### Cited Findings: GitHub secret scanning
- Provider patterns are regexes per vendor. "Non-provider patterns" were renamed "Generic patterns" (for example private keys and connection strings; no validity checks). "Copilot secret scanning" was renamed "AI-detected secrets" (July 2026). — [GitHub changelog 2026-07-10](https://github.blog/changelog/2026-07-10-clearer-names-for-secret-scanning-detector-types); [Supported patterns](https://docs.github.com/en/code-security/reference/secret-security/supported-secret-scanning-patterns)
- GitHub found that regex alone fails for generic passwords and now uses an LLM on context (GA Oct 2024). It deliberately skips obviously fake or test passwords and low-entropy passwords. It scans git content only, not issues. — [GitHub blog](https://github.blog/engineering/platform-security/finding-leaked-passwords-with-ai-how-we-built-copilot-secret-scanning/); [Copilot secret scanning docs](https://docs.github.com/en/code-security/secret-scanning/copilot-secret-scanning); [changelog GA](https://github.blog/changelog/2024-10-21-copilot-secret-scanning-for-generic-passwords-is-generally-available/)

### Cited Findings: Bosta
- The Bosta API key is sent raw in the `Authorization` header (no `Bearer`) to `app.bosta.co/api/v2`. The key is generated in Dashboard → Settings → API Integration. No public key format or prefix is documented. — [Bosta docs](https://docs.bosta.co/docs/how-to/get-your-api-key/); [bosta-php](https://github.com/bostaapp/bosta-php)

### Inferences (design recommendations; not sourced)
- **Keyword lexicon**, matched after normalisation (lowercase; strip Arabic diacritics and tatweel; unify أ/إ/آ→ا, ة→ه, ى→ي):
  - English: password, passwd, pwd, pass, passcode, pin, secret, token, api key, apikey, access key, credentials, creds, login, username, user.
  - Arabic: باسورد / الباسورد / باس, كلمة السر, كلمة المرور, الرقم السري / رقم سري, كود الدخول, يوزر / اليوزر / يوزر نيم / اليوزر نيم, اسم المستخدم.
  - Franco-Arabic: "el pass", "el password", "el user", "el username", "pass bta3", "el pass huwa / howa", "kelmet el ser", "kalmet el sir".
- **Assignment detection**: keyword followed within about 3 tokens by `:`, `=`, `-`, `->`, "is", "huwa/howa", "هو", "هي", "بتاعه/بتاعها", then a candidate value of 6 or more non-space characters on the same line. Alternatively, the keyword alone on a line with the value on the next line.
- **Email + password pair**: a line with an email or phone number (Egypt mobile `01[0125]\d{8}`), followed within 1–2 lines by a single "word" of 6–64 characters with no spaces, mixing character classes (letters with digits or symbols), that is not a dictionary word or URL. Mark as medium confidence; high if a keyword is present.
- **Entropy**: use gitleaks' 3.5 bits/char for keyword-attached values. For bare strings with no keyword, require ≥ 4.5 (base64-like) or ≥ 3.0 (hex), and length ≥ 20, as in detect-secrets. Human passwords like "Ahmed@2024" have low entropy, so with a keyword present, rely on character-class mix instead of an entropy threshold.
- **False-positive suppression**: lower the score or suppress when (a) the keyword is part of a feature or topic phrase, such as "forgot password", "reset password", "password reset", "change password", "password field", "OTP", "نسيت كلمة السر", "تغيير الباسورد", "reset el pass"; (b) no value follows the keyword (end of sentence, or followed by a verb or "page", "screen", "flow", "button", "email", "link"); (c) the value is a stopword or placeholder (`****`, `xxx`, `<password>`, `123456`, "your_password", "same", "عادي"); (d) the value is a URL, ticket ID, or the word itself. An OTP bug report such as "OTP 482913 didn't arrive" should be low confidence at most: it is a one-time code, likely expired.
- **Confidence tiers**: High = known token format (AWS/AIza/JWT/PEM/shpat_/ghp_/sk_live_/xoxb-) or keyword + assigned value. Medium = email/phone + password-like next line. Low = high-entropy string with no keyword. Warn on High/Medium only; never block. Run it client-side so the secret never leaves the browser before the user confirms.
- **Bosta**: with no documented format, detect it by context only ("bosta" / "بوسطة" + "api key" / "token" / "Authorization:" + long value).

### Gaps
- No published detector exists for Arabic or Franco-Arabic credential keywords. The lexicon above is a proposal and should be tuned on real tickets. Bosta key length and character set are undocumented. TruffleHog's detector specifics were not researched in depth (it uses the same regex-plus-keyword approach, plus live verification against the provider).
