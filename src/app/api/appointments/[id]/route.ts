import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get("userName") || "Sistema";
    const userId = searchParams.get("userId") || undefined;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de cita" }, { status: 400 });
    }

    // Soft delete — move to trash
    await prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log the deletion
    await prisma.appointmentLog.create({
      data: {
        appointmentId: id,
        action: "DELETED",
        userId: userId || null,
        userName,
        previousValue: "Activa",
        newValue: "En papelera",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
