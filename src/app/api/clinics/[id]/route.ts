import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Falta ID de clínica" }, { status: 400 });
    }

    const clinic = await prisma.clinic.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        logo: body.logo,
        controlHorarioActivo: body.controlHorarioActivo !== undefined ? body.controlHorarioActivo : undefined,
      },
    });

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("Error updating clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
