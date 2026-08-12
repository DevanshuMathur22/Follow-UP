import { getSessionUser } from "../../../../src/lib/auth";
import { logActivity } from "../../../../src/lib/activityLog";
import prisma from "../../../../src/lib/prisma";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
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
        user.role,
        permissions.MANAGE_SETTINGS,
      )
    ) {
      return forbiddenResponse();
    }

    const [
      patients,
      categories,
      followUps,
      prescriptions,
      medicineCatalog,
      locations,
      availabilities,
      scheduleOverrides,
      scheduleOverrideSessions,
      appointments,
      certificateTemplates,
      certificates,
      activities,
    ] = await Promise.all([
      prisma.patient.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.category.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.followUp.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.prescription.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.medicineCatalog.findMany({
        orderBy: [
          {
            lastUsedAt: "desc",
          },
          {
            name: "asc",
          },
        ],
      }),
      prisma.clinicLocation.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.doctorAvailability.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.doctorScheduleOverride.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.doctorScheduleOverrideSession.findMany({
        orderBy: {
          id: "asc",
        },
      }),
      prisma.appointment.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.certificateTemplate.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.certificate.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.activityLog.findMany({
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    await logActivity({
      actor: user,
      module: "security",
      action: "backup_exported",
      title: "Database backup exported",
      description:
        "A protected database backup copy was downloaded",
      relatedPath: "/settings",
    });

    const exportedAt = new Date();

    const collections = {
      patients,
      categories,
      followUps,
      prescriptions,
      medicineCatalog,
      locations,
      availabilities,
      scheduleOverrides,
      scheduleOverrideSessions,
      appointments,
      certificateTemplates,
      certificates,
      activities,
    };

    const counts = Object.fromEntries(
      Object.entries(collections).map(
        ([key, records]) => [
          key,
          records.length,
        ],
      ),
    );

    const backup = {
      format: "caretrack-database-backup",
      version: 2,
      exportedAt:
        exportedAt.toISOString(),
      exportedBy: {
        id: user.id || null,
        name: user.name || null,
        role: user.role || null,
      },
      includesArchivedPatients: true,
      attachmentFilesIncluded: false,
      attachmentMetadataIncluded: true,
      counts,
      data: collections,
    };

    const filename =
      `caretrack-backup-${exportedAt
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-")}.json`;

    return new Response(
      JSON.stringify(backup, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="${filename}"`,
          "Cache-Control":
            "no-store, private",
          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "DATABASE BACKUP ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to create database backup",
      },
      { status: 500 },
    );
  }
}
