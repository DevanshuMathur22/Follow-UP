import { getSessionUser } from "../../../../src/lib/auth";
import prisma from "../../../../src/lib/prisma";

function validDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const [year, month] = value.split("-").map(Number);

  return (
    year >= 2000 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}

export async function GET(request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const month = searchParams.get("month");

    if (date) {
      if (!validDateKey(date)) {
        return Response.json(
          {
            success: false,
            message: "Invalid date",
          },
          { status: 400 },
        );
      }

      const override =
        await prisma.doctorScheduleOverride.findUnique({
          where: {
            dateKey: date,
          },
          include: {
            sessions: {
              where: {
                active: true,
              },
              include: {
                location: true,
              },
              orderBy: {
                startTime: "asc",
              },
            },
          },
        });

      return Response.json({
        success: true,
        override,
      });
    }

    if (month) {
      if (!validMonth(month)) {
        return Response.json(
          {
            success: false,
            message: "Invalid month",
          },
          { status: 400 },
        );
      }

      const [year, monthNumber] = month.split("-").map(Number);

      const startDate = `${year}-${String(monthNumber).padStart(2, "0")}-01`;

      const nextYear =
        monthNumber === 12
          ? year + 1
          : year;

      const nextMonthNumber =
        monthNumber === 12
          ? 1
          : monthNumber + 1;

      const nextDate = `${nextYear}-${String(nextMonthNumber).padStart(2, "0")}-01`;

      const overrides =
        await prisma.doctorScheduleOverride.findMany({
          where: {
            dateKey: {
              gte: startDate,
              lt: nextDate,
            },
          },
          include: {
            sessions: {
              where: {
                active: true,
              },
              include: {
                location: true,
              },
              orderBy: {
                startTime: "asc",
              },
            },
          },
          orderBy: {
            dateKey: "asc",
          },
        });

      return Response.json({
        success: true,
        overrides,
      });
    }

    const overrides =
      await prisma.doctorScheduleOverride.findMany({
        include: {
          sessions: {
            where: {
              active: true,
            },
            include: {
              location: true,
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
        orderBy: {
          dateKey: "asc",
        },
        take: 100,
      });

    return Response.json({
      success: true,
      overrides,
    });
  } catch (error) {
    console.error(
      "GET SCHEDULE OVERRIDES ERROR:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to load schedule overrides",
      },
      { status: 500 },
    );
  }
}
