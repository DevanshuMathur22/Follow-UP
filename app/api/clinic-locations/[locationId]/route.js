import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

function clean(value, maxLength = 300) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function canManage(user) {
  return hasPermission(
    user.role,
    permissions.MANAGE_AVAILABILITY,
  );
}

export async function PATCH(
  request,
  { params },
) {
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

    if (!canManage(user)) {
      return forbiddenResponse();
    }

    const { locationId } = await params;
    const body = await request.json();

    const current =
      await prisma.clinicLocation.findUnique({
        where: { id: locationId },
      });

    if (!current) {
      return Response.json(
        {
          success: false,
          message: "Location not found",
        },
        { status: 404 },
      );
    }

    const data = {};

    if (body.name !== undefined) {
      const name = clean(body.name, 160);

      if (!name) {
        return Response.json(
          {
            success: false,
            message:
              "Clinic name is required",
          },
          { status: 400 },
        );
      }

      data.name = name;
    }

    if (body.city !== undefined) {
      const city = clean(body.city, 120);

      if (!city) {
        return Response.json(
          {
            success: false,
            message: "City is required",
          },
          { status: 400 },
        );
      }

      data.city = city;
    }

    if (body.address !== undefined) {
      data.address =
        clean(body.address, 500) || null;
    }

    if (body.phone !== undefined) {
      data.phone =
        clean(body.phone, 40) || null;
    }

    if (
      body.defaultSlotMinutes !== undefined
    ) {
      const minutes = Number(
        body.defaultSlotMinutes,
      );

      if (
        !Number.isInteger(minutes) ||
        minutes < 5 ||
        minutes > 120
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Slot duration must be 5–120 minutes",
          },
          { status: 400 },
        );
      }

      data.defaultSlotMinutes = minutes;
    }

    const location =
      await prisma.clinicLocation.update({
        where: { id: locationId },
        data,
      });

    return Response.json({
      success: true,
      location,
    });
  } catch (error) {
    console.error(
      "UPDATE CLINIC LOCATION ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to update clinic location",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request,
  { params },
) {
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

    if (!canManage(user)) {
      return forbiddenResponse();
    }

    const { locationId } = await params;

    const location =
      await prisma.clinicLocation.findUnique({
        where: { id: locationId },
      });

    if (!location) {
      return Response.json(
        {
          success: false,
          message: "Location not found",
        },
        { status: 404 },
      );
    }

    const activeAppointments =
      await prisma.appointment.count({
        where: {
          locationId,
          status: {
            notIn: [
              "Completed",
              "Cancelled",
              "No-show",
            ],
          },
        },
      });

    if (activeAppointments > 0) {
      return Response.json(
        {
          success: false,
          message:
            "This location has active appointments. Complete or cancel them before deleting the location.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.doctorAvailability.updateMany({
        where: { locationId },
        data: { active: false },
      }),
      prisma.doctorScheduleOverrideSession.updateMany({
        where: { locationId },
        data: { active: false },
      }),
      prisma.clinicLocation.update({
        where: { id: locationId },
        data: { active: false },
      }),
    ]);

    return Response.json({
      success: true,
      location: {
        ...location,
        active: false,
      },
    });
  } catch (error) {
    console.error(
      "DELETE CLINIC LOCATION ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to delete clinic location",
      },
      { status: 500 },
    );
  }
}
