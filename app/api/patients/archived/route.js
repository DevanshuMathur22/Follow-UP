import { forbiddenResponse, hasPermission, permissions } from "../../../../src/lib/permissions";
import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";

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

    if (!hasPermission(sessionUser.role, permissions.ARCHIVE_PATIENTS)) {
      return forbiddenResponse();
    }

    const patients = await prisma.patient.findMany({
      where: {
        isDeleted: true,
      },
      orderBy: {
        deletedAt: "desc",
      },
    });

    return Response.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("GET ARCHIVED PATIENTS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load archived patients",
      },
      { status: 500 },
    );
  }
}
