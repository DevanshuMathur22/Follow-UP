import prisma from "../../../../src/lib/prisma";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        isDeleted: true,
      },
      orderBy: {
        deletedAt: "desc",
      },
    });

    return Response.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("GET ARCHIVED PATIENTS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load archived patients",
      },
      { status: 500 },
    );
  }
}
