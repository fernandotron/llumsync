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
    const { notifyAssignedUser, adminNotificationUserIds, senderEmail, defaultWhatsappMode, whatsappApiUrl, whatsappInstanceName, whatsappApiToken, whatsappConnected, metaAccessToken, metaPhoneNumberId, metaBusinessAccountId, metaTemplateName } = body;

    const data: any = {};
    if (notifyAssignedUser !== undefined) data.notifyAssignedUser = notifyAssignedUser;
    if (adminNotificationUserIds !== undefined) data.adminNotificationUserIds = adminNotificationUserIds;
    if (senderEmail !== undefined) data.senderEmail = senderEmail;
    if (defaultWhatsappMode !== undefined) data.defaultWhatsappMode = defaultWhatsappMode;
    if (whatsappApiUrl !== undefined) data.whatsappApiUrl = whatsappApiUrl;
    if (whatsappInstanceName !== undefined) data.whatsappInstanceName = whatsappInstanceName;
    if (whatsappApiToken !== undefined) data.whatsappApiToken = whatsappApiToken;
    if (whatsappConnected !== undefined) data.whatsappConnected = whatsappConnected;
    if (metaAccessToken !== undefined) data.metaAccessToken = metaAccessToken;
    if (metaPhoneNumberId !== undefined) data.metaPhoneNumberId = metaPhoneNumberId;
    if (metaBusinessAccountId !== undefined) data.metaBusinessAccountId = metaBusinessAccountId;
    if (metaTemplateName !== undefined) data.metaTemplateName = metaTemplateName;

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
