import { NextResponse } from "next/server";
import prisma from "./src/lib/prisma";
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

async function validateSession(token) {
  const payload = verifySessionToken(token);

  if (!payload) return null;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        active: true,
      },
      select: {
        id: true,
        role: true,
        sessionVersion: true,
      },
    });

    if (
      !user ||
      user.sessionVersion !== payload.sessionVersion
    ) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("PROXY SESSION ERROR:", error);
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname === "/" && !token) {
    return NextResponse.next();
  }

  const session = token
    ? await validateSession(token)
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
