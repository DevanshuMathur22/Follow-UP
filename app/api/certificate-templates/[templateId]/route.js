import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import { readJsonBody } from "../../../../src/lib/requestBody";
import { validObjectId } from "../../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../../src/lib/permissions";

const allowedTypes = new Set([
  "text",
  "textarea",
  "select",
  "number",
]);

function clean(value, max = 2000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

function normalizeFields(input) {
  if (!Array.isArray(input)) return [];

  return input.slice(0, 20).map((field) => ({
    key: clean(field?.key, 60),
    label: clean(field?.label, 120),
    type: allowedTypes.has(field?.type)
      ? field.type
      : "text",
    required: Boolean(field?.required),
    source: clean(field?.source, 120),
    placeholder: clean(field?.placeholder, 250),
    options:
      field?.type === "select" &&
      Array.isArray(field?.options)
        ? field.options
            .slice(0, 30)
            .map((option) => clean(option, 120))
        : [],
  }));
}

function validateFields(fields) {
  const keys = new Set();

  for (const field of fields) {
    if (
      !field.key ||
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.key)
    ) {
      return `Invalid field key: ${field.key || "empty"}`;
    }

    if (keys.has(field.key)) {
      return `Duplicate field key: ${field.key}`;
    }

    keys.add(field.key);

    if (!field.label) {
      return `Label is required for ${field.key}`;
    }

    if (
      field.type === "select" &&
      !field.options.length
    ) {
      return `${field.label} requires at least one option`;
    }
  }

  return null;
}

export async function PATCH(
  request,
  { params },
) {
  const originError =
    validateWriteOrigin(request);

  if (originError) return originError;

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
        permissions.MANAGE_CERTIFICATES,
      )
    ) {
      return forbiddenResponse();
    }

    const resolvedParams = await params;
    const templateId =
      resolvedParams.templateId;

    if (!validObjectId(templateId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid template ID",
        },
        { status: 400 },
      );
    }

    const current =
      await prisma.certificateTemplate.findUnique({
        where: { id: templateId },
      });

    if (!current) {
      return Response.json(
        {
          success: false,
          message: "Certificate template not found",
        },
        { status: 404 },
      );
    }

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const update = {};

    if (body.name !== undefined) {
      const name = clean(body.name, 160);

      if (!name) {
        return Response.json(
          {
            success: false,
            message: "Template name is required",
          },
          { status: 400 },
        );
      }

      update.name = name;
    }

    if (body.title !== undefined) {
      const title = clean(body.title, 250);

      if (!title) {
        return Response.json(
          {
            success: false,
            message: "Certificate heading is required",
          },
          { status: 400 },
        );
      }

      update.title = title;
    }

    if (body.description !== undefined) {
      update.description =
        clean(body.description, 500) || null;
    }

    if (body.bodyTemplate !== undefined) {
      const bodyTemplate = clean(
        body.bodyTemplate,
        10000,
      );

      if (!bodyTemplate) {
        return Response.json(
          {
            success: false,
            message: "Certificate wording is required",
          },
          { status: 400 },
        );
      }

      update.bodyTemplate = bodyTemplate;
    }

    if (body.fields !== undefined) {
      const fields =
        normalizeFields(body.fields);

      const fieldError =
        validateFields(fields);

      if (fieldError) {
        return Response.json(
          {
            success: false,
            message: fieldError,
          },
          { status: 400 },
        );
      }

      update.fields = fields;
    }

    if (body.active !== undefined) {
      update.active = Boolean(body.active);
    }

    const contentChanged =
      update.name !== undefined ||
      update.title !== undefined ||
      update.description !== undefined ||
      update.bodyTemplate !== undefined ||
      update.fields !== undefined;

    if (contentChanged) {
      update.version =
        (current.version || 1) + 1;
    }

    const template =
      await prisma.certificateTemplate.update({
        where: { id: templateId },
        data: update,
      });

    return Response.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error(
      "UPDATE CERTIFICATE TEMPLATE ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to update certificate template",
      },
      { status: 500 },
    );
  }
}
