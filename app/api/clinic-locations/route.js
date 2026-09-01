import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

function clean(value, maxLength = 300) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function slotMinutes(value) {
  const number = Number(value || 10);
  return Number.isInteger(number) &&
    number >= 5 &&
    number <= 120
    ? number
    : 10;
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

    const locations =
      await prisma.clinicLocation.findMany({
        where: { active: true },
        orderBy: [
          { city: "asc" },
          { name: "asc" },
        ],
      });

    return Response.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error(
      "GET CLINIC LOCATIONS ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to load clinic locations",
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

    if (
      !hasPermission(
        user.role,
        permissions.MANAGE_AVAILABILITY,
      )
    ) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const name = clean(body.name, 160);
    const city = clean(body.city, 120);

    if (!name || !city) {
      return Response.json(
        {
          success: false,
          message:
            "Clinic name and city are required",
        },
        { status: 400 },
      );
    }

    const location =
      await prisma.clinicLocation.create({
        data: {
          code: `LOC-${Date.now()
            .toString(36)
            .toUpperCase()}-${Math.random()
            .toString(36)
            .slice(2, 6)
            .toUpperCase()}`,
          name,
          city,
          address:
            clean(body.address, 500) || null,
          phone:
            clean(body.phone, 40) || null,
          defaultSlotMinutes:
            slotMinutes(
              body.defaultSlotMinutes,
            ),
          timezone: "Asia/Kolkata",
          active: true,
        },
      });

    return Response.json(
      {
        success: true,
        location,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "CREATE CLINIC LOCATION ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to add clinic location",
      },
      { status: 500 },
    );
  }
}
