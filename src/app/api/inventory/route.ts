import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/inventory?clinicId=...&search=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const search = searchParams.get("search");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const products = await prisma.inventoryProduct.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching inventory products:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/inventory
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sku, stock, minStock, costPrice, clinicId, userId } = body;

    if (!name || !clinicId) {
      return NextResponse.json({ error: "Faltan datos obligatorios (nombre y clinicId)" }, { status: 400 });
    }

    if (sku && sku.trim()) {
      const existing = await prisma.inventoryProduct.findFirst({
        where: {
          clinicId,
          sku: sku.trim()
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El código SKU ya está registrado para otro producto en esta consulta." }, { status: 400 });
      }
    }

    const initialStock = stock ? parseInt(stock) : 0;
    const minimumStock = minStock ? parseInt(minStock) : 0;
    const cost = costPrice ? parseFloat(costPrice) : 0;

    const product = await prisma.inventoryProduct.create({
      data: {
        name,
        sku: sku || null,
        stock: initialStock,
        minStock: minimumStock,
        costPrice: cost,
        clinicId,
      },
    });

    // Registrar transacción de carga inicial de stock
    if (initialStock > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          type: "ADD",
          quantity: initialStock,
          notes: "Carga inicial de stock al crear producto",
          clinicId,
          userId: userId || null,
        },
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating inventory product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
