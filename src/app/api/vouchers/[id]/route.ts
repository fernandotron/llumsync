import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, sessions, price, tax, expirationMonths, serviceIds } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de bono" }, { status: 400 });
    }

    if (serviceIds !== undefined && !serviceIds) {
      return NextResponse.json({ error: "Debe asociar al menos un servicio" }, { status: 400 });
    }

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        name,
        sessions: sessions ? parseInt(sessions, 10) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        tax: tax !== undefined ? parseFloat(tax) : undefined,
        expirationMonths: expirationMonths !== undefined ? (expirationMonths ? parseInt(expirationMonths, 10) : null) : undefined,
        serviceIds: serviceIds !== undefined ? serviceIds : undefined,
      },
    });

    return NextResponse.json(updatedVoucher);
  } catch (error) {
    console.error("Error updating voucher:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de bono" }, { status: 400 });
    }

    await prisma.voucher.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
