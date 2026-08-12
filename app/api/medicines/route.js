import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function GET(request) {
  try {
    const sessionUser =
      await getSessionUser();

    if (!sessionUser) {
      return Response.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        {
          status: 401,
        },
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

    const { searchParams } =
      new URL(request.url);

    const query = normalize(
      searchParams.get("q"),
    );

    const requestedLimit =
      Number.parseInt(
        searchParams.get("limit") ||
          "300",
        10,
      );

    const limit = Math.min(
      500,
      Math.max(
        1,
        Number.isInteger(
          requestedLimit,
        )
          ? requestedLimit
          : 300,
      ),
    );

    const medicines =
      await prisma.medicineCatalog.findMany({
        where: query
          ? {
              searchText: {
                contains: query,
              },
            }
          : undefined,
        orderBy: [
          {
            usageCount: "desc",
          },
          {
            lastUsedAt: "desc",
          },
        ],
        take: limit,
        select: {
          id: true,
          name: true,
          strength: true,
          unit: true,
          usageCount: true,
          lastUsedAt: true,
        },
      });

    return Response.json({
      success: true,
      medicines,
    });
  } catch (error) {
    console.error(
      "GET MEDICINE CATALOG ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to load medicine catalog",
      },
      {
        status: 500,
      },
    );
  }
}
