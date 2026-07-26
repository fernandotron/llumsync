import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientProductId } = await params;
    const body = await request.json();
    const { date, productId, productName, price, vat, total, professionalId, professionalName } = body;

    const updated = await prisma.clientProduct.update({
      where: { id: clientProductId },
      data: {
        date: date ? new Date(date) : undefined,
        productId: productId || null,
        productName: productName || undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        vat: vat !== undefined ? parseFloat(vat) : undefined,
        total: total !== undefined ? parseFloat(total) : undefined,
        professionalId: professionalId || null,
        professionalName: professionalName || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating client product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientProductId } = await params;
    await prisma.clientProduct.delete({
      where: { id: clientProductId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
