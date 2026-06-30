import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const userId = searchParams.get("userId");
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId: clinicId,
    };

    if (userId) {
      whereClause.userId = userId;
    }

    if (startStr && endStr) {
      whereClause.start = {
        gte: new Date(startStr),
      };
      whereClause.end = {
        lte: new Date(endStr),
      };
    }

    const timeBlocks = await prisma.timeBlock.findMany({
      where: whereClause,
      include: {
        user: true,
      },
      orderBy: { start: "asc" },
    });

    return NextResponse.json(timeBlocks);
  } catch (error) {
    console.error("Error fetching time blocks:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, userId, clinicId, start, end, notes } = body;

    if (!title || !userId || !clinicId || !start || !end) {
      return NextResponse.json({ error: "Faltan datos obligatorios para bloquear el tiempo" }, { status: 400 });
    }

    const timeBlock = await prisma.timeBlock.create({
      data: {
        title,
        userId,
        clinicId,
        start: new Date(start),
        end: new Date(end),
        notes,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(timeBlock);
  } catch (error: any) {
    console.error("Error creating time block:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
