import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      lastName,
      email,
      dniNif,
      phone,
      address,
      municipality,
      postalCode,
      additionalData,
      color,
      showInAgenda,
      permissionsJson
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta el ID de usuario" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        lastName,
        email,
        dniNif,
        phone,
        address,
        municipality,
        postalCode,
        additionalData,
        color,
        showInAgenda: showInAgenda !== undefined ? Boolean(showInAgenda) : undefined,
        permissionsJson: permissionsJson !== undefined ? permissionsJson : undefined
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de usuario" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        clinics: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Hide password for safety
    const { password, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
