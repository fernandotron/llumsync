import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/budgets/consume
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { budgetId, amount } = body;

    if (!budgetId || amount === undefined) {
      return NextResponse.json({ error: "Faltan datos obligatorios para consumir presupuesto" }, { status: 400 });
    }

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    }

    const parseAmount = parseFloat(amount);
    if (budget.remainingAmount < parseAmount) {
      return NextResponse.json({ error: "Saldo insuficiente en el presupuesto" }, { status: 400 });
    }

    const updated = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        remainingAmount: budget.remainingAmount - parseAmount,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error consuming budget amount:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
