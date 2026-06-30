import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, preferredDayOfWeek, preferredTimeRange, userId, serviceId } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (preferredDayOfWeek !== undefined) {
      data.preferredDayOfWeek = preferredDayOfWeek !== null ? Number(preferredDayOfWeek) : null;
    }
    if (preferredTimeRange !== undefined) data.preferredTimeRange = preferredTimeRange;
    if (userId !== undefined) data.userId = userId || null;
    if (serviceId !== undefined) data.serviceId = serviceId || null;

    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data,
      include: {
        client: true,
        user: true,
        service: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating waitlist entry:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.waitlistEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting waitlist entry:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
