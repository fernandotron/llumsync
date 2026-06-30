import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Hard delete — permanently removes from DB
    await prisma.appointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error permanently deleting appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
