"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Statistics.module.css";
import { translate } from "@/lib/translations";
import { getCountryConfig } from "@/lib/countries";

// Date range helpers
const getMonthToDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const formatDateToInputHelper = (d: Date | null) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const parseInputDateHelper = (str: string): Date | null => {
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
};

const isSameDay = (d1: Date, d2: Date | null) => {
  if (!d2) return false;
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

export default function StatisticsPage() {
  const router = useRouter();
  const { activeClinic, user: currentUser, language } = useApp();
  const t = (key: string) => translate(key, language);
  const cConfig = getCountryConfig(activeClinic?.country || "ES");
  const currencySymbol = cConfig.currency;

  const formatPrice = (val: number) => {
    if (currencySymbol === "€") {
      return `${val.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
    }
    return `${currencySymbol}${val.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Permission check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "estadisticas", "Ver Estadisticas")) {
      router.push("/dashboard/agenda");
    }
  }, [currentUser, router]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"general" | "citas" | "ventas" | "clientes" | "rendimiento">("general");
  const [loading, setLoading] = useState(true);

  // Database lists
  const [appointments, setAppointments] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Date filters
  const [dateFilterStart, setDateFilterStart] = useState<Date | null>(() => getMonthToDateRange().start);
  const [dateFilterEnd, setDateFilterEnd] = useState<Date | null>(() => getMonthToDateRange().end);
  const [pickerStart, setPickerStart] = useState<Date | null>(() => getMonthToDateRange().start);
  const [pickerEnd, setPickerEnd] = useState<Date | null>(() => getMonthToDateRange().end);
  const [tempStartInput, setTempStartInput] = useState(() => formatDateToInputHelper(getMonthToDateRange().start));
  const [tempEndInput, setTempEndInput] = useState(() => formatDateToInputHelper(getMonthToDateRange().end));
  const [pickerPreset, setPickerPreset] = useState("este_mes");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => getMonthToDateRange().start);

  const datePickerRef = useRef<HTMLDivElement>(null);

  // Sorting
  const [clientSortKey, setClientSortKey] = useState<string>("revenue");
  const [clientSortOrder, setClientSortOrder] = useState<"asc" | "desc">("desc");
  const [staffSortKey, setStaffSortKey] = useState<string>("revenue");
  const [staffSortOrder, setStaffSortOrder] = useState<"asc" | "desc">("desc");

  // Rendimiento sub-select
  const [performanceMetric, setPerformanceMetric] = useState<"revenue" | "appointments">("revenue");

  // Fetch all clinic database lists on load
  useEffect(() => {
    if (!activeClinic) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/appointments?clinicId=${activeClinic.id}`).then(res => res.json()),
      fetch(`/api/sales?clinicId=${activeClinic.id}`).then(res => res.json()),
      fetch(`/api/clients?clinicId=${activeClinic.id}`).then(res => res.json()),
      fetch(`/api/services?clinicId=${activeClinic.id}`).then(res => res.json())
    ])
      .then(([apptsData, salesData, clientsData, servicesData]) => {
        setAppointments(Array.isArray(apptsData) ? apptsData : []);
        setSales(Array.isArray(salesData) ? salesData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading statistics lists:", err);
        setLoading(false);
      });
  }, [activeClinic]);

  // Click outside to close date picker popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner}></div>
        <span>{t("statsLoadingMetrics")}</span>
      </div>
    );
  }

  // --- RECTIVE LOCAL FILTERING ---
  const getFilterText = () => {
    if (!dateFilterStart || !dateFilterEnd) return "Todo";
    const opt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
    return `${dateFilterStart.toLocaleDateString("es-ES", opt)} - ${dateFilterEnd.toLocaleDateString("es-ES", opt)}`;
  };

  const filteredAppointments = appointments.filter((app) => {
    if (!app.start) return false;
    const appDate = new Date(app.start);
    if (dateFilterStart && appDate < dateFilterStart) return false;
    if (dateFilterEnd && appDate > dateFilterEnd) return false;
    return true;
  });

  const filteredSales = sales.filter((sale) => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    if (dateFilterStart && saleDate < dateFilterStart) return false;
    if (dateFilterEnd && saleDate > dateFilterEnd) return false;
    return true;
  });

  // --- STATISTICS CALCULATIONS ---

  // 1. General Metrics
  const totalRevenue = filteredSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const appointmentsCount = filteredAppointments.length;
  const totalDurationMinutes = filteredAppointments.reduce((acc, curr) => {
    if (!curr.start || !curr.end) return acc;
    const diff = (new Date(curr.end).getTime() - new Date(curr.start).getTime()) / 60000;
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  const occupiedHoursText = `${Math.floor(totalDurationMinutes / 60)}h ${Math.round(totalDurationMinutes % 60)}m`;

  const uniqueClientsSet = new Set<string>();
  filteredAppointments.forEach(a => uniqueClientsSet.add(a.clientId));
  filteredSales.forEach(s => uniqueClientsSet.add(s.clientId));
  const uniqueClientsCount = uniqueClientsSet.size;

  const noShowsCount = filteredAppointments.filter(a => a.status === "NOSHOW").length;
  const cancellationsCount = filteredAppointments.filter(a => a.status === "CANCELLED").length;

  // Day-by-day dates array for charts
  const getDaysArray = () => {
    const arr: Date[] = [];
    if (!dateFilterStart || !dateFilterEnd) return [];
    const dt = new Date(dateFilterStart);
    while (dt <= dateFilterEnd) {
      arr.push(new Date(dt));
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };
  const daysRange = getDaysArray();

  // Ingresos category parsing for bar charts
  const getSaleItemCategory = (itemType: string): "servicios" | "productos" | "bonos" | "suscripciones" | "presupuestos" => {
    const t = (itemType || "").toLowerCase();
    if (t === "service" || t === "servicio" || t === "citas") return "servicios";
    if (t === "product" || t === "producto") return "productos";
    if (t === "voucher" || t === "bono") return "bonos";
    if (t === "subscription" || t === "suscripcion") return "suscripciones";
    if (t === "budget" || t === "presupuesto") return "presupuestos";
    return "servicios";
  };

  // Stacked Income data per day
  const dailyIncomeData = daysRange.map((day) => {
    const daySales = filteredSales.filter(s => isSameDay(new Date(s.createdAt), day));
    const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.start), day) && a.status === "COMPLETED");

    let servicios = 0;
    let productos = 0;
    let bonos = 0;
    let suscripciones = 0;
    let presupuestos = 0;

    // Sum from sales
    daySales.forEach((sale) => {
      try {
        const items = JSON.parse(sale.itemsJson || "[]");
        items.forEach((item: any) => {
          const val = (item.price || 0) * (item.quantity || 1);
          const cat = getSaleItemCategory(item.type);
          if (cat === "servicios") servicios += val;
          else if (cat === "productos") productos += val;
          else if (cat === "bonos") bonos += val;
          else if (cat === "suscripciones") suscripciones += val;
          else if (cat === "presupuestos") presupuestos += val;
        });
      } catch (e) {
        servicios += sale.total || 0; // fallback
      }
    });

    // Fallback/add completed appointments values if no direct sales represent them
    dayAppts.forEach((appt) => {
      // Check if this appointment already has a registered sale to avoid double counting
      const alreadyFacturado = daySales.some((s) => {
        try {
          const items = JSON.parse(s.itemsJson || "[]");
          return items.some((i: any) => i.id === appt.id || i.id === `db-app-${appt.id}`);
        } catch (e) { return false; }
      });
      if (!alreadyFacturado && appt.service?.price) {
        servicios += appt.service.price;
      }
    });

    return {
      dayStr: day.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      servicios,
      productos,
      bonos,
      suscripciones,
      presupuestos,
      total: servicios + productos + bonos + suscripciones + presupuestos
    };
  });

  // Daily appointments count for General/Citas tab
  const dailyAppointmentsData = daysRange.map((day) => {
    const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.start), day));
    const newClientsAppts = dayAppts.filter((a) => {
      // client's first appointment ever
      const clientAppts = appointments.filter(prev => prev.clientId === a.clientId && prev.deletedAt === null);
      if (clientAppts.length === 0) return true;
      const earliest = new Date(Math.min(...clientAppts.map(p => new Date(p.start).getTime())));
      return earliest.getTime() === new Date(a.start).getTime();
    });

    const totalHours = dayAppts.reduce((acc, curr) => {
      const diff = (new Date(curr.end).getTime() - new Date(curr.start).getTime()) / 3600000;
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    return {
      dayStr: day.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      count: dayAppts.length,
      hours: totalHours,
      newClientsCount: newClientsAppts.length
    };
  });

  // Donut values: appointment status
  const totalApptsCount = filteredAppointments.length;
  const statusCompleted = filteredAppointments.filter(a => a.status === "COMPLETED").length;
  const statusPending = filteredAppointments.filter(a => a.status === "PENDING").length;
  const statusCancelled = filteredAppointments.filter(a => a.status === "CANCELLED").length;
  const statusNoShow = filteredAppointments.filter(a => a.status === "NOSHOW" || a.status === "NOSHOW").length;

  // Occupancy rate
  // open hours per professional = 8 hours * days
  const professionalsSet = new Set(appointments.map(a => a.userId));
  const staffCount = professionalsSet.size || 1;
  const totalOpenHours = Math.max(1, daysRange.length * 8 * staffCount);
  const occupiedHours = totalDurationMinutes / 60;
  const occupancyRate = Math.min(100, Math.round((occupiedHours / totalOpenHours) * 100));

  // Ventas EUR segments
  const salesByCitas = dailyIncomeData.reduce((acc, curr) => acc + curr.servicios, 0);
  const salesByBonos = dailyIncomeData.reduce((acc, curr) => acc + curr.bonos, 0);
  const salesByProductos = dailyIncomeData.reduce((acc, curr) => acc + curr.productos, 0);
  const salesBySuscripciones = dailyIncomeData.reduce((acc, curr) => acc + curr.suscripciones, 0);
  const salesByPresupuestos = dailyIncomeData.reduce((acc, curr) => acc + curr.presupuestos, 0);
  const salesTotalSum = salesByCitas + salesByBonos + salesByProductos + salesBySuscripciones + salesByPresupuestos;

  // Top 5 services
  const serviceRevenues: Record<string, { name: string; value: number; color: string }> = {};
  filteredAppointments.forEach((a) => {
    if (!a.service) return;
    const price = a.service.price || 0;
    if (serviceRevenues[a.service.name]) {
      serviceRevenues[a.service.name].value += price;
    } else {
      serviceRevenues[a.service.name] = {
        name: a.service.name,
        value: price,
        color: a.service.color || "#008fa3"
      };
    }
  });
  const topServices = Object.values(serviceRevenues)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topServicesMax = topServices.length > 0 ? topServices[0].value : 1;

  // Sales Payment methods distribution
  const paymentMethodSums: Record<string, number> = {};
  filteredSales.forEach((sale) => {
    const method = sale.paymentMethod || "Efectivo";
    paymentMethodSums[method] = (paymentMethodSums[method] || 0) + (sale.total || 0);
  });
  const totalPaymentsSum = Object.values(paymentMethodSums).reduce((acc, curr) => acc + curr, 0) || 1;
  const paymentMethodsList = Object.entries(paymentMethodSums).map(([name, val]) => ({
    name,
    value: val,
    percent: Math.round((val / totalPaymentsSum) * 100)
  }));

  // Past appointments paid vs unpaid distributions
  const pastAppts = filteredAppointments.filter(a => new Date(a.start) < new Date());
  const pastPaidCount = pastAppts.filter(a => a.status === "COMPLETED").length;
  const pastUnpaidCount = pastAppts.filter(a => a.status === "PENDING" || a.status === "NOSHOW").length;
  const totalPastCount = pastPaidCount + pastUnpaidCount || 1;

  // Clientes Tab calculations
  // Gender profile of clients in range
  const clientGenderCounts: Record<string, number> = { HOMBRE: 0, MUJER: 0, DESCONOCIDO: 0 };
  const clientAgesList = {
    "0-17": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45-54": 0,
    "55-64": 0,
    "65+": 0
  };

  const activeClientsInPeriod = clients.filter(c => uniqueClientsSet.has(c.id));
  activeClientsInPeriod.forEach((c) => {
    const gender = (c.gender || "DESCONOCIDO").toUpperCase();
    if (gender.includes("HOMBRE") || gender.includes("MALE") || gender.includes("MAS")) {
      clientGenderCounts.HOMBRE += 1;
    } else if (gender.includes("MUJER") || gender.includes("FEMALE") || gender.includes("FEM")) {
      clientGenderCounts.MUJER += 1;
    } else {
      clientGenderCounts.DESCONOCIDO += 1;
    }

    if (c.birthDate) {
      const age = new Date().getFullYear() - new Date(c.birthDate).getFullYear();
      if (age <= 17) clientAgesList["0-17"] += 1;
      else if (age <= 24) clientAgesList["18-24"] += 1;
      else if (age <= 34) clientAgesList["25-34"] += 1;
      else if (age <= 44) clientAgesList["35-44"] += 1;
      else if (age <= 54) clientAgesList["45-54"] += 1;
      else if (age <= 64) clientAgesList["55-64"] += 1;
      else clientAgesList["65+"] += 1;
    } else {
      // assume average distribution bracket for missing ages
      clientAgesList["35-44"] += 1;
    }
  });

  const totalGenderCount = Object.values(clientGenderCounts).reduce((acc, curr) => acc + curr, 0) || 1;

  // Clientes Detail table calculations
  const clientMetrics = clients.map((client) => {
    const clientSales = filteredSales.filter(s => s.clientId === client.id);
    const clientAppts = filteredAppointments.filter(a => a.clientId === client.id);

    const clientRevenue = clientSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const pendingAmount = clientAppts.filter(a => a.status === "PENDING" && a.service?.price).reduce((acc, curr) => acc + curr.service.price, 0);
    const cancellations = clientAppts.filter(a => a.status === "CANCELLED").length;
    const absences = clientAppts.filter(a => a.status === "NOSHOW").length;

    return {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      revenue: clientRevenue,
      pending: pendingAmount,
      cancellations,
      absences
    };
  });

  // Filter out clients with no activity in this range to reduce table noise
  const filteredClientMetrics = clientMetrics.filter(cm => cm.revenue > 0 || cm.cancellations > 0 || cm.absences > 0 || cm.pending > 0);

  // Sorting logic for clients
  const sortedClients = [...filteredClientMetrics].sort((a: any, b: any) => {
    let valA = a[clientSortKey];
    let valB = b[clientSortKey];

    if (clientSortKey === "name") {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    }

    if (valA < valB) return clientSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return clientSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // 5. Rendimiento (Team stats)
  const staffMetrics: Record<string, { id: string; name: string; revenue: number; appointments: number; hourly: number }> = {};
  
  // Initialize staff
  appointments.forEach(a => {
    if (a.user && !staffMetrics[a.userId]) {
      staffMetrics[a.userId] = {
        id: a.userId,
        name: a.user.name,
        revenue: 0,
        appointments: 0,
        hourly: 0
      };
    }
  });

  // Calculate values
  filteredAppointments.forEach((appt) => {
    if (!appt.user) return;
    const servicePrice = appt.service?.price || 0;
    const isCompleted = appt.status === "COMPLETED";

    if (!staffMetrics[appt.userId]) {
      staffMetrics[appt.userId] = {
        id: appt.userId,
        name: appt.user.name,
        revenue: 0,
        appointments: 0,
        hourly: 0
      };
    }

    // Accumulate service prices as generated revenue
    staffMetrics[appt.userId].revenue += servicePrice;
    if (isCompleted) {
      staffMetrics[appt.userId].appointments += 1;
    }
  });

  // Sum from direct sales if they are marked with employee/created by
  // For safety, base revenue calculation on appointments services prices since it correlates with work hours.
  const staffList = Object.values(staffMetrics).map(sm => {
    // assume 45 minutes (0.75 hours) per appointment for hourly wage calculation
    const hoursWorked = Math.max(0.5, sm.appointments * 0.75);
    return {
      ...sm,
      hourly: sm.appointments > 0 ? sm.revenue / hoursWorked : 0
    };
  });

  const sortedStaff = [...staffList].sort((a: any, b: any) => {
    let valA = a[staffSortKey];
    let valB = b[staffSortKey];
    if (staffSortKey === "name") {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    }
    if (valA < valB) return staffSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return staffSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Dynamic daily revenue breakdown per staff member for Team performance chart
  const staffDailyIncome = daysRange.map((day) => {
    const row: Record<string, number> = {};
    staffList.forEach((s) => {
      const dayAppts = filteredAppointments.filter(a => a.userId === s.id && isSameDay(new Date(a.start), day));
      if (performanceMetric === "revenue") {
        row[s.id] = dayAppts.reduce((acc, curr) => acc + (curr.service?.price || 0), 0);
      } else {
        row[s.id] = dayAppts.filter(a => a.status === "COMPLETED").length;
      }
    });
    return {
      dayStr: day.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      ...row
    };
  });

  // Color map for staff lines
  const staffColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#ef4848"];

  // --- CALENDAR GRID GENERATOR (Exact duplicate of compact sales calendar) ---
  const getCalendarGridDays = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days = [];

    // Prepend previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isMuted: true });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isMuted: false });
    }

    // Append next month days to make it multiple of 7
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isMuted: true });
    }
    return days;
  };

  const handleDayClick = (date: Date) => {
    if (!pickerStart || (pickerStart && pickerEnd)) {
      setPickerStart(date);
      setPickerEnd(null);
      setTempStartInput(formatDateToInputHelper(date));
      setTempEndInput("");
    } else {
      if (date < pickerStart) {
        setPickerStart(date);
        setTempStartInput(formatDateToInputHelper(date));
      } else {
        setPickerEnd(date);
        setTempEndInput(formatDateToInputHelper(date));
      }
    }
  };

  const isDateInRange = (date: Date) => {
    if (!pickerStart || !pickerEnd) return false;
    return date >= pickerStart && date <= pickerEnd;
  };

  const handlePrevMonths = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 2, 1));
  };

  const handleNextMonths = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 2, 1));
  };

  const getMonthHeaderLabel = (date: Date) => {
    return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  };

  const handlePresetChange = (preset: string) => {
    setPickerPreset(preset);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === "hoy") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (preset === "ayer") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (preset === "ultimos_7") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (preset === "ultimos_30") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (preset === "ultimos_90") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (preset === "esta_semana") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    } else if (preset === "este_mes") {
      const { start: s, end: e } = getMonthToDateRange();
      start = s;
      end = e;
    } else if (preset === "mes_anterior") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (preset === "octubre_2025") {
      start = new Date(2025, 9, 1, 0, 0, 0);
      end = new Date(2025, 9, 15, 23, 59, 59);
    } else if (preset === "junio_2026") {
      start = new Date(2026, 5, 1, 0, 0, 0);
      end = new Date(2026, 5, 22, 23, 59, 59);
    } else if (preset === "personalizado") {
      return; // let user input manually
    }

    setPickerStart(start);
    setPickerEnd(end);
    setTempStartInput(formatDateToInputHelper(start));
    setTempEndInput(formatDateToInputHelper(end));
    setDateFilterStart(start);
    setDateFilterEnd(end);
    setShowFilterDropdown(false);
  };

  const handleStartInputChange = (val: string) => {
    setTempStartInput(val);
    if (val.length === 10) {
      const parsed = parseInputDateHelper(val);
      if (parsed) {
        setPickerStart(parsed);
        setCalendarMonth(parsed);
      }
    }
  };

  const handleEndInputChange = (val: string) => {
    setTempEndInput(val);
    if (val.length === 10) {
      const parsed = parseInputDateHelper(val);
      if (parsed) {
        setPickerEnd(parsed);
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* TOOLBAR */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.title}>{translate("statsTitle", language)}</h1>
          <span className={styles.clinicSubtitle}>{activeClinic?.name}</span>
        </div>
      </header>

      {/* FILTER BUTTON & BADGE */}
      <div className={styles.filterBar} ref={datePickerRef} style={{ position: "relative" }}>
        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Icons.Filter size={15} />
          <span>{t("filter")}</span>
        </button>

        {dateFilterStart && dateFilterEnd && (
          <div
            className={styles.filterTagBadge}
            onClick={() => {
              setShowFilterDropdown(true);
            }}
          >
            <Icons.Calendar size={12} />
            <span>{t("dateLabel")}: {getFilterText()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDateFilterStart(null);
                setDateFilterEnd(null);
                setPickerStart(null);
                setPickerEnd(null);
                setTempStartInput("");
                setTempEndInput("");
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Floating compact date picker popover */}
        {showFilterDropdown && (
          <div className={styles.cascadeFilterPopover}>
            <div className={styles.cascadeFilterRightCol}>
              <h3 className={styles.chartCardTitle}>
                <Icons.Calendar size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                {t("dateRange")}
              </h3>

              <div className="form-group" style={{ marginBottom: "8px" }}>
                <label className="form-label" style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "11px", marginBottom: "4px" }}>Preset</label>
                <select
                  className="input select"
                  value={pickerPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  style={{ width: "100%", height: "28px", padding: "2px 8px", fontSize: "12px" }}
                >
                  <option value="hoy">{t("today")}</option>
                  <option value="ayer">{t("yesterday")}</option>
                  <option value="ultimos_7">{t("last7days")}</option>
                  <option value="ultimos_30">{t("last30days")}</option>
                  <option value="ultimos_90">{t("last90days")}</option>
                  <option value="esta_semana">{t("thisWeek")}</option>
                  <option value="este_mes">{t("thisMonth")}</option>
                  <option value="mes_anterior">{t("lastMonth")}</option>
                  <option value="octubre_2025">Octubre 1-15, 2025 (Demo)</option>
                  <option value="junio_2026">Junio 1-22, 2026 (Demo)</option>
                  <option value="personalizado">{t("custom")}</option>
                </select>
              </div>

              {pickerPreset === "personalizado" && (
                <div>
                  <div className={styles.pickerInputsRow}>
                    <div className="form-group" style={{ flex: 1, marginBottom: "4px" }}>
                      <label className="form-label" style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{t("startDate")}</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="DD-MM-YYYY"
                        value={tempStartInput}
                        onChange={(e) => handleStartInputChange(e.target.value)}
                        style={{ height: "28px", padding: "2px 8px", fontSize: "12px", width: "100%" }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: "4px" }}>
                      <label className="form-label" style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{t("endDate")}</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="DD-MM-YYYY"
                        value={tempEndInput}
                        onChange={(e) => handleEndInputChange(e.target.value)}
                        style={{ height: "28px", padding: "2px 8px", fontSize: "12px", width: "100%" }}
                      />
                    </div>
                  </div>

                  <div className={styles.calendarsBlock}>
                    <div className={styles.calendarNav}>
                      <button type="button" className={styles.navArrow} onClick={handlePrevMonths}>‹</button>
                      <strong className={styles.calendarMonthLabel}>{getMonthHeaderLabel(calendarMonth)}</strong>
                      <strong className={styles.calendarMonthLabel}>
                        {getMonthHeaderLabel(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      </strong>
                      <button type="button" className={styles.navArrow} onClick={handleNextMonths}>›</button>
                    </div>

                    <div className={styles.gridsContainer}>
                      {/* Left calendar month */}
                      <div className={styles.calendarCol}>
                        <div className={styles.weekHeaders}>
                          {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
                            <span key={day} className={styles.weekHeaderCell}>{day}</span>
                          ))}
                        </div>
                        <div className={styles.calendarDaysGrid}>
                          {getCalendarGridDays(calendarMonth).map(({ date, isMuted }, idx) => {
                            const isStart = isSameDay(date, pickerStart);
                            const isEnd = isSameDay(date, pickerEnd);
                            const inRange = isDateInRange(date);
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`${styles.dayCell} ${isMuted ? styles.dayCellMuted : ""} ${isStart ? styles.dayCellActiveStart : ""} ${isEnd ? styles.dayCellActiveEnd : ""} ${inRange ? styles.dayCellInRange : ""}`}
                                onClick={() => handleDayClick(date)}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right calendar month */}
                      <div className={styles.calendarCol}>
                        <div className={styles.weekHeaders}>
                          {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
                            <span key={day} className={styles.weekHeaderCell}>{day}</span>
                          ))}
                        </div>
                        <div className={styles.calendarDaysGrid}>
                          {getCalendarGridDays(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)).map(({ date, isMuted }, idx) => {
                            const isStart = isSameDay(date, pickerStart);
                            const isEnd = isSameDay(date, pickerEnd);
                            const inRange = isDateInRange(date);
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`${styles.dayCell} ${isMuted ? styles.dayCellMuted : ""} ${isStart ? styles.dayCellActiveStart : ""} ${isEnd ? styles.dayCellActiveEnd : ""} ${inRange ? styles.dayCellInRange : ""}`}
                                onClick={() => handleDayClick(date)}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.pickerFooter} style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setShowFilterDropdown(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className={styles.btnApply}
                  onClick={() => {
                    if (pickerStart && pickerEnd && pickerEnd < pickerStart) {
                      alert("La fecha final no puede ser anterior a la de inicio.");
                      return;
                    }
                    setDateFilterStart(pickerStart);
                    setDateFilterEnd(pickerEnd);
                    setShowFilterDropdown(false);
                  }}
                >
                  {t("apply")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TABS SELECTOR */}
      <nav className={styles.tabsList}>
        {[
          { key: "general", label: t("tabGeneral") },
          { key: "citas", label: t("tabAppointments") },
          { key: "ventas", label: t("tabSalesAndBilling") },
          { key: "clientes", label: t("tabClients") },
          { key: "rendimiento", label: t("tabPerformance") }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* --- TAB CONTENT 1: GENERAL --- */}
      {activeTab === "general" && (
        <div className={styles.dashboardGrid}>
          {/* Left Column: Resumen */}
          <div className={styles.card}>
            <h3 className={styles.chartCardTitle}>{t("summary")}</h3>
            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryIcon} ${styles.blue}`}>
                  <Icons.DollarCircle size={16} />
                </div>
                <span className={styles.summaryLabel}>{t("statsSales")}</span>
                <strong className={styles.summaryValue}>{formatPrice(totalRevenue)}</strong>
              </div>

              <div className={styles.summaryItem}>
                <div className={`${styles.summaryIcon} ${styles.purple}`}>
                  <Icons.Calendar size={16} />
                </div>
                <span className={styles.summaryLabel}>{t("statsBookedAppts")}</span>
                <strong className={styles.summaryValue}>{appointmentsCount}</strong>
              </div>

              <div className={styles.summaryItem}>
                <div className={`${styles.summaryIcon} ${styles.green}`}>
                  <Icons.Clock size={16} />
                </div>
                <span className={styles.summaryLabel}>{t("statsOccupied")}</span>
                <strong className={styles.summaryValue}>{occupiedHoursText}</strong>
              </div>

              <div className={styles.summaryItem}>
                <div className={`${styles.summaryIcon} ${styles.blue}`}>
                  <Icons.Users size={16} />
                </div>
                <span className={styles.summaryLabel}>{t("statsClients")}</span>
                <strong className={styles.summaryValue}>{uniqueClientsCount}</strong>
              </div>

              <div className={styles.summaryItem}>
                <div className={`${styles.summaryIcon} ${styles.orange}`}>
                  <Icons.Warning size={16} />
                </div>
                <span className={styles.summaryLabel}>{t("statsNoShows")}</span>
                <strong className={styles.summaryValue}>{noShowsCount}</strong>
              </div>

              <div className={styles.summaryItem}>
                <div className={`${styles.summaryIcon} ${styles.red}`}>
                  <Icons.Trash size={16} />
                </div>
                <span className={styles.summaryLabel}>{t("statsCancellations")}</span>
                <strong className={styles.summaryValue}>{cancellationsCount}</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Charts */}
          <div className={styles.generalRightCol}>
            {/* Top Chart: Ingresos Bar Chart */}
            <div className={styles.card}>
              <h3 className={styles.chartCardTitle}>{t("income")}</h3>
              <div className={styles.chartCanvas}>
                {dailyIncomeData.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("noDataForPeriod")}</span>
                ) : (
                  <svg viewBox="0 0 700 240" className={styles.svgChart}>
                    <line x1="40" y1="20" x2="660" y2="20" className={styles.gridLine} />
                    <line x1="40" y1="80" x2="660" y2="80" className={styles.gridLine} />
                    <line x1="40" y1="140" x2="660" y2="140" className={styles.gridLine} />
                    <line x1="40" y1="190" x2="660" y2="190" className={styles.axisLine} />

                    {(() => {
                      const maxVal = Math.max(...dailyIncomeData.map((d) => d.total)) || 100;
                      const plotHeight = 170; // 190 - 20
                      const barWidth = Math.max(10, Math.min(24, 500 / dailyIncomeData.length));
                      const gap = (600 - barWidth * dailyIncomeData.length) / (dailyIncomeData.length + 1);

                      return (
                        <>
                          {dailyIncomeData.map((data, idx) => {
                            const x = 50 + idx * (barWidth + gap);

                            // Calculate stacked segments
                            const hServ = (data.servicios / maxVal) * plotHeight;
                            const hProd = (data.productos / maxVal) * plotHeight;
                            const hBono = (data.bonos / maxVal) * plotHeight;
                            const hSusc = (data.suscripciones / maxVal) * plotHeight;
                            const hPres = (data.presupuestos / maxVal) * plotHeight;

                            const yServ = 190 - hServ;
                            const yProd = yServ - hProd;
                            const yBono = yProd - hBono;
                            const ySusc = yBono - hSusc;
                            const yPres = ySusc - hPres;

                            return (
                              <g key={idx}>
                                {/* Stacked bars */}
                                {hServ > 0 && <rect x={x} y={yServ} width={barWidth} height={hServ} fill="#3b82f6" rx="2" />}
                                {hProd > 0 && <rect x={x} y={yProd} width={barWidth} height={hProd} fill="#ec4899" rx="2" />}
                                {hBono > 0 && <rect x={x} y={yBono} width={barWidth} height={hBono} fill="#8b5cf6" rx="2" />}
                                {hSusc > 0 && <rect x={x} y={ySusc} width={barWidth} height={hSusc} fill="#10b981" rx="2" />}
                                {hPres > 0 && <rect x={x} y={yPres} width={barWidth} height={hPres} fill="#f59e0b" rx="2" />}

                                {/* Label on hover (drawn dynamically or as title element) */}
                                <title>{`${data.dayStr}: ${formatPrice(data.total)}`}</title>

                                {/* Day Label */}
                                {(dailyIncomeData.length < 15 || idx % 2 === 0) && (
                                  <text x={x + barWidth / 2} y="210" className={styles.chartText} textAnchor="middle" style={{ fontSize: "9px" }}>
                                    {data.dayStr}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Legends inside SVG */}
                          <g transform="translate(40, 230)">
                            <circle cx="10" cy="-4" r="4" fill="#3b82f6" />
                            <text x="20" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartServices")}</text>
                            <circle cx="100" cy="-4" r="4" fill="#ec4899" />
                            <text x="110" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartProducts")}</text>
                            <circle cx="190" cy="-4" r="4" fill="#8b5cf6" />
                            <text x="200" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartVouchers")}</text>
                            <circle cx="270" cy="-4" r="4" fill="#10b981" />
                            <text x="280" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartSubscriptions")}</text>
                            <circle cx="370" cy="-4" r="4" fill="#f59e0b" />
                            <text x="380" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartBudgets")}</text>
                          </g>
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>
            </div>

            {/* Bottom Chart: Citas Line Chart */}
            <div className={styles.card}>
              <h3 className={styles.chartCardTitle}>{t("tabAppointments")}</h3>
              <div className={styles.chartCanvas}>
                {dailyAppointmentsData.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("noApptData")}</span>
                ) : (
                  <svg viewBox="0 0 700 240" className={styles.svgChart}>
                    <line x1="40" y1="20" x2="660" y2="20" className={styles.gridLine} />
                    <line x1="40" y1="80" x2="660" y2="80" className={styles.gridLine} />
                    <line x1="40" y1="140" x2="660" y2="140" className={styles.gridLine} />
                    <line x1="40" y1="190" x2="660" y2="190" className={styles.axisLine} />

                    {(() => {
                      const maxVal = Math.max(...dailyAppointmentsData.map((d) => d.count)) || 5;
                      const plotHeight = 170;
                      const widthX = 600;
                      const pointsCount = dailyAppointmentsData.length;
                      const stepX = widthX / (pointsCount - 1 || 1);

                      const points = dailyAppointmentsData.map((data, idx) => {
                        const x = 50 + idx * stepX;
                        const y = 190 - (data.count / maxVal) * plotHeight;
                        return { x, y, label: data.dayStr, count: data.count };
                      });

                      const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                      const areaPath = `${linePath} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                      return (
                        <>
                          <defs>
                            <linearGradient id="citasAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#008fa3" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#008fa3" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Gradient Area */}
                          <path d={areaPath} fill="url(#citasAreaGrad)" />

                          {/* Line */}
                          <path d={linePath} fill="none" stroke="#008fa3" strokeWidth="2.5" strokeLinecap="round" />

                          {/* Dots */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#008fa3" strokeWidth="2" />
                              <title>{`${p.label}: ${p.count} citas`}</title>

                              {/* X Axis Labels */}
                              {(pointsCount < 15 || idx % 2 === 0) && (
                                <text x={p.x} y="210" className={styles.chartText} textAnchor="middle" style={{ fontSize: "9px" }}>
                                  {p.label}
                                </text>
                              )}
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 2: CITAS --- */}
      {activeTab === "citas" && (
        <div>
          <div className={styles.citasLayout}>
            {/* Left Column: Multi-series Line Chart */}
            <div className={styles.card}>
              <h3 className={styles.chartCardTitle}>{t("totalApptsPeriod")}: {appointmentsCount}</h3>
              <div className={styles.chartCanvas}>
                {dailyAppointmentsData.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("noData")}</span>
                ) : (
                  <svg viewBox="0 0 700 240" className={styles.svgChart}>
                    <line x1="40" y1="20" x2="660" y2="20" className={styles.gridLine} />
                    <line x1="40" y1="80" x2="660" y2="80" className={styles.gridLine} />
                    <line x1="40" y1="140" x2="660" y2="140" className={styles.gridLine} />
                    <line x1="40" y1="190" x2="660" y2="190" className={styles.axisLine} />

                    {(() => {
                      const maxCount = Math.max(...dailyAppointmentsData.map((d) => d.count)) || 5;
                      const maxHours = Math.max(...dailyAppointmentsData.map((d) => d.hours)) || 5;
                      const maxNew = Math.max(...dailyAppointmentsData.map((d) => d.newClientsCount)) || 5;
                      const absoluteMax = Math.max(maxCount, maxHours, maxNew) || 5;

                      const plotHeight = 170;
                      const widthX = 600;
                      const stepX = widthX / (dailyAppointmentsData.length - 1 || 1);

                      const pointsCitas = dailyAppointmentsData.map((d, idx) => ({
                        x: 50 + idx * stepX,
                        y: 190 - (d.count / absoluteMax) * plotHeight
                      }));

                      const pointsHours = dailyAppointmentsData.map((d, idx) => ({
                        x: 50 + idx * stepX,
                        y: 190 - (d.hours / absoluteMax) * plotHeight
                      }));

                      const pointsNew = dailyAppointmentsData.map((d, idx) => ({
                        x: 50 + idx * stepX,
                        y: 190 - (d.newClientsCount / absoluteMax) * plotHeight
                      }));

                      const pathCitas = pointsCitas.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                      const pathHours = pointsHours.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                      const pathNew = pointsNew.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

                      return (
                        <>
                          <path d={pathCitas} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                          <path d={pathHours} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,3" />
                          <path d={pathNew} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />

                          {dailyAppointmentsData.map((d, idx) => (
                            <g key={idx}>
                              {(dailyAppointmentsData.length < 15 || idx % 2 === 0) && (
                                <text x={50 + idx * stepX} y="210" className={styles.chartText} textAnchor="middle" style={{ fontSize: "9px" }}>
                                  {d.dayStr}
                                </text>
                              )}
                            </g>
                          ))}

                          <g transform="translate(40, 230)">
                            <circle cx="10" cy="-4" r="4" fill="#3b82f6" />
                            <text x="20" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("tabAppointments")}</text>
                            <circle cx="120" cy="-4" r="4" fill="#8b5cf6" />
                            <text x="130" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("bookedTime")} (h)</text>
                            <circle cx="260" cy="-4" r="4" fill="#10b981" />
                            <text x="270" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("colAestheticTreatments") /* or custom translation if needed, let's keep it clean: */ ? t("ageGroups") === "Age groups" ? "From new clients" : t("ageGroups") === "Grups d'edat" ? "De nous clients" : t("ageGroups") === "Adin-taldeak" ? "Bezero berrienak" : "De nuevos clientes" : "De nuevos clientes"}</text>
                          </g>
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>
            </div>

            {/* Right side widgets */}
            <div className={styles.citasSidebar}>
              <div className={styles.miniCard}>
                <div className={`${styles.summaryIcon} ${styles.blue}`}>
                  <Icons.Calendar size={16} />
                </div>
                <div className={styles.miniCardVal}>
                  <strong>{appointmentsCount} {t("scheduledAppointments")}</strong>
                  <span>{t("inGeneralSchedule")}</span>
                </div>
              </div>

              <div className={styles.miniCard}>
                <div className={`${styles.summaryIcon} ${styles.green}`}>
                  <Icons.Clock size={16} />
                </div>
                <div className={styles.miniCardVal}>
                  <strong>{occupiedHoursText} {t("occupiedHoursLabel")}</strong>
                  <span>{t("sessionDurationSum")}</span>
                </div>
              </div>

              <div className={styles.miniCard}>
                <div className={`${styles.summaryIcon} ${styles.purple}`}>
                  <Icons.Users size={16} />
                </div>
                <div className={styles.miniCardVal}>
                  <strong>{uniqueClientsCount} {t("uniqueClients")}</strong>
                  <span>{t("patientsAttended")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: Pie & Occupancy gauge */}
          <div className={styles.citasBottomRow}>
            {/* Donut: Appointment statuses */}
            <div className={styles.card}>
              <h3 className={styles.chartCardTitle}>{t("apptStatuses")}</h3>
              <div className={styles.donutLayout}>
                <div className={styles.donutSvgContainer}>
                  <svg viewBox="0 0 200 200" className={styles.donutSvg}>
                    <circle cx="100" cy="100" r="70" fill="transparent" stroke="#f3f4f6" strokeWidth="16" />
                    {(() => {
                      const totalVal = totalApptsCount || 1;
                      const rad = 70;
                      const circ = 2 * Math.PI * rad;
                      let acc = 0;

                      return [
                        { name: t("completedAppts"), count: statusCompleted, color: "#10b981" },
                        { name: t("pendingAppts"), count: statusPending, color: "#f59e0b" },
                        { name: t("cancelledAppts"), count: statusCancelled, color: "#ef4848" },
                        { name: t("absences"), count: statusNoShow, color: "#8b5cf6" }
                      ].map((item, idx) => {
                        const percent = item.count / totalVal;
                        if (percent === 0) return null;
                        const dashArray = `${circ * percent} ${circ}`;
                        const dashOffset = -circ * acc;
                        acc += percent;

                        return (
                          <circle
                            key={idx}
                            cx="100"
                            cy="100"
                            r={rad}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="16"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 100 100)"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className={styles.donutMiddleText}>
                    <span className={styles.donutMiddleVal}>{totalApptsCount}</span>
                    <span className={styles.donutMiddleLbl}>{t("total")}</span>
                  </div>
                </div>

                <div className={styles.donutLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#10b981" }} />
                    <span className={styles.legendText}>{t("completedLegend")}</span>
                    <span className={styles.legendVal}>{statusCompleted} ({totalApptsCount > 0 ? Math.round((statusCompleted / totalApptsCount) * 100) : 0}%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#f59e0b" }} />
                    <span className={styles.legendText}>{t("pendingLegend")}</span>
                    <span className={styles.legendVal}>{statusPending} ({totalApptsCount > 0 ? Math.round((statusPending / totalApptsCount) * 100) : 0}%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#ef4848" }} />
                    <span className={styles.legendText}>{t("cancelledLegend")}</span>
                    <span className={styles.legendVal}>{statusCancelled} ({totalApptsCount > 0 ? Math.round((statusCancelled / totalApptsCount) * 100) : 0}%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#8b5cf6" }} />
                    <span className={styles.legendText}>{t("absences")}</span>
                    <span className={styles.legendVal}>{statusNoShow} ({totalApptsCount > 0 ? Math.round((statusNoShow / totalApptsCount) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Circular Gauge: Occupancy */}
            <div className={styles.card}>
              <h3 className={styles.chartCardTitle}>{t("bookedTime")}</h3>
              <div className={styles.gaugeWrapper}>
                <div className={styles.gaugeContainer}>
                  <svg viewBox="0 0 100 100" className={styles.gaugeSvg}>
                    <circle cx="50" cy="50" r="42" fill="transparent" stroke="#f3f4f6" strokeWidth="8" />
                    {(() => {
                      const rad = 42;
                      const circ = 2 * Math.PI * rad;
                      const offset = circ - (occupancyRate / 100) * circ;
                      return (
                        <circle
                          cx="50"
                          cy="50"
                          r={rad}
                          fill="transparent"
                          stroke="#008fa3"
                          strokeWidth="8"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          transform="rotate(-90 50 50)"
                          strokeLinecap="round"
                        />
                      );
                    })()}
                  </svg>
                  <div className={styles.gaugeLabelText}>
                    <span className={styles.gaugePercent}>{occupancyRate}%</span>
                    <span className={styles.gaugeSubtitle}>{t("occupancy")}</span>
                  </div>
                </div>
                <div className={styles.gaugeFooter}>
                  <div className={styles.gaugeFooterItem}>
                    <span className={styles.gaugeDot} style={{ background: "#008fa3" }} />
                    <span>{t("bookedSchedule")}: {occupiedHours.toFixed(1)}h</span>
                  </div>
                  <div className={styles.gaugeFooterItem}>
                    <span className={styles.gaugeDot} style={{ background: "#f3f4f6" }} />
                    <span>{t("availableSchedule")}: {Math.max(0, totalOpenHours - occupiedHours).toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 3: VENTAS Y FACTURACIÓN --- */}
      {activeTab === "ventas" && (
        <div className={styles.citasLayout}>
          {/* Left Column: stacked bar chart */}
          <div className={styles.card}>
            <h3 className={styles.chartCardTitle}>{t("incomeInPeriod")}</h3>
            <div className={styles.chartCanvas}>
              {dailyIncomeData.length === 0 ? (
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("noData")}</span>
              ) : (
                <svg viewBox="0 0 700 240" className={styles.svgChart}>
                  <line x1="40" y1="20" x2="660" y2="20" className={styles.gridLine} />
                  <line x1="40" y1="80" x2="660" y2="80" className={styles.gridLine} />
                  <line x1="40" y1="140" x2="660" y2="140" className={styles.gridLine} />
                  <line x1="40" y1="190" x2="660" y2="190" className={styles.axisLine} />

                  {(() => {
                    const maxVal = Math.max(...dailyIncomeData.map((d) => d.total)) || 100;
                    const plotHeight = 170;
                    const barWidth = Math.max(10, Math.min(24, 500 / dailyIncomeData.length));
                    const gap = (600 - barWidth * dailyIncomeData.length) / (dailyIncomeData.length + 1);

                    return (
                      <>
                        {dailyIncomeData.map((data, idx) => {
                          const x = 50 + idx * (barWidth + gap);

                          const hServ = (data.servicios / maxVal) * plotHeight;
                          const hProd = (data.productos / maxVal) * plotHeight;
                          const hBono = (data.bonos / maxVal) * plotHeight;
                          const hSusc = (data.suscripciones / maxVal) * plotHeight;
                          const hPres = (data.presupuestos / maxVal) * plotHeight;

                          const yServ = 190 - hServ;
                          const yProd = yServ - hProd;
                          const yBono = yProd - hBono;
                          const ySusc = yBono - hSusc;
                          const yPres = ySusc - hPres;

                          return (
                            <g key={idx}>
                              {hServ > 0 && <rect x={x} y={yServ} width={barWidth} height={hServ} fill="#3b82f6" rx="2" />}
                              {hProd > 0 && <rect x={x} y={yProd} width={barWidth} height={hProd} fill="#ec4899" rx="2" />}
                              {hBono > 0 && <rect x={x} y={yBono} width={barWidth} height={hBono} fill="#8b5cf6" rx="2" />}
                              {hSusc > 0 && <rect x={x} y={ySusc} width={barWidth} height={hSusc} fill="#10b981" rx="2" />}
                              {hPres > 0 && <rect x={x} y={yPres} width={barWidth} height={hPres} fill="#f59e0b" rx="2" />}

                              {(dailyIncomeData.length < 15 || idx % 2 === 0) && (
                                <text x={x + barWidth / 2} y="210" className={styles.chartText} textAnchor="middle" style={{ fontSize: "9px" }}>
                                  {data.dayStr}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        <g transform="translate(40, 230)">
                          <circle cx="10" cy="-4" r="4" fill="#3b82f6" />
                          <text x="20" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartServices")}</text>
                          <circle cx="100" cy="-4" r="4" fill="#ec4899" />
                          <text x="110" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartProducts")}</text>
                          <circle cx="190" cy="-4" r="4" fill="#8b5cf6" />
                          <text x="200" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartVouchers")}</text>
                          <circle cx="270" cy="-4" r="4" fill="#10b981" />
                          <text x="280" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartSubscriptions")}</text>
                          <circle cx="370" cy="-4" r="4" fill="#f59e0b" />
                          <text x="380" y="0" className={styles.chartText} style={{ fontSize: "9px" }}>{t("chartBudgets")}</text>
                        </g>
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>

            {/* Bottom widgets list */}
            <div className={styles.citasBottomRow}>
              {/* Top 5 Services */}
              <div className={styles.card}>
                <h3 className={styles.chartCardTitle}>{t("top5Services")}</h3>
                <div className={styles.topServicesList}>
                  {topServices.map((srv, idx) => (
                    <div key={idx} className={styles.topServiceItem}>
                      <div className={styles.topServiceHeader}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{srv.name}</span>
                        <span style={{ color: "var(--text-secondary)" }}>{t("total")} {formatPrice(srv.value)}</span>
                      </div>
                      <div className={styles.topServiceBarBg}>
                        <div
                          className={styles.topServiceBarFill}
                          style={{
                            width: `${(srv.value / topServicesMax) * 100}%`,
                            background: srv.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {topServices.length === 0 && (
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("noServicesInRange")}</span>
                  )}
                </div>
              </div>

              {/* Payment methods pie & Past appts payments pie */}
              <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 className={styles.chartCardTitle} style={{ marginBottom: "6px" }}>{t("paymentMethods")}</h3>
                  <div className={styles.donutLayout}>
                    <div className={styles.donutSvgContainer} style={{ width: "90px", height: "90px" }}>
                      <svg viewBox="0 0 100 100" className={styles.donutSvg} style={{ width: "90px", height: "90px" }}>
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f3f4f6" strokeWidth="10" />
                        {(() => {
                          const rad = 35;
                          const circ = 2 * Math.PI * rad;
                          let acc = 0;
                          const colors = ["#008fa3", "#8b5cf6", "#ec4899", "#3b82f6"];

                          return paymentMethodsList.map((item, idx) => {
                            const percent = item.value / totalPaymentsSum;
                            const dashArray = `${circ * percent} ${circ}`;
                            const dashOffset = -circ * acc;
                            acc += percent;

                            return (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r={rad}
                                fill="transparent"
                                stroke={colors[idx % colors.length]}
                                strokeWidth="10"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                transform="rotate(-90 50 50)"
                              />
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div className={styles.donutLegend}>
                      {paymentMethodsList.map((item, idx) => {
                        const colors = ["#008fa3", "#8b5cf6", "#ec4899", "#3b82f6"];
                        return (
                          <div key={idx} className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: colors[idx % colors.length] }} />
                            <span className={styles.legendText}>{item.name === "Tarjeta" ? t("ageGroups") === "Age groups" ? "Card" : item.name : item.name}</span>
                            <span className={styles.legendVal}>{item.percent}%</span>
                          </div>
                        );
                      })}
                      {paymentMethodsList.length === 0 && (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t("noTransactions")}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px" }}>
                  <h3 className={styles.chartCardTitle} style={{ marginBottom: "6px" }}>{t("pastApptPayments")}</h3>
                  <div className={styles.donutLayout}>
                    <div className={styles.donutSvgContainer} style={{ width: "90px", height: "90px" }}>
                      <svg viewBox="0 0 100 100" className={styles.donutSvg} style={{ width: "90px", height: "90px" }}>
                        <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f3f4f6" strokeWidth="10" />
                        {(() => {
                          const rad = 35;
                          const circ = 2 * Math.PI * rad;
                          const pPercent = pastPaidCount / totalPastCount;
                          const uPercent = pastUnpaidCount / totalPastCount;

                          return (
                            <>
                              <circle
                                cx="50"
                                cy="50"
                                r={rad}
                                fill="transparent"
                                stroke="#10b981"
                                strokeWidth="10"
                                strokeDasharray={`${circ * pPercent} ${circ}`}
                                strokeDashoffset={0}
                                transform="rotate(-90 50 50)"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r={rad}
                                fill="transparent"
                                stroke="#ef4848"
                                strokeWidth="10"
                                strokeDasharray={`${circ * uPercent} ${circ}`}
                                strokeDashoffset={-circ * pPercent}
                                transform="rotate(-90 50 50)"
                              />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    <div className={styles.donutLegend}>
                      <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ background: "#10b981" }} />
                        <span className={styles.legendText}>{t("collected")}</span>
                        <span className={styles.legendVal}>{Math.round((pastPaidCount / totalPastCount) * 100)}%</span>
                      </div>
                      <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ background: "#ef4848" }} />
                        <span className={styles.legendText}>{t("pendingAppts")}</span>
                        <span className={styles.legendVal}>{Math.round((pastUnpaidCount / totalPastCount) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Mini cards listing totals */}
          <div className={styles.citasSidebar}>
            <div className={styles.miniCard}>
              <div className={`${styles.summaryIcon} ${styles.blue}`}>
                <Icons.FileText size={16} />
              </div>
              <div className={styles.miniCardVal}>
                <strong>{formatPrice(salesByCitas)}</strong>
                <span>{t("appointments")}</span>
              </div>
            </div>

            <div className={styles.miniCard}>
              <div className={`${styles.summaryIcon} ${styles.purple}`}>
                <Icons.FileText size={16} />
              </div>
              <div className={styles.miniCardVal}>
                <strong>{formatPrice(salesByBonos)}</strong>
                <span>{t("vouchers")}</span>
              </div>
            </div>

            <div className={styles.miniCard}>
              <div className={`${styles.summaryIcon} ${styles.green}`}>
                <Icons.FileText size={16} />
              </div>
              <div className={styles.miniCardVal}>
                <strong>{formatPrice(salesByProductos)}</strong>
                <span>{t("products")}</span>
              </div>
            </div>

            <div className={styles.miniCard}>
              <div className={`${styles.summaryIcon} ${styles.orange}`}>
                <Icons.FileText size={16} />
              </div>
              <div className={styles.miniCardVal}>
                <strong>{formatPrice(salesBySuscripciones)}</strong>
                <span>{t("subscriptions")}</span>
              </div>
            </div>

            <div className={styles.miniCard}>
              <div className={`${styles.summaryIcon} ${styles.red}`}>
                <Icons.FileText size={16} />
              </div>
              <div className={styles.miniCardVal}>
                <strong>{formatPrice(salesByPresupuestos)}</strong>
                <span>{t("budgets")}</span>
              </div>
            </div>

            <div className={styles.miniCard} style={{ border: "1px solid #008fa3", background: "rgba(0, 143, 163, 0.02)" }}>
              <div className={`${styles.summaryIcon} ${styles.blue}`} style={{ background: "#008fa3", color: "#ffffff" }}>
                <Icons.DollarCircle size={16} />
              </div>
              <div className={styles.miniCardVal}>
                <strong style={{ color: "#008fa3" }}>{formatPrice(salesTotalSum)}</strong>
                <span>{t("inTotal")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 4: CLIENTES --- */}
      {activeTab === "clientes" && (
        <div className={styles.clientesLayout}>
          {/* Left Column: Gender and Age charts */}
          <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Gender donut */}
            <div>
              <h3 className={styles.chartCardTitle}>{t("clientProfile")}</h3>
              <div className={styles.donutLayout}>
                <div className={styles.donutSvgContainer} style={{ width: "100px", height: "100px" }}>
                  <svg viewBox="0 0 100 100" className={styles.donutSvg} style={{ width: "100px", height: "100px" }}>
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                    {(() => {
                      const rad = 38;
                      const circ = 2 * Math.PI * rad;
                      let acc = 0;

                      return [
                        { name: t("statsMale"), count: clientGenderCounts.HOMBRE, color: "#3b82f6" },
                        { name: t("statsFemale"), count: clientGenderCounts.MUJER, color: "#ec4899" },
                        { name: t("unknown"), count: clientGenderCounts.DESCONOCIDO, color: "#8b5cf6" }
                      ].map((item, idx) => {
                        const percent = item.count / totalGenderCount;
                        if (percent === 0) return null;
                        const dashArray = `${circ * percent} ${circ}`;
                        const dashOffset = -circ * acc;
                        acc += percent;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={rad}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 50 50)"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className={styles.donutLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#3b82f6" }} />
                    <span className={styles.legendText}>{t("statsMale")}</span>
                    <span className={styles.legendVal}>{Math.round((clientGenderCounts.HOMBRE / totalGenderCount) * 100)}%</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#ec4899" }} />
                    <span className={styles.legendText}>{t("statsFemale")}</span>
                    <span className={styles.legendVal}>{Math.round((clientGenderCounts.MUJER / totalGenderCount) * 100)}%</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: "#8b5cf6" }} />
                    <span className={styles.legendText}>{t("unknown")}</span>
                    <span className={styles.legendVal}>{Math.round((clientGenderCounts.DESCONOCIDO / totalGenderCount) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Age groups bar chart */}
            <div>
              <h3 className={styles.chartCardTitle} style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px", marginTop: "12px" }}>{t("ageGroups")}</h3>
              <div className={styles.chartCanvas} style={{ height: "160px" }}>
                <svg viewBox="0 0 300 150" className={styles.svgChart}>
                  <line x1="30" y1="120" x2="280" y2="120" className={styles.axisLine} />
                  {(() => {
                    const brackets = Object.entries(clientAgesList);
                    const maxCount = Math.max(...brackets.map(b => b[1])) || 5;
                    const barWidth = 18;
                    const spacing = 16;

                    return brackets.map(([name, count], idx) => {
                      const x = 40 + idx * (barWidth + spacing);
                      const barHeight = (count / maxCount) * 90;
                      const y = 120 - barHeight;

                      return (
                        <g key={name}>
                          <rect x={x} y={y} width={barWidth} height={barHeight} fill="#008fa3" rx="2" />
                          <text x={x + barWidth / 2} y={y - 4} className={styles.chartText} textAnchor="middle" style={{ fontSize: "8px", fontWeight: "700" }}>
                            {count}
                          </text>
                          <text x={x + barWidth / 2} y="132" className={styles.chartText} textAnchor="middle" style={{ fontSize: "7px" }}>
                            {name}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>
          </div>

          {/* Right Column: Client details table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>{t("activeClientsList")} ({sortedClients.length})</h3>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => { setClientSortKey("name"); setClientSortOrder(clientSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("clientCol")} {clientSortKey === "name" && (clientSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setClientSortKey("revenue"); setClientSortOrder(clientSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("revenueCol")} {clientSortKey === "revenue" && (clientSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setClientSortKey("pending"); setClientSortOrder(clientSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("pendingPayments")} {clientSortKey === "pending" && (clientSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setClientSortKey("cancellations"); setClientSortOrder(clientSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("cancellationsCol")} {clientSortKey === "cancellations" && (clientSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setClientSortKey("absences"); setClientSortOrder(clientSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("absencesCol")} {clientSortKey === "absences" && (clientSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((client) => (
                    <tr key={client.id}>
                      <td style={{ fontWeight: 600 }}>{client.name}</td>
                      <td>{formatPrice(client.revenue)}</td>
                      <td style={client.pending > 0 ? { color: "#ef4848", fontWeight: 600 } : {}}>
                        {formatPrice(client.pending)}
                      </td>
                      <td>{client.cancellations}</td>
                      <td>{client.absences}</td>
                    </tr>
                  ))}
                  {sortedClients.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                        {t("noClientsInPeriod")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rendimiento" && (
        <div>
          <div className={styles.rendimientoLayout}>
            {/* Top Left: Rendimiento del equipo line chart */}
            <div className={styles.card}>
              <div className={styles.chartCardHeader}>
                <h3>{t("teamPerformance")}</h3>
                <select
                  className={styles.chartSelect}
                  value={performanceMetric}
                  onChange={(e) => setPerformanceMetric(e.target.value as any)}
                >
                  <option value="revenue">{t("byRevenue")}</option>
                  <option value="appointments">{t("byAppts")}</option>
                </select>
              </div>

              <div className={styles.chartCanvas}>
                {staffDailyIncome.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t("noData")}</span>
                ) : (
                  <svg viewBox="0 0 700 240" className={styles.svgChart}>
                    <line x1="40" y1="20" x2="660" y2="20" className={styles.gridLine} />
                    <line x1="40" y1="80" x2="660" y2="80" className={styles.gridLine} />
                    <line x1="40" y1="140" x2="660" y2="140" className={styles.gridLine} />
                    <line x1="40" y1="190" x2="660" y2="190" className={styles.axisLine} />

                    {(() => {
                      // Find max daily value for team lines
                      let absoluteMax = 5;
                      staffDailyIncome.forEach((row) => {
                        staffList.forEach((s) => {
                          const val = (row as any)[s.id] || 0;
                          if (val > absoluteMax) absoluteMax = val;
                        });
                      });

                      const plotHeight = 170;
                      const widthX = 600;
                      const stepX = widthX / (staffDailyIncome.length - 1 || 1);

                      return (
                        <>
                          {/* Draw lines for each staff member */}
                          {staffList.map((staff, staffIdx) => {
                            const points = staffDailyIncome.map((row, idx) => {
                              const x = 50 + idx * stepX;
                              const val = (row as any)[staff.id] || 0;
                              const y = 190 - (val / absoluteMax) * plotHeight;
                              return { x, y };
                            });

                            const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                            const color = staffColors[staffIdx % staffColors.length];

                            return (
                              <g key={staff.id}>
                                <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                                {points.map((p, idx) => (
                                  <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
                                ))}
                              </g>
                            );
                          })}

                          {/* X Axis labels */}
                          {staffDailyIncome.map((row, idx) => (
                            <g key={idx}>
                              {(staffDailyIncome.length < 15 || idx % 2 === 0) && (
                                <text x={50 + idx * stepX} y="210" className={styles.chartText} textAnchor="middle" style={{ fontSize: "9px" }}>
                                  {row.dayStr}
                                </text>
                              )}
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                )}
              </div>
            </div>

            {/* Top Right: Team share donut chart */}
            <div className={styles.card}>
              <h3 className={styles.chartCardTitle}>{t("distribution")}</h3>
              <div className={styles.donutLayout} style={{ flexDirection: "column", gap: "12px" }}>
                <div className={styles.donutSvgContainer} style={{ width: "100px", height: "100px" }}>
                  <svg viewBox="0 0 100 100" className={styles.donutSvg} style={{ width: "100px", height: "100px" }}>
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                    {(() => {
                      const rad = 38;
                      const circ = 2 * Math.PI * rad;
                      let acc = 0;

                      const metricSum = staffList.reduce((acc, curr) => {
                        const val = performanceMetric === "revenue" ? curr.revenue : curr.appointments;
                        return acc + val;
                      }, 0) || 1;

                      return staffList.map((staff, idx) => {
                        const val = performanceMetric === "revenue" ? staff.revenue : staff.appointments;
                        const percent = val / metricSum;
                        if (percent === 0) return null;
                        const dashArray = `${circ * percent} ${circ}`;
                        const dashOffset = -circ * acc;
                        acc += percent;

                        return (
                          <circle
                            key={staff.id}
                            cx="50"
                            cy="50"
                            r={rad}
                            fill="transparent"
                            stroke={staffColors[idx % staffColors.length]}
                            strokeWidth="12"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 50 50)"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className={styles.donutLegend} style={{ width: "100%" }}>
                  {staffList.map((staff, idx) => {
                    const metricSum = staffList.reduce((acc, curr) => {
                      const val = performanceMetric === "revenue" ? curr.revenue : curr.appointments;
                      return acc + val;
                    }, 0) || 1;
                    const val = performanceMetric === "revenue" ? staff.revenue : staff.appointments;
                    const percent = Math.round((val / metricSum) * 100);

                    return (
                      <div key={staff.id} className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ background: staffColors[idx % staffColors.length] }} />
                        <span className={styles.legendText}>{staff.name.split(" ")[0]}</span>
                        <span className={styles.legendVal}>{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom table of professionals */}
          <div className={styles.tableCard} style={{ marginTop: "20px" }}>
            <div className={styles.tableHeader}>
              <h3>{t("professionalsPerf")}</h3>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => { setStaffSortKey("name"); setStaffSortOrder(staffSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("professional")} {staffSortKey === "name" && (staffSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setStaffSortKey("revenue"); setStaffSortOrder(staffSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("revenueCol")} {staffSortKey === "revenue" && (staffSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setStaffSortKey("appointments"); setStaffSortOrder(staffSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("apptsSeen")} {staffSortKey === "appointments" && (staffSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th onClick={() => { setStaffSortKey("hourly"); setStaffSortOrder(staffSortOrder === "asc" ? "desc" : "asc"); }}>
                      {t("earningsPerHour")} {staffSortKey === "hourly" && (staffSortOrder === "asc" ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td style={{ fontWeight: 600 }}>{staff.name}</td>
                      <td>{formatPrice(staff.revenue)}</td>
                      <td>{staff.appointments}</td>
                      <td style={{ fontWeight: 600, color: "#008fa3" }}>
                        {formatPrice(staff.hourly)}{t("timezone") === "Time Zone" ? "/hour" : t("timezone") === "Ordu-eremua" ? "/ordu" : "/hora"}
                      </td>
                    </tr>
                  ))}
                  {sortedStaff.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                        {t("noActiveProfessionals")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
