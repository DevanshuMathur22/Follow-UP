import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "./src/lib/sessionToken";
import {
  hasPermission,
  permissions,
} from "./src/lib/permissions";

const restrictedRoutes = [
  {
    path: "/patients/archived",
    permission: permissions.ARCHIVE_PATIENTS,
  },
  {
    path: "/categories",
    permission: permissions.MANAGE_CATEGORIES,
  },
  {
    path: "/activity",
    permission: permissions.VIEW_ACTIVITY,
  },
  {
    path: "/analytics",
    permission: permissions.VIEW_ANALYTICS,
  },
  {
    path: "/settings",
    permission: permissions.MANAGE_SETTINGS,
  },
];

function loginRedirect(request) {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

function validateSession(token) {
  return verifySessionToken(token);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname === "/" && !token) {
    return NextResponse.next();
  }

  const session = token
    ? validateSession(token)
    : null;

  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
    }

    return NextResponse.next();
  }

  if (!session) {
    return loginRedirect(request);
  }

  const restricted = restrictedRoutes.find(
    ({ path }) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );

  if (
    restricted &&
    !hasPermission(session.role, restricted.permission)
  ) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
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
