import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

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

    // 2. Obtener todas las citas (del pasado -7 días a los próximos 7 días) con sus clientes y servicios
    const now = new Date();
    
    const pastLimit = new Date();
    pastLimit.setDate(now.getDate() - 7);
    
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + 7);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        start: {
          gte: pastLimit,
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

        // Controlar el tiempo de envío para citas en base a configuración ANTES (BEFORE) o DESPUÉS (AFTER)
        const hoursBefore = reminder.hoursBefore || 0;
        const minutesBefore = reminder.minutesBefore || 0;
        const triggerTimeOffset = (hoursBefore * 60 * 60 * 1000) + (minutesBefore * 60 * 1000);

        if (reminder.timing === "AFTER") {
          // Para envíos después de la cita (ej: post-tratamiento)
          const timeToSend = startD.getTime() + triggerTimeOffset;
          if (now.getTime() < timeToSend) {
            // Aún no corresponde enviar el mensaje
            continue;
          }
        } else {
          // Para envíos antes de la cita (ej: recordatorio tradicional)
          const timeToSend = startD.getTime() - triggerTimeOffset;
          if (now.getTime() < timeToSend) {
            continue;
          }
        }

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
          "{{Fecha_Cita}}": dateFormatted,
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
          if (reminder.channel === "WHATSAPP") {
            const metaAccessToken = app.clinic?.metaAccessToken;
            const metaPhoneNumberId = app.clinic?.metaPhoneNumberId;
            const metaTemplateName = app.clinic?.metaTemplateName || "recordatorio_cita";

            const clinicApiUrl = app.clinic?.whatsappApiUrl || process.env.WHATSAPP_API_URL;
            const clinicInstance = app.clinic?.whatsappInstanceName || process.env.WHATSAPP_INSTANCE_NAME;
            const clinicToken = app.clinic?.whatsappApiToken || process.env.WHATSAPP_API_TOKEN;

            // Asegurar formato internacional (ej: 34600000000)
            const formattedPhone = cleanPhone.startsWith("34") || cleanPhone.length > 9 ? cleanPhone : `34${cleanPhone}`;

            if (metaAccessToken && metaPhoneNumberId) {
              // 1. OPCIÓN RECOMENDADA: Meta WhatsApp Cloud API (Oficial)
              try {
                const targetUrl = `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`;
                
                const nombrePaciente = app.client?.firstName || "Paciente";
                const fechaTexto = startD.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                }); // Ejemplo: "jueves, 2 de julio"
                const horaTexto = timeFormatted;
                const servicioTexto = app.service?.name || "su consulta médica";
                const nombreConsulta = app.clinic?.name || "nuestro centro";

                const res = await fetch(targetUrl, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${metaAccessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: formattedPhone,
                    type: "template",
                    template: {
                      name: metaTemplateName,
                      language: { code: "es" },
                      components: [
                        {
                          type: "body",
                          parameters: [
                            { type: "text", text: nombrePaciente },   // {{1}} -> Nombre del paciente
                            { type: "text", text: fechaTexto },       // {{2}} -> Fecha de la cita (ej: "jueves, 2 de julio")
                            { type: "text", text: horaTexto },        // {{3}} -> Hora de la cita (ej: "12:15")
                            { type: "text", text: servicioTexto },    // {{4}} -> Nombre del servicio (ej: "Fisioterapia")
                            { type: "text", text: nombreConsulta }    // {{5}} -> Nombre de la consulta (ej: "Clínica...")
                          ]
                        }
                      ]
                    }
                  }),
                });

                if (!res.ok) {
                  const errJson = await res.json().catch(() => ({}));
                  sentStatus = "FAILED";
                  apiError = `Meta API Error (${res.status}): ${JSON.stringify(errJson)}`;
                  console.error("Error al enviar WhatsApp a través de Meta API:", errJson);
                }
              } catch (err: any) {
                sentStatus = "FAILED";
                apiError = err.message || "Error de red";
                console.error("Error de conexión con Meta API:", err);
              }
            } else if (clinicApiUrl && clinicInstance && clinicToken) {
              // 2. OPCIÓN DE FALLBACK: Evolution API (Código QR)
              try {
                const hasImage = !!reminder.imageUrl;
                const targetUrl = hasImage
                  ? `${clinicApiUrl}/message/sendMedia/${clinicInstance}`
                  : `${clinicApiUrl}/message/sendText/${clinicInstance}`;

                let mediaValue = "";
                let mediatype = "image";
                let mimetype = "image/jpeg";
                let fileName = "imagen.jpg";

                if (hasImage && reminder.imageUrl) {
                  const cleanUrl = reminder.imageUrl.trim();
                  fileName = path.basename(cleanUrl) || "imagen.jpg";
                  const ext = path.extname(fileName).toLowerCase();

                  if (ext === ".png") mimetype = "image/png";
                  else if (ext === ".webp") mimetype = "image/webp";
                  else if (ext === ".gif") mimetype = "image/gif";
                  else if (ext === ".svg") mimetype = "image/svg+xml";
                  else if (ext === ".pdf") {
                    mimetype = "application/pdf";
                    mediatype = "document";
                  }

                  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                    mediaValue = cleanUrl;
                  } else if (cleanUrl.startsWith("data:")) {
                    // Evolution API exige la cadena Base64 PURA sin el prefijo "data:image/...;base64,"
                    mediaValue = cleanUrl.replace(/^data:[^;]+;base64,/, "");
                  } else {
                    // Es una ruta relativa local (ej. "/api/uploads/upload-12345.png")
                    const privatePath = path.join(process.cwd(), "private-uploads", fileName);
                    const publicPath = path.join(process.cwd(), "public", "uploads", fileName);

                    let targetFilePath = "";
                    if (fs.existsSync(privatePath)) {
                      targetFilePath = privatePath;
                    } else if (fs.existsSync(publicPath)) {
                      targetFilePath = publicPath;
                    }

                    if (targetFilePath) {
                      const fileBuffer = fs.readFileSync(targetFilePath);
                      // IMPORTANTE: Evolution API requiere la cadena Base64 LIMPIA (sin prefijo data:)
                      mediaValue = fileBuffer.toString("base64");
                    } else {
                      // Si no está en disco local, formar URL pública absoluta con el origen del request o variables de entorno
                      const reqUrl = new URL(request.url);
                      const requestOrigin = `${reqUrl.protocol}//${reqUrl.host}`;
                      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
                        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
                        : (process.env.NEXT_PUBLIC_APP_URL || requestOrigin);
                      mediaValue = `${baseUrl.replace(/\/$/, "")}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
                    }
                  }
                }

                const requestBody = hasImage
                  ? {
                      number: formattedPhone,
                      mediatype: mediatype,
                      mimetype: mimetype,
                      media: mediaValue,
                      caption: message,
                      fileName: fileName,
                      options: {
                        delay: 1200,
                        presence: "composing",
                      }
                    }
                  : {
                      number: formattedPhone,
                      text: message, // Nueva versión de Evolution API (v2.x)
                      textMessage: {
                        text: message // Compatibilidad con versiones anteriores
                      },
                      options: {
                        delay: 1200,
                        presence: "composing",
                        linkPreview: false
                      }
                    };

                let res = await fetch(targetUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "apikey": clinicToken,
                  },
                  body: JSON.stringify(requestBody),
                });

                // Si falló el envío con imagen (ej. 404 en URL de imagen efímera), reintentar enviar como mensaje de texto plano
                if (!res.ok && hasImage) {
                  const errText = await res.text();
                  console.warn("Error enviando imagen en Evolution API, reintentando como texto plano:", errText);

                  const fallbackUrl = `${clinicApiUrl}/message/sendText/${clinicInstance}`;
                  const fallbackBody = {
                    number: formattedPhone,
                    text: message,
                    textMessage: {
                      text: message
                    },
                    options: {
                      delay: 1200,
                      presence: "composing",
                      linkPreview: false
                    }
                  };

                  const fallbackRes = await fetch(fallbackUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "apikey": clinicToken,
                    },
                    body: JSON.stringify(fallbackBody),
                  });

                  if (fallbackRes.ok) {
                    res = fallbackRes;
                  }
                }

                if (!res.ok) {
                  const errText = await res.text();
                  sentStatus = "FAILED";
                  apiError = `Evolution API Error (${res.status}): ${errText}`;
                  console.error("Error al enviar WhatsApp a través de Evolution API:", errText);
                }
              } catch (err: any) {
                sentStatus = "FAILED";
                apiError = err.message || "Error de red";
                console.error("Error de conexión con Evolution API:", err);
              }
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

    // Trigger daily automated backup check
    try {
      const backupDir = path.join(process.cwd(), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const todayTag = new Date().toISOString().slice(0, 10);
      const files = fs.readdirSync(backupDir);
      const alreadyHasToday = files.some((f) => f.startsWith(`backup-${clinicId || "full"}-${todayTag}`));
      if (!alreadyHasToday) {
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        fetch(`${protocol}://${host}/api/backup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "trigger-daily", clinicId }),
        }).catch((e) => console.error("Error triggering daily backup in cron:", e));
      }
    } catch (bErr) {
      console.error("Backup check error in trigger-cron:", bErr);
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
