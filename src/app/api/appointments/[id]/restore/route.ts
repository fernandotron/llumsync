import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userName, userId } = body;

    // Load the deleted appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { user: true, service: true, client: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    // Restore: clear deletedAt
    await prisma.appointment.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Create RESTORED log
    await prisma.appointmentLog.create({
      data: {
        appointmentId: id,
        action: "RESTORED",
        userId: userId || null,
        userName: userName || "Sistema",
        previousValue: "En papelera",
        newValue: "Activa",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
