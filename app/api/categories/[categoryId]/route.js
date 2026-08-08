import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { forbiddenResponse, hasPermission, permissions } from "../../../../src/lib/permissions";
import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

function calculateNextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function syncPatientNextFollowUp(patientId) {
  const next = await prisma.followUp.findFirst({
    where: {
      patientId,
      status: "Scheduled",
    },
    orderBy: {
      dueDate: "asc",
    },
    select: {
      dueDate: true,
    },
  });

  await prisma.patient.update({
    where: {
      id: patientId,
    },
    data: {
      nextFollowUp: next?.dueDate || null,
    },
  });
}

async function applyCategoryRule(patientId, categoryName, days) {
  const dueDate = calculateNextDate(days);

  const existingFollowUp = await prisma.followUp.findFirst({
    where: {
      patientId,
      status: "Scheduled",
      source: "category",
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  if (existingFollowUp) {
    await prisma.followUp.update({
      where: {
        id: existingFollowUp.id,
      },
      data: {
        dueDate,
      },
    });
  } else {
    await prisma.followUp.create({
      data: {
        patientId,
        dueDate,
        type: "call",
        priority: "medium",
        status: "Scheduled",
        source: "category",
        notes: `Category follow-up: ${categoryName}`,
      },
    });
  }

  await syncPatientNextFollowUp(patientId);
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

    if (!hasPermission(sessionUser.role, permissions.MANAGE_CATEGORIES)) {
      return forbiddenResponse();
    }

    const { categoryId } = await params;

    if (!validObjectId(categoryId)) {
      return Response.json(
        { message: "Invalid category ID" },
        { status: 400 }
      );
    }

    const current = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!current) {
      return Response.json(
        { message: "Category not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const name =
      body.name !== undefined
        ? String(body.name).trim()
        : current.name;

    const followUpIntervalDays =
      body.followUpIntervalDays !== undefined
        ? Number(body.followUpIntervalDays)
        : current.followUpIntervalDays;

    const active =
      body.active !== undefined
        ? Boolean(body.active)
        : current.active;

    const applyToPatients = Boolean(body.applyToPatients);

    if (!name) {
      return Response.json(
        { message: "Category name is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(followUpIntervalDays) ||
      followUpIntervalDays < 1 ||
      followUpIntervalDays > 365
    ) {
      return Response.json(
        { message: "Follow-up interval must be between 1 and 365 days" },
        { status: 400 }
      );
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        NOT: {
          id: categoryId,
        },
      },
    });

    if (duplicate) {
      return Response.json(
        { message: "Category already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.category.update({
      where: {
        id: categoryId,
      },
      data: {
        name,
        followUpIntervalDays,
        active,
      },
    });

    if (current.name.toLowerCase() !== name.toLowerCase()) {
      await prisma.patient.updateMany({
        where: {
          category: {
            equals: current.name,
            mode: "insensitive",
          },
        },
        data: {
          category: name,
        },
      });
    }

    let processedPatients = 0;

    if (applyToPatients && active) {
      const patients = await prisma.patient.findMany({
        where: {
          isDeleted: false,
          status: "active",
          category: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

      for (const patient of patients) {
        await applyCategoryRule(
          patient.id,
          category.name,
          category.followUpIntervalDays
        );
        processedPatients += 1;
      }
    }

    return Response.json({
      ...category,
      application: {
        processedPatients,
      },
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);

    return Response.json(
      { message: "Failed to update category" },
      { status: 500 }
    );
  }
}
