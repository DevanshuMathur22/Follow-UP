import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const locations = await prisma.clinicLocation.findMany({
      where: { active: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    return Response.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("GET CLINIC LOCATIONS ERROR:", error);

    return Response.json(
      { success: false, message: "Failed to load clinic locations" },
      { status: 500 },
    );
  }
}
