import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/inventory/transactions?clinicId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        clinicId,
      },
      include: {
        product: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
