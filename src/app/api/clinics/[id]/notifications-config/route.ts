import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUT /api/clinics/[id]/notifications-config
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notifyAssignedUser, adminNotificationUserIds, senderEmail, defaultWhatsappMode } = body;

    const data: any = {};
    if (notifyAssignedUser !== undefined) data.notifyAssignedUser = notifyAssignedUser;
    if (adminNotificationUserIds !== undefined) data.adminNotificationUserIds = adminNotificationUserIds;
    if (senderEmail !== undefined) data.senderEmail = senderEmail;
    if (defaultWhatsappMode !== undefined) data.defaultWhatsappMode = defaultWhatsappMode;

    const updatedClinic = await prisma.clinic.update({
      where: { id },
      data,
    });

    return NextResponse.json(updatedClinic);
  } catch (error) {
    console.error("Error updating clinic notifications config:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
