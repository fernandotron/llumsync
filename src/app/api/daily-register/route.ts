import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTimezoneForClinic } from "@/lib/countries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { country: true },
    });
    const tz = getTimezoneForClinic(clinic?.country);

    // Target date YYYY-MM-DD in clinic's timezone
    const targetDateStr = dateStr || new Date().toLocaleDateString("en-CA", { timeZone: tz });

    // Wide search window around target date (±36 hours UTC buffer)
    const targetUtcBase = new Date(`${targetDateStr}T12:00:00.000Z`);
    const searchStart = new Date(targetUtcBase.getTime() - 36 * 3600 * 1000);
    const searchEnd = new Date(targetUtcBase.getTime() + 36 * 3600 * 1000);

    // 1. Fetch appointments around target date
    const rawAppointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        start: { gte: searchStart, lte: searchEnd },
        deletedAt: null,
      },
      include: {
        client: true,
        service: true,
        user: true,
      },
      orderBy: { start: "asc" },
    });

    // Filter appointments matching targetDateStr in clinic timezone
    const appointments = rawAppointments.filter((appt: any) => {
      const localDate = new Date(appt.start).toLocaleDateString("en-CA", { timeZone: tz });
      return localDate === targetDateStr;
    });

    // 2. Fetch sales around target date
    const rawSales = await prisma.sale.findMany({
      where: {
        clinicId,
        createdAt: { gte: searchStart, lte: searchEnd },
      },
      include: {
        client: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Filter sales matching targetDateStr in clinic timezone
    const sales = rawSales.filter((sale: any) => {
      const localDate = new Date(sale.createdAt).toLocaleDateString("en-CA", { timeZone: tz });
      return localDate === targetDateStr;
    });

    // Grouping by Client ID for the target day to consolidate split/partial payments & multiple services into a single clean visit row
    const clientGroupMap = new Map<string, any>();

    // Process appointments first
    for (const appt of appointments) {
      const apptDate = new Date(appt.start);
      const formattedDate = apptDate.toLocaleDateString("es-ES", { timeZone: tz });
      const formattedTime = apptDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz });
      const clientId = appt.clientId;

      if (!clientGroupMap.has(clientId)) {
        clientGroupMap.set(clientId, {
          clientId,
          appointmentId: appt.id,
          date: formattedDate,
          rawDate: apptDate,
          time: formattedTime,
          patientName: `${appt.client.firstName} ${appt.client.lastName}`.trim(),
          dni: appt.client.dniNif || "-",
          phone: appt.client.phone || "-",
          cashAmount: 0,
          cardAmount: 0,
          totalAmount: 0,
          treatmentsList: new Set<string>(),
          invoicesList: new Set<string>(),
          nextAppointment: "",
          comments: appt.notes || "",
          status: appt.status,
          statusLabel: appt.status === "CANCELLED" ? "CANCELADA" : appt.status === "NOSHOW" ? "NO ASISTIÓ" : appt.status === "COMPLETED" ? "COMPLETADA" : "CONFIRMADA",
        });
      }

      const clientEntry = clientGroupMap.get(clientId);
      if (appt.service?.name) {
        clientEntry.treatmentsList.add(appt.service.name);
      }
    }

    // Process sales for target date and accumulate CASH and CARD amounts per client
    for (const sale of sales) {
      const clientId = sale.clientId || `guest-${sale.id}`;
      const saleDate = new Date(sale.createdAt);
      const formattedDate = saleDate.toLocaleDateString("es-ES", { timeZone: tz });
      const formattedTime = saleDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz });

      if (!clientGroupMap.has(clientId)) {
        clientGroupMap.set(clientId, {
          clientId: sale.clientId || "",
          saleId: sale.id,
          date: formattedDate,
          rawDate: saleDate,
          time: formattedTime,
          patientName: sale.client ? `${sale.client.firstName} ${sale.client.lastName}`.trim() : "Cliente General",
          dni: sale.client?.dniNif || "-",
          phone: sale.client?.phone || "-",
          cashAmount: 0,
          cardAmount: 0,
          totalAmount: 0,
          treatmentsList: new Set<string>(),
          invoicesList: new Set<string>(),
          nextAppointment: "",
          comments: "",
          status: "COMPLETED",
          statusLabel: "COMPLETADA",
        });
      }

      const clientEntry = clientGroupMap.get(clientId);
      clientEntry.status = "COMPLETED";
      clientEntry.statusLabel = "COMPLETADA";

      if (sale.invoiceNumber) {
        const shortInv = sale.invoiceNumber.replace(/^TKT-\d{4}-/, "#");
        clientEntry.invoicesList.add(shortInv);
      }

      // Add payment amounts
      if (sale.paymentMethod === "CASH") {
        clientEntry.cashAmount += sale.total;
      } else if (sale.paymentMethod === "CARD" || sale.paymentMethod === "TRANSFER") {
        clientEntry.cardAmount += sale.total;
      } else {
        clientEntry.cashAmount += sale.total;
      }

      // Extract treatments from itemsJson
      try {
        const itemsJson = JSON.parse(sale.itemsJson || "[]");
        if (Array.isArray(itemsJson)) {
          itemsJson.forEach((it: any) => {
            if (it.name) clientEntry.treatmentsList.add(it.name);
          });
        }
      } catch (e) {
        console.error("Error parsing itemsJson:", e);
      }
    }

    // Convert map to finalized list
    const resultList: any[] = [];

    for (const entry of Array.from(clientGroupMap.values())) {
      // Calculate next appointment for client
      let nextApptText = "";
      if (entry.clientId) {
        const nextAppt = await prisma.appointment.findFirst({
          where: {
            clinicId,
            clientId: entry.clientId,
            start: { gt: entry.rawDate },
            status: { notIn: ["CANCELLED", "NOSHOW"] },
            deletedAt: null,
          },
          orderBy: { start: "asc" },
        });

        if (nextAppt) {
          const nDateStr = new Date(nextAppt.start).toLocaleDateString("es-ES", { timeZone: tz });
          const nTimeStr = new Date(nextAppt.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz });
          nextApptText = `${nDateStr} ${nTimeStr}`;
        }
      }

      const treatmentsArr = Array.from(entry.treatmentsList as Set<string>);
      const treatmentStr = treatmentsArr.length > 0 ? treatmentsArr.join(", ") : "Consulta Medicina Estética";

      const invoicesArr = Array.from(entry.invoicesList as Set<string>);
      const invoiceComments = invoicesArr.length > 0 ? `Ref: ${invoicesArr.join(", ")}` : "";

      const totalAmount = entry.cashAmount + entry.cardAmount;

      resultList.push({
        id: entry.appointmentId || entry.saleId || `client-${entry.clientId}`,
        appointmentId: entry.appointmentId,
        date: entry.date,
        rawDate: entry.rawDate,
        time: entry.time,
        patientName: entry.patientName,
        clientId: entry.clientId,
        dni: entry.dni,
        phone: entry.phone,
        cashAmount: entry.cashAmount,
        cardAmount: entry.cardAmount,
        totalAmount,
        treatment: treatmentStr,
        nextAppointment: nextApptText,
        comments: entry.comments || invoiceComments,
        status: entry.status,
        statusLabel: entry.statusLabel,
      });
    }

    resultList.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    const totalCash = resultList.reduce((sum, item) => sum + item.cashAmount, 0);
    const totalCard = resultList.reduce((sum, item) => sum + item.cardAmount, 0);
    const totalGrand = totalCash + totalCard;

    return NextResponse.json({
      date: targetDateStr,
      items: resultList,
      metrics: {
        totalConsultations: resultList.filter((i) => i.status !== "CANCELLED" && i.status !== "NOSHOW").length,
        totalCash,
        totalCard,
        totalGrand,
      },
    });
  } catch (error: any) {
    console.error("Error in daily register API:", error);
    return NextResponse.json({ error: "Error al obtener el libro diario", details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appointmentId, comments } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "Falta appointmentId" }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { notes: comments },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating daily register notes:", error);
    return NextResponse.json({ error: "Error al guardar comentarios", details: error?.message || String(error) }, { status: 500 });
  }
}
