import bcrypt from "bcryptjs";
import prisma from "../../../../src/lib/prisma";
import { setSessionCookie } from "../../../../src/lib/auth";

export async function GET() {
  try {
    const count = await prisma.user.count();

    return Response.json({
      success: true,
      registrationAllowed: count === 0,
    });
  } catch {
    return Response.json(
      { success: false, message: "Unable to check registration status" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
      return Response.json(
        { success: false, message: "Clinic account registration is disabled" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || password.length < 8) {
      return Response.json(
        {
          success: false,
          message: "Name, email and an 8 character password are required",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "doctor",
        active: true,
        lastLoginAt: new Date(),
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

    await setSessionCookie(user);

    return Response.json(
      {
        success: true,
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return Response.json(
      { success: false, message: "Unable to create clinic account" },
      { status: 500 },
    );
  }
}
