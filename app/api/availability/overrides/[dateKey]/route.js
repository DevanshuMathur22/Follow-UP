import { getSessionUser } from "../../../../../src/lib/auth";
import prisma from "../../../../../src/lib/prisma";
import { readJsonBody } from "../../../../../src/lib/requestBody";
import { validObjectId } from "../../../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../../src/lib/permissions";

function validDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function minutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

async function authorizedUser() {
  const user = await getSessionUser();

  if (!user) {
    return {
      error: Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  if (
    !hasPermission(
      user.role,
      permissions.MANAGE_AVAILABILITY,
    )
  ) {
    return {
      error: forbiddenResponse(),
    };
  }

  return { user };
}

export async function PUT(request, { params }) {
  const originError = validateWriteOrigin(request);
  if (originError) return originError;

  try {
    const auth = await authorizedUser();
    if (auth.error) return auth.error;

    const { dateKey } = await params;

    if (!validDateKey(dateKey)) {
      return Response.json(
        { success: false, message: "Invalid date" },
        { status: 400 },
      );
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const mode = String(body.mode || "").toLowerCase();

    if (!["unavailable", "custom"].includes(mode)) {
      return Response.json(
        {
          success: false,
          message: "Mode must be unavailable or custom",
        },
        { status: 400 },
      );
    }

    const note =
      String(body.note || "").trim().slice(0, 500) || null;

    let sessions = [];

    if (mode === "custom") {
      if (!Array.isArray(body.sessions) || !body.sessions.length) {
        return Response.json(
          {
            success: false,
            message: "Add at least one custom session",
          },
          { status: 400 },
        );
      }

      sessions = body.sessions.map((item) => ({
        locationId: item.locationId,
        startTime: String(item.startTime || ""),
        endTime: String(item.endTime || ""),
        slotMinutes: Number(item.slotMinutes || 10),
        label:
          String(item.label || "").trim().slice(0, 120) || null,
      }));

      for (const session of sessions) {
        if (!validObjectId(session.locationId)) {
          return Response.json(
            {
              success: false,
              message: "Invalid clinic location",
            },
            { status: 400 },
          );
        }

        if (
          !validTime(session.startTime) ||
          !validTime(session.endTime)
        ) {
          return Response.json(
            {
              success: false,
              message: "Invalid session time",
            },
            { status: 400 },
          );
        }

        if (
          minutes(session.startTime) >= minutes(session.endTime)
        ) {
          return Response.json(
            {
              success: false,
              message: "Session end time must be after start time",
            },
            { status: 400 },
          );
        }

        if (
          !Number.isInteger(session.slotMinutes) ||
          session.slotMinutes < 5 ||
          session.slotMinutes > 120
        ) {
          return Response.json(
            {
              success: false,
              message: "Slot duration must be 5 to 120 minutes",
            },
            { status: 400 },
          );
        }
      }

      const uniqueLocationIds = [
        ...new Set(sessions.map((item) => item.locationId)),
      ];

      const locations = await prisma.clinicLocation.findMany({
        where: {
          id: {
            in: uniqueLocationIds,
          },
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (locations.length !== uniqueLocationIds.length) {
        return Response.json(
          {
            success: false,
            message: "One or more clinic locations are unavailable",
          },
          { status: 400 },
        );
      }

      const sorted = [...sessions].sort(
        (a, b) =>
          minutes(a.startTime) - minutes(b.startTime),
      );

      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];

        if (
          minutes(current.startTime) < minutes(previous.endTime)
        ) {
          return Response.json(
            {
              success: false,
              message: "Custom sessions cannot overlap",
            },
            { status: 409 },
          );
        }
      }
    }

    const existing =
      await prisma.doctorScheduleOverride.findUnique({
        where: {
          dateKey,
        },
        select: {
          id: true,
        },
      });

    let override;

    if (existing) {
      override = await prisma.$transaction(async (tx) => {
        await tx.doctorScheduleOverrideSession.deleteMany({
          where: {
            overrideId: existing.id,
          },
        });

        await tx.doctorScheduleOverride.update({
          where: {
            id: existing.id,
          },
          data: {
            mode,
            note,
          },
        });

        if (mode === "custom") {
          for (const session of sessions) {
            await tx.doctorScheduleOverrideSession.create({
              data: {
                overrideId: existing.id,
                locationId: session.locationId,
                startTime: session.startTime,
                endTime: session.endTime,
                slotMinutes: session.slotMinutes,
                label: session.label,
                active: true,
              },
            });
          }
        }

        return tx.doctorScheduleOverride.findUnique({
          where: {
            id: existing.id,
          },
          include: {
            sessions: {
              include: {
                location: true,
              },
              orderBy: {
                startTime: "asc",
              },
            },
          },
        });
      });
    } else {
      override = await prisma.doctorScheduleOverride.create({
        data: {
          dateKey,
          mode,
          note,
          sessions:
            mode === "custom"
              ? {
                  create: sessions.map((session) => ({
                    locationId: session.locationId,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    slotMinutes: session.slotMinutes,
                    label: session.label,
                    active: true,
                  })),
                }
              : undefined,
        },
        include: {
          sessions: {
            include: {
              location: true,
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
      });
    }

    return Response.json({
      success: true,
      override,
    });
  } catch (error) {
    console.error("SAVE SCHEDULE OVERRIDE ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to save schedule override",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  const originError = validateWriteOrigin(request);
  if (originError) return originError;

  try {
    const auth = await authorizedUser();
    if (auth.error) return auth.error;

    const { dateKey } = await params;

    if (!validDateKey(dateKey)) {
      return Response.json(
        { success: false, message: "Invalid date" },
        { status: 400 },
      );
    }

    const existing =
      await prisma.doctorScheduleOverride.findUnique({
        where: {
          dateKey,
        },
      });

    if (!existing) {
      return Response.json({
        success: true,
        restored: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.doctorScheduleOverrideSession.deleteMany({
        where: {
          overrideId: existing.id,
        },
      });

      await tx.doctorScheduleOverride.delete({
        where: {
          id: existing.id,
        },
      });
    });

    return Response.json({
      success: true,
      restored: true,
    });
  } catch (error) {
    console.error("DELETE SCHEDULE OVERRIDE ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to restore weekly schedule",
      },
      { status: 500 },
    );
  }
}
