import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { name, vat, price, hasStock, stock } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (name, price)" },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name.trim(),
        vat: vat !== undefined ? parseFloat(vat) : 21,
        price: parseFloat(price),
        hasStock: Boolean(hasStock),
        stock: hasStock ? parseInt(stock || "0", 10) : 0,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
