import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { clinicId, clientId, clientName, to, subject, body } = await request.json();

    if (!to || !subject || !body || !clinicId) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    let sentStatus = "SENT";
    let errorMsg = "";

    // NodeMailer setup
    let transporter = null;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort) || 587,
          secure: smtpPort === "465",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: clinic?.senderEmail || smtpUser || "notificaciones@clifav.com",
          to,
          subject,
          text: body,
        });
      } catch (err: any) {
        console.error("Failed to send real SMTP email:", err);
        sentStatus = "FAILED";
        errorMsg = err.message || "Error al enviar email via SMTP";
      }
    }

    // Always create a Notification Log
    await prisma.notificationLog.create({
      data: {
        clinicId,
        clientId: clientId || "",
        clientName: clientName || "Paciente",
        channel: "EMAIL",
        recipient: to,
        message: body,
        status: sentStatus,
      }
    });

    if (sentStatus === "FAILED" && smtpHost) {
      return NextResponse.json({ error: "El correo no se pudo enviar a través del SMTP: " + errorMsg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in send-email API endpoint:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
