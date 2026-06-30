import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/budgets/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, status, total, itemsJson } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de presupuesto" }, { status: 400 });
    }

    const current = await prisma.budget.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (status) {
      updateData.status = status;
      // If status changes to ACCEPTED, initialize or top up remainingAmount
      if (status === "ACCEPTED" && current.status !== "ACCEPTED") {
        updateData.remainingAmount = total !== undefined ? parseFloat(total) : current.total;
      }
    }
    if (total !== undefined) {
      updateData.total = parseFloat(total);
      // If budget is already accepted and total changes, let's adjust remainingAmount too
      if (current.status === "ACCEPTED" && status !== "REJECTED") {
        updateData.remainingAmount = parseFloat(total);
      }
    }
    if (itemsJson) updateData.itemsJson = itemsJson;

    const updated = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: { client: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// DELETE /api/budgets/[id] (SOFT DELETE)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de presupuesto" }, { status: 400 });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
