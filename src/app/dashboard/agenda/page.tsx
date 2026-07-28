"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { translate } from "@/lib/translations";
import { hasPermission, canDeleteAppointment, canCreateOrEditAppointment } from "@/lib/permissions";
import styles from "./Agenda.module.css";
import { getCountryConfig } from "@/lib/countries";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { toast } from "@/components/ToastContainer";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  color: string;
  category?: string;
  allowedUserIds?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  clientNumber?: number;
  tags?: string;
  province?: string;
  landline?: string;
  dniNif?: string;
}

interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  shifts: Shift[];
  color?: string;
}

interface Shift {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Appointment {
  id: string;
  clientId: string;
  userId: string;
  serviceId: string;
  clinicId: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  tags?: string;
  client: Client;
  user: User;
  service: Service;
  clinic?: {
    id: string;
    name: string;
  };
}

const formatSpanishDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["dom.", "lun.", "mar.", "mié.", "jue.", "vie.", "sáb."];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${weekdays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};

const getDeterministicPalette = (name: string) => {
  const colorPalettes = [
    { bg: "rgba(14, 165, 233, 0.15)", text: "#0284c7" },
    { bg: "rgba(16, 185, 129, 0.15)", text: "#059669" },
    { bg: "rgba(139, 92, 246, 0.15)", text: "#7c3aed" },
    { bg: "rgba(245, 158, 11, 0.15)", text: "#d97706" },
    { bg: "rgba(236, 72, 153, 0.15)", text: "#db2777" },
    { bg: "rgba(6, 182, 212, 0.15)", text: "#0891b2" },
    { bg: "rgba(249, 115, 22, 0.15)", text: "#ea580c" }
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalettes.length;
  return colorPalettes[index];
};


const formatTime12h = (time24: string) => {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};

const formatDuration = (min: number) => {
  if (min === 60) return "1h";
  if (min === 120) return "2h";
  if (min % 60 === 0) return `${min / 60}h`;
  return `${min} min`;
};

const COUNTRIES = [
  { flag: "🇪🇸", code: "ES", name: "España", dial: "+34" },
  { flag: "🇲🇽", code: "MX", name: "México", dial: "+52" },
  { flag: "🇦🇷", code: "AR", name: "Argentina", dial: "+54" },
  { flag: "🇨🇴", code: "CO", name: "Colombia", dial: "+57" },
  { flag: "🇨🇱", code: "CL", name: "Chile", dial: "+56" },
  { flag: "🇵🇪", code: "PE", name: "Perú", dial: "+51" },
  { flag: "🇻🇪", code: "VE", name: "Venezuela", dial: "+58" },
  { flag: "🇪🇨", code: "EC", name: "Ecuador", dial: "+593" },
  { flag: "🇧🇴", code: "BO", name: "Bolivia", dial: "+591" },
  { flag: "🇺🇾", code: "UY", name: "Uruguay", dial: "+598" },
  { flag: "🇵🇾", code: "PY", name: "Paraguay", dial: "+595" },
  { flag: "🇵🇹", code: "PT", name: "Portugal", dial: "+351" },
  { flag: "🇫🇷", code: "FR", name: "Francia", dial: "+33" },
  { flag: "🇩🇪", code: "DE", name: "Alemania", dial: "+49" },
  { flag: "🇮🇹", code: "IT", name: "Italia", dial: "+39" },
  { flag: "🇬🇧", code: "GB", name: "Reino Unido", dial: "+44" },
  { flag: "🇺🇸", code: "US", name: "Estados Unidos", dial: "+1" },
  { flag: "🇨🇦", code: "CA", name: "Canadá", dial: "+1" },
  { flag: "🇧🇷", code: "BR", name: "Brasil", dial: "+55" },
  { flag: "🇳🇱", code: "NL", name: "Países Bajos", dial: "+31" },
  { flag: "🇧🇪", code: "BE", name: "Bélgica", dial: "+32" },
  { flag: "🇨🇭", code: "CH", name: "Suiza", dial: "+41" },
  { flag: "🇦🇹", code: "AT", name: "Austria", dial: "+43" },
  { flag: "🇵🇱", code: "PL", name: "Polonia", dial: "+48" },
  { flag: "🇷🇴", code: "RO", name: "Rumanía", dial: "+40" },
  { flag: "🇲🇦", code: "MA", name: "Marruecos", dial: "+212" },
  { flag: "🇩🇿", code: "DZ", name: "Argelia", dial: "+213" },
  { flag: "🇨🇳", code: "CN", name: "China", dial: "+86" },
  { flag: "🇯🇵", code: "JP", name: "Japón", dial: "+81" },
  { flag: "🇰🇷", code: "KR", name: "Corea del Sur", dial: "+82" },
  { flag: "🇮🇳", code: "IN", name: "India", dial: "+91" },
  { flag: "🇷🇺", code: "RU", name: "Rusia", dial: "+7" },
  { flag: "🇹🇷", code: "TR", name: "Turquía", dial: "+90" },
  { flag: "🇸🇦", code: "SA", name: "Arabia Saudita", dial: "+966" },
  { flag: "🇦🇺", code: "AU", name: "Australia", dial: "+61" },
];

interface AppointmentLayout {
  left: string;
  width: string;
}

function getAppointmentLayouts(apps: Appointment[]): Record<string, AppointmentLayout> {
  const layouts: Record<string, AppointmentLayout> = {};
  if (apps.length === 0) return layouts;

  // 1. Sort appointments by start time, then end time (longer duration first)
  const sorted = [...apps].sort((a, b) => {
    const startA = new Date(a.start).getTime();
    const startB = new Date(b.start).getTime();
    if (startA !== startB) return startA - startB;
    const endA = new Date(a.end).getTime();
    const endB = new Date(b.end).getTime();
    return endB - endA;
  });

  // 2. Group into overlapping clusters
  const clusters: typeof sorted[] = [];
  let currentCluster: typeof sorted = [];
  let clusterMaxEnd = 0;

  for (const app of sorted) {
    const appStart = new Date(app.start).getTime();
    const appEnd = new Date(app.end).getTime();

    if (currentCluster.length === 0) {
      currentCluster.push(app);
      clusterMaxEnd = appEnd;
    } else if (appStart < clusterMaxEnd) {
      currentCluster.push(app);
      clusterMaxEnd = Math.max(clusterMaxEnd, appEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [app];
      clusterMaxEnd = appEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. For each cluster, assign columns
  for (const cluster of clusters) {
    const columns: typeof sorted[] = [];

    for (const app of cluster) {
      const appStart = new Date(app.start).getTime();
      let placed = false;

      for (let i = 0; i < columns.length; i++) {
        const lastAppInCol = columns[i][columns[i].length - 1];
        const colLastEnd = new Date(lastAppInCol.end).getTime();
        
        if (appStart >= colLastEnd) {
          columns[i].push(app);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([app]);
      }
    }

    // 4. Calculate left and width for each appointment in the cluster
    const totalColumns = columns.length;
    for (let colIndex = 0; colIndex < totalColumns; colIndex++) {
      for (const app of columns[colIndex]) {
        const leftPercent = (colIndex * 100) / totalColumns;
        const widthPercent = 100 / totalColumns;
        layouts[app.id] = {
          left: `calc(${leftPercent}% + 6px)`,
          width: `calc(${widthPercent}% - 12px)`,
        };
      }
    }
  }

  return layouts;
}

export default function AgendaPage() {
  const { activeClinic, user: currentUser, language } = useApp();
  const cConfig = getCountryConfig(activeClinic?.country || "ES");
  const currencySymbol = cConfig.currency;
  const showPrices = currentUser?.role === "ADMIN" || hasPermission(currentUser, "otros", "Mostrar precio servicios");

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkTouch = () => {
        setIsTouchDevice(
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.innerWidth < 768
        );
      };
      checkTouch();
      window.addEventListener("resize", checkTouch);
      return () => window.removeEventListener("resize", checkTouch);
    }
  }, []);

  const isSlotOutsideShift = (staff: User, date: Date, hour: number, minutes: number): boolean => {
    const dayOfWeek = date.getDay();
    const dayShifts = staff.shifts?.filter(s => s.dayOfWeek === dayOfWeek) || [];
    
    if (dayShifts.length === 0) {
      return true; // No shifts = outside schedule (day off)
    }

    const slotStartMins = hour * 60 + minutes;

    // A slot is inside if it falls within AT LEAST ONE shift
    const isInside = dayShifts.some(shift => {
      const [startH, startM] = shift.startTime.split(":").map(Number);
      const [endH, endM] = shift.endTime.split(":").map(Number);
      const shiftStartMins = startH * 60 + startM;
      const shiftEndMins = endH * 60 + endM;
      return slotStartMins >= shiftStartMins && slotStartMins < shiftEndMins;
    });

    return !isInside;
  };

  const checkIfOutsideShift = (userId: string, dateStr: string, timeStr: string, duration: number): boolean => {
    const staff = staffList.find(s => s.id === userId);
    if (!staff) return false;

    // Use midday to avoid timezone shift when checking date
    const dateObj = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = dateObj.getDay();
    const dayShifts = staff.shifts?.filter(s => s.dayOfWeek === dayOfWeek) || [];

    if (dayShifts.length === 0) {
      return true; // No shifts = outside schedule (day off)
    }

    // Parse appointment start and end times
    const [appH, appM] = timeStr.split(":").map(Number);
    const appStartMins = appH * 60 + appM;
    const appEndMins = appStartMins + duration;

    // The appointment is inside if it fits completely within AT LEAST ONE shift
    const isInside = dayShifts.some(shift => {
      const [startH, startM] = shift.startTime.split(":").map(Number);
      const [endH, endM] = shift.endTime.split(":").map(Number);
      const shiftStartMins = startH * 60 + startM;
      const shiftEndMins = endH * 60 + endM;
      return appStartMins >= shiftStartMins && appEndMins <= shiftEndMins;
    });

    return !isInside;
  };

  const handlePrintAgenda = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.warning("Por favor, permite las ventanas emergentes para poder imprimir la agenda.");
      return;
    }

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const filteredStaff = staffList.filter((s) => printCheckedStaffIds.includes(s.id));

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Agenda de Citas</title>
        <meta charset="utf-8" />
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: sans-serif; font-size: 11px; color: #000; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
          }
          body { font-family: sans-serif; font-size: 11px; padding: 20px; color: #333; }
          .header-container { display: flex; justify-content: flex-end; margin-bottom: 20px; text-align: right; line-height: 1.4; }
          .employee-section { margin-bottom: 30px; }
          .employee-header { background: #f3f4f6; padding: 8px 12px; font-size: 14px; font-weight: bold; margin-bottom: 10px; border-radius: 4px; border-left: 4px solid #4f46e5; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .print-table th { border-bottom: 2px solid #ddd; padding: 8px 6px; text-align: left; font-size: 10px; font-weight: bold; color: #555; text-transform: uppercase; }
          .print-table td { border-bottom: 1px solid #eee; padding: 8px 6px; font-size: 11px; vertical-align: top; }
          .btn-container { text-align: right; margin-bottom: 20px; }
          .print-btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold; }
          .tag-pill { display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: bold; border-radius: 4px; background: #e5e7eb; color: #374151; margin-right: 4px; }
        </style>
      </head>
      <body>
        <div class="btn-container no-print">
          <button class="print-btn" onclick="window.print()">Imprimir PDF</button>
        </div>
        
        <div class="header-container">
          <div>
            <strong>${activeClinic?.name?.toUpperCase() || 'MEDESMED INTERNATIONAL SL'}</strong><br />
            ${activeClinic?.address || 'AV. PAIS VALENCIA Nº5'}<br />
            VILLAJOYOSA
          </div>
        </div>
    `;

    filteredStaff.forEach((staff, staffIdx) => {
      // Get appointments for this staff
      let staffApps = appointments.filter((app) => app.userId === staff.id);

      // Filter by printCitasAnteriores (only if view is week or month)
      if (!printCitasAnteriores && (view === "week" || view === "month")) {
        staffApps = staffApps.filter((app) => {
          const appDate = new Date(app.start);
          return appDate.getTime() >= todayMidnight.getTime();
        });
      }

      // Sort chronologically
      staffApps.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      if (staffApps.length === 0) {
        return; // skip if no appointments
      }

      const isFirst = staffIdx === 0;

      htmlContent += `
        <div class="employee-section ${!isFirst ? 'page-break' : ''}">
          <div class="employee-header">Empleado: ${(staff.name + " " + (staff.lastName || "")).toUpperCase()}</div>
          
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 15%">Cliente</th>
                <th style="width: 10%">Fecha</th>
                <th style="width: 8%">Hora Inicio</th>
                <th style="width: 8%">Hora Fin</th>
                <th style="width: 15%">Servicio</th>
                <th style="width: 10%">Etiquetas Cliente</th>
                <th style="width: 10%">DNI/NIF</th>
                <th style="width: 10%">Teléfono</th>
                <th style="width: 10%">Etiquetas Cita</th>
                <th style="width: 14%">Notas</th>
              </tr>
            </thead>
            <tbody>
      `;

      staffApps.forEach((app) => {
        const startD = new Date(app.start);
        const endD = new Date(app.end);

        // Format Date: e.g. 03 jul 2026
        const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const dayStr = String(startD.getDate()).padStart(2, "0");
        const monthStr = months[startD.getMonth()];
        const yearStr = startD.getFullYear();
        const formattedDate = `${dayStr} ${monthStr} ${yearStr}`;

        // Format times
        const startH = String(startD.getHours()).padStart(2, "0") + ":" + String(startD.getMinutes()).padStart(2, "0");
        const endH = String(endD.getHours()).padStart(2, "0") + ":" + String(endD.getMinutes()).padStart(2, "0");

        // Prepend status if pending
        let clientLabel = `${app.client.firstName} ${app.client.lastName || ""}`;
        if (app.status === "PENDING") {
          clientLabel = `(sin confirmar) ${clientLabel}`;
        }

        // Format tags
        const clientTagsHtml = app.client.tags
          ? app.client.tags.split(",").filter(Boolean).map((t: string) => `<span class="tag-pill">${t}</span>`).join("")
          : "";

        const appTagsHtml = app.tags
          ? app.tags.split(",").filter(Boolean).map((t: string) => {
              const name = t.split(":")[0];
              return `<span class="tag-pill">${name}</span>`;
            }).join("")
          : "";

        htmlContent += `
          <tr>
            <td style="font-weight: bold;">${clientLabel}</td>
            <td>${formattedDate}</td>
            <td>${startH}</td>
            <td>${endH}</td>
            <td>${app.service.name}</td>
            <td>${clientTagsHtml}</td>
            <td>${app.client.dniNif || ""}</td>
            <td>${app.client.phone || ""}</td>
            <td>${appTagsHtml}</td>
            <td style="font-size: 10px; white-space: pre-wrap;">${app.notes || ""}</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    });

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  
  // State
  const [draggedApp, setDraggedApp] = useState<Appointment | null>(null);
  const [draggedOverSlot, setDraggedOverSlot] = useState<{ userId: string; hour: number; minute: number; dateStr: string } | null>(null);
  const [savingAppIds, setSavingAppIds] = useState<string[]>([]);
  const [view, setView] = useState<"day" | "week" | "month">(() => {
    if (typeof window !== "undefined") {
      const savedView = window.localStorage.getItem("agenda_view");
      if (savedView === "day" || savedView === "week" || savedView === "month") {
        return savedView;
      }
    }
    return "day";
  });
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [zoomLevel, setZoomLevel] = useState<"poco" | "normal" | "grande">(() => {
    if (typeof window !== "undefined") {
      const savedZoom = window.localStorage.getItem("agenda_zoom");
      if (savedZoom === "poco" || savedZoom === "normal" || savedZoom === "grande") {
        return savedZoom;
      }
    }
    return "normal";
  });

  const zoomScale = useMemo(() => {
    if (zoomLevel === "poco") return 0.75;
    if (zoomLevel === "grande") return 1.333;
    return 1.0;
  }, [zoomLevel]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("agenda_zoom", zoomLevel);
    }
  }, [zoomLevel]);

  // Force day view on mobile viewport
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && view !== "day") {
        setView("day");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [view]);

  // Submenu Zoom state
  const [tempZoomLevel, setTempZoomLevel] = useState<"poco" | "normal" | "grande">("normal");

  // Vista Settings State
  const [quitarNombreSemanal, setQuitarNombreSemanal] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("agenda_quitar_nombre") === "true";
    }
    return false;
  });
  const [mostrar24Horas, setMostrar24Horas] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("agenda_mostrar_24h") === "true";
    }
    return false;
  });

  // Real-time updates for moving indicator (moved here to avoid TDZ for zoomScale and mostrar24Horas)
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); // update every second for smooth sub-pixel movements
    return () => clearInterval(interval);
  }, []);

  const indicatorData = useMemo(() => {
    if (!now) return { totalMinutesFromStart: 0, topOffset: 0, timeStr: "" };
    const startHour = mostrar24Horas ? 0 : 8;
    const totalMinutesFromStart = (now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) - (startHour * 60);
    const topOffset = totalMinutesFromStart * zoomScale;
    const timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    return {
      totalMinutesFromStart,
      topOffset,
      timeStr
    };
  }, [now, mostrar24Horas, zoomScale]);

  const isTimeIndicatorVisible = (dateObj: Date, hoursLength: number) => {
    if (!now) return false;
    const isToday = dateObj.toDateString() === now.toDateString();
    if (!isToday) return false;
    return indicatorData.totalMinutesFromStart >= 0 && indicatorData.totalMinutesFromStart < hoursLength * 60;
  };

  const [tempQuitarNombreSemanal, setTempQuitarNombreSemanal] = useState<boolean>(false);
  const [tempMostrar24Horas, setTempMostrar24Horas] = useState<boolean>(false);

  // Printing Agenda Settings
  const [printCheckedStaffIds, setPrintCheckedStaffIds] = useState<string[]>([]);
  const [printCitasAnteriores, setPrintCitasAnteriores] = useState<boolean>(true);

  // Service Warning Modal Settings
  const [showServiceWarningModal, setShowServiceWarningModal] = useState(false);
  const [searchServiceQuery, setSearchServiceQuery] = useState("");
  const [showServiceEditDropdown, setShowServiceEditDropdown] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const formatPrice = (price: number) => {
    return showPrices ? (currencySymbol === "€" ? `${price.toFixed(2).replace(".", ",")} €` : `${currencySymbol}${price.toFixed(2)}`) : "";
  };
  const [warningModalConfirmCallback, setWarningModalConfirmCallback] = useState<(() => void) | null>(null);

  // Global Tags Panel Settings
  const [globalTagsSubView, setGlobalTagsSubView] = useState<"list" | "create">("list");
  const [searchGlobalTagQuery, setSearchGlobalTagQuery] = useState("");
  const [newGlobalTagName, setNewGlobalTagName] = useState("");
  const [newGlobalTagColor, setNewGlobalTagColor] = useState("#add8e6");

  // Creation Tags Selector Dropdown Settings
  const [showCreateTagsDropdown, setShowCreateTagsDropdown] = useState(false);
  const [createTagsSubView, setCreateTagsSubView] = useState<"list" | "create">("list");
  const [searchCreateTagQuery, setSearchCreateTagQuery] = useState("");
  const [newCreateTagName, setNewCreateTagName] = useState("");
  const [newCreateTagColor, setNewCreateTagColor] = useState("#add8e6");
  const createTagsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("agenda_quitar_nombre", String(quitarNombreSemanal));
    }
  }, [quitarNombreSemanal]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("agenda_mostrar_24h", String(mostrar24Horas));
    }
  }, [mostrar24Horas]);

  // Convert TimeBlock to Appointment states
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertClientId, setConvertClientId] = useState("");
  const [convertServiceId, setConvertServiceId] = useState("");
  const [convertLocationId, setConvertLocationId] = useState("");

  // Filters Sidebar states
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [filtersSubView, setFiltersSubView] = useState<"menu" | "direcciones" | "servicios" | "clientes">("menu");
  const [tempFilterClinicId, setTempFilterClinicId] = useState("all");
  const [tempFilterServiceId, setTempFilterServiceId] = useState("all");
  const [tempFilterClientId, setTempFilterClientId] = useState("all");
  const [filterClinicId, setFilterClinicId] = useState("all");
  const [filterClientId, setFilterClientId] = useState("all");

  // Waitlist states
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [showWaitlistSidebar, setShowWaitlistSidebar] = useState(false);
  const [waitlistSubView, setWaitlistSubView] = useState<"list" | "add">("list");
  const [waitlistClientId, setWaitlistClientId] = useState("");
  const [waitlistUserId, setWaitlistUserId] = useState("all");
  const [waitlistServiceId, setWaitlistServiceId] = useState("all");
  const [waitlistNotes, setWaitlistNotes] = useState("");
  const [waitlistPreferredDay, setWaitlistPreferredDay] = useState("all");
  const [waitlistPreferredTime, setWaitlistPreferredTime] = useState("all");
  const [activeWaitlistEntryForAppointment, setActiveWaitlistEntryForAppointment] = useState<any | null>(null);

  const fetchWaitlist = useCallback(async () => {
    if (!activeClinic) return;
    try {
      const res = await fetch(`/api/waitlist?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setWaitlist(data);
      }
    } catch (err) {
      console.error("Error fetching waitlist:", err);
    }
  }, [activeClinic]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [checkedStaffIds, setCheckedStaffIds] = useState<string[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  
  // Dropdown filtering staff states
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [pinDropdown, setPinDropdown] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);
  const latestFetchIdRef = useRef(0);

  // Date Picker Dropdown states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Click outside staff dropdown menu handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pinDropdown) return;
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pinDropdown]);



  // Save checked staff list to localStorage when changed
  useEffect(() => {
    if (activeClinic?.id && staffList.length > 0 && typeof window !== "undefined") {
      window.localStorage.setItem(
        `agenda_checked_staff_ids_${activeClinic.id}`,
        JSON.stringify(checkedStaffIds)
      );
    }
  }, [checkedStaffIds, activeClinic?.id, staffList]);

  // Click outside date picker handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (createCalRef.current && !createCalRef.current.contains(event.target as Node)) {
        setShowCreateCal(false);
      }
      if (createStartTimeRef.current && !createStartTimeRef.current.contains(event.target as Node)) {
        setShowCreateStartTimeDropdown(false);
      }
      if (createEndTimeRef.current && !createEndTimeRef.current.contains(event.target as Node)) {
        setShowCreateEndTimeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync date picker states with currentDate
  useEffect(() => {
    setPickerMonth(currentDate.getMonth());
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  // Filters
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formClinicId, setFormClinicId] = useState("");
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [showFormStatusDropdown, setShowFormStatusDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [appointmentTags, setAppointmentTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [formPatProvince, setFormPatProvince] = useState("");
  const [formPatLandline, setFormPatLandline] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; userId: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Time Block Modals & Form State
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showBlockDetailModal, setShowBlockDetailModal] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<any | null>(null);
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockNotes, setBlockNotes] = useState("");
  const [selectedBlockDates, setSelectedBlockDates] = useState<string[]>([]);
  const [showFrequencyPopover, setShowFrequencyPopover] = useState(false);
  const [popoverMonth, setPopoverMonth] = useState<number>(new Date().getMonth());
  const [popoverYear, setPopoverYear] = useState<number>(new Date().getFullYear());
  
  // Form fields
  const [formClientId, setFormClientId] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [formEndTime, setFormEndTime] = useState("");
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Refs and States for inline edit modal fields
  const startTimeRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);
  const editCalRef = useRef<HTMLDivElement>(null);
  const serviceEditDropdownRef = useRef<HTMLDivElement>(null);
  const startTimeDropdownContainerRef = useRef<HTMLDivElement>(null);
  const endTimeDropdownContainerRef = useRef<HTMLDivElement>(null);

  const [showStartTimeDropdown, setShowStartTimeDropdown] = useState(false);
  const [showEndTimeDropdown, setShowEndTimeDropdown] = useState(false);
  const [showEditCal, setShowEditCal] = useState(false);
  const [editCalMonth, setEditCalMonth] = useState(new Date().getMonth());
  const [editCalYear, setEditCalYear] = useState(new Date().getFullYear());

  // Refs and States for Create modal header fields (Date & Time)
  const createCalRef = useRef<HTMLDivElement>(null);
  const createStartTimeRef = useRef<HTMLDivElement>(null);
  const createEndTimeRef = useRef<HTMLDivElement>(null);
  const createStartTimeDropdownContainerRef = useRef<HTMLDivElement>(null);
  const createEndTimeDropdownContainerRef = useRef<HTMLDivElement>(null);
  const [showCreateCal, setShowCreateCal] = useState(false);
  const [showCreateStartTimeDropdown, setShowCreateStartTimeDropdown] = useState(false);
  const [showCreateEndTimeDropdown, setShowCreateEndTimeDropdown] = useState(false);

  // Auto-scroll time dropdowns to selected item (with checkmark)
  useEffect(() => {
    if (showCreateStartTimeDropdown && createStartTimeDropdownContainerRef.current) {
      const selectedEl = createStartTimeDropdownContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [showCreateStartTimeDropdown]);

  useEffect(() => {
    if (showCreateEndTimeDropdown && createEndTimeDropdownContainerRef.current) {
      const selectedEl = createEndTimeDropdownContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [showCreateEndTimeDropdown]);

  useEffect(() => {
    if (showStartTimeDropdown && startTimeDropdownContainerRef.current) {
      const selectedEl = startTimeDropdownContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [showStartTimeDropdown]);

  useEffect(() => {
    if (showEndTimeDropdown && endTimeDropdownContainerRef.current) {
      const selectedEl = endTimeDropdownContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [showEndTimeDropdown]);

  // States and refs for label/tag manager
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [tagsSubView, setTagsSubView] = useState<"list" | "create">("list");
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [newInfoTagName, setNewInfoTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#add8e6");
  const [availableTags, setAvailableTags] = useState<{ name: string; color: string }[]>([]);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  const TAG_COLORS = [
    "#add8e6", // Light Blue
    "#4299e1", // Blue
    "#008298", // Teal/Primary
    "#9f7aea", // Purple
    "#ed8936", // Orange
    "#fbd38d", // Light Orange
    "#9ae6b4", // Green
    "#feb2b2", // Red/Pink
    "#d6bcfa", // Light Purple
    "#faf089", // Yellow
    "#a0aec0", // Greyish Blue
  ];

  const handleAddTagToAppointment = async (tag: { name: string; color: string }) => {
    if (!selectedAppointment) return;
    const currentTags = selectedAppointment.tags 
      ? selectedAppointment.tags.split(",").filter(Boolean)
      : [];
    const tagString = `${tag.name}:${tag.color}`;
    if (currentTags.some(t => t.split(":")[0] === tag.name)) return;

    const newTags = [...currentTags, tagString].join(",");
    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAppointment.id,
          userId: selectedAppointment.userId,
          serviceId: selectedAppointment.serviceId,
          start: selectedAppointment.start,
          end: selectedAppointment.end,
          status: selectedAppointment.status,
          notes: selectedAppointment.notes || "",
          tags: newTags,
          actorName: currentUser ? currentUser.name : "Sistema",
          actorId: currentUser?.id,
        })
      });

      if (res.ok) {
        setSelectedAppointment(prev => prev ? { ...prev, tags: newTags } : null);
        fetchAppointments();
      }
    } catch (e) {
      console.error("Error adding tag:", e);
    }
  };

  const handleRemoveTagFromAppointment = async (tagName: string) => {
    if (!selectedAppointment) return;
    const currentTags = selectedAppointment.tags 
      ? selectedAppointment.tags.split(",").filter(Boolean)
      : [];
    const newTags = currentTags
      .filter(t => t.split(":")[0] !== tagName)
      .join(",");

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAppointment.id,
          userId: selectedAppointment.userId,
          serviceId: selectedAppointment.serviceId,
          start: selectedAppointment.start,
          end: selectedAppointment.end,
          status: selectedAppointment.status,
          notes: selectedAppointment.notes || "",
          tags: newTags,
          actorName: currentUser ? currentUser.name : "Sistema",
          actorId: currentUser?.id,
        })
      });

      if (res.ok) {
        setSelectedAppointment(prev => prev ? { ...prev, tags: newTags } : null);
        fetchAppointments();
      }
    } catch (e) {
      console.error("Error removing tag:", e);
    }
  };

  const handleCreateNewTagGlobal = (name: string, color: string) => {
    if (!name.trim()) return;
    const tagName = name.trim().toUpperCase();
    if (availableTags.some(t => t.name === tagName)) {
      toast.success("Esta etiqueta ya existe.");
      return;
    }
    const updated = [...availableTags, { name: tagName, color }];
    setAvailableTags(updated);
    localStorage.setItem("clifav_available_tags", JSON.stringify(updated));
    setNewInfoTagName("");
    setNewTagColor("#add8e6");
    setTagsSubView("list");
  };

  const handleDeleteTagGlobal = (tagName: string) => {
    const updated = availableTags.filter(t => t.name !== tagName);
    setAvailableTags(updated);
    localStorage.setItem("clifav_available_tags", JSON.stringify(updated));
  };

  // Notification reminders for WhatsApp button in drawer
  const [clinicReminders, setClinicReminders] = useState<any[]>([]);

  // Filter services dynamically based on selected professional
  const filteredServicesForDropdown = useMemo(() => {
    if (!formUserId) return servicesList;
    return servicesList.filter((s) => {
      if (!s.allowedUserIds) return true; // empty allows all
      return s.allowedUserIds.split(",").includes(formUserId);
    });
  }, [servicesList, formUserId]);

  // Filter staff dynamically based on selected service
  const filteredStaffForDropdown = useMemo(() => {
    if (!formServiceId) return staffList;
    const selectedService = servicesList.find((s) => s.id === formServiceId);
    if (!selectedService || !selectedService.allowedUserIds) return staffList;
    const allowed = selectedService.allowedUserIds.split(",");
    return staffList.filter((s) => allowed.includes(s.id));
  }, [staffList, servicesList, formServiceId]);

  // Autocomplete patient search & new patient fields
  const [patientSearch, setPatientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientTab, setNewPatientTab] = useState<"general" | "others">("general");

  // New patient form fields
  const [formPatFirstName, setFormPatFirstName] = useState("");
  const [formPatLastName, setFormPatLastName] = useState("");
  const [formPatBirthDate, setFormPatBirthDate] = useState("");
  const [formPatDniNif, setFormPatDniNif] = useState("");
  const [formPatPhone, setFormPatPhone] = useState("");
  const [formPatEmail, setFormPatEmail] = useState("");
  const [formPatAddress, setFormPatAddress] = useState("");
  const [formPatMunicipality, setFormPatMunicipality] = useState("");
  const [formPatPostalCode, setFormPatPostalCode] = useState("");
  const [formPatCountry, setFormPatCountry] = useState("España");
  
  // Country picker states
  const [dniCountry, setDniCountry] = useState({ flag: "🇪🇸", code: "ES", name: "España", dial: "+34" });
  const [phoneCountry, setPhoneCountry] = useState({ flag: "🇪🇸", code: "ES", name: "España", dial: "+34" });
  const [countryPickerSelected, setCountryPickerSelected] = useState({ flag: "🇪🇸", code: "ES", name: "España", dial: "+34" });
  const [showDniCountryPicker, setShowDniCountryPicker] = useState(false);
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dniPickerRef = useRef<HTMLDivElement>(null);
  const phonePickerRef = useRef<HTMLDivElement>(null);
  const countryPickerRef = useRef<HTMLDivElement>(null);
  

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );
  
  const [formPatIsSelfEmployed, setFormPatIsSelfEmployed] = useState(false);

  const [formPatIsCompany, setFormPatIsCompany] = useState(false);
  const [formPatReceivesReminders, setFormPatReceivesReminders] = useState(true);

  const [formPatOccupation, setFormPatOccupation] = useState("");
  const [formPatGender, setFormPatGender] = useState("Femenino");
  const [formPatMaritalStatus, setFormPatMaritalStatus] = useState("Soltero/a");
  const [formPatIban, setFormPatIban] = useState("");
  const [formPatBic, setFormPatBic] = useState("");

  // Edit/View modal custom states
  const [editModalTab, setEditModalTab] = useState<"datos" | "bonos" | "citas" | "seguimientos" | "historial" | "fotos">("datos");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isEditingApp, setIsEditingApp] = useState(false);
  const [editPatReceivesReminders, setEditPatReceivesReminders] = useState(true);
  const [citasSubTab, setCitasSubTab] = useState<"pasadas" | "futuras">("pasadas");

  // Photo states for selected appointment
  const agendaPhotoInputRef = useRef<HTMLInputElement>(null);
  const [appointmentPhotos, setAppointmentPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [isAgendaCameraOpen, setIsAgendaCameraOpen] = useState(false);
  const [agendaPhotoType, setAgendaPhotoType] = useState<"BEFORE" | "AFTER">("BEFORE");
  const [agendaPhotoAngle, setAgendaPhotoAngle] = useState("Frente");
  const [agendaCustomAngle, setAgendaCustomAngle] = useState("");
  const [uploadingAgendaPhoto, setUploadingAgendaPhoto] = useState(false);

  // Vouchers displayed in appointment info panel (tab "bonos")
  const [appointmentClientVouchers, setAppointmentClientVouchers] = useState<any[]>([]);
  const [loadingAppointmentVouchers, setLoadingAppointmentVouchers] = useState(false);

  // Historial / Audit logs
  const [appointmentLogs, setAppointmentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [agendaSales, setAgendaSales] = useState<any[]>([]);

  // Voucher consumption states and hooks
  const [selectedClientVouchers, setSelectedClientVouchers] = useState<any[]>([]);
  const [useVoucherSession, setUseVoucherSession] = useState(false);

  useEffect(() => {
    if (!formClientId) {
      setSelectedClientVouchers([]);
      return;
    }
    fetch(`/api/clients/${formClientId}/vouchers`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSelectedClientVouchers(data);
        } else {
          setSelectedClientVouchers([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching client vouchers:", err);
        setSelectedClientVouchers([]);
      });
  }, [formClientId]);

  const matchingVoucher = useMemo(() => {
    if (!formServiceId || !selectedClientVouchers.length) return null;
    return selectedClientVouchers.find((cv) => {
      const isExpired = cv.expirationDate ? new Date(cv.expirationDate) < new Date() : false;
      const hasSessions = cv.remainingSessions > 0;
      const associatedServices = cv.serviceIds ? cv.serviceIds.split(",") : [];
      const matchesService = associatedServices.includes(formServiceId);
      return !isExpired && hasSessions && matchesService;
    });
  }, [formServiceId, selectedClientVouchers]);

  useEffect(() => {
    if (matchingVoucher) {
      setUseVoucherSession(true);
    } else {
      setUseVoucherSession(false);
    }
  }, [matchingVoucher]);

  // Follow-up (Seguimientos) form states
  const [segObservaciones, setSegObservaciones] = useState("");
  const [segDiagnostico, setSegDiagnostico] = useState("");
  const [segOperacion, setSegOperacion] = useState("");
  const [segTratamiento, setSegTratamiento] = useState("");
  const [segMedicacion, setSegMedicacion] = useState("");
  const [segMaterialLotes, setSegMaterialLotes] = useState("");

  // Settings & options sidebar states
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showOpcionesSidebar, setShowOpcionesSidebar] = useState(false);
  const [sidebarSubView, setSidebarSubView] = useState<"menu" | "weekends" | "zoom" | "vista" | "imprimir" | "etiquetas">("menu");
  // Read from localStorage synchronously so the initial render already knows the saved preference
  const [hideWeekends, setHideWeekends] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hideWeekends") === "true";
    }
    return false;
  });
  const [tempHideWeekends, setTempHideWeekends] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const moreOptionsRef = useRef<HTMLDivElement>(null);
  const blockDateInputRef = useRef<HTMLInputElement>(null);
  const frequencyPopoverRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-save hideWeekends to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("hideWeekends", String(hideWeekends));
  }, [hideWeekends]);

  // Load available tags from localStorage or set default initial tags
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("agenda_view") === null) {
        localStorage.setItem("agenda_view", "day");
      }
      if (localStorage.getItem("hideWeekends") === null) {
        localStorage.setItem("hideWeekends", "false");
      }
    }
    const saved = localStorage.getItem("clifav_available_tags");
    if (saved) {
      try {
        setAvailableTags(JSON.parse(saved));
      } catch (e) {
        setAvailableTags([{ name: "URGENTE", color: "#f56565" }]);
      }
    } else {
      const initial = [{ name: "URGENTE", color: "#f56565" }];
      setAvailableTags(initial);
      localStorage.setItem("clifav_available_tags", JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    if (activeClinic) {
      const code = activeClinic.country || "ES";
      const config = getCountryConfig(code);
      setFormPatCountry(config.name);
      const matched = COUNTRIES.find((c) => c.code === config.code);
      if (matched) {
        setDniCountry(matched);
        setPhoneCountry(matched);
        setCountryPickerSelected(matched);
      }
    }
  }, [activeClinic]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
      if (createTagsDropdownRef.current && !createTagsDropdownRef.current.contains(event.target as Node)) {
        setShowCreateTagsDropdown(false);
      }
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
        setShowMoreOptions(false);
      }
      if (frequencyPopoverRef.current && !frequencyPopoverRef.current.contains(event.target as Node)) {
        setShowFrequencyPopover(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsPopover(false);
      }
      if (editCalRef.current && !editCalRef.current.contains(event.target as Node)) {
        setShowEditCal(false);
      }
      if (startTimeRef.current && !startTimeRef.current.contains(event.target as Node)) {
        setShowStartTimeDropdown(false);
      }
      if (endTimeRef.current && !endTimeRef.current.contains(event.target as Node)) {
        setShowEndTimeDropdown(false);
      }
      if (serviceEditDropdownRef.current && !serviceEditDropdownRef.current.contains(event.target as Node)) {
        setShowServiceEditDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Listen to Escape key to close all cancellable modals/drawers
  useEffect(() => {
    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowConvertModal(false);
        setShowOpcionesSidebar(false);
        setShowFiltersSidebar(false);
        setShowWaitlistSidebar(false);
        setShowCreateContactModal(false);
        setShowBlockModal(false);
        setShowBlockDetailModal(false);
        setShowServiceWarningModal(false);
        setShowTagsDropdown(false);
        setShowCreateTagsDropdown(false);
        setShowStatusDropdown(false);
      }
    };
    window.addEventListener("keydown", handleEscapeKeyDown);
    return () => {
      window.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, []);

  // Scroll selected time into view when dropdowns are opened
  useEffect(() => {
    if (showStartTimeDropdown && startTimeDropdownContainerRef.current) {
      const container = startTimeDropdownContainerRef.current;
      const selectedEl = container.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [showStartTimeDropdown]);

  useEffect(() => {
    if (showEndTimeDropdown && endTimeDropdownContainerRef.current) {
      const container = endTimeDropdownContainerRef.current;
      const selectedEl = container.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [showEndTimeDropdown]);

  // Close country pickers on outside click
  useEffect(() => {
    function closePickers(event: MouseEvent) {
      if (dniPickerRef.current && !dniPickerRef.current.contains(event.target as Node)) {
        setShowDniCountryPicker(false);
      }
      if (phonePickerRef.current && !phonePickerRef.current.contains(event.target as Node)) {
        setShowPhoneCountryPicker(false);
      }
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setShowCountryPicker(false);
      }
    }
    document.addEventListener("mousedown", closePickers);
    return () => { document.removeEventListener("mousedown", closePickers); };
  }, []);

  const filteredClientsForSearch = patientSearch.trim() === ""
    ? clientsList
    : clientsList.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(patientSearch)) ||
        (c.email && c.email.toLowerCase().includes(patientSearch.toLowerCase()))
      );

  // Load staff, services, and clients
  useEffect(() => {
    if (!activeClinic) return;

    // Fetch staff
    fetch(`/api/users?clinicId=${activeClinic.id}&onlyAgenda=true`)
      .then((res) => res.json())
      .then((data) => {
        let filteredStaff = data;
        if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "agenda", "Ver todas las agendas")) {
          filteredStaff = data.filter((u: any) => u.id === currentUser.id);
        }
        setStaffList(filteredStaff);
        if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "agenda", "Ver todas las agendas")) {
          setCheckedStaffIds([currentUser.id]);
          return;
        }
        // Check if we have saved staff selection in localStorage
        if (typeof window !== "undefined") {
          const savedIdsJson = window.localStorage.getItem(`agenda_checked_staff_ids_${activeClinic.id}`);
          if (savedIdsJson) {
            try {
              const parsed = JSON.parse(savedIdsJson);
              if (Array.isArray(parsed)) {
                // Filter to make sure saved staff IDs actually exist in this clinic's staff list
                const validIds = parsed.filter(id => filteredStaff.some((u: User) => u.id === id));
                setCheckedStaffIds(validIds);
                return;
              }
            } catch (e) {
              console.error("Error parsing saved staff IDs:", e);
            }
          }
        }
        // By default, check all staff
        setCheckedStaffIds(filteredStaff.map((u: User) => u.id));
      });

    // Fetch services
    fetch(`/api/services?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServicesList(data);
        } else {
          setServicesList([]);
        }
      });

    // Fetch clients
    fetch(`/api/clients?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClientsList(data);
          
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const urlClientId = params.get("createAppointmentForClientId");
            if (urlClientId) {
              setFormClientId(urlClientId);
              setIsNewPatient(false);
              const now = new Date();
              setFormDate(now.toISOString().split("T")[0]);
              setFormTime(`${String(now.getHours() + 1).padStart(2, "0")}:00`);
              setShowCreateModal(true);
              
              // Clean query parameter from URL
              const newUrl = window.location.pathname;
              window.history.replaceState({}, "", newUrl);
            }
          }
        } else {
          console.error("Failed to fetch clients:", data);
          setClientsList([]);
        }
      });

    // Fetch active WhatsApp Manual reminders for this clinic
    fetch(`/api/notifications/reminders?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClinicReminders(data.filter((r: any) => r.enabled));
      })
      .catch(console.error);

  }, [activeClinic]);

  // Fetch appointments and time blocks when date, clinic, or staff filters change
  const fetchAppointments = useCallback(() => {
    if (!activeClinic) return;
    
    const fetchId = ++latestFetchIdRef.current;

    // Set range based on date & view
    let startRange = new Date(currentDate);
    let endRange = new Date(currentDate);

    if (view === "day") {
      startRange.setHours(0, 0, 0, 0);
      endRange.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      // Find Monday
      const day = startRange.getDay();
      const diff = startRange.getDate() - day + (day === 0 ? -6 : 1);
      startRange.setDate(diff);
      startRange.setHours(0, 0, 0, 0);
      
      endRange.setDate(diff + 6);
      endRange.setHours(23, 59, 59, 999);
    } else {
      // Month
      startRange.setDate(1);
      startRange.setHours(0, 0, 0, 0);
      endRange.setMonth(endRange.getMonth() + 1);
      endRange.setDate(0);
      endRange.setHours(23, 59, 59, 999);
    }

    const clinicId = activeClinic.id;
    const startStr = startRange.toISOString();
    const endStr = endRange.toISOString();

    fetch(`/api/appointments?clinicId=${clinicId}&start=${startStr}&end=${endStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== latestFetchIdRef.current) return;
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setAppointments([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching appointments:", err);
        if (fetchId === latestFetchIdRef.current) setAppointments([]);
      });

    fetch(`/api/sales?clinicId=${clinicId}`)
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== latestFetchIdRef.current) return;
        if (Array.isArray(data)) {
          setAgendaSales(data);
        }
      })
      .catch((err) => {
        console.error("Error fetching sales for agenda:", err);
      });

    fetch(`/api/time-blocks?clinicId=${clinicId}&start=${startStr}&end=${endStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== latestFetchIdRef.current) return;
        if (Array.isArray(data)) {
          setTimeBlocks(data);
        } else {
          setTimeBlocks([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching time blocks:", err);
        if (fetchId === latestFetchIdRef.current) setTimeBlocks([]);
      });
  }, [activeClinic, currentDate, view]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Navigation
  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() - 1);
      if (hideWeekends) {
        if (newDate.getDay() === 0) { // Sunday, go back to Friday
          newDate.setDate(newDate.getDate() - 2);
        } else if (newDate.getDay() === 6) { // Saturday, go back to Friday
          newDate.setDate(newDate.getDate() - 1);
        }
      }
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() + 1);
      if (hideWeekends) {
        if (newDate.getDay() === 6) { // Saturday, go forward to Monday
          newDate.setDate(newDate.getDate() + 2);
        } else if (newDate.getDay() === 0) { // Sunday, go forward to Monday
          newDate.setDate(newDate.getDate() + 1);
        }
      }
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Google Calendar Sync Simulation
  const handleGoogleSync = () => {
    setGoogleSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setGoogleSyncing(false);
      setSyncSuccess(true);
      fetchAppointments();
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1500);
  };

  const triggerAutoSync = () => {
    setGoogleSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setGoogleSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  // Checkbox staff handler
  const handleStaffCheck = (staffId: string) => {
    if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "agenda", "Ver todas las agendas")) {
      setCheckedStaffIds([currentUser.id]);
      return;
    }
    if (checkedStaffIds.includes(staffId)) {
      setCheckedStaffIds(checkedStaffIds.filter((id) => id !== staffId));
    } else {
      setCheckedStaffIds([...checkedStaffIds, staffId]);
    }
  };

  // Format headers
  const getFormattedRange = () => {
    if (view === "day") {
      return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } else if (view === "week") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      return `${start.toLocaleDateString("es-ES", options)} - ${end.toLocaleDateString("es-ES", { ...options, year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    }
  };

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const m = new Date(date.setDate(diff));
    m.setHours(0, 0, 0, 0);
    return m;
  };

  const isTodayVisible = () => {
    const today = new Date();
    if (view === "day") {
      return today.toDateString() === currentDate.toDateString();
    } else if (view === "week") {
      const mon = getMonday(currentDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return today.getTime() >= mon.getTime() && today.getTime() <= sun.getTime();
    } else {
      return today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();
    }
  };

  const getFormattedDatePickerLabel = () => {
    const capitalized = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    if (view === "day") {
      return capitalized(currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }));
    } else if (view === "week") {
      const start = getMonday(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (hideWeekends ? 4 : 6));
      const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      return `${start.toLocaleDateString("es-ES", options)} - ${end.toLocaleDateString("es-ES", { ...options, year: "numeric" })}`;
    } else {
      return capitalized(currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" }));
    }
  };

  const handlePickerMonthChange = (newMonth: number) => {
    setPickerMonth(newMonth);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(newMonth);
      setCurrentDate(nextDate);
    }
  };

  const handlePickerYearChange = (newYear: number) => {
    setPickerYear(newYear);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setFullYear(newYear);
      setCurrentDate(nextDate);
    }
  };

  const handlePrevPickerMonth = () => {
    let newMonth = pickerMonth - 1;
    let newYear = pickerYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setPickerMonth(newMonth);
    setPickerYear(newYear);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(newMonth);
      nextDate.setFullYear(newYear);
      setCurrentDate(nextDate);
    }
  };

  const handleNextPickerMonth = () => {
    let newMonth = pickerMonth + 1;
    let newYear = pickerYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setPickerMonth(newMonth);
    setPickerYear(newYear);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(newMonth);
      nextDate.setFullYear(newYear);
      setCurrentDate(nextDate);
    }
  };

  // Calendar slot interactions (15-min intervals)
  const handleSlotClick = (userId: string, hour: number, minutes: number, customDate?: Date) => {
    const slotDate = new Date(customDate || currentDate);
    slotDate.setHours(hour, minutes, 0, 0);

    setSelectedSlot({ start: slotDate, userId });
    setFormUserId(userId);
    setFormClientId("");
    setFormServiceId(servicesList[0]?.id || "");
    
    // date picker format: YYYY-MM-DD
    const yyyy = slotDate.getFullYear();
    const mm = String(slotDate.getMonth() + 1).padStart(2, "0");
    const dd = String(slotDate.getDate()).padStart(2, "0");
    const dateFormatted = `${yyyy}-${mm}-${dd}`;
    setFormDate(dateFormatted);
    
    // time picker format: HH:MM
    const hh = String(slotDate.getHours()).padStart(2, "0");
    const min = String(slotDate.getMinutes()).padStart(2, "0");
    const timeFormatted = `${hh}:${min}`;
    setFormTime(timeFormatted);
    
    // Compute formEndTime matching service duration
    const selServ = servicesList.find((s) => s.id === formServiceId) || servicesList[0];
    const servDuration = selServ ? selServ.duration : 15;
    const endSlotDate = new Date(slotDate.getTime() + servDuration * 60000);
    const endH = String(endSlotDate.getHours()).padStart(2, "0");
    const endM = String(endSlotDate.getMinutes()).padStart(2, "0");
    setFormEndTime(`${endH}:${endM}`);

    setFormNotes("");

    // Prefill Block Form fields as well
    setBlockTitle("");
    setSelectedBlockDates([dateFormatted]);
    setBlockStartTime(timeFormatted);
    setPopoverMonth(slotDate.getMonth());
    setPopoverYear(slotDate.getFullYear());
    setShowFrequencyPopover(false);
    
    let endHour = hour + 1;
    let endMinutes = minutes;
    if (endHour >= 20) {
      endHour = 20;
      endMinutes = 0;
    }
    const endHStr = String(endHour).padStart(2, "0");
    const endMStr = String(endMinutes).padStart(2, "0");
    setBlockEndTime(`${endHStr}:${endMStr}`);
    setBlockNotes("");

    // Clear patient search, suggestions and form fields
    setPatientSearch("");
    setShowSuggestions(false);
    setIsNewPatient(false);
    setNewPatientTab("general");
    
    setFormPatFirstName("");
    setFormPatLastName("");
    setFormPatBirthDate("");
    setFormPatDniNif("");
    setFormPatPhone("");
    setFormPatEmail("");
    setFormPatAddress("");
    setFormPatMunicipality("");
    setFormPatPostalCode("");
    const resetCode = activeClinic?.country || "ES";
    const resetConfig = getCountryConfig(resetCode);
    setFormPatCountry(resetConfig.name);
    const resetMatched = COUNTRIES.find((c) => c.code === resetConfig.code);
    if (resetMatched) {
      setDniCountry(resetMatched);
      setPhoneCountry(resetMatched);
      setCountryPickerSelected(resetMatched);
    }
    setFormPatIsSelfEmployed(false);
    setFormPatIsCompany(false);
    setFormPatReceivesReminders(true);
    setFormPatOccupation("");
    setFormPatGender("Femenino");
    setFormPatMaritalStatus("Soltero/a");
    setFormPatIban("");
    setFormPatBic("");
    setFormPatProvince("");
    setFormPatLandline("");
    
    // Nueva Cita drawer states
    setFormClinicId(activeClinic?.id || "");
    setFormStatus("CONFIRMED");
    setAppointmentTags([]);
    setShowTagInput(false);
    setNewTagName("");
    setShowServiceDropdown(false);
    setShowFormStatusDropdown(false);

    setShowOptionModal(true);
  };

  const handleAppointmentClick = (app: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(app);
    setFormClientId(app.clientId);
    setFormUserId(app.userId);
    setFormServiceId(app.serviceId);
    setFormStatus(app.status);
    setFormNotes(app.notes || "");
    setFormClinicId(app.clinicId || "");
    
    const startD = new Date(app.start);
    const yyyy = startD.getFullYear();
    const mm = String(startD.getMonth() + 1).padStart(2, "0");
    const dd = String(startD.getDate()).padStart(2, "0");
    setFormDate(`${yyyy}-${mm}-${dd}`);
    setEditCalMonth(startD.getMonth());
    setEditCalYear(yyyy);
    
    const hh = String(startD.getHours()).padStart(2, "0");
    const min = String(startD.getMinutes()).padStart(2, "0");
    setFormTime(`${hh}:${min}`);

    const endD = new Date(app.end);
    const endH = String(endD.getHours()).padStart(2, "0");
    const endM = String(endD.getMinutes()).padStart(2, "0");
    setFormEndTime(`${endH}:${endM}`);
    
    // Reset custom view modal states
    setEditModalTab("datos");
    setIsEditingApp(false);
    setShowStatusDropdown(false);
    setShowMoreOptions(false);
    setEditPatReceivesReminders((app.client as any).receivesReminders ?? true);
    setCitasSubTab("pasadas");

    // Parse clinical notes
    let parsedNotes = {
      observaciones: "",
      diagnostico: "",
      operacion: "",
      tratamiento: "",
      medicacion: "",
      materialLotes: ""
    };
    if (app.notes) {
      const trimmedNotes = app.notes.trim();
      if (trimmedNotes.startsWith("{") && trimmedNotes.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmedNotes);
          parsedNotes = {
            observaciones: obj.observaciones || "",
            diagnostico: obj.diagnostico || "",
            operacion: obj.operacion || "",
            tratamiento: obj.tratamiento || "",
            medicacion: obj.medicacion || "",
            materialLotes: obj.materialLotes || ""
          };
        } catch (err) {
          parsedNotes.observaciones = app.notes;
        }
      } else {
        parsedNotes.observaciones = app.notes;
      }
    }
    setSegObservaciones(parsedNotes.observaciones);
    setSegDiagnostico(parsedNotes.diagnostico);
    setSegOperacion(parsedNotes.operacion);
    setSegTratamiento(parsedNotes.tratamiento);
    setSegMedicacion(parsedNotes.medicacion);
    setSegMaterialLotes(parsedNotes.materialLotes);
    
    // Load client vouchers (own + shared) for the appointment info panel
    setAppointmentClientVouchers([]);
    setLoadingAppointmentVouchers(true);
    fetch(`/api/clients/${app.clientId}/vouchers?includeShared=true`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAppointmentClientVouchers(data);
        }
      })
      .catch((err) => {
        console.error("Error loading appointment client vouchers:", err);
      })
      .finally(() => {
        setLoadingAppointmentVouchers(false);
      });

    // Load appointment audit logs
    setAppointmentLogs([]);
    setLoadingLogs(true);
    fetch(`/api/appointments/${app.id}/logs`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointmentLogs(data);
      })
      .catch((err) => console.error("Error loading appointment logs:", err))
      .finally(() => setLoadingLogs(false));

    // Load appointment photos
    setAppointmentPhotos([]);
    setLoadingPhotos(true);
    fetch(`/api/clients/${app.clientId}/photos?appointmentId=${app.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointmentPhotos(data);
      })
      .catch((err) => console.error("Error loading appointment photos:", err))
      .finally(() => setLoadingPhotos(false));

    setShowEditModal(true);
  };

  const handleToggleReminders = async (checked: boolean) => {
    setEditPatReceivesReminders(checked);
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`/api/clients/${selectedAppointment.client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedAppointment.client,
          receivesReminders: checked,
        }),
      });

      if (res.ok) {
        const updatedClient = await res.json();
        setClientsList((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
        setSelectedAppointment((prev) => (prev ? { ...prev, client: updatedClient } : null));
        fetchAppointments();
      }
    } catch (err) {
      console.error("Error toggling reminders:", err);
    }
  };

  // Photo handlers for Agenda Appointment Drawer
  const handleAgendaPhotoUpload = async (file: File) => {
    if (!file || !selectedAppointment) return;
    setUploadingAgendaPhoto(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", agendaPhotoType);
    const selectedAngle = agendaPhotoAngle === "Otro" ? agendaCustomAngle : agendaPhotoAngle;
    formData.append("angle", selectedAngle || "Frente");
    formData.append("appointmentId", selectedAppointment.id);
    formData.append("description", agendaPhotoType === "BEFORE" ? "Antes" : "Después");

    try {
      const res = await fetch(`/api/clients/${selectedAppointment.clientId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al subir la foto");
      }

      // Reset angle inputs
      setAgendaCustomAngle("");
      setAgendaPhotoAngle("Frente");

      // Reload appointment photos
      const updatedPhotosRes = await fetch(`/api/clients/${selectedAppointment.clientId}/photos?appointmentId=${selectedAppointment.id}`);
      const updatedPhotos = await updatedPhotosRes.json();
      if (Array.isArray(updatedPhotos)) {
        setAppointmentPhotos(updatedPhotos);
      }
      toast.success("Foto guardada con éxito");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al subir la foto.");
    } finally {
      setUploadingAgendaPhoto(false);
    }
  };

  const handleAgendaPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAgendaPhotoUpload(file);
    }
  };

  const handleAgendaPhotoDelete = async (photoId: string) => {
    if (!selectedAppointment || !window.confirm("¿Estás seguro de que deseas eliminar esta foto?")) return;
    try {
      const res = await fetch(`/api/clients/${selectedAppointment.clientId}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Reload photos
        const updatedPhotosRes = await fetch(`/api/clients/${selectedAppointment.clientId}/photos?appointmentId=${selectedAppointment.id}`);
        const updatedPhotos = await updatedPhotosRes.json();
        if (Array.isArray(updatedPhotos)) {
          setAppointmentPhotos(updatedPhotos);
        }
      } else {
        toast.success("Error al eliminar la foto");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getFormattedReminderMessage = (templateText: string, app: any) => {
    if (!templateText) return "";
    
    // Parse Dates
    const startD = new Date(app.start);
    const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const longDateFormatted = startD.toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const vars: Record<string, string> = {
      "{{Cliente:Nombre}}": app.client?.firstName || "",
      "{{Cliente:Apellidos}}": app.client?.lastName || "",
      "{{Cliente:Dirección_Cliente}}": app.client?.address || "",
      "{{Nombre_Consulta}}": app.clinic?.name || activeClinic?.name || "",
      "{{Dirección_Consulta}}": app.clinic?.address || activeClinic?.address || "",
      "{{Fecha_Hora_Cita}}": `${dateFormatted} a las ${timeFormatted}`,
      "{{Fecha_larga}}": longDateFormatted,
      "{{Hora_Cita}}": timeFormatted,
      "{{Nombre_Servicio}}": app.service?.name || "",
      "{{Empleado_Nombre_Completo}}": app.user ? `${app.user.name} ${app.user.lastName || ""}`.trim() : "",
      "{{Empleado_Nombre}}": app.user?.name || "",
      "{{Empleado_Apellidos}}": app.user?.lastName || "",
      "{{Empleado_Correo}}": app.user?.email || "",
      "{{Empleado_DNI}}": app.user?.dniNif || "",
      "{{Empleado_Teléfono}}": app.user?.phone || "",
      "{{Link_VideoConsulta}}": `https://meet.jit.si/clifav-${app.id}`,
      "{{Link_Cancelar_Cita}}": `${window.location.origin}/appointments/${app.id}/cancel`,
      "{{Link_Mover_Cita}}": `${window.location.origin}/appointments/${app.id}/reschedule`,
      "{{Link_Confirmar_Cita}}": `${window.location.origin}/appointments/${app.id}/confirm`,
      "{{Link_Pago_Online}}": `${window.location.origin}/appointments/${app.id}/pay`,
      "{{Recurso}}": "",
      "{{Zona_horaria}}": "Europe/Madrid",
      "{{Deuda}}": "0.00",
    };

    let msg = templateText;
    Object.keys(vars).forEach((key) => {
      msg = msg.replaceAll(key, vars[key]);
    });
    return msg;
  };

  const handleSendWhatsAppReminder = async (app: any) => {
    const cleanPhone = (app.client.phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      toast.success("El cliente no tiene un número de teléfono configurado.");
      return;
    }

    // Buscar recordatorio activo para el servicio y clínica
    const matchingReminder = clinicReminders.find((r) => {
      const matchClinic = r.clinicId === app.clinicId || r.clinicId === activeClinic?.id;
      const matchStatus = r.condition === app.status;
      const matchChannel = r.channel === "WHATSAPP_MANUAL";
      const matchService = r.allServices || (r.serviceIds ? r.serviceIds.split(",").includes(app.serviceId) : false);
      return matchClinic && matchStatus && matchChannel && matchService;
    });

    let message = "";
    if (matchingReminder) {
      message = getFormattedReminderMessage(matchingReminder.message, app);
    } else {
      // Mensaje genérico por defecto
      const startD = new Date(app.start);
      const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
      message = `Hola ${app.client.firstName}, te recordamos tu cita para ${app.service.name} el día ${dateFormatted} a las ${timeFormatted}. ¡Te esperamos!`;
    }

    const isAppMode = activeClinic?.defaultWhatsappMode === "App";
    const whatsappUrl = isAppMode 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");


    // Guardar en el log de forma asíncrona
    try {
      await fetch("/api/notifications/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: app.clinicId || activeClinic?.id,
          clientId: app.clientId,
          clientName: `${app.client.firstName} ${app.client.lastName || ""}`.trim(),
          appointmentId: app.id,
          channel: "WHATSAPP_MANUAL",
          recipient: cleanPhone,
          message: message,
          status: "SENT",
        }),
      });
    } catch (e) {
      console.error("Error creating notification log:", e);
    }
  };


  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedAppointment) return;
    if (!canCreateOrEditAppointment(currentUser)) {
      toast.success("No tienes permisos para modificar citas (Sólo lectura).");
      return;
    }

    const payload = {
      id: selectedAppointment.id,
      userId: selectedAppointment.userId,
      serviceId: selectedAppointment.serviceId,
      start: selectedAppointment.start,
      end: selectedAppointment.end,
      status: newStatus,
      notes: selectedAppointment.notes || "",
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (useVoucherSession && matchingVoucher && newStatus === "COMPLETED" && selectedAppointment.status !== "COMPLETED") {
          try {
            await fetch(`/api/clients/${selectedAppointment.clientId}/vouchers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clientVoucherId: matchingVoucher.id, action: "consume" }),
            });
          } catch (vErr) {
            console.error("Error consuming voucher session:", vErr);
          }
        }
        const updatedApp = { ...selectedAppointment, status: newStatus };
        setSelectedAppointment(updatedApp);
        setFormStatus(newStatus);
        fetchAppointments();
        triggerAutoSync();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
    setShowStatusDropdown(false);
  };

  const formatDrawerDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(`${dateStr}T12:00:00`);
      const weekday = date.toLocaleDateString("es-ES", { weekday: "short" });
      const day = date.getDate();
      const month = date.toLocaleDateString("es-ES", { month: "long" });
      return `${weekday} ${day} ${month}`;
    } catch {
      return dateStr;
    }
  };

  const handleSelectWalkInClient = async () => {
    let walkIn = clientsList.find(c => 
      c.firstName.toLowerCase() === "cliente de" && 
      c.lastName.toLowerCase() === "paso"
    );
    if (!walkIn) {
      const newClientPayload = {
        firstName: "Cliente de",
        lastName: "paso",
        phone: "",
        email: "",
        dniNif: "",
        birthDate: null,
        gender: "Otro",
        address: "",
        municipality: "",
        postalCode: "",
        country: "España",
        province: "",
        landline: "",
        iban: "",
        bic: "",
        tags: "",
        clinicId: activeClinic?.id || currentUser?.clinics[0]?.id || "",
        isSelfEmployed: false,
        isCompany: false,
        receivesReminders: false,
        occupation: "",
        maritalStatus: "Soltero/a",
      };
      try {
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newClientPayload),
        });
        if (clientRes.ok) {
          walkIn = await clientRes.json();
          setClientsList((prev) => [...prev, walkIn!]);
        }
      } catch (err) {
        console.error("Error creating walk-in client:", err);
      }
    }
    if (walkIn) {
      setFormClientId(walkIn.id);
    } else {
      toast.warning("No se pudo crear o seleccionar el Cliente de paso");
    }
  };

  const handleCreateContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatFirstName || !formPatLastName || !activeClinic) {
      toast.warning("Nombre y apellidos son obligatorios");
      return;
    }
    const newClientPayload = {
      firstName: formPatFirstName,
      lastName: formPatLastName,
      phone: formPatPhone,
      email: formPatEmail,
      dniNif: formPatDniNif,
      birthDate: formPatBirthDate || null,
      gender: formPatGender,
      address: formPatAddress,
      municipality: formPatMunicipality,
      postalCode: formPatPostalCode,
      country: formPatCountry,
      province: formPatProvince,
      landline: formPatLandline,
      iban: formPatIban,
      bic: formPatBic,
      tags: "",
      clinicId: activeClinic.id,
      isSelfEmployed: formPatIsSelfEmployed,
      isCompany: formPatIsCompany,
      receivesReminders: formPatReceivesReminders,
      occupation: formPatOccupation,
      maritalStatus: formPatMaritalStatus,
    };
    try {
      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientPayload),
      });

      if (!clientRes.ok) {
        const errData = await clientRes.json();
        toast.error(`Error al registrar el cliente: ${errData.error || "error desconocido"}`);
        return;
      }

      const newClient = await clientRes.json();
      setClientsList((prev) => [...prev, newClient]);
      setFormClientId(newClient.id);
      setShowCreateContactModal(false);
      
      // Clear contact form states
      setFormPatFirstName("");
      setFormPatLastName("");
      setFormPatBirthDate("");
      setFormPatDniNif("");
      setFormPatPhone("");
      setFormPatEmail("");
      setFormPatAddress("");
      setFormPatProvince("");
      setFormPatLandline("");
      setFormPatMunicipality("");
      setFormPatPostalCode("");
      const resetCode = activeClinic?.country || "ES";
      const resetConfig = getCountryConfig(resetCode);
      setFormPatCountry(resetConfig.name);
      const resetMatched = COUNTRIES.find((c) => c.code === resetConfig.code);
      if (resetMatched) {
        setDniCountry(resetMatched);
        setPhoneCountry(resetMatched);
        setCountryPickerSelected(resetMatched);
      }
      setFormPatIsSelfEmployed(false);
      setFormPatIsCompany(false);
      setFormPatReceivesReminders(true);
      setFormPatOccupation("");
      setFormPatGender("Femenino");
      setFormPatMaritalStatus("Soltero/a");
      setFormPatIban("");
      setFormPatBic("");
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar el cliente");
    }
  };

  // Submit appointment creation
  const handleCreateAppointment = async (e: React.FormEvent, forceProceed = false, andCheckout = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canCreateOrEditAppointment(currentUser)) {
      toast.success("No tienes permisos para crear citas (Sólo lectura).");
      return null;
    }

    const selectedService = servicesList.find((s) => s.id === formServiceId);
    if (!forceProceed && selectedService?.allowedUserIds) {
      const allowed = selectedService.allowedUserIds.split(",");
      if (!allowed.includes(formUserId)) {
        setWarningModalConfirmCallback(() => () => {
          handleCreateAppointment(e, true, andCheckout);
        });
        setShowServiceWarningModal(true);
        return null;
      }
    }

    let clientIdToUse = formClientId;

    if (isNewPatient) {
      if (!formPatFirstName || !formPatLastName || !activeClinic) {
        toast.warning("Nombre y apellidos son obligatorios para registrar al paciente");
        return;
      }

      const newClientPayload = {
        firstName: formPatFirstName,
        lastName: formPatLastName,
        phone: formPatPhone,
        email: formPatEmail,
        dniNif: formPatDniNif,
        birthDate: formPatBirthDate || null,
        gender: formPatGender,
        address: formPatAddress,
        municipality: formPatMunicipality,
        postalCode: formPatPostalCode,
        country: formPatCountry,
        iban: formPatIban,
        bic: formPatBic,
        tags: "",
        clinicId: activeClinic.id,
        isSelfEmployed: formPatIsSelfEmployed,
        isCompany: formPatIsCompany,
        receivesReminders: formPatReceivesReminders,
        occupation: formPatOccupation,
        maritalStatus: formPatMaritalStatus,
      };

      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientPayload),
      });

      if (!clientRes.ok) {
        const errData = await clientRes.json();
        toast.error(`Error al registrar el paciente: ${errData.error || "error desconocido"}`);
        return;
      }

      const newClient = await clientRes.json();
      setClientsList((prev) => [...prev, newClient]);
      clientIdToUse = newClient.id;
    }

    if (!clientIdToUse || !formUserId || !formServiceId || !formDate || !formTime || !formClinicId) {
      toast.warning("Por favor, selecciona o crea un paciente y rellena todos los campos.");
      return;
    }

    // Save tags to the client
    if (appointmentTags.length > 0) {
      const clientObj = clientsList.find(c => c.id === clientIdToUse);
      if (clientObj) {
        const existingTags = clientObj.tags ? clientObj.tags.split(",") : [];
        const combinedTags = Array.from(new Set([...existingTags, ...appointmentTags])).join(",");
        try {
          await fetch(`/api/clients/${clientIdToUse}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...clientObj, tags: combinedTags })
          });
        } catch (err) {
          console.error("Error saving client tags:", err);
        }
      }
    }

    const startDateTime = new Date(`${formDate}T${formTime}`);
    const duration = selectedService ? selectedService.duration : 45;

    if (checkIfOutsideShift(formUserId, formDate, formTime, duration)) {
      const confirmSave = window.confirm(
        "Estás asignando una cita fuera del horario laboral establecido para este profesional. ¿Deseas guardarla igualmente?"
      );
      if (!confirmSave) {
        return null;
      }
    }

    let endDateTime: Date;
    if (formEndTime) {
      endDateTime = new Date(`${formDate}T${formEndTime}`);
      if (endDateTime.getTime() <= startDateTime.getTime()) {
        endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      }
    } else {
      endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    }

    const payload = {
      clientId: clientIdToUse,
      userId: formUserId,
      serviceId: formServiceId,
      clinicId: formClinicId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      notes: formNotes,
      status: formStatus || "CONFIRMED",
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const createdApp = await res.json();
      if (useVoucherSession && matchingVoucher && (formStatus === "COMPLETED" || createdApp.status === "COMPLETED")) {
        try {
          await fetch(`/api/clients/${createdApp.clientId}/vouchers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientVoucherId: matchingVoucher.id, action: "consume" }),
          });
        } catch (vErr) {
          console.error("Error consuming voucher session:", vErr);
        }
      }
      if (activeWaitlistEntryForAppointment) {
        try {
          await fetch(`/api/waitlist/${activeWaitlistEntryForAppointment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ASSIGNED" }),
          });
          setActiveWaitlistEntryForAppointment(null);
          fetchWaitlist();
        } catch (wErr) {
          console.error("Error updating waitlist entry status:", wErr);
        }
      }
      setShowCreateModal(false);
      fetchAppointments();
      triggerAutoSync();
      if (andCheckout) {
        window.location.href = `/dashboard/sales?clientId=${createdApp.clientId}&serviceId=${createdApp.serviceId}&appointmentId=${createdApp.id}`;
      }
      return createdApp;
    } else {
      toast.error("Error al reservar la cita");
      return null;
    }
  };

  // Submit appointment edit
  const handleUpdateAppointment = async (e: React.FormEvent | null, forceProceed = false, shouldRedirectToCaja = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canCreateOrEditAppointment(currentUser)) {
      toast.success("No tienes permisos para modificar citas (Sólo lectura).");
      return;
    }
    if (!selectedAppointment || !formUserId || !formServiceId || !formDate || !formTime || !formEndTime) return;

    const selectedService = servicesList.find((s) => s.id === formServiceId);
    if (!forceProceed && selectedService?.allowedUserIds) {
      const allowed = selectedService.allowedUserIds.split(",");
      if (!allowed.includes(formUserId)) {
        setWarningModalConfirmCallback(() => () => {
          handleUpdateAppointment(e, true, shouldRedirectToCaja);
        });
        setShowServiceWarningModal(true);
        return;
      }
    }

    const startDateTime = new Date(`${formDate}T${formTime}`);
    const startHourMin = formTime.split(":");
    const endHourMin = formEndTime.split(":");
    const startMinTotal = parseInt(startHourMin[0], 10) * 60 + parseInt(startHourMin[1], 10);
    const endMinTotal = parseInt(endHourMin[0], 10) * 60 + parseInt(endHourMin[1], 10);
    let duration = endMinTotal - startMinTotal;
    if (duration <= 0) {
      toast.warning("La hora de fin debe ser posterior a la de inicio.");
      return;
    }

    if (checkIfOutsideShift(formUserId, formDate, formTime, duration)) {
      const confirmSave = window.confirm(
        "Estás asignando una cita fuera del horario laboral establecido para este profesional. ¿Deseas guardarla igualmente?"
      );
      if (!confirmSave) {
        return;
      }
    }

    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const payload = {
      id: selectedAppointment.id,
      userId: formUserId,
      serviceId: formServiceId,
      clinicId: formClinicId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: formStatus,
      notes: formNotes,
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    const res = await fetch("/api/appointments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (useVoucherSession && matchingVoucher && formStatus === "COMPLETED" && selectedAppointment.status !== "COMPLETED") {
        try {
          await fetch(`/api/clients/${selectedAppointment.clientId}/vouchers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientVoucherId: matchingVoucher.id, action: "consume" }),
          });
        } catch (vErr) {
          console.error("Error consuming voucher session:", vErr);
        }
      }
      setShowEditModal(false);
      setIsEditingApp(false);
      fetchAppointments();
      triggerAutoSync();

      if (shouldRedirectToCaja) {
        window.location.href = `/dashboard/sales?clientId=${selectedAppointment.clientId}&serviceId=${formServiceId}&appointmentId=${selectedAppointment.id}`;
      }
    }
  };

  // Cancel/Delete appointment
  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    if (!canDeleteAppointment(currentUser)) {
      toast.success("No tienes permisos para eliminar citas.");
      return;
    }

    if (confirm("¿Estás seguro de que deseas cancelar y eliminar esta cita?")) {
      const userNameQuery = currentUser ? encodeURIComponent(currentUser.name) : "Sistema";
      const userIdQuery = currentUser?.id || "";
      const res = await fetch(`/api/appointments/${selectedAppointment.id}?userName=${userNameQuery}&userId=${userIdQuery}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchAppointments();
        triggerAutoSync();
      }
    }
  };

  // Drag and Drop Handlers
  const handleMoveAppointment = async (app: Appointment, newUserId: string, newDateStr: string, newTimeStr: string) => {
    if (!canCreateOrEditAppointment(currentUser)) {
      toast.success("No tienes permisos para modificar citas.");
      return;
    }

    const duration = (new Date(app.end).getTime() - new Date(app.start).getTime()) / 60000;
    if (checkIfOutsideShift(newUserId, newDateStr, newTimeStr, duration)) {
      const confirmSave = window.confirm(
        "Estás asignando una cita fuera del horario laboral establecido para este profesional. ¿Deseas guardarla igualmente?"
      );
      if (!confirmSave) {
        return;
      }
    }

    const startDateTime = new Date(`${newDateStr}T${newTimeStr}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Save previous state for rollback on API error
    const oldAppointments = [...appointments];

    // Optimistic UI Update: update positions instantly on the screen
    setAppointments(prev => prev.map(a => {
      if (a.id === app.id) {
        return {
          ...a,
          userId: newUserId,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString()
        };
      }
      return a;
    }));

    setSavingAppIds(prev => [...prev, app.id]);

    const payload = {
      id: app.id,
      userId: newUserId,
      serviceId: app.serviceId,
      clinicId: app.clinicId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: app.status,
      notes: app.notes || "",
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchAppointments();
      } else {
        toast.error("Error al mover la cita.");
        setAppointments(oldAppointments);
      }
    } catch (err) {
      console.error("Error moving appointment:", err);
      toast.error("Error al conectar con el servidor.");
      setAppointments(oldAppointments); // Rollback
    } finally {
      setSavingAppIds(prev => prev.filter(id => id !== app.id));
    }
  };

  // Touch Drag-and-Drop system for mobile devices
  const [touchDraggedApp, setTouchDraggedApp] = useState<Appointment | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDraggedAppRef = useRef<Appointment | null>(null);
  const touchTargetSlotRef = useRef<{ userId: string; hour: number; minute: number; dateStr: string } | null>(null);
  const isTouchDraggingRef = useRef(false);
  const autoScrollFrameRef = useRef<number | null>(null);
  const lastTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const stopAutoScroll = () => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  };

  const updateSlotUnderFinger = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest("[data-slot-user-id]") as HTMLElement | null;
    if (slotEl) {
      const userId = slotEl.getAttribute("data-slot-user-id") || "";
      const hour = Number(slotEl.getAttribute("data-slot-hour") || 0);
      const minute = Number(slotEl.getAttribute("data-slot-minute") || 0);
      const dateStr = slotEl.getAttribute("data-slot-date-str") || "";
      setDraggedOverSlot({ userId, hour, minute, dateStr });
      touchTargetSlotRef.current = { userId, hour, minute, dateStr };
    }
  };

  const startAutoScroll = () => {
    if (autoScrollFrameRef.current !== null) return;

    const scrollStep = () => {
      if (!touchDraggedAppRef.current) {
        stopAutoScroll();
        return;
      }

      const { x, y } = lastTouchPosRef.current;
      const viewportHeight = window.innerHeight;
      const topZone = 150;
      const bottomZone = viewportHeight - 130;

      let scrollSpeed = 0;
      if (y < topZone) {
        scrollSpeed = -Math.max(5, Math.floor((topZone - y) / 4));
      } else if (y > bottomZone) {
        scrollSpeed = Math.max(5, Math.floor((y - bottomZone) / 4));
      }

      if (scrollSpeed !== 0) {
        window.scrollBy(0, scrollSpeed);
        document.documentElement.scrollBy(0, scrollSpeed);
        document.body.scrollBy(0, scrollSpeed);
        
        const gridBody = document.querySelector(".columnGridBody");
        if (gridBody && gridBody.parentElement) {
          gridBody.parentElement.scrollBy(0, scrollSpeed);
        }

        updateSlotUnderFinger(x, y);

        autoScrollFrameRef.current = requestAnimationFrame(scrollStep);
      } else {
        stopAutoScroll();
      }
    };

    autoScrollFrameRef.current = requestAnimationFrame(scrollStep);
  };

  const handleTouchStartApp = (e: React.TouchEvent, app: Appointment) => {
    if (!canCreateOrEditAppointment(currentUser)) return;
    const touch = e.touches[0];
    touchDraggedAppRef.current = app;
    touchTargetSlotRef.current = null;
    isTouchDraggingRef.current = false;
    lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    setTouchPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMoveApp = (e: React.TouchEvent) => {
    if (!touchDraggedAppRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    
    isTouchDraggingRef.current = true;
    if (!touchDraggedApp) {
      setTouchDraggedApp(touchDraggedAppRef.current);
    }
    lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
    setTouchPos({ x: touch.clientX, y: touch.clientY });

    updateSlotUnderFinger(touch.clientX, touch.clientY);

    const viewportHeight = window.innerHeight;
    const topZone = 150;
    const bottomZone = viewportHeight - 130;

    if (touch.clientY < topZone || touch.clientY > bottomZone) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  };

  const handleTouchEndApp = async () => {
    stopAutoScroll();
    const app = touchDraggedAppRef.current;
    const slot = touchTargetSlotRef.current;
    const isDragging = isTouchDraggingRef.current;

    touchDraggedAppRef.current = null;
    touchTargetSlotRef.current = null;
    isTouchDraggingRef.current = false;
    setTouchDraggedApp(null);
    setDraggedOverSlot(null);

    if (isDragging && app && slot) {
      const timeStr = `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`;
      await handleMoveAppointment(app, slot.userId, slot.dateStr, timeStr);
    }
  };

  // Safety listener for mobile touch drag cancellation
  useEffect(() => {
    if (touchDraggedApp) {
      const clearTouchDrag = () => {
        setTouchDraggedApp(null);
        setDraggedOverSlot(null);
        touchDraggedAppRef.current = null;
        touchTargetSlotRef.current = null;
      };
      window.addEventListener("touchend", clearTouchDrag);
      window.addEventListener("touchcancel", clearTouchDrag);
      return () => {
        window.removeEventListener("touchend", clearTouchDrag);
        window.removeEventListener("touchcancel", clearTouchDrag);
      };
    }
  }, [touchDraggedApp]);

  // ── Desktop Mouse Drag (mirrors the touch system – avoids all HTML5 DnD bugs) ──
  const mouseDraggedAppRef = useRef<Appointment | null>(null);
  const mouseTargetSlotRef = useRef<{ userId: string; hour: number; minute: number; dateStr: string } | null>(null);
  const isMouseDraggingRef = useRef(false);
  const mouseGhostRef = useRef<HTMLDivElement | null>(null);
  const mouseDragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const createMouseGhost = (app: Appointment, x: number, y: number) => {
    const ghost = document.createElement("div");
    ghost.id = "agenda-mouse-drag-ghost";
    ghost.textContent = `${app.client.firstName} ${app.client.lastName}`;
    ghost.style.cssText = `
      position: fixed;
      left: ${x - 60}px;
      top: ${y - 20}px;
      background: ${app.service.color || "var(--primary)"};
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      pointer-events: none;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      white-space: nowrap;
      opacity: 0.92;
      transform: rotate(-2deg);
    `;
    document.body.appendChild(ghost);
    mouseGhostRef.current = ghost;
  };

  const removeMouseGhost = () => {
    if (mouseGhostRef.current) {
      mouseGhostRef.current.remove();
      mouseGhostRef.current = null;
    }
  };

  const updateSlotUnderMouse = (clientX: number, clientY: number) => {
    const ghost = mouseGhostRef.current;
    if (ghost) ghost.style.display = "none";
    const el = document.elementFromPoint(clientX, clientY);
    if (ghost) ghost.style.display = "";
    const slotEl = el?.closest("[data-slot-user-id]") as HTMLElement | null;
    if (slotEl) {
      const userId = slotEl.getAttribute("data-slot-user-id") || "";
      const hour = Number(slotEl.getAttribute("data-slot-hour") || 0);
      const minute = Number(slotEl.getAttribute("data-slot-minute") || 0);
      const dateStr = slotEl.getAttribute("data-slot-date-str") || "";
      setDraggedOverSlot({ userId, hour, minute, dateStr });
      mouseTargetSlotRef.current = { userId, hour, minute, dateStr };
    } else {
      mouseTargetSlotRef.current = null;
    }
  };

  const handleMouseDownApp = (e: React.MouseEvent, app: Appointment) => {
    if (!canCreateOrEditAppointment(currentUser)) return;
    if (e.button !== 0) return; // left click only
    mouseDraggedAppRef.current = app;
    mouseTargetSlotRef.current = null;
    isMouseDraggingRef.current = false;
    mouseDragStartPos.current = { x: e.clientX, y: e.clientY };

    const onMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - mouseDragStartPos.current.x;
      const dy = me.clientY - mouseDragStartPos.current.y;
      if (!isMouseDraggingRef.current && Math.sqrt(dx * dx + dy * dy) > 5) {
        isMouseDraggingRef.current = true;
        setDraggedApp(mouseDraggedAppRef.current);
        createMouseGhost(app, me.clientX, me.clientY);
        document.body.classList.add("agenda-dragging");
      }
      if (isMouseDraggingRef.current && mouseGhostRef.current) {
        mouseGhostRef.current.style.left = `${me.clientX - 60}px`;
        mouseGhostRef.current.style.top = `${me.clientY - 20}px`;
        updateSlotUnderMouse(me.clientX, me.clientY);
      }
    };

    const onMouseUp = async (mue: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      removeMouseGhost();
      document.body.classList.remove("agenda-dragging");

      const appToMove = mouseDraggedAppRef.current;
      const slot = mouseTargetSlotRef.current;
      const wasDragging = isMouseDraggingRef.current;

      mouseDraggedAppRef.current = null;
      mouseTargetSlotRef.current = null;
      isMouseDraggingRef.current = false;
      setDraggedApp(null);
      setDraggedOverSlot(null);

      if (wasDragging) {
        // Suppress the next click so the appointment modal doesn't open
        const suppressClick = (ce: MouseEvent) => {
          ce.stopPropagation();
          ce.preventDefault();
          window.removeEventListener("click", suppressClick, true);
        };
        window.addEventListener("click", suppressClick, true);
        if (appToMove && slot) {
          const timeStr = `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`;
          await handleMoveAppointment(appToMove, slot.userId, slot.dateStr, timeStr);
        }
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Keep these stubs so quarter slot JSX compiles (onDragOver/onDrop on slots no longer needed but kept for safety)
  const handleDragStart = (_e: React.DragEvent, _app: Appointment) => {};
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragEnter = (e: React.DragEvent, _userId: string, _hour: number, _minute: number, _dateObj: Date) => { e.preventDefault(); };
  const handleDragEnd = () => {};
  const handleDrop = (e: React.DragEvent, _newUserId: string, _hour: number, _minute: number, _dateObj: Date) => { e.preventDefault(); };

  // Save clinical follow-up (Seguimientos)
  const handleSaveSeguimiento = async () => {
    if (!selectedAppointment) return;

    const serializedNotes = JSON.stringify({
      observaciones: segObservaciones,
      diagnostico: segDiagnostico,
      operacion: segOperacion,
      tratamiento: segTratamiento,
      medicacion: segMedicacion,
      materialLotes: segMaterialLotes
    });

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAppointment.id,
          notes: serializedNotes,
          actorName: currentUser ? currentUser.name : "Sistema",
          actorId: currentUser?.id,
        }),
      });

      if (res.ok) {
        const updatedApp = { ...selectedAppointment, notes: serializedNotes };
        setSelectedAppointment(updatedApp);
        fetchAppointments();
        triggerAutoSync();
        toast.success("Seguimiento guardado correctamente.");
      } else {
        toast.error("Error al guardar el seguimiento.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el seguimiento.");
    }
  };

  // Time Block creation and deletion
  const handleCreateTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleCreateTimeBlock triggered", {
      blockTitle,
      formUserId,
      selectedBlockDates,
      blockStartTime,
      blockEndTime,
      activeClinic
    });

    if (!blockTitle || !formUserId || selectedBlockDates.length === 0 || !blockStartTime || !blockEndTime || !activeClinic) {
      toast.warning("Por favor, rellene todos los campos para crear el bloqueo.");
      return;
    }

    try {
      for (const dateStr of selectedBlockDates) {
        const startDateTime = new Date(`${dateStr}T${blockStartTime}`);
        const endDateTime = new Date(`${dateStr}T${blockEndTime}`);

        if (endDateTime.getTime() <= startDateTime.getTime()) {
          throw new Error(`La hora final debe ser posterior a la hora de inicio para el día ${dateStr}.`);
        }

        const payload = {
          title: blockTitle,
          userId: formUserId,
          clinicId: activeClinic.id,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          notes: blockNotes,
        };

        const res = await fetch("/api/time-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "error desconocido");
        }
      }

      setShowBlockModal(false);
      fetchAppointments();
      triggerAutoSync();
    } catch (err: any) {
      console.error("Error creating time blocks:", err);
      toast.error(`Error al crear el bloqueo: ${err.message || err}`);
    }
  };

  const handleDeleteTimeBlock = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este bloqueo de tiempo?")) return;
    try {
      const res = await fetch(`/api/time-blocks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowBlockDetailModal(false);
        setSelectedTimeBlock(null);
        fetchAppointments();
        triggerAutoSync();
      } else {
        toast.success("Error al eliminar el bloqueo");
      }
    } catch (err) {
      console.error("Error deleting time block:", err);
      toast.error("Error en el servidor");
    }
  };

  const handleUpdateTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimeBlock) return;
    
    const origStart = new Date(selectedTimeBlock.start);
    const yyyy = origStart.getFullYear();
    const mm = String(origStart.getMonth() + 1).padStart(2, "0");
    const dd = String(origStart.getDate()).padStart(2, "0");
    const dateFormatted = `${yyyy}-${mm}-${dd}`;

    const startDateTime = new Date(`${dateFormatted}T${blockStartTime}`);
    const endDateTime = new Date(`${dateFormatted}T${blockEndTime}`);

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      toast.warning("La hora final debe ser posterior a la hora de inicio.");
      return;
    }

    try {
      const res = await fetch(`/api/time-blocks/${selectedTimeBlock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: blockTitle,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          notes: blockNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "error desconocido");
      }

      setShowBlockDetailModal(false);
      setSelectedTimeBlock(null);
      fetchAppointments();
      triggerAutoSync();
    } catch (err: any) {
      console.error("Error updating time block:", err);
      toast.error(`Error al actualizar el bloqueo: ${err.message || err}`);
    }
  };

  const handleConvertBlockToAppointment = () => {
    if (!selectedTimeBlock) return;
    
    setConvertClientId("");
    setConvertServiceId(servicesList[0]?.id || "");
    setConvertLocationId(activeClinic?.id || "");
    
    setShowBlockDetailModal(false);
    setShowConvertModal(true);
  };

  const handleExecuteConvertBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimeBlock || !convertClientId || !convertServiceId || !convertLocationId) return;

    try {
      const deleteRes = await fetch(`/api/time-blocks/${selectedTimeBlock.id}`, {
        method: "DELETE",
      });

      if (!deleteRes.ok) {
        toast.success("Error al eliminar la reserva de tiempo para la conversión.");
        return;
      }

      const appPayload = {
        clientId: convertClientId,
        userId: selectedTimeBlock.userId,
        serviceId: convertServiceId,
        clinicId: convertLocationId,
        start: selectedTimeBlock.start,
        end: selectedTimeBlock.end,
        status: "PENDING",
        notes: selectedTimeBlock.notes || "",
        actorName: currentUser ? currentUser.name : "Sistema",
        actorId: currentUser?.id,
      };

      const createRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appPayload),
      });

      if (!createRes.ok) {
        toast.error("Error al crear la cita.");
        return;
      }

      setShowConvertModal(false);
      setSelectedTimeBlock(null);
      fetchAppointments();
      toast.success("Reserva de tiempo convertida en cita con éxito.");
    } catch (err) {
      console.error("Error converting block to appointment:", err);
      toast.error("Error al realizar la conversión.");
    }
  };

  const handleAddToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistClientId || !activeClinic) {
      toast.warning("Por favor, selecciona un paciente.");
      return;
    }

    try {
      const payload = {
        clientId: waitlistClientId,
        userId: waitlistUserId === "all" ? null : waitlistUserId,
        serviceId: waitlistServiceId === "all" ? null : waitlistServiceId,
        clinicId: activeClinic.id,
        notes: waitlistNotes,
        preferredDayOfWeek: waitlistPreferredDay === "all" ? null : Number(waitlistPreferredDay),
        preferredTimeRange: waitlistPreferredTime === "all" ? null : waitlistPreferredTime,
      };

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchWaitlist();
        setWaitlistSubView("list");
        toast.success("Paciente añadido a la lista de espera con éxito.");
      } else {
        toast.error("Error al añadir a la lista de espera.");
      }
    } catch (err) {
      console.error("Error adding to waitlist:", err);
      toast.error("Error al procesar la solicitud.");
    }
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar a este paciente de la lista de espera?")) return;

    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchWaitlist();
        toast.info("Entrada eliminada con éxito.");
      } else {
        toast.success("Error al eliminar de la lista de espera.");
      }
    } catch (err) {
      console.error("Error deleting waitlist entry:", err);
      toast.error("Error al procesar la solicitud.");
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 15) {
        if (hour === 20 && min > 0) break;
        const hStr = String(hour).padStart(2, "0");
        const mStr = String(min).padStart(2, "0");
        options.push(`${hStr}:${mStr}`);
      }
    }
    return options;
  };
  const timeOptions = generateTimeOptions();

  // Render Day View
  const renderDayView = () => {
    const hours = mostrar24Horas
      ? Array.from({ length: 24 }, (_, i) => i) // 0:00 to 23:00
      : Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00 (ends at 21:00)
    const visibleStaff = staffList.filter((s) => checkedStaffIds.includes(s.id));

    if (visibleStaff.length === 0) {
      return (
        <div className={styles.emptyGrid}>
          Selecciona al menos un miembro del personal para ver su agenda.
        </div>
      );
    }

    return (
      <div className={styles.dayGridContainer} style={{ "--hour-row-height": `${60 * zoomScale}px` } as React.CSSProperties}>
        {/* Hour column on left */}
        <div className={styles.timeColumn} style={{ position: "relative" }}>
          <div className={styles.columnHeaderSpace}>Hora</div>
          {hours.map((hour) => (
            <div key={hour} className={styles.hourCell}>
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
          {isTimeIndicatorVisible(currentDate, hours.length) && (
            <div 
              className={styles.timeColumnIndicatorBadge}
              style={{ transform: `translateY(calc(-50% + ${45 + indicatorData.topOffset}px))` }}
            >
              {indicatorData.timeStr}
            </div>
          )}
        </div>

        {/* Staff columns side-by-side */}
        <div className={styles.staffColumnsContainer}>
          {visibleStaff.map((staff) => {
            // Get appointments for this staff member today
            const staffApps = appointments.filter(
              (app) =>
                app.userId === staff.id &&
                (selectedServiceId === "all" || app.serviceId === selectedServiceId) &&
                (filterClientId === "all" || app.clientId === filterClientId) &&
                (filterClinicId === "all" || app.clinicId === filterClinicId) &&
                (clientSearchQuery === "" ||
                  `${app.client.firstName} ${app.client.lastName}`
                    .toLowerCase()
                    .includes(clientSearchQuery.toLowerCase()))
            );

            // Get time blocks for this staff member today
            const staffBlocks = timeBlocks.filter(
              (block) =>
                block.userId === staff.id &&
                new Date(block.start).toDateString() === currentDate.toDateString()
            );

            const dayLayouts = getAppointmentLayouts(staffApps);

            return (
              <div key={staff.id} className={styles.staffColumn}>
                <div 
                  className={styles.staffColumnHeader} 
                  style={quitarNombreSemanal 
                    ? { display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 0 } 
                    : { display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", justifyContent: "flex-start", padding: "0 12px" }
                  }
                >
                  <div className={styles.staffMiniAvatar} style={{ width: "30px", height: "30px", fontSize: "12px", flexShrink: 0, backgroundColor: staff.color || "#3b82f6" }}>
                    {`${staff.name} ${staff.lastName || ""}`
                      .trim()
                      .split(/\s+/)
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  {!quitarNombreSemanal && (
                    <span className={styles.staffName} style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {staff.name} {staff.lastName || ""}
                    </span>
                  )}
                </div>

                {/* Column Body Grid */}
                <div className={styles.columnGridBody} style={{ height: `${hours.length * 60 * zoomScale}px` }}>
                  {isTimeIndicatorVisible(currentDate, hours.length) && (
                    <div 
                      className={styles.currentTimeLine} 
                      style={{ transform: `translateY(${indicatorData.topOffset}px)` }}
                    />
                  )}
                  {hours.map((hour) => {
                    const dateStr = currentDate.getFullYear() + "-" + String(currentDate.getMonth() + 1).padStart(2, "0") + "-" + String(currentDate.getDate()).padStart(2, "0");
                    const isDraggedOver00 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 0 && draggedOverSlot.dateStr === dateStr;
                    const isDraggedOver15 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 15 && draggedOverSlot.dateStr === dateStr;
                    const isDraggedOver30 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 30 && draggedOverSlot.dateStr === dateStr;
                    const isDraggedOver45 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 45 && draggedOverSlot.dateStr === dateStr;

                    return (
                      <div key={hour} className={styles.hourRow}>
                        {/* 15-minute sub-intervals shown on hover */}
                        <div className={styles.quarterIntervals}>
                          <div 
                            className={`${styles.quarter} ${isSlotOutsideShift(staff, currentDate, hour, 0) ? styles.outsideShiftSlot : ""} ${isDraggedOver00 ? styles.dragOverSlot : ""}`} 
                            onClick={() => handleSlotClick(staff.id, hour, 0)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 0, currentDate)}
                            onDrop={(e) => handleDrop(e, staff.id, hour, 0, currentDate)}
                            data-slot-user-id={staff.id}
                            data-slot-hour={hour}
                            data-slot-minute={0}
                            data-slot-date-str={dateStr}
                          >
                            <span>+ {String(hour).padStart(2, "0")}:00</span>
                          </div>
                          <div 
                            className={`${styles.quarter} ${isSlotOutsideShift(staff, currentDate, hour, 15) ? styles.outsideShiftSlot : ""} ${isDraggedOver15 ? styles.dragOverSlot : ""}`} 
                            onClick={() => handleSlotClick(staff.id, hour, 15)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 15, currentDate)}
                            onDrop={(e) => handleDrop(e, staff.id, hour, 15, currentDate)}
                            data-slot-user-id={staff.id}
                            data-slot-hour={hour}
                            data-slot-minute={15}
                            data-slot-date-str={dateStr}
                          >
                            <span>+ {String(hour).padStart(2, "0")}:15</span>
                          </div>
                          <div 
                            className={`${styles.quarter} ${isSlotOutsideShift(staff, currentDate, hour, 30) ? styles.outsideShiftSlot : ""} ${isDraggedOver30 ? styles.dragOverSlot : ""}`} 
                            onClick={() => handleSlotClick(staff.id, hour, 30)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 30, currentDate)}
                            onDrop={(e) => handleDrop(e, staff.id, hour, 30, currentDate)}
                            data-slot-user-id={staff.id}
                            data-slot-hour={hour}
                            data-slot-minute={30}
                            data-slot-date-str={dateStr}
                          >
                            <span>+ {String(hour).padStart(2, "0")}:30</span>
                          </div>
                          <div 
                            className={`${styles.quarter} ${isSlotOutsideShift(staff, currentDate, hour, 45) ? styles.outsideShiftSlot : ""} ${isDraggedOver45 ? styles.dragOverSlot : ""}`} 
                            onClick={() => handleSlotClick(staff.id, hour, 45)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 45, currentDate)}
                            onDrop={(e) => handleDrop(e, staff.id, hour, 45, currentDate)}
                            data-slot-user-id={staff.id}
                            data-slot-hour={hour}
                            data-slot-minute={45}
                            data-slot-date-str={dateStr}
                          >
                            <span>+ {String(hour).padStart(2, "0")}:45</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Absolute positioned appointments */}
                  {staffApps.map((app) => {
                    const startD = new Date(app.start);
                    const endD = new Date(app.end);
                    
                    const startHours = startD.getHours();
                    const startMins = startD.getMinutes();
                    const endHours = endD.getHours();
                    const endMins = endD.getMinutes();

                    // Calculate positioning relative to dynamic startHour.
                    const startHour = mostrar24Horas ? 0 : 8;
                    const startTotalMins = startHours * 60 + startMins;
                    const offsetMins = startTotalMins - startHour * 60;
                    const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                    // Compute styles: scale according to zoomLevel.
                    const top = offsetMins * zoomScale;
                    const height = durationMins * zoomScale;

                    // Clamp to visible hours boundary
                    const maxMins = (startHour + hours.length) * 60;
                    if (startTotalMins < startHour * 60 || startTotalMins >= maxMins) return null;

                    let statusClass = styles.statusPending;
                    if (app.status === "CONFIRMED") statusClass = styles.statusConfirmed;
                    if (app.status === "COMPLETED") statusClass = styles.statusCompleted;
                    if (app.status === "CANCELLED") statusClass = styles.statusCancelled;

                    const staffIdx = visibleStaff.findIndex(s => s.id === staff.id);
                    const isRightHalf = visibleStaff.length > 1 && staffIdx >= visibleStaff.length / 2;

                    let cardSizeClass = "";
                    if (durationMins < 25) {
                      cardSizeClass = styles.microCard;
                    } else if (durationMins < 45) {
                      cardSizeClass = styles.miniCard;
                    }

                    const appLayout = dayLayouts[app.id] || { left: "6px", width: "calc(100% - 12px)" };

                    return (
                      <div
                        key={app.id}
                        className={`${styles.appointmentCard} ${statusClass} ${cardSizeClass} ${draggedApp?.id === app.id ? styles.isDraggingCard : ""}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: appLayout.left,
                          width: appLayout.width,
                          right: "auto",
                          borderLeftColor: app.service.color || "var(--primary)",
                          padding: height < 25 ? "2px 6px" : height < 45 ? "4px 6px" : undefined,
                        }}
                        onClick={(e) => handleAppointmentClick(app, e)}
                        onMouseDown={(e) => handleMouseDownApp(e, app)}
                        onTouchStart={(e) => handleTouchStartApp(e, app)}
                        onTouchMove={handleTouchMoveApp}
                        onTouchEnd={handleTouchEndApp}
                        onTouchCancel={handleTouchEndApp}
                      >
                        <div className={styles.appCardHeader}>
                          <div className={styles.appClient} style={{ margin: 0, padding: 0, minWidth: 0, flex: 1, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "3px" }}>
                            {app.tags && app.tags.split(",").filter(Boolean).map(tagStr => {
                              const [tagName, tagColor] = tagStr.split(":");
                              return (
                                <span 
                                  key={tagName} 
                                  style={{ 
                                    width: "8px", 
                                    height: "8px", 
                                    borderRadius: "50%", 
                                    backgroundColor: tagColor || "#ef4444", 
                                    display: "inline-block",
                                    flexShrink: 0
                                  }} 
                                  title={tagName}
                                />
                              );
                            })}
                            <span>{app.client.firstName} {app.client.lastName}</span>
                          </div>
                          <span className={`${styles.statusDot} ${styles[app.status.toLowerCase()]}`} style={{ flexShrink: 0, marginLeft: "6px" }}></span>
                          {savingAppIds.includes(app.id) && (
                            <svg className={styles.spinningIconMini} viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "4px", opacity: 0.8 }}>
                              <line x1="12" y1="2" x2="12" y2="6"></line>
                              <line x1="12" y1="18" x2="12" y2="22"></line>
                              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                              <line x1="2" y1="12" x2="6" y2="12"></line>
                              <line x1="18" y1="12" x2="22" y2="12"></line>
                              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                            </svg>
                          )}
                        </div>
                        <div className={styles.appTime}>
                          {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                        </div>
                        <div className={styles.appService}>
                          {app.service.name}
                        </div>

                        {/* Tooltip on hover */}
                        {!draggedApp && !touchDraggedApp && (
                          <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                          <div className={styles.tooltipUserRow}>
                            <div className={styles.tooltipAvatar}>
                              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            </div>
                            <div className={styles.tooltipUserInfo}>
                              <div className={styles.tooltipUserName}>
                                {`${app.client.firstName} ${app.client.lastName}`.toUpperCase()}
                              </div>
                              <div className={styles.tooltipUserPhone}>
                                {app.client.phone || "Sin teléfono"}
                              </div>
                            </div>
                          </div>

                          <div className={styles.tooltipDivider} />

                          <div className={styles.tooltipDetailsRow}>
                            <div 
                              className={styles.tooltipTimeBox}
                              style={{ borderLeft: `4px solid ${app.service.color || "var(--primary)"}` }}
                            >
                              <div className={styles.tooltipTimeText}>
                                {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                              </div>
                              <div className={styles.tooltipTimeText}>
                                {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                              </div>
                            </div>
                            <div className={styles.tooltipServiceInfo}>
                              <div className={styles.tooltipServiceName}>{app.service.name}</div>
                              <div className={styles.tooltipServiceDate}>
                                {(() => {
                                  const yy = String(startD.getFullYear()).slice(-2);
                                  const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                  const dd = String(startD.getDate()).padStart(2, "0");
                                  return `${dd}.${mm}.${yy}`;
                                })()}
                              </div>
                            </div>
                          </div>

                          {app.notes && (
                            <>
                              <div className={styles.tooltipDivider} />
                              <div className={styles.tooltipNotesSection}>
                                <div className={styles.tooltipNotesHeader}>
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <span>Nota interna</span>
                                </div>
                                <div className={styles.tooltipNotesContent}>
                                  {app.notes}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Absolute positioned time blocks */}
                  {staffBlocks.map((block) => {
                    const startD = new Date(block.start);
                    const endD = new Date(block.end);

                    const startHours = startD.getHours();
                    const startMins = startD.getMinutes();
                    const endHours = endD.getHours();
                    const endMins = endD.getMinutes();

                    const startHour = mostrar24Horas ? 0 : 8;
                    const startTotalMins = startHours * 60 + startMins;
                    const offsetMins = startTotalMins - startHour * 60; // relative to startHour
                    const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                    const top = offsetMins * zoomScale;
                    const height = durationMins * zoomScale;

                    const maxMins = (startHour + hours.length) * 60;
                    if (startTotalMins < startHour * 60 || startTotalMins >= maxMins) return null;

                    const staffIdx = visibleStaff.findIndex(s => s.id === staff.id);
                    const isRightHalf = visibleStaff.length > 1 && staffIdx >= visibleStaff.length / 2;

                    return (
                      <div
                        key={block.id}
                        className={`${styles.appointmentCard} ${styles.timeBlockCard}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimeBlock(block);
                          setBlockTitle(block.title);
                          const stD = new Date(block.start);
                          const enD = new Date(block.end);
                          const sh = String(stD.getHours()).padStart(2, "0");
                          const sm = String(stD.getMinutes()).padStart(2, "0");
                          const eh = String(enD.getHours()).padStart(2, "0");
                          const em = String(enD.getMinutes()).padStart(2, "0");
                          setBlockStartTime(`${sh}:${sm}`);
                          setBlockEndTime(`${eh}:${em}`);
                          setBlockNotes(block.notes || "");
                          setShowBlockDetailModal(true);
                        }}
                      >
                        <div className={styles.appCardHeader}>
                          <span className={styles.appTime}>
                            {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                          </span>
                          <Icons.Lock size={12} className={styles.blockLockIcon} />
                        </div>
                        <div className={styles.blockTitle}>
                          {block.title}
                        </div>
                        {block.notes && (
                          <div className={styles.blockNotes}>
                            {block.notes}
                          </div>
                        )}

                        {/* Tooltip on hover for time block */}
                        {!draggedApp && !touchDraggedApp && (
                        <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                          <div className={styles.tooltipDetailsRow}>
                            <div 
                              className={styles.tooltipTimeBox}
                              style={{ borderLeft: `4px solid #babcbe` }}
                            >
                              <div className={styles.tooltipTimeText}>
                                {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                              </div>
                              <div className={styles.tooltipTimeText}>
                                {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                              </div>
                            </div>
                            <div className={styles.tooltipServiceInfo}>
                              <div className={styles.tooltipServiceName}>{block.title}</div>
                              <div className={styles.tooltipServiceDate}>
                                {(() => {
                                  const yy = String(startD.getFullYear()).slice(-2);
                                  const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                  const dd = String(startD.getDate()).padStart(2, "0");
                                  return `${dd}.${mm}.${yy}`;
                                })()}
                              </div>
                            </div>
                          </div>

                          {block.notes && (
                            <>
                              <div className={styles.tooltipDivider} />
                              <div className={styles.tooltipNotesSection}>
                                <div className={styles.tooltipNotesHeader}>
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <span>Nota interna</span>
                                </div>
                                <div className={styles.tooltipNotesContent}>
                                  {block.notes}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const hours = mostrar24Horas
      ? Array.from({ length: 24 }, (_, i) => i) // 0:00 to 23:00
      : Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00 (ends at 21:00)
    const visibleStaff = staffList.filter((s) => checkedStaffIds.includes(s.id));

    if (visibleStaff.length === 0) {
      return (
        <div className={styles.emptyGrid}>
          Selecciona al menos un miembro del personal para ver su agenda.
        </div>
      );
    }

    // Compute the dates for this week
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const weekDates = Array.from({ length: hideWeekends ? 5 : 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    const hasToday = now && weekDates.some((d) => d.toDateString() === now.toDateString());

    return (
      <div className={styles.weekGridContainer} style={{ "--hour-row-height": `${60 * zoomScale}px` } as React.CSSProperties}>
        {/* Left Hour Column */}
        <div className={styles.timeColumn} style={{ position: "relative" }}>
          <div className={styles.columnHeaderSpace}>Hora</div>
          <div className={styles.weekStaffSubheaderSpace} />
          {hours.map((hour) => (
            <div key={hour} className={styles.hourCell}>
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
          {hasToday && indicatorData.totalMinutesFromStart >= 0 && indicatorData.totalMinutesFromStart < hours.length * 60 && (
            <div 
              className={styles.timeColumnIndicatorBadge}
              style={{ transform: `translateY(calc(-50% + ${79 + indicatorData.topOffset}px))` }}
            >
              {indicatorData.timeStr}
            </div>
          )}
        </div>

        {/* Days grid container */}
        <div className={styles.weekDaysContainer}>
          {weekDates.map((dateObj, idx) => {
            const isToday = new Date().toDateString() === dateObj.toDateString();
            return (
              <div key={idx} className={`${styles.weekDayColumn} ${isToday ? styles.todayColumn : ""}`}>
                {/* Day Header: Lunes 22.06.2026 */}
                <div className={styles.weekDayHeader}>
                  <span className={styles.weekDayLabel}>
                    {daysOfWeek[idx]} {dateObj.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>

                {/* Sub-columns container for selected staff */}
                <div className={styles.weekDayStaffColumns}>
                  {visibleStaff.map((staff) => {
                    // Filter appointments for this day and user
                    const staffDayApps = appointments.filter((app) => {
                      const appD = new Date(app.start);
                      return (
                        app.userId === staff.id &&
                        appD.toDateString() === dateObj.toDateString() &&
                        (selectedServiceId === "all" || app.serviceId === selectedServiceId) &&
                        (filterClientId === "all" || app.clientId === filterClientId) &&
                        (filterClinicId === "all" || app.clinicId === filterClinicId) &&
                        (clientSearchQuery === "" ||
                          `${app.client.firstName} ${app.client.lastName}`
                            .toLowerCase()
                            .includes(clientSearchQuery.toLowerCase()))
                      );
                    });

                    // Filter time blocks for this day and user
                    const staffDayBlocks = timeBlocks.filter((block) => {
                      const blockD = new Date(block.start);
                      return (
                        block.userId === staff.id &&
                        blockD.toDateString() === dateObj.toDateString()
                      );
                    });

                    const dayLayouts = getAppointmentLayouts(staffDayApps);

                    return (
                      <div key={staff.id} className={styles.weekDayStaffColumn}>
                        {/* Staff Subheader: [Avatar] Name */}
                        <div className={styles.weekDayStaffSubheader} style={quitarNombreSemanal ? { justifyContent: "center", padding: 0 } : undefined}>
                          <div className={styles.staffMiniAvatar} style={{ backgroundColor: staff.color || "#3b82f6" }}>
                            {`${staff.name} ${staff.lastName || ""}`
                              .trim()
                              .split(/\s+/)
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          {!quitarNombreSemanal && (
                            <span className={styles.staffMiniName}>{staff.name} {staff.lastName || ""}</span>
                          )}
                        </div>

                        {/* Column body with hour grids and absolute appointments */}
                        <div className={styles.columnGridBody} style={{ height: `${hours.length * 60 * zoomScale}px` }}>
                          {hasToday && indicatorData.totalMinutesFromStart >= 0 && indicatorData.totalMinutesFromStart < hours.length * 60 && (
                            <div 
                              className={styles.currentTimeLine} 
                              style={{ transform: `translateY(${indicatorData.topOffset}px)` }}
                            />
                          )}
                          {hours.map((hour) => {
                            const colDateStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, "0") + "-" + String(dateObj.getDate()).padStart(2, "0");
                            const isDraggedOver00 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 0 && draggedOverSlot.dateStr === colDateStr;
                            const isDraggedOver15 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 15 && draggedOverSlot.dateStr === colDateStr;
                            const isDraggedOver30 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 30 && draggedOverSlot.dateStr === colDateStr;
                            const isDraggedOver45 = draggedOverSlot && draggedOverSlot.userId === staff.id && draggedOverSlot.hour === hour && draggedOverSlot.minute === 45 && draggedOverSlot.dateStr === colDateStr;

                            return (
                              <div key={hour} className={styles.hourRow}>
                                <div className={styles.quarterIntervals}>
                                  <div 
                                    className={`${styles.quarter} ${isSlotOutsideShift(staff, dateObj, hour, 0) ? styles.outsideShiftSlot : ""} ${isDraggedOver00 ? styles.dragOverSlot : ""}`} 
                                    onClick={() => handleSlotClick(staff.id, hour, 0, dateObj)}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 0, dateObj)}
                                    onDrop={(e) => handleDrop(e, staff.id, hour, 0, dateObj)}
                                    data-slot-user-id={staff.id}
                                    data-slot-hour={hour}
                                    data-slot-minute={0}
                                    data-slot-date-str={colDateStr}
                                  >
                                    <span>+ {String(hour).padStart(2, "0")}:00</span>
                                  </div>
                                  <div 
                                    className={`${styles.quarter} ${isSlotOutsideShift(staff, dateObj, hour, 15) ? styles.outsideShiftSlot : ""} ${isDraggedOver15 ? styles.dragOverSlot : ""}`} 
                                    onClick={() => handleSlotClick(staff.id, hour, 15, dateObj)}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 15, dateObj)}
                                    onDrop={(e) => handleDrop(e, staff.id, hour, 15, dateObj)}
                                    data-slot-user-id={staff.id}
                                    data-slot-hour={hour}
                                    data-slot-minute={15}
                                    data-slot-date-str={colDateStr}
                                  >
                                    <span>+ {String(hour).padStart(2, "0")}:15</span>
                                  </div>
                                  <div 
                                    className={`${styles.quarter} ${isSlotOutsideShift(staff, dateObj, hour, 30) ? styles.outsideShiftSlot : ""} ${isDraggedOver30 ? styles.dragOverSlot : ""}`} 
                                    onClick={() => handleSlotClick(staff.id, hour, 30, dateObj)}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 30, dateObj)}
                                    onDrop={(e) => handleDrop(e, staff.id, hour, 30, dateObj)}
                                    data-slot-user-id={staff.id}
                                    data-slot-hour={hour}
                                    data-slot-minute={30}
                                    data-slot-date-str={colDateStr}
                                  >
                                    <span>+ {String(hour).padStart(2, "0")}:30</span>
                                  </div>
                                  <div 
                                    className={`${styles.quarter} ${isSlotOutsideShift(staff, dateObj, hour, 45) ? styles.outsideShiftSlot : ""} ${isDraggedOver45 ? styles.dragOverSlot : ""}`} 
                                    onClick={() => handleSlotClick(staff.id, hour, 45, dateObj)}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(e, staff.id, hour, 45, dateObj)}
                                    onDrop={(e) => handleDrop(e, staff.id, hour, 45, dateObj)}
                                    data-slot-user-id={staff.id}
                                    data-slot-hour={hour}
                                    data-slot-minute={45}
                                    data-slot-date-str={colDateStr}
                                  >
                                    <span>+ {String(hour).padStart(2, "0")}:45</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Render appointments */}
                          {staffDayApps.map((app) => {
                            const startD = new Date(app.start);
                            const endD = new Date(app.end);
                            
                            const startHours = startD.getHours();
                            const startMins = startD.getMinutes();
                            const endHours = endD.getHours();
                            const endMins = endD.getMinutes();

                            const startHour = mostrar24Horas ? 0 : 8;
                            const startTotalMins = startHours * 60 + startMins;
                            const offsetMins = startTotalMins - startHour * 60;
                            const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                            const top = offsetMins * zoomScale;
                            const height = durationMins * zoomScale;

                            const maxMins = (startHour + hours.length) * 60;
                            if (startTotalMins < startHour * 60 || startTotalMins >= maxMins) return null;

                            let statusClass = styles.statusPending;
                            if (app.status === "CONFIRMED") statusClass = styles.statusConfirmed;
                            if (app.status === "COMPLETED") statusClass = styles.statusCompleted;
                            if (app.status === "CANCELLED") statusClass = styles.statusCancelled;

                            const isRightHalf = idx >= (hideWeekends ? 2 : 3);

                            let cardSizeClass = "";
                            if (durationMins < 25) {
                              cardSizeClass = styles.microCard;
                            } else if (durationMins < 45) {
                              cardSizeClass = styles.miniCard;
                            }

                            const appLayout = dayLayouts[app.id] || { left: "6px", width: "calc(100% - 12px)" };

                            return (
                              <div
                                key={app.id}
                                className={`${styles.appointmentCard} ${statusClass} ${cardSizeClass} ${draggedApp?.id === app.id ? styles.isDraggingCard : ""}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  left: appLayout.left,
                                  width: appLayout.width,
                                  right: "auto",
                                  borderLeftColor: app.service.color || "var(--primary)",
                                  padding: height < 25 ? "2px 4px" : height < 45 ? "3px 4px" : "4px 6px",
                                }}
                                onClick={(e) => handleAppointmentClick(app, e)}
                                onMouseDown={(e) => handleMouseDownApp(e, app)}
                                onTouchStart={(e) => handleTouchStartApp(e, app)}
                                onTouchMove={handleTouchMoveApp}
                                onTouchEnd={handleTouchEndApp}
                                onTouchCancel={handleTouchEndApp}
                              >
                                <div className={styles.appCardHeader} style={{ marginBottom: "2px" }}>
                                  <div className={styles.appClient} style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: "3px" }}>
                                    {app.tags && app.tags.split(",").filter(Boolean).map(tagStr => {
                                      const [tagName, tagColor] = tagStr.split(":");
                                      return (
                                        <span 
                                          key={tagName} 
                                          style={{ 
                                            width: "8px", 
                                            height: "8px", 
                                            borderRadius: "50%", 
                                            backgroundColor: tagColor || "#ef4444", 
                                            display: "inline-block",
                                            flexShrink: 0
                                          }} 
                                          title={tagName}
                                        />
                                      );
                                    })}
                                    <span>{app.client.firstName} {app.client.lastName}</span>
                                    {savingAppIds.includes(app.id) && (
                                      <svg className={styles.spinningIconMini} viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: "4px", opacity: 0.8 }}>
                                        <line x1="12" y1="2" x2="12" y2="6"></line>
                                        <line x1="12" y1="18" x2="12" y2="22"></line>
                                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                        <line x1="2" y1="12" x2="6" y2="12"></line>
                                        <line x1="18" y1="12" x2="22" y2="12"></line>
                                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.appTime} style={{ fontSize: "10px", fontWeight: 700 }}>
                                  {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                </div>
                                <div className={styles.appService} style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {app.service.name}
                                </div>

                                {/* Tooltip on hover */}
                                {!draggedApp && !touchDraggedApp && (
                                <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                                  <div className={styles.tooltipUserRow}>
                                    <div className={styles.tooltipAvatar}>
                                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                      </svg>
                                    </div>
                                    <div className={styles.tooltipUserInfo}>
                                      <div className={styles.tooltipUserName}>
                                        {`${app.client.firstName} ${app.client.lastName}`.toUpperCase()}
                                      </div>
                                      <div className={styles.tooltipUserPhone}>
                                        {app.client.phone || "Sin teléfono"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className={styles.tooltipDivider} />

                                  <div className={styles.tooltipDetailsRow}>
                                    <div 
                                      className={styles.tooltipTimeBox}
                                      style={{ borderLeft: `4px solid ${app.service.color || "var(--primary)"}` }}
                                    >
                                      <div className={styles.tooltipTimeText}>
                                        {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                                      </div>
                                      <div className={styles.tooltipTimeText}>
                                        {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                      </div>
                                    </div>
                                    <div className={styles.tooltipServiceInfo}>
                                      <div className={styles.tooltipServiceName}>{app.service.name}</div>
                                      <div className={styles.tooltipServiceDate}>
                                        {(() => {
                                          const yy = String(startD.getFullYear()).slice(-2);
                                          const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                          const dd = String(startD.getDate()).padStart(2, "0");
                                          return `${dd}.${mm}.${yy}`;
                                        })()}
                                      </div>
                                    </div>
                                  </div>

                                  {app.notes && (
                                    <>
                                      <div className={styles.tooltipDivider} />
                                      <div className={styles.tooltipNotesSection}>
                                        <div className={styles.tooltipNotesHeader}>
                                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                          </svg>
                                          <span>Nota interna</span>
                                        </div>
                                        <div className={styles.tooltipNotesContent}>
                                          {app.notes}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Render time blocks */}
                          {staffDayBlocks.map((block) => {
                            const startD = new Date(block.start);
                            const endD = new Date(block.end);
                            
                            const startHours = startD.getHours();
                            const startMins = startD.getMinutes();
                            const endHours = endD.getHours();
                            const endMins = endD.getMinutes();

                            const startHour = mostrar24Horas ? 0 : 8;
                            const startTotalMins = startHours * 60 + startMins;
                            const offsetMins = startTotalMins - startHour * 60;
                            const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                            const top = offsetMins * zoomScale;
                            const height = durationMins * zoomScale;

                            const maxMins = (startHour + hours.length) * 60;
                            if (startTotalMins < startHour * 60 || startTotalMins >= maxMins) return null;

                            const isRightHalf = idx >= (hideWeekends ? 2 : 3);

                            return (
                              <div
                                key={block.id}
                                className={`${styles.appointmentCard} ${styles.timeBlockCard}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  padding: "2px 4px",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTimeBlock(block);
                                  setBlockTitle(block.title);
                                  const stD = new Date(block.start);
                                  const enD = new Date(block.end);
                                  const sh = String(stD.getHours()).padStart(2, "0");
                                  const sm = String(stD.getMinutes()).padStart(2, "0");
                                  const eh = String(enD.getHours()).padStart(2, "0");
                                  const em = String(enD.getMinutes()).padStart(2, "0");
                                  setBlockStartTime(`${sh}:${sm}`);
                                  setBlockEndTime(`${eh}:${em}`);
                                  setBlockNotes(block.notes || "");
                                  setShowBlockDetailModal(true);
                                }}
                              >
                                <div className={styles.appCardHeader} style={{ marginBottom: "2px" }}>
                                  <span className={styles.appTime} style={{ fontSize: "10px", fontWeight: 700 }}>
                                    {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                  </span>
                                  <Icons.Lock size={10} className={styles.blockLockIcon} />
                                </div>
                                <div className={styles.blockTitle} style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {block.title}
                                </div>
                                {block.notes && (
                                  <div className={styles.blockNotes} style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {block.notes}
                                  </div>
                                )}

                                {/* Tooltip on hover for time block */}
                                <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                                  <div className={styles.tooltipDetailsRow}>
                                    <div 
                                      className={styles.tooltipTimeBox}
                                      style={{ borderLeft: `4px solid #babcbe` }}
                                    >
                                      <div className={styles.tooltipTimeText}>
                                        {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                                      </div>
                                      <div className={styles.tooltipTimeText}>
                                        {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                      </div>
                                    </div>
                                    <div className={styles.tooltipServiceInfo}>
                                      <div className={styles.tooltipServiceName}>{block.title}</div>
                                      <div className={styles.tooltipServiceDate}>
                                        {(() => {
                                          const yy = String(startD.getFullYear()).slice(-2);
                                          const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                          const dd = String(startD.getDate()).padStart(2, "0");
                                          return `${dd}.${mm}.${yy}`;
                                        })()}
                                      </div>
                                    </div>
                                  </div>

                                  {block.notes && (
                                    <>
                                      <div className={styles.tooltipDivider} />
                                      <div className={styles.tooltipNotesSection}>
                                        <div className={styles.tooltipNotesHeader}>
                                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                          </svg>
                                          <span>Nota interna</span>
                                        </div>
                                        <div className={styles.tooltipNotesContent}>
                                          {block.notes}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Month View
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay(); // Sunday=0
    // Adjust Mon=0, Sun=6
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysArray: Date[] = [];

    // Start date of the grid should be: firstDay minus adjustedFirstDay
    const gridStartDate = new Date(firstDay);
    gridStartDate.setDate(firstDay.getDate() - adjustedFirstDay);

    // We render exactly 42 cells (6 rows * 7 days)
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStartDate);
      d.setDate(gridStartDate.getDate() + i);
      daysArray.push(d);
    }

    const weekNames = hideWeekends
      ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
      : ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    const filteredDaysArray = hideWeekends
      ? daysArray.filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
      : daysArray;

    return (
      <div className={styles.monthContainer}>
        <div 
          className={styles.monthWeekHeader}
          style={{ gridTemplateColumns: hideWeekends ? "repeat(5, 1fr)" : "repeat(7, 1fr)" }}
        >
          {weekNames.map((n) => (
            <div key={n} className={styles.monthWeekLabel}>{n}</div>
          ))}
        </div>
        
        <div 
          className={styles.monthGrid}
          style={{ gridTemplateColumns: hideWeekends ? "repeat(5, 1fr)" : "repeat(7, 1fr)" }}
        >
          {filteredDaysArray.map((dayDate, idx) => {
            const isToday = new Date().toDateString() === dayDate.toDateString();
            const isOutside = dayDate.getMonth() !== month;

            // Filter appointments for this date and selected staff
            const dayApps = appointments.filter((app) => {
              const appD = new Date(app.start);
              return (
                appD.toDateString() === dayDate.toDateString() &&
                checkedStaffIds.includes(app.userId) &&
                (selectedServiceId === "all" || app.serviceId === selectedServiceId) &&
                (clientSearchQuery === "" ||
                  `${app.client.firstName} ${app.client.lastName}`
                    .toLowerCase()
                    .includes(clientSearchQuery.toLowerCase()))
              );
            });

            // Filter time blocks for this date and selected staff
            const dayBlocks = timeBlocks.filter((block) => {
              const blockD = new Date(block.start);
              return (
                blockD.toDateString() === dayDate.toDateString() &&
                checkedStaffIds.includes(block.userId)
              );
            });

            // Format day label: "1 Jun." or "Hoy" or just number "2"
            let dayLabel = "";
            if (dayDate.getDate() === 1) {
              const shortMonth = dayDate.toLocaleDateString("es-ES", { month: "short" });
              dayLabel = `1 ${shortMonth.replace(".", "")}.`;
            } else if (isToday) {
              dayLabel = "Hoy";
            } else {
              dayLabel = String(dayDate.getDate());
            }

            return (
              <div
                key={idx}
                className={`${styles.monthDayCell} ${isToday ? styles.monthTodayCell : ""} ${isOutside ? styles.monthDayOutside : styles.monthDayClickable}`}
                style={{
                  borderRight: (idx + 1) % (hideWeekends ? 5 : 7) === 0 ? "none" : undefined
                }}
                 onClick={!isOutside ? () => {
                  setCurrentDate(dayDate);
                  setView("day");
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("agenda_view", "day");
                  }
                } : undefined}
              >
                <span className={styles.monthDayNum}>{dayLabel}</span>
                {(dayApps.length > 0 || dayBlocks.length > 0) && (
                  <div className={styles.monthAppsCount}>
                    {dayApps.length > 0 && <div>{dayApps.length} {dayApps.length === 1 ? "cita" : "citas"}</div>}
                    {dayBlocks.length > 0 && <div>{dayBlocks.length} {dayBlocks.length === 1 ? "bloqueo" : "bloqueos"}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Daily Summary statistics calculations for currentDate
  const dailyApps = appointments.filter((app) => {
    const appDate = new Date(app.start);
    return appDate.toDateString() === currentDate.toDateString();
  });
  const totalDaily = dailyApps.length;
  const completedDaily = dailyApps.filter((app) => app.status === "COMPLETED").length;
  const pendingDaily = dailyApps.filter((app) => app.status === "PENDING" || app.status === "CONFIRMED" || !app.status).length;
  const cancelledDaily = dailyApps.filter((app) => app.status === "CANCELLED" || app.status === "NOSHOW").length;
  const totalRevenueDaily = dailyApps
    .filter((app) => app.status !== "CANCELLED" && app.status !== "NOSHOW")
    .reduce((sum, app) => sum + (app.service?.price || 0), 0);

  return (
    <div className={styles.container}>
      {/* Filters & Header Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className={styles.title}>{translate("agendaTitle", language)}</h1>
            {googleSyncing && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Icons.Sync size={12} className={styles.spinningIcon} />
                Sincronizando...
              </span>
            )}
            {!googleSyncing && syncSuccess && (
              <span style={{ fontSize: "12px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                ✓ Sincronizado
              </span>
            )}
          </div>
          <span className={styles.clinicSubtitle}>{activeClinic?.name}</span>
        </div>

        <div className={styles.toolbarFilters}>
          {/* Client Search */}
          <div className={styles.searchBox}>
            <Icons.Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar paciente..."
              className={styles.searchInput}
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className={styles.dashboardBody}>
        {/* Main Calendar View Area */}
        <section className={styles.calendarArea}>
          {/* Daily Mini Summary Panel */}
          <div className={styles.miniSummaryGrid}>
            <div className={styles.miniSummaryCard}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icons.Calendar size={14} style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Citas</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>{totalDaily}</div>
              </div>
            </div>
            
            <div className={styles.miniSummaryCard}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icons.Check size={14} style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Completadas</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#10b981" }}>{completedDaily}</div>
              </div>
            </div>
            
            <div className={styles.miniSummaryCard}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icons.Clock size={14} style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Pendientes</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#d97706" }}>{pendingDaily}</div>
              </div>
            </div>

            <div className={styles.miniSummaryCard}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #ef4444, #dc2626)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icons.Close size={14} style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Canceladas</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#ef4444" }}>{cancelledDaily}</div>
              </div>
            </div>

            {showPrices && (
              <div className={styles.miniSummaryCard}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Previsión Día</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#8b5cf6" }}>
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalRevenueDaily)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Calendar view selector & navigation */}
          <div className={styles.calendarHeader}>
            <div className={styles.calendarHeaderLeft}>
              {/* Dropdown for Agenda selection */}
              <div className={styles.dropdownContainer} ref={staffDropdownRef}>
                <button
                  type="button"
                  className={styles.agendaDropdownBtn}
                  onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                >
                  <Icons.Users size={16} />
                  <span>Agenda</span>
                  <Icons.ChevronDown size={14} />
                </button>

                {showStaffDropdown && (
                  <div className={styles.agendaDropdownMenu}>
                    <div className={styles.dropdownHeader}>
                      <span>USUARIOS</span>
                    </div>
                    <div className={styles.dropdownSearchWrapper}>
                      <Icons.Search size={14} className={styles.dropdownSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.dropdownSearchInput}
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on search box click
                      />
                    </div>
                    <div className={styles.dropdownFijarRow}>
                      <span className={styles.fijarLabel}>Fijar</span>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={pinDropdown}
                          onChange={(e) => setPinDropdown(e.target.checked)}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>
                    <div className={styles.dropdownScrollArea}>
                      <button
                        type="button"
                        className={styles.dropdownItemAll}
                        onClick={() => {
                          if (checkedStaffIds.length === staffList.length) {
                            setCheckedStaffIds([]);
                          } else {
                            setCheckedStaffIds(staffList.map((s) => s.id));
                          }
                        }}
                      >
                        <div className={styles.checkboxCustomDropdown}>
                          {checkedStaffIds.length === staffList.length && <Icons.Check size={10} style={{ color: "white" }} />}
                        </div>
                        <span>Todos</span>
                      </button>

                      {staffList
                        .filter((s) => {
                          const fullName = `${s.name} ${s.lastName || ""}`.toLowerCase();
                          return fullName.includes(staffSearchQuery.toLowerCase());
                        })
                        .map((staff) => {
                          const isChecked = checkedStaffIds.includes(staff.id);
                          return (
                            <button
                              key={staff.id}
                              type="button"
                              className={styles.dropdownItemStaff}
                              onClick={() => handleStaffCheck(staff.id)}
                            >
                              <div
                                className={styles.checkboxCustomDropdown}
                                style={{
                                  backgroundColor: isChecked ? "var(--primary)" : "var(--bg-input)",
                                  borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                                }}
                              >
                                {isChecked && <Icons.Check size={10} style={{ color: "white" }} />}
                              </div>
                              <div className={styles.dropdownItemInfo}>
                                <span className={styles.dropdownItemName}>{staff.name} {staff.lastName || ""}</span>
                                <span className={styles.dropdownItemRole}>{staff.role}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                    <div className={styles.dropdownFooter}>
                      <button
                        type="button"
                        className={styles.btnCrearUsuarioDropdown}
                        onClick={() => {
                          window.location.href = "/dashboard/settings?tab=usuarios";
                        }}
                      >
                        + Crear usuario
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View Selector (Día / Semana / Mes) */}
              <div className={styles.viewSelector}>
                <button
                  className={`${styles.viewBtn} ${view === "day" ? styles.viewBtnActive : ""}`}
                  onClick={() => {
                    setView("day");
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("agenda_view", "day");
                    }
                  }}
                >
                  Día
                </button>
                <button
                  className={`${styles.viewBtn} ${view === "week" ? styles.viewBtnActive : ""}`}
                  onClick={() => {
                    setView("week");
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("agenda_view", "week");
                    }
                  }}
                >
                  Semana
                </button>
                <button
                  className={`${styles.viewBtn} ${view === "month" ? styles.viewBtnActive : ""}`}
                  onClick={() => {
                    setView("month");
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("agenda_view", "month");
                    }
                  }}
                >
                  Mes
                </button>
              </div>
            </div>

            <div className={styles.calendarHeaderCenter}>
              <div className={styles.dateNav}>
                <button onClick={handlePrevDate} className={styles.navBtn}>
                  <Icons.ChevronLeft size={16} />
                </button>
                
                <button onClick={() => setShowDatePicker(!showDatePicker)} className={styles.datePickerBtn}>
                  <span>{getFormattedDatePickerLabel()}</span>
                  <Icons.Calendar size={16} />
                </button>
                
                <button onClick={handleNextDate} className={styles.navBtn}>
                  <Icons.ChevronRight size={16} />
                </button>

                {!isTodayVisible() && (
                  <button onClick={handleToday} className={styles.todayBtn}>Hoy</button>
                )}

                {showDatePicker && (
                  <div className={styles.datePickerDropdown} ref={datePickerRef}>
                    <div className={styles.pickerHeader}>
                      <button
                        type="button"
                        onClick={handlePrevPickerMonth}
                        className={styles.pickerNavBtn}
                      >
                        <Icons.ChevronLeft size={16} />
                      </button>
                      
                      <div className={styles.pickerSelectors}>
                        <select
                          value={pickerMonth}
                          onChange={(e) => handlePickerMonthChange(Number(e.target.value))}
                          className={styles.pickerSelect}
                        >
                          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, idx) => (
                            <option key={idx} value={idx}>{m}</option>
                          ))}
                        </select>
                        
                        <select
                          value={pickerYear}
                          onChange={(e) => handlePickerYearChange(Number(e.target.value))}
                          className={styles.pickerSelect}
                        >
                          {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextPickerMonth}
                        className={styles.pickerNavBtn}
                      >
                        <Icons.ChevronRight size={16} />
                      </button>
                    </div>

                    <div className={styles.pickerWeekdays}>
                      {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((w) => (
                        <div key={w} className={styles.pickerWeekdayLabel}>{w}</div>
                      ))}
                    </div>

                    <div className={styles.pickerGrid}>
                      {(() => {
                        const firstDay = new Date(pickerYear, pickerMonth, 1);
                        const firstDayIndex = firstDay.getDay(); // Sun=0, Mon=1
                        const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                        const gridStart = new Date(firstDay);
                        gridStart.setDate(firstDay.getDate() - adjustedFirstDay);

                        const pickerDays: Date[] = [];
                        for (let i = 0; i < 42; i++) {
                          const d = new Date(gridStart);
                          d.setDate(gridStart.getDate() + i);
                          pickerDays.push(d);
                        }

                        return pickerDays.map((dayDate, idx) => {
                          const isOutside = dayDate.getMonth() !== pickerMonth;
                          const isTodayCell = new Date().toDateString() === dayDate.toDateString();
                          
                          let isSelected = false;
                          if (view === "day") {
                            isSelected = dayDate.toDateString() === currentDate.toDateString();
                          } else if (view === "week") {
                            const currentMon = getMonday(currentDate);
                            const currentSun = new Date(currentMon);
                            currentSun.setDate(currentMon.getDate() + 6);
                            currentSun.setHours(23, 59, 59, 999);
                            
                            const isSelectedWeek = dayDate.getTime() >= currentMon.getTime() && dayDate.getTime() <= currentSun.getTime();
                            
                            let isHoveredWeek = false;
                            if (hoveredDate) {
                              const hoveredMon = getMonday(hoveredDate);
                              const hoveredSun = new Date(hoveredMon);
                              hoveredSun.setDate(hoveredMon.getDate() + 6);
                              hoveredSun.setHours(23, 59, 59, 999);
                              isHoveredWeek = dayDate.getTime() >= hoveredMon.getTime() && dayDate.getTime() <= hoveredSun.getTime();
                            }
                            isSelected = isSelectedWeek || isHoveredWeek;
                          } else if (view === "month") {
                            isSelected = dayDate.getMonth() === pickerMonth && dayDate.getFullYear() === pickerYear;
                          }

                          const handleDayClick = () => {
                            if (view === "day") {
                              setCurrentDate(dayDate);
                              setShowDatePicker(false);
                            } else if (view === "week") {
                              const mon = getMonday(dayDate);
                              setCurrentDate(mon);
                              setShowDatePicker(false);
                            }
                          };

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={handleDayClick}
                              className={`${styles.pickerDayCell} ${isOutside ? styles.pickerOutsideDayCell : ""} ${isTodayCell ? styles.pickerTodayCell : ""} ${isSelected ? styles.pickerSelectedDayCell : ""}`}
                              onMouseEnter={() => {
                                if (view === "week") {
                                  setHoveredDate(dayDate);
                                }
                              }}
                              onMouseLeave={() => {
                                if (view === "week") {
                                  setHoveredDate(null);
                                }
                              }}
                              disabled={view === "month"} // disable day interaction in month view
                            >
                              {dayDate.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.calendarHeaderRight}>
              <div className={styles.headerActionButtons}>
                <button
                  type="button"
                  className={styles.iconActionButton}
                  title="Historial de citas"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8M21 3v5h-5" />
                  </svg>
                </button>
                
                <div className={styles.settingsDropdownContainer} ref={settingsDropdownRef}>
                  <button
                    type="button"
                    className={`${styles.iconActionButton} ${showSettingsPopover ? styles.activeButton : ""}`}
                    onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                    title="Configuración"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                      <circle cx="8" cy="6" r="2.5" fill="var(--bg-panel-solid)" />
                      <circle cx="16" cy="12" r="2.5" fill="var(--bg-panel-solid)" />
                      <circle cx="10" cy="18" r="2.5" fill="var(--bg-panel-solid)" />
                    </svg>
                  </button>

                  {showSettingsPopover && (
                    <div className={styles.settingsPopover}>
                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setShowFiltersSidebar(true);
                          setFiltersSubView("menu");
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        <span>Filtros</span>
                      </button>

                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setShowWaitlistSidebar(true);
                          setWaitlistSubView("list");
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Lista de espera</span>
                      </button>

                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setShowOpcionesSidebar(true);
                          setSidebarSubView("menu");
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="4" y1="6" x2="20" y2="6" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                          <line x1="4" y1="18" x2="20" y2="18" />
                          <circle cx="8" cy="6" r="2.5" fill="var(--bg-panel-solid)" />
                          <circle cx="16" cy="12" r="2.5" fill="var(--bg-panel-solid)" />
                          <circle cx="10" cy="18" r="2.5" fill="var(--bg-panel-solid)" />
                        </svg>
                        <span>Configuración</span>
                      </button>

                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setSelectedSlot(null);
                          setFormClientId("");
                          setPatientSearch("");
                          const now = new Date();
                          setFormDate(now.toISOString().split("T")[0]);
                          setFormTime(`${String(now.getHours() + 1).padStart(2, "0")}:00`);
                          setIsNewPatient(false);
                          
                          // Nueva Cita drawer states
                          setFormClinicId(activeClinic?.id || "");
                          setFormStatus("CONFIRMED");
                          setAppointmentTags([]);
                          setShowTagInput(false);
                          setNewTagName("");
                          setShowServiceDropdown(false);
                          setShowFormStatusDropdown(false);

                          setShowCreateModal(true);
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span>Nueva cita</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar view content */}
          <div className={`${styles.calendarCanvas} glass`}>
            {view === "day" && renderDayView()}
            {view === "week" && renderWeekView()}
            {view === "month" && renderMonthView()}
          </div>
        </section>
      </div>

      {/* CREATE APPOINTMENT DRAWER */}
      {showCreateModal && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.agendaDrawer} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateAppointment} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* Drawer Header */}
              <div className={styles.drawerHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
                <div className={styles.drawerHeaderTopRow} style={{ marginBottom: "8px" }}>
                  {/* Interactive Date Picker Button */}
                  <div style={{ position: "relative" }} ref={createCalRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateCal(!showCreateCal);
                        setShowCreateStartTimeDropdown(false);
                        setShowCreateEndTimeDropdown(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#0f172a",
                        fontSize: "20px",
                        fontWeight: 800,
                        padding: 0,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {formatDrawerDate(formDate)} <span className={styles.dropdownArrow} style={{ color: "#008298" }}>▾</span>
                    </button>
                    {showCreateCal && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "14px",
                          boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 4px 10px -2px rgba(0, 0, 0, 0.04)",
                          zIndex: 10003,
                          width: "270px",
                          padding: "16px",
                          marginTop: "6px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <button
                            type="button"
                            style={{ background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", color: "#0f172a", fontWeight: "bold", fontSize: "14px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}
                            onClick={() => {
                              if (editCalMonth === 0) { setEditCalMonth(11); setEditCalYear(y => y - 1); }
                              else setEditCalMonth(m => m - 1);
                            }}
                          >
                            &lt;
                          </button>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                            {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][editCalMonth]} {editCalYear}
                          </div>
                          <button
                            type="button"
                            style={{ background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", color: "#0f172a", fontWeight: "bold", fontSize: "14px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}
                            onClick={() => {
                              if (editCalMonth === 11) { setEditCalMonth(0); setEditCalYear(y => y + 1); }
                              else setEditCalMonth(m => m + 1);
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "8px" }}>
                          {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map(d => (
                            <div key={d} style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{d}</div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                          {(() => {
                            const firstDay = new Date(editCalYear, editCalMonth, 1).getDay();
                            const offset = firstDay === 0 ? 6 : firstDay - 1;
                            const daysInMonth = new Date(editCalYear, editCalMonth + 1, 0).getDate();
                            const cells = [];
                            for (let i = 0; i < offset; i++) cells.push(<div key={`cce${i}`} />);
                            for (let d = 1; d <= daysInMonth; d++) {
                              const formatted = `${editCalYear}-${String(editCalMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                              const isSelected = formDate === formatted;
                              cells.push(
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => {
                                    setFormDate(formatted);
                                    setShowCreateCal(false);
                                  }}
                                  style={{
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "7px 0",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: isSelected ? 800 : 600,
                                    backgroundColor: isSelected ? "#008298" : "transparent",
                                    color: isSelected ? "#ffffff" : "#334155",
                                    boxShadow: isSelected ? "0 2px 8px rgba(0, 130, 152, 0.35)" : "none",
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  {d}
                                </button>
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Badge Dropdown */}
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className={styles.statusBadgeDropdownBtn}
                      style={{
                        backgroundColor:
                          formStatus === "CONFIRMED" || formStatus === "COMPLETED"
                            ? "#16a34a"
                            : formStatus === "PENDING"
                            ? "#eab308"
                            : formStatus === "CANCELLED"
                            ? "#ef4444"
                            : "#64748b",
                      }}
                      onClick={() => setShowFormStatusDropdown(!showFormStatusDropdown)}
                    >
                      {formStatus === "CONFIRMED"
                        ? "Confirmado"
                        : formStatus === "COMPLETED"
                        ? "Completada"
                        : formStatus === "PENDING"
                        ? "Pendiente"
                        : formStatus === "CANCELLED"
                        ? "Cancelada"
                        : "No asistió"}{" "}
                      ▾
                    </button>
                    {showFormStatusDropdown && (
                      <div className={styles.statusDropdownMenu} style={{ zIndex: 10002 }}>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("PENDING"); setShowFormStatusDropdown(false); }}>
                          Pendiente
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("CONFIRMED"); setShowFormStatusDropdown(false); }}>
                          Confirmado
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("COMPLETED"); setShowFormStatusDropdown(false); }}>
                          Completada
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("CANCELLED"); setShowFormStatusDropdown(false); }}>
                          Cancelada
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("NOSHOW"); setShowFormStatusDropdown(false); }}>
                          No asistió
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.clientIdText} style={{ fontSize: "14px", color: "#4a5568", marginBottom: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  {/* Start Time Trigger */}
                  <div style={{ position: "relative" }} ref={createStartTimeRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateStartTimeDropdown(!showCreateStartTimeDropdown);
                        setShowCreateCal(false);
                        setShowCreateEndTimeDropdown(false);
                      }}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        color: "#0f172a",
                        fontSize: "13px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {formTime || "12:00"} <span style={{ color: "#008298", fontSize: "10px" }}>▾</span>
                    </button>
                    {showCreateStartTimeDropdown && (
                      <div
                        ref={createStartTimeDropdownContainerRef}
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)",
                          zIndex: 10003,
                          width: "130px",
                          maxHeight: "220px",
                          overflowY: "auto",
                          marginTop: "6px",
                          padding: "4px"
                        }}
                      >
                        {(() => {
                          const intervals = [];
                          for (let h = 0; h < 24; h++) {
                            for (let m = 0; m < 60; m += 5) {
                              intervals.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                            }
                          }
                          return intervals.map((t) => {
                            const isSelected = formTime === t;
                            return (
                              <div
                                key={t}
                                data-selected={isSelected ? "true" : "false"}
                                onClick={() => {
                                  setFormTime(t);
                                  const selectedService = servicesList.find((s) => s.id === formServiceId);
                                  const duration = selectedService ? selectedService.duration : 60;
                                  const [hours, minutes] = t.split(":").map(Number);
                                  const startDate = new Date();
                                  startDate.setHours(hours, minutes, 0);
                                  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                                  const endStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
                                  setFormEndTime(endStr);
                                  setShowCreateStartTimeDropdown(false);
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderRadius: "6px",
                                  color: isSelected ? "#0284c7" : "#0f172a",
                                  backgroundColor: isSelected ? "#e0f2fe" : "transparent",
                                  fontWeight: isSelected ? 800 : 500,
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? "#e0f2fe" : "#f1f5f9"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "#e0f2fe" : "transparent"}
                              >
                                <span>{t}</span>
                                {isSelected && <span style={{ color: "#0284c7", fontWeight: "bold" }}>✓</span>}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  <span>-</span>

                  {/* End Time Trigger */}
                  <div style={{ position: "relative" }} ref={createEndTimeRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateEndTimeDropdown(!showCreateEndTimeDropdown);
                        setShowCreateCal(false);
                        setShowCreateStartTimeDropdown(false);
                      }}
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #00a3b4",
                        borderRadius: "8px",
                        color: "#008298",
                        fontSize: "13px",
                        fontWeight: 700,
                        padding: "4px 10px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 1px 3px rgba(0, 163, 180, 0.15)"
                      }}
                    >
                      {(() => {
                        if (formEndTime) return formEndTime;
                        const selectedService = servicesList.find((s) => s.id === formServiceId);
                        const duration = selectedService ? selectedService.duration : 60;
                        if (!formTime) return "";
                        const [hours, minutes] = formTime.split(":").map(Number);
                        const startDate = new Date();
                        startDate.setHours(hours, minutes, 0);
                        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                        return `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
                      })()} <span style={{ color: "#008298", fontSize: "10px" }}>▾</span>
                    </button>
                    {showCreateEndTimeDropdown && (
                      <div
                        ref={createEndTimeDropdownContainerRef}
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)",
                          zIndex: 10003,
                          width: "130px",
                          maxHeight: "220px",
                          overflowY: "auto",
                          marginTop: "6px",
                          padding: "4px"
                        }}
                      >
                        {(() => {
                          const intervals = [];
                          for (let h = 0; h < 24; h++) {
                            for (let m = 0; m < 60; m += 5) {
                              intervals.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                            }
                          }
                          return intervals.map((t) => {
                            const isSelected = formEndTime === t;
                            return (
                              <div
                                key={t}
                                data-selected={isSelected ? "true" : "false"}
                                onClick={() => {
                                  setFormEndTime(t);
                                  setShowCreateEndTimeDropdown(false);
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderRadius: "6px",
                                  color: isSelected ? "#0284c7" : "#0f172a",
                                  backgroundColor: isSelected ? "#e0f2fe" : "transparent",
                                  fontWeight: isSelected ? 800 : 500,
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? "#e0f2fe" : "#f1f5f9"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "#e0f2fe" : "transparent"}
                              >
                                <span>{t}</span>
                                {isSelected && <span style={{ color: "#0284c7", fontWeight: "bold" }}>✓</span>}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  <span style={{ color: "#64748b" }}>/ Repeticiones</span>
                </div>

                {/* Tags row */}
                <div className={styles.tagsRow} style={{ position: "relative" }} ref={createTagsDropdownRef}>
                  {appointmentTags.map((tag, idx) => (
                    <span key={idx} className={styles.tagBadge}>
                      {tag}
                      <button
                        type="button"
                        className={styles.removeTagBtn}
                        onClick={() => setAppointmentTags(prev => prev.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  
                  <button
                    type="button"
                    className={styles.plusSmallBtn}
                    onClick={() => {
                      setShowCreateTagsDropdown(!showCreateTagsDropdown);
                      setCreateTagsSubView("list");
                      setSearchCreateTagQuery("");
                    }}
                    title="Agregar etiqueta"
                    style={{ width: "24px", height: "24px", fontSize: "14px" }}
                  >
                    +
                  </button>

                  {showCreateTagsDropdown && (
                    <div className={styles.tagsDropdownMenu} style={{ top: "30px", left: "0", zIndex: 1000 }}>
                      {createTagsSubView === "list" ? (
                        <>
                          <h3 className={styles.tagsDropdownTitle}>Etiquetas</h3>
                          <div className={styles.tagsSearchWrapper}>
                            <svg className={styles.tagsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input 
                              type="text"
                              className={styles.tagsSearchInput}
                              placeholder="Buscar etiqueta"
                              value={searchCreateTagQuery}
                              onChange={(e) => setSearchCreateTagQuery(e.target.value)}
                            />
                          </div>
                          <div className={styles.tagsList}>
                            {availableTags
                              .filter(tag => {
                                if (appointmentTags.includes(tag.name)) return false;
                                return tag.name.toLowerCase().includes(searchCreateTagQuery.toLowerCase());
                              })
                              .map(tag => (
                                <div
                                  key={tag.name}
                                  className={styles.tagsListItem}
                                  style={{ backgroundColor: tag.color, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                >
                                  <span 
                                    style={{ flex: 1, cursor: "pointer", display: "block" }} 
                                    onClick={() => {
                                      setAppointmentTags(prev => [...prev, tag.name]);
                                      setShowCreateTagsDropdown(false);
                                    }}
                                  >
                                    {tag.name}
                                  </span>
                                  <span 
                                    className={styles.editTagIcon}
                                    title="Eliminar etiqueta"
                                    onClick={() => handleDeleteTagGlobal(tag.name)}
                                    style={{ cursor: "pointer", display: "flex", alignItems: "center", marginLeft: "8px" }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </span>
                                </div>
                              ))}
                            {availableTags.filter(tag => {
                              if (appointmentTags.includes(tag.name)) return false;
                              return tag.name.toLowerCase().includes(searchCreateTagQuery.toLowerCase());
                            }).length === 0 && (
                              <div style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", padding: "8px" }}>Sin etiquetas disponibles</div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.newTagBtn}
                            onClick={() => {
                              setCreateTagsSubView("create");
                              setNewCreateTagName("");
                              setNewCreateTagColor("#add8e6");
                            }}
                          >
                            Nueva etiqueta
                          </button>
                        </>
                      ) : (
                        <>
                          <h3 className={styles.tagsDropdownTitle}>Nueva etiqueta</h3>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div>
                              <label className={styles.newTagLabel}>Nombre</label>
                              <input 
                                type="text"
                                className="input"
                                style={{ width: "100%", fontSize: "12px", padding: "6px 10px", outline: "none", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                                placeholder="Nombre de la etiqueta"
                                value={newCreateTagName}
                                onChange={(e) => setNewCreateTagName(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className={styles.newTagLabel}>ASIGNAR COLOR</label>
                              <div className={styles.colorPickerGrid}>
                                {TAG_COLORS.map(color => (
                                  <div
                                    key={color}
                                    className={`${styles.colorCircle} ${newCreateTagColor === color ? styles.colorCircleSelected : ""}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setNewCreateTagColor(color)}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className={styles.newTagActions}>
                              <button 
                                type="button"
                                className={styles.newTagCancelBtn}
                                onClick={() => setCreateTagsSubView("list")}
                              >
                                Cancelar
                              </button>
                              <button 
                                type="button"
                                className={styles.newTagSaveBtn}
                                disabled={!newCreateTagName.trim()}
                                onClick={() => {
                                  const name = newCreateTagName.trim().toUpperCase();
                                  if (availableTags.some(t => t.name === name)) {
                                    toast.success("Esta etiqueta ya existe.");
                                    return;
                                  }
                                  const updated = [...availableTags, { name, color: newCreateTagColor }];
                                  setAvailableTags(updated);
                                  localStorage.setItem("clifav_available_tags", JSON.stringify(updated));
                                  setAppointmentTags(prev => [...prev, name]);
                                  setShowCreateTagsDropdown(false);
                                }}
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Body */}
              <div className={styles.drawerBody} style={{ flex: 1, padding: "14px 22px" }}>
                
                {/* Contacto Section */}
                <div className="form-group" style={{ marginBottom: "14px", position: "relative" }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px", display: "block" }}>Contacto</label>
                  {formClientId ? (
                    (() => {
                      const selectedClient = clientsList.find((c) => c.id === formClientId);
                      if (!selectedClient) return null;
                      return (
                        <div className={styles.contactSelectedCard} style={{ padding: "10px 14px", marginTop: "6px" }}>
                          <div className={styles.contactAvatar} style={{ width: "38px", height: "38px", fontSize: "14px" }}>
                            {selectedClient.firstName.charAt(0)}
                            {selectedClient.lastName ? selectedClient.lastName.charAt(0) : ""}
                          </div>
                          <div className={styles.contactMeta}>
                            <h3 className={styles.contactName} style={{ fontSize: "13px" }}>
                              {selectedClient.firstName} {selectedClient.lastName}
                            </h3>
                            <span className={styles.contactDetails} style={{ fontSize: "12px" }}>
                              {selectedClient.phone || "Sin teléfono"} | {selectedClient.email || "Sin email"}
                            </span>
                            <div>
                              <button
                                type="button"
                                className={styles.contactChangeLink}
                                style={{ fontSize: "12px" }}
                                onClick={() => {
                                  setFormClientId("");
                                  setPatientSearch("");
                                }}
                              >
                                Cambiar cliente
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Buscar contacto..."
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        style={{ padding: "8px 12px", borderRadius: "9px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontSize: "13px", color: "#0f172a", fontWeight: 500, height: "38px" }}
                      />
                      {showSuggestions && (
                        <div className={styles.suggestionsDropdown} ref={suggestionsRef} style={{ width: "100%", zIndex: 10002 }}>
                          {filteredClientsForSearch.length > 0 ? (
                            <>
                              {filteredClientsForSearch.slice(0, 8).map((c) => (
                                <div
                                  key={c.id}
                                  className={styles.suggestionItem}
                                  onClick={() => {
                                    setFormClientId(c.id);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  <span className={styles.suggestionName}>
                                    {c.firstName} {c.lastName}
                                  </span>
                                  <span className={styles.suggestionMeta}>
                                    {c.phone ? `${c.phone}` : ""} {c.email ? `| ${c.email}` : ""}
                                  </span>
                                </div>
                              ))}
                              <div
                                className={styles.suggestionItem}
                                onClick={() => {
                                  const parts = patientSearch.trim().split(/\s+/);
                                  setFormPatFirstName(parts[0] || "");
                                  setFormPatLastName(parts.slice(1).join(" ") || "");
                                  setShowSuggestions(false);
                                  setShowCreateContactModal(true);
                                }}
                                style={{
                                  borderTop: "1px solid #e2e8f0",
                                  color: "#008298",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "9px 12px",
                                  backgroundColor: "#f8fafc",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                <span style={{ fontSize: "15px", fontWeight: "bold" }}>+</span>
                                <span>Crear cliente {patientSearch.trim() ? `"${patientSearch.trim()}"` : ""}</span>
                              </div>
                            </>
                          ) : (
                            <div
                              className={styles.suggestionItem}
                              onClick={() => {
                                const parts = patientSearch.trim().split(/\s+/);
                                setFormPatFirstName(parts[0] || "");
                                setFormPatLastName(parts.slice(1).join(" ") || "");
                                setShowSuggestions(false);
                                setShowCreateContactModal(true);
                              }}
                              style={{
                                color: "#008298",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "11px",
                                backgroundColor: "#ffffff",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              <span style={{ fontSize: "15px", fontWeight: "bold" }}>+</span>
                              <span>Crear cliente {patientSearch.trim() ? `"${patientSearch.trim()}"` : ""}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sin resultados / Crear Contacto card */}
                      {!patientSearch && !formClientId && (
                        <div className={styles.contactNoResultsCard} style={{ padding: "12px 14px", marginTop: "8px", gap: "8px" }}>
                          <span className={styles.contactNoResultsText} style={{ fontSize: "12px" }}>Sin resultados</span>
                          <div className={styles.contactNoResultsActions}>
                            <button
                              type="button"
                              className={styles.yellowBtn}
                              style={{ padding: "7px 12px", fontSize: "12px" }}
                              onClick={() => setShowCreateContactModal(true)}
                            >
                              Crear contacto
                            </button>
                            <button
                              type="button"
                              className={styles.whiteBorderBtn}
                              style={{ padding: "7px 12px", fontSize: "12px" }}
                              onClick={handleSelectWalkInClient}
                            >
                              Cliente de paso
                            </button>
                          </div>
                        </div>
                      )}
                      {patientSearch && !formClientId && filteredClientsForSearch.length === 0 && (
                        <div className={styles.contactNoResultsCard} style={{ padding: "12px 14px", marginTop: "8px", gap: "8px" }}>
                          <span className={styles.contactNoResultsText} style={{ fontSize: "12px" }}>Sin resultados</span>
                          <div className={styles.contactNoResultsActions}>
                            <button
                              type="button"
                              className={styles.yellowBtn}
                              style={{ padding: "7px 12px", fontSize: "12px" }}
                              onClick={() => {
                                const parts = patientSearch.trim().split(/\s+/);
                                setFormPatFirstName(parts[0] || "");
                                setFormPatLastName(parts.slice(1).join(" ") || "");
                                setShowCreateContactModal(true);
                              }}
                            >
                              Crear contacto
                            </button>
                            <button
                              type="button"
                              className={styles.whiteBorderBtn}
                              style={{ padding: "7px 12px", fontSize: "12px" }}
                              onClick={handleSelectWalkInClient}
                            >
                              Cliente de paso
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Servicio Section */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px", display: "block" }}>Servicio</label>
                  <div className={styles.serviceDropdownContainer}>
                    {(() => {
                      const selectedService = servicesList.find(s => s.id === formServiceId);
                      return (
                        <button
                          type="button"
                          className={styles.serviceDropdownBtn}
                          style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                          onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {selectedService && (
                              <span
                                className={styles.colorDot}
                                style={{ backgroundColor: selectedService.color, width: "10px", height: "10px" }}
                              />
                            )}
                            <span>
                              {selectedService
                                ? `${selectedService.name} (${selectedService.duration} min${showPrices ? (currencySymbol === "€" ? ` - ${selectedService.price}€` : ` - ${currencySymbol}${selectedService.price}`) : ""})`
                                : "Seleccionar servicio"}
                            </span>
                          </div>
                          <span>▾</span>
                        </button>
                      );
                    })()}
                    {showServiceDropdown && (
                      <div className={styles.serviceDropdownMenu}>
                        {filteredServicesForDropdown.map((s) => (
                          <div
                            key={s.id}
                            className={styles.serviceItem}
                            onClick={() => {
                              setFormServiceId(s.id);
                              if (formTime) {
                                const [h, m] = formTime.split(":").map(Number);
                                const startDate = new Date();
                                startDate.setHours(h, m, 0);
                                const endDate = new Date(startDate.getTime() + s.duration * 60 * 1000);
                                const endStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
                                setFormEndTime(endStr);
                              }
                              setShowServiceDropdown(false);
                            }}
                          >
                            <span
                              className={styles.colorDot}
                              style={{ backgroundColor: s.color }}
                            />
                            <span>
                              {s.name} ({s.duration} min{showPrices ? (currencySymbol === "€" ? ` - ${s.price}€` : ` - ${currencySymbol}${s.price}`) : ""})
                            </span>
                          </div>
                        ))}
                        
                        {/* Option to create a new service */}
                        <div
                          className={styles.serviceItem}
                          onClick={() => {
                            window.location.href = "/dashboard/settings?tab=services";
                          }}
                          style={{
                            borderTop: filteredServicesForDropdown.length > 0 ? "1px dashed var(--border-color)" : "none",
                            color: "var(--primary)",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 12px",
                            cursor: "pointer"
                          }}
                        >
                          <span style={{ fontSize: "15px", fontWeight: "bold" }}>+</span>
                          <span>Añadir Servicio</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {matchingVoucher && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", borderRadius: "9px", border: "1px solid #7dd3fc" }}>
                      <input
                        type="checkbox"
                        id="useVoucherSessionCheckCreate"
                        checked={useVoucherSession}
                        onChange={(e) => setUseVoucherSession(e.target.checked)}
                        style={{ width: "17px", height: "17px", accentColor: "#008298", cursor: "pointer" }}
                      />
                      <label htmlFor="useVoucherSessionCheckCreate" style={{ fontSize: "12px", color: "#0369a1", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontWeight: 600 }}>
                        <span style={{ fontWeight: 800, color: "#0284c7" }}>{matchingVoucher.name}</span>
                        {matchingVoucher.expirationDate && (
                          <span style={{ color: "#0c4a6e", opacity: 0.8 }}>
                            - {new Date(matchingVoucher.expirationDate).toLocaleDateString("es-ES")}
                          </span>
                        )}
                        <span style={{ fontWeight: 700, backgroundColor: "#bae6fd", padding: "2px 7px", borderRadius: "5px", color: "#0369a1", fontSize: "11px" }}>
                          {matchingVoucher.sessions - matchingVoucher.remainingSessions}/{matchingVoucher.sessions} sesiones
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Ubicación Section */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px", display: "block" }}>Ubicación</label>
                  <select
                    className="input select"
                    value={formClinicId}
                    onChange={(e) => setFormClinicId(e.target.value)}
                    required
                    style={{ padding: "8px 12px", borderRadius: "9px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontSize: "13px", color: "#0f172a", fontWeight: 500, height: "38px" }}
                  >
                    <option value="">Seleccionar ubicación...</option>
                    {currentUser?.clinics && currentUser.clinics.length > 0 ? (
                      currentUser.clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      activeClinic && (
                        <option value={activeClinic.id}>{activeClinic.name}</option>
                      )
                    )}
                  </select>
                </div>

                {/* Profesional Section */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px", display: "block" }}>Profesional</label>
                  <div className={styles.profSelectWrapper}>
                    <select
                      className="input select"
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      required
                      style={{ padding: "8px 12px", borderRadius: "9px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontSize: "13px", color: "#0f172a", fontWeight: 500, height: "38px" }}
                    >
                      <option value="">Seleccionar profesional...</option>
                      {filteredStaffForDropdown.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.lastName || ""} (Disponible)
                        </option>
                      ))}
                    </select>
                    {formUserId && (
                      <button
                        type="button"
                        className={styles.clearProfBtn}
                        onClick={() => setFormUserId("")}
                        title="Limpiar profesional"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Nota Interna Section */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px", display: "block" }}>Nota Interna</label>
                  <textarea
                    className="input"
                    placeholder="Escribe tu mensaje..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{ minHeight: "54px", height: "54px", padding: "8px 12px", borderRadius: "9px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontSize: "13px", color: "#0f172a" }}
                  />
                </div>
              </div>

              {/* Drawer Footer */}
              <div className={styles.drawerFooter}>
                <button
                  type="button"
                  className={styles.submenuCancelBtn}
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: "none", width: "100px" }}
                >
                  Cancelar
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    onClick={async (e) => {
                      await handleCreateAppointment(e, false, true);
                    }}
                  >
                    Crear cita y cobrar
                  </button>
                  <button
                    type="submit"
                    className={styles.createApptBtn}
                  >
                    Crear cita
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREAR CLIENTE MODAL (SUPERPUESTO) */}
      {showCreateContactModal && typeof window !== "undefined" && createPortal(
        <div className={styles.centeredOverlay} onClick={() => setShowCreateContactModal(false)}>
          <div className={styles.centeredContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.centeredHeader}>
              <h2>Crear cliente</h2>
              <button
                type="button"
                onClick={() => setShowCreateContactModal(false)}
                className={styles.drawerCloseBtn}
              >
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleCreateContactSubmit} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* Tabs */}
              <div className={styles.drawerHeader} style={{ padding: "0 24px", borderBottom: "1px solid #e2e8f0" }}>
                <div className={styles.drawerTabsContainer}>
                  <button
                    type="button"
                    className={`${styles.drawerTabBtn} ${newPatientTab === "general" ? styles.drawerTabBtnActive : ""}`}
                    onClick={() => setNewPatientTab("general")}
                  >
                    Información general
                  </button>
                  <button
                    type="button"
                    className={`${styles.drawerTabBtn} ${newPatientTab === "others" ? styles.drawerTabBtnActive : ""}`}
                    onClick={() => setNewPatientTab("others")}
                  >
                    Otros datos
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className={styles.centeredBody}>
                {newPatientTab === "general" ? (
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", marginBottom: "20px", letterSpacing: "0.05em" }}>Datos generales</h4>
                    
                    {/* Row 1: Nombre | Apellidos */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nombre</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir nombre"
                          value={formPatFirstName}
                          onChange={(e) => setFormPatFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Apellidos</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir apellidos"
                          value={formPatLastName}
                          onChange={(e) => setFormPatLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Fecha nacimiento | DNI/NIF */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Fecha de nacimiento</label>
                        <input
                          type="date"
                          className="input"
                          placeholder="dd/mm/yyyy"
                          value={formPatBirthDate}
                          onChange={(e) => setFormPatBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">DNI/NIF</label>
                        <div style={{ position: "relative" }} ref={dniPickerRef}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-input)", padding: "0 10px", height: "40px" }}>
                            <button
                              type="button"
                              onClick={() => { setShowDniCountryPicker(!showDniCountryPicker); setShowPhoneCountryPicker(false); setShowCountryPicker(false); setCountrySearch(""); }}
                              style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
                            >
                              <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{dniCountry.code}</span>
                              <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>▾</span>
                            </button>
                            <input
                              type="text"
                              style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: "14px", color: "var(--text-primary)", fontFamily: "inherit" }}
                              placeholder="Añadir DNI"
                              value={formPatDniNif}
                              onChange={(e) => setFormPatDniNif(e.target.value)}
                            />
                          </div>
                          {showDniCountryPicker && (
                            <div style={{ position: "absolute", top: "44px", left: 0, zIndex: 9999, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: "240px", overflow: "hidden" }}>
                              <div style={{ padding: "8px" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar país..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredCountries.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setDniCountry(c); setShowDniCountryPicker(false); setCountrySearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 14px", background: dniCountry.code === c.code ? "var(--primary-light)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{c.code}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Teléfono | Email */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Número de teléfono</label>
                        <div style={{ position: "relative" }} ref={phonePickerRef}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-input)", padding: "0 10px", height: "40px" }}>
                            <button
                              type="button"
                              onClick={() => { setShowPhoneCountryPicker(!showPhoneCountryPicker); setShowDniCountryPicker(false); setShowCountryPicker(false); setCountrySearch(""); }}
                              style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
                            >
                              <span style={{ fontSize: "16px" }}>{phoneCountry.flag}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>{phoneCountry.dial}</span>
                              <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>▾</span>
                            </button>
                            <input
                              type="text"
                              style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: "14px", color: "var(--text-primary)", fontFamily: "inherit" }}
                              placeholder="Número de teléfono"
                              value={formPatPhone}
                              onChange={(e) => setFormPatPhone(e.target.value)}
                            />
                          </div>
                          {showPhoneCountryPicker && (
                            <div style={{ position: "absolute", top: "44px", left: 0, zIndex: 9999, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: "260px", overflow: "hidden" }}>
                              <div style={{ padding: "8px" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar país o código..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredCountries.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setPhoneCountry(c); setShowPhoneCountryPicker(false); setCountrySearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 14px", background: phoneCountry.code === c.code ? "var(--primary-light)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 700 }}>{c.dial}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="input"
                          placeholder="Añadir email"
                          value={formPatEmail}
                          onChange={(e) => setFormPatEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Row 4: País | Dirección */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">País</label>
                        <div style={{ position: "relative" }} ref={countryPickerRef}>
                          <button
                            type="button"
                            onClick={() => { setShowCountryPicker(!showCountryPicker); setShowDniCountryPicker(false); setShowPhoneCountryPicker(false); setCountrySearch(""); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              height: "40px",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              background: "var(--bg-input)",
                              padding: "0 12px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              textAlign: "left"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "16px" }}>{countryPickerSelected.flag}</span>
                              <span style={{ fontSize: "14px", color: "var(--text-primary)" }}>{countryPickerSelected.name}</span>
                            </div>
                            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>▾</span>
                          </button>
                          {showCountryPicker && (
                            <div style={{ position: "absolute", top: "44px", left: 0, zIndex: 9999, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: "260px", overflow: "hidden" }}>
                              <div style={{ padding: "8px" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar país..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredCountries.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setCountryPickerSelected(c); setFormPatCountry(c.name); setShowCountryPicker(false); setCountrySearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 14px", background: countryPickerSelected.code === c.code ? "var(--primary-light)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{c.dial}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Dirección</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir dirección"
                          value={formPatAddress}
                          onChange={(e) => setFormPatAddress(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Row 5: Ciudad/Municipio | Código Postal */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Ciudad / Municipio</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir ciudad / municipio"
                          value={formPatMunicipality}
                          onChange={(e) => setFormPatMunicipality(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Código Postal</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir código postal"
                          value={formPatPostalCode}
                          onChange={(e) => setFormPatPostalCode(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Toggle Switches */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Es Autónomo */}
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div
                          onClick={() => setFormPatIsSelfEmployed(!formPatIsSelfEmployed)}
                          style={{
                            width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                            background: formPatIsSelfEmployed ? "#3b82f6" : "#d1d5db",
                            position: "relative", transition: "background 0.2s", cursor: "pointer"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "3px",
                            left: formPatIsSelfEmployed ? "19px" : "3px",
                            width: "16px", height: "16px", borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>Es Autónomo</span>
                      </label>
                      {/* Es Empresa */}
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div
                          onClick={() => setFormPatIsCompany(!formPatIsCompany)}
                          style={{
                            width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                            background: formPatIsCompany ? "#3b82f6" : "#d1d5db",
                            position: "relative", transition: "background 0.2s", cursor: "pointer"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "3px",
                            left: formPatIsCompany ? "19px" : "3px",
                            width: "16px", height: "16px", borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>Es Empresa</span>
                      </label>
                      {/* Recibirá Recordatorios */}
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div
                          onClick={() => setFormPatReceivesReminders(!formPatReceivesReminders)}
                          style={{
                            width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                            background: formPatReceivesReminders ? "#3b82f6" : "#d1d5db",
                            position: "relative", transition: "background 0.2s", cursor: "pointer"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "3px",
                            left: formPatReceivesReminders ? "19px" : "3px",
                            width: "16px", height: "16px", borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>Recibirá Recordatorios</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className={styles.sectionSubTitle} style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "16px" }}>Más datos</h4>
                    
                    <div className={styles.fieldsGrid} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div className="form-group">
                        <label className="form-label">Ocupación</label>
                        <select
                          className="input select"
                          value={formPatOccupation}
                          onChange={(e) => setFormPatOccupation(e.target.value)}
                        >
                          <option value="">Selecciona o escribe</option>
                          <option value="Empleado/a">Empleado/a</option>
                          <option value="Autónomo/a">Autónomo/a</option>
                          <option value="Desempleado/a">Desempleado/a</option>
                          <option value="Estudiante">Estudiante</option>
                          <option value="Jubilado/a">Jubilado/a</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Género</label>
                        <select
                          className="input select"
                          value={formPatGender}
                          onChange={(e) => setFormPatGender(e.target.value)}
                        >
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ maxWidth: "50%", marginBottom: "16px" }}>
                      <label className="form-label">Estado civil</label>
                      <select
                        className="input select"
                        value={formPatMaritalStatus}
                        onChange={(e) => setFormPatMaritalStatus(e.target.value)}
                      >
                        <option value="Soltero/a">Soltero/a</option>
                        <option value="Casado/a">Casado/a</option>
                        <option value="Divorciado/a">Divorciado/a</option>
                        <option value="Viudo/a">Viudo/a</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">IBAN</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Añadir IBAN"
                        value={formPatIban}
                        onChange={(e) => setFormPatIban(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">BIC/SWIFT</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Añadir BIC/SWIFT"
                        value={formPatBic}
                        onChange={(e) => setFormPatBic(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={styles.centeredFooter}>
                <button
                  type="button"
                  className={styles.submenuCancelBtn}
                  onClick={() => setShowCreateContactModal(false)}
                  style={{ flex: "none", width: "100px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: "none" }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT APPOINTMENT MODAL */}
      {showEditModal && selectedAppointment && typeof window !== "undefined" && createPortal(
        <div 
          className={styles.drawerOverlay}
          onClick={() => {
            setShowEditModal(false);
            setIsEditingApp(false);
          }}
        >
          <div 
            className={styles.agendaDrawer}
            style={isEditingApp ? { width: "900px", maxWidth: "95vw" } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                {/* Header: Title and Tabs */}
                <div className={styles.drawerHeader} style={isEditingApp ? { borderBottom: "none", paddingBottom: 0, paddingTop: "12px" } : {}}>
                  <div className={styles.drawerHeaderTopRow} style={isEditingApp ? { marginBottom: "8px" } : {}}>
                    <h2 className={styles.drawerTitle}>{isEditingApp ? "Editar Cita" : "Información"}</h2>
                    
                    {/* Status Badge Dropdown */}
                    <div style={{ position: "relative", marginLeft: "auto", marginRight: "12px" }} ref={statusDropdownRef}>
                      <button
                        type="button"
                        className={styles.statusBadgeDropdownBtn}
                        style={{
                          backgroundColor:
                            (isEditingApp ? formStatus : selectedAppointment.status) === "CONFIRMED" || (isEditingApp ? formStatus : selectedAppointment.status) === "COMPLETED"
                              ? "#16a34a"
                              : (isEditingApp ? formStatus : selectedAppointment.status) === "PENDING"
                              ? "#eab308"
                              : (isEditingApp ? formStatus : selectedAppointment.status) === "CANCELLED"
                              ? "#ef4444"
                              : "#64748b",
                        }}
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      >
                        {(isEditingApp ? formStatus : selectedAppointment.status) === "CONFIRMED"
                          ? "Confirmada"
                          : (isEditingApp ? formStatus : selectedAppointment.status) === "COMPLETED"
                          ? "Completada"
                          : (isEditingApp ? formStatus : selectedAppointment.status) === "PENDING"
                          ? "Pendiente"
                          : (isEditingApp ? formStatus : selectedAppointment.status) === "CANCELLED"
                          ? "Cancelada"
                          : "No asistió"}{" "}
                        ▾
                      </button>
                      {showStatusDropdown && (
                        <div className={styles.statusDropdownMenu} style={{ top: "100%", right: 0, marginTop: "4px" }}>
                          {[
                            { val: "PENDING", label: "Pendiente" },
                            { val: "CONFIRMED", label: "Confirmada" },
                            { val: "COMPLETED", label: "Completada" },
                            { val: "CANCELLED", label: "Cancelada" },
                            { val: "NOSHOW", label: "No asistió" }
                          ].map((opt) => (
                            <div
                              key={opt.val}
                              className={styles.statusItem}
                              onClick={() => {
                                if (isEditingApp) {
                                  setFormStatus(opt.val);
                                  setShowStatusDropdown(false);
                                } else {
                                  handleUpdateStatus(opt.val);
                                }
                              }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        setShowEditModal(false);
                        setIsEditingApp(false);
                      }} 
                      className={styles.drawerCloseBtn}
                    >
                      <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                    </button>
                  </div>
                  
                  {!isEditingApp && (
                    <div className={styles.drawerTabsContainer}>
                      <button
                        type="button"
                        className={`${styles.drawerTabBtn} ${editModalTab === "datos" ? styles.drawerTabBtnActive : ""}`}
                        onClick={() => setEditModalTab("datos")}
                      >
                        Datos
                      </button>
                      <button
                        type="button"
                        className={`${styles.drawerTabBtn} ${editModalTab === "bonos" ? styles.drawerTabBtnActive : ""}`}
                        onClick={() => setEditModalTab("bonos")}
                      >
                        Bonos
                      </button>
                      <button
                        type="button"
                        className={`${styles.drawerTabBtn} ${editModalTab === "citas" ? styles.drawerTabBtnActive : ""}`}
                        onClick={() => setEditModalTab("citas")}
                      >
                        Citas
                      </button>
                      <button
                        type="button"
                        className={`${styles.drawerTabBtn} ${editModalTab === "seguimientos" ? styles.drawerTabBtnActive : ""}`}
                        onClick={() => setEditModalTab("seguimientos")}
                      >
                        Seguimientos
                      </button>
                      <button
                        type="button"
                        className={`${styles.drawerTabBtn} ${editModalTab === "historial" ? styles.drawerTabBtnActive : ""}`}
                        onClick={() => setEditModalTab("historial")}
                      >
                        Historial
                      </button>
                      <button
                        type="button"
                        className={`${styles.drawerTabBtn} ${editModalTab === "fotos" ? styles.drawerTabBtnActive : ""}`}
                        onClick={() => setEditModalTab("fotos")}
                      >
                        Fotos
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Toolbar Container */}
                {!isEditingApp && (
                  <div className={styles.statusToolbarContainer}>
                    {/* Plus button + tag manager dropdown */}
                    <div style={{ position: "relative" }} ref={tagsDropdownRef}>
                      <button 
                        type="button" 
                        className={styles.plusSmallBtn} 
                        onClick={() => {
                          setShowTagsDropdown(!showTagsDropdown);
                          setTagsSubView("list");
                          setSearchTagQuery("");
                        }} 
                        title="Gestionar etiquetas"
                      >
                        +
                      </button>
                      
                      {showTagsDropdown && (
                        <div className={styles.tagsDropdownMenu}>
                          {tagsSubView === "list" ? (
                            <>
                              <h3 className={styles.tagsDropdownTitle}>Etiquetas</h3>
                              <div className={styles.tagsSearchWrapper}>
                                <svg className={styles.tagsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input 
                                  type="text"
                                  className={styles.tagsSearchInput}
                                  placeholder="Buscar etiqueta"
                                  value={searchTagQuery}
                                  onChange={(e) => setSearchTagQuery(e.target.value)}
                                />
                              </div>
                              <div className={styles.tagsList}>
                                {availableTags
                                  .filter(tag => {
                                    const currentTags = selectedAppointment.tags 
                                      ? selectedAppointment.tags.split(",").filter(Boolean).map(t => t.split(":")[0])
                                      : [];
                                    if (currentTags.includes(tag.name)) return false;
                                    return tag.name.toLowerCase().includes(searchTagQuery.toLowerCase());
                                  })
                                  .map(tag => (
                                    <div
                                      key={tag.name}
                                      className={styles.tagsListItem}
                                      style={{ backgroundColor: tag.color, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    >
                                      <span 
                                        style={{ flex: 1, cursor: "pointer", display: "block" }} 
                                        onClick={() => handleAddTagToAppointment(tag)}
                                      >
                                        {tag.name}
                                      </span>
                                      <span 
                                        className={styles.editTagIcon}
                                        title="Eliminar etiqueta"
                                        onClick={() => handleDeleteTagGlobal(tag.name)}
                                        style={{ cursor: "pointer", display: "flex", alignItems: "center", marginLeft: "8px" }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                      </span>
                                    </div>
                                  ))}
                                {availableTags.filter(tag => {
                                  const currentTags = selectedAppointment.tags 
                                    ? selectedAppointment.tags.split(",").filter(Boolean).map(t => t.split(":")[0])
                                    : [];
                                  if (currentTags.includes(tag.name)) return false;
                                  return tag.name.toLowerCase().includes(searchTagQuery.toLowerCase());
                                }).length === 0 && (
                                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", padding: "8px" }}>Sin etiquetas disponibles</div>
                                )}
                              </div>
                              <button
                                type="button"
                                className={styles.newTagBtn}
                                onClick={() => {
                                  setTagsSubView("create");
                                  setNewInfoTagName("");
                                  setNewTagColor("#add8e6");
                                }}
                              >
                                Nueva etiqueta
                              </button>
                            </>
                          ) : (
                            <>
                              <h3 className={styles.tagsDropdownTitle}>Nueva etiqueta</h3>
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div>
                                  <label className={styles.newTagLabel}>Nombre</label>
                                  <input 
                                    type="text"
                                    className="input"
                                    style={{ width: "100%", fontSize: "12px", padding: "6px 10px", outline: "none", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                                    placeholder="Nombre de la etiqueta"
                                    value={newInfoTagName}
                                    onChange={(e) => setNewInfoTagName(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className={styles.newTagLabel}>ASIGNAR COLOR</label>
                                  <div className={styles.colorPickerGrid}>
                                    {TAG_COLORS.map(color => (
                                      <div
                                        key={color}
                                        className={`${styles.colorCircle} ${newTagColor === color ? styles.colorCircleSelected : ""}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewTagColor(color)}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className={styles.newTagActions}>
                                  <button 
                                    type="button"
                                    className={styles.newTagCancelBtn}
                                    onClick={() => setTagsSubView("list")}
                                  >
                                    Cancelar
                                  </button>
                                  <button 
                                    type="button"
                                    className={styles.newTagSaveBtn}
                                    disabled={!newInfoTagName.trim()}
                                    onClick={() => handleCreateNewTagGlobal(newInfoTagName, newTagColor)}
                                  >
                                    Guardar
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Display selected tags */}
                    {selectedAppointment.tags && selectedAppointment.tags.split(",").filter(Boolean).map(tagStr => {
                      const [tagName, tagColor] = tagStr.split(":");
                      return (
                        <span 
                          key={tagName} 
                          style={{ 
                            backgroundColor: tagColor || "#ef4444", 
                            color: "#fff", 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            fontSize: "11px", 
                            fontWeight: 700, 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "6px" 
                          }}
                        >
                          {tagName}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTagFromAppointment(tagName)} 
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "#fff", 
                              cursor: "pointer", 
                              padding: 0, 
                              fontSize: "11px", 
                              fontWeight: "bold",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Body (scrollable) */}
                <div className={styles.drawerBody}>
                  {editModalTab === "datos" && (
                    <>
                      <div className={styles.drawerInfoGrid} style={isEditingApp ? { gridTemplateColumns: "250px 1fr", gap: "32px" } : {}}>
                        {/* Left: Patient Details */}
                        <div className={styles.infoLeftCol}>
                          <div className={styles.clientInfoBlock}>
                            <div className={styles.clientAvatar}>
                              {selectedAppointment.client.firstName.charAt(0)}
                              {selectedAppointment.client.lastName ? selectedAppointment.client.lastName.charAt(0) : ""}
                            </div>
                            <div className={styles.clientMeta}>
                              <h3 className={styles.clientName}>
                                <a 
                                  href={`/dashboard/contacts/${selectedAppointment.clientId}`}
                                  style={{ 
                                    color: "inherit", 
                                    textDecoration: "none" 
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                                  title="Ver ficha de cliente"
                                >
                                  {selectedAppointment.client.firstName} {selectedAppointment.client.lastName}
                                </a>
                              </h3>
                              <span className={styles.clientIdText}>
                                # {selectedAppointment.client.clientNumber || "N/A"}
                              </span>
                              <span className={styles.clientPhoneText}>
                                {selectedAppointment.client.phone || "Sin teléfono"}
                              </span>
                            </div>
                          </div>

                          {!isEditingApp && (
                            <>
                              <button 
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(selectedAppointment)} 
                                className={styles.whatsappBtn}
                                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", border: "none", background: "var(--bg-input)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.5 8.5 0 0 1-7.6-4.7 8.38 8.38 0 0 1-.9-3.8z" />
                                </svg>
                                Whatsapp
                              </button>

                              {/* Switch Toggle */}
                              <div className={styles.remindersContainer}>
                                <div 
                                  className={styles.reminderToggleSwitch}
                                  style={{ 
                                    backgroundColor: editPatReceivesReminders ? "#008298" : "#cbd5e0"
                                  }}
                                  onClick={() => handleToggleReminders(!editPatReceivesReminders)}
                                >
                                  <div 
                                    className={styles.reminderToggleKnob}
                                    style={{ 
                                      left: editPatReceivesReminders ? "18px" : "2px"
                                    }}
                                  />
                                </div>
                                <span>Recordatorios</span>
                                <button 
                                  type="button" 
                                  className={styles.reminderGearBtn}
                                  title="Configurar recordatorios"
                                >
                                  <Icons.Settings size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Right: Appointment details column */}
                        <div className={styles.drawerRightDetails}>
                          {isEditingApp ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              {/* Date & Time Row */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  {/* Date Picker */}
                                  <div style={{ position: "relative" }} ref={editCalRef}>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setShowEditCal(!showEditCal);
                                        setShowStartTimeDropdown(false);
                                        setShowEndTimeDropdown(false);
                                      }} 
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-primary)",
                                        fontSize: "20px",
                                        fontWeight: 800,
                                        padding: 0,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}
                                    >
                                      {formatSpanishDate(formDate)} <span>▾</span>
                                    </button>
                                    {showEditCal && (
                                      <div 
                                        style={{
                                          position: "absolute",
                                          top: "100%",
                                          left: 0,
                                          backgroundColor: "var(--bg-panel-solid, #ffffff)",
                                          border: "1px solid var(--border-color, #e2e8f0)",
                                          borderRadius: "8px",
                                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                          zIndex: 160,
                                          width: "250px",
                                          padding: "12px",
                                          marginTop: "4px"
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                          <button 
                                            type="button" 
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontWeight: "bold" }}
                                            onClick={() => {
                                              if (editCalMonth === 0) { setEditCalMonth(11); setEditCalYear(y => y - 1); }
                                              else setEditCalMonth(m => m - 1);
                                            }}
                                          >
                                            &lt;
                                          </button>
                                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                                            {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][editCalMonth]} {editCalYear}
                                          </div>
                                          <button 
                                            type="button" 
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontWeight: "bold" }}
                                            onClick={() => {
                                              if (editCalMonth === 11) { setEditCalMonth(0); setEditCalYear(y => y + 1); }
                                              else setEditCalMonth(m => m + 1);
                                            }}
                                          >
                                            &gt;
                                          </button>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "4px" }}>
                                          {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map(d => (
                                            <div key={d} style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>{d}</div>
                                          ))}
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                                          {(() => {
                                            const firstDay = new Date(editCalYear, editCalMonth, 1).getDay();
                                            const offset = firstDay === 0 ? 6 : firstDay - 1;
                                            const daysInMonth = new Date(editCalYear, editCalMonth + 1, 0).getDate();
                                            const cells = [];
                                            for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
                                            for (let d = 1; d <= daysInMonth; d++) {
                                              const formatted = `${editCalYear}-${String(editCalMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                                              const isSelected = formDate === formatted;
                                              cells.push(
                                                <button 
                                                  key={d} 
                                                  type="button"
                                                  onClick={() => {
                                                    setFormDate(formatted);
                                                    setShowEditCal(false);
                                                  }}
                                                  style={{
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    padding: "4px 0",
                                                    cursor: "pointer",
                                                    fontSize: "11px",
                                                    fontWeight: 600,
                                                    backgroundColor: isSelected ? "var(--primary, #008fa3)" : "transparent",
                                                    color: isSelected ? "#ffffff" : "var(--text-primary)",
                                                  }}
                                                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-input)"; }}
                                                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}
                                                >
                                                  {d}
                                                </button>
                                              );
                                            }
                                            return cells;
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Time Range Triggers */}
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "14px", color: "var(--text-secondary)", fontWeight: 600 }}>
                                  {/* Start Time Dropdown */}
                                  <div style={{ position: "relative" }} ref={startTimeRef}>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setShowStartTimeDropdown(!showStartTimeDropdown);
                                        setShowEditCal(false);
                                        setShowEndTimeDropdown(false);
                                      }} 
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-secondary)",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        padding: 0
                                      }}
                                    >
                                      {formTime}
                                    </button>
                                    {showStartTimeDropdown && (
                                      <div 
                                        ref={startTimeDropdownContainerRef}
                                        style={{
                                          position: "absolute",
                                          top: "100%",
                                          left: 0,
                                          backgroundColor: "var(--bg-panel-solid, #ffffff)",
                                          border: "1px solid var(--border-color, #e2e8f0)",
                                          borderRadius: "8px",
                                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                          zIndex: 160,
                                          width: "120px",
                                          maxHeight: "200px",
                                          overflowY: "auto",
                                          marginTop: "4px"
                                        }}
                                      >
                                        {(() => {
                                          const intervals = [];
                                          for (let h = 0; h < 24; h++) {
                                            for (let m = 0; m < 60; m += 5) {
                                              intervals.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                                            }
                                          }
                                          return intervals.map((t) => {
                                            const isSelected = formTime === t;
                                            return (
                                              <div
                                                key={t}
                                                data-selected={isSelected ? "true" : "false"}
                                                onClick={() => {
                                                  setFormTime(t);
                                                  setShowStartTimeDropdown(false);
                                                }}
                                                style={{
                                                  padding: "8px 12px",
                                                  cursor: "pointer",
                                                  fontSize: "13px",
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "center",
                                                  color: "var(--text-primary)",
                                                  backgroundColor: isSelected ? "var(--bg-input-hover)" : "transparent"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input)"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "var(--bg-input-hover)" : "transparent"}
                                              >
                                                <span>{formatTime12h(t)}</span>
                                                {isSelected && <span style={{ color: "var(--primary)" }}>✓</span>}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    )}
                                  </div>

                                  <span>-</span>

                                  {/* End Time Dropdown */}
                                  <div style={{ position: "relative" }} ref={endTimeRef}>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setShowEndTimeDropdown(!showEndTimeDropdown);
                                        setShowEditCal(false);
                                        setShowStartTimeDropdown(false);
                                      }} 
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-secondary)",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        padding: 0
                                      }}
                                    >
                                      {formEndTime}
                                    </button>
                                    {showEndTimeDropdown && (
                                      <div 
                                        ref={endTimeDropdownContainerRef}
                                        style={{
                                          position: "absolute",
                                          top: "100%",
                                          left: 0,
                                          backgroundColor: "var(--bg-panel-solid, #ffffff)",
                                          border: "1px solid var(--border-color, #e2e8f0)",
                                          borderRadius: "8px",
                                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                          zIndex: 160,
                                          width: "120px",
                                          maxHeight: "200px",
                                          overflowY: "auto",
                                          marginTop: "4px"
                                        }}
                                      >
                                        {(() => {
                                          const intervals = [];
                                          for (let h = 0; h < 24; h++) {
                                            for (let m = 0; m < 60; m += 5) {
                                              intervals.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                                            }
                                          }
                                          return intervals.map((t) => {
                                            const isSelected = formEndTime === t;
                                            return (
                                              <div
                                                key={t}
                                                data-selected={isSelected ? "true" : "false"}
                                                onClick={() => {
                                                  setFormEndTime(t);
                                                  setShowEndTimeDropdown(false);
                                                }}
                                                style={{
                                                  padding: "8px 12px",
                                                  cursor: "pointer",
                                                  fontSize: "13px",
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "center",
                                                  color: "var(--text-primary)",
                                                  backgroundColor: isSelected ? "var(--bg-input-hover)" : "transparent"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input)"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "var(--bg-input-hover)" : "transparent"}
                                              >
                                                <span>{formatTime12h(t)}</span>
                                                {isSelected && <span style={{ color: "var(--primary)" }}>✓</span>}
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Tags Row */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Etiquetas</label>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                                  <div style={{ position: "relative" }} ref={tagsDropdownRef}>
                                    <button 
                                      type="button" 
                                      className={styles.plusSmallBtn} 
                                      onClick={() => {
                                        setShowTagsDropdown(!showTagsDropdown);
                                        setTagsSubView("list");
                                        setSearchTagQuery("");
                                      }} 
                                      title="Gestionar etiquetas"
                                    >
                                      +
                                    </button>
                                    
                                    {showTagsDropdown && (
                                      <div className={styles.tagsDropdownMenu} style={{ top: "100%", left: 0, marginTop: "4px" }}>
                                        {tagsSubView === "list" ? (
                                          <>
                                            <h3 className={styles.tagsDropdownTitle}>Etiquetas</h3>
                                            <div className={styles.tagsSearchWrapper}>
                                              <svg className={styles.tagsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                              <input 
                                                type="text"
                                                className={styles.tagsSearchInput}
                                                placeholder="Buscar etiqueta"
                                                value={searchTagQuery}
                                                onChange={(e) => setSearchTagQuery(e.target.value)}
                                              />
                                            </div>
                                            <div className={styles.tagsList}>
                                              {availableTags
                                                .filter(tag => {
                                                  const currentTags = selectedAppointment.tags 
                                                    ? selectedAppointment.tags.split(",").filter(Boolean).map(t => t.split(":")[0])
                                                    : [];
                                                  if (currentTags.includes(tag.name)) return false;
                                                  return tag.name.toLowerCase().includes(searchTagQuery.toLowerCase());
                                                })
                                                .map(tag => (
                                                  <div
                                                    key={tag.name}
                                                    className={styles.tagsListItem}
                                                    style={{ backgroundColor: tag.color, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                                  >
                                                    <span 
                                                      style={{ flex: 1, cursor: "pointer", display: "block" }} 
                                                      onClick={() => handleAddTagToAppointment(tag)}
                                                    >
                                                      {tag.name}
                                                    </span>
                                                    <span 
                                                      className={styles.editTagIcon}
                                                      title="Eliminar etiqueta"
                                                      onClick={() => handleDeleteTagGlobal(tag.name)}
                                                      style={{ cursor: "pointer", display: "flex", alignItems: "center", marginLeft: "8px" }}
                                                    >
                                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </span>
                                                  </div>
                                                ))}
                                              {availableTags.filter(tag => {
                                                const currentTags = selectedAppointment.tags 
                                                  ? selectedAppointment.tags.split(",").filter(Boolean).map(t => t.split(":")[0])
                                                  : [];
                                                if (currentTags.includes(tag.name)) return false;
                                                return tag.name.toLowerCase().includes(searchTagQuery.toLowerCase());
                                              }).length === 0 && (
                                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", padding: "8px" }}>Sin etiquetas disponibles</div>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              className={styles.newTagBtn}
                                              onClick={() => {
                                                setTagsSubView("create");
                                                setNewTagName("");
                                                setNewTagColor("#add8e6");
                                              }}
                                            >
                                              Nueva etiqueta
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <h3 className={styles.tagsDropdownTitle}>Nueva etiqueta</h3>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                              <div>
                                                <label className={styles.newTagLabel}>Nombre</label>
                                                <input 
                                                  type="text"
                                                  className="input"
                                                  style={{ width: "100%", fontSize: "12px", padding: "6px 10px", outline: "none", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                                                  placeholder="Nombre de la etiqueta"
                                                  value={newInfoTagName}
                                                  onChange={(e) => setNewInfoTagName(e.target.value)}
                                                  autoFocus
                                                />
                                              </div>
                                              <div>
                                                <label className={styles.newTagLabel}>ASIGNAR COLOR</label>
                                                <div className={styles.colorPickerGrid}>
                                                  {TAG_COLORS.map(color => (
                                                    <div
                                                      key={color}
                                                      className={`${styles.colorCircle} ${newTagColor === color ? styles.colorCircleSelected : ""}`}
                                                      style={{ backgroundColor: color }}
                                                      onClick={() => setNewTagColor(color)}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                              <div className={styles.newTagActions}>
                                                <button 
                                                  type="button"
                                                  className={styles.newTagCancelBtn}
                                                  onClick={() => setTagsSubView("list")}
                                                >
                                                  Cancelar
                                                </button>
                                                <button 
                                                  type="button"
                                                  className={styles.newTagSaveBtn}
                                                  disabled={!newInfoTagName.trim()}
                                                  onClick={() => handleCreateNewTagGlobal(newInfoTagName, newTagColor)}
                                                >
                                                  Guardar
                                                </button>
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {selectedAppointment.tags && selectedAppointment.tags.split(",").filter(Boolean).map(tagStr => {
                                    const [tagName, tagColor] = tagStr.split(":");
                                    return (
                                      <span 
                                        key={tagName} 
                                        style={{ 
                                          backgroundColor: tagColor || "#ef4444", 
                                          color: "#fff", 
                                          padding: "4px 8px", 
                                          borderRadius: "4px", 
                                          fontSize: "11px", 
                                          fontWeight: 700, 
                                          display: "inline-flex", 
                                          alignItems: "center", 
                                          gap: "6px" 
                                        }}
                                      >
                                        {tagName}
                                        <button 
                                          type="button" 
                                          onClick={() => handleRemoveTagFromAppointment(tagName)} 
                                          style={{ 
                                            background: "none", 
                                            border: "none", 
                                            color: "#fff", 
                                            cursor: "pointer", 
                                            padding: 0, 
                                            fontSize: "11px", 
                                            fontWeight: "bold",
                                            display: "inline-flex",
                                            alignItems: "center"
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Service dropdown select */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }} ref={serviceEditDropdownRef}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Servicio</label>
                                <div style={{ position: "relative" }}>
                                  {(() => {
                                    const currentService = servicesList.find(s => s.id === formServiceId);
                                    return currentService ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div 
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            border: "1px solid var(--border-color)",
                                            backgroundColor: "var(--bg-panel-solid)",
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            width: "100%",
                                            justifyContent: "space-between"
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: currentService.color || "var(--primary)" }} />
                                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{currentService.name}</span>
                                          </div>
                                          <span 
                                            style={{ cursor: "pointer", color: "var(--text-secondary)", fontWeight: "bold" }}
                                            onClick={() => setFormServiceId("")}
                                          >
                                            ✕
                                          </span>
                                        </div>
                                        <div 
                                          style={{
                                            borderLeft: `4px solid ${currentService.color || "var(--primary)"}`,
                                            backgroundColor: "var(--bg-input, #f7fafc)",
                                            padding: "12px",
                                            borderRadius: "0 6px 6px 0",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                          }}
                                        >
                                          <div>
                                            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{currentService.name}</div>
                                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{currentService.duration} min</div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <button 
                                        type="button" 
                                        style={{
                                          width: "100%",
                                          display: "flex",
                                          justifyContent: "space-between",
                                          background: "var(--bg-input)",
                                          border: "1px solid var(--border-color)",
                                          borderRadius: "6px",
                                          color: "var(--text-muted)",
                                          fontSize: "13px",
                                          padding: "8px 12px",
                                          textAlign: "left",
                                          cursor: "pointer"
                                        }}
                                        onClick={() => setShowServiceEditDropdown(true)}
                                      >
                                        <span>Seleccionar servicio...</span>
                                        <span>▾</span>
                                      </button>
                                    );
                                  })()}
                                  {showServiceEditDropdown && (
                                    <div 
                                      style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        backgroundColor: "var(--bg-panel-solid, #ffffff)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "8px",
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                        zIndex: 180,
                                        maxHeight: "300px",
                                        overflowY: "auto",
                                        marginTop: "4px",
                                        padding: "8px"
                                      }}
                                    >
                                      <input 
                                        type="text"
                                        placeholder="🔍 Buscar servicio..."
                                        value={searchServiceQuery}
                                        onChange={(e) => setSearchServiceQuery(e.target.value)}
                                        style={{
                                          width: "100%",
                                          padding: "8px 10px",
                                          fontSize: "13px",
                                          border: "1px solid var(--border-color)",
                                          borderRadius: "6px",
                                          marginBottom: "8px",
                                          outline: "none",
                                          backgroundColor: "var(--bg-input)",
                                          color: "var(--text-primary)"
                                        }}
                                      />
                                      {(() => {
                                        const categories: Record<string, any> = {};
                                        servicesList.forEach(s => {
                                          if (searchServiceQuery && !s.name.toLowerCase().includes(searchServiceQuery.toLowerCase())) {
                                            return;
                                          }
                                          const cat = s.category || "General";
                                          if (!categories[cat]) categories[cat] = [];
                                          categories[cat].push(s);
                                        });

                                        const catKeys = Object.keys(categories);
                                        if (catKeys.length === 0) {
                                          return <div style={{ padding: "8px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>No se encontraron servicios</div>;
                                        }

                                        return catKeys.map(cat => {
                                          const isExpanded = expandedCategories[cat] !== false;
                                          const catServices = categories[cat];
                                          const catColor = catServices[0]?.color || "var(--primary)";

                                          return (
                                            <div key={cat} style={{ marginBottom: "8px" }}>
                                              <div 
                                                onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !isExpanded }))}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "6px",
                                                  padding: "6px 4px",
                                                  cursor: "pointer",
                                                  fontWeight: 700,
                                                  fontSize: "12px",
                                                  color: "var(--text-primary)",
                                                  borderBottom: "1px solid var(--border-color)",
                                                  userSelect: "none"
                                                }}
                                              >
                                                <span style={{ fontSize: "10px", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: catColor }} />
                                                <span>{cat}</span>
                                                <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-muted)" }}>{catServices.length}</span>
                                              </div>
                                              {isExpanded && (
                                                <div style={{ paddingLeft: "8px", marginTop: "4px" }}>
                                                  {catServices.map((s: any) => {
                                                    const isSelected = formServiceId === s.id;
                                                    return (
                                                      <div
                                                        key={s.id}
                                                        onClick={() => {
                                                          setFormServiceId(s.id);
                                                          const [startH, startM] = formTime.split(":").map(Number);
                                                          const startMinutesTotal = startH * 60 + startM;
                                                          const endMinutesTotal = startMinutesTotal + s.duration;
                                                          const endH = Math.floor(endMinutesTotal / 60) % 24;
                                                          const endM = endMinutesTotal % 60;
                                                          setFormEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
                                                          setShowServiceEditDropdown(false);
                                                        }}
                                                        style={{
                                                          display: "flex",
                                                          justifyContent: "space-between",
                                                          alignItems: "center",
                                                          padding: "8px",
                                                          fontSize: "13px",
                                                          cursor: "pointer",
                                                          borderRadius: "4px",
                                                          borderLeft: `3px solid ${s.color || "var(--primary)"}`,
                                                          marginBottom: "2px",
                                                          backgroundColor: isSelected ? "var(--bg-input-hover)" : "transparent",
                                                          color: "var(--text-primary)"
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input)"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "var(--bg-input-hover)" : "transparent"}
                                                      >
                                                        <span style={{ fontWeight: isSelected ? 700 : 500 }}>{s.name}</span>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                                                          <span>{formatDuration(s.duration)}</span>
                                                          <span>•</span>
                                                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatPrice(s.price)}</span>
                                                          {isSelected && <span style={{ color: "var(--primary)" }}>✓</span>}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Clinic Dropdown */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Ubicación</label>
                                <select
                                  className="input select"
                                  value={formClinicId}
                                  onChange={(e) => setFormClinicId(e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "var(--bg-input)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    padding: "8px 12px",
                                    color: "var(--text-primary)"
                                  }}
                                >
                                  {(currentUser?.clinics || []).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* User Dropdown */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Profesional</label>
                                <select
                                  className="input select"
                                  value={formUserId}
                                  onChange={(e) => setFormUserId(e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "var(--bg-input)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    padding: "8px 12px",
                                    color: "var(--text-primary)"
                                  }}
                                >
                                  {filteredStaffForDropdown.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} {u.lastName || ""}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className={styles.detailDateTime}>
                                {(() => {
                                  const startD = new Date(selectedAppointment.start);
                                  const endD = new Date(selectedAppointment.end);
                                  const months = ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."];
                                  return `${months[startD.getMonth()]} ${startD.getDate()} ${String(startD.getHours()).padStart(2, "0")}:${String(startD.getMinutes()).padStart(2, "0")} - ${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
                                })()}
                              </div>

                              <div className={styles.detailClinicName}>
                                {selectedAppointment.clinic?.name || activeClinic?.name || "Clifav Central"}
                                {selectedAppointment.user && (
                                  <div style={{ marginTop: "2px", color: "var(--text-secondary)" }}>
                                    {selectedAppointment.user.name} {selectedAppointment.user.lastName || ""}
                                  </div>
                                )}
                              </div>

                              <div className={styles.detailServiceName}>
                                {selectedAppointment.service.name}
                              </div>

                              <div className={styles.detailPrice}>
                                {showPrices ? (currencySymbol === "€" ? `${selectedAppointment.service.price.toFixed(2).replace(".", ",")} €` : `${currencySymbol}${selectedAppointment.service.price.toFixed(2)}`) : "—"}
                              </div>

                              <div style={{ marginTop: "4px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                                {(() => {
                                  const matchingSales = agendaSales.filter((sale) => {
                                    try {
                                      const itemsArr = JSON.parse(sale.itemsJson || "[]");
                                      return itemsArr.some((i: any) => i.id === `db-app-${selectedAppointment.id}` || i.id === selectedAppointment.id);
                                    } catch (e) {
                                      return false;
                                    }
                                  });

                                  const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);
                                  const servicePrice = selectedAppointment.service?.price || 0;

                                  const getPaymentMethodTextLocal = (method: string) => {
                                    const m = method.toUpperCase();
                                    if (m === "CASH" || m === "EFECTIVO") return "Efectivo";
                                    if (m === "CARD" || m === "TARJETA") return "Tarjeta";
                                    if (m === "TRANSFER" || m === "TRANSFERENCIA") return "Transferencia";
                                    return method;
                                  };

                                  if (servicePrice === 0) {
                                    return <span className={styles.paymentTagGreen}>GRATUITO</span>;
                                  } else if (totalPaid >= servicePrice) {
                                    const methods = [...new Set(matchingSales.map(s => getPaymentMethodTextLocal(s.paymentMethod)))];
                                    return (
                                      <>
                                        <span className={styles.paymentTagGreen}>PAGADO</span>
                                        {methods.map((method, idx) => (
                                          <span key={idx} className={styles.paymentMethodTag}>
                                            {method}
                                          </span>
                                        ))}
                                      </>
                                    );
                                  } else if (totalPaid > 0) {
                                    const methods = [...new Set(matchingSales.map(s => getPaymentMethodTextLocal(s.paymentMethod)))];
                                    return (
                                      <>
                                        <span className={styles.paymentTagYellow}>PAGO PARCIAL</span>
                                        {methods.map((method, idx) => (
                                          <span key={idx} className={styles.paymentMethodTag}>
                                            {method}
                                          </span>
                                        ))}
                                      </>
                                    );
                                  } else {
                                    return <span className={styles.paymentTagRed}>NO PAGADO</span>;
                                  }
                                })()}
                              </div>
                            </>
                          )}

                          {/* Internal note note text field */}
                          <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #008298", padding: "12px 14px", borderRadius: "0 10px 10px 0" }}>
                            <label style={{ fontWeight: 700, color: "#008298", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Nota interna</label>
                            {isEditingApp ? (
                              <textarea
                                className="input"
                                style={{ minHeight: "80px", width: "100%", padding: "10px", resize: "vertical", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#0f172a", fontSize: "13px" }}
                                placeholder="Añadir comentarios sobre la consulta..."
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                              />
                            ) : (
                              <div style={{ fontSize: "13px", color: "#334155", whiteSpace: "pre-wrap", lineHeight: "1.5", fontWeight: 500 }}>
                                {selectedAppointment.notes || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin notas internas</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {editModalTab === "bonos" && (
                    <div className={styles.bonosPane}>
                      <h4 className={styles.tabSectionTitle}>Bonos del Paciente</h4>

                      {loadingAppointmentVouchers ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Cargando bonos...</p>
                      ) : appointmentClientVouchers.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No hay bonos activos para este paciente.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {appointmentClientVouchers.map((voucher) => {
                            const isExpired = voucher.expirationDate ? new Date(voucher.expirationDate) < new Date() : false;
                            const progress = voucher.sessions > 0 ? (voucher.remainingSessions / voucher.sessions) * 100 : 0;
                            const isShared = !!voucher.isShared;
                            const borderColor = isExpired
                              ? "var(--danger)"
                              : isShared
                              ? "#8b5cf6"
                              : "var(--primary)";

                            return (
                              <div
                                key={voucher.id}
                                style={{
                                  background: "var(--bg-card)",
                                  border: "1px solid var(--border-color)",
                                  borderLeft: `4px solid ${borderColor}`,
                                  borderRadius: "8px",
                                  padding: "14px",
                                  position: "relative",
                                }}
                              >
                                {/* Header row */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>
                                      {voucher.name}
                                    </div>
                                    {isShared && (
                                      <div style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        background: "rgba(139,92,246,0.12)",
                                        color: "#8b5cf6",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                      }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                          <circle cx="9" cy="7" r="4" />
                                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        Compartido por {voucher.ownerClientName}
                                      </div>
                                    )}
                                  </div>
                                  {isExpired ? (
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "rgba(239,68,68,0.12)",
                                      color: "var(--danger)",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                    }}>EXPIRADO</span>
                                  ) : voucher.remainingSessions === 0 ? (
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "rgba(239,68,68,0.12)",
                                      color: "var(--danger)",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                    }}>SIN SESIONES</span>
                                  ) : (
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "rgba(16,185,129,0.12)",
                                      color: "#10b981",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                    }}>ACTIVO</span>
                                  )}
                                </div>

                                {/* Sessions info */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Sesiones restantes</span>
                                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                                    {voucher.remainingSessions} / {voucher.sessions}
                                  </strong>
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                  height: "6px",
                                  borderRadius: "3px",
                                  background: "var(--bg-input)",
                                  overflow: "hidden",
                                  marginBottom: "10px",
                                }}>
                                  <div style={{
                                    height: "100%",
                                    width: `${progress}%`,
                                    borderRadius: "3px",
                                    background: isExpired ? "var(--border-color)" : borderColor,
                                    transition: "width 0.3s ease",
                                  }} />
                                </div>

                                {/* Expiration */}
                                <div style={{ fontSize: "12px", color: isExpired ? "var(--danger)" : "var(--text-secondary)" }}>
                                  {voucher.expirationDate ? (
                                    <>
                                      {isExpired ? "Expirado el " : "Caduca el "}
                                      <strong>{new Date(voucher.expirationDate).toLocaleDateString("es-ES")}</strong>
                                    </>
                                  ) : (
                                    "Sin caducidad"
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {editModalTab === "citas" && (
                    <div className={styles.pastCitasPane}>
                      {/* Sub-tabs buttons */}
                      <div className={styles.citasSubTabs}>
                        <button
                          type="button"
                          className={`${styles.citasSubTabBtn} ${citasSubTab === 'pasadas' ? styles.citasSubTabBtnActive : ''}`}
                          onClick={() => setCitasSubTab('pasadas')}
                        >
                          Citas pasadas
                        </button>
                        <button
                          type="button"
                          className={`${styles.citasSubTabBtn} ${citasSubTab === 'futuras' ? styles.citasSubTabBtnActive : ''}`}
                          onClick={() => setCitasSubTab('futuras')}
                        >
                          Citas futuras
                        </button>
                      </div>

                      {(() => {
                        const clientApps = appointments.filter(
                          (a) => a.clientId === selectedAppointment.clientId
                        );
                        
                        const now = new Date();
                        const pastApps = clientApps.filter(a => new Date(a.start) < now);
                        const futureApps = clientApps.filter(a => new Date(a.start) >= now);
                        
                        const currentAppsList = citasSubTab === 'pasadas' ? pastApps : futureApps;
                        const totalCountText = citasSubTab === 'pasadas'
                          ? `${pastApps.length} Total citas pasadas`
                          : `${futureApps.length} Total citas futuras`;

                        if (currentAppsList.length === 0) {
                          return (
                            <div>
                              <p className={styles.citasEmptyCount}>{totalCountText}</p>
                              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "10px" }}>
                                No se registran citas {citasSubTab === 'pasadas' ? 'anteriores' : 'programadas'}.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div>
                            <p className={styles.citasCountHeader}>{totalCountText}</p>
                            <div className={styles.citasListContainer}>
                              {currentAppsList.map((a) => {
                                const statusLabel = a.status === "CONFIRMED"
                                  ? "CONFIRMADO"
                                  : a.status === "COMPLETED"
                                  ? "COMPLETADO"
                                  : a.status === "CANCELLED"
                                  ? "CANCELADO"
                                  : a.status === "PENDING"
                                  ? "PENDIENTE"
                                  : "NO ASISTIÓ";

                                const statusColorClass = a.status === "CONFIRMED" || a.status === "COMPLETED"
                                  ? styles.citasBadgeGreen
                                  : a.status === "CANCELLED"
                                  ? styles.citasBadgeRed
                                  : a.status === "PENDING"
                                  ? styles.citasBadgeYellow
                                  : styles.citasBadgeGray;

                                const aMatchingSales = agendaSales.filter((sale) => {
                                  try {
                                    const itemsArr = JSON.parse(sale.itemsJson || "[]");
                                    return itemsArr.some((i: any) => i.id === `db-app-${a.id}` || i.id === a.id);
                                  } catch (e) {
                                    return false;
                                  }
                                });

                                const aTotalPaid = aMatchingSales.reduce((sum, s) => sum + s.total, 0);
                                const aPrice = a.service?.price || 0;

                                let paymentLabel = "SIN PAGAR";
                                let paymentColorClass = styles.citasBadgeRed;

                                if (aPrice === 0) {
                                  paymentLabel = "GRATUITO";
                                  paymentColorClass = styles.citasBadgeGreen;
                                } else if (aTotalPaid >= aPrice) {
                                  paymentLabel = "PAGADO";
                                  paymentColorClass = styles.citasBadgeGreen;
                                } else if (aTotalPaid > 0) {
                                  paymentLabel = "PAGO PARCIAL";
                                  paymentColorClass = styles.citasBadgeYellow;
                                }

                                return (
                                  <div key={a.id} className={styles.citasItemBlock}>
                                    <h5 className={styles.citasItemDateHeader}>
                                      {(() => {
                                        const startD = new Date(a.start);
                                        const endD = new Date(a.end);
                                        const monthsSp = [
                                          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                        ];
                                        const monthName = monthsSp[startD.getMonth()];
                                        const date = startD.getDate();
                                        const year = startD.getFullYear();
                                        const startH = String(startD.getHours()).padStart(2, "0");
                                        const startM = String(startD.getMinutes()).padStart(2, "0");
                                        const endH = String(endD.getHours()).padStart(2, "0");
                                        const endM = String(endD.getMinutes()).padStart(2, "0");
                                        return `${monthName} ${date}, ${year} ${startH}:${startM} - ${endH}:${endM}`;
                                      })()}
                                    </h5>
                                    
                                    <div className={styles.citasItemRow}>
                                      <span className={`${styles.citasItemBadge} ${statusColorClass}`}>
                                        {statusLabel}
                                      </span>
                                      <span className={styles.citasItemServiceText}>
                                        {a.service.name}{showPrices ? ` - ${currencySymbol === "€" ? `${a.service.price.toFixed(2).replace(".", ",")} €` : `${currencySymbol}${a.service.price.toFixed(2)}`}` : ""}
                                      </span>
                                    </div>

                                    <div className={styles.citasItemRow}>
                                      <span className={`${styles.citasItemBadge} ${paymentColorClass}`}>
                                        {paymentLabel}
                                      </span>
                                      <span className={styles.citasItemStaffText}>
                                        {a.user.name} {a.user.lastName || ""}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {editModalTab === "seguimientos" && (
                    <div className={styles.seguimientosPane}>
                      <div className={styles.segGeneralBadge}>General</div>
                      
                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Observaciones</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segObservaciones}
                          onChange={(e) => setSegObservaciones(e.target.value)}
                          placeholder="Escribe observaciones aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Diagnóstico</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segDiagnostico}
                          onChange={(e) => setSegDiagnostico(e.target.value)}
                          placeholder="Escribe diagnóstico aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Operación</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segOperacion}
                          onChange={(e) => setSegOperacion(e.target.value)}
                          placeholder="Escribe operación aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Tratamiento</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segTratamiento}
                          onChange={(e) => setSegTratamiento(e.target.value)}
                          placeholder="Escribe tratamiento aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Medicación</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segMedicacion}
                          onChange={(e) => setSegMedicacion(e.target.value)}
                          placeholder="Escribe medicación aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Material y lotes</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segMaterialLotes}
                          onChange={(e) => setSegMaterialLotes(e.target.value)}
                          placeholder="Escribe material y lotes aquí..."
                        />
                      </div>

                      <div className={styles.segActionsRow}>
                        <button 
                          type="button" 
                          className={styles.segBtnEpisode} 
                          onClick={() => alert("Historial clínico / Episodio abierto.")}
                        >
                          Abrir episodio
                        </button>
                        <button 
                          type="button" 
                          className={styles.segBtnFiles} 
                          onClick={() => alert("Seleccionar archivos para adjuntar.")}
                        >
                          <span style={{ fontSize: "16px", fontWeight: "bold", marginRight: "4px" }}>+</span> Adjuntar archivos
                        </button>
                      </div>
                    </div>
                  )}

                  {editModalTab === "historial" && (
                    <div className={styles.historialPane}>
                      {loadingLogs ? (
                        <div className={styles.historialLoading}>
                          <div style={{ width: 24, height: 24, border: "3px solid var(--border-color)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          <span>Cargando historial...</span>
                        </div>
                      ) : appointmentLogs.length === 0 ? (
                        <div className={styles.historialEmpty}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          <p>No hay eventos registrados para esta cita.</p>
                        </div>
                      ) : (
                        <div className={styles.historialTimeline}>
                          {appointmentLogs.map((log, idx) => {
                            const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
                              CREATED:        { icon: "✨", label: "Cita creada",           color: "#10b981" },
                              STATUS_CHANGED: { icon: "🔄", label: "Estado cambiado",       color: "#6366f1" },
                              RESCHEDULED:    { icon: "📅", label: "Reprogramada",          color: "#f59e0b" },
                              STAFF_CHANGED:  { icon: "👤", label: "Profesional cambiado",  color: "#0ea5e9" },
                              SERVICE_CHANGED:{ icon: "🔧", label: "Servicio cambiado",     color: "#8b5cf6" },
                              NOTES_CHANGED:  { icon: "📝", label: "Notas actualizadas",    color: "#64748b" },
                              DELETED:        { icon: "🗑️", label: "Enviada a papelera",    color: "#ef4444" },
                              RESTORED:       { icon: "♻️", label: "Restaurada",             color: "#10b981" },
                            };
                            const cfg = actionConfig[log.action] || { icon: "📋", label: log.action, color: "var(--text-secondary)" };
                            const isLast = idx === appointmentLogs.length - 1;
                            return (
                              <div key={log.id} className={styles.historialItem}>
                                <div className={styles.historialItemLeft}>
                                  <div className={styles.historialDot} style={{ backgroundColor: cfg.color }}>
                                    <span style={{ fontSize: "11px" }}>{cfg.icon}</span>
                                  </div>
                                  {!isLast && <div className={styles.historialLine} />}
                                </div>
                                <div className={styles.historialItemContent}>
                                  <div className={styles.historialAction}>{cfg.label}</div>
                                  {(log.previousValue || log.newValue) && (
                                    <div className={styles.historialChange}>
                                      {log.previousValue && <span className={styles.historialPrev}>{log.previousValue}</span>}
                                      {log.previousValue && log.newValue && <span className={styles.historialArrow}>→</span>}
                                      {log.newValue && <span className={styles.historialNew}>{log.newValue}</span>}
                                    </div>
                                  )}
                                  <div className={styles.historialMeta}>
                                    {log.userName && <span className={styles.historialActor}>{log.userName}</span>}
                                    <span className={styles.historialDate}>
                                      {new Date(log.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {editModalTab === "fotos" && (
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", height: "100%", overflowY: "auto" }}>
                      
                      {/* Selector de Ángulo en Agenda */}
                      <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Ángulo / Perspectiva Activa</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <select
                            value={agendaPhotoAngle}
                            onChange={(e) => setAgendaPhotoAngle(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                              background: "#ffffff",
                              outline: "none"
                            }}
                          >
                            <option value="Frente">Frente (Frontal)</option>
                            <option value="Perfil Izquierdo">Perfil Izquierdo</option>
                            <option value="Perfil Derecho">Perfil Derecho</option>
                            <option value="Otro">Otro ángulo...</option>
                          </select>
                          
                          {agendaPhotoAngle === "Otro" && (
                            <input
                              type="text"
                              placeholder="Ej: 45 grados"
                              value={agendaCustomAngle}
                              onChange={(e) => setAgendaCustomAngle(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                outline: "none"
                              }}
                            />
                          )}
                        </div>

                        {/* Listado de ángulos con fotos registradas */}
                        {(() => {
                          const registeredAngles = Array.from(new Set(appointmentPhotos.map((p) => p.angle || "Frente")));
                          if (registeredAngles.length > 0) {
                            return (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Ángulos con fotos:</span>
                                {registeredAngles.map((ang) => {
                                  const count = appointmentPhotos.filter((p) => (p.angle || "Frente") === ang).length;
                                  const isActive = (agendaPhotoAngle === "Otro" ? agendaCustomAngle : agendaPhotoAngle) === ang;
                                  return (
                                    <button
                                      key={ang}
                                      onClick={() => {
                                        if (ang === "Frente" || ang === "Perfil Izquierdo" || ang === "Perfil Derecho") {
                                          setAgendaPhotoAngle(ang);
                                        } else {
                                          setAgendaPhotoAngle("Otro");
                                          setAgendaCustomAngle(ang);
                                        }
                                      }}
                                      style={{
                                        padding: "3px 8px",
                                        borderRadius: "4px",
                                        border: isActive ? "1px solid #006687" : "1px solid #e2e8f0",
                                        background: isActive ? "#006687" : "#ffffff",
                                        color: isActive ? "#ffffff" : "#475569",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        fontWeight: 600
                                      }}
                                    >
                                      {ang} ({count})
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Panel de Fotos del Ángulo Seleccionado */}
                      {(() => {
                        const currentAngleStr = agendaPhotoAngle === "Otro" ? agendaCustomAngle : agendaPhotoAngle;
                        const filteredPhotos = appointmentPhotos.filter((p) => (p.angle || "Frente") === currentAngleStr);
                        const before = filteredPhotos.find((p) => p.type === "BEFORE");
                        const after = filteredPhotos.find((p) => p.type === "AFTER");

                        return (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                              
                              {/* Panel Antes */}
                              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Antes (Before)</h4>
                                {before ? (
                                  <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "1px solid #cbd5e1" }}>
                                    <img src={before.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <button
                                      onClick={() => handleAgendaPhotoDelete(before.id)}
                                      style={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        background: "rgba(239, 68, 68, 0.9)",
                                        border: "none",
                                        color: "#ffffff",
                                        borderRadius: "50%",
                                        width: "28px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                      }}
                                      title="Eliminar foto"
                                    >
                                      <Icons.Trash size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => { setAgendaPhotoType("BEFORE"); setIsAgendaCameraOpen(true); }}
                                      style={{
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "#006687",
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                      }}
                                    >
                                      <Icons.Camera size={16} />
                                      <span>Hacer Foto</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setAgendaPhotoType("BEFORE"); agendaPhotoInputRef.current?.click(); }}
                                      style={{
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        color: "#475569",
                                        fontWeight: 600,
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                      }}
                                    >
                                      <Icons.Image size={16} />
                                      <span>Subir Foto</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Panel Después */}
                              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Después (After)</h4>
                                {after ? (
                                  <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "1px solid #cbd5e1" }}>
                                    <img src={after.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <button
                                      onClick={() => handleAgendaPhotoDelete(after.id)}
                                      style={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        background: "rgba(239, 68, 68, 0.9)",
                                        border: "none",
                                        color: "#ffffff",
                                        borderRadius: "50%",
                                        width: "28px",
                                        height: "28px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                      }}
                                      title="Eliminar foto"
                                    >
                                      <Icons.Trash size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => { setAgendaPhotoType("AFTER"); setIsAgendaCameraOpen(true); }}
                                      style={{
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "#006687",
                                        color: "#ffffff",
                                        fontWeight: 600,
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                      }}
                                    >
                                      <Icons.Camera size={16} />
                                      <span>Hacer Foto</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setAgendaPhotoType("AFTER"); agendaPhotoInputRef.current?.click(); }}
                                      style={{
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        color: "#475569",
                                        fontWeight: 600,
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px"
                                      }}
                                    >
                                      <Icons.Image size={16} />
                                      <span>Subir Foto</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Slider comparador deslizante si ambas fotos están presentes */}
                            {before && after && (
                              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Comparación Deslizante ({currentAngleStr})</h4>
                                <BeforeAfterSlider
                                  beforeUrl={before.photoUrl}
                                  afterUrl={after.photoUrl}
                                  height="280px"
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={agendaPhotoInputRef}
                        onChange={handleAgendaPhotoFileChange}
                        accept="image/*"
                        style={{ display: "none" }}
                      />
                      {uploadingAgendaPhoto && <span style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>Subiendo foto...</span>}
                    </div>
                  )}
                </div>

                <div className={styles.drawerFooter}>
                  {editModalTab === "seguimientos" ? (
                    <>
                      <button
                        type="button"
                        className={styles.segCancelBtn}
                        onClick={() => setShowEditModal(false)}
                      >
                        Cancelar
                      </button>
                      
                      <button
                        type="button"
                        className={styles.segSaveBtn}
                        onClick={handleSaveSeguimiento}
                      >
                        Guardar
                      </button>
                    </>
                  ) : isEditingApp ? (
                    <div style={{ display: "flex", width: "100%", gap: "10px", justifyContent: "space-between" }}>
                      <button
                        type="button"
                        className={styles.segCancelBtn}
                        onClick={() => {
                          const startD = new Date(selectedAppointment.start);
                          const yyyy = startD.getFullYear();
                          const mm = String(startD.getMonth() + 1).padStart(2, "0");
                          const dd = String(startD.getDate()).padStart(2, "0");
                          setFormDate(`${yyyy}-${mm}-${dd}`);
                          setFormTime(`${String(startD.getHours()).padStart(2, "0")}:${String(startD.getMinutes()).padStart(2, "0")}`);
                          
                          const endD = new Date(selectedAppointment.end);
                          setFormEndTime(`${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`);
                          
                          setFormUserId(selectedAppointment.userId);
                          setFormServiceId(selectedAppointment.serviceId);
                          setFormNotes(selectedAppointment.notes || "");
                          setFormStatus(selectedAppointment.status);

                          setIsEditingApp(false);
                        }}
                        style={{ flex: 1 }}
                      >
                        Cancelar
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointment(null, false, false)}
                        className={styles.segSaveBtn}
                        style={{
                          flex: 1.5,
                          cursor: "pointer"
                        }}
                      >
                        Editar cita
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointment(null, false, true)}
                        className={styles.cajaBtn}
                        style={{
                          flex: 1.8,
                          cursor: "pointer",
                          backgroundColor: "#00b4cc",
                          color: "#fff"
                        }}
                      >
                        Cobrar y Editar cita
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Left: Más opciones context button */}
                      <div style={{ position: "relative" }} ref={moreOptionsRef}>
                        <button
                          type="button"
                          className={styles.moreOptionsBtn}
                          onClick={() => setShowMoreOptions(!showMoreOptions)}
                        >
                          Más opciones <span className={styles.dropdownArrow}>▾</span>
                        </button>
                        {showMoreOptions && (
                          <div className={styles.moreOptionsDropdown} style={{ bottom: "100%", top: "auto", marginBottom: "8px" }}>
                            <div
                              className={styles.moreOptionsItem}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `Cita: ${selectedAppointment.client.firstName} ${selectedAppointment.client.lastName} - ${selectedAppointment.service.name} el ${new Date(selectedAppointment.start).toLocaleDateString("es-ES")}`
                                );
                                toast.success("Cita copiada al portapapeles");
                                setShowMoreOptions(false);
                              }}
                            >
                              Copiar cita
                            </div>
                            
                            <div
                              className={styles.moreOptionsItem}
                              onClick={() => {
                                setIsEditingApp(true);
                                setShowMoreOptions(false);
                              }}
                            >
                              Editar cita
                            </div>
                            <div
                              className={`${styles.moreOptionsItem} ${styles.moreOptionsItemDanger}`}
                              onClick={() => {
                                handleDeleteAppointment();
                                setShowMoreOptions(false);
                              }}
                            >
                              Eliminar cita
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Caja button linking to checkout */}
                      <button
                        type="button"
                        className={styles.cajaBtn}
                        onClick={() => {
                          window.location.href = `/dashboard/sales?clientId=${selectedAppointment.clientId}&serviceId=${selectedAppointment.serviceId}&appointmentId=${selectedAppointment.id}`;
                        }}
                      >
                        Caja
                      </button>
                    </>
                  )}
                </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CHOOSE OPTION MODAL */}
      {showOptionModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowOptionModal(false)}>
          <div className={`${styles.optionModalContent} glass fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Seleccionar Acción</h2>
              <button onClick={() => setShowOptionModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>
            
            <div className={styles.optionModalButtons}>
              <button
                type="button"
                className={styles.optionBtn}
                onClick={() => {
                  setShowOptionModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className={styles.optionBtnIcon}>
                  <Icons.Calendar size={24} />
                </div>
                <div className={styles.optionBtnText}>
                  <strong>Nueva Cita</strong>
                  <span>Agendar una cita para un paciente</span>
                </div>
              </button>

              <button
                type="button"
                className={styles.optionBtn}
                onClick={() => {
                  setShowOptionModal(false);
                  setShowBlockModal(true);
                }}
              >
                <div className={`${styles.optionBtnIcon} ${styles.optionIconBlock}`}>
                  <Icons.Lock size={24} />
                </div>
                <div className={styles.optionBtnText}>
                  <strong>Nueva reserva de tiempo</strong>
                  <span>Bloquear horas en la agenda</span>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE TIME BLOCK MODAL */}
      {showBlockModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowBlockModal(false)}>
          <div className={`${styles.blockModalContent} glass fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.blockModalTitle}>Nueva reserva de tiempo</h2>
              <button onClick={() => setShowBlockModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleCreateTimeBlock} className={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre de la reserva</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Introduzca el nombre de la reserva"
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  required
                />
              </div>

              {/* Date Indicator Row with cycle icon & Multi-date select */}
              <div className={styles.blockDateContainer} ref={frequencyPopoverRef}>
                <div
                  className={styles.blockDateRow}
                  onClick={() => setShowFrequencyPopover(!showFrequencyPopover)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Icons.Sync size={16} className={styles.blockDateIcon} />
                  <span className={styles.blockDateText}>
                    {selectedBlockDates.length === 1 ? (
                      (() => {
                        const parts = selectedBlockDates[0].split("-");
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      })()
                    ) : (
                      `Esta se repetirá en ${selectedBlockDates.length} ocasiones`
                    )}
                  </span>
                </div>

                {showFrequencyPopover && (
                  <div className={styles.frequencyPopover} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.popoverFrequencyRow}>
                      <span className={styles.popoverFrequencyLabel}>Frecuencia</span>
                      <select className={styles.popoverFrequencySelect} defaultValue="seleccionar">
                        <option value="seleccionar">Seleccionar días</option>
                      </select>
                    </div>

                    <div className={styles.popoverCalendarHeader}>
                      <button
                        type="button"
                        className={styles.popoverNavBtn}
                        onClick={() => {
                          if (popoverMonth === 0) {
                            setPopoverMonth(11);
                            setPopoverYear(popoverYear - 1);
                          } else {
                            setPopoverMonth(popoverMonth - 1);
                          }
                        }}
                      >
                        &lt;
                      </button>

                      <div className={styles.popoverSelectors}>
                        <select
                          className={styles.popoverMonthSelect}
                          value={popoverMonth}
                          onChange={(e) => setPopoverMonth(parseInt(e.target.value))}
                        >
                          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, idx) => (
                            <option key={idx} value={idx}>{m}</option>
                          ))}
                        </select>
                        <select
                          className={styles.popoverYearSelect}
                          value={popoverYear}
                          onChange={(e) => setPopoverYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className={styles.popoverNavBtn}
                        onClick={() => {
                          if (popoverMonth === 11) {
                            setPopoverMonth(0);
                            setPopoverYear(popoverYear + 1);
                          } else {
                            setPopoverMonth(popoverMonth + 1);
                          }
                        }}
                      >
                        &gt;
                      </button>
                    </div>

                    <div className={styles.popoverCalendarWeekdays}>
                      {["L", "M", "M", "J", "V", "S", "D"].map((w, idx) => (
                        <div key={idx} className={styles.popoverWeekday}>{w}</div>
                      ))}
                    </div>

                    <div className={styles.popoverCalendarGrid}>
                      {(() => {
                        const daysInMonth = new Date(popoverYear, popoverMonth + 1, 0).getDate();
                        const firstDayOffset = (new Date(popoverYear, popoverMonth, 1).getDay() + 6) % 7;
                        const cells = [];
                        for (let i = 0; i < firstDayOffset; i++) {
                          cells.push(<div key={`empty-${i}`} className={styles.popoverEmptyCell} />);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${popoverYear}-${String(popoverMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isSelected = selectedBlockDates.includes(dateStr);
                          cells.push(
                            <div
                              key={d}
                              className={`${styles.popoverDayCell} ${isSelected ? styles.popoverDaySelected : ""}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedBlockDates(selectedBlockDates.filter(x => x !== dateStr));
                                } else {
                                  setSelectedBlockDates([...selectedBlockDates, dateStr]);
                                }
                              }}
                            >
                              <span className={styles.popoverDayNumber}>{d}</span>
                            </div>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>
                )}

                {selectedBlockDates.length > 0 && (
                  <div className={styles.selectedDatesBadges}>
                    {selectedBlockDates.map(d => {
                      const parts = d.split("-");
                      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      return (
                        <div key={d} className={styles.dateBadge}>
                          <span>{formatted}</span>
                          <button
                            type="button"
                            className={styles.deleteBadgeBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedBlockDates.length > 1) {
                                  setSelectedBlockDates(selectedBlockDates.filter(x => x !== d));
                              } else {
                                toast.warning("Debe haber al menos un día seleccionado.");
                              }
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dropdowns of start and end hours */}
              <div className={styles.blockTimeDropdowns}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Inicio</label>
                  <select
                    className="input select"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Final</label>
                  <select
                    className="input select"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Añadir nota</label>
                <textarea
                  className="input"
                  style={{ minHeight: "120px", resize: "vertical" }}
                  placeholder=""
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                />
              </div>

              <div className={styles.blockModalActions}>
                <button
                  type="button"
                  className={styles.blockCancelBtn}
                  onClick={() => setShowBlockModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.blockCreateBtn}
                  onClick={handleCreateTimeBlock}
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW/EDIT TIME BLOCK DETAIL MODAL */}
      {showBlockDetailModal && selectedTimeBlock && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowBlockDetailModal(false)}>
          <div className={`${styles.blockModalContent} glass fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={styles.blockModalTitle}>Nueva reserva de tiempo</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className={styles.convertBtn}
                  onClick={handleConvertBlockToAppointment}
                >
                  Convertir a cita
                </button>
                <button onClick={() => setShowBlockDetailModal(false)} className={styles.closeBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTimeBlock} className={styles.modalForm}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre de la reserva</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Introduzca el nombre de la reserva"
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  required
                />
              </div>

              {/* Dropdowns of start and end hours (NO DATE SELECTION) */}
              <div className={styles.blockTimeDropdowns} style={{ marginBottom: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Inicio</label>
                  <select
                    className="input select"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Final</label>
                  <select
                    className="input select"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Añadir nota</label>
                <textarea
                  className="input"
                  style={{ minHeight: "120px", resize: "vertical" }}
                  placeholder=""
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                />
              </div>

              {/* Footer Actions: Eliminar (red border), Cancelar (blue border), Actualizar (solid green) */}
              <div className={styles.blockEditActionsRow}>
                <button
                  type="button"
                  className={styles.blockDeleteBtnBorder}
                  onClick={() => handleDeleteTimeBlock(selectedTimeBlock.id)}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className={styles.blockCancelBtnBorder}
                  onClick={() => setShowBlockDetailModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.blockUpdateBtnSolid}
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* OPTIONS SIDEBAR DRAWER — rendered via Portal to cover the full viewport */}
      {showOpcionesSidebar && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowOpcionesSidebar(false)}>
          <div className={styles.drawerWrapper} onClick={(e) => e.stopPropagation()}>

            {/* Left panel: Opciones menu list */}
            <div className={styles.drawerContent}>
              <div className={styles.drawerHeader}>
                <h3>Opciones</h3>
                <button onClick={() => setShowOpcionesSidebar(false)} className={styles.drawerCloseBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <div className={styles.optionsList}>
                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "weekends" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempHideWeekends(hideWeekends);
                      setSidebarSubView("weekends");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Fines de semana</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                      <span>Avisos al crear citas</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "zoom" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempZoomLevel(zoomLevel);
                      setSidebarSubView("zoom");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>Zoom</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "etiquetas" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setGlobalTagsSubView("list");
                      setSearchGlobalTagQuery("");
                      setSidebarSubView("etiquetas");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <span>Etiquetas</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "imprimir" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setPrintCheckedStaffIds(staffList.map((s) => s.id));
                      setPrintCitasAnteriores(true);
                      setSidebarSubView("imprimir");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>Imprimir agenda</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "vista" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempQuitarNombreSemanal(quitarNombreSemanal);
                      setTempMostrar24Horas(mostrar24Horas);
                      setSidebarSubView("vista");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Vista</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right panel: Submenu (visible when a submenu item is selected) */}
            {sidebarSubView === "weekends" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Fines de semana</h3>
                </div>

                <div className={styles.submenuBody}>
                  <div className={styles.toggleRow}>
                    <label className={styles.switchLabel}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={tempHideWeekends}
                        onChange={(e) => setTempHideWeekends(e.target.checked)}
                      />
                      <span className={styles.switchSlider} />
                      <span className={styles.switchText}>Ocultar Fines De Semana</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px", cursor: "help" }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </label>
                  </div>
                </div>

                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowOpcionesSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setHideWeekends(tempHideWeekends);
                      // Auto-saved by the hideWeekends useEffect

                      if (tempHideWeekends) {
                        const day = currentDate.getDay();
                        if (day === 0) {
                          const newD = new Date(currentDate);
                          newD.setDate(currentDate.getDate() + 1);
                          setCurrentDate(newD);
                        } else if (day === 6) {
                          const newD = new Date(currentDate);
                          newD.setDate(currentDate.getDate() + 2);
                          setCurrentDate(newD);
                        }
                      }

                      setShowOpcionesSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Right panel: Zoom Submenu */}
            {sidebarSubView === "zoom" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Zoom</h3>
                </div>

                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      Altura del calendario
                    </label>
                    <select
                      className="input select"
                      value={tempZoomLevel}
                      onChange={(e) => setTempZoomLevel(e.target.value as "poco" | "normal" | "grande")}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="poco">Pequeño</option>
                      <option value="normal">Mediano</option>
                      <option value="grande">Grande</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      Ancho del calendario
                    </label>
                    <select
                      className="input select"
                      defaultValue="normal"
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="normal">Normal</option>
                      <option value="ancho">Ancho completo</option>
                    </select>
                  </div>
                </div>

                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowOpcionesSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setZoomLevel(tempZoomLevel);
                      setShowOpcionesSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {sidebarSubView === "vista" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Vista</h3>
                </div>

                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className={styles.toggleRow} style={{ marginBottom: "20px" }}>
                    <label className={styles.switchLabel}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={tempQuitarNombreSemanal}
                        onChange={(e) => setTempQuitarNombreSemanal(e.target.checked)}
                      />
                      <span className={styles.switchSlider} />
                      <span className={styles.switchText} style={{ whiteSpace: "normal", display: "inline-block", maxWidth: "200px" }}>
                        Quitar Nombre De Los Usuarios/Recursos En La Agenda
                      </span>
                    </label>
                  </div>

                  <div className={styles.toggleRow}>
                    <label className={styles.switchLabel}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={tempMostrar24Horas}
                        onChange={(e) => setTempMostrar24Horas(e.target.checked)}
                      />
                      <span className={styles.switchSlider} />
                      <span className={styles.switchText}>
                        Mostrar Las 24 Horas En La Agenda
                      </span>
                    </label>
                  </div>
                </div>

                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowOpcionesSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setQuitarNombreSemanal(tempQuitarNombreSemanal);
                      setMostrar24Horas(tempMostrar24Horas);
                      setShowOpcionesSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {sidebarSubView === "imprimir" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Imprimir agenda</h3>
                </div>

                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.4" }}>
                    Seleccionar los empleados para imprimir sus respectivas citas:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", maxHeight: "300px", overflowY: "auto" }}>
                    {staffList.map((staff) => {
                      const isChecked = printCheckedStaffIds.includes(staff.id);
                      return (
                        <button
                          key={staff.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setPrintCheckedStaffIds(prev => prev.filter(id => id !== staff.id));
                            } else {
                              setPrintCheckedStaffIds(prev => [...prev, staff.id]);
                            }
                          }}
                          style={{ border: "none", background: "none", width: "100%", textAlign: "left", display: "flex", alignItems: "center", padding: "6px 0", cursor: "pointer" }}
                        >
                          <div
                            className={styles.checkboxCustomDropdown}
                            style={{
                              backgroundColor: isChecked ? "var(--primary)" : "var(--bg-input)",
                              borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                              marginRight: "10px",
                              flexShrink: 0
                            }}
                          >
                            {isChecked && <Icons.Check size={10} style={{ color: "white" }} />}
                          </div>
                          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: isChecked ? "600" : "normal" }}>
                            {staff.name} {staff.lastName || ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.toggleRow} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "15px" }}>
                    <label className={styles.switchLabel}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={printCitasAnteriores}
                        onChange={(e) => setPrintCitasAnteriores(e.target.checked)}
                      />
                      <span className={styles.switchSlider} />
                      <span className={styles.switchText}>
                        Imprimir Citas Anteriores A Hoy
                      </span>
                    </label>
                  </div>
                </div>

                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowOpcionesSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      handlePrintAgenda();
                      setShowOpcionesSidebar(false);
                    }}
                  >
                    Imprimir
                  </button>
                </div>
              </div>
            )}

            {sidebarSubView === "etiquetas" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Etiquetas</h3>
                </div>

                {globalTagsSubView === "list" ? (
                  <>
                    <div className={styles.submenuBody} style={{ padding: "20px", display: "flex", flexDirection: "column", height: "calc(100% - 130px)", overflow: "hidden" }}>
                      <div className={styles.tagsSearchWrapper} style={{ marginBottom: "15px" }}>
                        <svg className={styles.tagsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                          type="text"
                          className={styles.tagsSearchInput}
                          placeholder="Buscar etiqueta"
                          value={searchGlobalTagQuery}
                          onChange={(e) => setSearchGlobalTagQuery(e.target.value)}
                        />
                      </div>

                      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {availableTags
                          .filter(tag => tag.name.toLowerCase().includes(searchGlobalTagQuery.toLowerCase()))
                          .map(tag => (
                            <div
                              key={tag.name}
                              style={{
                                backgroundColor: tag.color,
                                padding: "8px 12px",
                                borderRadius: "6px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "12px",
                              }}
                            >
                              <span>{tag.name}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteTagGlobal(tag.name)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "white",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: 0,
                                }}
                                title="Eliminar etiqueta"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </div>
                          ))}
                        {availableTags.filter(tag => tag.name.toLowerCase().includes(searchGlobalTagQuery.toLowerCase())).length === 0 && (
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>Sin etiquetas disponibles</div>
                        )}
                      </div>
                    </div>

                    <div className={styles.submenuFooter} style={{ justifyContent: "flex-end", gap: "10px" }}>
                      <button
                        type="button"
                        className={styles.submenuApplyBtn}
                        onClick={() => {
                          setGlobalTagsSubView("create");
                          setNewGlobalTagName("");
                          setNewGlobalTagColor("#add8e6");
                        }}
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        Nueva etiqueta
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.submenuBody} style={{ padding: "20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Nombre</label>
                          <input 
                            type="text"
                            className="input"
                            style={{ width: "100%", fontSize: "13px", padding: "8px 12px", outline: "none", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                            placeholder="Nombre de la etiqueta"
                            value={newGlobalTagName}
                            onChange={(e) => setNewGlobalTagName(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Asignar color</label>
                          <div className={styles.colorPickerGrid}>
                            {TAG_COLORS.map(color => (
                              <div
                                key={color}
                                className={`${styles.colorCircle} ${newGlobalTagColor === color ? styles.colorCircleSelected : ""}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewGlobalTagColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.submenuFooter}>
                      <button
                        type="button"
                        className={styles.submenuCancelBtn}
                        onClick={() => setGlobalTagsSubView("list")}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={styles.submenuApplyBtn}
                        disabled={!newGlobalTagName.trim()}
                        onClick={() => {
                          const tagName = newGlobalTagName.trim().toUpperCase();
                          if (availableTags.some(t => t.name === tagName)) {
                            toast.success("Esta etiqueta ya existe.");
                            return;
                          }
                          const updated = [...availableTags, { name: tagName, color: newGlobalTagColor }];
                          setAvailableTags(updated);
                          localStorage.setItem("clifav_available_tags", JSON.stringify(updated));
                          setGlobalTagsSubView("list");
                        }}
                      >
                        Guardar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* 1. CONVERT TIMEBLOCK TO APPOINTMENT MODAL (Image 3) */}
      {showConvertModal && selectedTimeBlock && (
        <div className={styles.modalOverlay} onClick={() => setShowConvertModal(false)}>
          <div className={`${styles.blockModalContent} glass fade-in`} style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={styles.blockModalTitle}>Convertir a cita</h2>
              <button onClick={() => setShowConvertModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleExecuteConvertBlock} className={styles.modalForm}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Cliente</label>
                <select
                  className="input select"
                  value={convertClientId}
                  onChange={(e) => setConvertClientId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Servicio</label>
                <select
                  className="input select"
                  value={convertServiceId}
                  onChange={(e) => setConvertServiceId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                >
                  {servicesList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{showPrices ? ` (${s.price} €)` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Ubicación</label>
                <select
                  className="input select"
                  value={convertLocationId}
                  onChange={(e) => setConvertLocationId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                >
                  <option value={activeClinic?.id}>{activeClinic?.name}</option>
                </select>
              </div>

              <div className={styles.blockEditActionsRow} style={{ justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className={styles.blockCancelBtnBorder}
                  onClick={() => setShowConvertModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.blockUpdateBtnSolid}
                  style={{ background: "#10b981", borderColor: "#10b981" }}
                >
                  Convertir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. FILTERS SIDEBAR DRAWER (Image 4 and Image 5) */}
      {showFiltersSidebar && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowFiltersSidebar(false)}>
          <div className={styles.drawerWrapper} onClick={(e) => e.stopPropagation()}>
            
            {/* Left panel: Filters list */}
            <div className={styles.drawerContent}>
              <div className={styles.drawerHeader}>
                <h3>Filtros</h3>
                <button onClick={() => setShowFiltersSidebar(false)} className={styles.drawerCloseBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>
              
              <div className={styles.drawerBody}>
                <div className={styles.optionsList}>
                  <button
                    type="button"
                    className={`${styles.optionItem} ${filtersSubView === "direcciones" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempFilterClinicId(filterClinicId);
                      setFiltersSubView("direcciones");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon} style={{ marginRight: "8px" }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      <span>Direcciones</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${filtersSubView === "servicios" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempFilterServiceId(selectedServiceId);
                      setFiltersSubView("servicios");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon} style={{ marginRight: "8px" }}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                      <span>Servicios</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${filtersSubView === "clientes" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempFilterClientId(filterClientId);
                      setFiltersSubView("clientes");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon} style={{ marginRight: "8px" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span>Clientes</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right panel: Direcciones Submenu */}
            {filtersSubView === "direcciones" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Direcciones</h3>
                </div>
                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      DIRECCIÓN
                    </label>
                    <select
                      className="input select"
                      value={tempFilterClinicId}
                      onChange={(e) => setTempFilterClinicId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="all">Seleccionar</option>
                      {currentUser?.clinics?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowFiltersSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setFilterClinicId(tempFilterClinicId);
                      setShowFiltersSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Right panel: Servicios Submenu */}
            {filtersSubView === "servicios" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Servicios</h3>
                </div>
                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      SERVICIO
                    </label>
                    <select
                      className="input select"
                      value={tempFilterServiceId}
                      onChange={(e) => setTempFilterServiceId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="all">Seleccionar</option>
                      {servicesList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowFiltersSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setSelectedServiceId(tempFilterServiceId);
                      setShowFiltersSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Right panel: Clientes Submenu */}
            {filtersSubView === "clientes" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Clientes</h3>
                </div>
                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      CLIENTE
                    </label>
                    <select
                      className="input select"
                      value={tempFilterClientId}
                      onChange={(e) => setTempFilterClientId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="all">Seleccionar</option>
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowFiltersSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setFilterClientId(tempFilterClientId);
                      setShowFiltersSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* 3. WAITLIST SIDEBAR DRAWER */}
      {showWaitlistSidebar && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowWaitlistSidebar(false)}>
          <div className={styles.drawerWrapper} onClick={(e) => e.stopPropagation()}>
            
            {/* Main panel: Waitlist entries */}
            <div className={styles.drawerContent} style={{ width: "380px" }}>
              <div className={styles.drawerHeader}>
                <h3>Lista de espera</h3>
                <button onClick={() => setShowWaitlistSidebar(false)} className={styles.drawerCloseBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>

              {waitlistSubView === "list" ? (
                <>
                  <div style={{ padding: "16px 20px 8px 20px" }}>
                    <button
                      type="button"
                      className={styles.addWaitlistButton}
                      onClick={() => {
                        setWaitlistClientId("");
                        setWaitlistUserId("all");
                        setWaitlistServiceId("all");
                        setWaitlistNotes("");
                        setWaitlistPreferredDay("all");
                        setWaitlistPreferredTime("all");
                        setWaitlistSubView("add");
                      }}
                    >
                      + Añadir a lista de espera
                    </button>
                  </div>

                  <div className={styles.drawerBody} style={{ padding: "10px 20px" }}>
                    {waitlist.length === 0 ? (
                      <div className={styles.emptyWaitlistState}>
                        <p>No hay pacientes en la lista de espera.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {waitlist.map((entry) => {
                          const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                          const dayPref = entry.preferredDayOfWeek !== null ? dayNames[entry.preferredDayOfWeek] : "Cualquier día";
                          const timePref = entry.preferredTimeRange || "Cualquier horario";

                          return (
                            <div key={entry.id} className={styles.waitlistCard}>
                              <div className={styles.waitlistCardHeader}>
                                <strong>{entry.client.firstName} {entry.client.lastName}</strong>
                                <span className={styles.waitlistCardDate}>
                                  {new Date(entry.createdAt).toLocaleDateString("es-ES")}
                                </span>
                              </div>

                              <div className={styles.waitlistCardDetail}>
                                <div>
                                  <strong>Servicio:</strong> {entry.service?.name || "Cualquiera"}
                                </div>
                                <div>
                                  <strong>Profesional:</strong> {entry.user?.name || "Cualquiera"}
                                </div>
                                <div>
                                  <strong>Preferencia:</strong> {dayPref} ({timePref})
                                </div>
                                {entry.notes && (
                                  <div className={styles.waitlistCardNotes}>
                                    "{entry.notes}"
                                  </div>
                                )}
                              </div>

                              <div className={styles.waitlistCardActions}>
                                <button
                                  type="button"
                                  className={styles.waitlistAssignBtn}
                                  onClick={() => {
                                    setActiveWaitlistEntryForAppointment(entry);
                                    setFormClientId(entry.clientId);
                                    setFormServiceId(entry.serviceId || servicesList[0]?.id || "");
                                    setFormUserId(entry.userId || staffList[0]?.id || "");
                                    setFormNotes(`Cita asignada desde Lista de Espera.\nPreferencia: ${dayPref} (${timePref}).\nNotas: ${entry.notes || ""}`);
                                    
                                    const todayStr = new Date().toISOString().split("T")[0];
                                    setFormDate(todayStr);
                                    setFormTime("09:00");
                                    
                                    setShowWaitlistSidebar(false);
                                    setShowCreateModal(true);
                                  }}
                                  title="Asignar Cita en Calendario"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  Asignar cita
                                </button>

                                <button
                                  type="button"
                                  className={styles.waitlistDeleteBtn}
                                  onClick={() => handleDeleteWaitlistEntry(entry.id)}
                                  title="Quitar de la lista"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleAddToWaitlist} className={styles.waitlistForm}>
                  <div className={styles.drawerBody} style={{ padding: "20px" }}>
                    <h4 style={{ marginBottom: "16px", marginTop: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                      Añadir paciente en espera
                    </h4>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Paciente *</label>
                      <select
                        className="input select"
                        value={waitlistClientId}
                        onChange={(e) => setWaitlistClientId(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                        required
                      >
                        <option value="">Seleccionar paciente...</option>
                        {clientsList.map((c) => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Profesional preferido</label>
                      <select
                        className="input select"
                        value={waitlistUserId}
                        onChange={(e) => setWaitlistUserId(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier profesional</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} {s.lastName || ""}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Servicio preferido</label>
                      <select
                        className="input select"
                        value={waitlistServiceId}
                        onChange={(e) => setWaitlistServiceId(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier servicio</option>
                        {servicesList.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Día preferido</label>
                      <select
                        className="input select"
                        value={waitlistPreferredDay}
                        onChange={(e) => setWaitlistPreferredDay(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier día</option>
                        <option value="1">Lunes</option>
                        <option value="2">Martes</option>
                        <option value="3">Miércoles</option>
                        <option value="4">Jueves</option>
                        <option value="5">Viernes</option>
                        <option value="6">Sábado</option>
                        <option value="0">Domingo</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Horario preferido</label>
                      <select
                        className="input select"
                        value={waitlistPreferredTime}
                        onChange={(e) => setWaitlistPreferredTime(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier horario</option>
                        <option value="Mañana">Mañana (08:00 - 14:00)</option>
                        <option value="Tarde">Tarde (14:00 - 20:00)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "20px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Disponibilidad / Notas</label>
                      <textarea
                        className="input"
                        placeholder="Escribe comentarios sobre disponibilidad u observaciones..."
                        value={waitlistNotes}
                        onChange={(e) => setWaitlistNotes(e.target.value)}
                        style={{ width: "100%", minHeight: "80px", resize: "vertical", padding: "8px 12px" }}
                      />
                    </div>
                  </div>

                  <div className={styles.drawerFooter} style={{ padding: "16px 20px" }}>
                    <button
                      type="button"
                      className={styles.submenuCancelBtn}
                      style={{ flex: 1 }}
                      onClick={() => setWaitlistSubView("list")}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={styles.submenuApplyBtn}
                      style={{ flex: 1, backgroundColor: "#10b981", borderColor: "#10b981" }}
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {showServiceWarningModal && createPortal(
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowServiceWarningModal(false)}
        >
          <div 
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              width: "480px",
              maxWidth: "90%",
              overflow: "hidden",
              position: "relative",
              borderLeft: "6px solid #d32f2f", // Red bar on the left
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button top right */}
            <button 
              type="button"
              onClick={() => setShowServiceWarningModal(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Warning Icon (Red circle with i) */}
                <div 
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#d32f2f",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    fontFamily: "serif",
                  }}
                >
                  i
                </div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#111827", fontWeight: 600 }}>Advertencia</h3>
              </div>
              <p style={{ margin: 0, fontSize: "15px", color: "#4b5563", lineHeight: "1.5" }}>
                El personal no ofrece este servicio, ¿estás seguro?
              </p>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", backgroundColor: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f3f4f6" }}>
              <button 
                type="button"
                onClick={() => setShowServiceWarningModal(false)}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                No
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowServiceWarningModal(false);
                  if (warningModalConfirmCallback) {
                    warningModalConfirmCallback();
                  }
                }}
                style={{
                  backgroundColor: "#d32f2f",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Sí
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CÁMARA MODAL EN AGENDA */}
      <CameraCaptureModal
        isOpen={isAgendaCameraOpen}
        onClose={() => setIsAgendaCameraOpen(false)}
        onCapture={handleAgendaPhotoUpload}
      />

    </div>
  );
}
