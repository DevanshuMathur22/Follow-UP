import { get } from "@vercel/blob";
import { getSessionUser } from "../../../../../src/lib/auth";
import prisma from "../../../../../src/lib/prisma";
import { validObjectId } from "../../../../../src/lib/inputValidation";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../../src/lib/permissions";

function contentDisposition(name, download) {
  const safeName = String(name || "prescription")
    .replace(/[\r\n"]/g, "_");

  return `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

export async function GET(request, { params }) {
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
        permissions.VIEW_PATIENTS,
      )
    ) {
      return forbiddenResponse();
    }

    const { prescriptionId } = await params;

    if (!validObjectId(prescriptionId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid prescription ID",
        },
        { status: 400 },
      );
    }

    const prescription =
      await prisma.prescription.findUnique({
        where: {
          id: prescriptionId,
        },
        include: {
          patient: {
            select: {
              isDeleted: true,
            },
          },
        },
      });

    if (
      !prescription ||
      prescription.patient?.isDeleted
    ) {
      return Response.json(
        {
          success: false,
          message: "Prescription not found",
        },
        { status: 404 },
      );
    }

    const result = await get(
      prescription.attachmentPathname ||
        prescription.attachmentUrl,
      {
        access: "private",
      },
    );

    if (!result) {
      return Response.json(
        {
          success: false,
          message: "Prescription file not found",
        },
        { status: 404 },
      );
    }

    const download =
      new URL(request.url).searchParams.get("download") ===
      "1";

    return new Response(result.stream, {
      headers: {
        "Content-Type":
          prescription.attachmentType ||
          result.blob.contentType ||
          "application/octet-stream",
        "Content-Disposition": contentDisposition(
          prescription.attachmentName,
          download,
        ),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    console.error(
      "GET PRESCRIPTION FILE ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to load prescription file",
      },
      { status: 500 },
    );
  }
}
