import prisma from "../../../src/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return Response.json(categories);
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return Response.json(
      {
        message: "Failed to load categories",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const followUpIntervalDays = Number(body.followUpIntervalDays || 30);

    if (!name) {
      return Response.json(
        {
          message: "Category name is required",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(followUpIntervalDays) ||
      followUpIntervalDays < 1 ||
      followUpIntervalDays > 3650
    ) {
      return Response.json(
        {
          message: "Invalid follow-up interval",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return Response.json(
        {
          message: "Category already exists",
        },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        followUpIntervalDays,
        active: true,
      },
    });

    return Response.json(category, { status: 201 });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);

    return Response.json(
      {
        message: "Failed to create category",
      },
      { status: 500 }
    );
  }
}