import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import { validPassword } from "../../../../src/lib/inputValidation";
import bcrypt from "bcryptjs";
import prisma from "../../../../src/lib/prisma";
import {
  getSessionUser,
  setSessionCookie,
} from "../../../../src/lib/auth";

export async function PATCH(request) {
  const originError = validateWriteOrigin(request);

  if (originError) {
    return originError;
  }

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

    const { data: body, error: bodyError } =
      await readJsonBody(request, 8 * 1024);

    if (bodyError) {
      return bodyError;
    }

    if (
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string"
    ) {
      return Response.json(
        {
          success: false,
          message: "Current and new password are required",
        },
        { status: 400 },
      );
    }

    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;

    if (
      !validPassword(currentPassword) ||
      !validPassword(newPassword, 8)
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid password",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    const validCurrentPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!validCurrentPassword) {
      return Response.json(
        {
          success: false,
          message: "Current password is incorrect",
        },
        { status: 400 },
      );
    }

    const password = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        sessionVersion: {
          increment: 1,
        },
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

    await setSessionCookie(updatedUser);

    return Response.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("PASSWORD CHANGE ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to update password",
      },
      { status: 500 },
    );
  }
}
