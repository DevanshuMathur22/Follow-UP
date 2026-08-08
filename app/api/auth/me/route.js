import { getSessionUser } from "../../../../src/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("SESSION ERROR:", error);

    return Response.json(
      { success: false, message: "Unable to verify session" },
      { status: 500 },
    );
  }
}
