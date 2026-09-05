import bcrypt from "bcryptjs";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../src/lib/requestBody";
import {
  validEmail,
  validPassword,
  validText,
} from "../../../src/lib/inputValidation";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

function canManage(user) {
  return hasPermission(
    user?.role,
    permissions.MANAGE_USERS,
  );
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      );
    }

    if (!canManage(user)) {
      return forbiddenResponse();
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        passwordResetRequestedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return Response.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to load clinic IDs",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const originError = validateWriteOrigin(request);
  if (originError) return originError;

  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return Response.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      );
    }

    if (!canManage(sessionUser)) {
      return forbiddenResponse();
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request, 8 * 1024);

    if (bodyError) return bodyError;

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");
    const role = String(body?.role || "staff")
      .trim()
      .toLowerCase();

    if (!name || !validText(name, 120)) {
      return Response.json(
        {
          success: false,
          message: "Enter a valid name",
        },
        { status: 400 },
      );
    }

    if (!validEmail(email)) {
      return Response.json(
        {
          success: false,
          message: "Enter a valid email",
        },
        { status: 400 },
      );
    }

    if (!validPassword(password, 8)) {
      return Response.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters",
        },
        { status: 400 },
      );
    }

    if (!["doctor", "staff", "admin"].includes(role)) {
      return Response.json(
        {
          success: false,
          message: "Invalid account role",
        },
        { status: 400 },
      );
    }

    if (
      role === "admin" &&
      sessionUser.role !== "admin"
    ) {
      return forbiddenResponse();
    }

    const existing =
      await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

    if (existing) {
      return Response.json(
        {
          success: false,
          message:
            "An account with this email already exists",
        },
        { status: 409 },
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        passwordResetRequestedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        success: true,
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to create clinic ID",
      },
      { status: 500 },
    );
  }
}
