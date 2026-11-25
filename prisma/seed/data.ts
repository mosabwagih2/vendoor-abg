// Seed data from the PRD. Emails are placeholders until the real ones are confirmed (docs/PLAN.md, question 3).

export const PEOPLE = [
  { name: "Mohammed Wagih", handle: "mohammed-wagih", email: "mohammed@vendoor.test", role: "owner", side: "requester" },
  { name: "Yara", handle: "yara", email: "yara@vendoor.test", role: "admin", side: "requester" },
  { name: "Mosab Wagih", handle: "mosab-wagih", email: "mosab@vendoor.test", role: "requester", side: "requester" },
  { name: "Abdel-fattah", handle: "abdel-fattah", email: "abdelfattah@vendoor.test", role: "requester", side: "requester" },
  { name: "Eng. Mohamed Adel", handle: "mohamed-adel", email: "mohamed.adel@vendoor.test", role: "requester", side: "requester" },
  { name: "Za8loul", handle: "za8loul", email: "za8loul@abg.test", role: "abg_lead", side: "delivery" },
  { name: "Ahmed Shiha", handle: "ahmed-shiha", email: "ahmed.shiha@abg.test", role: "abg_member", side: "delivery" },
  { name: "Ahmed Kamal Soliman", handle: "ahmed-kamal", email: "ahmed.kamal@abg.test", role: "abg_member", side: "delivery" },
] as const;

export const PROJECTS: Array<{ key: string; name: string; description: string; categories: string[] }> = [
  { key: "BOS", name: "Bosta integration", description: "Exchange orders, account linking, bulk linking, status notes", categories: ["Exchange orders", "Account linking", "Status notes", "Bulk linking", "Other"] },
  { key: "SHP", name: "Shopify", description: "Product export, color and size fields, status mapping", categories: ["Product export", "Variants (colour, size)", "Status mapping", "Other"] },
  { key: "EZO", name: "EasyOrders", description: "Status mapping, duplicate webhooks, stock sync", categories: ["Order sync", "Status mapping", "Stock sync", "Duplicate orders", "Other"] },
  { key: "ORD", name: "Orders", description: "Order entry, edit order, regions, blacklist, extra phone", categories: ["Order entry", "Edit order", "Regions", "Blacklist", "Customer phone", "Other"] },
  { key: "DEP", name: "Deposit", description: "Deposit dashboard, sheets, label, edits to deposit orders", categories: ["Deposit orders", "Dashboard", "Sheets", "Other"] },
  { key: "LBL", name: "Labels and printing", description: "Thermal label clarity and margins", categories: ["Thermal label", "Other"] },
  { key: "ACC", name: "Accounts and permissions", description: "Who can edit linked accounts, password reset OTP", categories: ["Sign-in and OTP", "Permissions", "Account access", "Other"] },
  { key: "SUP", name: "Suppliers, products and stock", description: "Stock log, freeze supplier vs products, product page", categories: ["Stock", "Products", "Supplier activation", "Other"] },
  { key: "EXP", name: "Exports and sheets", description: "Date-range export, supplier name in sheet", categories: ["Exports", "Sheets", "Other"] },
  { key: "PRF", name: "Performance", description: "Welcome page, slow order entry, filters", categories: ["Slow pages", "Filters", "Dashboard", "Other"] },
  { key: "INF", name: "Infrastructure and domain", description: "DNS, server restarts, URL change", categories: ["DNS", "Server", "Domain", "Other"] },
];

// PRD 4.3 defaults, in working minutes (1 working day = 480).
export const SLA = [
  { priority: "highest", firstResponseMinutes: 60, resolutionMinutes: 240 },
  { priority: "high", firstResponseMinutes: 120, resolutionMinutes: 480 },
  { priority: "medium", firstResponseMinutes: 240, resolutionMinutes: 3 * 480 },
  { priority: "low", firstResponseMinutes: 480, resolutionMinutes: 5 * 480 },
  { priority: "lowest", firstResponseMinutes: 2 * 480, resolutionMinutes: 10 * 480 },
] as const;

// Egypt public holidays. 2026 confirmed by decree where noted in the research; 2027 Islamic dates are estimates.
export const HOLIDAYS: Array<{ date: string; name: string; certainty: "confirmed" | "estimated" }> = [
  { date: "2026-01-07", name: "Coptic Christmas", certainty: "confirmed" },
  { date: "2026-01-25", name: "Revolution Day / Police Day", certainty: "confirmed" },
  { date: "2026-03-19", name: "Eid al-Fitr", certainty: "confirmed" },
  { date: "2026-03-22", name: "Eid al-Fitr", certainty: "confirmed" },
  { date: "2026-03-23", name: "Eid al-Fitr", certainty: "confirmed" },
  { date: "2026-04-13", name: "Sham El-Nessim", certainty: "estimated" },
  { date: "2026-05-07", name: "Labour Day (moved)", certainty: "estimated" },
  { date: "2026-05-26", name: "Arafat Day / Eid al-Adha", certainty: "confirmed" },
  { date: "2026-05-27", name: "Eid al-Adha", certainty: "confirmed" },
  { date: "2026-05-28", name: "Eid al-Adha", certainty: "confirmed" },
  { date: "2026-05-31", name: "Eid al-Adha", certainty: "confirmed" },
  { date: "2026-06-18", name: "Islamic New Year", certainty: "estimated" },
  { date: "2026-07-02", name: "June 30 Revolution (moved)", certainty: "confirmed" },
  { date: "2026-07-23", name: "July 23 Revolution", certainty: "confirmed" },
  { date: "2026-08-27", name: "Prophet's Birthday (moved)", certainty: "confirmed" },
  { date: "2026-10-08", name: "Armed Forces Day (moved)", certainty: "estimated" },
  { date: "2027-01-07", name: "Coptic Christmas", certainty: "confirmed" },
  { date: "2027-01-25", name: "Revolution Day / Police Day", certainty: "estimated" },
  { date: "2027-03-09", name: "Eid al-Fitr", certainty: "estimated" },
  { date: "2027-03-10", name: "Eid al-Fitr", certainty: "estimated" },
  { date: "2027-03-11", name: "Eid al-Fitr", certainty: "estimated" },
  { date: "2027-05-03", name: "Sham El-Nessim", certainty: "estimated" },
  { date: "2027-05-16", name: "Arafat Day / Eid al-Adha", certainty: "estimated" },
  { date: "2027-05-17", name: "Eid al-Adha", certainty: "estimated" },
  { date: "2027-05-18", name: "Eid al-Adha", certainty: "estimated" },
  { date: "2027-06-06", name: "Islamic New Year", certainty: "estimated" },
  { date: "2027-06-30", name: "June 30 Revolution", certainty: "estimated" },
  { date: "2027-07-22", name: "July 23 Revolution (moved)", certainty: "estimated" },
  { date: "2027-08-15", name: "Prophet's Birthday", certainty: "estimated" },
  { date: "2027-10-06", name: "Armed Forces Day", certainty: "estimated" },
];

type Start = "triage" | "reopened" | "needs_info" | "shipped";

export interface BacklogItem {
  project: string;
  title: string;
  type: "bug" | "change" | "feature" | "ops";
  firstReported: string; // YYYY-MM-DD
  lastMentioned: string;
  start: Start;
  priority?: "highest" | "high" | "medium" | "low" | "lowest";
  accounts?: string[];
  orderCodes?: string[];
  occurrences?: Array<{ date: string; accounts?: string[]; orderCodes?: string[]; note: string }>;
  needsInfoQuestion?: string;
  related?: string; // project key of a related task with the same title (multi-project rows)
}

// PRD 11.1 seed backlog (2026 dates).
export const BACKLOG: BacklogItem[] = [
  { project: "LBL", title: "Thermal label unclear: large empty margins, small text", type: "change", firstReported: "2026-10-15", lastMentioned: "2026-11-21", start: "triage", priority: "medium", occurrences: [{ date: "2026-11-21", note: "Reported again in the group: labels still have large margins and small text." }] },
  {
    project: "BOS",
    title: "Bosta account linking fails intermittently (vara, tamq, scepter, arc)",
    type: "bug",
    firstReported: "2026-10-11",
    lastMentioned: "2026-11-22",
    start: "triage",
    priority: "high",
    accounts: ["vara", "tamq", "scepter", "arc"],
    occurrences: [
      { date: "2026-10-11", accounts: ["vara"], note: "Linking failed for vara." },
      { date: "2026-10-20", accounts: ["tamq"], note: "Linking failed for tamq." },
      { date: "2026-11-08", accounts: ["scepter"], note: "Linking failed for scepter." },
      { date: "2026-11-16", accounts: ["arc"], note: "Linking failed for arc." },
      { date: "2026-11-22", accounts: ["tamq"], note: "Reported again for tamq." },
    ],
  },
  { project: "BOS", title: "Status notes must stop at final status (Delivered, Returned)", type: "bug", firstReported: "2026-10-24", lastMentioned: "2026-11-22", start: "reopened", priority: "high" },
  { project: "BOS", title: "Refused returns get a status that does not exist in Bosta (oe5942, 364 orders)", type: "bug", firstReported: "2026-10-25", lastMentioned: "2026-10-25", start: "triage", priority: "high", orderCodes: ["oe5942"] },
  { project: "BOS", title: "Order marked Delivered but Bosta shows cancelled (tb2147)", type: "bug", firstReported: "2026-10-20", lastMentioned: "2026-10-21", start: "triage", priority: "medium", orderCodes: ["tb2147"] },
  { project: "ORD", title: "Outside exchange orders show as New (Zd8781)", type: "bug", firstReported: "2026-10-31", lastMentioned: "2026-11-01", start: "triage", priority: "medium", orderCodes: ["Zd8781"] },
  { project: "DEP", title: "Deposit orders: edits blocked, deposit cannot be reduced, status stuck in processing (CR M-03)", type: "bug", firstReported: "2026-11-15", lastMentioned: "2026-11-22", start: "triage", priority: "high" },
  { project: "PRF", title: "Order entry takes 2 to 3 minutes; all pages slow", type: "bug", firstReported: "2026-11-22", lastMentioned: "2026-11-23", start: "triage", priority: "highest" },
  { project: "PRF", title: "Search filter slow; show more than 5 filters; best-products page heavy", type: "change", firstReported: "2026-11-18", lastMentioned: "2026-11-18", start: "triage", priority: "medium" },
  { project: "PRF", title: "Dashboard numbers visible without the eye icon for suppliers and staff", type: "change", firstReported: "2026-11-18", lastMentioned: "2026-11-19", start: "needs_info", priority: "medium", needsInfoQuestion: "Should the numbers be visible by default for suppliers and staff, or only for admins? Yara to decide." },
  { project: "SUP", title: "Stock history in supplier account lacks quantity added or removed and time", type: "bug", firstReported: "2026-11-19", lastMentioned: "2026-11-19", start: "triage", priority: "medium" },
  { project: "SUP", title: "Product page: full product name and colour names cut off", type: "change", firstReported: "2026-11-18", lastMentioned: "2026-11-18", start: "triage", priority: "low" },
  { project: "SUP", title: "Closed product still visible to marketers", type: "bug", firstReported: "2026-10-28", lastMentioned: "2026-10-28", start: "triage", priority: "medium" },
  { project: "SUP", title: "Product activation separated from supplier activation", type: "change", firstReported: "2026-11-09", lastMentioned: "2026-11-22", start: "shipped", priority: "medium" },
  { project: "EZO", title: "Orders from marketer ads not syncing to Vendoor (27552)", type: "bug", firstReported: "2026-11-19", lastMentioned: "2026-11-19", start: "triage", priority: "high", orderCodes: ["27552"] },
  { project: "EZO", title: "Marketer orders land in Problems page (ve21427)", type: "bug", firstReported: "2026-11-15", lastMentioned: "2026-11-15", start: "triage", priority: "medium", orderCodes: ["ve21427"] },
  { project: "EZO", title: "Deleting in Vendoor should delete in EasyOrders; block duplicate orders (Rt8584, Ka8316)", type: "feature", firstReported: "2026-10-06", lastMentioned: "2026-10-06", start: "triage", priority: "medium", orderCodes: ["Rt8584", "Ka8316"] },
  { project: "EZO", title: "Real-time stock sync to EasyOrders and Shopify after export", type: "feature", firstReported: "2026-09-28", lastMentioned: "2026-11-01", start: "needs_info", priority: "medium", needsInfoQuestion: "Please confirm how the stock sync should work: on every stock change, or on a schedule? Which side is the source of truth?", related: "SHP" },
  { project: "SHP", title: "Export colour and size as separate options", type: "change", firstReported: "2026-10-31", lastMentioned: "2026-11-01", start: "triage", priority: "medium" },
  { project: "SHP", title: "Easy export of all products to EasyOrders and Shopify", type: "feature", firstReported: "2026-10-28", lastMentioned: "2026-10-28", start: "triage", priority: "medium" },
  { project: "ORD", title: "Edit button on orders does not open (Arc)", type: "bug", firstReported: "2026-11-16", lastMentioned: "2026-11-17", start: "triage", priority: "high", accounts: ["arc"] },
  { project: "ORD", title: "Extra customer phone not accepted (ok8906)", type: "bug", firstReported: "2026-11-15", lastMentioned: "2026-11-15", start: "triage", priority: "medium", orderCodes: ["ok8906"] },
  { project: "ORD", title: "New Valley missing from region search for new orders", type: "bug", firstReported: "2026-11-08", lastMentioned: "2026-11-08", start: "triage", priority: "medium" },
  { project: "ORD", title: "Blacklist: staff can edit only to cancel", type: "change", firstReported: "2026-10-31", lastMentioned: "2026-10-31", start: "triage", priority: "low" },
  { project: "ACC", title: "Account ve5372 will not open", type: "bug", firstReported: "2026-11-23", lastMentioned: "2026-11-23", start: "triage", priority: "high", accounts: ["ve5372"] },
  { project: "ACC", title: "Forgot-password code not sent (OTP service)", type: "bug", firstReported: "2026-10-13", lastMentioned: "2026-10-14", start: "triage", priority: "high" },
  { project: "INF", title: "Facebook domain verification tag on aff.ven-door.com", type: "ops", firstReported: "2026-10-28", lastMentioned: "2026-11-09", start: "shipped", priority: "low" },
  { project: "INF", title: "Action logged 3 times in the system", type: "bug", firstReported: "2026-10-29", lastMentioned: "2026-10-29", start: "triage", priority: "medium" },
];
