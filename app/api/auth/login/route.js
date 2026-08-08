import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import {
  validEmail,
  validPassword,
} from "../../../../src/lib/inputValidation";
import bcrypt from "bcryptjs";
import prisma from "../../../../src/lib/prisma";
import { setSessionCookie } from "../../../../src/lib/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request) {
  const originError = validateWriteOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    const { data: body, error: bodyError } =
      await readJsonBody(request, 8 * 1024);

    if (bodyError) {
      return bodyError;
    }

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return Response.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (!validEmail(email) || !validPassword(password)) {
      return Response.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return Response.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 },
      );
    }

    const now = new Date();

    const lockActive =
      user.lockedUntil &&
      new Date(user.lockedUntil).getTime() > now.getTime();

    if (lockActive) {
      return Response.json(
        {
          success: false,
          message: "Too many sign-in attempts. Try again later.",
        },
        { status: 429 },
      );
    }

    const previousAttempts =
      user.lockedUntil &&
      new Date(user.lockedUntil).getTime() <= now.getTime()
        ? 0
        : Number(user.failedLoginAttempts || 0);

    const validPasswordMatch = await bcrypt.compare(
      password,
      user.password,
    );

    if (!validPasswordMatch) {
      const failedLoginAttempts = previousAttempts + 1;
      const shouldLock =
        failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts,
          lockedUntil: shouldLock
            ? new Date(
                now.getTime() +
                  LOCK_MINUTES * 60 * 1000,
              )
            : null,
        },
      });

      return Response.json(
        shouldLock
          ? {
              success: false,
              message: "Too many sign-in attempts. Try again later.",
            }
          : {
              success: false,
              message: "Invalid email or password",
            },
        { status: shouldLock ? 429 : 401 },
      );
    }

    const sessionUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        sessionVersion: true,
        lastLoginAt: true,
      },
    });

    await setSessionCookie(sessionUser);

    return Response.json({
      success: true,
      user: sessionUser,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to sign in",
      },
      { status: 500 },
    );
  }
}
