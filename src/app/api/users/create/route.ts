import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";
import { hashPassword } from "@/lib/crypto";

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

    const auth = await authenticateApiRequest(clinicIds[0]);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    // Only administrators or users with settings/users permission can create staff
    if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPERADMIN") {
      let canManageUsers = false;
      try {
        const perms = JSON.parse(auth.user.permissionsJson || "{}");
        canManageUsers = Array.isArray(perms.configuracion) && perms.configuracion.includes("Ver configuración");
      } catch {
        canManageUsers = false;
      }
      if (!canManageUsers) {
        return NextResponse.json(
          { error: "No tienes permisos suficientes para dar de alta nuevos empleados." },
          { status: 403 }
        );
      }
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
        name: name.trim(),
        lastName: lastName ? lastName.trim() : null,
        email: email.trim().toLowerCase(),
        password: hashPassword(password),
        role: role.toUpperCase(),
        phone: phone ? phone.trim() : null,
        dniNif: dniNif ? dniNif.trim() : null,
        address: address ? address.trim() : null,
        municipality: municipality ? municipality.trim() : null,
        postalCode: postalCode ? postalCode.trim() : null,
        additionalData: additionalData ? additionalData.trim() : null,
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
      include: {
        clinics: {
          select: { id: true, name: true }
        }
      }
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

    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
