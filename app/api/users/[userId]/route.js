import bcrypt from "bcryptjs";
import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import {
  validObjectId,
  validPassword,
} from "../../../../src/lib/inputValidation";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

function canManage(user) {
  return hasPermission(
    user?.role,
    permissions.MANAGE_USERS,
  );
}

export async function PATCH(
  request,
  { params },
) {
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

    const { userId } = await params;

    if (!validObjectId(userId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid clinic ID",
        },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!target) {
      return Response.json(
        {
          success: false,
          message: "Clinic ID not found",
        },
        { status: 404 },
      );
    }

    if (
      target.role === "admin" &&
      sessionUser.role !== "admin"
    ) {
      return forbiddenResponse();
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request, 8 * 1024);

    if (bodyError) return bodyError;

    const data = {};

    if (
      userId === sessionUser.id &&
      (
        body.password !== undefined ||
        body.role !== undefined
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Use Account access to change your own password",
        },
        { status: 400 },
      );
    }

    if (typeof body.active === "boolean") {
      if (
        userId === sessionUser.id &&
        body.active === false
      ) {
        return Response.json(
          {
            success: false,
            message:
              "You cannot deactivate your own account",
          },
          { status: 400 },
        );
      }

      data.active = body.active;

      if (!body.active) {
        data.sessionVersion = {
          increment: 1,
        };
      }
    }

    if (body.role !== undefined) {
      const role = String(body.role)
        .trim()
        .toLowerCase();

      if (
        !["doctor", "staff", "admin"].includes(
          role,
        )
      ) {
        return Response.json(
          {
            success: false,
            message: "Invalid role",
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

      data.role = role;
    }

    if (body.password !== undefined) {
      const password =
        String(body.password || "");

      if (!validPassword(password, 8)) {
        return Response.json(
          {
            success: false,
            message:
              "Temporary password must be at least 8 characters",
          },
          { status: 400 },
        );
      }

      data.password =
        await bcrypt.hash(password, 12);

      data.sessionVersion = {
        increment: 1,
      };

      data.failedLoginAttempts = 0;
      data.lockedUntil = null;
      data.passwordResetRequestedAt = null;
    }

    if (!Object.keys(data).length) {
      return Response.json(
        {
          success: false,
          message: "No changes provided",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
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

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to update clinic ID",
      },
      { status: 500 },
    );
  }
}
