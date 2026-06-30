import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/budgets/templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const templates = await prisma.budgetTemplate.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching budget templates:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/budgets/templates
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, clinicId, total, itemsJson } = body;

    if (!name || !clinicId || total === undefined || !itemsJson) {
      return NextResponse.json({ error: "Faltan datos obligatorios para la plantilla de presupuesto" }, { status: 400 });
    }

    const template = await prisma.budgetTemplate.create({
      data: {
        name,
        clinicId,
        total: parseFloat(total),
        itemsJson,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating budget template:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
