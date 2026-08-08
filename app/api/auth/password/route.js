import bcrypt from "bcryptjs";
import prisma from "../../../../src/lib/prisma";
import {
  getSessionUser,
  setSessionCookie,
} from "../../../../src/lib/auth";

export async function PATCH(request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || newPassword.length < 8) {
      return Response.json(
        {
          success: false,
          message: "Current password and an 8 character new password are required",
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!validPassword) {
      return Response.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 },
      );
    }

    const password = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { password },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
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
      { success: false, message: "Unable to update password" },
      { status: 500 },
    );
  }
}
