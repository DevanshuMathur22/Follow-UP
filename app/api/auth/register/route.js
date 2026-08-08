import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import {
  validEmail,
  validPassword,
  validText,
} from "../../../../src/lib/inputValidation";
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
      {
        success: false,
        message: "Unable to check registration status",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const originError = validateWriteOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    const existingUsers = await prisma.user.count();

    if (existingUsers > 0) {
      return Response.json(
        {
          success: false,
          message: "Clinic account registration is disabled",
        },
        { status: 403 },
      );
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request, 8 * 1024);

    if (bodyError) {
      return bodyError;
    }

    if (
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return Response.json(
        {
          success: false,
          message: "Name, email and password are required",
        },
        { status: 400 },
      );
    }

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (!name || !validText(name, 120)) {
      return Response.json(
        {
          success: false,
          message: "Invalid name",
        },
        { status: 400 },
      );
    }

    if (!validEmail(email)) {
      return Response.json(
        {
          success: false,
          message: "Invalid email address",
        },
        { status: 400 },
      );
    }

    if (!validPassword(password, 8)) {
      return Response.json(
        {
          success: false,
          message: "Password must be between 8 and 72 bytes",
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
      {
        success: false,
        message: "Unable to create clinic account",
      },
      { status: 500 },
    );
  }
}
