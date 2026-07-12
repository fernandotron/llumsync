import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { clientIds, tags } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron IDs de clientes" }, { status: 400 });
    }
    
    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json({ error: "No se proporcionó lista de etiquetas" }, { status: 400 });
    }

    const tagsString = tags.join(",");

    // Update each client's tags
    const result = await prisma.client.updateMany({
      where: {
        id: { in: clientIds }
      },
      data: {
        tags: tagsString || null
      }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error updating bulk client tags:", error);
    return NextResponse.json({ error: "Error en el servidor al actualizar etiquetas" }, { status: 500 });
  }
}
