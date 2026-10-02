import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    // 1. Get current active (OPEN) session for clinic
    const activeSession = await prisma.cashRegisterSession.findFirst({
      where: {
        clinicId,
        status: "OPEN",
      },
      orderBy: { openedAt: "desc" },
    });

    // 2. Fetch last closed session if no active session
    let lastClosedSession: any = null;
    if (!activeSession) {
      lastClosedSession = await prisma.cashRegisterSession.findFirst({
        where: { clinicId, status: "CLOSED" },
        orderBy: { closedAt: "desc" },
      });
    }

    // Determine start date for metrics (only if session is OPEN)
    const sessionStart = activeSession ? new Date(activeSession.openedAt) : null;

    let mappedSales: any[] = [];
    let cashSalesTotal = 0;
    let cardSalesTotal = 0;
    let transferSalesTotal = 0;
    let cashIncomeMovements = 0;
    let cashExpenseMovements = 0;

    if (sessionStart) {
      // 3. Fetch sales since active session opened
      const sales = await prisma.sale.findMany({
        where: {
          clinicId,
          createdAt: { gte: sessionStart },
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

      mappedSales = sales.map((s: any) => {
        if (s.paymentMethod === "CASH") cashSalesTotal += s.total;
        else if (s.paymentMethod === "CARD") cardSalesTotal += s.total;
        else if (s.paymentMethod === "TRANSFER" || s.paymentMethod === "BIZUM") transferSalesTotal += s.total;
        else cardSalesTotal += s.total;

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

      // 4. Fetch cash movements (INCOME & EXPENSE) since active session opened
      const movements = await prisma.movement.findMany({
        where: {
          clinicId,
          date: { gte: sessionStart },
        },
        orderBy: { date: "desc" },
      });

      movements.forEach((m: any) => {
        if (m.method === "CASH") {
          if (m.type === "INCOME") cashIncomeMovements += m.amount;
          if (m.type === "EXPENSE") cashExpenseMovements += m.amount;
        }
      });

      var combinedMovements = [...mappedSales, ...movements].sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } else {
      var combinedMovements: any[] = [];
    }

    const initialCash = activeSession?.initialCash || 0;
    const totalCashIn = cashSalesTotal + cashIncomeMovements;
    const totalCashOut = cashExpenseMovements;
    const expectedCashInHand = activeSession ? initialCash + totalCashIn - totalCashOut : 0;

    // 5. Fetch pending client debts count and sum
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
      lastClosedSession,
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
    const { clinicId, initialCash, notes } = body;

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    // Check if an open session already exists and close it preserving metrics
    const existingOpenSession = await prisma.cashRegisterSession.findFirst({
      where: { clinicId, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });

    if (existingOpenSession) {
      const sales = await prisma.sale.findMany({
        where: { clinicId, createdAt: { gte: existingOpenSession.openedAt } },
      });
      let cashSales = 0;
      let cardSales = 0;
      let transferSales = 0;
      sales.forEach((s: any) => {
        if (s.paymentMethod === "CASH") cashSales += s.total;
        else if (s.paymentMethod === "CARD") cardSales += s.total;
        else if (s.paymentMethod === "TRANSFER" || s.paymentMethod === "BIZUM") transferSales += s.total;
        else cardSales += s.total;
      });

      const movements = await prisma.movement.findMany({
        where: { clinicId, date: { gte: existingOpenSession.openedAt } },
      });
      let cashIn = cashSales;
      let cashOut = 0;
      movements.forEach((m: any) => {
        if (m.method === "CASH") {
          if (m.type === "INCOME") cashIn += m.amount;
          if (m.type === "EXPENSE") cashOut += m.amount;
        }
      });

      const expectedCash = (existingOpenSession.initialCash || 0) + cashIn - cashOut;

      await prisma.cashRegisterSession.update({
        where: { id: existingOpenSession.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedByUserId: auth.user.id,
          expectedCash,
          actualCash: expectedCash,
          cardTotal: cardSales,
          transferTotal: transferSales,
          discrepancy: 0,
          notes: (existingOpenSession.notes ? existingOpenSession.notes + " | " : "") + "[Cierre automático por nueva apertura]",
        },
      });
    }

    const newSession = await prisma.cashRegisterSession.create({
      data: {
        clinicId,
        initialCash: parseFloat(initialCash || 0),
        notes: notes || null,
        openedByUserId: auth.user.id,
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
