import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET() {
  try {
    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const templates = await prisma.documentTemplate.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { name, content } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "Faltan datos obligatorios (nombre y contenido)" }, { status: 400 });
    }

    const template = await prisma.documentTemplate.create({
      data: { name: name.trim(), content },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating document template:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
