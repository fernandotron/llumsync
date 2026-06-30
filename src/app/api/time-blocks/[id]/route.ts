import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de bloqueo de tiempo" }, { status: 400 });
    }

    await prisma.timeBlock.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Bloqueo de tiempo eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting time block:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, start, end, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de bloqueo de tiempo" }, { status: 400 });
    }

    const updatedBlock = await prisma.timeBlock.update({
      where: { id },
      data: {
        title,
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
        notes,
      },
    });

    return NextResponse.json(updatedBlock);
  } catch (error: any) {
    console.error("Error updating time block:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
