import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "./src/lib/sessionToken";

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/patients/:path*",
    "/follow-ups/:path*",
    "/categories/:path*",
    "/activity/:path*",
    "/analytics/:path*",
    "/appointments/:path*",
    "/prescriptions/:path*",
    "/reports/:path*",
    "/invoices/:path*",
    "/tasks/:path*",
    "/settings/:path*",
  ],
};
