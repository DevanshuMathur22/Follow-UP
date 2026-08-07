import prisma from "../../../src/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.count();
    const patients = await prisma.patient.count();

    return Response.json({
      success: true,
      database: "connected",
      users,
      patients,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}