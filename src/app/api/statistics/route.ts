import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/authGuard";

// Helper to categorize sale items
function getSaleItemCategory(itemType: string): "servicios" | "productos" | "bonos" | "suscripciones" | "presupuestos" {
  const t = (itemType || "").toLowerCase();
  if (t === "service" || t === "servicio" || t === "citas" || t === "cita") return "servicios";
  if (t === "product" || t === "producto") return "productos";
  if (t === "voucher" || t === "bono") return "bonos";
  if (t === "subscription" || t === "suscripcion" || t === "suscripción") return "suscripciones";
  if (t === "budget" || t === "presupuesto") return "presupuestos";
  return "servicios";
}

// Helper to normalize payment method names
function normalizePaymentMethod(method: string | null | undefined): string {
  const m = (method || "").toUpperCase().trim();
  if (m === "CASH" || m === "EFECTIVO") return "Efectivo";
  if (m === "CARD" || m === "TARJETA") return "Tarjeta";
  if (m === "TRANSFER" || m === "TRANSFERENCIA") return "Transferencia";
  if (m === "BIZUM") return "Bizum";
  if (m === "OTHER" || m === "OTRO" || m === "OTROS") return "Otros";
  return m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : "Otros";
}

// Helper to calculate date range based on period string
function calculatePeriodDates(period: string): { start: Date; end: Date } | null {
  const now = new Date();

  switch (period) {
    case "hoy": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ayer": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_7":
    case "semana": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_30": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_90": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "esta_semana": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 3600000 + 59 * 60000 + 59999);
      return { start, end };
    }
    case "este_mes": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "mes_anterior": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "este_trimestre": {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "este_ano": {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case "all":
      return null;
    default:
      return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const periodParam = searchParams.get("period");

    if (!clinicId) {
      return NextResponse.json({ error: "Falta clinicId" }, { status: 400 });
    }

    // Authenticate request and verify clinic access
    const auth = await authenticateApiRequest(clinicId);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }

    // Determine effective Date range
    let start: Date | null = null;
    let end: Date | null = null;

    if (startDateParam && endDateParam) {
      start = new Date(startDateParam);
      if (startDateParam.length === 10) {
        start.setHours(0, 0, 0, 0);
      }
      end = new Date(endDateParam);
      if (endDateParam.length === 10) {
        end.setHours(23, 59, 59, 999);
      }
    } else if (periodParam) {
      const periodRange = calculatePeriodDates(periodParam);
      if (periodRange) {
        start = periodRange.start;
        end = periodRange.end;
      }
    } else {
      // Default to current month
      const defaultRange = calculatePeriodDates("este_mes")!;
      start = defaultRange.start;
      end = defaultRange.end;
    }

    // Build database filters
    const salesWhere: any = { clinicId };
    if (start || end) {
      salesWhere.createdAt = {};
      if (start) salesWhere.createdAt.gte = start;
      if (end) salesWhere.createdAt.lte = end;
    }

    const appointmentsWhere: any = {
      clinicId,
      deletedAt: null, // exclude soft-deleted appointments
    };
    if (start || end) {
      appointmentsWhere.start = {};
      if (start) appointmentsWhere.start.gte = start;
      if (end) appointmentsWhere.start.lte = end;
    }

    // Execute queries in parallel
    const [sales, appointments, totalClientsCount, staffUsers] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          client: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: appointmentsWhere,
        include: {
          client: true,
          service: true,
          user: true,
        },
        orderBy: { start: "asc" },
      }),
      prisma.client.count({
        where: { clinicId, deletedAt: null },
      }),
      prisma.user.findMany({
        where: {
          clinics: {
            some: { id: clinicId },
          },
        },
        select: {
          id: true,
          name: true,
          role: true,
          color: true,
        },
      }),
    ]);

    // -------------------------------------------------------------
    // 1. FACTURACIÓN Y FINANZAS (REAL AGGREGATION - NO FAKE MULTIPLIERS)
    // -------------------------------------------------------------
    const totalRevenue = sales.reduce((acc: number, sale: any) => acc + (sale.total || 0), 0);
    const salesCount = sales.length;
    const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;

    // Breakdown by Payment Method
    const paymentMethodStats: Record<string, { name: string; total: number; count: number }> = {};
    sales.forEach((sale: any) => {
      const norm = normalizePaymentMethod(sale.paymentMethod);
      if (!paymentMethodStats[norm]) {
        paymentMethodStats[norm] = { name: norm, total: 0, count: 0 };
      }
      paymentMethodStats[norm].total += (sale.total || 0);
      paymentMethodStats[norm].count += 1;
    });

    const paymentMethodsList = Object.values(paymentMethodStats).map((pm) => ({
      name: pm.name,
      total: Math.round(pm.total * 100) / 100,
      count: pm.count,
      percent: totalRevenue > 0 ? Math.round((pm.total / totalRevenue) * 100) : 0,
    }));

    // Breakdown by Category (parsing itemsJson safely)
    const categoryTotals = {
      servicios: 0,
      productos: 0,
      bonos: 0,
      suscripciones: 0,
      presupuestos: 0,
    };

    sales.forEach((sale: any) => {
      try {
        const items = JSON.parse(sale.itemsJson || "[]");
        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any) => {
            const lineVal = (item.price || 0) * (item.quantity || 1);
            const cat = getSaleItemCategory(item.type);
            categoryTotals[cat] += lineVal;
          });
        } else {
          categoryTotals.servicios += (sale.total || 0);
        }
      } catch {
        categoryTotals.servicios += (sale.total || 0);
      }
    });

    // Real Monthly Revenue Aggregation from actual Sale records
    const monthlyMap: Record<string, { key: string; name: string; value: number; count: number }> = {};
    sales.forEach((sale: any) => {
      const d = new Date(sale.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
      const capitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          key: monthKey,
          name: capitalized,
          value: 0,
          count: 0,
        };
      }
      monthlyMap[monthKey].value += (sale.total || 0);
      monthlyMap[monthKey].count += 1;
    });

    // If sales monthly data is empty or sparse, guarantee ordered array
    let monthlyRevenue = Object.values(monthlyMap).sort((a, b) => a.key.localeCompare(b.key));
    if (monthlyRevenue.length === 0 && start && end) {
      // Build empty month slot for the requested period
      const d = new Date(start);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
      monthlyRevenue = [
        {
          key: monthKey,
          name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          value: 0,
          count: 0,
        },
      ];
    }

    // Daily Revenue Breakdown
    const dailyRevenueMap: Record<string, { date: string; label: string; total: number; count: number; services: number; products: number; bonos: number }> = {};
    sales.forEach((sale: any) => {
      const d = new Date(sale.createdAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dateLabel = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

      if (!dailyRevenueMap[dateKey]) {
        dailyRevenueMap[dateKey] = {
          date: dateKey,
          label: dateLabel,
          total: 0,
          count: 0,
          services: 0,
          products: 0,
          bonos: 0,
        };
      }

      dailyRevenueMap[dateKey].total += (sale.total || 0);
      dailyRevenueMap[dateKey].count += 1;

      try {
        const items = JSON.parse(sale.itemsJson || "[]");
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const lineVal = (item.price || 0) * (item.quantity || 1);
            const cat = getSaleItemCategory(item.type);
            if (cat === "servicios") dailyRevenueMap[dateKey].services += lineVal;
            else if (cat === "productos") dailyRevenueMap[dateKey].products += lineVal;
            else if (cat === "bonos") dailyRevenueMap[dateKey].bonos += lineVal;
          });
        }
      } catch {
        dailyRevenueMap[dateKey].services += (sale.total || 0);
      }
    });

    const dailyRevenue = Object.values(dailyRevenueMap).sort((a, b) => a.date.localeCompare(b.date));

    // -------------------------------------------------------------
    // 2. CITAS Y AGENDA
    // -------------------------------------------------------------
    const appointmentsCount = appointments.length;

    let statusCompleted = 0;
    let statusPending = 0;
    let statusConfirmed = 0;
    let statusCancelled = 0;
    let statusNoShow = 0;
    let totalDurationMinutes = 0;

    // Hourly distribution (8:00 to 21:00)
    const hourlyCounts: Record<number, number> = {};
    for (let h = 8; h <= 21; h++) {
      hourlyCounts[h] = 0;
    }

    appointments.forEach((app: any) => {
      const st = (app.status || "").toUpperCase();
      if (st === "COMPLETED") statusCompleted += 1;
      else if (st === "PENDING") statusPending += 1;
      else if (st === "CONFIRMED") statusConfirmed += 1;
      else if (st === "CANCELLED") statusCancelled += 1;
      else if (st === "NOSHOW") statusNoShow += 1;

      if (app.start && app.end) {
        const diff = (new Date(app.end).getTime() - new Date(app.start).getTime()) / 60000;
        if (diff > 0) totalDurationMinutes += diff;

        const startHour = new Date(app.start).getHours();
        if (hourlyCounts[startHour] !== undefined) {
          hourlyCounts[startHour] += 1;
        }
      }
    });

    const noShowRate = appointmentsCount > 0 ? Math.round((statusNoShow / appointmentsCount) * 1000) / 10 : 0;
    const cancellationRate = appointmentsCount > 0 ? Math.round((statusCancelled / appointmentsCount) * 1000) / 10 : 0;
    const completionRate = appointmentsCount > 0 ? Math.round((statusCompleted / appointmentsCount) * 1000) / 10 : 0;

    const occupiedHours = Math.round((totalDurationMinutes / 60) * 10) / 10;
    const occupiedHoursFormatted = `${Math.floor(totalDurationMinutes / 60)}h ${Math.round(totalDurationMinutes % 60)}m`;

    // Occupancy estimation: calculate calendar days in range * 8h * number of active professionals
    const activeStaffCount = Math.max(1, staffUsers.length || new Set(appointments.map((a: any) => a.userId)).size);
    let calendarDaysCount = 30;
    if (start && end) {
      calendarDaysCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    const totalPotentialCapacityHours = calendarDaysCount * 8 * activeStaffCount;
    const occupancyRate = Math.min(100, Math.round((occupiedHours / totalPotentialCapacityHours) * 100));

    const hourlyDistribution = Object.entries(hourlyCounts).map(([h, count]) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      count,
    }));

    // -------------------------------------------------------------
    // 3. PACIENTES Y RETENCIÓN (FIDELIZACIÓN)
    // -------------------------------------------------------------
    const uniqueClientsSet = new Set<string>();
    appointments.forEach((a: any) => {
      if (a.clientId) uniqueClientsSet.add(a.clientId);
    });
    sales.forEach((s: any) => {
      if (s.clientId) uniqueClientsSet.add(s.clientId);
    });

    const activeClientsInPeriod = uniqueClientsSet.size;

    // Fetch clients created in this period to identify new acquisitions
    const newClientsWhere: any = { clinicId, deletedAt: null };
    if (start || end) {
      newClientsWhere.createdAt = {};
      if (start) newClientsWhere.createdAt.gte = start;
      if (end) newClientsWhere.createdAt.lte = end;
    }
    const newClientsCount = await prisma.client.count({ where: newClientsWhere });
    const recurrentClientsCount = Math.max(0, activeClientsInPeriod - newClientsCount);
    const retentionRate = activeClientsInPeriod > 0 ? Math.round((recurrentClientsCount / activeClientsInPeriod) * 100) : 0;

    // Demographics: Gender and Age distribution
    const genderCounts = { HOMBRE: 0, MUJER: 0, DESCONOCIDO: 0 };
    const ageBrackets = {
      "0-17": 0,
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55-64": 0,
      "65+": 0,
    };

    // Client detailed metrics & top clients ranking
    const clientAggregates: Record<string, { id: string; name: string; revenue: number; appointments: number; cancellations: number; absences: number; pending: number }> = {};

    appointments.forEach((app: any) => {
      if (!app.client) return;
      const c = app.client;
      const cId = c.id;

      if (!clientAggregates[cId]) {
        clientAggregates[cId] = {
          id: cId,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Paciente Sin Nombre",
          revenue: 0,
          appointments: 0,
          cancellations: 0,
          absences: 0,
          pending: 0,
        };

        // Gender tally (counted once per active client)
        const g = (c.gender || "DESCONOCIDO").toUpperCase();
        if (g.includes("HOMBRE") || g.includes("MALE") || g.includes("MAS")) genderCounts.HOMBRE += 1;
        else if (g.includes("MUJER") || g.includes("FEMALE") || g.includes("FEM")) genderCounts.MUJER += 1;
        else genderCounts.DESCONOCIDO += 1;

        // Age tally
        if (c.birthDate) {
          const age = new Date().getFullYear() - new Date(c.birthDate).getFullYear();
          if (age <= 17) ageBrackets["0-17"] += 1;
          else if (age <= 24) ageBrackets["18-24"] += 1;
          else if (age <= 34) ageBrackets["25-34"] += 1;
          else if (age <= 44) ageBrackets["35-44"] += 1;
          else if (age <= 54) ageBrackets["45-54"] += 1;
          else if (age <= 64) ageBrackets["55-64"] += 1;
          else ageBrackets["65+"] += 1;
        } else {
          ageBrackets["35-44"] += 1;
        }
      }

      clientAggregates[cId].appointments += 1;
      if (app.status === "CANCELLED") clientAggregates[cId].cancellations += 1;
      if (app.status === "NOSHOW") clientAggregates[cId].absences += 1;
      if (app.status === "PENDING" && app.service?.price) clientAggregates[cId].pending += app.service.price;
    });

    sales.forEach((sale: any) => {
      const cId = sale.clientId;
      if (cId) {
        if (!clientAggregates[cId]) {
          const c = sale.client;
          clientAggregates[cId] = {
            id: cId,
            name: c ? `${c.firstName || ""} ${c.lastName || ""}`.trim() : "Paciente Venta Directa",
            revenue: 0,
            appointments: 0,
            cancellations: 0,
            absences: 0,
            pending: 0,
          };
        }
        clientAggregates[cId].revenue += (sale.total || 0);
      }
    });

    const topClients = Object.values(clientAggregates)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 25);

    // -------------------------------------------------------------
    // 4. RENDIMIENTO DE PERSONAL (NULL CHECKS EN APP.USER Y APP.SERVICE)
    // -------------------------------------------------------------
    const staffMap: Record<string, { id: string; name: string; role: string; color: string; appointments: number; completed: number; cancellations: number; noShows: number; revenue: number; hoursWorked: number }> = {};

    // Initialize with known staff users
    staffUsers.forEach((u: any) => {
      staffMap[u.id] = {
        id: u.id,
        name: u.name || "Profesional",
        role: u.role || "DOCTOR",
        color: u.color || "#3b82f6",
        appointments: 0,
        completed: 0,
        cancellations: 0,
        noShows: 0,
        revenue: 0,
        hoursWorked: 0,
      };
    });

    // Populate from appointments with robust null checks
    appointments.forEach((app: any) => {
      const userId = app.userId || "unassigned";
      const userName = app.user?.name || "Sin asignar";
      const userRole = app.user?.role || "DOCTOR";
      const userColor = app.user?.color || "#64748b";
      const servicePrice = app.service?.price || 0;

      if (!staffMap[userId]) {
        staffMap[userId] = {
          id: userId,
          name: userName,
          role: userRole,
          color: userColor,
          appointments: 0,
          completed: 0,
          cancellations: 0,
          noShows: 0,
          revenue: 0,
          hoursWorked: 0,
        };
      }

      staffMap[userId].appointments += 1;

      if (app.status === "COMPLETED") {
        staffMap[userId].completed += 1;
        staffMap[userId].revenue += servicePrice;
      } else if (app.status === "CANCELLED") {
        staffMap[userId].cancellations += 1;
      } else if (app.status === "NOSHOW") {
        staffMap[userId].noShows += 1;
      }

      if (app.start && app.end && app.status === "COMPLETED") {
        const diffHours = (new Date(app.end).getTime() - new Date(app.start).getTime()) / 3600000;
        if (diffHours > 0) {
          staffMap[userId].hoursWorked += diffHours;
        }
      }
    });

    const staffPerformance = Object.values(staffMap).map((s) => {
      const workedHours = s.hoursWorked > 0 ? s.hoursWorked : Math.max(0.5, s.completed * 0.75);
      return {
        ...s,
        hoursWorked: Math.round(workedHours * 10) / 10,
        hourlyRate: workedHours > 0 ? Math.round(s.revenue / workedHours) : 0,
        avgTicket: s.completed > 0 ? Math.round((s.revenue / s.completed) * 100) / 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Chart Data 2: Backwards compatible appointmentsByStaff
    const appointmentsByStaff = staffPerformance.map((s) => ({
      name: s.name,
      count: s.appointments,
      completed: s.completed,
      revenue: s.revenue,
    }));

    // -------------------------------------------------------------
    // 5. POPULARIDAD DE SERVICIOS
    // -------------------------------------------------------------
    const serviceMap: Record<string, { id: string; name: string; category: string; count: number; revenue: number; color: string }> = {};

    appointments.forEach((app: any) => {
      const sId = app.serviceId || "unassigned";
      const sName = app.service?.name || "Sin servicio";
      const sCat = app.service?.category || "General";
      const sColor = app.service?.color || "#008fa3";
      const sPrice = app.service?.price || 0;

      if (!serviceMap[sId]) {
        serviceMap[sId] = {
          id: sId,
          name: sName,
          category: sCat,
          count: 0,
          revenue: 0,
          color: sColor,
        };
      }

      serviceMap[sId].count += 1;
      if (app.status === "COMPLETED") {
        serviceMap[sId].revenue += sPrice;
      }
    });

    const servicesRanking = Object.values(serviceMap)
      .sort((a, b) => b.count - a.count);

    const appointmentsByService = servicesRanking.slice(0, 10).map((s) => ({
      name: s.name,
      count: s.count,
      color: s.color,
      revenue: s.revenue,
    }));

    // -------------------------------------------------------------
    // FINAL RESPONSE: Backwards-compatible + Complete Enterprise BI
    // -------------------------------------------------------------
    return NextResponse.json({
      dateRange: {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        period: periodParam || "custom",
      },
      kpis: {
        totalRevenue,
        appointmentsCount,
        activeClientsCount: activeClientsInPeriod,
        totalClientsCount,
        avgTicket,
        occupancyRate,
        noShowRate,
        cancellationRate,
        completionRate,
        occupiedHours,
        occupiedHoursFormatted,
        completedCount: statusCompleted,
        salesCount,
      },
      charts: {
        monthlyRevenue, // REAL monthly revenue computed from actual Sale records!
        appointmentsByStaff,
        appointmentsByService,
        dailyRevenue,
        hourlyDistribution,
      },
      billing: {
        totalRevenue,
        avgTicket,
        salesCount,
        paymentMethods: paymentMethodsList,
        categories: categoryTotals,
        monthlyEvolution: monthlyRevenue,
        dailyEvolution: dailyRevenue,
      },
      appointmentsStats: {
        total: appointmentsCount,
        completed: statusCompleted,
        pending: statusPending,
        confirmed: statusConfirmed,
        cancelled: statusCancelled,
        noShow: statusNoShow,
        noShowRate,
        cancellationRate,
        completionRate,
        occupiedHours,
        occupiedHoursFormatted,
        hourlyDistribution,
      },
      patientsStats: {
        totalInClinic: totalClientsCount,
        activeInPeriod: activeClientsInPeriod,
        newClients: newClientsCount,
        recurrentClients: recurrentClientsCount,
        retentionRate,
        genderDistribution: genderCounts,
        ageDistribution: ageBrackets,
        topClients,
      },
      staffPerformance,
      servicesRanking,
    });
  } catch (error) {
    console.error("Error computing statistics in /api/statistics:", error);
    return NextResponse.json({ error: "Error en el servidor al calcular estadísticas" }, { status: 500 });
  }
}
