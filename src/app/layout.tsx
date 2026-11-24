import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "Vendoor × ABG", template: "%s · Vendoor × ABG" },
  description: "Vendoor × ABG work tracker",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FAFAFB" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-theme="light">
      <body className="min-h-dvh bg-canvas text-fg">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Cairo">
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" toastOptions={{ className: "!text-ui !rounded-card !border-border" }} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
