# Intake, workflow states, SLAs and customer-verified resolution (Linear, Plane, JSM, ITIL 4, ServiceNow, Zendesk, Freshdesk)

Method note: direct page fetches to linear.app and docs.plane.so were blocked by this session's network policy, so findings come from web-search summaries of the official pages. Where a source is a forum or a third-party blog, it is flagged. Research date: 2026-11-24.

## Linear Triage and Linear Asks / Customer Requests

### Takeaway
Linear's Triage inbox offers four actions: Accept, Decline, Mark as duplicate (merge) and Snooze. Merging a duplicate moves its attachments and customer requests to the canonical issue and closes the duplicate. Triage responsibility rotates through a configured member list. Asks is the intake channel (Slack, email, forms). Customer Requests is the record of demand, linked to issues.

### Cited Findings
- Actions and shortcuts: open an issue, then Accept (1), Decline (2), Mark as duplicate (3) or Snooze (H). Accepting can attach a comment and moves the issue to the team's default status. — [Linear Docs: Triage](https://linear.app/docs/triage). A third-party guide swaps the keys for 2 and 3; trust the official docs. ([ji4.io](https://www.ji4.io/guides/linear-triage))
- Duplicate or merge: you choose the canonical issue. "Taking this action will also move the new issue's attachments to the canonical issue, including customer requests and attachments." The duplicate then moves to a Canceled status type. — [Linear Docs: Triage](https://linear.app/docs/triage)
- A newer Linear changelog says duplicates now have a dedicated Duplicate status type. Customer requests, synced Slack threads and attachments move to the original issue, and linked Zendesk or Intercom tickets reopen when the original is completed. The changelog entry carries no date; a third-party blog says May 2026 (unverified). — [Linear changelog](https://linear.app/changelog/page/2)
- In 2021, merging started moving the duplicate's source attachments (for example a Zendesk ticket) to the canonical issue. Marking as duplicate works only from the duplicate's side. — [Linear changelog 2021-06-17](https://linear.app/changelog/2021-06-17-inbox-snooze-and-easier-issue-merge)
- Front integration: merging moves Front attachments and comments to the canonical issue and relinks the Front message so automations keep working. — [Linear Docs: Front](https://linear.app/docs/front)
- Marking as duplicate closes the issue, notes that it was a duplicate and creates a relation link between the two issues. — [Linear on X](https://x.com/linear/status/1296196629163208704)
- Triage responsibility is set in the team's Triage settings. With a fixed member list, automatic assignments rotate through eligible members. — [Linear Docs: Triage](https://linear.app/docs/triage) (via search summary)
- How Linear uses triage internally: user-reported bugs from Intercom or Slack go straight to Triage. Internal requests go there when no clear owner or priority exists. The triage owner accepts, declines or marks duplicates. — [Karri Saarinen (Linear CEO) on X](https://x.com/karrisaarinen/status/1712508391720104050)
- Snooze hides the issue until a chosen time, or until new activity arrives on it. — [ji4.io guide](https://www.ji4.io/guides/linear-triage) (third-party)
- Linear Asks turns Slack messages (slash command, 🎫 reaction, DM, @Linear Asks), emails and forms into issues in the destination team's Triage. The Slack thread or email thread syncs both ways with the issue's comments. Asks is aimed at internal requests "that would otherwise be scattered across chat, email, and ad hoc forms". — [Linear Docs: Asks](https://linear.app/docs/linear-asks)
- Customer Requests: "Capture feedback across any customer interaction... and turn it into a customer request linked to a Linear project or issue." — [Linear: Customer Requests](https://linear.app/customer-requests)
- External-customer limits: Asks web forms require identity-provider sign-in, and Slack intake requires the requester to be in your workspace. — [Hipporello](https://www.hipporello.com/blog/linear-asks-alternative-customer-requests) (vendor blog). The customer link follows the email of whoever sent the first message in the thread. — [Plain](https://www.plain.com/blog/support-platforms-linear-integration) (vendor blog)
- Plan gating: Asks and Triage Intelligence (AI duplicate suggestions, which a person still confirms) need the Business or Enterprise plan. — [Modem](https://modem.ai/guides/is-linear-enough-for-managing-customer-feedback) (third-party)

### Inferences
- Copy the four-action triage model, with keyboard shortcuts, for ABG reviewing new Vendoor requests.
- Merge-on-duplicate should move attachments, comments or links and the requester's "customer request" to the canonical item, and leave the duplicate in a terminal Duplicate state. That state should be distinct from Declined or Canceled, so reporting can tell them apart.
- When the canonical item is Done, notify every requester whose duplicate was merged into it. This mirrors Linear reopening linked Zendesk tickets.
- A decline needs a mandatory reason that the client can see.

### Gaps
- Whether subscribers or watchers of the duplicate carry over to the canonical issue was not confirmed in any source.
- The exact triage-responsibility options (notify vs auto-assign, on-call schedule integrations) could not be read directly because linear.app was blocked.

## Plane Intake

### Takeaway
Plane Intake has a Pending queue with Accept, Decline, Snooze and Mark as duplicate. Each action maps to an API status code. A duplicate is declined and points at an existing work item.

### Cited Findings
- Admin and Member roles can accept, decline, snooze or mark as duplicate. Items submitted by Guests start as Pending. — [Plane Docs: Intake](https://docs.plane.so/core-concepts/intake)
- Accept moves the item into the project's work items, in a state chosen at accept time. Snooze removes it from the pending queue; it can be un-snoozed from the menu. Mark as duplicate means picking an existing work item, after which the intake item is declined with a "Duplicate" label. Declined items appear under closed. — [Plane Docs: Intake](https://docs.plane.so/core-concepts/intake)
- API status codes: -2 Pending, -1 Rejected, 0 Snoozed, 1 Accepted, 2 Duplicate. A `duplicate_to` field takes the target work-item ID. — [Plane API: update intake work item](https://developers.plane.so/api-reference/intake-issue/update-intake-issue-detail)
- Known bug: the Open count did not refresh after accept, decline or duplicate. — [GitHub makeplane/plane #8473](https://github.com/makeplane/plane/issues/8473)

### Inferences
- A small enum (pending, accepted, declined, snoozed with a wake-at time, duplicate with a `duplicate_of` ID) is enough for the intake model.
- Pick the item's starting workflow state at accept time.

### Gaps
- Whether Plane carries attachments or comments over to the target on duplicate was not found.

## Jira Service Management (JSM)

### Takeaway
JSM separates customer-facing request types and the portal from the agent workflow. The SLA clock pauses through SLA "pause" conditions, typically on entering "Waiting for customer". The default IT template auto-closes Resolved requests after 3 business days. CSAT is sent when a request reaches a Done status category.

### Cited Findings
- SLA pause: add a pause condition on entering the "Waiting for Customer" status, and resume when it leaves. SLA conditions can also use comments, for example customer comments, to start, stop, pause or reset the timer. — [Atlassian Community](https://community.atlassian.com/forums/Jira-Service-Management/Pause-time-on-issues-while-waiting-for-customer/qaq-p/1441213); [Atlassian Community](https://community.atlassian.com/forums/Jira-Service-Management/Can-not-Pause-SLA-When-Customer-Commented/qaq-p/1911118)
- Risk: a ticket parked in Waiting for customer shows a healthy SLA forever. Pair the pause with automation that chases the customer, then escalates or closes after a set period. — [ResumeLens blog](https://www.resumelens.org/blog/jira/jira-service-management-sla) (third-party)
- Auto-close of Resolved requests: the ITSM template's SLA and automation "automatically close service requests three business days after an agent resolves them". It can be edited under Space settings > Automation. — [Atlassian: Auto-close resolved service requests](https://support.atlassian.com/jira-service-management-cloud/docs/auto-close-resolved-service-requests/)
- Pattern: an SLA tracks time after Resolved. On "SLA threshold breached", automation comments and transitions the request to Closed, for example after 3 days with no customer reply. — [Atlassian KB: Automate follow-ups](https://support.atlassian.com/jira/kb/implement-automated-issue-inactivity-follow-ups-and-closure-in-jira-service-management-cloud/); [Atlassian KB: follow-up process](https://support.atlassian.com/jira/kb/how-to-create-a-customer-ticket-follow-up-process-in-jira-service-management-using-automation/)
- Waiting-for-customer auto-close is a scheduled JQL rule, for example `status = "Waiting For Customer" AND updated < -3d`, followed by reminders and then close. Scope it so items waiting on approvers or third parties are excluded. — [Atlassian Community](https://community.atlassian.com/forums/Jira-Service-Management/Auto-Close-Tickets-with-a-Status-of-quot-Waiting-For-Customer/qaq-p/2355671); [Unitlane](https://unitlane.net/articles/jsm-customer-follow-up-reminders/) (third-party)
- CSAT: on by default for new spaces. It is "triggered when the status of a work item moves to a Done status category, even if the resolution field is not set" and is delivered in the request-resolved notification. — [Atlassian: About CSAT](https://support.atlassian.com/jira-service-management-cloud/docs/what-are-customer-satisfaction-surveys-csats/); [Atlassian: Collect CSAT](https://support.atlassian.com/jira-service-management-cloud/docs/collect-customer-satisfaction-csat-to-get-direct-feedback-on-your-teams/). A missing survey usually means CSAT is off or the "Request resolved" customer notification is disabled. — [Atlassian KB](https://support.atlassian.com/jira/kb/resolve-issues-with-csat-surveys-in-jira-service-management-cloud/)
- SLA calendars: clocks run 24/7 unless a calendar is attached to the goal. Holidays live in each SLA calendar (no site-wide holiday calendar) and can be imported from .ics. — [Deviniti](https://deviniti.com/blog/enterprise-software/jira-service-management-sla/); [Avaratak](https://www.avaratak.com/blog/jira-service-management-holiday-coverage); [simplify-software](https://simplify-software.org/blog/jira-holidays) (third-party)

### Inferences
- Use "Resolved" (vendor says it is done and deployed) followed by "Closed/Done" (client verified, or a timeout) as the JSM-style split. For Vendoor/ABG, the Done transition belongs to the client role only. A timeout auto-close is optional and should be a contract decision; if used, label it "Closed – not verified" rather than "Done".
- Make the "Waiting for client" status pause SLA clocks automatically. Add reminders (for example at day 3 and day 7) so paused items are not forgotten.
- Send CSAT when the client marks Done, not when the vendor resolves.

### Gaps
- The out-of-box JSM statuses and default SLA goals ("Time to first response", "Time to resolution") were not confirmed from the official page in this session, and neither was whether the request-type and portal configuration has changed in 2026.
- No official Atlassian source was found for the "Close unanswered requests" 14-day default; it appears only in a third-party write-up.

## ITIL 4: request vs incident vs problem vs change; resolved vs closed

### Takeaway
ITIL 4 draws these lines: an incident is an unplanned interruption, where the goal is to restore service. A problem is the cause or potential cause of one or more incidents. A service request is a predefined, routine user request. A change is a controlled addition, modification or removal. Common practice puts a user-confirmation step between Resolved and Closed, with auto-closure after a defined window (often 5 business days).

### Cited Findings
- Problem: "a cause, or potential cause, of one or more incidents". Repeated incidents justify a problem record, and a permanent fix usually requires a change. — [InvGate](https://blog.invgate.com/itil-ticket-types); [Virima](https://virima.com/blog/guide-to-itil-incident-and-problem-management) (secondary sources quoting ITIL 4)
- Service request: a formal user request for something to be provided, such as information, access or a standard item. Incident: an unplanned interruption, owned by the service desk, which aims to restore service, often with a workaround. — [InvGate](https://blog.invgate.com/itil-ticket-types); [customerexperience.io](https://customerexperience.io/blog/incident-vs-service-request-difference-examples)
- Resolved vs closed: "the customer is expected to confirm the resolution of the incident" before closure, with closure only afterwards. — [Advisera 20000Academy](https://advisera.com/20000academy/knowledgebase/incident-resolution-closure-waiting-fat-lady-sing/)
- In practice, a user-acceptance step sits between Resolved and Closed: the user accepts (then Closed) or rejects (then reopened). Without action, the item closes after about 5 business days; some vendors use 10 days. — [Medium: resolve/close/wait](https://medium.com/@carloshelpdesk/resolve-close-wait-for-customer-to-respond-42e9e8713f84); [ManageEngine](https://www.manageengine.com/products/service-desk/itsm/itil-best-practices.html)

### Inferences
- For a client↔vendor dev tracker, map the types like this: "Bug in production" is an incident (restore service, may need a hotfix). "Feature or change request" is a change or service request. "Root cause investigation" is a problem record, linked to its incidents.
- Require a root-cause field, or a link to a problem record, when closing incidents above a chosen severity.

### Gaps
- No direct access to the PeopleCert or Axelos ITIL 4 text. The definitions above come from secondary sources quoting it; verify exact wording against *ITIL 4: Create, Deliver and Support* or the practice guides before quoting in contracts.

## ServiceNow / Zendesk / Freshdesk: SLA mechanics

### Takeaway
All three tools compute SLAs against a schedule or business hours, and holidays count as non-working time. All three pause on a "waiting on customer" type state. First response counts only public agent replies (not internal or private notes) unless configured otherwise. ServiceNow's default workflow warns at 50%, 75% and 100% (breach). On reopen, the tools continue the existing clock rather than start a fresh one, while Zendesk turns post-closure replies into follow-up tickets.

### Cited Findings
**ServiceNow**
- Out-of-box incident SLA definitions pause only when the On-hold reason is "Awaiting caller". Practitioners argue that only caller-controlled states should pause. — [ServiceNow Community](https://www.servicenow.com/community/incident-management-forum/incident-on-hold-and-sla-pause-conditions/m-p/2871776); [ServiceNow Community](https://www.servicenow.com/community/servicenow-ai-platform-forum/clarification-about-on-hold-reasons-in-incident/m-p/2927373)
- With a schedule such as 9-5 Mon-Fri, 8 business hours is not 8 wall-clock hours, and the same SLA can breach or not depending on the schedule and time zone. Task SLA fields include business elapsed percentage. — [ServiceNow Community guide](https://www.servicenow.com/community/itsm-articles/what-is-an-sla-in-servicenow-a-beginner-s-guide-to-agreements/ta-p/3456098)
- Default SLA workflow raises the events sla.warning and sla.warning.breach at 50%, 75% and 100% of elapsed time. At 50%, the assignee (and the CI "Supported by" user) is notified; at 75% and 100%, the assignee and the assignee's manager. — [ServiceNow Community](https://www.servicenow.com/community/itsm-forum/in-default-sla-when-and-how-many-notifications-are-sent/m-p/496521); [ServiceNow Community](https://www.servicenow.com/community/developer-forum/send-50-and-75-sla-notifications/m-p/1442198)
- Unverified claim: percentage timers may use wall-clock rather than business time by default, so warnings can fire outside business hours. — [infracue](https://infracue.com/blog/servicenow-sla-breach) (third-party)
- Reset condition: the active Task SLA is completed and a new one attached, which recalculates breach time. Retroactive start backdates the start, for example to the incident's creation, and can cause instant breaches. — [ServiceNow Community](https://www.servicenow.com/community/developer-forum/understanding-retroactive-start-and-retroactive-pause-stop-in/m-p/3522242)
- Auto-close: the property `glide.ui.autoclose.time` sets the number of calendar days after which Resolved incidents close (0 disables it). An hourly scheduled job and a business rule do the closing. Business-day counting needs custom script. — [ServiceNow Community](https://www.servicenow.com/community/itsm-articles/incident-auto-close-configuration/ta-p/2302132); [ServiceNow Guru](https://servicenowguru.com/business-rules-scripting/calendar-based-incident-autoclose/)

**Zendesk**
- First reply time runs from creation to the first public agent comment (or autoreply). Internal notes do not count by default; advanced SLA settings can opt in. — [Zendesk: Defining SLA policies](https://support.zendesk.com/hc/en-us/articles/4408829459866-Defining-SLA-policies); [Zendesk: Advanced SLA settings](https://support.zendesk.com/hc/en-us/articles/7412192349466-Customizing-your-SLAs-with-advanced-settings)
- Pause behaviour by metric:
  - Requester wait time pauses on Pending.
  - Agent work time pauses on Pending and On-hold.
  - Pausable update pauses on Pending.
  - First reply, next reply, periodic update and total resolution do not pause.
  - Periodic update resets after each public agent comment.

  — [Zendesk: About SLA policies](https://support.zendesk.com/hc/en-us/articles/5600997516058-About-SLA-policies-and-how-they-work); [Zendesk: Defining SLA policies](https://support.zendesk.com/hc/en-us/articles/4408829459866-Defining-SLA-policies)
- Business vs calendar hours can be chosen per target. Holidays count as outside business hours (full-day only). — [Zendesk: Defining SLA policies](https://support.zendesk.com/hc/en-us/articles/4408829459866-Defining-SLA-policies); [eesel](https://www.eesel.ai/blog/zendesk-holiday-schedule) (third-party, for holidays)
- Lifecycle: Solved tickets reopen when the requester replies (they return to Open). By default an automation closes Solved tickets 4 days after solving; agents cannot set Closed manually. Closed tickets cannot be reopened, so the requester creates a follow-up ticket that references the original. — [Zendesk: Ticket lifecycle](https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses); [Zendesk: Updating and solving tickets](https://support.zendesk.com/hc/en-us/articles/4408832151834-Updating-and-solving-tickets). A hard 28-day maximum in Solved is reported by third parties but was not confirmed. ([eesel](https://www.eesel.ai/blog/zendesk-ticket-views-solved-reopen))

**Freshdesk**
- First-response, every-response and resolution targets are set per priority, against business hours or calendar (24x7) hours. Business hours map to groups; calendar hours include holidays. Escalations can be set for first-response, next-response and resolution violations. — [Freshdesk: Understanding SLA policies](https://support.freshdesk.com/support/solutions/articles/37626-understanding-sla-policies); [Freshdesk: Business vs calendar hours](https://support.freshdesk.com/support/solutions/articles/37627-what-are-business-hours-and-calendar-hours-)
- First response counts an agent reply or public note, not a private note or automated notification. — [Macha](https://www.getmacha.com/blog/freshdesk-sla-policies-explained) (third-party, citing the Freshdesk FAQ)
- The SLA timer can be switched off per status (Pending, or a custom "Waiting on customer" or "Waiting on third party" status). A customer reply moves the ticket back to Open. — [Freshdesk: Customizing ticket statuses](https://support.freshdesk.com/en/support/articles/37600-customizing-your-ticket-statuses)
- After a pause the due-by time is pushed out by the paused duration. Moving back into a status with the timer on (including a reopen from Resolved) resumes the clock and affects response and resolution time; there is no clean reset. — [Freshdesk: Reopening and resolution time](https://support.freshdesk.com/support/solutions/articles/225357-will-the-reopening-of-a-resolved-ticket-count-against-average-resolution-time-); [Freshworks Community](https://community.freshworks.com/ideas/every-customer-reply-resets-sla-timer-12684). One user reports inconsistent numbers, so test it.

### Inferences
- Use one canonical business calendar per contract (time zone, working days, full-day holidays) and compute SLA clocks in business minutes.
- First response means the first ABG message visible to the client. Internal notes, auto-acknowledgements and status-only changes do not count.
- Pause SLA clocks only in client-controlled states ("Waiting for client", "Awaiting client verification"), not in vendor-internal holds such as "blocked by third party". This matches the ServiceNow practitioner view.
- Warn at 50% (assignee) and 75% (assignee and lead), and mark breach at 100%, all in business time.
- On reopen, continue the original resolution clock (Freshdesk-style). Count the reopen and keep the original breach state. If the client reports a regression after Done, open a new linked item (Zendesk follow-up pattern) rather than reopening.

### Gaps
- Official ServiceNow documentation (docs.servicenow.com) was not reachable through search results, so the 50%/75% defaults and reopen behaviour rest on community posts.
- No official statement on how Zendesk SLA targets behave after a reopen was found.

## Reopen handling and reopen-rate metrics

### Takeaway
Reopen rate is reopened tickets ÷ resolved tickets × 100, ideally counted within a fixed reopen window. Sources call under 5% healthy and under 10% acceptable. Read it alongside CSAT, because a low rate can hide customers who simply open new tickets instead.

### Cited Findings
- Formula: reopened ÷ total resolved × 100. Some count only reopens within a defined "reopen window". — [SherpaDesk](https://www.sherpadesk.com/blog/help-desk-metrics); [MetricHQ](https://www.metrichq.org/support/ticket-reopen-rate/)
- Benchmarks: under 5% healthy ([Giva](https://www.givainc.com/blog/ticket-reopen-rate-causes/), [DeskHero](https://www.deskhero.com/articles/helpdesk-reporting-metrics)). Under 10% good and under 5% exceptional ([KPI Depot](https://kpidepot.com/kpi/ticket-reopen-rate)). Endsight data cited as 5.4% average ([BoldDesk](https://www.bolddesk.com/blogs/help-desk-metrics)) and 3.1% ([Suptask](https://www.suptask.com/blog/industry-help-desk-metrics)); the two figures conflict. Others say to set a baseline from your own data. ([IPSIP](https://www.ipsip.vn/en/post/it-helpdesk-kpis-fcr-mttr-csat-backlog-reopen-rate))
- A high rate points to premature closure, weak troubleshooting or unclear communication. Pair it with CSAT. — [Giva](https://www.givainc.com/blog/ticket-reopen-rate-causes/); [Suptask](https://www.suptask.com/blog/industry-help-desk-metrics)
- Freshdesk notes that reopening a Resolved ticket affects resolution-time metrics. — [Freshdesk](https://support.freshdesk.com/support/solutions/articles/225357-will-the-reopening-of-a-resolved-ticket-count-against-average-resolution-time-)

### Inferences
- In the Vendoor/ABG model, a "reopen" is the client rejecting verification (Awaiting verification back to In progress), with a required reason. Track two rates:
  - verification rejection rate: rejections ÷ items submitted for verification
  - post-Done regression rate: follow-up items linked to a Done item within N days, for example 14 or 30
- Store a reopen_count per item and show it in vendor scorecards.

### Gaps
- No authoritative standards body (ITIL or HDI) benchmark for reopen rate was found; all figures are from vendor or consultancy blogs.
