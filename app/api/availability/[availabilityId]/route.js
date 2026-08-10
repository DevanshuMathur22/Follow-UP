import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import { readJsonBody } from "../../../../src/lib/requestBody";
import { validObjectId } from "../../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function minutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

export async function PATCH(request, { params }) {
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

    const { availabilityId } = await params;

    if (!validObjectId(availabilityId)) {
      return Response.json(
        { success: false, message: "Invalid availability ID" },
        { status: 400 },
      );
    }

    const current = await prisma.doctorAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!current) {
      return Response.json(
        { success: false, message: "Availability not found" },
        { status: 404 },
      );
    }

    const { data: body, error: bodyError } = await readJsonBody(request);
    if (bodyError) return bodyError;

    const locationId =
      body.locationId !== undefined
        ? body.locationId
        : current.locationId;

    const dayOfWeek =
      body.dayOfWeek !== undefined
        ? Number(body.dayOfWeek)
        : current.dayOfWeek;

    const startTime =
      body.startTime !== undefined
        ? String(body.startTime)
        : current.startTime;

    const endTime =
      body.endTime !== undefined
        ? String(body.endTime)
        : current.endTime;

    const slotMinutes =
      body.slotMinutes !== undefined
        ? Number(body.slotMinutes)
        : current.slotMinutes;

    if (!validObjectId(locationId)) {
      return Response.json(
        { success: false, message: "Invalid clinic location" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return Response.json(
        { success: false, message: "Invalid day" },
        { status: 400 },
      );
    }

    if (!validTime(startTime) || !validTime(endTime)) {
      return Response.json(
        { success: false, message: "Invalid start or end time" },
        { status: 400 },
      );
    }

    if (minutes(startTime) >= minutes(endTime)) {
      return Response.json(
        { success: false, message: "End time must be after start time" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(slotMinutes) ||
      slotMinutes < 5 ||
      slotMinutes > 120
    ) {
      return Response.json(
        { success: false, message: "Invalid slot duration" },
        { status: 400 },
      );
    }

    const location = await prisma.clinicLocation.findFirst({
      where: {
        id: locationId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!location) {
      return Response.json(
        { success: false, message: "Clinic location not found" },
        { status: 404 },
      );
    }

    const overlapping = await prisma.doctorAvailability.findMany({
      where: {
        id: { not: availabilityId },
        dayOfWeek,
        active: true,
      },
      select: {
        startTime: true,
        endTime: true,
        location: {
          select: {
            name: true,
          },
        },
      },
    });

    const conflict = overlapping.find(
      (item) =>
        minutes(startTime) < minutes(item.endTime) &&
        minutes(endTime) > minutes(item.startTime),
    );

    if (conflict) {
      return Response.json(
        {
          success: false,
          message:
            `This time overlaps with ${conflict.location?.name || "another clinic"} ` +
            `(${conflict.startTime} - ${conflict.endTime})`,
        },
        { status: 409 },
      );
    }

    const availability = await prisma.doctorAvailability.update({
      where: { id: availabilityId },
      data: {
        locationId,
        dayOfWeek,
        startTime,
        endTime,
        slotMinutes,
        active:
          body.active === undefined
            ? current.active
            : Boolean(body.active),
        label:
          body.label === undefined
            ? current.label
            : String(body.label || "").trim().slice(0, 120) || null,
      },
      include: {
        location: true,
      },
    });

    return Response.json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error("UPDATE AVAILABILITY ERROR:", error);

    return Response.json(
      { success: false, message: "Failed to update availability" },
      { status: 500 },
    );
  }
}
