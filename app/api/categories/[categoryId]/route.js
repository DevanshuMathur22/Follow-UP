import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import { readJsonBody } from "../../../../src/lib/requestBody";
import {
  validObjectId,
  validText,
} from "../../../../src/lib/inputValidation";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";
import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";

function parseInterval(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (
    value === null ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const days = Number(text);

  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > 3650
  ) {
    return null;
  }

  return days;
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

    if (
      !hasPermission(
        sessionUser.role,
        permissions.MANAGE_CATEGORIES,
      )
    ) {
      return forbiddenResponse();
    }

    const { categoryId } = await params;

    if (!validObjectId(categoryId)) {
      return Response.json(
        {
          message: "Invalid category ID",
        },
        { status: 400 },
      );
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) {
      return bodyError;
    }

    const current = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!current) {
      return Response.json(
        {
          message: "Category not found",
        },
        { status: 404 },
      );
    }

    let name = current.name;

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return Response.json(
          {
            message: "Invalid category name",
          },
          { status: 400 },
        );
      }

      name = body.name.trim();

      if (!name) {
        return Response.json(
          {
            message: "Category name is required",
          },
          { status: 400 },
        );
      }

      if (!validText(name, 100)) {
        return Response.json(
          {
            message: "Category name is too long",
          },
          { status: 400 },
        );
      }
    }

    const followUpIntervalDays = parseInterval(
      body.followUpIntervalDays,
      current.followUpIntervalDays,
    );

    if (!followUpIntervalDays) {
      return Response.json(
        {
          message: "Invalid follow-up interval",
        },
        { status: 400 },
      );
    }

    let active = current.active;

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return Response.json(
          {
            message: "Invalid active value",
          },
          { status: 400 },
        );
      }

      active = body.active;
    }

    let applyToPatients = false;

    if (body.applyToPatients !== undefined) {
      if (typeof body.applyToPatients !== "boolean") {
        return Response.json(
          {
            message: "Invalid applyToPatients value",
          },
          { status: 400 },
        );
      }

      applyToPatients = body.applyToPatients;
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
        {
          message: "Category already exists",
        },
        { status: 409 },
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

    if (
      current.name.toLowerCase() !==
      name.toLowerCase()
    ) {
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
          category.followUpIntervalDays,
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
      {
        message: "Failed to update category",
      },
      { status: 500 },
    );
  }
}
