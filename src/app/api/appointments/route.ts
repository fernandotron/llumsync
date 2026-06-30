import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

// Helper: create an audit log entry
async function createLog(
  appointmentId: string,
  action: string,
  userName: string | null,
  userId: string | null,
  previousValue: string | null,
  newValue: string | null
) {
  await prisma.appointmentLog.create({
    data: {
      appointmentId,
      action,
      userName: userName || "Sistema",
      userId: userId || null,
      previousValue,
      newValue,
    },
  });
}

// Helper: format date for display
function formatDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper: translate status
function translateStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmada",
    COMPLETED: "Asistió",
    CANCELLED: "Cancelada",
    NOSHOW: "No asistió",
  };
  return map[s] || s;
}

async function triggerAdminNotifications(appointment: any, isNewAppointment: boolean) {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: appointment.clinicId },
    });
    if (!clinic) return;

    // Buscar notificaciones administrativas activas para este estado
    const systemNotifications = await prisma.appointmentReminder.findMany({
      where: {
        clinicId: appointment.clinicId,
        enabled: true,
        isSystem: true,
        condition: appointment.status,
      },
    });

    if (systemNotifications.length === 0) return;

    // Obtener los destinatarios a los que se debe notificar
    const recipients = new Set<string>();

    // 1. Profesional asignado (si está habilitado)
    if (clinic.notifyAssignedUser && appointment.user?.email) {
      recipients.add(appointment.user.email);
    }

    // 2. Administradores configurados (de la lista de IDs separados por comas)
    if (clinic.adminNotificationUserIds) {
      const adminIds = clinic.adminNotificationUserIds.split(",").filter(Boolean);
      if (adminIds.length > 0) {
        const admins = await prisma.user.findMany({
          where: { id: { in: adminIds } },
          select: { email: true },
        });
        admins.forEach((admin) => {
          if (admin.email) recipients.add(admin.email);
        });
      }
    }

    if (recipients.size === 0) return;

    const pacienteName = `${appointment.client?.firstName || ""} ${appointment.client?.lastName || ""}`.trim();
    const servicioName = appointment.service?.name || "Servicio General";
    const estadoName = translateStatus(appointment.status);

    const messageBody = `[CLIFAV AVISO] Se ha registrado o actualizado la cita de ${pacienteName} para el servicio ${servicioName} con estado ${estadoName}.`;

    // Configurar transportador de Nodemailer si las variables de entorno SMTP están configuradas
    let transporter: any = null;
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (hasSmtpConfig) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "465"),
        secure: parseInt(process.env.SMTP_PORT || "465") === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    for (const notification of systemNotifications) {
      // Filtrar por tipo de trigger
      if (isNewAppointment && notification.triggerWhen === "STATUS_ONLY") {
        continue;
      }

      // Enviar la alerta a cada destinatario
      for (const email of Array.from(recipients)) {
        let sentStatus = "SENT";
        
        // Si el canal es EMAIL y tenemos configuración SMTP, enviar correo real
        if (notification.channel === "EMAIL" && transporter) {
          try {
            await transporter.sendMail({
              from: clinic.senderEmail || process.env.SMTP_USER || "notificaciones@clifav.com",
              to: email,
              subject: `Aviso de Agenda - ${clinic.name}`,
              text: messageBody,
            });
          } catch (mailErr) {
            console.error("Error sending real email via SMTP:", mailErr);
            sentStatus = "FAILED";
          }
        }

        await prisma.notificationLog.create({
          data: {
            clinicId: appointment.clinicId,
            clientId: appointment.clientId,
            clientName: pacienteName,
            appointmentId: appointment.id,
            channel: notification.channel, // EMAIL | WHATSAPP | SMS
            recipient: `${email} (Admin Alerta)`,
            message: messageBody,
            status: sentStatus,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error triggering admin notifications:", error);
  }
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const userId = searchParams.get("userId");
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const whereClause: any = {
      clinicId,
      deletedAt: null, // Only active appointments (not in trash)
    };

    if (userId) whereClause.userId = userId;

    if (startStr && endStr) {
      whereClause.start = { gte: new Date(startStr) };
      whereClause.end = { lte: new Date(endStr) };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: { client: true, user: true, service: true },
      orderBy: { start: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, userId, serviceId, clinicId, start, end, notes, status, actorName, actorId, tags } = body;

    if (!clientId || !userId || !serviceId || !clinicId || !start || !end) {
      return NextResponse.json({ error: "Faltan datos obligatorios para la cita" }, { status: 400 });
    }

    // Fetch service and user names for the log snapshot
    const [service, user] = await Promise.all([
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        userId,
        serviceId,
        clinicId,
        start: new Date(start),
        end: new Date(end),
        notes,
        status: status || "PENDING",
        tags,
      },
      include: { client: true, user: true, service: true },
    });

    // Log: CREATED
    await createLog(
      appointment.id,
      "CREATED",
      actorName || null,
      actorId || null,
      null,
      `${service?.name || "Servicio"} con ${user?.name || "Profesional"} el ${formatDate(start)}`
    );

    await triggerAdminNotifications(appointment, true);

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, notes, start, end, userId, serviceId, actorName, actorId, tags } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID de cita a actualizar" }, { status: 400 });
    }

    // Read current appointment state before update
    const current = await prisma.appointment.findUnique({
      where: { id },
      include: { user: true, service: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (start) updateData.start = new Date(start);
    if (end) updateData.end = new Date(end);
    if (userId) updateData.userId = userId;
    if (serviceId) updateData.serviceId = serviceId;
    if (tags !== undefined) updateData.tags = tags;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { client: true, user: true, service: true },
    });

    // === Audit logging for each changed field ===

    // Status change
    if (status && status !== current.status) {
      await createLog(
        id, "STATUS_CHANGED",
        actorName || null, actorId || null,
        translateStatus(current.status),
        translateStatus(status)
      );

      // Descuento automático de stock si la cita pasa a COMPLETADA
      if (status === "COMPLETED") {
        try {
          const consumibles = await prisma.serviceProduct.findMany({
            where: { serviceId: appointment.serviceId },
          });

          for (const item of consumibles) {
            // Descontar stock
            await prisma.inventoryProduct.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });

            // Registrar transacción de salida automática
            const pacienteName = `${appointment.client?.firstName || ""} ${appointment.client?.lastName || ""}`.trim();
            await prisma.inventoryTransaction.create({
              data: {
                productId: item.productId,
                type: "CONSUMPTION",
                quantity: item.quantity,
                notes: `Consumo automático por cita completada de ${pacienteName} en el servicio ${appointment.service?.name || "General"}`,
                clinicId: appointment.clinicId,
                userId: actorId || null,
              }
            });
          }
        } catch (stockErr) {
          console.error("Error automatically deducting stock for completed appointment:", stockErr);
        }
      }
    }

    // Rescheduled
    if (start && new Date(start).getTime() !== current.start.getTime()) {
      await createLog(
        id, "RESCHEDULED",
        actorName || null, actorId || null,
        formatDate(current.start),
        formatDate(start)
      );
    }

    // Staff changed
    if (userId && userId !== current.userId) {
      const newUser = await prisma.user.findUnique({ where: { id: userId } });
      await createLog(
        id, "STAFF_CHANGED",
        actorName || null, actorId || null,
        `${current.user?.name || ""} ${current.user?.lastName || ""}`.trim(),
        `${newUser?.name || ""} ${newUser?.lastName || ""}`.trim()
      );
    }

    // Service changed
    if (serviceId && serviceId !== current.serviceId) {
      const newService = await prisma.service.findUnique({ where: { id: serviceId } });
      await createLog(
        id, "SERVICE_CHANGED",
        actorName || null, actorId || null,
        current.service?.name || "",
        newService?.name || ""
      );
    }

    // Notes changed
    if (notes !== undefined && notes !== current.notes) {
      await createLog(
        id, "NOTES_CHANGED",
        actorName || null, actorId || null,
        current.notes || "(vacío)",
        notes || "(vacío)"
      );
    }

    await triggerAdminNotifications(appointment, false);

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
