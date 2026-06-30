import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/notifications/logs?clinicId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const logs = await prisma.notificationLog.findMany({
      where: { clinicId },
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/notifications/logs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinicId, clientId, clientName, appointmentId, channel, recipient, message, status } = body;

    if (!clinicId || !clientId || !clientName || !channel || !recipient || !message) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const log = await prisma.notificationLog.create({
      data: {
        clinicId,
        clientId,
        clientName,
        appointmentId: appointmentId || null,
        channel,
        recipient,
        message,
        status: status || "SENT",
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error creating notification log:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
