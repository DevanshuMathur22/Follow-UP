import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import { validObjectId } from "../../../../src/lib/inputValidation";
import { resolveDoctorSchedule } from "../../../../src/lib/doctorSchedule";

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

function makeSlotKey(locationId, dateKey, startTime) {
  return `${locationId}:${dateKey}:${startTime}`;
}

function generateSessionSlots(session, dateKey, source) {
  const start = toMinutes(session.startTime);
  const end = toMinutes(session.endTime);
  const duration = Number(session.slotMinutes || 10);

  const result = [];

  for (
    let current = start;
    current + duration <= end;
    current += duration
  ) {
    const startTime = fromMinutes(current);
    const endTime = fromMinutes(current + duration);

    result.push({
      slotKey: makeSlotKey(
        session.locationId,
        dateKey,
        startTime,
      ),
      dateKey,
      locationId: session.locationId,
      locationName: session.location?.name || "Clinic",
      city: session.location?.city || "",
      startTime,
      endTime,
      slotMinutes: duration,
      label: session.label || null,
      source,
    });
  }

  return result;
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

    const { searchParams } = new URL(request.url);

    const dateKey = searchParams.get("date");
    const locationId = searchParams.get("location");

    if (!validDateKey(dateKey)) {
      return Response.json(
        {
          success: false,
          message: "Valid appointment date is required",
        },
        { status: 400 },
      );
    }

    if (locationId && !validObjectId(locationId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid clinic location",
        },
        { status: 400 },
      );
    }

    const schedule =
      await resolveDoctorSchedule(dateKey, {
        locationId,
      });

    const {
      mode,
      note,
      sessions,
    } = schedule;

    if (mode === "unavailable") {
      return Response.json({
        success: true,
        dateKey,
        mode: "unavailable",
        note: note || null,
        slots: [],
        bookedCount: 0,
        availableCount: 0,
      });
    }

    const allSlots = sessions.flatMap((session) =>
      generateSessionSlots(session, dateKey, mode),
    );

    const appointments = await prisma.appointment.findMany({
      where: {
        dateKey,
        status: {
          not: "Cancelled",
        },
        ...(locationId
          ? {
              locationId,
            }
          : {}),
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
    });

    const bookedMap = new Map(
      appointments.map((appointment) => [
        appointment.slotKey,
        appointment,
      ]),
    );

    const slots = allSlots.map((slot) => {
      const appointment = bookedMap.get(slot.slotKey);

      return {
        ...slot,
        available: !appointment,
        appointment: appointment
          ? {
              id: appointment.id,
              bookingCode: appointment.bookingCode,
              status: appointment.status,
              patientId: appointment.patientId,
              patientName:
                appointment.patient?.fullName || "Patient",
            }
          : null,
      };
    });

    const filteredSlots = locationId
      ? slots
      : slots.sort((a, b) => {
          const locationCompare =
            a.locationName.localeCompare(b.locationName);

          if (locationCompare !== 0) {
            return locationCompare;
          }

          return a.startTime.localeCompare(b.startTime);
        });

    return Response.json({
      success: true,
      dateKey,
      mode,
      note: note || null,
      slots: filteredSlots,
      availableCount: filteredSlots.filter(
        (slot) => slot.available,
      ).length,
      bookedCount: filteredSlots.filter(
        (slot) => !slot.available,
      ).length,
    });
  } catch (error) {
    console.error("GET APPOINTMENT SLOTS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load appointment slots",
      },
      { status: 500 },
    );
  }
}
