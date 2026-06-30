import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/liquidations/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const liquidation = await prisma.liquidation.findUnique({
      where: { id },
    });

    if (!liquidation) {
      return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });
    }

    const updated = await prisma.liquidation.update({
      where: { id },
      data: {
        status: status || liquidation.status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating liquidation:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// DELETE /api/liquidations/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const liquidation = await prisma.liquidation.findUnique({
      where: { id },
    });

    if (!liquidation) {
      return NextResponse.json({ error: "Liquidación no encontrada" }, { status: 404 });
    }

    await prisma.liquidation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting liquidation:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
