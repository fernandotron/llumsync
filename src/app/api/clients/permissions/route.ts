import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { clientIds, userIds } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron IDs de clientes" }, { status: 400 });
    }
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "No se proporcionaron IDs de usuarios" }, { status: 400 });
    }

    // Prisma's updateMany doesn't support relation updates (like connect/set).
    // So we iterate over each client and update them in a transaction.
    const updates = clientIds.map((clientId) => 
      prisma.client.update({
        where: { id: clientId },
        data: {
          allowedUsers: {
            // 'set' completely replaces the existing relationships with the new array of ids
            set: userIds.map((id: string) => ({ id })),
          },
        },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, count: clientIds.length });
  } catch (error) {
    console.error("Error updating bulk permissions:", error);
    return NextResponse.json({ error: "Error en el servidor al actualizar permisos" }, { status: 500 });
  }
}
