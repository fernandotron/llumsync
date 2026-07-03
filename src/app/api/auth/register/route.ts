import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (nombre, email o contraseña)" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        password,
        role: "ADMIN",
        permissionsJson: JSON.stringify({
          agenda: ["Sus agendas", "Agendas del centro"],
          clientes: ["Ver clientes", "Ver datos personales", "Crear clientes", "Editar clientes", "Eliminar clientes"],
          configuracion: ["Ver configuración", "Configurar servicios", "Editar su propio horario", "Configurar notificaciones", "Importar datos"],
          contabilidad: ["Ver contabilidad", "Facturas - Ver listado", "Facturas - Crear facturas", "Facturas - Descargar PDF", "Caja - Ver movimientos", "Caja - Crear movimientos"],
          estadisticas: ["Ver estadísticas"],
          otros: []
        })
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinics: [],
        permissionsJson: user.permissionsJson,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
