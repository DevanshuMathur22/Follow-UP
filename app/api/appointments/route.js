import crypto from "crypto";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { readJsonBody } from "../../../src/lib/requestBody";
import { validObjectId } from "../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import { resolveDoctorSchedule } from "../../../src/lib/doctorSchedule";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

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

function makeBookingCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `APT-${stamp}-${random}`;
}

function scheduledDate(dateKey, startTime) {
  return new Date(`${dateKey}T${startTime}:00+05:30`);
}

async function findValidSlot(
  dateKey,
  locationId,
  startTime,
) {
  const schedule =
    await resolveDoctorSchedule(dateKey, {
      locationId,
    });

  if (schedule.mode === "unavailable") {
    return null;
  }

  for (const session of schedule.sessions) {
    const start = toMinutes(session.startTime);
    const end = toMinutes(session.endTime);
    const duration = Number(
      session.slotMinutes || 10,
    );

    for (
      let current = start;
      current + duration <= end;
      current += duration
    ) {
      const candidate = fromMinutes(current);

      if (candidate === startTime) {
        return {
          startTime: candidate,
          endTime: fromMinutes(
            current + duration,
          ),
          slotMinutes: duration,
          mode: schedule.mode,
        };
      }
    }
  }

  return null;
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

    const date = searchParams.get("date");
    const locationId = searchParams.get("location");
    const patientId = searchParams.get("patient");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    if (date && !validDateKey(date)) {
      return Response.json(
        {
          success: false,
          message: "Invalid date",
        },
        { status: 400 },
      );
    }

    if (locationId && !validObjectId(locationId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid location",
        },
        { status: 400 },
      );
    }

    if (patientId && !validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient",
        },
        { status: 400 },
      );
    }

    const appointments =
      await prisma.appointment.findMany({
        where: {
          ...(date
            ? {
                dateKey: date,
              }
            : {}),
          ...(locationId
            ? {
                locationId,
              }
            : {}),
          ...(patientId
            ? {
                patientId,
              }
            : {}),
          ...(status
            ? {
                status,
              }
            : {}),
          ...(category
            ? {
                category,
              }
            : {}),
        },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              fullName: true,
              age: true,
              gender: true,
              mobile: true,
              whatsapp: true,
              category: true,
              diagnosis: true,
              city: true,
            },
          },
          location: true,
        },
        orderBy: [
          {
            scheduledAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        take: 500,
      });

    return Response.json({
      success: true,
      appointments,
      count: appointments.length,
    });
  } catch (error) {
    console.error("GET APPOINTMENTS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load appointments",
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

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const patientId = String(body.patientId || "");
    const locationId = String(body.locationId || "");
    const dateKey = String(body.dateKey || "");
    const startTime = String(body.startTime || "");
    const category = String(body.category || "")
      .trim()
      .slice(0, 100);

    const visitType = String(
      body.visitType || "consultation",
    )
      .trim()
      .toLowerCase()
      .slice(0, 100);

    const priority = String(
      body.priority || "normal",
    )
      .trim()
      .toLowerCase()
      .slice(0, 30);

    const reason =
      String(body.reason || "").trim().slice(0, 1000) ||
      null;

    const notes =
      String(body.notes || "").trim().slice(0, 2000) ||
      null;

    if (!validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Select a valid patient",
        },
        { status: 400 },
      );
    }

    if (!validObjectId(locationId)) {
      return Response.json(
        {
          success: false,
          message: "Select a valid location",
        },
        { status: 400 },
      );
    }

    if (!validDateKey(dateKey)) {
      return Response.json(
        {
          success: false,
          message: "Select a valid appointment date",
        },
        { status: 400 },
      );
    }

    if (!validTime(startTime)) {
      return Response.json(
        {
          success: false,
          message: "Select a valid appointment slot",
        },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        category: true,
      },
    });

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 },
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
          message: "Clinic location not available",
        },
        { status: 404 },
      );
    }

    const slot = await findValidSlot(
      dateKey,
      locationId,
      startTime,
    );

    if (!slot) {
      return Response.json(
        {
          success: false,
          message:
            "This time is not available in the doctor's schedule",
        },
        { status: 409 },
      );
    }

    const key = makeSlotKey(
      locationId,
      dateKey,
      slot.startTime,
    );

    const existing =
      await prisma.appointment.findUnique({
        where: {
          slotKey: key,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (existing) {
      return Response.json(
        {
          success: false,
          message: "This appointment slot is already booked",
        },
        { status: 409 },
      );
    }

    try {
      const appointment =
        await prisma.appointment.create({
          data: {
            bookingCode: makeBookingCode(),
            patientId,
            locationId,
            dateKey,
            startTime: slot.startTime,
            endTime: slot.endTime,
            scheduledAt: scheduledDate(
              dateKey,
              slot.startTime,
            ),
            slotKey: key,
            category:
              category || patient.category || "Other",
            visitType,
            status: "Booked",
            priority,
            reason,
            notes,
            source: "internal",
            createdById: user.id || null,
          },
          include: {
            patient: true,
            location: true,
          },
        });

      return Response.json(
        {
          success: true,
          appointment,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error?.code === "P2002") {
        return Response.json(
          {
            success: false,
            message:
              "This appointment slot was just booked",
          },
          { status: 409 },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("CREATE APPOINTMENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to create appointment",
      },
      { status: 500 },
    );
  }
}
