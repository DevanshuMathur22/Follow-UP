import prisma from "../../../src/lib/prisma";

const genders = ["Female", "Male", "Other", "Prefer_not_to_say"];

function cleanPatient(data) {
  return {
    fullName: String(data.fullName || "").trim(),
    age: data.age === "" || data.age === undefined || data.age === null ? null : Number(data.age),
    gender: data.gender || null,
    dob: data.dob ? new Date(data.dob) : null,
    mobile: String(data.mobile || "").trim(),
    whatsapp: data.whatsapp ? String(data.whatsapp).trim() : null,
    address: data.address ? String(data.address).trim() : null,
    city: data.city ? String(data.city).trim() : null,
    state: data.state ? String(data.state).trim() : null,
    category: data.category ? String(data.category).trim() : "Other",
    diagnosis: data.diagnosis ? String(data.diagnosis).trim() : null,
    history: data.history ? String(data.history).trim() : null,
    allergies: data.allergies ? String(data.allergies).trim() : null,
    remarks: data.remarks ? String(data.remarks).trim() : null,
  };
}

function validatePatient(data) {
  if (!data.fullName) return "Full name is required";
  if (!data.mobile) return "Mobile number is required";

  if (data.age !== null && (!Number.isInteger(data.age) || data.age < 0 || data.age > 150)) {
    return "Invalid age";
  }

  if (data.gender && !genders.includes(data.gender)) {
    return "Invalid gender";
  }

  if (data.dob && Number.isNaN(data.dob.getTime())) {
    return "Invalid date of birth";
  }

  return null;
}

async function generatePatientCode() {
  const lastPatient = await prisma.patient.findFirst({
    orderBy: {
      patientCode: "desc",
    },
    select: {
      patientCode: true,
    },
  });

  const lastNumber = Number(
    String(lastPatient?.patientCode || "PT-000000").replace("PT-", "")
  );

  return `PT-${String((Number.isFinite(lastNumber) ? lastNumber : 0) + 1).padStart(6, "0")}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const patients = await prisma.patient.findMany({
      where: {
        isDeleted: false,
        ...(search
          ? {
              OR: [
                {
                  fullName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  mobile: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  patientCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("GET PATIENTS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load patients",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = cleanPatient(body);

    const validationError = validatePatient(data);

    if (validationError) {
      return Response.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 }
      );
    }

    let patient = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        patient = await prisma.patient.create({
          data: {
            ...data,
            patientCode: await generatePatientCode(),
            status: "active",
            isDeleted: false,
          },
        });

        break;
      } catch (error) {
        if (error.code !== "P2002") throw error;
      }
    }

    if (!patient) {
      return Response.json(
        {
          success: false,
          message: "Could not generate patient code",
        },
        { status: 409 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        name: patient.category,
      },
    });

    if (category?.followUpIntervalDays) {
      const nextFollowUp = new Date(patient.createdAt);

      nextFollowUp.setDate(
        nextFollowUp.getDate() + category.followUpIntervalDays
      );

      await prisma.patient.update({
        where: {
          id: patient.id,
        },
        data: {
          nextFollowUp,
        },
      });

      await prisma.followUp.create({
        data: {
          patientId: patient.id,
          dueDate: nextFollowUp,
          type: "call",
          priority: "medium",
          status: "Scheduled",
          source: "category",
          notes: "Auto generated follow-up",
        },
      });

      patient = await prisma.patient.findUnique({
        where:{
          id:patient.id,
        },
      });
    }

    return Response.json(
      {
        success: true,
        patient,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE PATIENT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to create patient",
      },
      { status: 500 }
    );
  }
}