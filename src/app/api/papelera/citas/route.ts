import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const deletedAppointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        deletedAt: { not: null }, // Only trashed appointments
      },
      include: {
        client: true,
        user: true,
        service: true,
        clinic: true,
      },
      orderBy: { deletedAt: "desc" },
    });

    return NextResponse.json(deletedAppointments);
  } catch (error) {
    console.error("Error fetching trashed appointments:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ids, userName, userId } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron identificadores" }, { status: 400 });
    }

    if (action === "restore") {
      const result = await prisma.appointment.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: null },
      });

      // Optionally record logs if appointments exist
      try {
        await prisma.appointmentLog.createMany({
          data: ids.map((appointmentId) => ({
            appointmentId,
            action: "RESTORED",
            notes: `Restaurada en lote desde la papelera por ${userName || "Usuario"}`,
            userId: userId || null,
          })),
        });
      } catch (logErr) {
        // Continue even if logging fails
        console.warn("Could not write appointment logs for bulk restore:", logErr);
      }

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} cita(s) restaurada(s) correctamente.`,
      });
    }

    if (action === "permanent") {
      const result = await prisma.appointment.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `${result.count} cita(s) eliminada(s) permanentemente.`,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("Error in bulk appointments trash action:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
