import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
      },
      include: {
        clinics: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let isPasswordCorrect = false;
    if (user.password.includes(":")) {
      isPasswordCorrect = verifyPassword(password, user.password);
    } else {
      // Legacy compatibility: check plaintext and auto-migrate to secure hash
      isPasswordCorrect = user.password === password;
      if (isPasswordCorrect) {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashPassword(password) },
        });
      }
    }

    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinics: user.clinics,
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
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
