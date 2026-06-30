import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const onlyAgenda = searchParams.get("onlyAgenda") === "true";
    const whereClause: any = {
      clinics: {
        some: {
          id: clinicId,
        },
      },
    };
    if (onlyAgenda) {
      whereClause.showInAgenda = true;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        shifts: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
