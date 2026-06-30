import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId: clinicId,
    };

    if (startStr && endStr) {
      whereClause.date = {
        gte: new Date(startStr),
        lte: new Date(endStr),
      };
    }

    const movements = await prisma.movement.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Error fetching movements:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { concept, amount, method, type, date, clinicId } = body;

    if (!concept || amount === undefined || !method || !type || !date || !clinicId) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const movement = await prisma.movement.create({
      data: {
        concept,
        amount: parseFloat(amount),
        method,
        type,
        date: new Date(date),
        clinicId,
      },
    });

    return NextResponse.json(movement);
  } catch (error) {
    console.error("Error creating movement:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, concept, amount, method, type, date } = body;

    if (!id || !concept || amount === undefined || !method || !type || !date) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const movement = await prisma.movement.update({
      where: { id },
      data: {
        concept,
        amount: parseFloat(amount),
        method,
        type,
        date: new Date(date),
      },
    });

    return NextResponse.json(movement);
  } catch (error) {
    console.error("Error updating movement:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const deleted = await prisma.movement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting movement:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
