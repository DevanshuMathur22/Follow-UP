import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { logActivity } from "../../../src/lib/activityLog";

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function syncPatientNextFollowUp(patientId) {
  const next = await prisma.followUp.findFirst({
    where: {
      patientId,
      status: "Scheduled",
    },
    orderBy: {
      dueDate: "asc",
    },
    select: {
      dueDate: true,
    },
  });

  await prisma.patient.update({
    where: {
      id: patientId,
    },
    data: {
      nextFollowUp: next?.dueDate || null,
    },
  });
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

    const followUps = await prisma.followUp.findMany({
      include: {
        patient: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return Response.json({
      success: true,
      followUps,
    });
  } catch (error) {
    console.error("GET FOLLOW UPS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load follow-ups",
      },
      { status: 500 }
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

    const body = await request.json();

    const patientId = body.patient || body.patientId;
    const dueDate = validDate(body.dueDate);

    if (!validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient ID",
        },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return Response.json(
        {
          success: false,
          message: "Valid due date is required",
        },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 }
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        patientId,
        dueDate,
        type: body.type || "call",
        priority: body.priority || "medium",
        status: "Scheduled",
        source: "manual",
        notes: body.notes ? String(body.notes).trim() : null,
      },
      include: {
        patient: true,
      },
    });

    await syncPatientNextFollowUp(patientId);

    await logActivity({
      actor: sessionUser,
      module: "follow-up",
      action: "scheduled",
      title: "Follow-up scheduled",
      description: `${followUp.patient?.fullName || "Patient"} · ${followUp.type}`,
      patientId,
      recordId: followUp.id,
      relatedPath: `/patients/${patientId}`,
    });

    return Response.json(
      {
        success: true,
        followUp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE FOLLOW UP ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to create follow-up",
      },
      { status: 500 }
    );
  }
}
