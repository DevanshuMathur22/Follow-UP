import prisma from "../../../../src/lib/prisma";

const statuses = ["Scheduled", "Completed", "Cancelled"];
const priorities = ["low", "medium", "high"];
const types = ["call", "visit", "message", "email"];

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function parseDate(value) {
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

export async function PATCH(request, { params }) {
  try {
    const { followUpId } = await params;

    if (!validObjectId(followUpId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid follow-up ID",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.followUp.findUnique({
      where: {
        id: followUpId,
      },
    });

    if (!existing) {
      return Response.json(
        {
          success: false,
          message: "Follow-up not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates = {};

    if (body.status !== undefined) {
      if (!statuses.includes(body.status)) {
        return Response.json(
          {
            success: false,
            message: "Invalid follow-up status",
          },
          { status: 400 }
        );
      }

      updates.status = body.status;
    }

    if (body.dueDate !== undefined) {
      const dueDate = parseDate(body.dueDate);

      if (!dueDate) {
        return Response.json(
          {
            success: false,
            message: "Invalid due date",
          },
          { status: 400 }
        );
      }

      updates.dueDate = dueDate;
    }

    if (body.type !== undefined) {
      const type = String(body.type).toLowerCase();

      if (!types.includes(type)) {
        return Response.json(
          {
            success: false,
            message: "Invalid follow-up type",
          },
          { status: 400 }
        );
      }

      updates.type = type;
    }

    if (body.priority !== undefined) {
      const priority = String(body.priority).toLowerCase();

      if (!priorities.includes(priority)) {
        return Response.json(
          {
            success: false,
            message: "Invalid priority",
          },
          { status: 400 }
        );
      }

      updates.priority = priority;
    }

    if (body.source !== undefined) {
      const source = String(body.source).toLowerCase();

      if (!["manual", "category"].includes(source)) {
        return Response.json(
          {
            success: false,
            message: "Invalid follow-up source",
          },
          { status: 400 }
        );
      }

      updates.source = source;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes ? String(body.notes).trim() : null;
    }

    if (body.outcome !== undefined) {
      updates.outcome = body.outcome ? String(body.outcome).trim() : null;
    }

    if (body.completedAt !== undefined) {
      if (!body.completedAt) {
        updates.completedAt = null;
      } else {
        const completedAt = parseDate(body.completedAt);

        if (!completedAt) {
          return Response.json(
            {
              success: false,
              message: "Invalid completion date",
            },
            { status: 400 }
          );
        }

        updates.completedAt = completedAt;
      }
    }

    if (updates.status === "Completed" && body.completedAt === undefined) {
      updates.completedAt = new Date();
    }

    if (updates.status === "Scheduled") {
      updates.completedAt = null;
    }

    const followUp = await prisma.followUp.update({
      where: {
        id: followUpId,
      },
      data: updates,
      include: {
        patient: true,
      },
    });

    let nextFollowUp = null;

    if (body.nextDueDate) {
      const nextDueDate = parseDate(body.nextDueDate);

      if (!nextDueDate) {
        return Response.json(
          {
            success: false,
            message: "Invalid next follow-up date",
          },
          { status: 400 }
        );
      }

      nextFollowUp = await prisma.followUp.create({
        data: {
          patientId: existing.patientId,
          dueDate: nextDueDate,
          type: body.nextType || existing.type || "call",
          priority: body.nextPriority || existing.priority || "medium",
          status: "Scheduled",
          notes: body.nextNotes
            ? String(body.nextNotes).trim()
            : "Next follow-up after previous completion",
        },
        include: {
          patient: true,
        },
      });
    }

    await syncPatientNextFollowUp(existing.patientId);

    return Response.json({
      success: true,
      followUp,
      nextFollowUp,
    });
  } catch (error) {
    console.error("UPDATE FOLLOW UP ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to update follow-up",
      },
      { status: 500 }
    );
  }
}
