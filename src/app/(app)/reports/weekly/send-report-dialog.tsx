"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Clock, Copy, FileText, Link as LinkIcon, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { weeklyEmailAction, weeklyLinkAction, weeklyTextAction } from "@/server/actions/misc";

type Way = "whatsapp" | "email" | "pdf" | "link";
const WAYS: Array<{ id: Way; icon: typeof Copy }> = [
  { id: "whatsapp", icon: Copy },
  { id: "email", icon: Send },
  { id: "pdf", icon: FileText },
  { id: "link", icon: LinkIcon },
];

/** Figma 8.2: one dialog, four ways to send the same report. The text is built from task activity, so nothing is typed here. */
export function SendReportDialog({ week, title, range, autoTime }: { week: string; title: string; range: string; autoTime: string | null }) {
  const t = useTranslations("weekly.send");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [way, setWay] = useState<Way>("whatsapp");
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    weeklyTextAction(week).then((r) => alive && r.ok && setText(r.data as string));
    return () => {
      alive = false;
    };
  }, [open, week]);

  async function run() {
    setBusy(true);
    try {
      if (way === "whatsapp") {
        await navigator.clipboard.writeText(text ?? "");
        toast.success(t("copied"));
      } else if (way === "link") {
        const r = await weeklyLinkAction(week);
        if (!r.ok) return void toast.error(tc("error"));
        await navigator.clipboard.writeText((r.data as { url: string }).url);
        toast.success(t("linkCopied"));
      } else if (way === "email") {
        const r = await weeklyEmailAction(week);
        if (!r.ok) return void toast.error(r.error === "forbidden" ? tc("forbidden") : tc("error"));
        toast.success(t("emailSent", { count: (r.data as { count: number }).count }));
      } else {
        setOpen(false);
        setTimeout(() => window.print(), 250);
        return;
      }
      setOpen(false);
    } catch {
      toast.error(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  const cta = way === "whatsapp" ? t("copyText") : way === "email" ? t("sendEmail") : way === "pdf" ? t("printPdf") : t("copyLink");
  return (
    <>
      <Button size="sm" variant="primary" className="bg-accent text-white" onClick={() => setOpen(true)}>
        <Share2 size={14} aria-hidden />
        {t("open")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent title={t("title")} description={`${title} · ${range}`} wide className="sm:w-[860px]">
            <div className="grid gap-5 md:grid-cols-[1fr_320px]">
              <div className="rounded-xl bg-[#efe6dc] p-3">
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-muted">{t("preview")}</div>
                <pre className="min-h-40 whitespace-pre-wrap rounded-lg bg-[#dcf8c6] p-3 font-sans text-[13px] leading-5 text-[#111]">{text ?? t("loading")}</pre>
              </div>
              <div>
                <div className="mb-2 text-ui font-semibold">{t("how")}</div>
                <div role="radiogroup" aria-label={t("how")} className="space-y-2">
                  {WAYS.map(({ id, icon: Icon }) => (
                    <button key={id} type="button" role="radio" aria-checked={way === id} onClick={() => setWay(id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-start", way === id ? "border-accent bg-info-subtle ring-1 ring-accent" : "border-border hover:bg-subtle")}>
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", way === id ? "bg-accent text-white" : "bg-subtle text-fg-secondary")}>
                        <Icon size={15} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-ui font-semibold">{t(`way.${id}`)}</span>
                        <span className="block text-meta text-fg-secondary">{t(`wayHint.${id}`)}</span>
                      </span>
                      {way === id && <Check size={16} className="text-accent" aria-hidden />}
                    </button>
                  ))}
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-subtle p-3 text-meta text-fg-secondary">
                  <Clock size={14} className="mt-0.5 shrink-0" aria-hidden />
                  {autoTime ? t("autoOn", { time: autoTime }) : t("autoOff")}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-border pt-3">
              <span className="me-auto text-meta text-fg-secondary">{t("note")}</span>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button variant="primary" className="bg-accent text-white" onClick={run} disabled={busy || (way === "whatsapp" && !text)}>
                <Check size={14} aria-hidden />
                {cta}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
