import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const sales = await prisma.sale.findMany({
      where: { clinicId },
      include: {
        client: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, clinicId, total, discount, paymentMethod, items, invoiceType } = body;

    if (!clientId || !clinicId || !total || !paymentMethod || !items || items.length === 0) {
      return NextResponse.json({ error: "Faltan datos de facturación obligatorios" }, { status: 400 });
    }

    // Generate unique invoice/ticket number based on invoiceType: "NORMAL" | "SIMPLIFIED" | "NONE" (default)
    const year = new Date().getFullYear();
    const count = await prisma.sale.count();
    
    let numberSequence = count + 1;
    let invoiceNumber = "";
    let exists = true;
    
    while (exists) {
      if (invoiceType === "NORMAL") {
        invoiceNumber = `INV-${year}-${String(numberSequence).padStart(4, "0")}`;
      } else if (invoiceType === "SIMPLIFIED") {
        invoiceNumber = `SIMP-${year}-${String(numberSequence).padStart(4, "0")}`;
      } else {
        invoiceNumber = `TKT-${year}-${String(numberSequence).padStart(4, "0")}`;
      }
      
      const existing = await prisma.sale.findUnique({
        where: { invoiceNumber }
      });
      
      if (!existing) {
        exists = false;
      } else {
        numberSequence++;
      }
    }

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,
        clientId,
        clinicId,
        total: parseFloat(total),
        discount: parseFloat(discount || 0),
        paymentMethod,
        itemsJson: JSON.stringify(items),
      },
      include: {
        client: true,
      },
    });

    // Automatic inventory stock deduction for consumables & direct products
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemQty = Math.max(1, parseInt(item.quantity || item.qty || 1));
        const serviceId = item.serviceId || (item.type === "SERVICE" || item.type === "servicio" ? item.id : null);
        const productId = item.inventoryProductId || item.productId || (item.type === "PRODUCT" || item.type === "producto" ? item.id : null);

        // 1. If item is a Service with consumables attached
        if (serviceId) {
          try {
            const consumables = await prisma.serviceProduct.findMany({
              where: { serviceId },
            });
            for (const consumable of consumables) {
              const qtyToDeduct = consumable.quantity * itemQty;
              if (qtyToDeduct > 0) {
                await prisma.inventoryProduct.update({
                  where: { id: consumable.productId },
                  data: {
                    stock: {
                      decrement: qtyToDeduct,
                    },
                  },
                }).catch(() => null);

                await prisma.inventoryTransaction.create({
                  data: {
                    productId: consumable.productId,
                    type: "CONSUMPTION",
                    quantity: qtyToDeduct,
                    notes: `Consumo automático por servicio en factura ${invoiceNumber}`,
                    clinicId,
                  },
                }).catch(() => null);
              }
            }
          } catch (e) {
            console.error("Error deducting service consumables:", e);
          }
        }

        // 2. If item is a direct Inventory Product
        if (productId) {
          try {
            const invProd = await prisma.inventoryProduct.findUnique({
              where: { id: productId },
            });
            if (invProd) {
              await prisma.inventoryProduct.update({
                where: { id: productId },
                data: {
                  stock: {
                    decrement: itemQty,
                  },
                },
              }).catch(() => null);

              await prisma.inventoryTransaction.create({
                data: {
                  productId,
                  type: "CONSUMPTION",
                  quantity: itemQty,
                  notes: `Venta directa en factura ${invoiceNumber}`,
                  clinicId,
                },
              }).catch(() => null);
            }
          } catch (e) {
            console.error("Error deducting direct product inventory:", e);
          }
        }
      }
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Falta id de venta" }, { status: 400 });
    }

    const deleted = await prisma.sale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, clientId, total, discount, paymentMethod, items, invoiceNumber, date } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta id de venta" }, { status: 400 });
    }

    const updateData: any = {};
    if (clientId) updateData.clientId = clientId;
    if (total !== undefined) updateData.total = parseFloat(total);
    if (discount !== undefined) updateData.discount = parseFloat(discount || 0);
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (items) updateData.itemsJson = JSON.stringify(items);
    if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;
    if (date) updateData.createdAt = new Date(date);

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: { client: true }
    });

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

