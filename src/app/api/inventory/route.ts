import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/inventory?clinicId=...&search=...&category=...&stockFilter=...&expiryFilter=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const stockFilter = searchParams.get("stockFilter");
    const expiryFilter = searchParams.get("expiryFilter");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId,
    };

    if (search && search.trim()) {
      const term = search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { batchNumber: { contains: term, mode: "insensitive" } },
        { supplier: { contains: term, mode: "insensitive" } },
        { location: { contains: term, mode: "insensitive" } },
      ];
    }

    if (category && category !== "all") {
      whereClause.category = category;
    }

    const now = new Date();

    if (expiryFilter === "expired") {
      whereClause.expirationDate = {
        lt: now,
      };
    } else if (expiryFilter === "soon_30") {
      const thirtyDays = new Date();
      thirtyDays.setDate(now.getDate() + 30);
      whereClause.expirationDate = {
        gte: now,
        lte: thirtyDays,
      };
    } else if (expiryFilter === "soon_90") {
      const ninetyDays = new Date();
      ninetyDays.setDate(now.getDate() + 90);
      whereClause.expirationDate = {
        gte: now,
        lte: ninetyDays,
      };
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

    // In-memory stock filter if requested (handling Prisma column comparison limitations)
    let filtered = products;
    if (stockFilter === "low") {
      filtered = products.filter((p: (typeof products)[number]) => p.stock <= p.minStock);
    } else if (stockFilter === "out") {
      filtered = products.filter((p: (typeof products)[number]) => p.stock === 0);
    } else if (stockFilter === "optimal") {
      filtered = products.filter((p: (typeof products)[number]) => p.stock > p.minStock);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching inventory products:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/inventory
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      category,
      batchNumber,
      expirationDate,
      supplier,
      location,
      stock,
      minStock,
      costPrice,
      salePrice,
      clinicId,
      userId,
    } = body;

    if (!name || !clinicId) {
      return NextResponse.json({ error: "Faltan datos obligatorios (nombre y clinicId)" }, { status: 400 });
    }

    if (sku && sku.trim()) {
      const existing = await prisma.inventoryProduct.findFirst({
        where: {
          clinicId,
          sku: sku.trim(),
        },
      });
      if (existing) {
        return NextResponse.json({ error: "El código SKU ya está registrado para otro producto en esta consulta." }, { status: 400 });
      }
    }

    const initialStock = stock ? parseInt(stock, 10) : 0;
    const minimumStock = minStock ? parseInt(minStock, 10) : 0;
    const cost = costPrice !== undefined && costPrice !== null && costPrice !== "" ? parseFloat(costPrice) : 0;
    const sale = salePrice !== undefined && salePrice !== null && salePrice !== "" ? parseFloat(salePrice) : 0;
    const expDate = expirationDate ? new Date(expirationDate) : null;

    const product = await prisma.inventoryProduct.create({
      data: {
        name: name.trim(),
        sku: sku && sku.trim() ? sku.trim() : null,
        category: category || "CONSUMIBLE",
        batchNumber: batchNumber && batchNumber.trim() ? batchNumber.trim() : null,
        expirationDate: expDate,
        supplier: supplier && supplier.trim() ? supplier.trim() : null,
        location: location && location.trim() ? location.trim() : null,
        stock: initialStock,
        minStock: minimumStock,
        costPrice: isNaN(cost) ? 0 : cost,
        salePrice: isNaN(sale) ? 0 : sale,
        clinicId,
      },
    });

    // Registrar transacción de carga inicial de existencias
    if (initialStock > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: product.id,
          type: "ENTRADA",
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          batchNumber: product.batchNumber,
          expirationDate: product.expirationDate,
          costPrice: product.costPrice,
          supplier: product.supplier,
          notes: "Carga inicial de existencias al registrar el insumo en almacén",
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
