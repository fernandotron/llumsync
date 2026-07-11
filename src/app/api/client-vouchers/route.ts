import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const clientVouchers = await prisma.clientVoucher.findMany({
      where: {
        client: {
          clinicId: clinicId,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(clientVouchers);
  } catch (error) {
    console.error("Error fetching client vouchers:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
