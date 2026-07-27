import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, concept, amount, notes, category } = body;

    if (!clinicId || !concept || amount === undefined) {
      return NextResponse.json({ error: "Faltan datos obligatorios (clinicId, concept, amount)" }, { status: 400 });
    }

    const fullConcept = category ? `[SALIDA ${category.toUpperCase()}] ${concept}` : `[SALIDA CAJA] ${concept}`;

    const movement = await prisma.movement.create({
      data: {
        clinicId,
        concept: notes ? `${fullConcept} - ${notes}` : fullConcept,
        amount: parseFloat(amount),
        method: "CASH",
        type: "EXPENSE",
        date: new Date(),
      },
    });

    return NextResponse.json(movement);
  } catch (error) {
    console.error("Error creating cash outflow:", error);
    return NextResponse.json({ error: "Error al registrar la salida de caja" }, { status: 500 });
  }
}
