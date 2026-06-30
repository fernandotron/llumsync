import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de presupuesto" }, { status: 400 });
    }

    await prisma.budget.update({
      where: { id },
      data: { deletedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring budget:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
