import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/authGuard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId,
    };

    if (startStr && endStr) {
      const startDate = new Date(startStr);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endStr);
      endDate.setHours(23, 59, 59, 999);

      whereClause.issueDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status && status !== "TODOS") {
      whereClause.status = status;
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      whereClause.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { supplierName: { contains: q, mode: "insensitive" } },
        { supplierNif: { contains: q, mode: "insensitive" } },
        { concept: { contains: q, mode: "insensitive" } },
      ];
    }

    const invoices = await prisma.receivedInvoice.findMany({
      where: whereClause,
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("Error fetching received invoices:", error);
    return NextResponse.json({ error: "Error en el servidor: " + (error?.message || error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clinicId,
      invoiceNumber,
      supplierName,
      supplierNif,
      concept,
      issueDate,
      dueDate,
      baseAmount,
      taxRate,
      taxAmount,
      retentionRate,
      retentionAmount,
      total,
      paymentMethod,
      status,
      category,
      fileUrl,
      rawOcrJson,
      notes,
      registerInCashRegister,
    } = body;

    if (!clinicId || !invoiceNumber || !supplierName || total === undefined || !issueDate) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (clínica, número de factura, proveedor, fecha e importe total)" },
        { status: 400 }
      );
    }

    const parsedBase = parseFloat(baseAmount ?? 0);
    const parsedTaxRate = parseFloat(taxRate ?? 21);
    const parsedTax = parseFloat(taxAmount ?? 0);
    const parsedRetRate = parseFloat(retentionRate ?? 0);
    const parsedRet = parseFloat(retentionAmount ?? 0);
    const parsedTotal = parseFloat(total);

    const invoice = await prisma.receivedInvoice.create({
      data: {
        clinicId,
        invoiceNumber: String(invoiceNumber).trim(),
        supplierName: String(supplierName).trim(),
        supplierNif: supplierNif ? String(supplierNif).trim().toUpperCase() : null,
        concept: concept ? String(concept).trim() : null,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        baseAmount: isNaN(parsedBase) ? 0 : parsedBase,
        taxRate: isNaN(parsedTaxRate) ? 21 : parsedTaxRate,
        taxAmount: isNaN(parsedTax) ? 0 : parsedTax,
        retentionRate: isNaN(parsedRetRate) ? 0 : parsedRetRate,
        retentionAmount: isNaN(parsedRet) ? 0 : parsedRet,
        total: isNaN(parsedTotal) ? 0 : parsedTotal,
        paymentMethod: paymentMethod || "TRANSFER",
        status: status || "PAGADO",
        category: category || "MATERIAL_CLINICO",
        fileUrl: fileUrl || null,
        rawOcrJson: rawOcrJson ? (typeof rawOcrJson === "string" ? rawOcrJson : JSON.stringify(rawOcrJson)) : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    // Si se indicó registrar en caja física y está pagado en efectivo, sincronizar con Movement
    if (registerInCashRegister && paymentMethod === "CASH" && status === "PAGADO") {
      try {
        await prisma.movement.create({
          data: {
            concept: `Gasto Factura ${invoice.invoiceNumber} (${invoice.supplierName})`,
            amount: invoice.total,
            method: "CASH",
            type: "EXPENSE",
            date: new Date(issueDate),
            clinicId,
          },
        });
      } catch (movErr) {
        console.warn("Could not sync cash expense movement:", movErr);
      }
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error("Error creating received invoice:", error);
    return NextResponse.json({ error: "Error en el servidor: " + (error?.message || error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...dataToUpdate } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta id de la factura" }, { status: 400 });
    }

    const payload: any = {};
    if (dataToUpdate.invoiceNumber !== undefined) payload.invoiceNumber = String(dataToUpdate.invoiceNumber).trim();
    if (dataToUpdate.supplierName !== undefined) payload.supplierName = String(dataToUpdate.supplierName).trim();
    if (dataToUpdate.supplierNif !== undefined) payload.supplierNif = dataToUpdate.supplierNif ? String(dataToUpdate.supplierNif).trim().toUpperCase() : null;
    if (dataToUpdate.concept !== undefined) payload.concept = dataToUpdate.concept;
    if (dataToUpdate.issueDate !== undefined) payload.issueDate = new Date(dataToUpdate.issueDate);
    if (dataToUpdate.dueDate !== undefined) payload.dueDate = dataToUpdate.dueDate ? new Date(dataToUpdate.dueDate) : null;
    if (dataToUpdate.baseAmount !== undefined) payload.baseAmount = parseFloat(dataToUpdate.baseAmount);
    if (dataToUpdate.taxRate !== undefined) payload.taxRate = parseFloat(dataToUpdate.taxRate);
    if (dataToUpdate.taxAmount !== undefined) payload.taxAmount = parseFloat(dataToUpdate.taxAmount);
    if (dataToUpdate.retentionRate !== undefined) payload.retentionRate = parseFloat(dataToUpdate.retentionRate);
    if (dataToUpdate.retentionAmount !== undefined) payload.retentionAmount = parseFloat(dataToUpdate.retentionAmount);
    if (dataToUpdate.total !== undefined) payload.total = parseFloat(dataToUpdate.total);
    if (dataToUpdate.paymentMethod !== undefined) payload.paymentMethod = dataToUpdate.paymentMethod;
    if (dataToUpdate.status !== undefined) payload.status = dataToUpdate.status;
    if (dataToUpdate.category !== undefined) payload.category = dataToUpdate.category;
    if (dataToUpdate.fileUrl !== undefined) payload.fileUrl = dataToUpdate.fileUrl;
    if (dataToUpdate.notes !== undefined) payload.notes = dataToUpdate.notes;

    const updated = await prisma.receivedInvoice.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating received invoice:", error);
    return NextResponse.json({ error: "Error en el servidor: " + (error?.message || error) }, { status: 500 });
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
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const deleted = await prisma.receivedInvoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    console.error("Error deleting received invoice:", error);
    return NextResponse.json({ error: "Error en el servidor: " + (error?.message || error) }, { status: 500 });
  }
}
