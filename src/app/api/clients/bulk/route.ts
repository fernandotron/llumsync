import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { clientIds } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron IDs de clientes" }, { status: 400 });
    }

    // Soft delete — move clients to trash instead of hard deleting
    const result = await prisma.client.updateMany({
      where: {
        id: { in: clientIds },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error bulk deleting clients:", error);
    return NextResponse.json({ error: "Error en el servidor al eliminar clientes" }, { status: 500 });
  }
}
