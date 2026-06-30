import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/notifications/trigger-cron
export async function POST(request: Request) {
  try {
    const { clinicId } = await request.json();

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    // 1. Obtener recordatorios automáticos activos de la clínica (EMAIL, WHATSAPP, SMS)
    const activeReminders = await prisma.appointmentReminder.findMany({
      where: {
        clinicId,
        enabled: true,
        channel: { in: ["EMAIL", "WHATSAPP", "SMS"] },
        isSystem: false, // Solo recordatorios a pacientes
      },
    });

    if (activeReminders.length === 0) {
      return NextResponse.json({
        message: "No hay recordatorios automáticos (Email, WhatsApp Auto o SMS) activos en esta clínica.",
        processedCount: 0,
      });
    }

    // 2. Obtener todas las citas próximas (de los próximos 7 días) con sus clientes y servicios
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + 7);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        start: {
          gte: now,
          lte: futureLimit,
        },
      },
      include: {
        client: true,
        service: true,
        clinic: true,
      },
    });

    let processedCount = 0;
    const simulatedLogs = [];

    // 3. Procesar cada cita y buscar si aplica algún recordatorio
    for (const app of appointments) {
      // Si el cliente explícitamente no recibe recordatorios, saltar
      if (app.client && app.client.receivesReminders === false) {
        continue;
      }

      for (const reminder of activeReminders) {
        // Verificar condición de estado
        if (reminder.condition !== app.status) continue;

        // Verificar asignación de servicios
        const serviceMatch =
          reminder.allServices ||
          (reminder.serviceIds ? reminder.serviceIds.split(",").includes(app.serviceId) : false);

        if (!serviceMatch) continue;

        // Formatear el mensaje de recordatorio automático
        const startD = new Date(app.start);
        const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
        const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
        const longDateFormatted = startD.toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const vars: Record<string, string> = {
          "{{Cliente:Nombre}}": app.client?.firstName || "",
          "{{Cliente:Apellidos}}": app.client?.lastName || "",
          "{{Cliente:Dirección_Cliente}}": app.client?.address || "",
          "{{Nombre_Consulta}}": app.clinic?.name || "Clifav Central",
          "{{Dirección_Consulta}}": app.clinic?.address || "Calle Principal 123",
          "{{Fecha_Hora_Cita}}": `${dateFormatted} a las ${timeFormatted}`,
          "{{Fecha_larga}}": longDateFormatted,
          "{{Hora_Cita}}": timeFormatted,
          "{{Nombre_Servicio}}": app.service?.name || "",
          "{{Link_VideoConsulta}}": `https://meet.jit.si/clifav-${app.id}`,
          "{{Link_Cancelar_Cita}}": `http://localhost:3000/appointments/${app.id}/cancel`,
          "{{Link_Mover_Cita}}": `http://localhost:3000/appointments/${app.id}/reschedule`,
          "{{Link_Confirmar_Cita}}": `http://localhost:3000/appointments/${app.id}/confirm`,
          "{{Link_Pago_Online}}": `http://localhost:3000/appointments/${app.id}/pay`,
          "{{Recurso}}": "",
          "{{Zona_horaria}}": "Europe/Madrid",
          "{{Deuda}}": "0.00",
        };

        let message = reminder.message;
        Object.keys(vars).forEach((key) => {
          message = message.replaceAll(key, vars[key]);
        });

        // Registrar el envío en logs
        const cleanPhone = (app.client?.phone || "").replace(/\D/g, "");
        const recipient = reminder.channel === "EMAIL" ? app.client?.email || "sin_correo@clifav.com" : cleanPhone || "sin_telefono";
        const senderNumber = reminder.channel === "WHATSAPP" 
          ? (app.clinic?.phone || "+34634021915") + " (Auto)" 
          : reminder.channel === "SMS" ? "CLIFAV" : "notificaciones@clifav.com";


        // Comprobar si ya existe un log similar para evitar duplicados en la simulación
        const existingLog = await prisma.notificationLog.findFirst({
          where: {
            appointmentId: app.id,
            channel: reminder.channel,
            message: message,
          },
        });

        if (!existingLog) {
          let sentStatus = "SENT";
          let apiError = "";

          // Envío real de WhatsApp si la API está configurada
          if (reminder.channel === "WHATSAPP" && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_INSTANCE_NAME && process.env.WHATSAPP_API_TOKEN) {
            try {
              // Asegurar formato internacional (ej: 34600000000)
              const formattedPhone = cleanPhone.startsWith("34") || cleanPhone.length > 9 ? cleanPhone : `34${cleanPhone}`;
              const targetUrl = `${process.env.WHATSAPP_API_URL}/message/sendText/${process.env.WHATSAPP_INSTANCE_NAME}`;
              
              const res = await fetch(targetUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": process.env.WHATSAPP_API_TOKEN,
                },
                body: JSON.stringify({
                  number: formattedPhone,
                  options: {
                    delay: 1200,
                    presence: "composing",
                    linkPreview: false
                  },
                  textMessage: {
                    text: message
                  }
                }),
              });

              if (!res.ok) {
                const errText = await res.text();
                sentStatus = "FAILED";
                apiError = `Error API (${res.status}): ${errText}`;
                console.error("Error al enviar WhatsApp a través de Evolution API:", errText);
              }
            } catch (err: any) {
              sentStatus = "FAILED";
              apiError = err.message || "Error de red";
              console.error("Error de conexión con Evolution API:", err);
            }
          }

          const log = await prisma.notificationLog.create({
            data: {
              clinicId,
              clientId: app.clientId,
              clientName: `${app.client?.firstName} ${app.client?.lastName || ""}`.trim(),
              appointmentId: app.id,
              channel: reminder.channel,
              recipient: sentStatus === "FAILED" 
                ? `${recipient} (Desde ${senderNumber}) [Error: ${apiError}]`
                : `${recipient} (Desde ${senderNumber})`,
              message: message,
              status: sentStatus,
            },
          });
          simulatedLogs.push(log);
          processedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Simulación completada con éxito. Se procesaron citas próximas y se enviaron recordatorios automáticos.`,
      processedCount,
      simulatedLogs,
    });
  } catch (error) {
    console.error("Error triggering reminders cron simulation:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
