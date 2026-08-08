import prisma from "./prisma";

export async function logActivity({
  module,
  action,
  title,
  description,
  patientId,
  recordId,
  relatedPath,
  actor,
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        module,
        action,
        title,
        description: description || null,
        patientId: patientId || null,
        recordId: recordId || null,
        relatedPath: relatedPath || null,
        actorId: actor?.id || null,
        actorName: actor?.name || null,
        actorRole: actor?.role || null,
      },
    });
  } catch (error) {
    console.error("ACTIVITY LOG ERROR:", error);
    return null;
  }
}
