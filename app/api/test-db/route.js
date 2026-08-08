import { getSessionUser } from "../../../src/lib/auth";
import prisma from "../../../src/lib/prisma";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      {
        success: false,
        message: "Not found",
      },
      { status: 404 },
    );
  }

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