import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { logActivity } from "../../../src/lib/activityLog";
import { readJsonBody } from "../../../src/lib/requestBody";
import { validObjectId } from "../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

function clean(value, max = 2000) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pronouns(gender) {
  const value = String(gender || "").toLowerCase();

  if (value === "male") {
    return {
      possessive: "his",
      subject: "he",
      object: "him",
      verb: "is",
    };
  }

  if (value === "female") {
    return {
      possessive: "her",
      subject: "she",
      object: "her",
      verb: "is",
    };
  }

  return {
    possessive: "their",
    subject: "they",
    object: "them",
    verb: "are",
  };
}

function getTemplateFields(template) {
  return Array.isArray(template?.fields)
    ? template.fields
    : [];
}

function normalizeFieldValues(template, input) {
  const fields = getTemplateFields(template);
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? input
      : {};

  const values = {};

  for (const field of fields) {
    if (!field?.key) continue;

    const key = String(field.key);
    const type = String(field.type || "text");
    const max =
      type === "textarea"
        ? 3000
        : 500;

    values[key] = clean(source[key], max);
  }

  return values;
}

function validateFields(template, values) {
  const fields = getTemplateFields(template);

  for (const field of fields) {
    if (!field?.key) continue;

    const key = String(field.key);
    const value = values[key] || "";

    if (field.required && !value) {
      return `${field.label || key} is required`;
    }

    if (
      field.type === "select" &&
      value &&
      Array.isArray(field.options) &&
      !field.options.includes(value)
    ) {
      return `Invalid value for ${field.label || key}`;
    }
  }

  return null;
}

function renderTemplate(template, patient, values) {
  const patientPronouns = pronouns(patient.gender);

  const variables = {
    patientName: patient.fullName || "",
    patientAge:
      patient.age === null || patient.age === undefined
        ? ""
        : String(patient.age),
    patientGender: patient.gender || "",
    patientCode: patient.patientCode || "",
    patientMobile: patient.mobile || "",
    patientCategory: patient.category || "",
    patientDiagnosis: patient.diagnosis || "",
    diagnosis:
      values.diagnosis ||
      patient.diagnosis ||
      "",
    honorific: values.honorific || "",
    possessive: patientPronouns.possessive,
    subject: patientPronouns.subject,
    object: patientPronouns.object,
    verb: patientPronouns.verb,
    ...values,
  };

  if (variables.additionalDetails) {
    variables.additionalDetails =
      ` ${variables.additionalDetails}`;
  }

  return String(template.bodyTemplate || "")
    .replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (_, key) =>
        variables[key] === undefined ||
        variables[key] === null
          ? ""
          : String(variables[key]),
    )
    .replace(/[ \t]+([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function certificateSelect() {
  return {
    patient: {
      select: {
        id: true,
        patientCode: true,
        fullName: true,
        mobile: true,
        category: true,
        diagnosis: true,
        isDeleted: true,
      },
    },
  };
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
        permissions.MANAGE_CERTIFICATES,
      )
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient");
    const templateCode =
      searchParams.get("template");

    if (patientId && !validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient ID",
        },
        { status: 400 },
      );
    }

    const certificates =
      await prisma.certificate.findMany({
        where: {
          ...(patientId
            ? { patientId }
            : {}),
          ...(templateCode
            ? { templateCode }
            : {}),
        },
        include: certificateSelect(),
        orderBy: [
          { issuedAt: "desc" },
          { createdAt: "desc" },
        ],
      });

    return Response.json({
      success: true,
      certificates: certificates.filter(
        (item) => !item.patient?.isDeleted,
      ),
    });
  } catch (error) {
    console.error(
      "GET CERTIFICATES ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to load certificates",
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

    const { data: body, error: bodyError } =
      await readJsonBody(request);

    if (bodyError) return bodyError;

    const patientId =
      body.patientId || body.patient;

    const templateId = clean(
      body.templateId,
      100,
    );

    const templateCode = clean(
      body.templateCode,
      120,
    );

    const issuedAt = parseDate(body.issuedAt);

    if (!validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient ID",
        },
        { status: 400 },
      );
    }

    if (!issuedAt) {
      return Response.json(
        {
          success: false,
          message: "Certificate date is required",
        },
        { status: 400 },
      );
    }

    if (!templateId && !templateCode) {
      return Response.json(
        {
          success: false,
          message: "Certificate template is required",
        },
        { status: 400 },
      );
    }

    if (
      templateId &&
      !validObjectId(templateId)
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid certificate template",
        },
        { status: 400 },
      );
    }

    const [patient, template] =
      await Promise.all([
        prisma.patient.findFirst({
          where: {
            id: patientId,
            isDeleted: false,
          },
          select: {
            id: true,
            patientCode: true,
            fullName: true,
            age: true,
            gender: true,
            mobile: true,
            category: true,
            diagnosis: true,
          },
        }),

        prisma.certificateTemplate.findFirst({
          where: {
            active: true,
            ...(templateId
              ? { id: templateId }
              : { code: templateCode }),
          },
        }),
      ]);

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 },
      );
    }

    if (!template) {
      return Response.json(
        {
          success: false,
          message: "Certificate template not found",
        },
        { status: 404 },
      );
    }

    const fieldValues =
      normalizeFieldValues(
        template,
        body.fieldValues || {},
      );

    const fieldError = validateFields(
      template,
      fieldValues,
    );

    if (fieldError) {
      return Response.json(
        {
          success: false,
          message: fieldError,
        },
        { status: 400 },
      );
    }

    const certificateText =
      renderTemplate(
        template,
        patient,
        fieldValues,
      );

    if (!certificateText) {
      return Response.json(
        {
          success: false,
          message: "Certificate template is empty",
        },
        { status: 400 },
      );
    }

    const doctorName = clean(
      body.doctorName ||
        sessionUser.name,
      120,
    );

    const doctorRegistration = clean(
      body.doctorRegistration,
      100,
    );

    const specialization = clean(
      body.specialization,
      250,
    );

    const clinicName = clean(
      body.clinicName,
      200,
    );

    const clinicPhone = clean(
      body.clinicPhone,
      50,
    );

    const clinicEmail = clean(
      body.clinicEmail,
      200,
    );

    const clinicAddress = clean(
      body.clinicAddress,
      500,
    );

    const certificate =
      await prisma.certificate.create({
        data: {
          patientId,
          issuedAt,

          templateId: template.id,
          templateCode: template.code,
          templateName: template.name,
          templateTitle: template.title,
          templateVersion:
            template.version || 1,

          fieldValues,

          purpose:
            fieldValues.purpose || null,
          illnessDuration:
            fieldValues.illnessDuration ||
            null,
          treatmentDuration:
            fieldValues.treatmentDuration ||
            null,
          validity:
            fieldValues.validity || null,
          additionalDetails:
            fieldValues.additionalDetails ||
            null,

          certificateText,

          patientName: patient.fullName,
          patientAge: patient.age,
          patientDiagnosis:
            fieldValues.diagnosis ||
            patient.diagnosis ||
            null,

          doctorName: doctorName || null,
          doctorRegistration:
            doctorRegistration || null,
          specialization:
            specialization || null,

          clinicName:
            clinicName || null,
          clinicPhone:
            clinicPhone || null,
          clinicEmail:
            clinicEmail || null,
          clinicAddress:
            clinicAddress || null,

          createdById:
            sessionUser.id || null,
        },

        include: certificateSelect(),
      });

    await logActivity({
      actor: sessionUser,
      module: "certificate",
      action: "created",
      title: "Certificate created",
      description:
        `${patient.fullName} · ${template.name}`,
      patientId,
      recordId: certificate.id,
      relatedPath:
        `/patients/${patientId}`,
    });

    return Response.json(
      {
        success: true,
        certificate,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "CREATE CERTIFICATE ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to create certificate",
      },
      { status: 500 },
    );
  }
}
