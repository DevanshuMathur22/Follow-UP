import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

export async function GET(request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    if (
      !hasPermission(
        sessionUser.role,
        permissions.MANAGE_APPOINTMENTS,
      )
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");

    if (
      from &&
      !/^\d{4}-\d{2}-\d{2}$/.test(from)
    ) {
      return Response.json(
        { success: false, message: "Invalid date" },
        { status: 400 },
      );
    }

    const appointments =
      await prisma.appointment.findMany({
        where: {
          ...(from ? { dateKey: { gte: from } } : {}),
          status: {
            notIn: [
              "Completed",
              "Cancelled",
              "No-show",
            ],
          },
        },
        include: {
          patient: true,
          location: true,
        },
        orderBy: [
          { dateKey: "asc" },
          { startTime: "asc" },
        ],
        take: 500,
      });

    return Response.json({
      success: true,
      appointments: appointments.filter(
        (item) => !item.patient?.isDeleted,
      ),
    });
  } catch (error) {
    console.error(
      "APPOINTMENT SEARCH CONTEXT ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Unable to load appointments",
      },
      { status: 500 },
    );
  }
}
