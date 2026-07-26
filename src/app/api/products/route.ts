import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, vat, price, hasStock, stock, clinicId } = body;

    if (!name || price === undefined || !clinicId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (name, price, clinicId)" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        vat: vat !== undefined ? parseFloat(vat) : 21,
        price: parseFloat(price),
        hasStock: Boolean(hasStock),
        stock: hasStock ? parseInt(stock || "0", 10) : 0,
        clinicId,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
