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

    const deletedClients = await prisma.client.findMany({
      where: {
        clinicId,
        deletedAt: { not: null }, // Only trashed clients
      },
      orderBy: { deletedAt: "desc" },
    });

    return NextResponse.json(deletedClients);
  } catch (error) {
    console.error("Error fetching trashed clients:", error);
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
      const result = await prisma.client.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} cliente(s) restaurado(s) correctamente.`,
      });
    }

    if (action === "permanent") {
      // Protection against deleting clients with tax/invoice records (Ley 58/2003)
      const salesWithClients = await prisma.sale.findMany({
        where: { clientId: { in: ids } },
        select: { clientId: true },
        distinct: ["clientId"],
      });

      const blockedIds = new Set(salesWithClients.map((s: any) => s.clientId));
      const safeIds = ids.filter((id: string) => !blockedIds.has(id));


      let deletedCount = 0;
      if (safeIds.length > 0) {
        const delRes = await prisma.client.deleteMany({
          where: { id: { in: safeIds } },
        });
        deletedCount = delRes.count;
      }

      let message = `${deletedCount} cliente(s) eliminado(s) de forma permanente.`;
      if (blockedIds.size > 0) {
        message += ` ${blockedIds.size} cliente(s) no se pudieron eliminar porque tienen facturas emitidas (obligación legal de conservación).`;
      }

      return NextResponse.json({
        success: true,
        deletedCount,
        blockedCount: blockedIds.size,
        message,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("Error in bulk clients trash action:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
