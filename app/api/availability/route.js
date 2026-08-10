import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { readJsonBody } from "../../../src/lib/requestBody";
import { validObjectId } from "../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function minutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function normalizeDays(body) {
  const source = Array.isArray(body.days)
    ? body.days
    : [body.dayOfWeek];

  return [
    ...new Set(
      source
        .map(Number)
        .filter(
          (day) =>
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6,
        ),
    ),
  ].sort((a, b) => a - b);
}

export async function GET(request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location");

    if (locationId && !validObjectId(locationId)) {
      return Response.json(
        { success: false, message: "Invalid location ID" },
        { status: 400 },
      );
    }

    const availability =
      await prisma.doctorAvailability.findMany({
        where: locationId ? { locationId } : undefined,
        include: {
          location: true,
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { startTime: "asc" },
        ],
      });

    return Response.json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error("GET AVAILABILITY ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load availability",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const originError = validateWriteOrigin(request);
  if (originError) return originError;

  try {
    const user = await getSessionUser();

    if (!user) {
      return Response.json(
        { success: false, message: "Authentication required" },
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

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const locationId = body.locationId;
    const days = normalizeDays(body);
    const startTime = String(body.startTime || "");
    const endTime = String(body.endTime || "");
    const slotMinutes = Number(body.slotMinutes || 10);
    const label = String(body.label || "")
      .trim()
      .slice(0, 120);

    if (!validObjectId(locationId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid clinic location",
        },
        { status: 400 },
      );
    }

    if (!days.length) {
      return Response.json(
        {
          success: false,
          message: "Select at least one day",
        },
        { status: 400 },
      );
    }

    if (!validTime(startTime) || !validTime(endTime)) {
      return Response.json(
        {
          success: false,
          message: "Invalid start or end time",
        },
        { status: 400 },
      );
    }

    if (minutes(startTime) >= minutes(endTime)) {
      return Response.json(
        {
          success: false,
          message: "End time must be after start time",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(slotMinutes) ||
      slotMinutes < 5 ||
      slotMinutes > 120
    ) {
      return Response.json(
        {
          success: false,
          message: "Slot duration must be 5 to 120 minutes",
        },
        { status: 400 },
      );
    }

    const location =
      await prisma.clinicLocation.findFirst({
        where: {
          id: locationId,
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!location) {
      return Response.json(
        {
          success: false,
          message: "Clinic location not found",
        },
        { status: 404 },
      );
    }

    const existing =
      await prisma.doctorAvailability.findMany({
        where: {
          dayOfWeek: {
            in: days,
          },
          active: true,
        },
        include: {
          location: {
            select: {
              name: true,
            },
          },
        },
      });

    const conflict = existing.find(
      (item) =>
        minutes(startTime) < minutes(item.endTime) &&
        minutes(endTime) > minutes(item.startTime),
    );

    if (conflict) {
      return Response.json(
        {
          success: false,
          message:
            `${dayNames[conflict.dayOfWeek]} ${startTime}-${endTime} overlaps with ` +
            `${conflict.location?.name || "another clinic"} ` +
            `(${conflict.startTime}-${conflict.endTime})`,
        },
        { status: 409 },
      );
    }

    const availability = await prisma.$transaction(
      days.map((dayOfWeek) =>
        prisma.doctorAvailability.create({
          data: {
            locationId,
            dayOfWeek,
            startTime,
            endTime,
            slotMinutes,
            label: label || null,
            active: true,
          },
          include: {
            location: true,
          },
        }),
      ),
    );

    return Response.json(
      {
        success: true,
        availability,
        count: availability.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE AVAILABILITY ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to create availability",
      },
      { status: 500 },
    );
  }
}
