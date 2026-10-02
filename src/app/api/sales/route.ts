import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    const whereClause: any = { clinicId };

    if (clientId) {
      whereClause.clientId = clientId;
    }

    if (paymentMethod && paymentMethod !== "ALL") {
      whereClause.paymentMethod = paymentMethod.toUpperCase();
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search } },
        { client: { firstName: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { dniNif: { contains: search } } },
      ];
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
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
    let {
      clientId,
      clinicId,
      total,
      discount,
      paymentMethod,
      items,
      invoiceType,
      rectifiesInvoiceNumber,
      rectifiesInvoiceId,
      rectificationReason,
      rectifiesType,
    } = body;

    if (!clinicId || total === undefined || total === null || !paymentMethod || !items || items.length === 0) {
      return NextResponse.json({ error: "Faltan datos de facturación obligatorios" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) return auth.errorResponse;

    // Handle anonymous / walk-in customer (Cliente Mostrador / Venta Directa)
    if (!clientId || clientId === "generic" || clientId === "general" || clientId === "contado") {
      let genericClient = await prisma.client.findFirst({
        where: {
          clinicId,
          dniNif: "CONTADO",
        },
      });

      if (!genericClient) {
        genericClient = await prisma.client.create({
          data: {
            clinicId,
            firstName: "Cliente",
            lastName: "de Contado (Venta Directa)",
            dniNif: "CONTADO",
            email: "",
            phone: "",
            address: "Venta en Mostrador",
            municipality: "",
            postalCode: "",
          },
        });
      }
      clientId = genericClient.id;
    }

    // Fetch clinic's FiscalProfile if configured
    const fiscalProfile = await prisma.fiscalProfile.findFirst({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    const year = new Date().getFullYear();
    let prefix = "";

    const cleanSerie = (s: string) => {
      if (!s) return "";
      let res = s.trim();
      if (!res.includes(String(year))) {
        res = `${res}-${year}`;
      }
      return res.endsWith("-") ? res : `${res}-`;
    };

    const isRectificativa =
      invoiceType === "RECTIFICATIVA" ||
      invoiceType === "RECTIFIED" ||
      invoiceType === "ABONO" ||
      !!rectifiesInvoiceNumber;

    if (isRectificativa) {
      const isRectifyingSimplificada =
        rectifiesType === "SIMPLIFIED" ||
        (rectifiesInvoiceNumber &&
          (rectifiesInvoiceNumber.startsWith("SIMP-") ||
            rectifiesInvoiceNumber.startsWith("RS-") ||
            rectifiesInvoiceNumber.startsWith("TKT-")));

      if (isRectifyingSimplificada && fiscalProfile?.serieRectificadaSimplificada) {
        prefix = cleanSerie(fiscalProfile.serieRectificadaSimplificada);
      } else if (fiscalProfile?.serieRectificadaOrdinaria) {
        prefix = cleanSerie(fiscalProfile.serieRectificadaOrdinaria);
      } else {
        prefix = isRectifyingSimplificada ? `RS-${year}-` : `R-${year}-`;
      }
    } else if (invoiceType === "NORMAL" || invoiceType === "ORDINARIA") {
      if (fiscalProfile?.serieFacturaOrdinaria) {
        prefix = cleanSerie(fiscalProfile.serieFacturaOrdinaria);
      } else {
        prefix = `INV-${year}-`;
      }
    } else if (invoiceType === "SIMPLIFIED" || invoiceType === "SIMPLIFICADA") {
      if (fiscalProfile?.serieFacturaSimplificada) {
        prefix = cleanSerie(fiscalProfile.serieFacturaSimplificada);
      } else {
        prefix = `SIMP-${year}-`;
      }
    } else {
      prefix = `TKT-${year}-`;
    }

    // Continuous sequential numbering per series prefix
    const matchingSales = await prisma.sale.findMany({
      where: {
        clinicId,
        invoiceNumber: { startsWith: prefix },
      },
      select: { invoiceNumber: true },
    });

    let maxSeq = 0;
    for (const s of matchingSales) {
      const rest = s.invoiceNumber.slice(prefix.length);
      const parsed = parseInt(rest, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      } else {
        const parts = s.invoiceNumber.split("-");
        const last = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(last) && last > maxSeq) maxSeq = last;
      }
    }

    let numberSequence = maxSeq + 1;
    let invoiceNumber = `${prefix}${String(numberSequence).padStart(4, "0")}`;
    let exists = true;

    while (exists) {
      const existing = await prisma.sale.findUnique({
        where: { invoiceNumber },
      });

      if (!existing) {
        exists = false;
      } else {
        numberSequence++;
        invoiceNumber = `${prefix}${String(numberSequence).padStart(4, "0")}`;
      }
    }

    // RD 1007/2023 (Veri*Factu) Hash Chaining
    const prevSale = await prisma.sale.findFirst({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true, total: true, createdAt: true },
    });
    const prevHashSeed = prevSale
      ? `${prevSale.invoiceNumber}|${prevSale.total.toFixed(2)}|${prevSale.createdAt.toISOString()}`
      : "VERIFACTU_GENESIS_ROOT_CLIFAV";
    const veriFactuPrevHash = crypto.createHash("sha256").update(prevHashSeed).digest("hex").slice(0, 16);
    const invoiceHashSeed = `${fiscalProfile?.nif || "CLIFAV"}|${invoiceNumber}|${parseFloat(total).toFixed(2)}|${new Date().toISOString()}|${veriFactuPrevHash}`;
    const veriFactuHash = crypto.createHash("sha256").update(invoiceHashSeed).digest("hex").toUpperCase();

    // Enrich items with invoice metadata for immutability traceability
    const enrichedItems = Array.isArray(items)
      ? items.map((it: any) => ({
          ...it,
          invoiceType: isRectificativa ? "RECTIFICATIVA" : invoiceType || (prefix.startsWith("INV-") ? "NORMAL" : prefix.startsWith("SIMP-") ? "SIMPLIFIED" : "TICKET"),
          ...(rectifiesInvoiceNumber ? { rectifiesInvoiceNumber } : {}),
          ...(rectificationReason ? { rectificationReason } : {}),
          ...(rectifiesInvoiceId ? { rectifiesInvoiceId } : {}),
          veriFactuHash: veriFactuHash.slice(0, 16),
        }))
      : [];

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,
        clientId,
        clinicId,
        total: parseFloat(total),
        discount: parseFloat(discount || 0),
        paymentMethod: paymentMethod.toUpperCase(),
        itemsJson: JSON.stringify(enrichedItems),
      },
      include: {
        client: true,
      },
    });

    // Automatic inventory management: Stock deduction or Restocking for Rectificativas
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const rawQty = parseInt(item.quantity || item.qty || 1, 10);
        const itemQty = isNaN(rawQty) ? 1 : rawQty;
        const serviceId = item.serviceId || (item.type === "SERVICE" || item.type === "service" || item.type === "servicio" ? item.id : null);
        const productId = item.inventoryProductId || item.productId || (item.type === "PRODUCT" || item.type === "product" || item.type === "producto" ? item.id : null);

        // Detect if this item is from an appointment where consumables were already deducted
        const isFromAppointment = !!(
          (item.id && typeof item.id === "string" && (item.id.startsWith("db-app-") || item.id.startsWith("app-"))) ||
          item.appointmentId ||
          item.fromAppointment ||
          item.skipConsumableDeduction
        );

        if (isRectificativa || itemQty < 0 || item.restock) {
          // RESTOCK: Rectificativa / Abono returns product to inventory
          const absQty = Math.abs(itemQty);
          if (productId) {
            try {
              const currentInv = await prisma.inventoryProduct.findUnique({
                where: { id: productId },
              });
              if (currentInv) {
                const prevStock = currentInv.stock;
                const nextStock = prevStock + absQty;

                await prisma.inventoryProduct.update({
                  where: { id: productId },
                  data: { stock: nextStock },
                });

                await prisma.inventoryTransaction.create({
                  data: {
                    productId,
                    type: "DEVOLUCION",
                    quantity: absQty,
                    previousStock: prevStock,
                    newStock: nextStock,
                    batchNumber: currentInv.batchNumber,
                    expirationDate: currentInv.expirationDate,
                    costPrice: currentInv.costPrice,
                    notes: `Devolución / Restock automático por factura rectificativa ${invoiceNumber}`,
                    clinicId,
                  },
                });
              }
            } catch (e) {
              console.error("Error restocking inventory product:", e);
            }
          }
        } else {
          // NORMAL SALE: Deduct product or service consumables
          // 1. Service consumables (if not already deducted during appointment)
          if (serviceId && !isFromAppointment) {
            try {
              const consumables = await prisma.serviceProduct.findMany({
                where: { serviceId },
                include: { product: true },
              });
              for (const consumable of consumables) {
                const qtyToDeduct = consumable.quantity * Math.max(1, itemQty);
                if (qtyToDeduct > 0 && consumable.product) {
                  const prevStock = consumable.product.stock;
                  const nextStock = Math.max(0, prevStock - qtyToDeduct);

                  await prisma.inventoryProduct.update({
                    where: { id: consumable.productId },
                    data: { stock: nextStock },
                  });

                  await prisma.inventoryTransaction.create({
                    data: {
                      productId: consumable.productId,
                      type: "CONSUMO_CITA",
                      quantity: qtyToDeduct,
                      previousStock: prevStock,
                      newStock: nextStock,
                      batchNumber: consumable.product.batchNumber,
                      expirationDate: consumable.product.expirationDate,
                      costPrice: consumable.product.costPrice,
                      notes: `Consumo automático por servicio en factura ${invoiceNumber}`,
                      clinicId,
                    },
                  });
                }
              }
            } catch (e) {
              console.error("Error deducting service consumables:", e);
            }
          }

          // 2. Direct product sale
          if (productId) {
            try {
              const invProd = await prisma.inventoryProduct.findUnique({
                where: { id: productId },
              });
              if (invProd) {
                const sellQty = Math.max(1, itemQty);
                const prevStock = invProd.stock;
                const nextStock = Math.max(0, prevStock - sellQty);

                await prisma.inventoryProduct.update({
                  where: { id: productId },
                  data: { stock: nextStock },
                });

                await prisma.inventoryTransaction.create({
                  data: {
                    productId,
                    type: "VENTA_MOSTRADOR",
                    quantity: sellQty,
                    previousStock: prevStock,
                    newStock: nextStock,
                    batchNumber: invProd.batchNumber,
                    expirationDate: invProd.expirationDate,
                    costPrice: invProd.costPrice,
                    notes: `Venta directa en mostrador / TPV - Factura ${invoiceNumber}`,
                    clinicId,
                  },
                });
              }
            } catch (e) {
              console.error("Error deducting direct product inventory:", e);
            }
          }
        }
      }
    }

    return NextResponse.json({
      ...sale,
      veriFactuHash,
      veriFactuPrevHash,
      veriFactuQr: `https://verifactu.agenciatributaria.gob.es/qr?nif=${encodeURIComponent(fiscalProfile?.nif || "")}&num=${encodeURIComponent(invoiceNumber)}&date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}&total=${encodeURIComponent(parseFloat(total).toFixed(2))}&hash=${encodeURIComponent(veriFactuHash.slice(0, 16))}`,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// Invoicing immutability under Ley 11/2021 (Medidas de Prevención y Lucha contra el Fraude Fiscal) & RD 1007/2023 (Veri*Factu)
export async function DELETE() {
  return NextResponse.json(
    {
      error: "INVOICE_IMMUTABLE",
      message: "Operación no autorizada: De conformidad con la Ley 11/2021 y el Reglamento Veri*Factu (RD 1007/2023), las facturas emitidas son inalterables y no pueden eliminarse del registro. Para anular una factura, debe expedirse una factura rectificativa.",
    },
    { status: 403 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: "INVOICE_IMMUTABLE",
      message: "Operación no autorizada: De conformidad con la Ley 11/2021 y el Reglamento Veri*Factu (RD 1007/2023), los registros de facturación emitidos son inmutables. No se permite alterar importes, conceptos ni clientes de una factura ya registrada.",
    },
    { status: 403 }
  );
}
