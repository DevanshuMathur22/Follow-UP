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

const statuses = [
  "Booked",
  "Confirmed",
  "Checked-in",
  "Waiting",
  "With Doctor",
  "Completed",
  "Cancelled",
  "No-show",
];

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
        permissions.MANAGE_APPOINTMENTS,
      )
    ) {
      return forbiddenResponse();
    }

    const { appointmentId } = await params;

    if (!validObjectId(appointmentId)) {
      return Response.json(
        { success: false, message: "Invalid appointment" },
        { status: 400 },
      );
    }

    const current = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
    });

    if (!current) {
      return Response.json(
        { success: false, message: "Appointment not found" },
        { status: 404 },
      );
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const data = {};

    if (body.status !== undefined) {
      const status = String(body.status);

      if (!statuses.includes(status)) {
        return Response.json(
          {
            success: false,
            message: "Invalid appointment status",
          },
          { status: 400 },
        );
      }

      data.status = status;

      if (status === "Checked-in") {
        data.checkInAt = current.checkInAt || new Date();
      }

      if (status === "Waiting") {
        data.checkInAt = current.checkInAt || new Date();
      }

      if (status === "With Doctor") {
        data.consultationStartedAt =
          current.consultationStartedAt || new Date();
      }

      if (status === "Completed") {
        data.completedAt = current.completedAt || new Date();
      }

      if (status === "Cancelled") {
        data.cancelledAt = current.cancelledAt || new Date();

        data.cancellationReason =
          String(body.cancellationReason || "")
            .trim()
            .slice(0, 500) || null;

        data.slotKey =
          `${current.slotKey}:cancelled:${Date.now()}`;
      }
    }

    if (body.priority !== undefined) {
      data.priority = String(body.priority)
        .trim()
        .toLowerCase()
        .slice(0, 30);
    }

    if (body.reason !== undefined) {
      data.reason =
        String(body.reason || "").trim().slice(0, 1000) ||
        null;
    }

    if (body.notes !== undefined) {
      data.notes =
        String(body.notes || "").trim().slice(0, 2000) ||
        null;
    }

    const appointment = await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data,
      include: {
        patient: true,
        location: true,
      },
    });

    return Response.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to update appointment",
      },
      { status: 500 },
    );
  }
}
