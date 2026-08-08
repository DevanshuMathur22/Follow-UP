import { clearSessionCookie } from "../../../../src/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return Response.json(
      { success: false, message: "Unable to sign out" },
      { status: 500 },
    );
  }
}
