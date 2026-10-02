import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/inventory/transactions?clinicId=...&productId=...&type=...&search=...&limit=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const limitParam = searchParams.get("limit");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const where: any = {
      clinicId,
    };

    if (productId && productId !== "all") {
      where.productId = productId;
    }

    if (type && type !== "all") {
      // Si piden ENTRADA, podemos incluir legacy ADD
      if (type === "ENTRADA") {
        where.type = { in: ["ENTRADA", "ADD", "ENTRY"] };
      } else if (type === "CONSUMO_CITA") {
        where.type = { in: ["CONSUMO_CITA", "CONSUMPTION"] };
      } else if (type === "VENTA_MOSTRADOR") {
        where.type = { in: ["VENTA_MOSTRADOR"] };
      } else if (type === "AJUSTE") {
        where.type = { in: ["AJUSTE", "REMOVE"] };
      } else if (type === "ROTURA_MERMA") {
        where.type = { in: ["ROTURA_MERMA"] };
      } else if (type === "DEVOLUCION") {
        where.type = { in: ["DEVOLUCION", "RETURN"] };
      } else {
        where.type = type;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { notes: { contains: term, mode: "insensitive" } },
        { invoiceRef: { contains: term, mode: "insensitive" } },
        { batchNumber: { contains: term, mode: "insensitive" } },
        { supplier: { contains: term, mode: "insensitive" } },
        { product: { name: { contains: term, mode: "insensitive" } } },
        { user: { name: { contains: term, mode: "insensitive" } } },
        { user: { lastName: { contains: term, mode: "insensitive" } } },
      ];
    }

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 200, 1000) : 250;

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            costPrice: true,
            salePrice: true,
            stock: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
