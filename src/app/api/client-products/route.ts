import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const clinicId = searchParams.get("clinicId");

    if (!clientId && !clinicId) {
      return NextResponse.json({ error: "Falta clientId o clinicId" }, { status: 400 });
    }

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (clinicId) where.clinicId = clinicId;

    const clientProducts = await prisma.clientProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clientProducts);
  } catch (error) {
    console.error("Error fetching client products:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      productId,
      productName,
      date,
      price,
      vat,
      total,
      professionalId,
      professionalName,
      clinicId,
    } = body;

    if (!clientId || !productName || price === undefined || !clinicId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (clientId, productName, price, clinicId)" },
        { status: 400 }
      );
    }

    // Create client product record
    const clientProduct = await prisma.clientProduct.create({
      data: {
        clientId,
        productId: productId || null,
        productName: productName.trim(),
        date: date ? new Date(date) : new Date(),
        price: parseFloat(price),
        vat: vat !== undefined ? parseFloat(vat) : 21,
        total: total !== undefined ? parseFloat(total) : parseFloat(price) * 1.21,
        professionalId: professionalId || null,
        professionalName: professionalName || null,
        clinicId,
      },
    });

    // If linked to an inventory/product with stock enabled, deduct stock
    if (productId) {
      try {
        const prod = await prisma.product.findUnique({ where: { id: productId } });
        if (prod && prod.hasStock && prod.stock > 0) {
          await prisma.product.update({
            where: { id: productId },
            data: { stock: Math.max(0, prod.stock - 1) },
          });
        }
      } catch (err) {
        console.error("Error updating stock:", err);
      }
    }

    return NextResponse.json(clientProduct);
  } catch (error) {
    console.error("Error creating client product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
