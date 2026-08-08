import { del, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";
import { logActivity } from "../../../src/lib/activityLog";
import { validObjectId, validText } from "../../../src/lib/inputValidation";
import { validateWriteOrigin } from "../../../src/lib/requestSecurity";
import {
  forbiddenResponse,
  hasPermission,
  permissions,
} from "../../../src/lib/permissions";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const allowedTypes = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function safeFileName(value) {
  const name = String(value || "prescription")
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return name || "prescription";
}

function detectedType(file) {
  if (allowedTypes[file.type]) return file.type;

  const extension = String(file.name || "")
    .split(".")
    .pop()
    .toLowerCase();

  if (extension === "pdf") return "application/pdf";
  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";

  return "";
}

async function validSignature(file, type) {
  const bytes = new Uint8Array(
    await file.slice(0, 16).arrayBuffer(),
  );

  if (type === "application/pdf") {
    return (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  }

  if (type === "image/jpeg") {
    return (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (type === "image/png") {
    const signature = [
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ];

    return signature.every(
      (value, index) => bytes[index] === value,
    );
  }

  if (type === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}

function serializePrescription(prescription) {
  return {
    id: prescription.id,
    patientId: prescription.patientId,
    patient: prescription.patient || undefined,
    issuedAt: prescription.issuedAt,
    visitDate: prescription.issuedAt,
    doctorName: prescription.doctorName,
    doctor: prescription.doctorName,
    diagnosis: prescription.diagnosis,
    notes: prescription.notes,
    attachment: {
      originalName: prescription.attachmentName,
      contentType: prescription.attachmentType,
      size: prescription.attachmentSize,
      url: `/api/prescriptions/${prescription.id}/file`,
    },
    createdAt: prescription.createdAt,
    updatedAt: prescription.updatedAt,
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
        permissions.VIEW_PATIENTS,
      )
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient");

    if (patientId && !validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient ID",
        },
        { status: 400 },
      );
    }

    if (patientId) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          isDeleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!patient) {
        return Response.json(
          {
            success: false,
            message: "Patient not found",
          },
          { status: 404 },
        );
      }
    }

    const prescriptions =
      await prisma.prescription.findMany({
        where: patientId ? { patientId } : undefined,
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              fullName: true,
              mobile: true,
              age: true,
              category: true,
              diagnosis: true,
              isDeleted: true,
            },
          },
        },
        orderBy: [
          {
            issuedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    const activePrescriptions = prescriptions
      .filter((item) => !item.patient?.isDeleted)
      .map((item) => {
        const prescription = serializePrescription(item);

        if (prescription.patient) {
          delete prescription.patient.isDeleted;
        }

        return prescription;
      });

    return Response.json({
      success: true,
      prescriptions: activePrescriptions,
    });
  } catch (error) {
    console.error("GET PRESCRIPTIONS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load prescriptions",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const originError = validateWriteOrigin(request);

  if (originError) {
    return originError;
  }

  let uploadedBlob = null;

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

    const contentLength = Number(
      request.headers.get("content-length") || 0,
    );

    if (contentLength > 4.5 * 1024 * 1024) {
      return Response.json(
        {
          success: false,
          message: "Prescription file is too large",
        },
        { status: 413 },
      );
    }

    const formData = await request.formData();

    const patientId =
      formData.get("patient") ||
      formData.get("patientId");

    const issuedAt = parseDate(
      formData.get("issuedAt") ||
        formData.get("visitDate"),
    );

    const doctorName = cleanText(
      formData.get("doctorName") ||
        formData.get("doctor"),
    );

    const diagnosis = cleanText(
      formData.get("diagnosis"),
    );

    const notes = cleanText(formData.get("notes"));
    const file = formData.get("file");

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
          message: "Prescription date is required",
        },
        { status: 400 },
      );
    }

    if (!validText(doctorName, 120)) {
      return Response.json(
        {
          success: false,
          message: "Doctor name is too long",
        },
        { status: 400 },
      );
    }

    if (!validText(diagnosis, 2000)) {
      return Response.json(
        {
          success: false,
          message: "Diagnosis is too long",
        },
        { status: 400 },
      );
    }

    if (!validText(notes, 3000)) {
      return Response.json(
        {
          success: false,
          message: "Notes are too long",
        },
        { status: 400 },
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return Response.json(
        {
          success: false,
          message: "Prescription PDF or image is required",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          success: false,
          message: "Prescription file must be 4 MB or smaller",
        },
        { status: 413 },
      );
    }

    const fileType = detectedType(file);

    if (!allowedTypes[fileType]) {
      return Response.json(
        {
          success: false,
          message:
            "Only PDF, JPG, PNG and WEBP files are allowed",
        },
        { status: 400 },
      );
    }

    if (!(await validSignature(file, fileType))) {
      return Response.json(
        {
          success: false,
          message: "Invalid or corrupted prescription file",
        },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 },
      );
    }

    const originalName = safeFileName(file.name);
    const extension = allowedTypes[fileType];

    const pathname =
      `prescriptions/${patientId}/` +
      `${Date.now()}-${randomUUID()}.${extension}`;

    uploadedBlob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
    });

    const prescription =
      await prisma.prescription.create({
        data: {
          patientId,
          issuedAt,
          doctorName,
          diagnosis,
          notes,
          attachmentName: originalName,
          attachmentType: fileType,
          attachmentSize: file.size,
          attachmentUrl: uploadedBlob.url,
          attachmentPathname: uploadedBlob.pathname,
          createdById: sessionUser.id || null,
        },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              fullName: true,
              mobile: true,
              age: true,
              category: true,
              diagnosis: true,
            },
          },
        },
      });

    uploadedBlob = null;

    await logActivity({
      actor: sessionUser,
      module: "prescription",
      action: "uploaded",
      title: "Prescription uploaded",
      description: `${patient.fullName} · ${originalName}`,
      patientId,
      recordId: prescription.id,
      relatedPath: `/patients/${patientId}`,
    });

    return Response.json(
      {
        success: true,
        prescription:
          serializePrescription(prescription),
      },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedBlob?.url) {
      try {
        await del(uploadedBlob.url);
      } catch (cleanupError) {
        console.error(
          "PRESCRIPTION BLOB CLEANUP ERROR:",
          cleanupError,
        );
      }
    }

    console.error(
      "CREATE PRESCRIPTION ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message: "Failed to save prescription",
      },
      { status: 500 },
    );
  }
}
