import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const clinicId = request.nextUrl.searchParams.get("clinicId");
    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }
    const templates = await prisma.whiteboardTemplate.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching whiteboard templates:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, imageUrl, clinicId } = body;
    if (!name || !imageUrl || !clinicId) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }
    const template = await prisma.whiteboardTemplate.create({
      data: {
        name,
        imageUrl,
        clinicId,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating whiteboard template:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
