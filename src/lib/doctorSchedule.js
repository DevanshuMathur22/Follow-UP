import prisma from "./prisma";

function getDateInfo(dateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);

  return {
    dayOfWeek: date.getUTCDay(),
    weekOfMonth: Math.ceil(date.getUTCDate() / 7),
  };
}

function filterActive(items) {
  return (items || []).filter(
    (item) => item.location?.active !== false,
  );
}

export async function resolveDoctorSchedule(
  dateKey,
  { locationId } = {},
) {
  const override =
    await prisma.doctorScheduleOverride.findUnique({
      where: { dateKey },
      include: {
        sessions: {
          where: { active: true },
          include: { location: true },
          orderBy: { startTime: "asc" },
        },
      },
    });

  if (override?.mode === "unavailable") {
    return {
      mode: "unavailable",
      note: override.note || null,
      sessions: [],
    };
  }

  if (override?.mode === "custom") {
    const sessions = filterActive(
      override.sessions,
    ).filter(
      (item) =>
        !locationId ||
        item.locationId === locationId,
    );

    return {
      mode: "custom",
      note: override.note || null,
      sessions,
    };
  }

  const { dayOfWeek, weekOfMonth } =
    getDateInfo(dateKey);

  const monthly = filterActive(
    await prisma.doctorAvailability.findMany({
      where: {
        dayOfWeek,
        recurrenceType: "monthly",
        weekOfMonth,
        active: true,
      },
      include: { location: true },
      orderBy: { startTime: "asc" },
    }),
  );

  if (monthly.length) {
    return {
      mode: "monthly",
      note: null,
      dayOfWeek,
      weekOfMonth,
      sessions: monthly.filter(
        (item) =>
          !locationId ||
          item.locationId === locationId,
      ),
    };
  }

  const weekly = filterActive(
    await prisma.doctorAvailability.findMany({
      where: {
        dayOfWeek,
        recurrenceType: "weekly",
        active: true,
        ...(locationId ? { locationId } : {}),
      },
      include: { location: true },
      orderBy: { startTime: "asc" },
    }),
  );

  return {
    mode: "weekly",
    note: null,
    dayOfWeek,
    weekOfMonth,
    sessions: weekly,
  };
}
