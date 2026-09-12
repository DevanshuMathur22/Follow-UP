import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import { validObjectId } from "../../../../src/lib/inputValidation";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

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

function dateKeys(startKey, count = 180) {
  const start = new Date(`${startKey}T00:00:00Z`);

  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

function dateInfo(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);

  return {
    dayOfWeek: date.getUTCDay(),
    weekOfMonth: Math.ceil(date.getUTCDate() / 7),
  };
}

function toMinutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function fromMinutes(value) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0",
  )}`;
}

function makeSlots(session, dateKey, source) {
  const start = toMinutes(session.startTime);
  const end = toMinutes(session.endTime);
  const duration = Number(session.slotMinutes || 10);
  const slots = [];

  for (
    let current = start;
    current + duration <= end;
    current += duration
  ) {
    const startTime = fromMinutes(current);

    slots.push({
      slotKey: `${session.locationId}:${dateKey}:${startTime}`,
      dateKey,
      locationId: session.locationId,
      locationName: session.location?.name || "Location",
      city: session.location?.city || "",
      startTime,
      endTime: fromMinutes(current + duration),
      slotMinutes: duration,
      label: session.label || null,
      source,
    });
  }

  return slots;
}

export async function GET(request) {
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
        permissions.MANAGE_APPOINTMENTS,
      )
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const locationIds = String(
      searchParams.get("locations") || "",
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!validDateKey(start)) {
      return Response.json(
        {
          success: false,
          message: "Valid start date is required",
        },
        { status: 400 },
      );
    }

    if (
      !locationIds.length ||
      locationIds.length > 50 ||
      locationIds.some((id) => !validObjectId(id))
    ) {
      return Response.json(
        {
          success: false,
          message: "Valid clinic locations are required",
        },
        { status: 400 },
      );
    }

    const dates = dateKeys(start);

    const [overrides, availability, appointments] =
      await Promise.all([
        prisma.doctorScheduleOverride.findMany({
          where: {
            dateKey: {
              in: dates,
            },
          },
          include: {
            sessions: {
              where: {
                active: true,
              },
              include: {
                location: true,
              },
              orderBy: {
                startTime: "asc",
              },
            },
          },
        }),

        prisma.doctorAvailability.findMany({
          where: {
            active: true,
          },
          include: {
            location: true,
          },
          orderBy: {
            startTime: "asc",
          },
        }),

        prisma.appointment.findMany({
          where: {
            dateKey: {
              in: dates,
            },
            locationId: {
              in: locationIds,
            },
            status: {
              not: "Cancelled",
            },
          },
          select: {
            id: true,
            bookingCode: true,
            slotKey: true,
            status: true,
            patientId: true,
            patient: {
              select: {
                fullName: true,
              },
            },
          },
        }),
      ]);

    const overrideMap = new Map(
      overrides.map((item) => [item.dateKey, item]),
    );

    const bookedMap = new Map(
      appointments.map((appointment) => [
        appointment.slotKey,
        appointment,
      ]),
    );

    const result = {};

    for (const locationId of locationIds) {
      const foundDates = [];
      const slotsByDate = {};

      for (const dateKey of dates) {
        if (foundDates.length >= 5) break;

        const override = overrideMap.get(dateKey);
        let sessions = [];
        let mode = "weekly";

        if (override?.mode === "unavailable") {
          continue;
        }

        if (override?.mode === "custom") {
          mode = "custom";
          sessions = (override.sessions || []).filter(
            (item) =>
              item.location?.active !== false &&
              item.locationId === locationId,
          );
        } else {
          const { dayOfWeek, weekOfMonth } =
            dateInfo(dateKey);

          const monthly = availability.filter(
            (item) =>
              item.location?.active !== false &&
              item.recurrenceType === "monthly" &&
              item.dayOfWeek === dayOfWeek &&
              item.weekOfMonth === weekOfMonth,
          );

          if (monthly.length) {
            mode = "monthly";
            sessions = monthly.filter(
              (item) => item.locationId === locationId,
            );
          } else {
            sessions = availability.filter(
              (item) =>
                item.location?.active !== false &&
                item.recurrenceType === "weekly" &&
                item.dayOfWeek === dayOfWeek &&
                item.locationId === locationId,
            );
          }
        }

        if (!sessions.length) continue;

        const slots = sessions
          .flatMap((session) =>
            makeSlots(session, dateKey, mode),
          )
          .map((slot) => {
            const appointment = bookedMap.get(
              slot.slotKey,
            );

            return {
              ...slot,
              available: !appointment,
              appointment: appointment
                ? {
                    id: appointment.id,
                    bookingCode:
                      appointment.bookingCode,
                    status: appointment.status,
                    patientId:
                      appointment.patientId,
                    patientName:
                      appointment.patient?.fullName ||
                      "Patient",
                  }
                : null,
            };
          });

        if (!slots.length) continue;

        slotsByDate[dateKey] = slots;

        foundDates.push({
          dateKey,
          availableCount: slots.filter(
            (slot) => slot.available,
          ).length,
        });
      }

      result[locationId] = {
        dates: foundDates,
        slotsByDate,
      };
    }

    return Response.json({
      success: true,
      start,
      locations: result,
    });
  } catch (error) {
    console.error(
      "GET APPOINTMENT BOOKING OPTIONS ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to load booking options",
      },
      { status: 500 },
    );
  }
}
