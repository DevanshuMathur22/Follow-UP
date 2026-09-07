import prisma from "../../../src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.user.findFirst({
      select: {
        id: true,
      },
    });

    return Response.json({
      status: "ok",
      database: "connected",
      service: "caretrack",
      timestamp: new Date().toISOString(),
      responseMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      "HEALTH CHECK ERROR:",
      error,
    );

    return Response.json(
      {
        status: "error",
        database: "unavailable",
        service: "caretrack",
        timestamp:
          new Date().toISOString(),
      },
      {
        status: 503,
      },
    );
  }
}
