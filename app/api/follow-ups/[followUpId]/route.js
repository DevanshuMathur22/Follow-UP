import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import {
  validObjectId,
  validText,
} from "../../../../src/lib/inputValidation";
import { getSessionUser } from "../../../../src/lib/auth";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";
import prisma from "../../../../src/lib/prisma";
import { logActivity } from "../../../../src/lib/activityLog";

const statuses = ["Scheduled", "Completed", "Cancelled"];
const priorities = ["low", "medium", "high"];
const types = ["call", "visit", "message", "email"];
const sources = ["manual", "category", "prescription"];

const retryOutcomes = new Set([
  "no answer",
  "not reachable",
  "busy",
  "call back later",
]);

const noteRequiredOutcomes = new Set([
  "wrong number",
  "other",
]);

function parseOutcome(value) {
  const text = String(value || "").trim();

  if (!text) {
    return {
      type: "",
      details: "",
    };
  }

  const parts = text.split(
    /\s+[—-]\s+/,
  );

  return {
    type: String(parts[0] || "")
      .trim()
      .toLowerCase(),
    details: parts
      .slice(1)
      .join(" — ")
      .trim(),
  };
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(request, { params }) {
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

    if (
      !hasPermission(
        sessionUser.role,
        permissions.MANAGE_FOLLOW_UPS,
      )
    ) {
      return forbiddenResponse();
    }

    const { followUpId } = await params;

    if (!validObjectId(followUpId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid follow-up ID",
        },
        { status: 400 },
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
        { status: 404 },
      );
    }

    const { data: body, error: bodyError } = await readJsonBody(request);

    if (bodyError) {
      return bodyError;
    }

    const expectedUpdatedAt =
      String(body.expectedUpdatedAt || "").trim();

    if (!expectedUpdatedAt) {
      return Response.json(
        {
          success: false,
          message:
            "Follow-up is not fully loaded. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    const expectedDate =
      new Date(expectedUpdatedAt);

    if (
      Number.isNaN(expectedDate.getTime())
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid follow-up version",
        },
        { status: 400 },
      );
    }

    if (
      expectedDate.getTime() !==
      new Date(existing.updatedAt).getTime()
    ) {
      return Response.json(
        {
          success: false,
          message:
            "This follow-up was changed by another user. Refresh before continuing.",
          followUp: existing,
        },
        { status: 409 },
      );
    }

    const updates = {};

    if (body.status !== undefined) {
      if (!statuses.includes(body.status)) {
        return Response.json(
          {
            success: false,
            message: "Invalid follow-up status",
          },
          { status: 400 },
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
          { status: 400 },
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
          { status: 400 },
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
          { status: 400 },
        );
      }

      updates.priority = priority;
    }

    if (body.source !== undefined) {
      const source = String(body.source).toLowerCase();

      if (!sources.includes(source)) {
        return Response.json(
          {
            success: false,
            message: "Invalid follow-up source",
          },
          { status: 400 },
        );
      }

      updates.source = source;
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== "string") {
        return Response.json(
          {
            success: false,
            message: "Invalid notes",
          },
          { status: 400 },
        );
      }

      updates.notes = body.notes ? body.notes.trim() : null;

      if (!validText(updates.notes, 3000)) {
        return Response.json(
          {
            success: false,
            message: "Notes are too long",
          },
          { status: 400 },
        );
      }
    }

    if (body.outcome !== undefined) {
      if (body.outcome !== null && typeof body.outcome !== "string") {
        return Response.json(
          {
            success: false,
            message: "Invalid outcome",
          },
          { status: 400 },
        );
      }

      updates.outcome = body.outcome ? body.outcome.trim() : null;

      if (!validText(updates.outcome, 1000)) {
        return Response.json(
          {
            success: false,
            message: "Outcome is too long",
          },
          { status: 400 },
        );
      }
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
            { status: 400 },
          );
        }

        updates.completedAt = completedAt;
      }
    }

    const effectiveStatus = updates.status || existing.status;
    const effectiveOutcome =
      body.outcome !== undefined ? updates.outcome : existing.outcome;

    const outcomeInfo =
      parseOutcome(effectiveOutcome);

    const requiresRetry =
      retryOutcomes.has(
        outcomeInfo.type,
      );

    const requiresOutcomeNote =
      noteRequiredOutcomes.has(
        outcomeInfo.type,
      );

    if (
      body.status === "Completed" &&
      requiresRetry
    ) {
      return Response.json(
        {
          success: false,
          message:
            "This outcome must stay pending and be rescheduled",
        },
        { status: 400 },
      );
    }

    if (
      body.outcome !== undefined &&
      requiresRetry &&
      body.dueDate === undefined
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Next follow-up date is required for this outcome",
        },
        { status: 400 },
      );
    }

    if (
      body.outcome !== undefined &&
      requiresOutcomeNote &&
      !outcomeInfo.details
    ) {
      return Response.json(
        {
          success: false,
          message:
            "A note is required for this outcome",
        },
        { status: 400 },
      );
    }

    if (effectiveStatus === "Completed" && !effectiveOutcome) {
      return Response.json(
        {
          success: false,
          message: "Outcome is required when completing a follow-up",
        },
        { status: 400 },
      );
    }

    if (updates.status === "Completed" && body.completedAt === undefined) {
      updates.completedAt = new Date();
    }

    if (updates.status === "Scheduled") {
      updates.completedAt = null;
    }

    let nextFollowUpData = null;

    if (body.nextDueDate) {
      const nextDueDate = parseDate(body.nextDueDate);

      if (!nextDueDate) {
        return Response.json(
          {
            success: false,
            message: "Invalid next follow-up date",
          },
          { status: 400 },
        );
      }

      const nextType = String(
        body.nextType || existing.type || "call",
      ).toLowerCase();

      const nextPriority = String(
        body.nextPriority || existing.priority || "medium",
      ).toLowerCase();

      if (!types.includes(nextType)) {
        return Response.json(
          {
            success: false,
            message: "Invalid next follow-up type",
          },
          { status: 400 },
        );
      }

      if (!priorities.includes(nextPriority)) {
        return Response.json(
          {
            success: false,
            message: "Invalid next follow-up priority",
          },
          { status: 400 },
        );
      }

      if (
        body.nextNotes !== undefined &&
        body.nextNotes !== null &&
        typeof body.nextNotes !== "string"
      ) {
        return Response.json(
          {
            success: false,
            message: "Invalid next follow-up notes",
          },
          { status: 400 },
        );
      }

      const nextNotes = body.nextNotes
        ? body.nextNotes.trim()
        : "Next follow-up after previous completion";

      if (!validText(nextNotes, 3000)) {
        return Response.json(
          {
            success: false,
            message: "Next follow-up notes are too long",
          },
          { status: 400 },
        );
      }

      nextFollowUpData = {
        patientId: existing.patientId,
        dueDate: nextDueDate,
        type: nextType,
        priority: nextPriority,
        status: "Scheduled",
        source: "manual",
        notes: nextNotes,
      };
    }

    let followUp;
    let nextFollowUp = null;

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const updatedFollowUp =
            await tx.followUp.update({
              where: {
                id: followUpId,
                updatedAt: expectedDate,
              },
              data: updates,
              include: {
                patient: true,
              },
            });

          let createdNextFollowUp = null;

          if (nextFollowUpData) {
            createdNextFollowUp =
              await tx.followUp.create({
                data: nextFollowUpData,
                include: {
                  patient: true,
                },
              });
          }

          const next =
            await tx.followUp.findFirst({
              where: {
                patientId:
                  existing.patientId,
                status: "Scheduled",
              },
              orderBy: {
                dueDate: "asc",
              },
              select: {
                dueDate: true,
              },
            });

          await tx.patient.update({
            where: {
              id: existing.patientId,
            },
            data: {
              nextFollowUp:
                next?.dueDate || null,
            },
          });

          return {
            followUp: updatedFollowUp,
            nextFollowUp:
              createdNextFollowUp,
          };
        },
      );

      followUp = result.followUp;
      nextFollowUp =
        result.nextFollowUp;
    } catch (error) {
      if (error?.code === "P2025") {
        return Response.json(
          {
            success: false,
            message:
              "This follow-up was changed by another user. Refresh before continuing.",
          },
          { status: 409 },
        );
      }

      throw error;
    }

    let activityAction = "updated";
    let activityTitle = "Follow-up updated";

    if (updates.status === "Completed") {
      activityAction = "completed";
      activityTitle = "Follow-up completed";
    } else if (updates.status === "Cancelled") {
      activityAction = "cancelled";
      activityTitle = "Follow-up cancelled";
    } else if (body.dueDate !== undefined) {
      activityAction = "rescheduled";
      activityTitle = "Follow-up rescheduled";
    }

    await logActivity({
      actor: sessionUser,
      module: "follow-up",
      action: activityAction,
      title: activityTitle,
      description: `${followUp.patient?.fullName || "Patient"} · ${followUp.type}`,
      patientId: existing.patientId,
      recordId: followUp.id,
      relatedPath: `/patients/${existing.patientId}`,
    });

    if (nextFollowUp) {
      await logActivity({
        actor: sessionUser,
        module: "follow-up",
        action: "scheduled",
        title: "Next follow-up scheduled",
        description: `${nextFollowUp.patient?.fullName || "Patient"} · ${nextFollowUp.type}`,
        patientId: existing.patientId,
        recordId: nextFollowUp.id,
        relatedPath: `/patients/${existing.patientId}`,
      });
    }

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
      { status: 500 },
    );
  }
}
