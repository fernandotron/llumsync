import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/notifications/reminders?clinicId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const isSystemParam = searchParams.get("isSystem");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const where: any = { clinicId };
    if (isSystemParam !== null) {
      where.isSystem = isSystemParam === "true";
    }

    const reminders = await prisma.appointmentReminder.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/notifications/reminders
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, channel, condition, hoursBefore, minutesBefore, message, 
      clinicId, allServices, serviceIds, isSystem, triggerWhen, templateId 
    } = body;

    if (!name || !channel || !condition || !clinicId || message === undefined) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const reminder = await prisma.appointmentReminder.create({
      data: {
        name,
        channel,
        condition,
        hoursBefore: parseInt(hoursBefore) || 0,
        minutesBefore: parseInt(minutesBefore) || 0,
        message,
        clinicId,
        allServices: allServices ?? true,
        serviceIds: serviceIds || "",
        enabled: true,
        isSystem: isSystem ?? false,
        triggerWhen: triggerWhen || "BOTH",
        templateId: templateId || "",
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
