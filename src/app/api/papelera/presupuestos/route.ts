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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron identificadores" }, { status: 400 });
    }

    if (action === "restore") {
      const result = await prisma.budget.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} presupuesto(s) restaurado(s) correctamente.`,
      });
    }

    if (action === "permanent") {
      const result = await prisma.budget.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `${result.count} presupuesto(s) eliminado(s) permanentemente.`,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("Error in bulk budgets trash action:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
