import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
               request.headers.get("x-real-ip") || 
               "127.0.0.1";
               
    const rate = checkRateLimit(ip, "register", 3, 3600000); // 3 registrations per 1 hour
    if (rate.limited) {
      const retryAfter = Math.ceil((rate.reset - Date.now()) / 1000);
      const retryMinutes = Math.ceil(retryAfter / 60);
      return NextResponse.json(
        { error: `Demasiados registros desde esta dirección IP. Por favor, espere ${retryMinutes} minutos.` },
        { 
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": String(rate.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rate.reset / 1000)),
          }
        }
      );
    }

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

    const hashed = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        password: hashed,
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

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinics: [],
        permissionsJson: user.permissionsJson,
      },
    });

    // Set HTTP-only session cookie
    response.cookies.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
