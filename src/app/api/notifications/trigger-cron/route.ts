import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getTimezoneForClinic } from "@/lib/countries";
import { createDailyBackup } from "@/lib/backup";

const activeSendingKeys = new Set<string>();

export async function processCronReminders(clinicId?: string, requestHost?: string) {
  // 1. Obtener recordatorios automáticos activos (EMAIL, WHATSAPP, SMS)
  const reminderWhere: any = {
    enabled: true,
    channel: { in: ["EMAIL", "WHATSAPP", "SMS"] },
    isSystem: false, // Solo recordatorios a pacientes
  };

  if (clinicId && clinicId !== "ALL") {
    reminderWhere.clinicId = clinicId;
  }

  const activeReminders = await prisma.appointmentReminder.findMany({
    where: reminderWhere,
  });

  if (activeReminders.length === 0) {
    return {
      message: "No hay recordatorios automáticos (Email, WhatsApp Auto o SMS) activos.",
      processedCount: 0,
      simulatedLogs: [],
    };
  }

  // 2. Obtener todas las citas (del pasado -30 días a los próximos 30 días) con sus clientes y servicios
  const now = new Date();
  
  const pastLimit = new Date();
  pastLimit.setDate(now.getDate() - 30);
  
  const futureLimit = new Date();
  futureLimit.setDate(now.getDate() + 30);

  const appointmentWhere: any = {
    deletedAt: null, // Solo citas activas
    start: {
      gte: pastLimit,
      lte: futureLimit,
    },
  };

  if (clinicId && clinicId !== "ALL") {
    appointmentWhere.clinicId = clinicId;
  }

  const appointments = await prisma.appointment.findMany({
    where: appointmentWhere,
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
      // Filtrar recordatorio por clínica si estamos iterando en modo GLOBAL (ALL)
      if (reminder.clinicId !== app.clinicId) {
        continue;
      }

      // 1. Flexible status condition check
      const isStatusMatch =
        reminder.condition === "ANY" ||
        reminder.condition === "ALL" ||
        reminder.condition === app.status ||
        (reminder.timing === "BEFORE" && reminder.condition === "CONFIRMED" && (app.status === "PENDING" || app.status === "CONFIRMED")) ||
        (reminder.timing === "BEFORE" && reminder.condition === "PENDING" && (app.status === "PENDING" || app.status === "CONFIRMED")) ||
        (reminder.timing === "AFTER" && reminder.condition === "COMPLETED" && app.status === "COMPLETED");

      if (!isStatusMatch) continue;

      // 2. Service match check
      const serviceMatch =
        reminder.allServices ||
        (reminder.serviceIds ? reminder.serviceIds.split(",").map((s: string) => s.trim()).includes(app.serviceId) : false);

      if (!serviceMatch) continue;

      // 3. Formatear el mensaje de recordatorio automático
      const startD = new Date(app.start);

      // Controlar el tiempo de envío para citas en base a configuración ANTES (BEFORE) o DESPUÉS (AFTER)
      const hoursBefore = reminder.hoursBefore || 0;
      const minutesBefore = reminder.minutesBefore || 0;
      const triggerTimeOffset = (hoursBefore * 60 * 60 * 1000) + (minutesBefore * 60 * 1000);
      const SEND_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas de ventana de gracia tras el disparo

      if (reminder.timing === "AFTER") {
        // AFTER: disparar cuando now >= cita + offset, dentro de ventana de 2h
        const timeToSend = startD.getTime() + triggerTimeOffset;
        if (now.getTime() < timeToSend || now.getTime() > timeToSend + SEND_WINDOW_MS) {
          continue;
        }
      } else {
        // BEFORE: disparar cuando now >= cita - offset (y antes de que empiece la cita)
        const timeToSend = startD.getTime() - triggerTimeOffset;
        
        // Aún no ha llegado el momento de disparo
        if (now.getTime() < timeToSend) {
          continue;
        }

        // Si la cita ya comenzó o concluyó, no enviar recordatorios de antelación
        if (now.getTime() >= startD.getTime()) {
          continue;
        }
      }

      // Usar zona horaria propia del país de la clínica (con cambio automático DST)
      const TZ = getTimezoneForClinic(app.clinic?.country);
      const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
      const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
      const longDateFormatted = startD.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: TZ });

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
        "{{Zona_horaria}}": TZ,
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

      const sendingKey = `${app.id}_${reminder.id}_${reminder.channel}`;
      if (activeSendingKeys.has(sendingKey)) {
        continue; // Evitar envío simultáneo por llamadas concurrentes
      }

      // Comprobar si ya existe un log guardado para evitar duplicar envíos
      const existingLog = await prisma.notificationLog.findFirst({
        where: {
          appointmentId: app.id,
          channel: reminder.channel,
          message: message,
        },
      });

      if (!existingLog) {
        activeSendingKeys.add(sendingKey);
        try {
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
              // 1. Meta WhatsApp Cloud API
              try {
                const targetUrl = `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`;
                
                const nombrePaciente = app.client?.firstName || "Paciente";
                const fechaTexto = startD.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                });
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
                            { type: "text", text: nombrePaciente },
                            { type: "text", text: fechaTexto },
                            { type: "text", text: horaTexto },
                            { type: "text", text: servicioTexto },
                            { type: "text", text: nombreConsulta }
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
              // 2. Evolution API (Código QR)
              try {
                let hasImage = !!reminder.imageUrl;
                let mediaValue = "";
                let mediatype = "image";
                let mimetype = "image/jpeg";
                let fileName = "imagen.jpg";

                if (hasImage && reminder.imageUrl) {
                  const cleanUrl = reminder.imageUrl.trim();

                  if (cleanUrl.startsWith("data:")) {
                    const match = cleanUrl.match(/^data:([^;]+);base64,(.*)$/);
                    if (match) {
                      mimetype = match[1];
                      mediaValue = match[2]; // Evolution API requires raw base64 string without data: header
                      if (mimetype === "image/png") fileName = "imagen.png";
                      else if (mimetype === "image/webp") fileName = "imagen.webp";
                      else if (mimetype === "image/gif") fileName = "imagen.gif";
                      else if (mimetype === "application/pdf") {
                        fileName = "documento.pdf";
                        mediatype = "document";
                      } else {
                        fileName = "imagen.jpg";
                      }
                    } else {
                      hasImage = false;
                    }
                  } else {
                    const rawFileName = path.basename(cleanUrl) || "imagen.jpg";
                    fileName = rawFileName.split("?")[0];
                    const ext = path.extname(fileName).toLowerCase();

                    if (ext === ".png") mimetype = "image/png";
                    else if (ext === ".webp") mimetype = "image/webp";
                    else if (ext === ".gif") mimetype = "image/gif";
                    else if (ext === ".pdf") {
                      mimetype = "application/pdf";
                      mediatype = "document";
                    }

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
                      mediaValue = fileBuffer.toString("base64");
                    } else if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                      mediaValue = cleanUrl;
                    } else if (cleanUrl.startsWith("/")) {
                      const reqHost = requestHost || process.env.RAILWAY_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "";
                      if (reqHost && !reqHost.includes("localhost")) {
                        const reqProtocol = "https";
                        mediaValue = `${reqProtocol}://${reqHost}${cleanUrl}`;
                      } else {
                        hasImage = false;
                      }
                    } else {
                      hasImage = false;
                    }
                  }
                }

                const targetUrl = hasImage
                  ? `${clinicApiUrl}/message/sendMedia/${clinicInstance}`
                  : `${clinicApiUrl}/message/sendText/${clinicInstance}`;

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

                let res = await fetch(targetUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "apikey": clinicToken,
                  },
                  body: JSON.stringify(requestBody),
                });

                // Si falló el envío con imagen, reintentar enviar como texto plano
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
              clinicId: app.clinicId,
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
        } finally {
          activeSendingKeys.delete(sendingKey);
        }
      }
    }
  }

  // 4. Automated Birthday Greetings (Felicitaciones de Cumpleaños)
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const clientWhere: any = {
      deletedAt: null,
      receivesReminders: true,
      birthDate: { not: null },
    };

    if (clinicId && clinicId !== "ALL") {
      clientWhere.clinicId = clinicId;
    }

    const clients = await prisma.client.findMany({
      where: clientWhere,
      include: { clinic: true },
    });

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const client of clients) {
      if (!client.birthDate) continue;
      const clinic = client.clinic;
      if (clinic && clinic.birthdayEnabled === false) {
        continue; // Clinic disabled birthday greetings
      }

      const bDate = new Date(client.birthDate);
      const bMonth = bDate.getMonth() + 1;
      const bDay = bDate.getDate();

      if (bMonth === currentMonth && bDay === currentDay) {
        // Check if already congratulated today
        const existingLog = await prisma.notificationLog.findFirst({
          where: {
            clientId: client.id,
            sentAt: { gte: startOfToday },
            message: { contains: "Cumpleaños" },
          },
        });

        if (!existingLog) {
          const discountVal = (clinic?.birthdayDiscount !== undefined && clinic?.birthdayDiscount !== null) ? clinic.birthdayDiscount : 15;
          const templateMsg = clinic?.birthdayMessage || `🎉 ¡Feliz Cumpleaños, {{Cliente:Nombre}}! 🎂 De parte de todo el equipo de {{Nombre_Consulta}}, te deseamos un excelente día. ¡Queremos regalarte un {{Descuento}} de descuento en tu próximo tratamiento! 🎁`;
          
          let birthdayMessage = templateMsg
            .replaceAll("{{Cliente:Nombre}}", client.firstName || "")
            .replaceAll("{{Cliente:Apellidos}}", client.lastName || "")
            .replaceAll("{{Nombre_Consulta}}", clinic?.name || "nuestra clínica")
            .replaceAll("{{Descuento}}%", `${discountVal}%`)
            .replaceAll("{{Descuento}}", `${discountVal}%`)
            .replaceAll("{{Dirección_Consulta}}", clinic?.address || "")
            .replaceAll("{{Telefono_Consulta}}", clinic?.phone || "");

          const cleanPhone = (client.phone || "").replace(/\D/g, "");
          const recipient = cleanPhone || client.email || "Cliente sin contacto";
          let sentStatus = "SENT";
          let apiError = "";

          // Send real WhatsApp if phone is present and WhatsApp is configured
          if (cleanPhone && clinic) {
            const clinicApiUrl = clinic.whatsappApiUrl || process.env.WHATSAPP_API_URL;
            const clinicInstance = clinic.whatsappInstanceName || process.env.WHATSAPP_INSTANCE_NAME;
            const clinicToken = clinic.whatsappApiToken || process.env.WHATSAPP_API_TOKEN;

            if (clinicApiUrl && clinicInstance && clinicToken) {
              try {
                const formattedPhone = cleanPhone.startsWith("34") || cleanPhone.length > 9 ? cleanPhone : `34${cleanPhone}`;
                const bdayImage = clinic.birthdayImageUrl;
                let hasImage = !!bdayImage;
                let mediaValue = "";
                let mediatype = "image";
                let mimetype = "image/png";
                let fileName = "tarjeta_cumpleanos.png";

                if (hasImage && bdayImage) {
                  const cleanUrl = bdayImage.trim();
                  if (cleanUrl.startsWith("data:")) {
                    const match = cleanUrl.match(/^data:([^;]+);base64,(.*)$/);
                    if (match) {
                      mimetype = match[1];
                      mediaValue = match[2];
                    } else {
                      hasImage = false;
                    }
                  } else {
                    const rawFileName = path.basename(cleanUrl) || "tarjeta.png";
                    fileName = rawFileName.split("?")[0];
                    const privatePath = path.join(process.cwd(), "private-uploads", fileName);
                    const publicPath = path.join(process.cwd(), "public", "uploads", fileName);

                    let targetFilePath = "";
                    if (fs.existsSync(privatePath)) targetFilePath = privatePath;
                    else if (fs.existsSync(publicPath)) targetFilePath = publicPath;

                    if (targetFilePath) {
                      const fileBuffer = fs.readFileSync(targetFilePath);
                      mediaValue = fileBuffer.toString("base64");
                    } else if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
                      mediaValue = cleanUrl;
                    } else {
                      hasImage = false;
                    }
                  }
                }

                // Compress base64 images with Sharp to JPEG format to ensure compatibility with WhatsApp WebSocket
                if (hasImage && mediaValue && mimetype.startsWith("image/") && !mediaValue.startsWith("http")) {
                  try {
                    const rawBuf = Buffer.from(mediaValue, "base64");
                    const jpegBuf = await sharp(rawBuf)
                      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
                      .jpeg({ quality: 85, mozjpeg: true })
                      .toBuffer();
                    mediaValue = jpegBuf.toString("base64");
                    mimetype = "image/jpeg";
                    fileName = "tarjeta_cumpleanos.jpg";
                  } catch (sharpErr) {
                    console.error("Error compressing birthday image with sharp:", sharpErr);
                  }
                }

                const targetUrl = hasImage
                  ? `${clinicApiUrl}/message/sendMedia/${clinicInstance}`
                  : `${clinicApiUrl}/message/sendText/${clinicInstance}`;

                const requestBody = hasImage
                  ? {
                      number: formattedPhone,
                      mediatype,
                      mimetype,
                      media: mediaValue,
                      caption: birthdayMessage,
                      fileName,
                      options: { delay: 1200, presence: "composing" }
                    }
                  : {
                      number: formattedPhone,
                      text: birthdayMessage,
                      textMessage: { text: birthdayMessage },
                      options: { delay: 1200, presence: "composing", linkPreview: false }
                    };

                const res = await fetch(targetUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", apikey: clinicToken },
                  body: JSON.stringify(requestBody),
                });

                if (!res.ok) {
                  const errText = await res.text();
                  sentStatus = "FAILED";
                  apiError = `WhatsApp API Error (${res.status}): ${errText}`;
                }
              } catch (err: any) {
                sentStatus = "FAILED";
                apiError = err.message || "Error de red WhatsApp";
              }
            }
          }

          const log = await prisma.notificationLog.create({
            data: {
              clinicId: client.clinicId,
              clientId: client.id,
              clientName: `${client.firstName} ${client.lastName}`.trim(),
              channel: client.phone ? "WHATSAPP" : "EMAIL",
              recipient: sentStatus === "FAILED" ? `${recipient} [Error: ${apiError}]` : recipient,
              message: birthdayMessage,
              status: sentStatus,
            },
          });
          simulatedLogs.push(log);
          processedCount++;
        }
      }
    }
  } catch (bdayErr) {
    console.error("Error processing birthday greetings:", bdayErr);
  }

  // Trigger daily automated backup check
  try {
    await createDailyBackup(clinicId !== "ALL" ? clinicId : undefined);
  } catch (bErr) {
    console.error("Backup check error in trigger-cron:", bErr);
  }

  return {
    message: `Procesamiento completado con éxito. Se procesaron ${processedCount} notificaciones (recordatorios y cumpleaños).`,
    processedCount,
    simulatedLogs,
  };
}

// GET /api/notifications/trigger-cron
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId") || undefined;
    const reqHost = request.headers.get("host") || undefined;

    const result = await processCronReminders(clinicId, reqHost);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error triggering reminders cron simulation:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}

// POST /api/notifications/trigger-cron
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const clinicId = body.clinicId || undefined;
    const reqHost = request.headers.get("host") || undefined;

    // Direct test send to a specified contact (e.g., Fernando Montilla)
    if (body.testPhone && clinicId) {
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) {
        return NextResponse.json({ error: "Clínica no encontrada" }, { status: 400 });
      }

      const cleanPhone = (body.testPhone || "").replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("34") || cleanPhone.length > 9 ? cleanPhone : `34${cleanPhone}`;
      const clinicApiUrl = clinic.whatsappApiUrl || process.env.WHATSAPP_API_URL;
      const clinicInstance = clinic.whatsappInstanceName || process.env.WHATSAPP_INSTANCE_NAME;
      const clinicToken = clinic.whatsappApiToken || process.env.WHATSAPP_API_TOKEN;

      if (!clinicApiUrl || !clinicInstance || !clinicToken) {
        return NextResponse.json({ error: "WhatsApp no está configurado en esta clínica" }, { status: 400 });
      }

      let testImg = body.testImage || clinic.birthdayImageUrl || "";
      let hasImage = !!testImg;
      let mediaValue = "";
      let mimetype = "image/png";
      let fileName = "tarjeta_cumpleanos.png";

      if (hasImage && testImg) {
        const cleanUrl = testImg.trim();
        if (cleanUrl.startsWith("data:")) {
          const match = cleanUrl.match(/^data:([^;]+);base64,(.*)$/);
          if (match) {
            mimetype = match[1];
            mediaValue = match[2];
          } else {
            hasImage = false;
          }
        } else {
          const rawFileName = path.basename(cleanUrl) || "tarjeta.png";
          fileName = rawFileName.split("?")[0];
          const privatePath = path.join(process.cwd(), "private-uploads", fileName);
          const publicPath = path.join(process.cwd(), "public", "uploads", fileName);

          let targetFilePath = "";
          if (fs.existsSync(privatePath)) targetFilePath = privatePath;
          else if (fs.existsSync(publicPath)) targetFilePath = publicPath;

          if (targetFilePath) {
            const fileBuffer = fs.readFileSync(targetFilePath);
            mediaValue = fileBuffer.toString("base64");
          } else if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
            mediaValue = cleanUrl;
          } else {
            hasImage = false;
          }
        }
      }

      // Compress test image with Sharp to JPEG format to ensure compatibility with WhatsApp WebSocket
      if (hasImage && mediaValue && mimetype.startsWith("image/") && !mediaValue.startsWith("http")) {
        try {
          const rawBuf = Buffer.from(mediaValue, "base64");
          const jpegBuf = await sharp(rawBuf)
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
          mediaValue = jpegBuf.toString("base64");
          mimetype = "image/jpeg";
          fileName = "tarjeta_cumpleanos.jpg";
        } catch (sharpErr) {
          console.error("Error compressing test image with sharp:", sharpErr);
        }
      }

      const targetUrl = hasImage
        ? `${clinicApiUrl}/message/sendMedia/${clinicInstance}`
        : `${clinicApiUrl}/message/sendText/${clinicInstance}`;

      const requestBody = hasImage
        ? {
            number: formattedPhone,
            mediatype: "image",
            mimetype: mimetype,
            media: mediaValue,
            caption: body.testMessage || "🎉 ¡Feliz Cumpleaños!",
            fileName: fileName,
            options: { delay: 1200, presence: "composing" }
          }
        : {
            number: formattedPhone,
            text: body.testMessage || "🎉 ¡Feliz Cumpleaños!",
            textMessage: { text: body.testMessage || "🎉 ¡Feliz Cumpleaños!" },
            options: { delay: 1200, presence: "composing", linkPreview: false }
          };

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: clinicToken },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `WhatsApp API Error (${res.status}): ${errText}` }, { status: 500 });
      }

      const resData = await res.json().catch(() => ({}));

      // Log test notification
      await prisma.notificationLog.create({
        data: {
          clinicId: clinic.id,
          clientId: body.testClientId || "test-client-id",
          clientName: body.testClientName || "Fernando Montilla",
          channel: "WHATSAPP",
          recipient: formattedPhone,
          message: body.testMessage || "🎉 ¡Feliz Cumpleaños!",
          status: "SENT",
        },
      });

      return NextResponse.json({ success: true, message: "Prueba de tarjeta de cumpleaños enviada por WhatsApp.", apiResponse: resData });
    }

    const result = await processCronReminders(clinicId, reqHost);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error triggering reminders cron simulation:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
