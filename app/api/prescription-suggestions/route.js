import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

const allowedTypes = new Set([
  "diagnosis",
  "complaint",
  "history",
  "pastHistory",
  "examination",
  "advice",
  "test",
]);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

    if (
      !hasPermission(
        sessionUser.role,
        permissions.MANAGE_PRESCRIPTIONS,
      )
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);

    const type = String(
      searchParams.get("type") || "",
    ).trim();

    const query = normalize(
      searchParams.get("q"),
    );

    if (!allowedTypes.has(type)) {
      return Response.json(
        {
          success: false,
          message: "Invalid suggestion type",
        },
        { status: 400 },
      );
    }

    const suggestions =
      await prisma.prescriptionSuggestion.findMany({
        where: {
          type,
          active: true,
          ...(query
            ? {
                searchText: {
                  contains: query,
                },
              }
            : {}),
        },
        orderBy: [
          {
            usageCount: "desc",
          },
          {
            lastUsedAt: "desc",
          },
        ],
        take: 20,
        select: {
          id: true,
          type: true,
          value: true,
          usageCount: true,
        },
      });

    return Response.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error(
      "GET PRESCRIPTION SUGGESTIONS ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to load suggestions",
      },
      { status: 500 },
    );
  }
}
