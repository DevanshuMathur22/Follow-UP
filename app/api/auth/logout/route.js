import prisma from "../../../../src/lib/prisma";
import {
  clearSessionCookie,
  getSessionUser,
} from "../../../../src/lib/auth";

export async function POST() {
  try {
    const sessionUser = await getSessionUser();

    if (sessionUser) {
      await prisma.user.update({
        where: {
          id: sessionUser.id,
        },
        data: {
          sessionVersion: {
            increment: 1,
          },
        },
      });
    }

    await clearSessionCookie();

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    try {
      await clearSessionCookie();
    } catch {}

    return Response.json(
      {
        success: false,
        message: "Unable to completely invalidate the session",
      },
      { status: 500 },
    );
  }
}
