import { forbiddenResponse, hasPermission, permissions } from "../../../src/lib/permissions";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export async function GET(request) {
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

    if (!hasPermission(sessionUser.role, permissions.VIEW_ACTIVITY)) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient")?.trim() || "";
    const module = searchParams.get("module")?.trim() || "";
    const requestedLimit = Number(searchParams.get("limit") || 100);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 200)
      : 100;

    if (patientId && !validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient ID",
        },
        { status: 400 }
      );
    }

    const activities = await prisma.activityLog.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(module ? { module } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return Response.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("GET ACTIVITY LOGS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load activity logs",
      },
      { status: 500 }
    );
  }
}
