import prisma from "../../../../src/lib/prisma";

export async function PATCH(request,{params}) {
  try {
    const body = await request.json();

    const followUp = await prisma.followUp.update({
      where:{
        id:params.followUpId,
      },
      data:{
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
      include:{
        patient:true,
      },
    });

    return Response.json({
      success:true,
      followUp,
    });

  } catch(error){

    console.error("UPDATE FOLLOW UP ERROR:",error);

    return Response.json(
      {
        success:false,
        message:"Failed to update follow-up",
      },
      {
        status:500
      }
    );
  }
}