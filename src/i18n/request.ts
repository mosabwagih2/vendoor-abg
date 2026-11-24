import { getRequestConfig } from "next-intl/server";

// English first; Arabic (RTL) later. All UI strings live in messages/<locale>.json.
export default getRequestConfig(async () => {
  const locale = "en";
  return {
    locale,
    timeZone: "Africa/Cairo",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
