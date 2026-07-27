import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    // 1. Get current active (OPEN) session for clinic
    let activeSession = await prisma.cashRegisterSession.findFirst({
      where: {
        clinicId,
        status: "OPEN",
      },
      orderBy: { openedAt: "desc" },
    });

    // Determine start date for daily metrics
    const now = new Date();
    const startOfDay = activeSession 
      ? new Date(activeSession.openedAt) 
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // 2. Fetch sales since session opened
    const sales = await prisma.sale.findMany({
      where: {
        clinicId,
        createdAt: { gte: startOfDay },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dniNif: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let cashSalesTotal = 0;
    let cardSalesTotal = 0;
    let transferSalesTotal = 0;

    const mappedSales = sales.map((s: any) => {
      if (s.paymentMethod === "CASH") cashSalesTotal += s.total;
      else if (s.paymentMethod === "CARD") cardSalesTotal += s.total;
      else if (s.paymentMethod === "TRANSFER") transferSalesTotal += s.total;
      else cashSalesTotal += s.total;

      const clientName = s.client ? `${s.client.firstName} ${s.client.lastName || ""}`.trim() : "Paciente";
      const invoiceCode = s.invoiceNumber ? s.invoiceNumber.replace(/^TKT-\d{4}-/, "") : "0001";

      return {
        id: `sale-${s.id}`,
        saleId: s.id,
        invoiceNumber: s.invoiceNumber,
        nuV: `NU.V: #${invoiceCode}`,
        concept: `[COBRO CITA NU.V: #${invoiceCode}] ${clientName}`,
        amount: s.total,
        method: s.paymentMethod || "CASH",
        type: "INCOME",
        date: s.createdAt,
        clientId: s.clientId,
      };
    });

    // 3. Fetch cash movements (INCOME & EXPENSE) since session opened
    const movements = await prisma.movement.findMany({
      where: {
        clinicId,
        date: { gte: startOfDay },
      },
      orderBy: { date: "desc" },
    });

    let cashIncomeMovements = 0;
    let cashExpenseMovements = 0;

    movements.forEach((m: any) => {
      if (m.method === "CASH") {
        if (m.type === "INCOME") cashIncomeMovements += m.amount;
        if (m.type === "EXPENSE") cashExpenseMovements += m.amount;
      }
    });

    const combinedMovements = [...mappedSales, ...movements].sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const initialCash = activeSession?.initialCash || 0;
    const totalCashIn = cashSalesTotal + cashIncomeMovements;
    const totalCashOut = cashExpenseMovements;
    const expectedCashInHand = initialCash + totalCashIn - totalCashOut;

    // 4. Fetch pending client debts count and sum
    const pendingDebts = await prisma.clientDebt.findMany({
      where: {
        clinicId,
        status: "PENDING",
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dniNif: true,
            phone: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const totalPendingDebtsAmount = pendingDebts.reduce((sum: number, d: any) => sum + d.amount, 0);

    return NextResponse.json({
      activeSession,
      metrics: {
        initialCash,
        cashSalesTotal,
        cardSalesTotal,
        transferSalesTotal,
        cashIncomeMovements,
        cashExpenseMovements,
        totalCashIn,
        totalCashOut,
        expectedCashInHand,
        pendingDebtsCount: pendingDebts.length,
        totalPendingDebtsAmount,
      },
      movements: combinedMovements,
      pendingDebts,
    });
  } catch (error: any) {
    console.error("Error fetching cash register state:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, initialCash, notes, openedByUserId } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    // Close any previous open session if exists
    await prisma.cashRegisterSession.updateMany({
      where: { clinicId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    const newSession = await prisma.cashRegisterSession.create({
      data: {
        clinicId,
        initialCash: parseFloat(initialCash || 0),
        notes: notes || null,
        openedByUserId: openedByUserId || null,
        status: "OPEN",
        openedAt: new Date(),
      },
    });

    return NextResponse.json(newSession);
  } catch (error: any) {
    console.error("Error opening cash register session:", error);
    return NextResponse.json({ error: "Error al abrir la caja", details: error?.message || String(error) }, { status: 500 });
  }
}
