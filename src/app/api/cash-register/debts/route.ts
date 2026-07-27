import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const status = searchParams.get("status") || "PENDING";

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const debts = await prisma.clientDebt.findMany({
      where: {
        clinicId,
        ...(status !== "ALL" ? { status } : {}),
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

    return NextResponse.json(debts);
  } catch (error) {
    console.error("Error fetching client debts:", error);
    return NextResponse.json({ error: "Error al obtener la lista de deudas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, clientId, amount, concept, notes } = body;

    if (!clinicId || !clientId || !concept || amount === undefined) {
      return NextResponse.json({ error: "Faltan datos obligatorios (clinicId, clientId, concept, amount)" }, { status: 400 });
    }

    const newDebt = await prisma.clientDebt.create({
      data: {
        clinicId,
        clientId,
        amount: parseFloat(amount),
        concept,
        notes: notes || null,
        status: "PENDING",
        date: new Date(),
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
    });

    return NextResponse.json(newDebt);
  } catch (error) {
    console.error("Error creating debt:", error);
    return NextResponse.json({ error: "Error al registrar la deuda" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { debtId, paymentMethod, createMovement } = body;

    if (!debtId || !paymentMethod) {
      return NextResponse.json({ error: "Faltan datos obligatorios (debtId, paymentMethod)" }, { status: 400 });
    }

    const updatedDebt = await prisma.clientDebt.update({
      where: { id: debtId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentMethod,
      },
      include: {
        client: true,
      },
    });

    if (createMovement) {
      await prisma.movement.create({
        data: {
          clinicId: updatedDebt.clinicId,
          concept: `[COBRO DEUDA] ${updatedDebt.client.firstName} ${updatedDebt.client.lastName} - ${updatedDebt.concept}`,
          amount: updatedDebt.amount,
          method: paymentMethod,
          type: "INCOME",
          date: new Date(),
        },
      });
    }

    return NextResponse.json(updatedDebt);
  } catch (error) {
    console.error("Error updating debt:", error);
    return NextResponse.json({ error: "Error al saldar la deuda" }, { status: 500 });
  }
}
