import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "./prisma";

export const SESSION_COOKIE = "caretrack_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return secret;
}

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export function createSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: SESSION_MAX_AGE,
    },
  );
}

export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      !payload ||
      typeof payload !== "object" ||
      !validObjectId(payload.sub)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const payload = verifySessionToken(token);

  if (!payload) return null;

  return prisma.user.findFirst({
    where: {
      id: payload.sub,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
    },
  });
}
