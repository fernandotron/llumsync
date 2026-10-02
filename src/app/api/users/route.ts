import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
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
        shifts: {
          where: {
            OR: [
              { clinicId },
              { clinicId: null }
            ]
          }
        },
        clinics: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });

    // Remove password hash from response
    const safeUsers = users.map(({ password, ...u }: { password: string; [key: string]: any }) => u);

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
