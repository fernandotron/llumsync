import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    // 1. Fetch appointments for target date
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        start: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        client: true,
        service: true,
        user: true,
      },
      orderBy: { start: "asc" },
    });

    // 2. Fetch sales for target date
    const sales = await prisma.sale.findMany({
      where: {
        clinicId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        client: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Grouping by Client ID for the target day to consolidate split/partial payments & multiple services into a single clean visit row
    const clientGroupMap = new Map<string, any>();

    // Process appointments first
    for (const appt of appointments) {
      const apptDate = new Date(appt.start);
      const formattedDate = apptDate.toLocaleDateString("es-ES");
      const formattedTime = apptDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
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
      const formattedDate = saleDate.toLocaleDateString("es-ES");
      const formattedTime = saleDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

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
            start: { gt: endOfDay },
            status: { notIn: ["CANCELLED", "NOSHOW"] },
          },
          orderBy: { start: "asc" },
        });

        if (nextAppt) {
          nextApptText = `${new Date(nextAppt.start).toLocaleDateString("es-ES")} ${new Date(nextAppt.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
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
      date: startOfDay.toISOString().split("T")[0],
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
