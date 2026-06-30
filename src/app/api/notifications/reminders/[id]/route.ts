import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/notifications/reminders/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, channel, condition, hoursBefore, minutesBefore, message, allServices, serviceIds, enabled, isSystem, triggerWhen, templateId } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (channel !== undefined) data.channel = channel;
    if (condition !== undefined) data.condition = condition;
    if (hoursBefore !== undefined) data.hoursBefore = parseInt(hoursBefore) || 0;
    if (minutesBefore !== undefined) data.minutesBefore = parseInt(minutesBefore) || 0;
    if (message !== undefined) data.message = message;
    if (allServices !== undefined) data.allServices = allServices;
    if (serviceIds !== undefined) data.serviceIds = serviceIds;
    if (enabled !== undefined) data.enabled = enabled;
    if (isSystem !== undefined) data.isSystem = isSystem;
    if (triggerWhen !== undefined) data.triggerWhen = triggerWhen;
    if (templateId !== undefined) data.templateId = templateId;


    const updated = await prisma.appointmentReminder.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// DELETE /api/notifications/reminders/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.appointmentReminder.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
