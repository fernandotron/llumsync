import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const deletedClients = await prisma.client.findMany({
      where: {
        clinicId,
        deletedAt: { not: null }, // Only trashed clients
      },
      orderBy: { deletedAt: "desc" },
    });

    return NextResponse.json(deletedClients);
  } catch (error) {
    console.error("Error fetching trashed clients:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
