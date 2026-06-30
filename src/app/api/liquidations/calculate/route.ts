import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/liquidations/calculate
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, clinicId, startDate, endDate } = body;

    if (!userId || !clinicId || !startDate || !endDate) {
      return NextResponse.json({ error: "Faltan parámetros obligatorios" }, { status: 400 });
    }

    // 1. Obtener la configuración del usuario
    const config = await prisma.userCommissionConfig.findUnique({
      where: {
        userId_clinicId: {
          userId,
          clinicId,
        },
      },
    });

    const defaultType = config?.defaultType || "PERCENTAGE";
    const defaultValue = config?.defaultValue || 0;
    const overrides = config?.overridesJson ? JSON.parse(config.overridesJson) : {};

    // 2. Obtener todas las citas "COMPLETED" en el rango
    const appointments = await prisma.appointment.findMany({
      where: {
        userId,
        clinicId,
        status: "COMPLETED",
        start: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deletedAt: null,
      },
      include: {
        client: true,
        service: true,
      },
      orderBy: {
        start: "asc",
      },
    });

    // 3. Procesar citas y calcular comisiones
    let totalAmount = 0;
    const details = [];

    if (defaultType === "DAILY_FIXED") {
      const daysMap = new Map<string, typeof appointments>();
      for (const app of appointments) {
        const year = app.start.getFullYear();
        const month = String(app.start.getMonth() + 1).padStart(2, "0");
        const day = String(app.start.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;

        if (!daysMap.has(dateKey)) {
          daysMap.set(dateKey, []);
        }
        daysMap.get(dateKey)!.push(app);
      }

      const sortedKeys = Array.from(daysMap.keys()).sort();
      for (const dateKey of sortedKeys) {
        const appsInDay = daysMap.get(dateKey)!;
        const totalPvp = appsInDay.reduce((sum: number, app: any) => sum + (app.service.price || 0), 0);
        
        const calculatedAmount = Math.round(defaultValue * 100) / 100;
        totalAmount += calculatedAmount;

        details.push({
          appointmentId: null,
          clientName: `${appsInDay.length} cita(s) atendida(s)`,
          serviceName: `Jornada Laboral (${appsInDay.map((a: any) => a.service.name).filter((v: any, i: number, self: any[]) => self.indexOf(v) === i).join(", ")})`,
          date: new Date(`${dateKey}T08:00:00.000Z`).toISOString(),
          servicePrice: totalPvp,
          commissionType: "DAILY_FIXED",
          commissionValue: defaultValue,
          calculatedAmount,
        });
      }
    } else {
      for (const app of appointments) {
        let commType = defaultType;
        let commVal = defaultValue;

        if (overrides[app.serviceId]) {
          commType = overrides[app.serviceId].type;
          commVal = overrides[app.serviceId].value;
        }

        const price = app.service.price || 0;
        let amount = 0;

        if (commType === "PERCENTAGE") {
          amount = price * (commVal / 100);
        } else {
          amount = commVal;
        }

        const calculatedAmount = Math.round(amount * 100) / 100;
        totalAmount += calculatedAmount;

        details.push({
          appointmentId: app.id,
          clientName: `${app.client.firstName} ${app.client.lastName || ""}`.trim(),
          serviceName: app.service.name,
          date: app.start.toISOString(),
          servicePrice: price,
          commissionType: commType,
          commissionValue: commVal,
          calculatedAmount,
        });
      }
    }

    return NextResponse.json({
      userId,
      clinicId,
      periodStart: startDate,
      periodEnd: endDate,
      totalAmount: Math.round(totalAmount * 100) / 100,
      details,
    });
  } catch (error) {
    console.error("Error calculating liquidations:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
