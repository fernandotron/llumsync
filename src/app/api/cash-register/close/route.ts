import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, actualCash, denominations, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
    }

    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesión de caja no encontrada" }, { status: 404 });
    }

    const auth = await authenticateApiRequest(session.clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    if (session.status === "CLOSED") {
      return NextResponse.json(
        { error: "Esta sesión de caja ya fue cerrada con anterioridad." },
        { status: 400 }
      );
    }

    // Calculate sales and movements for this session
    const sessionStart = new Date(session.openedAt);

    const sales = await prisma.sale.findMany({
      where: {
        clinicId: session.clinicId,
        createdAt: { gte: sessionStart },
      },
    });

    let cashSalesTotal = 0;
    let cardSalesTotal = 0;
    let transferSalesTotal = 0;

    sales.forEach((s: any) => {
      if (s.paymentMethod === "CASH") cashSalesTotal += s.total;
      else if (s.paymentMethod === "CARD") cardSalesTotal += s.total;
      else if (s.paymentMethod === "TRANSFER" || s.paymentMethod === "BIZUM") transferSalesTotal += s.total;
      else cardSalesTotal += s.total;
    });

    const movements = await prisma.movement.findMany({
      where: {
        clinicId: session.clinicId,
        date: { gte: sessionStart },
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
        closedByUserId: auth.user.id,
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
