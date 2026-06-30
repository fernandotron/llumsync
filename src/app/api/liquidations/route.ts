import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/liquidations?clinicId=...&userId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const userId = searchParams.get("userId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const where: any = { clinicId };
    if (userId) {
      where.userId = userId;
    }

    const liquidations = await prisma.liquidation.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(liquidations);
  } catch (error) {
    console.error("Error fetching liquidations list:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/liquidations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, clinicId, periodStart, periodEnd, totalAmount, details } = body;

    if (!userId || !clinicId || !periodStart || !periodEnd || totalAmount === undefined) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios" }, { status: 400 });
    }

    const liquidation = await prisma.liquidation.create({
      data: {
        userId,
        clinicId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        totalAmount: parseFloat(totalAmount),
        detailsJson: details ? JSON.stringify(details) : "[]",
        status: "PENDING",
      },
    });

    return NextResponse.json(liquidation);
  } catch (error) {
    console.error("Error creating liquidation:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
