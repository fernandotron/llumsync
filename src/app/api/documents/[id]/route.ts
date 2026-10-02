import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de plantilla" }, { status: 400 });
    }

    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const template = await prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de plantilla" }, { status: 400 });
    }

    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { name, content } = body;

    if (!name || !content) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const updated = await prisma.documentTemplate.update({
      where: { id },
      data: { name: name.trim(), content },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
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
      return NextResponse.json({ error: "Falta ID de plantilla" }, { status: 400 });
    }

    const auth = await authenticateApiRequest();
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    await prisma.documentTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
