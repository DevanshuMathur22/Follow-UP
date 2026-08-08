import { forbiddenResponse, hasPermission, permissions } from "../../../../src/lib/permissions";
import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";
import { logActivity } from "../../../../src/lib/activityLog";

const genders = ["Female", "Male", "Other", "Prefer_not_to_say"];

function buildUpdates(data) {
  const updates = {};

  if (data.fullName !== undefined) updates.fullName = String(data.fullName).trim();

  if (data.age !== undefined) {
    updates.age = data.age === "" || data.age === null ? null : Number(data.age);
  }

  if (data.gender !== undefined) {
    updates.gender = data.gender || null;
  }

  if (data.dob !== undefined) {
    updates.dob = data.dob ? new Date(data.dob) : null;
  }

  if (data.mobile !== undefined) updates.mobile = String(data.mobile).trim();
  if (data.whatsapp !== undefined) updates.whatsapp = data.whatsapp ? String(data.whatsapp).trim() : null;
  if (data.address !== undefined) updates.address = data.address ? String(data.address).trim() : null;
  if (data.city !== undefined) updates.city = data.city ? String(data.city).trim() : null;
  if (data.state !== undefined) updates.state = data.state ? String(data.state).trim() : null;
  if (data.category !== undefined) updates.category = data.category ? String(data.category).trim() : "Other";
  if (data.diagnosis !== undefined) updates.diagnosis = data.diagnosis ? String(data.diagnosis).trim() : null;
  if (data.history !== undefined) updates.history = data.history ? String(data.history).trim() : null;
  if (data.allergies !== undefined) updates.allergies = data.allergies ? String(data.allergies).trim() : null;
  if (data.remarks !== undefined) updates.remarks = data.remarks ? String(data.remarks).trim() : null;

  return updates;
}

function sameValue(current, next) {
  if (current instanceof Date || next instanceof Date) {
    const currentTime = current ? new Date(current).getTime() : null;
    const nextTime = next ? new Date(next).getTime() : null;
    return currentTime === nextTime;
  }

  return current === next;
}

function validateUpdates(data) {
  if ("fullName" in data && !data.fullName) return "Full name is required";
  if ("mobile" in data && !data.mobile) return "Mobile number is required";

  if (
    data.age !== undefined &&
    data.age !== null &&
    (!Number.isInteger(data.age) || data.age < 0 || data.age > 150)
  ) {
    return "Invalid age";
  }

  if (data.gender && !genders.includes(data.gender)) {
    return "Invalid gender";
  }

  if (data.dob && Number.isNaN(data.dob.getTime())) {
    return "Invalid date of birth";
  }

  return null;
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

    const { patientId } = await params;

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: false,
      },
    });

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("GET PATIENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load patient",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    const { patientId } = await params;
    const body = await request.json();
    const updates = buildUpdates(body);

    const validationError = validateUpdates(updates);

    if (validationError) {
      return Response.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 }
      );
    }

    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: false,
      },
    });

    if (!existingPatient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 }
      );
    }

    const categoryChanged =
      updates.category !== undefined &&
      String(updates.category).toLowerCase() !==
        String(existingPatient.category || "").toLowerCase();

    let selectedCategory = null;

    if (categoryChanged) {
      selectedCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: updates.category,
            mode: "insensitive",
          },
          active: true,
        },
      });

      if (!selectedCategory) {
        return Response.json(
          {
            success: false,
            message: "Active category not found",
          },
          { status: 400 }
        );
      }

      updates.category = selectedCategory.name;
    }

    const changedFields = Object.keys(updates).filter(
      (field) => !sameValue(existingPatient[field], updates[field])
    );

    if (!changedFields.length) {
      return Response.json({
        success: true,
        patient: existingPatient,
      });
    }

    await prisma.patient.update({
      where: {
        id: patientId,
      },
      data: updates,
    });

    if (categoryChanged && selectedCategory) {
      const dueDate = new Date();
      dueDate.setDate(
        dueDate.getDate() + selectedCategory.followUpIntervalDays
      );

      const categoryFollowUp = await prisma.followUp.findFirst({
        where: {
          patientId,
          status: "Scheduled",
          source: "category",
        },
        orderBy: {
          dueDate: "asc",
        },
      });

      if (categoryFollowUp) {
        await prisma.followUp.update({
          where: {
            id: categoryFollowUp.id,
          },
          data: {
            dueDate,
            notes: `Category follow-up: ${selectedCategory.name}`,
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
            notes: `Category follow-up: ${selectedCategory.name}`,
          },
        });
      }

      const nextFollowUp = await prisma.followUp.findFirst({
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
          nextFollowUp: nextFollowUp?.dueDate || null,
        },
      });
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id: patientId,
      },
    });

    await logActivity({
      actor: sessionUser,
      module: "patient",
      action: categoryChanged ? "category_changed" : "updated",
      title: categoryChanged ? "Patient category changed" : "Patient updated",
      description: categoryChanged
        ? `${patient.fullName} · ${existingPatient.category} → ${patient.category}`
        : patient.fullName,
      patientId: patient.id,
      recordId: patient.id,
      relatedPath: `/patients/${patient.id}`,
    });

    return Response.json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("UPDATE PATIENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to update patient",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    if (!hasPermission(sessionUser.role, permissions.ARCHIVE_PATIENTS)) {
      return forbiddenResponse();
    }

    const { patientId } = await params;

    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: false,
      },
    });

    if (!existingPatient) {
      return Response.json(
        {
          success: false,
          message: "Patient not found",
        },
        { status: 404 }
      );
    }

    const patient = await prisma.patient.update({
      where: {
        id: patientId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        statusBeforeDeletion: existingPatient.status,
        status: "archived",
        deletedById: sessionUser.id,
      },
    });

    await logActivity({
      actor: sessionUser,
      module: "patient",
      action: "archived",
      title: "Patient archived",
      description: `${patient.fullName} · ${patient.patientCode}`,
      patientId: patient.id,
      recordId: patient.id,
      relatedPath: `/patients/archived`,
    });

    return Response.json({
      success: true,
      message: "Patient archived successfully",
      patient,
    });
  } catch (error) {
    console.error("DELETE PATIENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to archive patient",
      },
      { status: 500 }
    );
  }
}