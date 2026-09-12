import { getSessionUser } from "../../../../../src/lib/auth";
import prisma from "../../../../../src/lib/prisma";
import { validObjectId } from "../../../../../src/lib/inputValidation";
import { readJsonBody } from "../../../../../src/lib/requestBody";
import { validateWriteOrigin } from "../../../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../../src/lib/permissions";

const fields = [
  "bloodPressure",
  "pulse",
  "spo2",
  "temperature",
  "height",
  "weight",
  "complaints",
  "historyOfPresentIllness",
  "pastFamilyHistory",
  "personalHistory",
  "investigations",
  "examination",
  "allergies",
  "provisionalDiagnosis",
  "assistantNotes",
];

function clean(value) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 4000) : null;
}

function normalizeSuggestion(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function splitSuggestions(value) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function suggestionItems(values) {
  const items = [];
  const seen = new Set();

  function add(type, value) {
    const text = String(value || "").trim();
    const normalized = normalizeSuggestion(text);

    if (!text || !normalized) return;

    const key = `${type}:${normalized}`;
    if (seen.has(key)) return;

    seen.add(key);

    items.push({
      type,
      value: text,
      normalized,
      searchText: normalized,
    });
  }

  add(
    "diagnosis",
    values.provisionalDiagnosis,
  );

  splitSuggestions(
    values.complaints,
  ).forEach((value) =>
    add("complaint", value),
  );

  add(
    "history",
    values.historyOfPresentIllness,
  );

  add(
    "pastHistory",
    values.pastFamilyHistory,
  );

  add(
    "history",
    values.personalHistory,
  );

  splitSuggestions(
    values.examination,
  ).forEach((value) =>
    add("examination", value),
  );

  splitSuggestions(
    values.investigations,
  ).forEach((value) =>
    add("test", value),
  );

  return items;
}

async function learnSuggestions(values, userId) {
  const items = suggestionItems(values);

  if (!items.length) return;

  const now = new Date();

  await Promise.all(
    items.map((item) =>
      prisma.prescriptionSuggestion.upsert({
        where: {
          type_normalized: {
            type: item.type,
            normalized: item.normalized,
          },
        },
        create: {
          ...item,
          usageCount: 1,
          active: true,
          firstUsedAt: now,
          lastUsedAt: now,
          createdById: userId || null,
        },
        update: {
          value: item.value,
          searchText: item.searchText,
          active: true,
          usageCount: {
            increment: 1,
          },
          lastUsedAt: now,
        },
      }),
    ),
  );
}

async function authorize() {
  const user = await getSessionUser();

  if (!user) {
    return {
      error: Response.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      ),
    };
  }

  if (
    !hasPermission(
      user.role,
      permissions.MANAGE_APPOINTMENTS,
    )
  ) {
    return { error: forbiddenResponse() };
  }

  return { user };
}

export async function GET(
  request,
  { params },
) {
  try {
    const { error } = await authorize();
    if (error) return error;

    const { appointmentId } = await params;

    if (!validObjectId(appointmentId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid appointment",
        },
        { status: 400 },
      );
    }

    const appointment =
      await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          patientId: true,
          scheduledAt: true,
          dateKey: true,
          startTime: true,
          status: true,
          preVisitIntake: true,
        },
      });

    if (!appointment) {
      return Response.json(
        {
          success: false,
          message: "Appointment not found",
        },
        { status: 404 },
      );
    }

    const [
      previousAppointment,
    ] = await Promise.all([
      prisma.appointment.findFirst({
        where: {
          patientId: appointment.patientId,
          id: {
            not: appointment.id,
          },
          scheduledAt: {
            lt: appointment.scheduledAt,
          },
          status: "Completed",
        },
        orderBy: {
          scheduledAt: "desc",
        },
        select: {
          id: true,
          dateKey: true,
          startTime: true,
          scheduledAt: true,
          status: true,
          preVisitIntake: true,
        },
      }),
    ]);

    const previousVisit =
      previousAppointment
        ? {
            appointment: {
              id: previousAppointment.id,
              dateKey:
                previousAppointment.dateKey,
              startTime:
                previousAppointment.startTime,
              scheduledAt:
                previousAppointment.scheduledAt,
              status:
                previousAppointment.status,
            },
            intake:
              previousAppointment.preVisitIntake ||
              null,
          }
        : null;

    return Response.json({
      success: true,
      intake:
        appointment.preVisitIntake || null,
      previousVisit,
    });
  } catch (error) {
    console.error(
      "GET INTAKE ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to load pre-consultation",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request,
  { params },
) {
  const originError = validateWriteOrigin(request);
  if (originError) return originError;

  try {
    const { user, error } = await authorize();
    if (error) return error;

    const { appointmentId } = await params;

    if (!validObjectId(appointmentId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid appointment",
        },
        { status: 400 },
      );
    }

    const appointment =
      await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          patientId: true,
        },
      });

    if (!appointment) {
      return Response.json(
        {
          success: false,
          message: "Appointment not found",
        },
        { status: 404 },
      );
    }

    const { data, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const values = {};

    for (const field of fields) {
      if (data[field] !== undefined) {
        values[field] = clean(data[field]);
      }
    }

    const intake =
      await prisma.preVisitIntake.upsert({
        where: { appointmentId },
        update: values,
        create: {
          appointmentId,
          patientId: appointment.patientId,
          createdById: user.id || null,
          ...values,
        },
      });

    if (data.learnSuggestions === true) {
      try {
        await learnSuggestions(
          values,
          user.id,
        );
      } catch (learningError) {
        console.error(
          "INTAKE SUGGESTION LEARNING ERROR:",
          learningError,
        );
      }
    }

    return Response.json({
      success: true,
      intake,
    });
  } catch (error) {
    console.error("SAVE INTAKE ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to save pre-consultation",
      },
      { status: 500 },
    );
  }
}
