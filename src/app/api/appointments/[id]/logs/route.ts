import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const logs = await prisma.appointmentLog.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching appointment logs:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
