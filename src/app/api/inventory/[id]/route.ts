import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/inventory/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, sku, minStock, costPrice, stockAdjustment, adjustmentReason, userId } = body;

    // Buscar producto actual
    const currentProduct = await prisma.inventoryProduct.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    if (sku !== undefined && sku !== null && sku.trim()) {
      const existing = await prisma.inventoryProduct.findFirst({
        where: {
          clinicId: currentProduct.clinicId,
          sku: sku.trim(),
          id: { not: id }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El código SKU ya está registrado para otro producto en esta consulta." }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku;
    if (minStock !== undefined) updateData.minStock = parseInt(minStock);
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice);

    // Procesar ajuste rápido de stock manual si se suministra
    if (stockAdjustment !== undefined && stockAdjustment !== 0) {
      const adjustment = parseInt(stockAdjustment);
      const newStock = currentProduct.stock + adjustment;

      if (newStock < 0) {
        return NextResponse.json({ error: "El stock no puede ser menor a cero" }, { status: 400 });
      }

      updateData.stock = newStock;

      // Registrar transacción de ajuste manual
      await prisma.inventoryTransaction.create({
        data: {
          productId: id,
          type: adjustment > 0 ? "ADD" : "REMOVE",
          quantity: Math.abs(adjustment),
          notes: adjustmentReason || (adjustment > 0 ? "Ajuste manual (Entrada)" : "Ajuste manual (Salida)"),
          clinicId: currentProduct.clinicId,
          userId: userId || null,
        },
      });
    }

    const product = await prisma.inventoryProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating inventory product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// DELETE /api/inventory/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.inventoryProduct.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inventory product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
