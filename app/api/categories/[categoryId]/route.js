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

    const followUpIntervalDays =
      current.followUpIntervalDays;

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

    return Response.json(category);
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
