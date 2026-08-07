import prisma from "../../../../src/lib/prisma";

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
      select: {
        id: true,
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
      data: updates,
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
      },
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