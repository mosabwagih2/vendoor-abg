# Accessibility requirements and patterns for a data-dense work tracker (WCAG 2.2 AA, ARIA APG)

> Method note: w3.org, docs.dndkit.com and atlassian.design could not be fetched directly in this session (host blocked by the session network policy). Findings below come from web-search result extracts of those pages and of secondary sources. Items marked **[prior knowledge, not re-verified]** are well-established facts from W3C documents I could not re-open this session. Verify them against the linked canonical page before quoting normatively.

## WCAG 2.2 AA success criteria most relevant to the tracker

### Takeaway
The WCAG 2.2 additions that matter most here are 2.5.7 Dragging Movements (the kanban needs a non-drag, single-pointer way to move cards, such as a "Move to..." menu), 2.5.8 Target Size Minimum (24x24 CSS px or enough spacing, which is tight for dense rows and 375 px layouts), and 2.4.11 Focus Not Obscured (sticky headers, the peek panel and toasts must not fully cover the focused item). 4.1.3 Status Messages governs the toasts. 3.3.8 Accessible Authentication is satisfied by magic links and by password fields that allow paste and autofill.

### Cited Findings
**2.5.7 Dragging Movements (AA)**
- Any function operated by dragging must also be operable with a single pointer without dragging. Only the start and end points matter, so two separate clicks or taps can stand in for a drag. — [W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
- Keyboard support is evaluated separately: meeting 2.1.1 Keyboard does **not** satisfy 2.5.7. A dnd-kit keyboard sensor alone is not enough. — [W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
- The Understanding examples include a task board where a pop-up "move" menu is the alternative to dragging. — [W3C Understanding 2.5.7 (via search extract)](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
- Technique G219 describes up/down arrow buttons for reordering a list as a non-drag option. — [W3C G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)
- A text input such as a status field is also an acceptable alternative. — [W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)

**2.5.8 Target Size (Minimum) (AA)**
- A target must be at least 24x24 CSS px (it can contain an axis-aligned 24x24 square), or it must have enough spacing. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- Spacing test: draw a 24 px diameter circle centred on each undersized target's bounding box. The circle must not intersect another target or another undersized target's circle. — [W3C editor's draft Understanding](https://w3c.github.io/wcag/understanding/target-size-minimum)
- Exceptions: Spacing, Equivalent, Inline, User-agent control and Essential. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum); [Smashing Magazine 2024](https://smashingmagazine.com/2024/07/getting-bottom-minimum-wcag-conformant-interactive-element-size/)
- axe-core has a `target-size` rule. — [Deque axe rule target-size](https://dequeuniversity.com/rules/axe/4.6/target-size)

**2.4.11 Focus Not Obscured (Minimum) (AA) and 2.4.12 (AAA)**
- At AA the focused item must not be *entirely* hidden by author-created content. AAA 2.4.12 requires it to be fully visible. — [W3C Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html); [2.4.12](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced)
- Partial overlap by a sticky header passes at AA but is discouraged. Authors should "reduce the degree and frequency" of partial obscuring. — [HK Gov handbook](https://www.digitalpolicy.gov.hk/en/our_work/digital_government/digital_inclusion/accessibility/promulgating_resources/handbook/wcag2aa/9_15_focus_not_obscured_min.html); [W3C Understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- A component with a visible focus indicator that sits behind other content fails the criterion. — [GOV.UK guide to WCAG 2.4.11](https://alphagov.github.io/guide-to-wcag/sc/2.4.11.html)
- Adrian Roselli criticises how easily 2.4.11 can be technically passed ("adversarial conformance"). — [Roselli 2023](https://adrianroselli.com/2023/10/2-4-11-adversarial-conformance.html)

**2.4.7 Focus Visible (AA) and 2.4.13 Focus Appearance (AAA)**
- 2.4.13 is AAA. It sets size and contrast requirements for focus indicator pixels, with a 3:1 change between the focused and unfocused states. — [W3C What's New in 2.2](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/); [Deque WCAG 2.2](https://dequeuniversity.com/resources/wcag-2.2)
- [prior knowledge, not re-verified] The 2.4.13 indicator area must be at least as large as a 2 CSS px thick perimeter of the unfocused component. — [W3C Understanding 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)

**3.3.7 Redundant Entry (A)**
- Information the user already entered in the same process must be auto-populated or available to select. Exceptions cover essential re-entry, security, and information that is no longer valid. — [Deque WCAG 2.2](https://dequeuniversity.com/resources/wcag-2.2); [WebAIM WCAG 2.2](https://webaim.org/standards/wcag/wcag22)

**3.3.8 Accessible Authentication (Minimum) (AA)**
- Do not block paste. Users must be able to paste credentials from a password manager and paste one-time codes. — [W3C Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- Technique H100: mark up email and password inputs properly (`autocomplete`) so password managers can fill them. F109 covers the failure where paste or autofill is blocked. — [W3C H100](https://www.w3.org/WAI/WCAG22/Techniques/html/H100); [W3C F109](https://w3.org/WAI/WCAG22/Techniques/failures/F109)
- Magic links are an accessible route because the user clicks a link rather than recalling or transcribing anything. If a code fallback is offered, its field must accept paste. — [Auth0 guide](https://auth0.com/blog/an-accessible-guide-to-wcag-3-3-8-authentication-without-frustration/); [W3C Understanding](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)

**4.1.3 Status Messages (AA)**: see the toast section below.

### Inferences
- **Kanban:** provide (a) a per-card "Move to..." menu, reachable from a "more" button or a menu-button drag handle, that lists the target columns and positions, which satisfies 2.5.7 by pointer; and (b) dnd-kit keyboard dragging with announcements for 2.1.1 and 4.1.2. In the list view, an editable Status combobox per row is a second non-drag path.
- **Dense rows at 375 px:** row-level icon buttons (status, priority, assignee) should have hit areas of at least 24x24 px, or be padded with ::before or ::after pseudo-elements. Keep more than 24 px between centres of adjacent small icons. Use 44x44 on touch as a best practice (that is 2.5.5 AAA, not required).
- **2.4.11:** use CSS `scroll-padding-top` / `scroll-padding-bottom` equal to the sticky header and toast heights, and make sure a non-modal peek panel never fully covers the focused list row. If it overlays the list at 375 px, make it modal (full screen) instead. [scroll-padding technique is prior knowledge; not found in sources this session]
- 1.4.1 Use of Color: status and priority must not rely on colour alone. Pair colour with a distinct icon shape and/or a text label. [prior knowledge; canonical: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color]
- 1.4.11 Non-text Contrast: meaningful status and priority icons, focus rings, input borders and the kanban drop indicator need at least 3:1 contrast against adjacent colours. [prior knowledge; canonical: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast]
- 1.4.10 Reflow (AA): at 320 CSS px, the equivalent of 1280 px at 400% zoom, content must not need two-dimensional scrolling. Data tables and kanban boards are allowed horizontal scrolling as content "requiring two-dimensional layout", but the page chrome must reflow. [prior knowledge; canonical: https://www.w3.org/WAI/WCAG22/Understanding/reflow]

### Gaps
- I could not open the published Understanding pages, so the exact wording of the 2.5.8 spacing exception and the 2.4.13 measurements is unverified this session.
- No source found confirms `scroll-padding` as a W3C-listed technique for 2.4.11.

## WAI-ARIA APG patterns: issue list, grouped rows, menus, dialogs, icon names

### Takeaway
Default to a native `<table>` (or list) with ordinary links and buttons for the grouped issue list. Use `role="grid"` only when you build spreadsheet-like 2D arrow-key navigation, and `treegrid` only if rows expand and collapse (for example, collapsible status groups with `aria-expanded`/`aria-level`). Use standard APG patterns for the menu button (row and card actions, "Move to"), combobox (status, assignee and label pickers), modal dialog (create issue, confirmations), and tabs (peek panel sections).

### Cited Findings
- Use a native HTML table whenever possible. ARIA `table` is mainly for re-adding semantics after CSS `display:grid`/`flex` strips them. — [MDN table role](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/Table_Role)
- If the table keeps selection state, has 2D navigation, or lets users rearrange cells, use grid or treegrid. — [MDN table role](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/Table_Role)
- "If it's not a widget, don't use role=grid". Grid suits spreadsheets and interactive calendars, and should not be used just to make rows clickable. — [Adrian Roselli, Be Careful Using Grid (2024)](https://adrianroselli.com/2024/07/be-careful-using-grid.html)
- Use treegrid when rows need `aria-expanded`, `aria-level`, `aria-posinset` or `aria-setsize`. — [MDN treegrid](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/treegrid_role)
- With grid or treegrid, the author must manage focus (roving tabindex or `aria-activedescendant`) and all keyboard interaction. — [MDN treegrid](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/treegrid_role); [APG Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid)
- Modal dialog: the container has `role="dialog"` and `aria-modal="true"`, and every control needed to operate it sits inside. — [APG 1.2 draft (W3C)](https://www.w3.org/TR/2018/WD-wai-aria-practices-1.2-20181218/)
- Combobox: DOM focus stays on the textbox, and `aria-expanded` reflects whether the popup is visible. — [CSUN ARIA best practices (APG mirror)](https://www.csun.edu/universal-design-center/web-and-mobile/aria-best-practices)
- Icon naming: `<svg role="img" aria-label="...">` is a well-supported pattern. `<title>` and `<desc>` support is inconsistent, so pair them with `role="img"`. Hide decorative icons next to visible text with `aria-hidden="true"`. — [Smashing 2021 SVG patterns](https://smashingmagazine.com/2021/05/accessible-svg-patterns-comparison/); [W3C ACT rule 7d6734](https://www.w3.org/WAI/standards-guidelines/act/rules/explicit-SVG-image-non-empty-accessible-name-7d6734/); [A11y Collective](https://www.a11y-collective.com/blog/svg-accessibility/)
- Visually hidden text is an alternative for naming an icon. Orange advises against `aria-labelledby` pointing at hidden text. — [web.dev images](https://web.dev/learn/accessibility/images); [Orange a11y guidelines](https://a11y-guidelines.orange.com/en/articles/accessible-svg/)

### Inferences
- **Grouped list:** use one `<table>` per status group with a `<caption>` or `<h2>` heading ("In progress, 12 issues"). Alternatively, use a single table with group header rows (`<th scope="rowgroup">` inside `<tbody>`). Make the collapse toggle a `<button aria-expanded>` in the heading (disclosure pattern) rather than converting the whole list to treegrid. This avoids the heavy keyboard model while keeping "j/k" app shortcuts optional.
- If you do want Linear-style arrow-key row navigation, a `grid` with row-level focus is the closest APG fit. Document the shortcuts and do not trap Tab.
- **Status/priority icon in a row:** if it is display-only, use `role="img" aria-label="Status: In progress"`. If it opens a picker, it is a menu button or combobox trigger: `<button aria-haspopup="listbox|menu" aria-label="Status: In progress, change status">`.
- **Peek panel:** on desktop, a non-modal complementary region (`<aside aria-label="Issue preview">`) with focus moved to its heading on open and returned to the row on close. At 375 px, use a modal dialog pattern.
- **Tabs (APG):** arrow keys move between tabs, and Tab moves into the tabpanel. [prior knowledge; canonical https://www.w3.org/WAI/ARIA/apg/patterns/tabs/]
- **Menu button (APG):** Enter, Space or Down Arrow opens the menu and focuses the first item, and Escape closes it and returns focus to the button. [prior knowledge plus secondary source https://joabgonzalez.github.io/ai-agents-skills/skills/a11y/references/wai-aria-patterns; canonical https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/]
- **Modal dialog:** move focus into the dialog on open, trap Tab, close with Escape, and return focus to the invoking element. The native `<dialog>.showModal()` provides most of this. [prior knowledge; canonical https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]

### Gaps
- Could not retrieve the current APG Grid, Treegrid, Tabs, Menu Button and Dialog pages directly. The keyboard details above are from older APG drafts or prior knowledge.

## Drag-and-drop libraries: keyboard and screen-reader support (dnd-kit, Pragmatic DnD)

### Takeaway
dnd-kit ships a KeyboardSensor (pick up with Space/Enter, move with arrows, drop with Space, cancel with Escape), screen-reader instructions via `aria-describedby`, and live-region announcements you should customise and localise. Atlassian's Pragmatic drag and drop does not rely on keyboard dragging. It recommends a button-triggered menu of move actions plus `announce()` live-region feedback, which is also the cleanest 2.5.7 answer.

### Cited Findings
- dnd-kit (`@dnd-kit/core`): customise and localise the `screenReaderInstructions` prop on `<DndContext>`. Live regions announce pick-up, move, drop and cancel. — [dnd-kit accessibility guide](https://docs.dndkit.com/guides/accessibility)
- In the newer `@dnd-kit/dom` API, an `Accessibility` plugin takes `screenReaderInstructions` and `announcements`. The default instructions say: pick up with Space, move with arrow keys, drop with Space, cancel with Escape. — [dnd-kit docs mirror (mintlify)](https://mintlify.com/clauderic/dnd-kit/guides/accessibility)
- `@dnd-kit/accessibility` 3.1.1: `LiveRegion` lets you set `aria-live` (for example "polite"). Wrapper spans were removed because they made macOS VoiceOver move its cursor into the region. — [@dnd-kit/accessibility CHANGELOG](https://cdn.jsdelivr.net/npm/@dnd-kit/accessibility@3.1.1/CHANGELOG.md)
- Atlassian: "not all people can successfully complete pointer based drag operations". Its guidance:
  - Provide a button-triggered menu of movement outcomes, either in a "More" (...) menu alongside the drag handle, or by making the drag handle itself a menu button when movement is the only action.
  - Give each item a single action-triggering button.
  - Name buttons after the item (for example "Move task X to top of backlog").
  — [Atlassian Pragmatic DnD accessibility guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/)
- Atlassian provides an `announce` live-region helper for results such as "Task moved to Done". — [Atlassian guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/)
- React Aria announces drag start, how to drop, and success or cancel through a live region. — [React Aria blog: Taming the dragon](https://react-aria.adobe.com/blog/drag-and-drop)
- GitHub Primer documents its own drag-and-drop accessibility pattern. — [Primer drag and drop](https://primer.style/accessibility/patterns/drag-and-drop)
- When the alternative is a menu, use standard menu ARIA, not drag-oriented ARIA (`aria-grabbed`/`aria-dropeffect` are deprecated). — [DragDoll accessibility](https://niklasramo.github.io/dragdoll/accessibility)

### Inferences
- **Recommended combo:** dnd-kit for pointer and keyboard drag, with custom announcements ("Picked up ENG-123 'Fix login'. In column Todo, position 2 of 5." / "Moved to In progress, position 1 of 3."), plus an Atlassian-style "Move to..." menu button on each card for 2.5.7, touch and voice-control users.
- Keyboard-drag announcements should name the column and the position count. Restore focus to the moved card after a drop.

### Gaps
- Could not open the dnd-kit or Atlassian docs directly. API details for the new `@dnd-kit/react` / `@dnd-kit/dom` (v0.x/1.x in 2025–26) should be checked against current docs.

## Accessible toast with Undo (timing, 4.1.3, 2.2.1)

### Takeaway
A 5 s auto-dismissing toast whose only Undo path is a button inside it is risky under 2.2.1 Timing Adjustable and is a known screen-reader problem. Practitioners disagree on whether a notification-only toast fails 2.2.1, but they agree that an actionable Undo must not be time-limited. Announce the message with a polite `role="status"` region. Keep Undo reachable without the time limit: pause on hover and focus, offer a keyboard shortcut (for example Cmd/Ctrl+Z), and keep the action in an Undo or history surface.

### Cited Findings
- Actions inside a `role="status"` toast can fail 2.2.1 because users cannot adjust the time to reach them. GitLab's guidance: don't put actions inside the toast status region, and keep critical actions on the page without a time limit. — [GitLab Pajamas issue #2771](https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com/-/issues/2771)
- Screen readers announce "Undo" as plain text, without its button role. By the time a user navigates to it, the toast may be gone. Offer the action elsewhere too. — [Scott O'Hara, A toast to a11y toasts](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html)
- A status message should not take focus. If it needs interaction, it is arguably not a toast and may be an alert dialog. — [Adrian Roselli, Defining Toast Messages](https://adrianroselli.com/2020/01/defining-toast-messages.html)
- GitHub Primer: to meet 2.2.1, provide a mechanism to keep the toast until the user dismisses it. — [Primer accessible notifications](https://primer.style/accessibility/toasts/)
- The W3C WAI-IG thread (2025) is divided. One view is that notification-only toasts are 4.1.3 status messages and do not fail 2.2.1. The opposing view is that 2.2.1 allows auto-removal only after 20 hours. This is informal discussion, not normative. — [WAI-IG Cooper](https://lists.w3.org/Archives/Public/w3c-wai-ig/2025AprJun/0079.html); [WAI-IG Green](https://lists.w3.org/Archives/Public/w3c-wai-ig/2025AprJun/0085.html)
- Alternative to toasts: a persistent `aria-live="polite"` region. — [Mía Salazar, DEV](https://dev.to/miasalazar/replacing-toasts-with-accessible-user-feedback-patterns-1p8l)

### Inferences
- **Checklist:**
  - Put the live region (`role="status"`, polite) in the DOM at page load, then inject the text.
  - Keep the Undo button outside or adjacent to the live text, so it is a real button.
  - Don't move focus.
  - Pause the timer on hover, focus-within and when the window loses focus.
  - Use a minimum of about 10 s, or persist until dismissed when a screen reader or reduced motion is detected.
  - Support Cmd/Ctrl+Z (and announce it: "Issue archived. Press Ctrl+Z to undo.").
  - Provide a permanent recovery path such as Trash/Archived or an activity log, so a missed toast is never the only route. The 2.2.1 "20 hours" and "turn off/adjust/extend" options are the normative escape hatches. [2.2.1 options are prior knowledge; canonical https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable]
- Place toasts so they don't fully cover focused content (2.4.11). At 375 px, bottom-positioned toasts can cover a focused bottom row.

### Gaps
- No normative W3C ruling on whether a 5 s Undo toast fails 2.2.1 was found. It remains contested.

## Media: captions and transcripts for user-uploaded voice notes and videos

### Takeaway
WCAG 1.2.x has no explicit user-generated-content exemption. Content authors are responsible for captions on their own media. For a platform, the practical route is a WCAG "statement of partial conformance – third-party content" for user uploads, plus authoring-tool support so users can easily add captions or transcripts: an accessible player, a caption track upload, and optional auto-generated transcripts users can edit.

### Cited Findings
- 1.2.2 Captions (Prerecorded, A): captions are required for all prerecorded audio in synchronized media. The only exception is a media alternative for text, clearly labelled. — [W3C Understanding 1.2.2](https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html)
- For live captions (1.2.4), the Understanding document notes that responsibility falls on the content provider (the "host" caller), not the application. — [W3C Understanding 1.2.4](https://www.w3.org/WAI/WCAG21/Understanding/captions-live)
- A page whose only failures are third-party content qualifies for a "statement of partial conformance, third party content". The W3C stresses that partial conformance means non-conformant. — [W3C wiki: Partial Conformance – Third Party Content](https://www.w3.org/WAI/GL/wiki/Understanding_Partial_Conformance_-_Third_Party_Content)
- Site owners remain responsible for user uploads. Recommended practice is to publish content guidelines and make alternatives (for example alt text) a system requirement on upload. — [BOIA, WCAG and third-party content](https://www.boia.org/blog/wcag-conformance-and-third-party-web-content)
- Auto-generated captions can serve as a starting set that humans edit. One secondary source cites a threshold of about 25% error rate, which is not normative. — [Equalize Digital](https://equalizedigital.com/understanding-wcag-1-2-2-captions-prerecorded-level-a-for-wordpress/)

### Inferences
- An audio-only voice note falls under 1.2.1 (audio-only: a transcript is needed). A video falls under 1.2.2 (captions) and 1.2.5 (AA audio description, rarely applicable to screen recordings that have narration). [1.2.1/1.2.5 scope is prior knowledge; canonical https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded]
- **Product checklist:**
  - Use a native `<audio>`/`<video controls>` element or an accessible player with labelled buttons. Controls need at least 24 px targets.
  - Support `<track kind="captions">` (WebVTT) upload.
  - Offer optional machine transcription with an edit step.
  - Show a "No transcript" indicator.
  - Never autoplay (1.4.2 Audio Control).
- ATAG 2.0 (Authoring Tool Accessibility Guidelines) is the relevant guidance for prompting users to create accessible content. [prior knowledge; https://www.w3.org/TR/ATAG20/]

### Gaps
- Legal treatment of UGC captions under the EAA (in force June 2025), ADA Title II and Section 508 was not researched.

## Testing tools: axe-core with Playwright

### Takeaway
Use `@axe-core/playwright` `AxeBuilder` with `.withTags([...])` in Playwright tests, covering each view state: list, board, open peek panel, open modal, toast visible, and a 375 px viewport. Automated scans catch only a subset of issues, so 2.5.7, 2.4.11, focus order and screen-reader announcements need manual or scripted checks.

### Cited Findings
- `AxeBuilder` wraps a Playwright page and injects axe into all frames. Call `analyze()` and assert on `violations`. — [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing); [@axe-core/playwright README](https://cdn.jsdelivr.net/npm/@axe-core/playwright@4.12.1/README.md)
- Official examples use the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`. The full tag list is in the axe API docs. — [Playwright docs](https://playwright.dev/docs/accessibility-testing)
- The `wcag22aa` tag appears in third-party examples (`.withTags(['wcag2a','wcag2aa','wcag22aa'])`). — [Tessl registry axe-a11y](https://tessl.io/registry/testland/axe-a11y)
- The docs warn that automated testing cannot detect all WCAG violations. — [Playwright docs](https://playwright.dev/docs/accessibility-testing)
- axe includes a `target-size` rule for 2.5.8. — [Deque axe target-size](https://dequeuniversity.com/rules/axe/4.6/target-size)

### Inferences
- **Suggested test matrix:**
  - Run axe per state with `.include()` scoped to the dialog or panel when it is open.
  - Add Playwright keyboard tests for the following:
    - Tab order.
    - Escape closes the dialog and focus returns.
    - Moving a kanban card with the keyboard, then asserting the live-region text.
    - The "Move to" menu.
    - Toast Undo through the keyboard shortcut.
    - The focused element's bounding box is not fully covered by sticky elements, using `elementFromPoint` checks.
  - Use `page.setViewportSize({width: 375, ...})` for mobile.
  - Do manual NVDA, JAWS, VoiceOver (macOS/iOS) and TalkBack passes.

### Gaps
- Not confirmed from official axe docs that `wcag22aa` is a current tag. Check https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#axe-core-tags.
