import prisma from "../../../src/lib/prisma";

export async function GET() {
  try {
    const followUps = await prisma.followUp.findMany({
      include: {
        patient: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return Response.json({
      success: true,
      followUps,
    });
  } catch (error) {
    console.error("GET FOLLOW UPS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load follow-ups",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const followUp = await prisma.followUp.create({
      data: {
        patientId: body.patient,
        dueDate: new Date(body.dueDate),
        type: body.type || "call",
        priority: body.priority || "medium",
        status: body.status || "Scheduled",
        notes: body.notes || null,
      },
      include: {
        patient: true,
      },
    });

    return Response.json({
      success: true,
      followUp,
    });
  } catch (error) {
    console.error("CREATE FOLLOW UP ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to create follow-up",
      },
      { status: 500 }
    );
  }
}