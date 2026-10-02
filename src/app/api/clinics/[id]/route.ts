import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de clínica" }, { status: 400 });
    }

    const auth = await authenticateApiRequest(id);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        fiscalProfiles: true,
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 });
    }

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("Error fetching clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de clínica" }, { status: 400 });
    }

    // RBAC & clinic access verification
    const auth = await authenticateApiRequest(id);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.address !== undefined) updateData.address = body.address.trim();
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.controlHorarioActivo !== undefined) updateData.controlHorarioActivo = Boolean(body.controlHorarioActivo);
    if (body.razonSocial !== undefined) updateData.razonSocial = body.razonSocial;
    if (body.cifNif !== undefined) updateData.cifNif = body.cifNif;
    if (body.scheduleOpening !== undefined) updateData.scheduleOpening = body.scheduleOpening;
    if (body.scheduleClosing !== undefined) updateData.scheduleClosing = body.scheduleClosing;
    if (body.appointmentInterval !== undefined) updateData.appointmentInterval = parseInt(body.appointmentInterval) || 15;
    if (body.cancellationNoticeHours !== undefined) updateData.cancellationNoticeHours = parseInt(body.cancellationNoticeHours) || 24;
    
    // Notifications & integrations
    if (body.notifyAssignedUser !== undefined) updateData.notifyAssignedUser = Boolean(body.notifyAssignedUser);
    if (body.adminNotificationUserIds !== undefined) updateData.adminNotificationUserIds = body.adminNotificationUserIds;
    if (body.senderEmail !== undefined) updateData.senderEmail = body.senderEmail;
    if (body.defaultWhatsappMode !== undefined) updateData.defaultWhatsappMode = body.defaultWhatsappMode;
    if (body.whatsappApiUrl !== undefined) updateData.whatsappApiUrl = body.whatsappApiUrl;
    if (body.whatsappInstanceName !== undefined) updateData.whatsappInstanceName = body.whatsappInstanceName;
    if (body.whatsappApiToken !== undefined) updateData.whatsappApiToken = body.whatsappApiToken;
    if (body.birthdayEnabled !== undefined) updateData.birthdayEnabled = Boolean(body.birthdayEnabled);
    if (body.birthdayMessage !== undefined) updateData.birthdayMessage = body.birthdayMessage;
    if (body.birthdayDiscount !== undefined) updateData.birthdayDiscount = parseInt(body.birthdayDiscount);
    if (body.birthdayImageUrl !== undefined) updateData.birthdayImageUrl = body.birthdayImageUrl;
    if (body.birthdayCardTheme !== undefined) updateData.birthdayCardTheme = body.birthdayCardTheme;

    const clinic = await prisma.clinic.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("Error updating clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta ID de clínica" }, { status: 400 });
    }

    // RBAC & clinic access verification: must be ADMIN
    const auth = await authenticateApiRequest(id);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }
    if (auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo los administradores pueden eliminar la clínica." }, { status: 403 });
    }

    await prisma.clinic.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Clínica eliminada correctamente" });
  } catch (error) {
    console.error("Error deleting clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
