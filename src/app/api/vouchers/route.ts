import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const vouchers = await prisma.voucher.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sessions, price, tax, expirationMonths, serviceIds, clinicId } = body;

    if (!name || !sessions || price === undefined || !clinicId || !serviceIds) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (name, sessions, price, clinicId, serviceIds)" },
        { status: 400 }
      );
    }

    const voucher = await prisma.voucher.create({
      data: {
        name,
        sessions: parseInt(sessions, 10),
        price: parseFloat(price),
        tax: tax ? parseFloat(tax) : 0,
        expirationMonths: expirationMonths ? parseInt(expirationMonths, 10) : null,
        serviceIds: serviceIds || "",
        clinicId,
      },
    });

    return NextResponse.json(voucher);
  } catch (error) {
    console.error("Error creating voucher:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
