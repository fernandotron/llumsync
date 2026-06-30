import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const deletedBudgets = await prisma.budget.findMany({
      where: {
        clinicId,
        deletedAt: { not: null }, // Trashed budgets
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { deletedAt: "desc" },
    });

    return NextResponse.json(deletedBudgets);
  } catch (error) {
    console.error("Error fetching trashed budgets:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
