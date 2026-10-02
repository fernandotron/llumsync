import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Falta el token de Google" }, { status: 400 });
    }

    // Cryptographically verify the Google ID Token with Google's public tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Token de Google inválido o caducado" }, { status: 401 });
    }

    const payload = await verifyRes.json();

    // Verify audience matches our Client ID
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "619688463085-9abm5uk9e44188qk8co8sn44cqhtf7aa.apps.googleusercontent.com";
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "Error de verificación de cliente Google" }, { status: 401 });
    }

    // Verify email is present and verified by Google
    const isEmailVerified = payload.email_verified === "true" || payload.email_verified === true;
    if (!payload.email || !isEmailVerified) {
      return NextResponse.json({ error: "El correo electrónico no está verificado por Google" }, { status: 401 });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name;

    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: { email },
      include: { clinics: true },
    });

    if (!user) {
      // Register a new user automatically as ADMIN
      user = await prisma.user.create({
        data: {
          name: name || email.split("@")[0],
          email: email,
          password: "google-auth", // default placeholder password for oauth users
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
        include: { clinics: true },
      });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinics: user.clinics || [],
        permissionsJson: user.permissionsJson,
      },
    });

    // Set secure HTTP-only session cookie for the authenticated user
    response.cookies.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Google authentication error:", error);
    return NextResponse.json({ error: "Error en el servidor al autenticar con Google" }, { status: 500 });
  }
}
