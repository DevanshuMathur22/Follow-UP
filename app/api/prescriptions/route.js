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
  const hasAttachment =
    prescription.attachmentName &&
    prescription.attachmentPathname;

  return {
    id: prescription.id,
    patientId: prescription.patientId,
    patient: prescription.patient || undefined,
    recordType: prescription.recordType || "uploaded",
    issuedAt: prescription.issuedAt,
    visitDate: prescription.issuedAt,
    doctorName: prescription.doctorName,
    doctor: prescription.doctorName,
    diagnosis: prescription.diagnosis,
    notes: prescription.notes,
    complaints: prescription.complaints,
    historyOfPresentIllness:
      prescription.historyOfPresentIllness,
    pastFamilyHistory: prescription.pastFamilyHistory,
    examination: prescription.examination,
    medicines: Array.isArray(prescription.medicines)
      ? prescription.medicines
      : [],
    advice: prescription.advice,
    testsPrescribed: prescription.testsPrescribed,
    nextVisit: prescription.nextVisit,
    attachment: hasAttachment
      ? {
          originalName: prescription.attachmentName,
          contentType: prescription.attachmentType,
          size: prescription.attachmentSize,
          url: `/api/prescriptions/${prescription.id}/file`,
        }
      : null,
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
          message: "Prescription request is too large",
        },
        { status: 413 },
      );
    }

    const formData = await request.formData();

    const requestId = cleanText(
      formData.get("requestId"),
    );

    const recordType =
      String(formData.get("recordType") || "uploaded")
        .trim()
        .toLowerCase();

    if (!["uploaded", "generated"].includes(recordType)) {
      return Response.json(
        {
          success: false,
          message: "Invalid prescription type",
        },
        { status: 400 },
      );
    }

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

    const complaints = cleanText(
      formData.get("complaints"),
    );

    const historyOfPresentIllness = cleanText(
      formData.get("historyOfPresentIllness"),
    );

    const pastFamilyHistory = cleanText(
      formData.get("pastFamilyHistory"),
    );

    const examination = cleanText(
      formData.get("examination"),
    );

    const advice = cleanText(
      formData.get("advice"),
    );

    const testsPrescribed = cleanText(
      formData.get("testsPrescribed"),
    );

    const nextVisitValue = cleanText(
      formData.get("nextVisit"),
    );

    const nextVisit = parseDate(
      nextVisitValue,
    );

    const nextVisitFollowUpDate =
      nextVisitValue &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(
        nextVisitValue,
      )
        ? new Date(
            `${nextVisitValue}T09:00:00+05:30`,
          )
        : nextVisit;

    if (
      recordType === "generated" &&
      (
        !requestId ||
        !/^[A-Za-z0-9_-]{20,100}$/.test(
          requestId,
        )
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Invalid prescription request ID",
        },
        { status: 400 },
      );
    }

    const file = formData.get("file");

    let medicines = [];

    try {
      const rawMedicines =
        formData.get("medicines") ||
        formData.get("medications") ||
        "[]";

      const parsed = JSON.parse(String(rawMedicines));

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid medicines");
      }

      medicines = parsed
        .slice(0, 50)
        .map((item) => ({
          medicine: cleanText(
            item?.medicine ||
              item?.name ||
              item?.medicineName,
          ),
          strength: cleanText(
            item?.strength,
          ),
          unit: cleanText(
            item?.unit,
          ),
          dosage: cleanText(item?.dosage),
          timing: cleanText(item?.timing),
          frequency: cleanText(item?.frequency),
          duration: cleanText(item?.duration),
          composition: cleanText(item?.composition),
          instructions: cleanText(item?.instructions),
        }))
        .filter((item) =>
          Object.values(item).some(Boolean),
        );
    } catch {
      return Response.json(
        {
          success: false,
          message: "Invalid medicine data",
        },
        { status: 400 },
      );
    }

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

    const textFields = [
      [doctorName, 120, "Doctor name"],
      [diagnosis, 2000, "Diagnosis"],
      [notes, 3000, "Notes"],
      [complaints, 4000, "Complaints"],
      [
        historyOfPresentIllness,
        6000,
        "History of present illness",
      ],
      [
        pastFamilyHistory,
        4000,
        "Past / family history",
      ],
      [examination, 4000, "Examination"],
      [advice, 4000, "Advice"],
      [testsPrescribed, 4000, "Tests prescribed"],
    ];

    for (const [value, maxLength, label] of textFields) {
      if (!validText(value, maxLength)) {
        return Response.json(
          {
            success: false,
            message: `${label} is too long`,
          },
          { status: 400 },
        );
      }
    }

    for (const medicine of medicines) {
      const medicineFields = [
        [medicine.medicine, 300],
        [medicine.strength, 100],
        [medicine.unit, 50],
        [medicine.dosage, 200],
        [medicine.timing, 500],
        [medicine.frequency, 200],
        [medicine.duration, 200],
        [medicine.composition, 500],
        [medicine.instructions, 700],
      ];

      if (
        medicineFields.some(
          ([value, maxLength]) =>
            !validText(value, maxLength),
        )
      ) {
        return Response.json(
          {
            success: false,
            message: "Medicine details are too long",
          },
          { status: 400 },
        );
      }
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

    let attachmentData = {
      attachmentName: null,
      attachmentType: null,
      attachmentSize: null,
      attachmentUrl: null,
      attachmentPathname: null,
    };

    if (recordType === "uploaded") {
      if (!(file instanceof File) || file.size === 0) {
        return Response.json(
          {
            success: false,
            message:
              "Prescription PDF or image is required",
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return Response.json(
          {
            success: false,
            message:
              "Prescription file must be 4 MB or smaller",
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
            message:
              "Invalid or corrupted prescription file",
          },
          { status: 400 },
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

      attachmentData = {
        attachmentName: originalName,
        attachmentType: fileType,
        attachmentSize: file.size,
        attachmentUrl: uploadedBlob.url,
        attachmentPathname: uploadedBlob.pathname,
      };
    }

    let prescription;
    let prescriptionFollowUp = null;
    let prescriptionFollowUpAction = "";

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          if (recordType === "generated") {
            await tx.prescriptionSaveRequest.create({
              data: {
                id: requestId,
                patientId,
              },
            });
          }

          const createdPrescription =
            await tx.prescription.create({
              data: {
                patientId,
                recordType,
                issuedAt,
                doctorName,
                diagnosis,
                notes,
                complaints,
                historyOfPresentIllness,
                pastFamilyHistory,
                examination,
                medicines,
                advice,
                testsPrescribed,
                nextVisit,
                ...attachmentData,
                createdById:
                  sessionUser.id || null,
              },
              include: {
                patient: {
                  select: {
                    id: true,
                    patientCode: true,
                    fullName: true,
                    mobile: true,
                    age: true,
                    gender: true,
                    category: true,
                    diagnosis: true,
                  },
                },
              },
            });

          let followUp = null;
          let followUpAction = "";

          if (
            recordType === "generated" &&
            nextVisitFollowUpDate
          ) {
            const existingFollowUp =
              await tx.followUp.findFirst({
                where: {
                  patientId,
                  status: "Scheduled",
                  source: "prescription",
                },
                orderBy: {
                  dueDate: "asc",
                },
              });

            if (existingFollowUp) {
              followUp =
                await tx.followUp.update({
                  where: {
                    id: existingFollowUp.id,
                  },
                  data: {
                    dueDate:
                      nextVisitFollowUpDate,
                    type: "visit",
                    priority: "medium",
                    notes:
                      "Next visit from latest prescription",
                  },
                });

              followUpAction = "rescheduled";
            } else {
              followUp =
                await tx.followUp.create({
                  data: {
                    patientId,
                    dueDate:
                      nextVisitFollowUpDate,
                    type: "visit",
                    priority: "medium",
                    status: "Scheduled",
                    source: "prescription",
                    notes:
                      "Next visit from prescription",
                  },
                });

              followUpAction = "scheduled";
            }

            const nearest =
              await tx.followUp.findFirst({
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

            await tx.patient.update({
              where: {
                id: patientId,
              },
              data: {
                nextFollowUp:
                  nearest?.dueDate || null,
              },
            });
          }

          return {
            prescription:
              createdPrescription,
            followUp,
            followUpAction,
          };
        },
      );

      prescription =
        result.prescription;

      prescriptionFollowUp =
        result.followUp;

      prescriptionFollowUpAction =
        result.followUpAction;
    } catch (createError) {
      if (
        recordType === "generated" &&
        createError?.code === "P2002"
      ) {
        return Response.json(
          {
            success: false,
            message:
              "This prescription has already been submitted. Refresh patient history before saving again.",
          },
          { status: 409 },
        );
      }

      throw createError;
    }

    uploadedBlob = null;

    if (
      recordType === "generated" &&
      medicines.length
    ) {
      const catalogMedicines =
        new Map();

      for (const item of medicines) {
        const name = String(
          item.medicine || "",
        )
          .trim()
          .replace(/\s+/g, " ");

        if (!name) continue;

        const strength = String(
          item.strength || "",
        )
          .trim()
          .replace(/\s+/g, " ");

        const unit = String(
          item.unit || "",
        )
          .trim()
          .replace(/\s+/g, " ");

        const key = [
          name.toLowerCase(),
          strength.toLowerCase(),
          unit.toLowerCase(),
        ].join("|");

        if (!catalogMedicines.has(key)) {
          catalogMedicines.set(
            key,
            {
              key,
              name,
              strength,
              unit,
              searchText: [
                name,
                strength,
                unit,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            },
          );
        }
      }

      const now = new Date();

      const results =
        await Promise.allSettled(
          Array.from(
            catalogMedicines.values(),
          ).map((item) =>
            prisma.medicineCatalog.upsert({
              where: {
                key: item.key,
              },
              create: {
                ...item,
                usageCount: 1,
                firstUsedAt: now,
                lastUsedAt: now,
                createdById:
                  sessionUser.id ||
                  null,
              },
              update: {
                name: item.name,
                strength:
                  item.strength,
                unit: item.unit,
                searchText:
                  item.searchText,
                usageCount: {
                  increment: 1,
                },
                lastUsedAt: now,
              },
            }),
          ),
        );

      const failedCatalogWrites =
        results.filter(
          (result) =>
            result.status ===
            "rejected",
        );

      if (
        failedCatalogWrites.length
      ) {
        console.error(
          "MEDICINE CATALOG UPDATE ERROR:",
          failedCatalogWrites.map(
            (result) =>
              result.reason,
          ),
        );
      }
    }

    await logActivity({
      actor: sessionUser,
      module: "prescription",
      action:
        recordType === "generated"
          ? "created"
          : "uploaded",
      title:
        recordType === "generated"
          ? "Prescription created"
          : "Prescription uploaded",
      description:
        recordType === "generated"
          ? `${patient.fullName} · Doctor prescription`
          : `${patient.fullName} · ${attachmentData.attachmentName}`,
      patientId,
      recordId: prescription.id,
      relatedPath: `/patients/${patientId}`,
    });

    if (prescriptionFollowUp) {
      await logActivity({
        actor: sessionUser,
        module: "follow-up",
        action:
          prescriptionFollowUpAction ||
          "scheduled",
        title:
          prescriptionFollowUpAction ===
          "rescheduled"
            ? "Prescription follow-up updated"
            : "Prescription follow-up scheduled",
        description:
          `${patient.fullName} · Next visit from prescription`,
        patientId,
        recordId:
          prescriptionFollowUp.id,
        relatedPath:
          `/patients/${patientId}`,
      });
    }

    return Response.json(
      {
        success: true,
        prescription:
          serializePrescription(prescription),
        followUp:
          prescriptionFollowUp,
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
