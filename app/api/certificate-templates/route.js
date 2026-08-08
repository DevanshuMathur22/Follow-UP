import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { readJsonBody } from "../../../src/lib/requestBody";
import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

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

function slugify(value) {
  return clean(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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
    if (!field.key) {
      return "Every field requires a key";
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.key)) {
      return `Invalid field key: ${field.key}`;
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

async function authorize() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return {
      response: Response.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      ),
    };
  }

  if (
    !hasPermission(
      sessionUser.role,
      permissions.MANAGE_CERTIFICATES,
    )
  ) {
    return {
      response: forbiddenResponse(),
    };
  }

  return { sessionUser };
}

export async function GET(request) {
  try {
    const auth = await authorize();

    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const includeInactive =
      searchParams.get("all") === "1";

    const templates =
      await prisma.certificateTemplate.findMany({
        where: includeInactive
          ? undefined
          : { active: true },
        orderBy: [
          { active: "desc" },
          { name: "asc" },
        ],
      });

    return Response.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error(
      "GET CERTIFICATE TEMPLATES ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to load certificate templates",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const originError =
    validateWriteOrigin(request);

  if (originError) return originError;

  try {
    const auth = await authorize();

    if (auth.response) return auth.response;

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const name = clean(body.name, 160);
    const title = clean(body.title, 250);
    const description = clean(
      body.description,
      500,
    );
    const bodyTemplate = clean(
      body.bodyTemplate,
      10000,
    );

    const fields = normalizeFields(
      body.fields,
    );

    if (!name) {
      return Response.json(
        {
          success: false,
          message: "Template name is required",
        },
        { status: 400 },
      );
    }

    if (!title) {
      return Response.json(
        {
          success: false,
          message: "Certificate heading is required",
        },
        { status: 400 },
      );
    }

    if (!bodyTemplate) {
      return Response.json(
        {
          success: false,
          message: "Certificate wording is required",
        },
        { status: 400 },
      );
    }

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

    let baseCode =
      slugify(body.code || name) ||
      "certificate";

    let code = baseCode;
    let counter = 2;

    while (
      await prisma.certificateTemplate.findUnique({
        where: { code },
        select: { id: true },
      })
    ) {
      code = `${baseCode}-${counter}`;
      counter += 1;
    }

    const template =
      await prisma.certificateTemplate.create({
        data: {
          code,
          name,
          title,
          description: description || null,
          bodyTemplate,
          fields,
          active: true,
          version: 1,
        },
      });

    return Response.json(
      {
        success: true,
        template,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "CREATE CERTIFICATE TEMPLATE ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to create certificate template",
      },
      { status: 500 },
    );
  }
}
