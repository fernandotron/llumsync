import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address, phone, email, userId } = body;

    if (!name || !address || !userId) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (nombre, dirección o usuario)" },
        { status: 400 }
      );
    }

    // 1. Create the clinic
    // 2. Connect the clinic to the requesting user
    const clinic = await prisma.clinic.create({
      data: {
        name,
        address,
        phone: phone || null,
        email: email || null,
        users: {
          connect: { id: userId },
        },
      },
    });

    // 3. Check if 'Servicio Demo' exists, otherwise create it
    let demoService = await prisma.service.findFirst({
      where: { name: "Servicio Demo" },
    });
    if (!demoService) {
      demoService = await prisma.service.create({
        data: {
          name: "Servicio Demo",
          price: 0,
          duration: 60,
          color: "#3b82f6",
          category: "Demo",
          description: "Servicio creado por defecto para demostración.",
        },
      });
    }

    // 4. Create default client "Cliente de paso"
    const maxClient = await prisma.client.findFirst({
      orderBy: { clientNumber: "desc" },
    });
    const nextClientNum = maxClient ? maxClient.clientNumber + 1 : 1001;

    const demoClient = await prisma.client.create({
      data: {
        clientNumber: nextClientNum,
        firstName: "Cliente",
        lastName: "de paso",
        clinicId: clinic.id,
        phone: "+34 600 000 000",
        email: "cliente.depaso@clifav.com",
      },
    });

    // 5. Create default appointment at 11:00 - 12:00 today
    const today = new Date();
    const appStart = new Date(today);
    appStart.setHours(11, 0, 0, 0);
    const appEnd = new Date(today);
    appEnd.setHours(12, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        clientId: demoClient.id,
        userId: userId,
        serviceId: demoService.id,
        clinicId: clinic.id,
        start: appStart,
        end: appEnd,
        notes: "Ejemplo de cita de prueba.",
        status: "CONFIRMED",
      },
    });

    // 6. Create default time block at 14:00 - 15:00 today
    const tbStart = new Date(today);
    tbStart.setHours(14, 0, 0, 0);
    const tbEnd = new Date(today);
    tbEnd.setHours(15, 0, 0, 0);

    await prisma.timeBlock.create({
      data: {
        title: "Esto es un ejemplo de reserva de tiempo",
        start: tbStart,
        end: tbEnd,
        userId: userId,
        clinicId: clinic.id,
        notes: "Cuando quieras reservar un espacio de tiempo sin que tenga que ver con una cita, y quieres que quede reflejado en el calendario para evitar asignar citas en ese periodo de tiempo, puedes utilizar esta función.",
      },
    });

    // 7. Create default EpisodeFormTemplate (Seguimientos) -> "General"
    await prisma.episodeFormTemplate.create({
      data: {
        name: "General",
        fields: JSON.stringify(["Observaciones", "Diagnóstico", "Operación", "Tratamiento", "Medicación"]),
        clinicId: clinic.id,
      },
    });

    // 8. Create default ClientFormTemplate (Formularios) -> "Detalles"
    await prisma.clientFormTemplate.create({
      data: {
        name: "Detalles",
        fields: JSON.stringify(["Antecedentes médicos", "Alergias", "Medicación", "Otros"]),
        isMain: true,
        clinicId: clinic.id,
      },
    });

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("Error creating clinic:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
