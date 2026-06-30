import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/budgets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId,
      deletedAt: null, // Exclude soft-deleted
    };

    if (clientId) {
      whereClause.clientId = clientId;
    }
    if (status) {
      whereClause.status = status;
    }

    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { budgetNumber: "desc" },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/budgets
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, clientId, clinicId, total, itemsJson, status } = body;

    if (!title || !clientId || !clinicId || total === undefined || !itemsJson) {
      return NextResponse.json({ error: "Faltan datos obligatorios para el presupuesto" }, { status: 400 });
    }

    // Generate consecutive budgetNumber
    const maxBudget = await prisma.budget.findFirst({
      where: { clinicId },
      orderBy: { budgetNumber: "desc" },
    });
    const budgetNumber = maxBudget ? maxBudget.budgetNumber + 1 : 1000;

    const budget = await prisma.budget.create({
      data: {
        budgetNumber,
        title,
        clientId,
        clinicId,
        total: parseFloat(total),
        remainingAmount: status === "ACCEPTED" ? parseFloat(total) : 0,
        itemsJson,
        status: status || "PENDING",
      },
      include: { client: true },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
