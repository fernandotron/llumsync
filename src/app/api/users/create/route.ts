import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      lastName,
      email,
      password,
      role,
      phone,
      dniNif,
      address,
      municipality,
      postalCode,
      additionalData,
      color,
      permissionsJson,
      clinicIds,
    } = body;

    if (!name || !email || !password || !role || !clinicIds || !Array.isArray(clinicIds) || clinicIds.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios para el usuario o clínicas" },
        { status: 400 }
      );
    }

    // Verify user doesn't exist
    const existing = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        lastName: lastName || null,
        email: email.trim().toLowerCase(),
        password, // demo simple password
        role,
        phone: phone || null,
        dniNif: dniNif || null,
        address: address || null,
        municipality: municipality || null,
        postalCode: postalCode || null,
        additionalData: additionalData || null,
        color: color || "#3b82f6",
        clinics: {
          connect: clinicIds.map((id: string) => ({ id })),
        },
        permissionsJson: permissionsJson || JSON.stringify({
          agenda: ["Sus agendas"],
          clientes: ["Ver clientes", "Ver datos personales"],
          configuracion: [],
          contabilidad: [],
          estadisticas: [],
          otros: []
        })
      },
    });

    // Create default shifts for this new user in the first selected clinic (Mon-Fri 09:00 to 18:00)
    for (let day = 1; day <= 5; day++) {
      await prisma.shift.create({
        data: {
          userId: user.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          clinicId: clinicIds[0],
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
