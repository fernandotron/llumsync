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
    const {
      name,
      sku,
      category,
      batchNumber,
      expirationDate,
      supplier,
      location,
      minStock,
      costPrice,
      salePrice,
      actionType,
      incomingQty,
      wasteQty,
      wasteReason,
      stockAdjustment,
      targetStock,
      adjustmentReason,
      invoiceRef,
      notes,
      userId,
    } = body;

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
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "El código SKU ya está registrado para otro producto en esta consulta." }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (sku !== undefined) updateData.sku = sku ? sku.trim() : null;
    if (category !== undefined) updateData.category = category;
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber ? batchNumber.trim() : null;
    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }
    if (supplier !== undefined) updateData.supplier = supplier ? supplier.trim() : null;
    if (location !== undefined) updateData.location = location ? location.trim() : null;
    if (minStock !== undefined) updateData.minStock = parseInt(minStock, 10) || 0;
    if (costPrice !== undefined) updateData.costPrice = parseFloat(costPrice) || 0;
    if (salePrice !== undefined) updateData.salePrice = parseFloat(salePrice) || 0;

    let transactionToCreate: any = null;

    // ==========================================
    // 1. RECEPCIÓN DE PEDIDO / ENTRADA DE STOCK
    // ==========================================
    if (actionType === "ENTRADA" && incomingQty !== undefined) {
      const qty = parseInt(incomingQty, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ error: "La cantidad de entrada debe ser un número entero mayor a cero." }, { status: 400 });
      }

      const prevStock = currentProduct.stock;
      const nextStock = prevStock + qty;
      updateData.stock = nextStock;

      const unitCost = costPrice !== undefined && costPrice !== null && costPrice !== ""
        ? parseFloat(costPrice)
        : currentProduct.costPrice;

      if (!isNaN(unitCost) && unitCost > 0) {
        updateData.costPrice = unitCost;
      }
      if (batchNumber && batchNumber.trim()) {
        updateData.batchNumber = batchNumber.trim();
      }
      if (expirationDate) {
        updateData.expirationDate = new Date(expirationDate);
      }
      if (supplier && supplier.trim()) {
        updateData.supplier = supplier.trim();
      }

      const noteText = notes?.trim() || `Recepción de pedido de proveedor (${qty} uds)`;
      const refText = invoiceRef?.trim() ? ` [Albarán/Factura: ${invoiceRef.trim()}]` : "";

      transactionToCreate = {
        productId: id,
        type: "ENTRADA",
        quantity: qty,
        previousStock: prevStock,
        newStock: nextStock,
        batchNumber: updateData.batchNumber || currentProduct.batchNumber,
        expirationDate: updateData.expirationDate || currentProduct.expirationDate,
        costPrice: updateData.costPrice || currentProduct.costPrice,
        invoiceRef: invoiceRef?.trim() || null,
        supplier: updateData.supplier || currentProduct.supplier,
        notes: `${noteText}${refText}`,
        clinicId: currentProduct.clinicId,
        userId: userId || null,
      };
    }

    // ==========================================
    // 2. AJUSTE DE INVENTARIO / RECUENTO FÍSICO
    // ==========================================
    else if (actionType === "AJUSTE" || (targetStock !== undefined && targetStock !== null && targetStock !== "")) {
      const prevStock = currentProduct.stock;
      let nextStock: number;
      let delta: number;

      if (targetStock !== undefined && targetStock !== null && targetStock !== "") {
        const target = parseInt(targetStock, 10);
        if (isNaN(target) || target < 0) {
          return NextResponse.json({ error: "El recuento físico debe ser un número mayor o igual a cero." }, { status: 400 });
        }
        nextStock = target;
        delta = nextStock - prevStock;
      } else {
        const adj = parseInt(stockAdjustment, 10);
        if (isNaN(adj) || adj === 0) {
          return NextResponse.json({ error: "El ajuste debe ser una cantidad distinta de cero." }, { status: 400 });
        }
        delta = adj;
        nextStock = prevStock + delta;
      }

      if (nextStock < 0) {
        return NextResponse.json({ error: `El ajuste daría como resultado un stock negativo (${nextStock}).` }, { status: 400 });
      }

      updateData.stock = nextStock;
      const reason = adjustmentReason?.trim() || notes?.trim() || "Ajuste de inventario por recuento físico periódico";

      transactionToCreate = {
        productId: id,
        type: "AJUSTE",
        quantity: Math.abs(delta),
        previousStock: prevStock,
        newStock: nextStock,
        batchNumber: currentProduct.batchNumber,
        expirationDate: currentProduct.expirationDate,
        costPrice: currentProduct.costPrice,
        notes: `${reason} (${delta > 0 ? "+" : ""}${delta} uds)`,
        clinicId: currentProduct.clinicId,
        userId: userId || null,
      };
    }

    // ==========================================
    // 3. MERMA / ROTURA / DESECHO SANITARIO
    // ==========================================
    else if (actionType === "ROTURA_MERMA" && wasteQty !== undefined) {
      const qty = parseInt(wasteQty, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ error: "La cantidad de merma debe ser mayor a cero." }, { status: 400 });
      }

      const prevStock = currentProduct.stock;
      const nextStock = prevStock - qty;

      if (nextStock < 0) {
        return NextResponse.json({ error: `No se puede dar de baja más unidades de las disponibles en existencias (disponible: ${prevStock}).` }, { status: 400 });
      }

      updateData.stock = nextStock;
      const reason = wasteReason?.trim() || "Desecho clínico por rotura/vencimiento";
      const extraNotes = notes?.trim() ? ` - ${notes.trim()}` : "";

      transactionToCreate = {
        productId: id,
        type: "ROTURA_MERMA",
        quantity: qty,
        previousStock: prevStock,
        newStock: nextStock,
        batchNumber: currentProduct.batchNumber,
        expirationDate: currentProduct.expirationDate,
        costPrice: currentProduct.costPrice,
        notes: `Merma clínica: ${reason}${extraNotes}`,
        clinicId: currentProduct.clinicId,
        userId: userId || null,
      };
    }

    // ==========================================
    // 4. DEVOLUCIÓN A PROVEEDOR
    // ==========================================
    else if (actionType === "DEVOLUCION" && body.returnQty !== undefined) {
      const qty = parseInt(body.returnQty, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ error: "La cantidad de devolución debe ser mayor a cero." }, { status: 400 });
      }

      const isSupplierReturn = body.isSupplierReturn !== false; // por defecto devolución a proveedor resta stock
      const prevStock = currentProduct.stock;
      const nextStock = isSupplierReturn ? prevStock - qty : prevStock + qty;

      if (nextStock < 0) {
        return NextResponse.json({ error: `No se puede devolver más unidades de las disponibles en stock (disponible: ${prevStock}).` }, { status: 400 });
      }

      updateData.stock = nextStock;
      const reason = notes?.trim() || (isSupplierReturn ? "Devolución de insumos a laboratorio/proveedor" : "Reingreso por devolución de cliente");

      transactionToCreate = {
        productId: id,
        type: "DEVOLUCION",
        quantity: qty,
        previousStock: prevStock,
        newStock: nextStock,
        batchNumber: currentProduct.batchNumber,
        expirationDate: currentProduct.expirationDate,
        costPrice: currentProduct.costPrice,
        notes: reason,
        clinicId: currentProduct.clinicId,
        userId: userId || null,
      };
    }

    // ==========================================
    // 5. COMPATIBILIDAD CON AJUSTE LEGADO (+/- qty)
    // ==========================================
    else if (stockAdjustment !== undefined && stockAdjustment !== 0 && stockAdjustment !== "0") {
      const adjustment = parseInt(stockAdjustment, 10);
      if (!isNaN(adjustment) && adjustment !== 0) {
        const prevStock = currentProduct.stock;
        const nextStock = prevStock + adjustment;

        if (nextStock < 0) {
          return NextResponse.json({ error: "El stock no puede ser menor a cero" }, { status: 400 });
        }

        updateData.stock = nextStock;

        transactionToCreate = {
          productId: id,
          type: "AJUSTE",
          quantity: Math.abs(adjustment),
          previousStock: prevStock,
          newStock: nextStock,
          batchNumber: currentProduct.batchNumber,
          expirationDate: currentProduct.expirationDate,
          costPrice: currentProduct.costPrice,
          notes: adjustmentReason?.trim() || (adjustment > 0 ? "Ajuste manual de existencias (+)" : "Ajuste manual de existencias (-)"),
          clinicId: currentProduct.clinicId,
          userId: userId || null,
        };
      }
    }

    // Actualizar producto en base de datos
    const product = await prisma.inventoryProduct.update({
      where: { id },
      data: updateData,
    });

    // Registrar transacción de auditoría si se produjo movimiento
    if (transactionToCreate) {
      await prisma.inventoryTransaction.create({
        data: transactionToCreate,
      });
    }

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
