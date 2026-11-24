import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Cheap cookie check only, to redirect signed-out visitors. Every page and server action still validates the session on the server.
export function proxy(req: NextRequest) {
  const has = getSessionCookie(req);
  if (!has) {
    const url = new URL("/sign-in", req.url);
    if (req.nextUrl.pathname !== "/") url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|sign-in|favicon.ico|.*\\.(?:png|svg|ico|woff2?)$).*)"],
};
