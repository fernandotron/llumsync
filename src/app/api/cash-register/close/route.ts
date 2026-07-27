import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, actualCash, denominations, notes, closedByUserId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
    }

    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesión de caja no encontrada" }, { status: 404 });
    }

    // Calculate sales and movements for this session
    const startOfDay = new Date(session.openedAt);

    const sales = await prisma.sale.findMany({
      where: {
        clinicId: session.clinicId,
        createdAt: { gte: startOfDay },
      },
    });

    let cashSalesTotal = 0;
    let cardSalesTotal = 0;
    let transferSalesTotal = 0;

    sales.forEach((s: any) => {
      if (s.paymentMethod === "CASH") cashSalesTotal += s.total;
      else if (s.paymentMethod === "CARD") cardSalesTotal += s.total;
      else if (s.paymentMethod === "TRANSFER") transferSalesTotal += s.total;
      else cashSalesTotal += s.total;
    });

    const movements = await prisma.movement.findMany({
      where: {
        clinicId: session.clinicId,
        date: { gte: startOfDay },
      },
    });

    let cashIncomeMovements = 0;
    let cashExpenseMovements = 0;

    movements.forEach((m: any) => {
      if (m.method === "CASH") {
        if (m.type === "INCOME") cashIncomeMovements += m.amount;
        if (m.type === "EXPENSE") cashExpenseMovements += m.amount;
      }
    });

    const initialCash = session.initialCash || 0;
    const expectedCash = initialCash + cashSalesTotal + cashIncomeMovements - cashExpenseMovements;
    const countActual = parseFloat(actualCash || 0);
    const discrepancy = countActual - expectedCash;

    const closedSession = await prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedByUserId: closedByUserId || null,
        expectedCash,
        actualCash: countActual,
        cardTotal: cardSalesTotal,
        transferTotal: transferSalesTotal,
        discrepancy,
        notes: notes || null,
        denominations: typeof denominations === "string" ? denominations : JSON.stringify(denominations || {}),
      },
    });

    return NextResponse.json(closedSession);
  } catch (error) {
    console.error("Error closing cash register session:", error);
    return NextResponse.json({ error: "Error al cerrar la caja" }, { status: 500 });
  }
}
