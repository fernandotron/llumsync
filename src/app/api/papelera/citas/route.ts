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
