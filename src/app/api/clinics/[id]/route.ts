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

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.controlHorarioActivo !== undefined) updateData.controlHorarioActivo = body.controlHorarioActivo;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.birthdayEnabled !== undefined) updateData.birthdayEnabled = body.birthdayEnabled;
    if (body.birthdayMessage !== undefined) updateData.birthdayMessage = body.birthdayMessage;
    if (body.birthdayDiscount !== undefined) updateData.birthdayDiscount = parseInt(body.birthdayDiscount);
    if (body.birthdayImageUrl !== undefined) updateData.birthdayImageUrl = body.birthdayImageUrl;
    if (body.birthdayCardTheme !== undefined) updateData.birthdayCardTheme = body.birthdayCardTheme;

    const clinic = await prisma.clinic.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("Error updating clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de clínica" }, { status: 400 });
    }

    await prisma.clinic.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Clínica eliminada correctamente" });
  } catch (error) {
    console.error("Error deleting clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
