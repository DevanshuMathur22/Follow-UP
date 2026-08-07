import prisma from "../../../../../src/lib/prisma";

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export async function PATCH(request, { params }) {
  try {
    const { patientId } = await params;

    if (!validObjectId(patientId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid patient ID",
        },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        isDeleted: true,
      },
    });

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Archived patient not found",
        },
        { status: 404 },
      );
    }

    const restoredPatient = await prisma.patient.update({
      where: {
        id: patientId,
      },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
        status: patient.statusBeforeDeletion || "active",
        statusBeforeDeletion: null,
      },
    });

    return Response.json({
      success: true,
      message: "Patient restored successfully",
      patient: restoredPatient,
    });
  } catch (error) {
    console.error("RESTORE PATIENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to restore patient",
      },
      { status: 500 },
    );
  }
}
