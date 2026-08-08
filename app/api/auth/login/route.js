import bcrypt from "bcryptjs";
import prisma from "../../../../src/lib/prisma";
import { setSessionCookie } from "../../../../src/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return Response.json(
        { success: false, message: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return Response.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return Response.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    const sessionUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
      { success: false, message: "Unable to sign in" },
      { status: 500 },
    );
  }
}
