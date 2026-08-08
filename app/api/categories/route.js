import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../src/lib/requestBody";
import { validText } from "../../../src/lib/inputValidation";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";

function parseInterval(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const days = Number(text);

  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > 3650
  ) {
    return null;
  }

  return days;
}

export async function GET() {
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

    const categories = await prisma.category.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return Response.json(categories);
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return Response.json(
      {
        message: "Failed to load categories",
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

    if (
      !hasPermission(
        sessionUser.role,
        permissions.MANAGE_CATEGORIES,
      )
    ) {
      return forbiddenResponse();
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) {
      return bodyError;
    }

    if (typeof body.name !== "string") {
      return Response.json(
        {
          message: "Category name is required",
        },
        { status: 400 },
      );
    }

    const name = body.name.trim();

    if (!name) {
      return Response.json(
        {
          message: "Category name is required",
        },
        { status: 400 },
      );
    }

    if (!validText(name, 100)) {
      return Response.json(
        {
          message: "Category name is too long",
        },
        { status: 400 },
      );
    }

    const followUpIntervalDays = parseInterval(
      body.followUpIntervalDays,
      30,
    );

    if (!followUpIntervalDays) {
      return Response.json(
        {
          message: "Invalid follow-up interval",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return Response.json(
        {
          message: "Category already exists",
        },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        followUpIntervalDays,
        active: true,
      },
    });

    return Response.json(category, { status: 201 });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);

    return Response.json(
      {
        message: "Failed to create category",
      },
      { status: 500 },
    );
  }
}
