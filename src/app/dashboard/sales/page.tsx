"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Sales.module.css";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  clientNumber?: number;
  dniNif?: string;
  address?: string;
  municipality?: string;
  postalCode?: string;
  isSelfEmployed?: boolean;
  isCompany?: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  tax?: number;
}

interface CartItem {
  id: string;
  name: string;
  type: "service" | "product";
  price: number;
  quantity: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clinicId: string;
  total: number;
  discount: number;
  paymentMethod: string;
  itemsJson: string;
  createdAt: string;
  client?: Client;
}

interface Movement {
  id: string;
  concept: string;
  amount: number;
  method: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  clinicId: string;
}


const IconPrinter = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const IconThermal = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="2" x2="20" y2="2"></line>
    <rect x="4" y="6" width="16" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="10" x2="16" y2="10"></line>
    <line x1="8" y1="14" x2="14" y2="14"></line>
  </svg>
);

const IconDownload = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const IconMail = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const IconWhatsapp = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const IconRectify = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 2v6h6M21.5 22v-6h-6"></path>
    <path d="M22 11.5A10 10 0 0 0 3.2 7.2L2.5 8M2 12.5a10 10 0 0 0 18.8 4.3l.7-.8"></path>
  </svg>
);

const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

interface ArticleItem {
  id: string;
  refMov: string;
  nuV: string;
  fecha: string;
  fechaRaw: Date;
  hora: string;
  tipo: string;
  detalle: string;
  clientNumber: string;
  cliente: string;
  clientId?: string;
  dni: string;
  empleado: string;
  consulta: string;
  estado: string;
  metodoPago: string;
  fechaPago: string;
  price: number;
  factura: string;
  precio: number;
  iva: number;
  irpf: number;
  total: number;
  pagado: number;
}

interface PaymentMethodItem {
  key: string;
  label: string;
  enabled: boolean;
  className?: string;
  isCustom?: boolean;
}

// ----------------------------------------------------
// MOCK DATA FROM SCREENSHOTS FOR PERFECT FIRST LOOK
// ----------------------------------------------------
const MOCK_ARTICULOS: ArticleItem[] = [
  {
    id: "mock-art-1",
    refMov: "#448",
    nuV: "-",
    fecha: "15/10/2025",
    fechaRaw: new Date("2025-10-15T15:30:00"),
    hora: "15:30 - 16:30",
    tipo: "Servicio",
    detalle: "LPG + Presoterapia",
    clientNumber: "#126",
    cliente: "Lucia Posada",
    dni: "-",
    empleado: "Laura Mesa",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "GRATUITO",
    metodoPago: "-",
    fechaPago: "-",
    price: 0,
    factura: "",
    precio: 0,
    iva: 0,
    irpf: 0,
    total: 0,
    pagado: 0,
  },
  {
    id: "mock-art-2",
    refMov: "#447",
    nuV: "#112",
    fecha: "08/10/2025",
    fechaRaw: new Date("2025-10-08T17:30:00"),
    hora: "17:30 - 17:40",
    tipo: "Servicio",
    detalle: "Ac. Hialurónico 1 ml",
    clientNumber: "#144",
    cliente: "Maria jose lloret lopez",
    dni: "-",
    empleado: "Vicenta Llorca",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "08/10/2025",
    price: 260,
    factura: "",
    precio: 260,
    iva: 0,
    irpf: 0,
    total: 260,
    pagado: 260,
  },
  {
    id: "mock-art-3",
    refMov: "#446",
    nuV: "#117",
    fecha: "15/10/2025",
    fechaRaw: new Date("2025-10-15T12:00:00"),
    hora: "12:00 - 12:30",
    tipo: "Servicio",
    detalle: "mesoterapia abdominal",
    clientNumber: "#92",
    cliente: "Maribel lledo Sanchez",
    dni: "-",
    empleado: "Laura Mesa",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "GRATUITO",
    metodoPago: "-",
    fechaPago: "-",
    price: 0,
    factura: "",
    precio: 0,
    iva: 0,
    irpf: 0,
    total: 0,
    pagado: 0,
  },
  {
    id: "mock-art-4",
    refMov: "#445",
    nuV: "-",
    fecha: "08/10/2025",
    fechaRaw: new Date("2025-10-08T17:45:00"),
    hora: "17:45 - 17:55",
    tipo: "Servicio",
    detalle: "Personalizado",
    clientNumber: "#16",
    cliente: "TRINIDAD SÁEZ",
    dni: "48330135 M",
    empleado: "Vicenta Llorca",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "GRATUITO",
    metodoPago: "-",
    fechaPago: "-",
    price: 0,
    factura: "",
    precio: 0,
    iva: 0,
    irpf: 0,
    total: 0,
    pagado: 0,
  },
  {
    id: "mock-art-5",
    refMov: "#443",
    nuV: "#113",
    fecha: "08/10/2025",
    fechaRaw: new Date("2025-10-08T17:15:00"),
    hora: "17:15 - 17:25",
    tipo: "Servicio",
    detalle: "Personalizado",
    clientNumber: "#156",
    cliente: "CRISTINA SILVA BELOSIAGUE",
    dni: "-",
    empleado: "Vicenta Llorca",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "08/10/2025",
    price: 100,
    factura: "",
    precio: 100,
    iva: 0,
    irpf: 0,
    total: 100,
    pagado: 100,
  },
  {
    id: "mock-art-6",
    refMov: "#442",
    nuV: "-",
    fecha: "08/10/2025",
    fechaRaw: new Date("2025-10-08T17:00:00"),
    hora: "17:00 - 17:10",
    tipo: "Servicio",
    detalle: "Revisión",
    clientNumber: "#84",
    cliente: "Remedios Márquez Llorca",
    dni: "73989179I",
    empleado: "Vicenta Llorca",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "GRATUITO",
    metodoPago: "-",
    fechaPago: "-",
    price: 0,
    factura: "",
    precio: 0,
    iva: 0,
    irpf: 0,
    total: 0,
    pagado: 0,
  },
  {
    id: "mock-art-7",
    refMov: "#441",
    nuV: "-",
    fecha: "08/10/2025",
    fechaRaw: new Date("2025-10-08T15:30:00"),
    hora: "15:30 - 15:45",
    tipo: "Servicio",
    detalle: "Primera Visita",
    clientNumber: "#155",
    cliente: "Mascha looks",
    dni: "-",
    empleado: "Vicenta Llorca",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "GRATUITO",
    metodoPago: "-",
    fechaPago: "-",
    price: 0,
    factura: "",
    precio: 0,
    iva: 0,
    irpf: 0,
    total: 0,
    pagado: 0,
  },
  {
    id: "mock-art-8",
    refMov: "#436",
    nuV: "#109",
    fecha: "06/10/2025",
    fechaRaw: new Date("2025-10-06T18:00:00"),
    hora: "18:00 - 19:00",
    tipo: "Servicio",
    detalle: "LPG + Presoterapia",
    clientNumber: "#87",
    cliente: "Ana Amoros Pico",
    dni: "52780542G",
    empleado: "Laura Mesa",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "06/10/2025",
    price: 260,
    factura: "",
    precio: 260,
    iva: 0,
    irpf: 0,
    total: 260,
    pagado: 260,
  },
  {
    id: "mock-art-9",
    refMov: "#435",
    nuV: "#140",
    fecha: "15/10/2025",
    fechaRaw: new Date("2025-10-15T18:15:00"),
    hora: "18:15 - 19:15",
    tipo: "Servicio",
    detalle: "LPG + Presoterapia",
    clientNumber: "#154",
    cliente: "Anabel Peres ronda",
    dni: "74008299 A",
    empleado: "Laura Mesa",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "15/10/2025",
    price: 260,
    factura: "",
    precio: 260,
    iva: 0,
    irpf: 0,
    total: 260,
    pagado: 260,
  },
  {
    id: "mock-art-10",
    refMov: "#429",
    nuV: "#126",
    fecha: "14/10/2025",
    fechaRaw: new Date("2025-10-14T18:45:00"),
    hora: "18:45 - 18:55",
    tipo: "Servicio",
    detalle: "Peeling",
    clientNumber: "#152",
    cliente: "Mayte Garcia",
    dni: "53462289P",
    empleado: "Miguel Miñana Morell",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "16/10/2025",
    price: 120,
    factura: "",
    precio: 120,
    iva: 0,
    irpf: 0,
    total: 120,
    pagado: 120,
  },
  {
    id: "mock-art-11",
    refMov: "#426",
    nuV: "#124",
    fecha: "14/10/2025",
    fechaRaw: new Date("2025-10-14T17:40:00"),
    hora: "17:40 - 17:50",
    tipo: "Servicio",
    detalle: "Mesoterapia facial",
    clientNumber: "#52",
    cliente: "ALFREDO GOMEZ ABUIN",
    dni: "19894639F",
    empleado: "Miguel Miñana Morell",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "15/10/2025",
    price: 250,
    factura: "",
    precio: 250,
    iva: 0,
    irpf: 0,
    total: 250,
    pagado: 250,
  },
  {
    id: "mock-art-12",
    refMov: "#424",
    nuV: "#111",
    fecha: "07/10/2025",
    fechaRaw: new Date("2025-10-07T17:15:00"),
    hora: "17:15 - 18:15",
    tipo: "Servicio",
    detalle: "LPG + Presoterapia",
    clientNumber: "#150",
    cliente: "Manuela Portal Vicente",
    dni: "07809122R",
    empleado: "Laura Mesa",
    consulta: "Medicina Estética del Mediterráneo",
    estado: "PAGADO",
    metodoPago: "Efectivo",
    fechaPago: "07/10/2025",
    price: 260,
    factura: "",
    precio: 260,
    iva: 0,
    irpf: 0,
    total: 260,
    pagado: 260,
  }
];

const MOCK_PAGOS = [
  { id: "mock-pay-1", fecha: "20/06/2026 02:23 AM", fechaRaw: new Date("2026-06-20T02:23:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#451", metodoPago: "Tarjeta", total: 260, reembolsado: 0 },
  { id: "mock-pay-2", fecha: "20/06/2026 02:15 AM", fechaRaw: new Date("2026-06-20T02:15:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#450", metodoPago: "Tarjeta", total: 260, reembolsado: 0 },
  { id: "mock-pay-3", fecha: "20/06/2026 02:05 AM", fechaRaw: new Date("2026-06-20T02:05:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#445", metodoPago: "Tarjeta", total: 100, reembolsado: 0 },
  { id: "mock-pay-4", fecha: "20/06/2026 02:05 AM", fechaRaw: new Date("2026-06-20T02:05:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#445", metodoPago: "Efectivo", total: 200, reembolsado: 0 },
  { id: "mock-pay-5", fecha: "19/06/2026 19:53 PM", fechaRaw: new Date("2026-06-19T19:53:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#448", metodoPago: "Tarjeta", total: 300, reembolsado: 0 },
  { id: "mock-pay-6", fecha: "19/06/2026 19:12 PM", fechaRaw: new Date("2026-06-19T19:12:00"), transaccion: "PAGO", usuario: "jberenguer@mare-nostrum.org", nuV: "#447", metodoPago: "Efectivo", total: 50, reembolsado: 0 },
  { id: "mock-pay-7", fecha: "19/06/2026 18:54 PM", fechaRaw: new Date("2026-06-19T18:54:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#446", metodoPago: "Tarjeta", total: 590, reembolsado: 0 },
  { id: "mock-pay-8", fecha: "19/06/2026 18:54 PM", fechaRaw: new Date("2026-06-19T18:54:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#446", metodoPago: "Efectivo", total: 200, reembolsado: 0 },
  { id: "mock-pay-9", fecha: "14/06/2026 19:53 PM", fechaRaw: new Date("2026-06-14T19:53:00"), transaccion: "PAGO", usuario: "vicenta.llorca@gmail.com", nuV: "#444", metodoPago: "Tarjeta", total: 1500, reembolsado: 0 },
  { id: "mock-pay-10", fecha: "10/06/2026 20:32 PM", fechaRaw: new Date("2026-06-10T20:32:00"), transaccion: "PAGO", usuario: "jberenguer@mare-nostrum.org", nuV: "#442", metodoPago: "Efectivo", total: 500, reembolsado: 0 },
  { id: "mock-pay-11", fecha: "10/06/2026 18:58 PM", fechaRaw: new Date("2026-06-10T18:58:00"), transaccion: "PAGO", usuario: "jberenguer@mare-nostrum.org", nuV: "#440", metodoPago: "Tarjeta", total: 420, reembolsado: 0 },
  { id: "mock-pay-12", fecha: "10/06/2026 18:41 PM", fechaRaw: new Date("2026-06-10T18:41:00"), transaccion: "PAGO", usuario: "jberenguer@mare-nostrum.org", nuV: "#439", metodoPago: "Tarjeta", total: 100, reembolsado: 0 },
  { id: "mock-pay-13", fecha: "10/06/2026 18:18 PM", fechaRaw: new Date("2026-06-10T18:18:00"), transaccion: "PAGO", usuario: "jberenguer@mare-nostrum.org", nuV: "#438", metodoPago: "Efectivo", total: 350, reembolsado: 0 },
  { id: "mock-pay-14", fecha: "10/06/2026 17:38 PM", fechaRaw: new Date("2026-06-10T17:38:00"), transaccion: "PAGO", usuario: "jberenguer@mare-nostrum.org", nuV: "#437", metodoPago: "Tarjeta", total: 25, reembolsado: 0 }
];

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

export default function SalesPage() {
  const router = useRouter();
  const { activeClinic, user: currentUser } = useApp();
  const cName = activeClinic?.name || "";

  const showArticulosTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Artículos - Todo") ||
    hasPermission(currentUser, "contabilidad", "Artículos - Solo artículos relacionados");

  const showFacturasTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Facturas - Todo") ||
    hasPermission(currentUser, "contabilidad", "Facturas - " + cName);

  const showPagosTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Pagos");

  const showResumenTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Resumen");

  const showIngresosGastosTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Ingresos y Gastos");

  const showExcelDownload = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Descargar Excel") ||
    hasPermission(currentUser, "contabilidad", "Facturas - Descargar Excel en facturas") ||
    hasPermission(currentUser, "contabilidad", "Artículos - Descargar Excel");

  // check if has ONLY "Solo cobrar"
  const onlyCobrar = currentUser?.role !== "ADMIN" && 
    hasPermission(currentUser, "contabilidad", "Solo cobrar") &&
    !showArticulosTab && !showFacturasTab && !showPagosTab && !showResumenTab && !showIngresosGastosTab;

  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<"articulos" | "facturas" | "pagos" | "resumen" | "ingresos_gastos" | "presupuestos">("articulos");
  const [activeSubTab, setActiveSubTab] = useState<"emitidas" | "recibidas">("emitidas");

  // Date Filters (Initialize with dynamic month-to-date)
  const [dateFilterStart, setDateFilterStart] = useState<Date | null>(() => getMonthToDateRange().start);
  const [dateFilterEnd, setDateFilterEnd] = useState<Date | null>(() => getMonthToDateRange().end);
  
  // Custom Date Picker Popover States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerPreset, setPickerPreset] = useState<string>("personalizado");
  const [pickerStart, setPickerStart] = useState<Date | null>(() => getMonthToDateRange().start);
  const [pickerEnd, setPickerEnd] = useState<Date | null>(() => getMonthToDateRange().end);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tempStartInput, setTempStartInput] = useState(() => formatDateToInputHelper(getMonthToDateRange().start));
  const [tempEndInput, setTempEndInput] = useState(() => formatDateToInputHelper(getMonthToDateRange().end));

  // Search & Toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [verBaseImponible, setVerBaseImponible] = useState(false);
  const [verBonosDevengo, setVerBonosDevengo] = useState(false);

  // Database list states
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // POS Slide Drawer State & cart items
  const [showPosDrawer, setShowPosDrawer] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Invoice Editing View States (Image 3 & 4)
  const [activeInvoiceEdit, setActiveInvoiceEdit] = useState<any>(null);
  const [showNoFiscalProfileModal, setShowNoFiscalProfileModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState<boolean>(false);
  const [editClientForm, setEditClientForm] = useState<any>({
    id: "",
    firstName: "",
    lastName: "",
    dniNif: "",
    birthDate: "",
    address: "",
    postalCode: "",
    municipality: "",
    country: "Spain (España)",
    phone: "",
    email: "",
  });
  const [showChangeStateDropdown, setShowChangeStateDropdown] = useState<boolean>(false);
  const [showOpcionesDropdown, setShowOpcionesDropdown] = useState<boolean>(false);
  const [itemType, setItemType] = useState<"service" | "product">("service");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH" | "TRANSFER">("CARD");

  // Add Manual Movement Modal state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movConcept, setMovConcept] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movMethod, setMovMethod] = useState("CASH");
  const [movType, setMovType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [movDate, setMovDate] = useState("");
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [openDropdownMovId, setOpenDropdownMovId] = useState<string | null>(null);
  const [confirmDeleteMovId, setConfirmDeleteMovId] = useState<string | null>(null);

  // Detailed Modal invoice
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Checkbox lists
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  // Column Visibility for Artículos Table
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    refMov: true,
    nuV: true,
    fecha: true,
    hora: true,
    tipo: true,
    detalle: true,
    clientNumber: true,
    cliente: true,
    dni: true,
    empleado: true,
    consulta: true,
    estado: true,
    metodoPago: true,
    fechaPago: true,
    factura: true,
    precio: true,
    iva: true,
    irpf: true,
    total: true,
    pagado: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Checkout Payment details state
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<ArticleItem | null>(null);
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, {
    estado: "PAGADO" | "PENDIENTE";
    metodoPago: string;
    fechaPago: string;
  }>>({});

  // Edit Service Modal
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServicePrice, setEditServicePrice] = useState(0);
  const [editServiceIva, setEditServiceIva] = useState(0);
  const [editServiceTotal, setEditServiceTotal] = useState(0);

  // Discount Modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountModalValue, setDiscountModalValue] = useState("");
  const [discountModalType, setDiscountModalType] = useState<"percentage" | "fixed">("percentage");

  // Checkout discount applied
  const [checkoutDiscount, setCheckoutDiscount] = useState<{ value: number; type: "percentage" | "fixed"; amount: number } | null>(null);

  // Partial payments list
  const [partialPayments, setPartialPayments] = useState<{ id: string; method: string; amount: number; date: string; clientVoucherId?: string; voucherName?: string; clientBudgetId?: string; budgetName?: string; isSaved?: boolean }[]>([]);

  // Cobrar input amount
  const [cobrarAmount, setCobrarAmount] = useState("");

  // Voucher payment states
  const [showVoucherSelectionModal, setShowVoucherSelectionModal] = useState(false);
  const [selectedCheckoutVoucherId, setSelectedCheckoutVoucherId] = useState("");
  const [selectedClientVouchers, setSelectedClientVouchers] = useState<any[]>([]);

  // Budget payment states
  const [clientBudgetsWithBalance, setClientBudgetsWithBalance] = useState<any[]>([]);
  const [showBudgetSelectionModal, setShowBudgetSelectionModal] = useState(false);
  const [selectedCheckoutBudgetId, setSelectedCheckoutBudgetId] = useState("");

  // Invoice requested during checkout
  const [invoiceRequested, setInvoiceRequested] = useState<"NONE" | "NORMAL" | "SIMPLIFIED">("NONE");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // Active fiscal profile for invoice rendering
  const [activeFiscalProfile, setActiveFiscalProfile] = useState<any | null>(null);

  // Redirect to agenda if has no sales permissions at all, or set initial allowed tab
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "ADMIN") return;

    const hasAnySalesPermission = 
      hasPermission(currentUser, "contabilidad", "Artículos - Todo") ||
      hasPermission(currentUser, "contabilidad", "Artículos - Solo artículos relacionados") ||
      hasPermission(currentUser, "contabilidad", "Facturas - Todo") ||
      hasPermission(currentUser, "contabilidad", "Facturas - " + cName) ||
      hasPermission(currentUser, "contabilidad", "Pagos") ||
      hasPermission(currentUser, "contabilidad", "Resumen") ||
      hasPermission(currentUser, "contabilidad", "Ingresos y Gastos") ||
      hasPermission(currentUser, "contabilidad", "Solo cobrar");

    if (!hasAnySalesPermission) {
      router.push("/dashboard/agenda");
      return;
    }

    if (onlyCobrar) {
      setShowPosDrawer(true);
      return;
    }

    const allowed: string[] = [];
    if (showArticulosTab) allowed.push("articulos");
    if (showFacturasTab) allowed.push("facturas");
    if (showPagosTab) allowed.push("pagos");
    if (showResumenTab) allowed.push("resumen");
    if (showIngresosGastosTab) allowed.push("ingresos_gastos");

    if (allowed.length > 0 && !allowed.includes(activeTab)) {
      setActiveTab(allowed[0] as any);
    }
  }, [currentUser, activeClinic, router, activeTab, onlyCobrar, showArticulosTab, showFacturasTab, showPagosTab, showResumenTab, showIngresosGastosTab, cName]);

  // Fetch active vouchers for the current checkout client
  useEffect(() => {
    if (selectedItemForPayment?.clientId) {
      fetch(`/api/clients/${selectedItemForPayment.clientId}/vouchers`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSelectedClientVouchers(data.filter(v => v.remainingSessions > 0));
          } else {
            setSelectedClientVouchers([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching client vouchers:", err);
          setSelectedClientVouchers([]);
        });
    } else {
      setSelectedClientVouchers([]);
    }
  }, [selectedItemForPayment?.clientId]);

  // Fetch client budgets with remaining balance
  useEffect(() => {
    if (selectedItemForPayment?.clientId && activeClinic) {
      fetch(`/api/budgets?clinicId=${activeClinic.id}&clientId=${selectedItemForPayment.clientId}&status=ACCEPTED`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setClientBudgetsWithBalance(data.filter(b => b.remainingAmount > 0));
          } else {
            setClientBudgetsWithBalance([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching client budgets:", err);
          setClientBudgetsWithBalance([]);
        });
    } else {
      setClientBudgetsWithBalance([]);
    }
  }, [selectedItemForPayment?.clientId, activeClinic]);


  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("fecha");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Add Article Modal
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);

  // Pasado/Futuro collapsible toggles
  const [showPastAppts, setShowPastAppts] = useState(false);
  const [showFutureAppts, setShowFutureAppts] = useState(false);

  // Active checkout tax rate
  const [checkoutIva, setCheckoutIva] = useState(0);

  // Sales budgets states
  const [salesBudgets, setSalesBudgets] = useState<any[]>([]);
  const [loadingSalesBudgets, setLoadingSalesBudgets] = useState(false);


  // Multiple checkout articles list
  const [checkoutItems, setCheckoutItems] = useState<ArticleItem[]>([]);
  const [isEditingTaxInline, setIsEditingTaxInline] = useState(false);
  const [tempTaxRateInput, setTempTaxRateInput] = useState("");
  const [showAddServicePopup, setShowAddServicePopup] = useState(false);
  const [editingCheckoutItemId, setEditingCheckoutItemId] = useState<string | null>(null);

  // Payment methods custom management states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("payment_methods_config");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing payment methods config:", e);
        }
      }
    }
    return [
      { key: "Efectivo", label: "EFECTIVO", enabled: true, className: styles.methodBtnEfectivo },
      { key: "Tarjeta", label: "TARJETA", enabled: true, className: styles.methodBtnTarjeta },
      { key: "Transferencia", label: "TRANSFERENCIA", enabled: true, className: styles.methodBtnTransferencia },
      { key: "Bizum", label: "BIZUM", enabled: true, className: styles.methodBtnBizum },
      { key: "Domiciliado", label: "DOMICILIADO", enabled: true, className: styles.methodBtnDomiciliado },
      { key: "Paypal", label: "PAYPAL", enabled: true, className: styles.methodBtnPaypal },
      { key: "Otro", label: "OTRO", enabled: true, className: styles.methodBtnOtro },
    ];
  });

  const [showPaymentMethodsDrawer, setShowPaymentMethodsDrawer] = useState(false);
  const [searchMethodQuery, setSearchMethodQuery] = useState("");
  const [isCreatingNewMethod, setIsCreatingNewMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [tempPaymentMethods, setTempPaymentMethods] = useState<PaymentMethodItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("payment_methods_config", JSON.stringify(paymentMethods));
    }
  }, [paymentMethods]);

  // Reset states when checkout item changes
  useEffect(() => {
    setCheckoutDiscount(null);
    setCobrarAmount("");
    setIsEditingTaxInline(false);

    if (selectedItemForPayment) {
      setCheckoutItems([selectedItemForPayment]);
      let initialIva = 0;
      if (selectedItemForPayment.id.startsWith("db-app-")) {
        const appId = selectedItemForPayment.id.replace("db-app-", "");
        const app = appointments.find((a) => a.id === appId);
        if (app?.service?.tax !== undefined && app?.service?.tax !== null) {
          initialIva = app.service.tax;
        }
      } else {
        const srv = services.find((s) => s.name === selectedItemForPayment.detalle);
        if (srv?.tax !== undefined && srv?.tax !== null) {
          initialIva = srv.tax;
        }
      }

      const clientObj = clients.find((c) => c.id === selectedItemForPayment.clientId);
      const isSelfEmployed = clientObj?.isSelfEmployed || false;

      if (isSelfEmployed) {
        setCheckoutIva(0);
      } else {
        setCheckoutIva(initialIva);
      }
    } else {
      setCheckoutItems([]);
      setCheckoutIva(0);
    }
  }, [selectedItemForPayment?.id, appointments, services, clients]);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
      
      const target = event.target as HTMLElement;
      if (
        !target.closest(`.${styles.rowActionsBtn}`) &&
        !target.closest(`.${styles.rowDropdownMenu}`)
      ) {
        setOpenDropdownMovId(null);
        setConfirmDeleteMovId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDateToInput = (d: Date | null) => {
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const parseInputToDate = (str: string) => {
    const parts = str.split("-");
    if (parts.length === 3) {
      const dd = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10) - 1;
      const yyyy = parseInt(parts[2], 10);
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        const d = new Date(yyyy, mm, dd);
        if (d.getDate() === dd && d.getMonth() === mm && d.getFullYear() === yyyy) {
          return d;
        }
      }
    }
    return null;
  };

  // Sync default date filter on tab switch to automatically align with references
  useEffect(() => {
    const { start, end } = getMonthToDateRange();
    const preset = "personalizado";
    
    setDateFilterStart(start);
    setDateFilterEnd(end);
    setPickerStart(start);
    setPickerEnd(end);
    setPickerPreset(preset);
    setTempStartInput(formatDateToInput(start));
    setTempEndInput(formatDateToInput(end));
    setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    
    setSelectedRowIds([]);
    setCurrentPage(1);
  }, [activeTab, activeSubTab]);

  const fetchSalesData = async () => {
    if (!activeClinic) return;
    setLoading(true);

    try {
      const [clientsRes, servicesRes, salesRes, appRes, movementsRes, budgetsRes, fiscalRes] = await Promise.all([
        fetch(`/api/clients?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/services?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/sales?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/appointments?clinicId=${activeClinic.id}&start=2025-09-01T00:00:00.000Z&end=2026-07-01T00:00:00.000Z`, { cache: "no-store" }),
        fetch(`/api/movements?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/budgets?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/fiscal-profiles?clinicId=${activeClinic.id}`, { cache: "no-store" }),
      ]);

      const clientsData = await clientsRes.json();
      if (Array.isArray(clientsData)) setClients(clientsData);

      const servicesData = await servicesRes.json();
      if (Array.isArray(servicesData)) {
        setServices(servicesData);
        if (servicesData.length > 0) {
          setSelectedServiceId(servicesData[0].id);
          setItemPrice(servicesData[0].price);
        }
      }

      const salesData = await salesRes.json();
      setSalesHistory(salesData);

      const appData = await appRes.json();
      setAppointments(appData);

      const movementsData = await movementsRes.json();
      setMovements(movementsData);

      const budgetsData = await budgetsRes.json();
      if (Array.isArray(budgetsData)) setSalesBudgets(budgetsData);

      const fiscalData = await fiscalRes.json();
      if (Array.isArray(fiscalData) && fiscalData.length > 0) {
        setActiveFiscalProfile(fiscalData[0]);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchSalesData();
  }, [activeClinic]);

  // Load existing partial payments from database sales history for the selected checkout item
  useEffect(() => {
    if (!selectedItemForPayment) {
      setPartialPayments([]);
      return;
    }

    const cleanItemId = selectedItemForPayment.id;
    
    const dbPayments = salesHistory
      .filter((sale) => {
        try {
          const itemsArr = JSON.parse(sale.itemsJson || "[]");
          return itemsArr.some((i: any) => i.id === cleanItemId || cleanItemId.includes(i.id));
        } catch (e) {
          return false;
        }
      })
      .map((sale) => {
        const saleDate = new Date(sale.createdAt);
        return {
          id: sale.id,
          method: getPaymentMethodText(sale.paymentMethod),
          amount: sale.total,
          date: saleDate.toLocaleDateString("es-ES"),
          isSaved: true,
        };
      });

    setPartialPayments(dbPayments);
  }, [selectedItemForPayment, salesHistory]);

  // Handle URL checkout params (from 'Caja' redirect)
  useEffect(() => {
    if (clients.length === 0 || services.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const urlClientId = params.get("clientId");
    const urlServiceId = params.get("serviceId");
    const urlAppointmentId = params.get("appointmentId");
    const urlClientVoucherId = params.get("clientVoucherId");

    if (urlClientId && urlClientVoucherId) {
      const matchClient = clients.find((c) => c.id === urlClientId);
      if (matchClient) {
        setSelectedClientId(urlClientId);
        setShowPosDrawer(true);
        
        fetch(`/api/clients/${urlClientId}/vouchers`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              const cv = data.find((v) => v.id === urlClientVoucherId);
              if (cv) {
                const newItem: CartItem = {
                  id: `voucher-${cv.id}`,
                  name: `Bono: ${cv.name}`,
                  type: "service",
                  price: cv.price,
                  quantity: 1,
                };
                setCart([newItem]);
              }
            }
          })
          .catch((err) => console.error("Error fetching voucher details for checkout:", err));

        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      }
    }

    // If appointmentId present, open checkout view directly
    if (urlAppointmentId && urlClientId && urlServiceId) {
      const matchClient = clients.find((c) => c.id === urlClientId);
      const matchService = services.find((s) => s.id === urlServiceId);
      if (matchClient && matchService) {
        const now = new Date();
        const checkoutItem: ArticleItem = {
          id: `db-app-${urlAppointmentId}`,
          refMov: `#${urlAppointmentId.substring(0, 4).toUpperCase()}`,
          nuV: "-",
          fecha: now.toLocaleDateString("es-ES"),
          fechaRaw: now,
          hora: "-",
          tipo: "Servicio",
          detalle: matchService.name,
          clientNumber: `#${matchClient.clientNumber || ""}`,
          cliente: `${matchClient.firstName} ${matchClient.lastName}`,
          clientId: matchClient.id,
          dni: matchClient.dniNif || "-",
          empleado: "Especialista",
          consulta: activeClinic?.name || "Clifav Central",
          estado: "PENDIENTE",
          metodoPago: "-",
          fechaPago: "-",
          price: matchService.price,
        };
        setSelectedItemForPayment(checkoutItem);
        // Clean URL params without reload
        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      }
    }

    if (urlClientId) {
      const matchClient = clients.find((c) => c.id === urlClientId);
      if (matchClient) {
        setSelectedClientId(urlClientId);
        setShowPosDrawer(true);
      }
    }

    if (urlServiceId) {
      const matchService = services.find((s) => s.id === urlServiceId);
      if (matchService) {
        setSelectedServiceId(urlServiceId);
        setItemPrice(matchService.price);

        const exists = cart.some((item) => item.id === urlServiceId);
        if (!exists) {
          const newItem: CartItem = {
            id: matchService.id,
            name: matchService.name,
            type: "service",
            price: matchService.price,
            quantity: 1,
          };
          setCart([newItem]);
        }
      }
    }
  }, [clients, services]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setItemPrice(service.price);
    }
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();

    let itemId = "";
    let itemName = "";

    if (itemType === "service") {
      const service = services.find((s) => s.id === selectedServiceId);
      if (!service) return;
      itemId = service.id;
      itemName = service.name;
    } else {
      if (!customProductName.trim()) return;
      itemId = `prod-${Date.now()}`;
      itemName = customProductName.trim();
    }

    const newItem: CartItem = {
      id: itemId,
      name: itemName,
      type: itemType,
      price: itemPrice,
      quantity: itemQuantity,
    };

    const existingIndex = cart.findIndex((item) => item.id === itemId);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += itemQuantity;
      setCart(updatedCart);
    } else {
      setCart([...cart, newItem]);
    }

    setCustomProductName("");
    setItemQuantity(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // POS calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalPOS = subtotal - discountAmount;

  const renderPosFormContent = () => (
    <div className={styles.posForm}>
      {/* Patient Selector */}
      <div className="form-group">
        <label className="form-label">Paciente *</label>
        <select
          className="input select"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          required
        >
          <option value="">Selecciona paciente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Add Item Row */}
      <form onSubmit={handleAddToCart} className={styles.itemAdderBlock}>
        <div className={styles.itemTypeToggle}>
          <button
            type="button"
            className={`${styles.typeBtn} ${itemType === "service" ? styles.typeBtnActive : ""}`}
            onClick={() => setItemType("service")}
          >
            Servicios
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${itemType === "product" ? styles.typeBtnActive : ""}`}
            onClick={() => setItemType("product")}
          >
            Productos
          </button>
        </div>

        <div className={styles.posForm} style={{ gap: "10px" }}>
          {itemType === "service" ? (
            <div className="form-group">
              <label className="form-label">Servicio Clínico</label>
              <select
                className="input select"
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
              >
                <option value="">Selecciona servicio...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.price} €)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Nombre del Producto</label>
              <input
                type="text"
                className="input"
                placeholder="Ej: Crema hidratante, Venda..."
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Precio (€)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={itemPrice}
                onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                disabled={itemType === "service"}
                required
              />
            </div>

            <div className="form-group" style={{ width: "80px" }}>
              <label className="form-label">Cant.</label>
              <input
                type="number"
                min="1"
                className="input"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
            <Icons.Plus size={16} />
            <span>Añadir al Carrito</span>
          </button>
        </div>
      </form>

      {/* Shopping Cart List */}
      <div className={styles.cartContainer}>
        <h3>Detalles del Carrito</h3>
        {cart.length === 0 ? (
          <div className={styles.emptyCart}>No hay elementos en el carrito.</div>
        ) : (
          <div className={styles.cartList}>
            {cart.map((item, index) => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.cartItemMeta}>
                  <span className={styles.cartItemName}>{item.name}</span>
                  <span className={styles.cartItemType}>
                    {item.type === "service" ? "Servicio" : "Producto"}
                  </span>
                </div>
                <span className={styles.cartItemMath}>
                  {item.quantity} × {item.price.toFixed(2)} €
                </span>
                <span className={styles.cartItemTotal}>{(item.price * item.quantity).toFixed(2)} €</span>
                <button type="button" className={styles.cartItemRemove} onClick={() => handleRemoveFromCart(index)}>
                  <Icons.Plus size={16} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checkout Totals & Payment */}
      <div className={styles.checkoutFooter}>
        <div className={styles.totalsColumn} style={{ width: "100%" }}>
          <div className={styles.totalsRow}>
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          <div className={styles.totalsRow}>
            <span>Descuento (%):</span>
            <input
              type="number"
              min="0"
              max="100"
              className="input"
              style={{ width: "80px", padding: "4px 8px", fontSize: "13px" }}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            />
          </div>
          <div className={`${styles.totalsRow} ${styles.grandTotal}`}>
            <span>Total Neto:</span>
            <span>{totalPOS.toFixed(2)} €</span>
          </div>
        </div>

        <div className={styles.paymentMethodSelect}>
          <label className="form-label">Forma de Pago</label>
          <div className={styles.paymentRadios}>
            {(["CARD", "CASH", "TRANSFER"] as const).map((method) => (
              <button
                key={method}
                type="button"
                className={`${styles.payBtn} ${paymentMethod === method ? styles.payBtnActive : ""}`}
                onClick={() => setPaymentMethod(method)}
              >
                {method === "CARD" ? "Tarjeta" : method === "CASH" ? "Efectivo" : "Transferencia"}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleRegisterSale} style={{ padding: "12px" }}>
          <Icons.Check size={18} />
          <span>Confirmar y Facturar</span>
        </button>
      </div>
    </div>
  );

  const handleRegisterSale = async () => {
    if (!selectedClientId) {
      alert("Por favor, selecciona un paciente.");
      return;
    }
    if (cart.length === 0) {
      alert("El carrito está vacío.");
      return;
    }
    if (!activeClinic) return;

    const payload = {
      clientId: selectedClientId,
      clinicId: activeClinic.id,
      total: totalPOS,
      discount: discountAmount,
      paymentMethod,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setCart([]);
      setSelectedClientId("");
      setDiscountPercent(0);
      setShowPosDrawer(false);
      fetchSalesData();
      alert("Venta registrada con éxito.");
    } else {
      alert("Error al procesar la venta.");
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic) return;

    const payload: any = {
      concept: movConcept,
      amount: parseFloat(movAmount),
      method: movMethod,
      type: movType,
      date: new Date(movDate).toISOString(),
      clinicId: activeClinic.id,
    };

    let url = "/api/movements";
    let method = "POST";

    if (editingMovementId) {
      payload.id = editingMovementId;
      method = "PUT";
    }

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMovConcept("");
      setMovAmount("");
      setMovDate("");
      setEditingMovementId(null);
      setShowMovementModal(false);
      fetchSalesData();
    } else {
      alert(editingMovementId ? "Error al actualizar el movimiento de caja." : "Error al guardar el movimiento de caja.");
    }
  };

  const handleCloseMovementModal = () => {
    setMovConcept("");
    setMovAmount("");
    setMovDate("");
    setEditingMovementId(null);
    setShowMovementModal(false);
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "CARD":
      case "Tarjeta":
        return "Tarjeta";
      case "CASH":
      case "Efectivo":
        return "Efectivo";
      case "TRANSFER":
      case "Transferencia":
        return "Transferencia";
      default:
        return method;
    }
  };

  const printReceipt = (sale: any, clinic: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para poder imprimir el comprobante.");
      return;
    }

    const dateStr = new Date(sale.createdAt).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    const methodLabel = sale.paymentMethod === "CASH" ? "Efectivo" :
                        sale.paymentMethod === "CARD" ? "Tarjeta" :
                        sale.paymentMethod === "TRANSFER" ? "Transferencia" : sale.paymentMethod;

    // Extract numerical part of invoiceNumber for top reference
    const refNum = sale.invoiceNumber.split("-").pop() || sale.invoiceNumber;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Pago - ${sale.invoiceNumber}</title>
        <meta charset="utf-8" />
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: sans-serif; font-size: 14px; color: #000; }
            .no-print { display: none; }
          }
          body { font-family: sans-serif; font-size: 14px; max-width: 450px; margin: 40px auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 8px; color: #333; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .ref-top { text-align: right; font-size: 13px; color: #666; margin-bottom: 20px; }
          .header { text-align: left; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 12px; }
          .header h2 { margin: 0 0 6px 0; font-size: 20px; font-weight: bold; color: #111; }
          .header p { margin: 3px 0; font-size: 13px; color: #444; }
          .title { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 1px; margin: 30px 0 20px 0; text-transform: uppercase; color: #111; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; border-top: 1px solid #eaeaea; border-bottom: 1px solid #eaeaea; }
          .details-table td { padding: 12px 8px; font-size: 14px; color: #333; }
          .details-table tr:not(:last-child) { border-bottom: 1px solid #f5f5f5; }
          .details-table td.label { font-weight: bold; width: 40%; color: #555; }
          .details-table td.value { text-align: left; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eaeaea; padding-top: 15px; }
          .btn-container { text-align: center; margin-bottom: 20px; }
          .print-btn { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
          .print-btn:hover { background: #0369a1; }
        </style>
      </head>
      <body>
        <div class="btn-container no-print">
          <button class="print-btn" onclick="window.print()">Imprimir Comprobante</button>
        </div>
        <div class="ref-top">
          Ref: ${refNum}
        </div>
        <div class="header">
          <h2>${clinic?.name || 'Medicina Estética del Mediterráneo'}</h2>
          <p>${clinic?.cifNif || 'MEDESMED INTERNATIONAL SL · BB56359623'}</p>
          <p>${clinic?.address || 'AV. PAIS VALENCIA Nº5, 03570 VILLAJOYOSA'}</p>
        </div>
        
        <div class="title">Comprobante de Pago</div>
        
        <table class="details-table">
          <tr>
            <td class="label">Fecha</td>
            <td class="value">${dateStr}</td>
          </tr>
          <tr>
            <td class="label">Monto</td>
            <td class="value" style="font-weight: bold;">${sale.total.toFixed(2)} €</td>
          </tr>
          <tr>
            <td class="label">Método de pago</td>
            <td class="value">${methodLabel}</td>
          </tr>
        </table>
        
        <div class="footer">
          <p>Documento informativo. No tiene validez fiscal.</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintReceiptForCurrent = () => {
    if (!selectedItemForPayment) return;

    const items = checkoutItems.map((item) => ({
      name: item.detalle,
      price: item.price,
      quantity: 1,
    }));

    const discountAmt = checkoutDiscountAmt;
    const totalAfterDiscount = checkoutTotalAfterDiscount;

    let paymentMethodToSave = "CASH";
    if (partialPayments.length > 0) {
      const unique = [...new Set(partialPayments.map((p) => p.method))];
      paymentMethodToSave = unique.join(", ");
    } else {
      paymentMethodToSave = selectedItemForPayment.metodoPago || "Efectivo";
    }

    const mockSale = {
      invoiceNumber: selectedItemForPayment.nuV && selectedItemForPayment.nuV !== "-" 
        ? selectedItemForPayment.nuV 
        : `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: selectedItemForPayment.fechaRaw || new Date(),
      total: totalAfterDiscount,
      discount: discountAmt,
      paymentMethod: paymentMethodToSave,
      itemsJson: JSON.stringify(items),
      client: {
        firstName: selectedItemForPayment.cliente?.split(" ")[0] || "Cliente",
        lastName: selectedItemForPayment.cliente?.split(" ").slice(1).join(" ") || "General",
        dniNif: selectedItemForPayment.dni || "-",
        phone: "",
      }
    };

    printReceipt(mockSale, activeClinic);
  };

  const persistUnsavedPayments = async (invType: "NONE" | "NORMAL" | "SIMPLIFIED") => {
    if (!selectedItemForPayment) return null;
    const unsavedPayments = partialPayments.filter((p) => !p.isSaved);
    if (unsavedPayments.length === 0) return null;

    const createdSales = [];

    for (let idx = 0; idx < unsavedPayments.length; idx++) {
      const p = unsavedPayments[idx];

      let paymentMethodToSave = "CASH";
      if (p.clientVoucherId) {
        paymentMethodToSave = p.method;
      } else {
        const m = p.method.toLowerCase();
        if (m === "efectivo") paymentMethodToSave = "CASH";
        else if (m === "tarjeta") paymentMethodToSave = "CARD";
        else if (m === "transferencia") paymentMethodToSave = "TRANSFER";
        else paymentMethodToSave = "OTHER";
      }

      // Assign the discount to the first payment entry
      const discountAmt = idx === 0 
        ? (checkoutDiscount ? (checkoutDiscount.type === "percentage" ? (checkoutSubtotal * checkoutDiscount.value / 100) : checkoutDiscount.value) : 0)
        : 0;

      const salePayload = {
        clientId: selectedItemForPayment.clientId || "",
        clinicId: activeClinic?.id || "",
        total: p.amount,
        discount: discountAmt,
        paymentMethod: paymentMethodToSave,
        items: checkoutItems.map((item) => ({
          id: item.id,
          name: item.detalle,
          type: item.tipo === "Producto" ? "product" : "service",
          quantity: 1,
          price: item.price,
        })),
        invoiceType: invType,
      };

      if (salePayload.clientId && salePayload.clinicId) {
        try {
          const saleRes = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(salePayload),
          });
          if (!saleRes.ok) {
            console.error("Failed to persist sale:", await saleRes.text());
          } else {
            const createdSale = await saleRes.json();
            createdSales.push(createdSale);

            // Consume vouchers and budgets
            if (p.clientVoucherId) {
              try {
                await fetch(`/api/clients/${salePayload.clientId}/vouchers`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clientVoucherId: p.clientVoucherId, action: "consume" }),
                });
              } catch (consumeErr) {
                console.error("Failed to consume client voucher session:", consumeErr);
              }
            }
            if (p.method === "PRE-PRESUPUESTO" && (p as any).clientBudgetId) {
              try {
                await fetch("/api/budgets/consume", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ budgetId: (p as any).clientBudgetId, amount: p.amount }),
                });
              } catch (consumeErr) {
                console.error("Failed to consume budget balance:", consumeErr);
              }
            }
          }
        } catch (e) {
          console.error("Error persisting sale:", e);
        }
      }
    }
    return createdSales;
  };

  const getNextInvoiceNumber = (series: "NORMAL" | "SIMPLIFIED") => {
    const year = new Date().getFullYear();
    const prefix = series === "NORMAL" ? `INV-${year}-` : `SIMP-${year}-`;
    const matchingSales = salesHistory.filter(s => s.invoiceNumber && s.invoiceNumber.startsWith(prefix));
    if (matchingSales.length === 0) return 1;
    const nums = matchingSales.map(s => {
      const parts = s.invoiceNumber.split("-");
      const num = parseInt(parts[parts.length - 1]);
      return isNaN(num) ? 0 : num;
    });
    return Math.max(...nums) + 1;
  };

  const regenerateConceptText = (
    itemDetail: string,
    opts: { showFecha: boolean; showCliente: boolean; showNif: boolean; showDescripcion: boolean; clientName?: string; clientDni?: string }
  ) => {
    const parts = [];
    const appDate = selectedItemForPayment?.fecha || new Date().toLocaleDateString("es-ES");
    
    let clientName = opts.clientName;
    let clientDni = opts.clientDni;

    if (!clientName) {
      const clientObj = clients.find(c => c.id === selectedItemForPayment?.clientId);
      clientName = clientObj ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim() : selectedItemForPayment?.cliente || "Cliente General";
    }
    if (!clientDni) {
      const clientObj = clients.find(c => c.id === selectedItemForPayment?.clientId);
      clientDni = clientObj ? clientObj.dniNif || "-" : selectedItemForPayment?.dni || "-";
    }

    if (opts.showFecha) parts.push(appDate);
    if (opts.showCliente) parts.push(clientName);
    if (opts.showNif) parts.push(clientDni);
    if (opts.showDescripcion) parts.push(itemDetail);

    return parts.join(" | ");
  };

  const handleOpenInvoiceEditor = (seriesType: "NORMAL" | "SIMPLIFIED") => {
    if (!selectedItemForPayment) return;

    // Guard: must have fiscal profile configured
    if (!activeFiscalProfile) {
      setShowNoFiscalProfileModal(true);
      return;
    }
    
    const clientId = selectedItemForPayment.clientId || "";
    const clientObj = clients.find(c => c.id === clientId);
    const clientName = clientObj ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim() : selectedItemForPayment.cliente || "Cliente General";
    const clientDni = clientObj ? clientObj.dniNif || "-" : selectedItemForPayment.dni || "-";
    const clientAddress = clientObj ? `${clientObj.address || ""}, ${clientObj.postalCode || ""}, ${clientObj.municipality || ""}, ${clientObj.country || ""}`.trim() : "-";
    
    const appDate = selectedItemForPayment.fecha || new Date().toLocaleDateString("es-ES");
    
    const concepts = checkoutItems.map(item => ({
      id: item.id,
      text: `${appDate} | ${clientName} | ${clientDni} | ${item.detalle}`,
      quantity: 1,
      price: item.price,
      subtotal: item.price,
    }));

    const nextNum = getNextInvoiceNumber(seriesType);

    setActiveInvoiceEdit({
      clientId,
      clientName,
      clientDni,
      clientAddress,
      clientEmail: clientObj?.email || "",
      clientPhone: clientObj?.phone || "",
      date: new Date().toISOString().split("T")[0],
      series: seriesType,
      number: nextNum,
      concepts,
      observations: "Puedes añadir anotaciones a la factura",
      groupServices: false,
      groupAll: false,
      showFecha: true,
      showCliente: true,
      showNif: true,
      showDescripcion: true,
      estado: selectedItemForPayment.estado === "PAGADO" ? "PAGADO" : "PENDIENTE",
    });
  };

  const printInvoice = (inv: any, clinic: any, fiscalProfile?: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para poder imprimir/descargar la factura.");
      return;
    }

    const dateStr = new Date(inv.date).toLocaleDateString("es-ES");

    const conceptsHtml = inv.concepts.map((c: any) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eaeaea; font-size: 13px;">${c.text}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eaeaea; text-align: center; font-size: 13px;">${c.quantity}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px;">${c.price.toFixed(2)}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px;">0,00</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px; font-weight: bold;">${(c.price * c.quantity).toFixed(2)}</td>
      </tr>
    `).join("");

    const totalAmount = inv.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const seriesPrefix = inv.series === "NORMAL" ? "INV" : "SIMP";
    const invoiceLabel = `${seriesPrefix}-${new Date(inv.date).getFullYear()}-${String(inv.number).padStart(4, "0")}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura ${invoiceLabel}</title>
        <meta charset="utf-8" />
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: sans-serif; font-size: 13px; color: #000; }
            .no-print { display: none; }
          }
          body { font-family: sans-serif; font-size: 13px; max-width: 800px; margin: 40px auto; padding: 40px; border: 1px solid #eaeaea; border-radius: 8px; color: #333; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #0284c7; padding-bottom: 20px; }
          .logo-area { display: flex; align-items: center; gap: 15px; }
          .logo-circle { width: 60px; height: 60px; background: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
          .company-info h2 { margin: 0 0 5px 0; font-size: 20px; font-weight: bold; color: #111; }
          .company-info p { margin: 2px 0; font-size: 13px; color: #444; }
          .invoice-meta { text-align: right; font-size: 13px; line-height: 1.5; }
          .invoice-meta h3 { margin: 0 0 5px 0; font-size: 16px; color: #666; font-weight: normal; }
          .invoice-meta .invoice-id { font-size: 20px; font-weight: bold; color: #111; }
          .billing-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .client-card { width: 45%; }
          .client-card h4 { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
          .client-card p { margin: 3px 0; font-size: 13px; color: #222; }
          .concepts-title { font-size: 15px; font-weight: bold; color: #0284c7; border-bottom: 1px solid #0284c7; padding-bottom: 6px; margin-bottom: 15px; }
          .concepts-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .concepts-table th { text-align: left; padding: 10px 0; border-bottom: 1px solid #333; font-size: 12px; font-weight: bold; color: #555; text-transform: uppercase; }
          .totals-area { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; border-top: 1px solid #eaeaea; padding-top: 20px; margin-top: 20px; }
          .totals-row { display: flex; justify-content: space-between; width: 250px; font-size: 13px; color: #444; }
          .totals-row.grand-total { font-size: 16px; font-weight: bold; color: #111; border-top: 1px solid #333; padding-top: 8px; margin-top: 5px; }
          .observations-box { margin-top: 50px; border-top: 1px solid #eaeaea; padding-top: 20px; font-size: 12px; color: #666; }
          .observations-box h5 { margin: 0 0 5px 0; font-size: 12px; color: #333; }
          .page-num { text-align: right; margin-top: 40px; font-size: 11px; color: #aaa; }
          .btn-container { text-align: center; margin-bottom: 20px; }
          .print-btn { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="btn-container no-print">
          <button class="print-btn" onclick="window.print()">Imprimir Factura</button>
        </div>
        <div class="invoice-header">
          <div class="logo-area">
            ${fiscalProfile?.logo ? `<img src="${fiscalProfile.logo}" alt="Logo" style="max-height:60px;max-width:120px;object-fit:contain;">` : `<div class="logo-circle">${(fiscalProfile?.comercialName || clinic?.name || 'C').charAt(0).toUpperCase()}</div>`}
            <div class="company-info">
              <h2>${fiscalProfile?.comercialName || clinic?.name || 'CLIFAV'}</h2>
              <p>${fiscalProfile?.nif ? 'NIF: ' + fiscalProfile.nif : ''}</p>
              <p>${fiscalProfile?.address || clinic?.address || ''}</p>
              <p>${fiscalProfile?.postalCode || ''} ${fiscalProfile?.municipality || ''}</p>
            </div>
          </div>
          <div class="invoice-meta">
            <h3>Fecha factura: ${dateStr}</h3>
            <div class="invoice-id">FACTURA: ${invoiceLabel}</div>
          </div>
        </div>

        <div class="billing-info">
          <div class="client-card">
            <h4>Dirigido a</h4>
            <p><strong>${inv.clientName}</strong></p>
            <p>${inv.clientDni}</p>
            <p>${inv.clientAddress}</p>
          </div>
        </div>

        <div class="concepts-title">Detalles</div>
        <table class="concepts-table">
          <thead>
            <tr>
              <th style="width: 50%;">Concepto</th>
              <th style="width: 10%; text-align: center;">Cant.</th>
              <th style="width: 15%; text-align: right;">Unidad</th>
              <th style="width: 10%; text-align: right;">IVA</th>
              <th style="width: 15%; text-align: right;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${conceptsHtml}
          </tbody>
        </table>

        <div class="totals-area">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${totalAmount.toFixed(2)} EUR</span>
          </div>
          <div class="totals-row">
            <span>IVA 0% (${totalAmount.toFixed(2)}):</span>
            <span>0,00 EUR</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total:</span>
            <span>${totalAmount.toFixed(2)} EUR</span>
          </div>
        </div>

        ${inv.observations ? `
          <div class="observations-box">
            <h5>Observaciones</h5>
            <p>${inv.observations}</p>
          </div>
        ` : ""}

        ${fiscalProfile?.footerNotes ? `
          <div style="margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 16px; font-size: 11px; color: #888; font-style: italic; white-space: pre-wrap;">
            ${fiscalProfile.footerNotes}
          </div>
        ` : ""}

        ${(fiscalProfile?.firma || fiscalProfile?.sello) ? `
          <div style="display: flex; justify-content: flex-end; gap: 40px; margin-top: 30px;">
            ${fiscalProfile?.firma ? `
              <div style="text-align: center;">
                <img src="${fiscalProfile.firma}" alt="Firma" style="max-height: 70px; max-width: 160px; object-fit: contain;" />
                <p style="margin: 4px 0 0; font-size: 11px; color: #888;">Firma</p>
              </div>
            ` : ""}
            ${fiscalProfile?.sello ? `
              <div style="text-align: center;">
                <img src="${fiscalProfile.sello}" alt="Sello" style="max-height: 70px; max-width: 160px; object-fit: contain;" />
                <p style="margin: 4px 0 0; font-size: 11px; color: #888;">Sello</p>
              </div>
            ` : ""}
          </div>
        ` : ""}

        <div class="page-num">1/1</div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveCreatedInvoice = async () => {
    if (!activeInvoiceEdit) return;

    const totalSum = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const salePayload = {
      clientId: activeInvoiceEdit.clientId || "",
      clinicId: activeClinic?.id || "",
      total: totalSum,
      discount: 0,
      paymentMethod: activeInvoiceEdit.estado === "PAGADO" ? "CASH" : "OTHER",
      items: activeInvoiceEdit.concepts.map((c: any) => ({
        id: c.id,
        name: c.text,
        type: "service",
        quantity: c.quantity,
        price: c.price,
      })),
      invoiceType: activeInvoiceEdit.series,
    };

    try {
      const saleRes = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salePayload),
      });

      if (!saleRes.ok) {
        alert("Error al guardar la factura.");
        return;
      }

      const createdSale = await saleRes.json();

      // Update related appointment status if this came from one
      if (selectedItemForPayment) {
        for (const item of checkoutItems) {
          if (item.id.startsWith("db-app-")) {
            const appId = item.id.replace("db-app-", "");
            try {
              await fetch("/api/appointments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: appId, status: activeInvoiceEdit.estado === "PAGADO" ? "COMPLETED" : "PENDING" }),
              });
            } catch (err) {
              console.error("Error updating appointment status:", err);
            }
          }
        }
      }

      // Print invoice PDF
      printInvoice(activeInvoiceEdit, activeClinic, activeFiscalProfile);

      // Reset
      setActiveInvoiceEdit(null);
      setSelectedItemForPayment(null);
      await fetchSalesData();
    } catch (e) {
      console.error("Error creating invoice:", e);
      alert("Error de red al guardar la factura.");
    }
  };

  const handleSaveExistingInvoice = async () => {
    if (!activeInvoiceEdit) return;

    const totalSum = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const salePayload = {
      id: activeInvoiceEdit.id,
      clientId: activeInvoiceEdit.clientId,
      total: totalSum,
      discount: 0,
      paymentMethod: activeInvoiceEdit.estado === "PAGADO" ? "CASH" : "OTHER",
      items: activeInvoiceEdit.concepts.map((c: any) => ({
        id: c.id,
        name: c.text,
        type: "service",
        quantity: c.quantity,
        price: c.price,
      })),
      invoiceNumber: activeInvoiceEdit.series === "NORMAL"
        ? `INV-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`
        : `SIMP-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`,
      date: activeInvoiceEdit.date,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salePayload),
      });

      if (!res.ok) {
        alert("Error al modificar la factura.");
        return;
      }

      alert("Factura modificada correctamente.");
      setActiveInvoiceEdit(null);
      await fetchSalesData();
    } catch (e) {
      console.error("Error updating invoice:", e);
      alert("Error de red al modificar la factura.");
    }
  };

  const handleOpenExistingInvoice = (sale: any) => {
    const clientName = `${sale.client?.firstName || ""} ${sale.client?.lastName || ""}`.trim();
    const clientDni = sale.client?.dniNif || "-";
    const clientAddress = `${sale.client?.address || ""}, ${sale.client?.postalCode || ""}, ${sale.client?.municipality || ""}, ${sale.client?.country || ""}`.trim();
    
    let concepts = [];
    try {
      const parsedItems = JSON.parse(sale.itemsJson || "[]");
      concepts = parsedItems.map((c: any) => ({
        id: c.id || c.name || Math.random().toString(),
        text: c.name || c.detalle || "Servicio",
        quantity: c.quantity || 1,
        price: c.price || c.total || 0,
        subtotal: (c.price || 0) * (c.quantity || 1),
      }));
    } catch (err) {
      console.error(err);
    }

    const series = sale.invoiceNumber.startsWith("SIMP-") ? "SIMPLIFIED" : "NORMAL";
    const numPart = parseInt(sale.invoiceNumber.split("-").pop() || "1") || 1;

    setActiveInvoiceEdit({
      id: sale.id,
      isExisting: true,
      clientId: sale.clientId,
      clientName,
      clientDni,
      clientAddress,
      clientEmail: sale.client?.email || "",
      clientPhone: sale.client?.phone || "",
      date: new Date(sale.createdAt).toISOString().split("T")[0],
      series,
      number: numPart,
      concepts,
      observations: sale.observations || "Puedes añadir anotaciones a la factura",
      groupServices: false,
      groupAll: false,
      showFecha: true,
      showCliente: true,
      showNif: true,
      showDescripcion: true,
      estado: sale.paymentMethod === "OTHER" ? "PENDIENTE" : "PAGADO",
      rawSale: sale
    });
  };

  const handlePrint = () => {
    printInvoice(activeInvoiceEdit, activeClinic, activeFiscalProfile);
  };

  const handlePrintThermal = () => {
    if (!activeInvoiceEdit) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para poder imprimir.");
      return;
    }

    const dateStr = new Date(activeInvoiceEdit.date).toLocaleDateString("es-ES");
    const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);
    const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : "SIMP";
    const invoiceLabel = `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;

    const conceptsHtml = activeInvoiceEdit.concepts.map((c: any) => `
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
        <span style="flex: 1; text-align: left;">${c.text}</span>
        <span style="width: 30px; text-align: center;">x${c.quantity}</span>
        <span style="width: 60px; text-align: right;">${(c.price * c.quantity).toFixed(2)}</span>
      </div>
    `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket ${invoiceLabel}</title>
        <meta charset="utf-8" />
        <style>
          @media print {
            body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; }
            .no-print { display: none; }
          }
          body { font-family: monospace; font-size: 12px; width: 75mm; margin: 0 auto; padding: 10px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .totals { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
          .btn-container { text-align: center; margin-bottom: 10px; }
          .print-btn { background: #000; color: white; border: none; padding: 6px 12px; font-size: 12px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="btn-container no-print">
          <button class="print-btn" onclick="window.print()">Imprimir Ticket</button>
        </div>
         <div class="center bold" style="font-size: 16px;">${activeFiscalProfile?.comercialName || activeClinic?.name || 'CLIFAV'}</div>
        <div class="center" style="font-size: 10px;">
          ${activeFiscalProfile ? `${activeFiscalProfile.address || ''}, ${activeFiscalProfile.postalCode || ''} ${activeFiscalProfile.municipality || ''}` : (activeClinic?.address || '')}<br/>
          CIF/NIF: ${activeFiscalProfile?.nif || ''}
        </div>
        <div class="divider"></div>
        <div>
          <strong>TICKET / FACTURA:</strong> ${invoiceLabel}<br/>
          <strong>FECHA:</strong> ${dateStr}<br/>
          <strong>CLIENTE:</strong> ${activeInvoiceEdit.clientName}<br/>
          \${activeInvoiceEdit.clientDni !== "-" ? \`<strong>NIF:</strong> \${activeInvoiceEdit.clientDni}<br/>\` : ""}
        </div>
        <div class="divider"></div>
        <div style="font-weight: bold; display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
          <span style="flex: 1; text-align: left;">DESCRIPCION</span>
          <span style="width: 30px; text-align: center;">CANT</span>
          <span style="width: 60px; text-align: right;">TOTAL</span>
        </div>
        ${conceptsHtml}
        <div class="divider"></div>
        <div class="totals">
          <span>TOTAL:</span>
          <span>${totalAmount.toFixed(2)} EUR</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 15px;">
          ¡Gracias por su visita!<br/>
          Software de gestión Clifav
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    if (!activeInvoiceEdit) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      const clinicName = activeFiscalProfile?.comercialName || activeClinic?.name || "CLIFAV Central";
      const cifNif = activeFiscalProfile?.nif ? `${activeFiscalProfile.comercialName || ""} · ${activeFiscalProfile.nif}` : (activeClinic?.name || "CLIFAV");
      const address = activeFiscalProfile ? `${activeFiscalProfile.address || ""}${activeFiscalProfile.municipality ? ", " + activeFiscalProfile.postalCode + " " + activeFiscalProfile.municipality : ""}` : (activeClinic?.address || "");
      const dateStr = new Date(activeInvoiceEdit.date).toLocaleDateString("es-ES");
      const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : "SIMP";
      const invoiceLabel = `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;
      const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

      let y = 20;

      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, 210, 8, "F");

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39);
      doc.text(clinicName, 15, y);

      doc.setFontSize(14);
      doc.setTextColor(2, 132, 199);
      doc.text("FACTURA", 140, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Número: ${invoiceLabel}`, 140, y);
      doc.text(`Fecha: ${dateStr}`, 140, y + 5);

      doc.setTextColor(55, 65, 81);
      doc.text(cifNif, 15, y);
      doc.text(address, 15, y + 5);

      y += 20;
      doc.setDrawColor(229, 231, 235);
      doc.line(15, y, 195, y);

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(2, 132, 199);
      doc.text("DIRIGIDO A", 15, y);

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(activeInvoiceEdit.clientName, 15, y);
      
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      if (activeInvoiceEdit.clientDni !== "-") {
        doc.text(`NIF/DNI: ${activeInvoiceEdit.clientDni}`, 15, y);
        y += 5;
      }
      doc.text(activeInvoiceEdit.clientAddress, 15, y);

      y += 15;
      doc.setDrawColor(229, 231, 235);
      doc.line(15, y, 195, y);

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("CONCEPTO", 15, y);
      doc.text("CANT", 130, y);
      doc.text("PRECIO", 155, y, { align: "right" });
      doc.text("TOTAL", 195, y, { align: "right" });

      y += 4;
      doc.line(15, y, 195, y);

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      
      activeInvoiceEdit.concepts.forEach((c: any) => {
        const splitText = doc.splitTextToSize(c.text, 100);
        doc.text(splitText, 15, y);
        doc.text(String(c.quantity), 130, y);
        doc.text(`${c.price.toFixed(2)} EUR`, 155, y, { align: "right" });
        doc.text(`${(c.price * c.quantity).toFixed(2)} EUR`, 195, y, { align: "right" });
        
        y += (splitText.length * 5) + 3;
      });

      y += 5;
      doc.line(15, y, 195, y);

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL FACTURA:", 140, y);
      doc.text(`${totalAmount.toFixed(2)} EUR`, 195, y, { align: "right" });

      if (activeInvoiceEdit.observations) {
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Observaciones:", 15, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const splitObs = doc.splitTextToSize(activeInvoiceEdit.observations, 180);
        doc.text(splitObs, 15, y);
      }

      if (activeFiscalProfile?.footerNotes) {
        y += 20;
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y, 195, y);
        y += 8;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const splitFooter = doc.splitTextToSize(activeFiscalProfile.footerNotes, 180);
        doc.text(splitFooter, 15, y);
        y += splitFooter.length * 4 + 4;
      }

      doc.save(`Factura-${invoiceLabel}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error al generar el PDF.");
    }
  };

  const handleSendEmail = async () => {
    if (!activeInvoiceEdit) return;
    const defaultEmail = activeInvoiceEdit.clientEmail || "";
    const emailTo = prompt("Introduce el correo electrónico del paciente para enviar la factura:", defaultEmail);
    if (!emailTo) return;

    const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : "SIMP";
    const invoiceLabel = `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;
    const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const bodyMsg = `Estimado/a ${activeInvoiceEdit.clientName},\n\nLe adjuntamos los detalles de su factura ${invoiceLabel}.\n\nConceptos:\n${activeInvoiceEdit.concepts.map((c: any) => `- ${c.text} x${c.quantity} (${(c.price * c.quantity).toFixed(2)} €)`).join("\n")}\n\nTotal: ${totalAmount.toFixed(2)} €\n\nGracias por su confianza.\n\n${activeClinic?.name || "Clifav"}`;

    try {
      const res = await fetch("/api/notifications/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic?.id || "",
          clientId: activeInvoiceEdit.clientId || "",
          clientName: activeInvoiceEdit.clientName,
          to: emailTo,
          subject: `Factura ${invoiceLabel} - ${activeClinic?.name || "Clifav"}`,
          body: bodyMsg,
        }),
      });

      if (res.ok) {
        alert("Correo enviado con éxito.");
      } else {
        const err = await res.json();
        alert("Error al enviar el correo: " + (err.error || ""));
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al enviar el correo.");
    }
  };

  const handleSendWhatsapp = () => {
    if (!activeInvoiceEdit) return;
    const phoneClean = (activeInvoiceEdit.clientPhone || "").replace(/\D/g, "");
    const clientPhone = phoneClean ? (phoneClean.startsWith("34") ? phoneClean : `34${phoneClean}`) : "";
    const phoneTo = prompt("Introduce el número de teléfono del paciente (con prefijo de país, ej. 34600000000):", clientPhone || "34");
    if (!phoneTo) return;

    const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : "SIMP";
    const invoiceLabel = `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;
    const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const message = `Hola ${activeInvoiceEdit.clientName}, adjunto los detalles de su factura ${invoiceLabel}. Total: ${totalAmount.toFixed(2)} €. Gracias por confiar en nosotros.`;
    const encodedMsg = encodeURIComponent(message);

    const mode = activeClinic?.defaultWhatsappMode || "Web";
    const url = mode === "App" 
      ? `https://api.whatsapp.com/send?phone=${phoneTo}&text=${encodedMsg}`
      : `https://web.whatsapp.com/send?phone=${phoneTo}&text=${encodedMsg}`;

    window.open(url, "_blank");
  };

  const handleRectify = () => {
    if (!activeInvoiceEdit) return;
    const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : "SIMP";
    const origInvoiceLabel = `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;

    const negatedConcepts = activeInvoiceEdit.concepts.map((c: any) => ({
      ...c,
      price: -Math.abs(c.price),
      subtotal: -Math.abs(c.subtotal)
    }));

    const nextNum = getNextInvoiceNumber(activeInvoiceEdit.series);

    setActiveInvoiceEdit({
      ...activeInvoiceEdit,
      id: undefined,
      isExisting: false,
      number: nextNum,
      concepts: negatedConcepts,
      observations: `Rectificación de la factura ${origInvoiceLabel}`,
      estado: "PENDIENTE"
    });

    setShowOpcionesDropdown(false);
    alert(`Se ha generado una factura rectificativa con importes negativos en base a la factura original ${origInvoiceLabel}. Por favor, revise y haga clic en "Crear factura" para guardarla.`);
  };

  const handleDeleteInvoice = async () => {
    if (!activeInvoiceEdit) return;
    if (!confirm("¿Estás seguro de que deseas eliminar esta factura? Esta acción eliminará definitivamente el registro del sistema y no se puede deshacer.")) {
      return;
    }

    try {
      const res = await fetch(`/api/sales?id=${activeInvoiceEdit.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Factura eliminada correctamente.");
        setActiveInvoiceEdit(null);
        await fetchSalesData();
      } else {
        alert("Error al eliminar la factura.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al eliminar la factura.");
    }
  };

  const handleOpenEditClient = () => {
    if (!activeInvoiceEdit) return;
    const clientId = activeInvoiceEdit.clientId;
    const clientObj = clients.find(c => c.id === clientId);
    if (!clientObj) return;

    setEditClientForm({
      id: clientObj.id,
      firstName: clientObj.firstName,
      lastName: clientObj.lastName || "",
      dniNif: clientObj.dniNif || "",
      birthDate: clientObj.birthDate ? new Date(clientObj.birthDate).toISOString().split("T")[0] : "",
      address: clientObj.address || "",
      postalCode: clientObj.postalCode || "",
      municipality: clientObj.municipality || "",
      country: clientObj.country || "Spain (España)",
      phone: clientObj.phone || "",
      email: clientObj.email || "",
    });
    setShowEditClientModal(true);
  };

  const handleSaveClientChanges = async () => {
    try {
      const res = await fetch(`/api/clients/${editClientForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editClientForm),
      });
      if (!res.ok) {
        alert("Error al actualizar contacto.");
        return;
      }
      
      await res.json();
      await fetchSalesData();

      setActiveInvoiceEdit((prev: any) => {
        if (!prev) return null;
        const newName = `${editClientForm.firstName} ${editClientForm.lastName}`.trim();
        const newAddress = `${editClientForm.address}, ${editClientForm.postalCode}, ${editClientForm.municipality}, ${editClientForm.country}`.trim();
        
        const newConcepts = prev.concepts.map((c: any) => {
          const origItem = checkoutItems.find(i => i.id === c.id);
          const itemDesc = origItem ? origItem.detalle : c.text.split(" | ").pop();
          const newText = regenerateConceptText(itemDesc, {
            ...prev,
            clientName: newName,
            clientDni: editClientForm.dniNif
          });
          return { ...c, text: newText };
        });

        return {
          ...prev,
          clientName: newName,
          clientDni: editClientForm.dniNif,
          clientAddress: newAddress,
          clientEmail: editClientForm.email,
          clientPhone: editClientForm.phone,
          concepts: newConcepts
        };
      });

      setShowEditClientModal(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar cambios.");
    }
  };

  const handleSave = async (silent = false) => {
    if (!selectedItemForPayment) return;

    const subtotal = checkoutSubtotal;
    const discountAmt = checkoutDiscount ? checkoutDiscount.amount : 0;
    const totalAfterDiscount = Math.max(0, subtotal - discountAmt);

    // Sum of all payments (saved and new)
    const paidSum = partialPayments.reduce((s, p) => s + p.amount, 0);
    const restante = Math.max(0, totalAfterDiscount - paidSum);
    const isPaid = restante <= 0; // Fully paid if remaining balance is 0

    // 1. Update appointment status for each checkout item if it came from an appointment
    for (const item of checkoutItems) {
      if (item.id.startsWith("db-app-")) {
        const appId = item.id.replace("db-app-", "");
        const appObj = appointments.find(a => a.id === appId);
        const originalStatus = appObj ? appObj.status : "PENDING";
        try {
          await fetch("/api/appointments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: appId,
              status: isPaid ? "COMPLETED" : originalStatus,
            }),
          });
        } catch (err) {
          console.error("Error updating appointment status:", err);
        }
      }
    }

    // 2. Persist the Sale in SQLite for any new unsaved payments
    const isAlreadyPersistedSale = selectedItemForPayment.id.startsWith("db-sale-item-");
    const isMock = selectedItemForPayment.id.startsWith("mock-");

    if (!isAlreadyPersistedSale && !isMock) {
      await persistUnsavedPayments(invoiceRequested);
    }

    if (!silent) {
      alert("Cambios guardados con éxito.");
    }
    setInvoiceRequested("NONE");
    setSelectedItemForPayment(null);
    fetchSalesData();
  };

  // Date Filter Helpers
  const calculatePresetRange = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (preset) {
      case "hoy":
        break;
      case "ayer":
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
        break;
      case "ultimos_7":
        start.setDate(now.getDate() - 6);
        break;
      case "ultimos_30":
        start.setDate(now.getDate() - 29);
        break;
      case "ultimos_90":
        start.setDate(now.getDate() - 89);
        break;
      case "esta_semana": {
        const day = now.getDay();
        const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diffToMon);
        end.setDate(diffToMon + 6);
        break;
      }
      case "este_mes":
        start.setDate(1);
        end.setMonth(now.getMonth() + 1);
        end.setDate(0);
        break;
      case "mes_anterior":
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        end.setMonth(now.getMonth());
        end.setDate(0);
        break;
      case "semana_fecha": {
        const day = now.getDay();
        const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diffToMon);
        break;
      }
      case "mes_fecha":
        start.setDate(1);
        break;
      case "octubre_2025":
        start = new Date("2025-10-01T00:00:00");
        end = new Date("2025-10-15T23:59:59");
        break;
      case "junio_2026":
        start = new Date("2026-06-01T00:00:00");
        end = new Date("2026-06-22T23:59:59");
        break;
      default:
        return null;
    }
    return { start, end };
  };

  const handlePresetChange = (preset: string) => {
    setPickerPreset(preset);
    if (preset === "personalizado") return;
    
    const range = calculatePresetRange(preset);
    if (range) {
      setPickerStart(range.start);
      setPickerEnd(range.end);
      setTempStartInput(formatDateToInput(range.start));
      setTempEndInput(formatDateToInput(range.end));
      setCalendarMonth(new Date(range.start.getFullYear(), range.start.getMonth(), 1));
    }
  };

  const getCalendarGridDays = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const prevMonthDays = new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const daysList: { date: Date; isMuted: boolean }[] = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      daysList.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isMuted: true,
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      daysList.push({
        date: new Date(year, month, i),
        isMuted: false,
      });
    }
    
    const remaining = 42 - daysList.length;
    for (let i = 1; i <= remaining; i++) {
      daysList.push({
        date: new Date(year, month + 1, i),
        isMuted: true,
      });
    }
    
    return daysList;
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const isDateInRange = (d: Date) => {
    if (!pickerStart || !pickerEnd) return false;
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const start = new Date(pickerStart.getFullYear(), pickerStart.getMonth(), pickerStart.getDate()).getTime();
    const end = new Date(pickerEnd.getFullYear(), pickerEnd.getMonth(), pickerEnd.getDate()).getTime();
    return target > start && target < end;
  };

  const handleDayClick = (dayDate: Date) => {
    setPickerPreset("personalizado");
    if (!pickerStart || (pickerStart && pickerEnd)) {
      setPickerStart(dayDate);
      setPickerEnd(null);
      setTempStartInput(formatDateToInput(dayDate));
      setTempEndInput("");
    } else {
      if (dayDate >= pickerStart) {
        setPickerEnd(dayDate);
        setTempEndInput(formatDateToInput(dayDate));
      } else {
        setPickerStart(dayDate);
        setTempStartInput(formatDateToInput(dayDate));
      }
    }
  };

  const handleStartInputChange = (val: string) => {
    setTempStartInput(val);
    const parsed = parseInputToDate(val);
    if (parsed) {
      setPickerStart(parsed);
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      setPickerPreset("personalizado");
    }
  };

  const handleEndInputChange = (val: string) => {
    setTempEndInput(val);
    const parsed = parseInputToDate(val);
    if (parsed) {
      setPickerEnd(parsed);
      setPickerPreset("personalizado");
    }
  };

  const handlePrevMonths = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonths = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const SpanishMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const getMonthHeaderLabel = (d: Date) => {
    return `${SpanishMonths[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getFilterText = () => {
    if (!dateFilterStart || !dateFilterEnd) return "Ver Todo";
    const opt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
    return `${dateFilterStart.toLocaleDateString("es-ES", opt)} - ${dateFilterEnd.toLocaleDateString("es-ES", opt)}`;
  };

  // Checkbox item toggles
  const handleToggleRow = (id: string) => {
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter((rowId) => rowId !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("desc");
    }
  };

  // ----------------------------------------------------
  // LIST GENERATORS & AGGREGATIONS
  // ----------------------------------------------------
  const getArticlesList = (): ArticleItem[] => {
    let items: ArticleItem[] = [...MOCK_ARTICULOS];

    // Merge real database sales
    salesHistory.forEach((sale, saleIdx) => {
      const saleDate = new Date(sale.createdAt);
      const itemsArr = JSON.parse(sale.itemsJson || "[]");

      itemsArr.forEach((item: any, itemIdx: number) => {
        // Skip pushing as a separate row if this sale belongs to a database appointment,
        // since the appointment row itself handles showing the unified payment status
        if (item.id && (item.id.startsWith("db-app-") || appointments.some(a => a.id === item.id))) {
          return;
        }

        items.push({
          id: `db-sale-item-${sale.id}-${itemIdx}`,
          refMov: `#${500 + saleIdx}`,
          nuV: sale.invoiceNumber,
          fecha: saleDate.toLocaleDateString("es-ES"),
          fechaRaw: saleDate,
          hora: "-",
          tipo: item.type === "service" ? "Servicio" : "Producto",
          detalle: item.name,
          clientNumber: `#${sale.client?.clientNumber || 200 + saleIdx}`,
          cliente: `${sale.client?.firstName || ""} ${sale.client?.lastName || ""}`,
          clientId: sale.client?.id,
          dni: sale.client?.dniNif || "-",
          empleado: "Recepción",
          consulta: activeClinic?.name || "Clifav Central",
          estado: "PAGADO",
          metodoPago: getPaymentMethodText(sale.paymentMethod),
          fechaPago: saleDate.toLocaleDateString("es-ES"),
          price: item.price * item.quantity,
        });
      });
    });

    // Merge real database appointments
    appointments.forEach((app, appIdx) => {
      const appDate = new Date(app.start);

      // Find all database sales that belong to this appointment
      const matchingSales = salesHistory.filter((sale) => {
        try {
          const itemsArr = JSON.parse(sale.itemsJson || "[]");
          return itemsArr.some((i: any) => i.id === `db-app-${app.id}` || i.id === app.id);
        } catch (e) {
          return false;
        }
      });

      const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);
      const servicePrice = app.service?.price || 0;

      let resolvedEstado = "PENDIENTE";
      if (servicePrice === 0) {
        resolvedEstado = "GRATUITO";
      } else if (totalPaid >= servicePrice || app.status === "COMPLETED") {
        resolvedEstado = "PAGADO";
      } else if (totalPaid > 0) {
        resolvedEstado = "PAGO PARCIAL";
      }

      // Format payment methods used
      const methods = [...new Set(matchingSales.map(s => getPaymentMethodText(s.paymentMethod)))];
      const resolvedMetodo = methods.length > 0 ? methods.join(", ") : "-";

      // Date of latest payment
      const latestSale = matchingSales.length > 0 
        ? matchingSales.reduce((latest, s) => new Date(s.createdAt) > new Date(latest.createdAt) ? s : latest, matchingSales[0])
        : null;
      const resolvedFechaPago = latestSale 
        ? new Date(latestSale.createdAt).toLocaleDateString("es-ES")
        : "-";

      // Get invoice number(s) if paid or partially paid
      const invoiceNumbers = matchingSales.map(s => s.invoiceNumber).filter(Boolean);
      const resolvedNuV = invoiceNumbers.length > 0 ? invoiceNumbers.join(", ") : "-";

      items.push({
        id: `db-app-${app.id}`,
        refMov: `#${600 + appIdx}`,
        nuV: `#${100 + appIdx}`,
        fecha: appDate.toLocaleDateString("es-ES"),
        fechaRaw: appDate,
        hora: `${String(appDate.getHours()).padStart(2, "0")}:${String(appDate.getMinutes()).padStart(2, "0")} - ${String(new Date(app.end).getHours()).padStart(2, "0")}:${String(new Date(app.end).getMinutes()).padStart(2, "0")}`,
        tipo: "Servicio",
        detalle: app.service?.name || "Tratamiento Clínico",
        clientNumber: `#${app.client?.clientNumber || 300 + appIdx}`,
        cliente: `${app.client?.firstName || ""} ${app.client?.lastName || ""}`,
        clientId: app.client?.id,
        dni: app.client?.dniNif || "-",
        empleado: app.user?.name || "Especialista",
        consulta: activeClinic?.name || "Clifav Central",
        estado: resolvedEstado,
        metodoPago: resolvedMetodo,
        fechaPago: resolvedFechaPago,
        price: servicePrice,
      });
    });

    // Map items to dynamically resolve clientIds and apply overrides
    const resolvedItems = items.map((item, idx) => {
      // 1. Resolve clientId if missing by matching client name
      let cId = item.clientId;
      if (!cId) {
        const found = clients.find(
          (c) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().trim() ===
            item.cliente.toLowerCase().trim()
        );
        if (found) {
          cId = found.id;
        }
      }

      // 2. Apply payment overrides if any
      const override = paymentOverrides[item.id];
      let resolvedEstado = item.estado;
      let resolvedMetodo = item.metodoPago;
      let resolvedFechaPago = item.fechaPago;

      if (override) {
        resolvedEstado = override.estado;
        resolvedMetodo = override.metodoPago;
        resolvedFechaPago = override.fechaPago;
      }

      // 3. Resolve nuV: only if paid (PAGADO)
      let resolvedNuV = item.nuV;
      if (resolvedEstado === "PAGADO") {
        if (resolvedNuV === "-") {
          // Try to find a matching sale
          const cleanId = item.id.replace("db-sale-item-", "").replace("db-app-", "");
          const matchingSale = salesHistory.find((s) => {
            if (s.id === cleanId) return true;
            try {
              const itemsArr = JSON.parse(s.itemsJson || "[]");
              return itemsArr.some((i: any) => i.id === item.id || i.id.includes(cleanId));
            } catch (e) {
              return false;
            }
          });
          if (matchingSale) {
            resolvedNuV = matchingSale.invoiceNumber;
          } else {
            // Fallback generated sale number
            resolvedNuV = `#${300 + idx}`;
          }
        }
      } else if (resolvedEstado === "PENDIENTE") {
        // If not fully paid (PENDIENTE), it should NOT have a sale number: "si no ha pagado no tiene numero solo REF. MOV."
        resolvedNuV = "-";
      }

      // 4. Calculate Billing fields
      const hasInvoice = resolvedNuV !== "-" && 
        (resolvedNuV.startsWith("INV-") || resolvedNuV.startsWith("SIMP-") || resolvedNuV.startsWith("#"));
      
      const facturaVal = hasInvoice ? "Si" : "";
      const precioVal = item.price;
      const ivaVal = 0.00;
      const irpfVal = 0.00;
      const totalVal = precioVal;
      
      let pagadoVal = 0;
      if (resolvedEstado === "PAGADO" || resolvedEstado === "GRATUITO") {
        pagadoVal = totalVal;
      } else if (resolvedEstado === "PENDIENTE") {
        pagadoVal = 0;
      } else {
        // PAGO PARCIAL
        const cleanId = item.id.replace("db-sale-item-", "").replace("db-app-", "");
        const matchingSales = salesHistory.filter((s) => {
          try {
            const itemsArr = JSON.parse(s.itemsJson || "[]");
            return s.id === cleanId || itemsArr.some((i: any) => i.id === item.id || i.id.includes(cleanId));
          } catch (e) {
            return false;
          }
        });
        pagadoVal = matchingSales.reduce((sum, s) => sum + s.total, 0);
      }

      return {
        ...item,
        clientId: cId,
        estado: resolvedEstado,
        metodoPago: resolvedMetodo,
        fechaPago: resolvedFechaPago,
        nuV: resolvedNuV,
        factura: facturaVal,
        precio: precioVal,
        iva: ivaVal,
        irpf: irpfVal,
        total: totalVal,
        pagado: pagadoVal,
      };
    });

    // Filtering
    return resolvedItems
      .filter((item) => {
        if (dateFilterStart && item.fechaRaw < dateFilterStart) return false;
        if (dateFilterEnd && item.fechaRaw > dateFilterEnd) return false;
        if (searchQuery) {
          const s = searchQuery.toLowerCase();
          return (
            item.cliente.toLowerCase().includes(s) ||
            item.detalle.toLowerCase().includes(s) ||
            item.nuV.toLowerCase().includes(s)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const compareRefMov = (aStr: string, bStr: string) => {
          const numA = parseInt(aStr.replace("#", ""), 10);
          const numB = parseInt(bStr.replace("#", ""), 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return aStr.localeCompare(bStr);
        };

        const compareHora = (aStr: string, bStr: string) => {
          if (aStr === "-") return 1;
          if (bStr === "-") return -1;
          return aStr.localeCompare(bStr);
        };

        let comparison = 0;
        switch (sortColumn) {
          case "refMov":
            comparison = compareRefMov(a.refMov, b.refMov);
            break;
          case "fecha":
            comparison = a.fechaRaw.getTime() - b.fechaRaw.getTime();
            break;
          case "hora":
            comparison = compareHora(a.hora, b.hora);
            break;
          case "tipo":
            comparison = a.tipo.localeCompare(b.tipo);
            break;
          case "detalle":
            comparison = a.detalle.localeCompare(b.detalle);
            break;
          case "cliente":
            comparison = a.cliente.localeCompare(b.cliente);
            break;
          case "factura":
            comparison = a.factura.localeCompare(b.factura);
            break;
          case "precio":
            comparison = a.precio - b.precio;
            break;
          case "iva":
            comparison = a.iva - b.iva;
            break;
          case "irpf":
            comparison = a.irpf - b.irpf;
            break;
          case "total":
            comparison = a.total - b.total;
            break;
          case "pagado":
            comparison = a.pagado - b.pagado;
            break;
          default:
            comparison = a.fechaRaw.getTime() - b.fechaRaw.getTime();
            break;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
  };

  const getInvoicesList = () => {
    let items: any[] = [];

    if (activeSubTab === "emitidas") {
      // Seed high-fidelity sample issued invoices if no DB checkouts
      salesHistory.forEach((sale) => {
        // Skip non-invoice tickets
        if (!sale.invoiceNumber.startsWith("INV-") && !sale.invoiceNumber.startsWith("SIMP-")) {
          return;
        }

        const saleDate = new Date(sale.createdAt);
        items.push({
          id: sale.id,
          refFac: sale.invoiceNumber,
          fechaCreacion: saleDate.toLocaleDateString("es-ES"),
          fechaOperacion: saleDate.toLocaleDateString("es-ES"),
          fechaRaw: saleDate,
          cliente: `${sale.client?.firstName || ""} ${sale.client?.lastName || ""}`,
          clientNumber: `#${sale.client?.clientNumber || ""}`,
          nif: sale.client?.dniNif || "-",
          direccion: sale.client?.address || "-",
          ciudad: sale.client?.municipality || "-",
          codigoPostal: sale.client?.postalCode || "-",
          precioBruto: sale.total + sale.discount,
          descuento: sale.discount,
          baseImponible: sale.total / 1.21,
          iva: sale.total - sale.total / 1.21,
          retencion: 0,
          total: sale.total,
          metodoPago: getPaymentMethodText(sale.paymentMethod),
          tipo: sale.invoiceNumber.startsWith("SIMP-") ? "Simplificada" : "Completa",
          estadoPago: "PAGADO",
          rawSale: sale,
        });
      });

      // Add a couple of mock issued invoices for visual completeness if range covers Oct 2025
      const isMockClinic = activeClinic && (activeClinic.id === "1941b619-8ead-4388-91f4-aedd9100a7e9" || activeClinic.id === "6fe5ca72-4169-48da-94a2-79196efbe581");
      if (isMockClinic) {
        items.push({
          id: "mock-inv-1",
          refFac: "#112",
          fechaCreacion: "08/10/2025",
          fechaOperacion: "08/10/2025",
          fechaRaw: new Date("2025-10-08T17:30:00"),
          cliente: "Maria jose lloret lopez",
          clientNumber: "#144",
          nif: "48330129Y",
          direccion: "Calle Mayor 12",
          ciudad: "Alicante",
          codigoPostal: "03001",
          precioBruto: 260.0,
          descuento: 0.0,
          baseImponible: 214.88,
          iva: 45.12,
          retencion: 0.0,
          total: 260.0,
          metodoPago: "Efectivo",
          tipo: "Simplificada",
          estadoPago: "PAGADO",
        });
        items.push({
          id: "mock-inv-2",
          refFac: "#113",
          fechaCreacion: "08/10/2025",
          fechaOperacion: "08/10/2025",
          fechaRaw: new Date("2025-10-08T17:15:00"),
          cliente: "CRISTINA SILVA BELOSIAGUE",
          clientNumber: "#156",
          nif: "18939221P",
          direccion: "Avda Novelda 92",
          ciudad: "Alicante",
          codigoPostal: "03009",
          precioBruto: 100.0,
          descuento: 0.0,
          baseImponible: 82.64,
          iva: 17.36,
          retencion: 0.0,
          total: 100.0,
          metodoPago: "Efectivo",
          tipo: "Simplificada",
          estadoPago: "PAGADO",
        });
      }
    } else {
      // Recibidas (expenses)
      movements
        .filter((m) => m.type === "EXPENSE")
        .forEach((mov) => {
          const movDate = new Date(mov.date);
          items.push({
            id: mov.id,
            refFac: `EXP-${mov.id.substring(0, 4).toUpperCase()}`,
            fechaCreacion: movDate.toLocaleDateString("es-ES"),
            fechaOperacion: movDate.toLocaleDateString("es-ES"),
            fechaRaw: movDate,
            cliente: mov.concept,
            clientNumber: "-",
            nif: "-",
            direccion: "-",
            ciudad: "-",
            codigoPostal: "-",
            precioBruto: mov.amount,
            descuento: 0,
            baseImponible: mov.amount / 1.21,
            iva: mov.amount - mov.amount / 1.21,
            retencion: 0,
            total: mov.amount,
            metodoPago: getPaymentMethodText(mov.method),
            tipo: "Proveedor",
            estadoPago: "PAGADO",
          });
        });
    }

    return items
      .filter((item) => {
        if (dateFilterStart && item.fechaRaw < dateFilterStart) return false;
        if (dateFilterEnd && item.fechaRaw > dateFilterEnd) return false;
        if (searchQuery) {
          return item.refFac.toLowerCase().includes(searchQuery.toLowerCase()) || item.cliente.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => b.fechaRaw.getTime() - a.fechaRaw.getTime());
  };

  const getPaymentsList = () => {
    const isMockClinic = activeClinic && (activeClinic.id === "1941b619-8ead-4388-91f4-aedd9100a7e9" || activeClinic.id === "6fe5ca72-4169-48da-94a2-79196efbe581");
    let items = isMockClinic ? [...MOCK_PAGOS] : [];

    // Merge db sales
    salesHistory.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      items.push({
        id: `db-pay-sale-${sale.id}`,
        fecha: saleDate.toLocaleString("es-ES", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        fechaRaw: saleDate,
        transaccion: "PAGO",
        usuario: "admin@clifav.com",
        nuV: sale.invoiceNumber,
        metodoPago: getPaymentMethodText(sale.paymentMethod),
        total: sale.total,
        reembolsado: 0,
      });
    });

    // Merge manual income movements
    movements
      .filter((m) => m.type === "INCOME")
      .forEach((mov) => {
        const movDate = new Date(mov.date);
        items.push({
          id: `db-pay-mov-${mov.id}`,
          fecha: movDate.toLocaleString("es-ES", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          fechaRaw: movDate,
          transaccion: "PAGO",
          usuario: "admin@clifav.com",
          nuV: `INC-${mov.id.substring(0, 4).toUpperCase()}`,
          metodoPago: getPaymentMethodText(mov.method),
          total: mov.amount,
          reembolsado: 0,
        });
      });

    return items
      .filter((item) => {
        if (dateFilterStart && item.fechaRaw < dateFilterStart) return false;
        if (dateFilterEnd && item.fechaRaw > dateFilterEnd) return false;
        if (searchQuery) {
          return item.nuV.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => b.fechaRaw.getTime() - a.fechaRaw.getTime());
  };

  const getMovementsList = () => {
    let items: any[] = [];
    movements.forEach((mov) => {
      const mDate = new Date(mov.date);
      items.push({
        id: mov.id,
        concepto: mov.concept,
        cantidad: mov.amount,
        metodo: getPaymentMethodText(mov.method),
        movimiento: mov.type === "INCOME" ? "INGRESO" : "GASTO",
        fecha: mDate.toLocaleDateString("es-ES"),
        fechaRaw: mDate,
      });
    });

    return items
      .filter((item) => {
        if (dateFilterStart && item.fechaRaw < dateFilterStart) return false;
        if (dateFilterEnd && item.fechaRaw > dateFilterEnd) return false;
        if (searchQuery) {
          return item.concepto.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => b.fechaRaw.getTime() - a.fechaRaw.getTime());
  };

  // Calculating stats metrics for Artículos screen
  const calculateArticlesStats = () => {
    const list = getArticlesList();
    const totalVolume = list.reduce((sum, item) => sum + item.price, 0);
    const appointmentsSum = list.filter((i) => i.tipo === "Servicio").reduce((sum, item) => sum + item.price, 0);
    const appointmentsCount = list.filter((i) => i.tipo === "Servicio").length;
    const productsSum = list.filter((i) => i.tipo === "Producto").reduce((sum, item) => sum + item.price, 0);
    const productsCount = list.filter((i) => i.tipo === "Producto").length;

    return {
      volumenNegocio: totalVolume,
      citasSum: appointmentsSum,
      citasCount: appointmentsCount,
      productosSum: productsSum,
      productosCount: productsCount,
    };
  };

  // Calculating invoice stats for Facturas screen
  const calculateInvoiceStats = () => {
    const list = getInvoicesList();
    const totalSum = list.reduce((sum, item) => sum + item.total, 0);
    const taxBase = totalSum / 1.21;
    const vat = totalSum - taxBase;
    return {
      total: totalSum,
      base: taxBase,
      iva: vat,
    };
  };

  // Summary groupings for Tab "Resumen"
  const calculatePaymentSummary = () => {
    const list = getPaymentsList();
    const cash = list.filter((p) => p.metodoPago === "Efectivo").reduce((s, p) => s + p.total, 0);
    const card = list.filter((p) => p.metodoPago === "Tarjeta").reduce((s, p) => s + p.total, 0);
    const trans = list.filter((p) => p.metodoPago === "Transferencia").reduce((s, p) => s + p.total, 0);
    return {
      efectivo: cash,
      tarjeta: card,
      transferencia: trans,
      total: cash + card + trans,
    };
  };

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return (
      <div className={styles.paginationBlock}>
        <div className={styles.paginationBtnRow}>
          <button
            type="button"
            className={styles.paginationNavBtn}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ◂ Anterior
          </button>
          
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.pageNumberBtn} ${currentPage === p ? styles.pageNumberBtnActive : ""}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className={styles.paginationNavBtn}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Siguiente ▸
          </button>
        </div>

        <div className={styles.showCountSelector}>
          <span className={styles.mostrarLabel}>MOSTRAR</span>
          <select
            className={styles.showCountSelect}
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    );
  };

  const getServiceIdForArticleItem = (item: ArticleItem): string | null => {
    if (item.id.startsWith("db-app-")) {
      const appId = item.id.replace("db-app-", "");
      const app = appointments.find((a) => a.id === appId);
      if (app?.serviceId) return app.serviceId;
      if (app?.service?.id) return app.service.id;
    }
    const srv = services.find((s) => s.name === item.detalle);
    if (srv) return srv.id;
    return null;
  };

  const showBonoPaymentOption = useMemo(() => {
    if (selectedClientVouchers.length === 0) return false;
    return checkoutItems.some((item) => {
      const srvId = getServiceIdForArticleItem(item);
      if (!srvId) return false;
      return selectedClientVouchers.some((v) => {
        if (!v.serviceIds) return false;
        const allowedIds = v.serviceIds.split(",");
        return allowedIds.includes(srvId);
      });
    });
  }, [checkoutItems, selectedClientVouchers, services, appointments]);

  const checkoutSubtotal = checkoutItems.reduce((acc, item) => acc + item.price, 0);
  const checkoutDiscountAmt = selectedItemForPayment && checkoutDiscount ? checkoutDiscount.amount : 0;
  const checkoutTotalAfterDiscount = selectedItemForPayment ? Math.max(0, checkoutSubtotal - checkoutDiscountAmt) : 0;
  const checkoutPaidSum = partialPayments.reduce((s, p) => s + p.amount, 0);
  const checkoutRestante = selectedItemForPayment ? Math.max(0, checkoutTotalAfterDiscount - checkoutPaidSum) : 0;

  const applyGrouping = (conceptsList: any[], groupAll: boolean) => {
    if (groupAll) {
      const totalSum = conceptsList.reduce((sum, c) => sum + (c.price * c.quantity), 0);
      const text = conceptsList.map(c => c.text.split(" | ").pop()).join(" + ");
      const appDate = selectedItemForPayment?.fecha || new Date().toLocaleDateString("es-ES");
      
      const clientObj = clients.find(c => c.id === selectedItemForPayment?.clientId);
      const clientName = clientObj ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim() : selectedItemForPayment?.cliente || "Cliente General";
      const clientDni = clientObj ? clientObj.dniNif || "-" : selectedItemForPayment?.dni || "-";

      return [{
        id: "grouped-all",
        text: `${appDate} | ${clientName} | ${clientDni} | ${text}`,
        quantity: 1,
        price: totalSum,
        subtotal: totalSum
      }];
    } else {
      const appDate = selectedItemForPayment?.fecha || new Date().toLocaleDateString("es-ES");
      const clientObj = clients.find(c => c.id === selectedItemForPayment?.clientId);
      const clientName = clientObj ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim() : selectedItemForPayment?.cliente || "Cliente General";
      const clientDni = clientObj ? clientObj.dniNif || "-" : selectedItemForPayment?.dni || "-";

      return checkoutItems.map(item => ({
        id: item.id,
        text: `${appDate} | ${clientName} | ${clientDni} | ${item.detalle}`,
        quantity: 1,
        price: item.price,
        subtotal: item.price,
      }));
    }
  };

  const renderEditClientDrawer = () => {
    if (!showEditClientModal) return null;

    return (
      <div className={styles.drawerBackdrop} onClick={() => setShowEditClientModal(false)}>
        <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>Editar contacto</h3>
            <button
              type="button"
              className={styles.btnEditClient}
              onClick={() => setShowEditClientModal(false)}
            >
              <Icons.Close size={20} />
            </button>
          </div>

          <div className={styles.drawerBody}>
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                className={styles.drawerInput}
                style={{ fontWeight: "bold" }}
                value={`${editClientForm.firstName} ${editClientForm.lastName} (Paciente)`}
                disabled
              />
            </div>

            {/* Identidad */}
            <div>
              <h4 className={styles.drawerSectionTitle}>Identidad</h4>
              <div className={styles.drawerGrid2}>
                <div className={styles.drawerField}>
                  <label>Nombre *</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    value={editClientForm.firstName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, firstName: e.target.value })}
                  />
                </div>
                <div className={styles.drawerField}>
                  <label>Apellidos</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    value={editClientForm.lastName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.drawerGrid2} style={{ marginTop: "12px" }}>
                <div className={styles.drawerField}>
                  <label>DNI/NIF *</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    value={editClientForm.dniNif}
                    onChange={(e) => setEditClientForm({ ...editClientForm, dniNif: e.target.value })}
                  />
                </div>
                <div className={styles.drawerField}>
                  <label>Fecha de nacimiento</label>
                  <input
                    type="date"
                    className={styles.drawerInput}
                    value={editClientForm.birthDate}
                    onChange={(e) => setEditClientForm({ ...editClientForm, birthDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h4 className={styles.drawerSectionTitle}>Dirección</h4>
              <div className={styles.drawerField} style={{ marginBottom: "12px" }}>
                <label>Calle *</label>
                <input
                  type="text"
                  className={styles.drawerInput}
                  value={editClientForm.address}
                  onChange={(e) => setEditClientForm({ ...editClientForm, address: e.target.value })}
                />
              </div>

              <div className={styles.drawerGrid2}>
                <div className={styles.drawerField}>
                  <label>Código postal *</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    value={editClientForm.postalCode}
                    onChange={(e) => setEditClientForm({ ...editClientForm, postalCode: e.target.value })}
                  />
                </div>
                <div className={styles.drawerField}>
                  <label>Ciudad / Municipio *</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    value={editClientForm.municipality}
                    onChange={(e) => setEditClientForm({ ...editClientForm, municipality: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.drawerField} style={{ marginTop: "12px" }}>
                <label>País</label>
                <select
                  className={styles.drawerInput}
                  value={editClientForm.country}
                  onChange={(e) => setEditClientForm({ ...editClientForm, country: e.target.value })}
                >
                  <option value="Spain (España)">🇪🇸 Spain (España)</option>
                  <option value="Portugal">🇵🇹 Portugal</option>
                  <option value="France">🇫🇷 France</option>
                  <option value="Italy">🇮🇹 Italy</option>
                  <option value="Germany">🇩🇪 Germany</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom</option>
                </select>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <h4 className={styles.drawerSectionTitle}>Contacto</h4>
              <div className={styles.drawerGrid2}>
                <div className={styles.drawerField}>
                  <label>Teléfono</label>
                  <input
                    type="text"
                    className={styles.drawerInput}
                    value={editClientForm.phone}
                    onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                  />
                </div>
                <div className={styles.drawerField}>
                  <label>Email</label>
                  <input
                    type="email"
                    className={styles.drawerInput}
                    value={editClientForm.email}
                    onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

          </div>

          <div className={styles.drawerFooter}>
            <button
              type="button"
              className={styles.btnTerceros}
              style={{ marginRight: "auto" }}
            >
              Facturar a terceros
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => setShowEditClientModal(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.btnSave}
              onClick={handleSaveClientChanges}
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInvoiceEditor = () => {
    if (!activeInvoiceEdit) return null;

    const totalSum = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    return (
      <div className={styles.invoiceEditContainer}>
        {/* Left main panel */}
        <div className={styles.invoiceEditMain}>
          {/* Back button and title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <button
              type="button"
              className={styles.btnCancel}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => setActiveInvoiceEdit(null)}
            >
              ‹ Volver atrás
            </button>
            {activeInvoiceEdit.isExisting ? (
              <div style={{ display: "flex", flex: 1, justifyContent: "center", marginRight: "100px" }}>
                <button
                  type="button"
                  className={styles.btnSave}
                  style={{ background: "#0d9488" }}
                  onClick={handleSaveExistingInvoice}
                >
                  Editar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setActiveInvoiceEdit(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.btnSave}
                  style={{ background: "#0284c7" }}
                  onClick={handleSaveCreatedInvoice}
                >
                  Crear factura
                </button>
              </div>
            )}
          </div>

          <div className={styles.invoiceHeaderCard}>
            {/* Clinic Info Area */}
            <div className={styles.invoiceHeaderLogoArea}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                {/* Logo: from fiscal profile or initials fallback */}
                {activeFiscalProfile?.logo ? (
                  <img
                    src={activeFiscalProfile.logo}
                    alt="Logo"
                    style={{ height: "60px", maxWidth: "120px", objectFit: "contain", borderRadius: "8px" }}
                  />
                ) : (
                  <div className={styles.invoiceLogoCircle}>
                    {(activeFiscalProfile?.comercialName || activeClinic?.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.companyMetaInfo}>
                  {/* Nombre del centro clínico */}
                  <h3>{activeClinic?.name || "Clínica"}</h3>
                  {/* Nombre Comercial y NIF del perfil fiscal */}
                  <p style={{ fontWeight: 600 }}>
                    {activeFiscalProfile?.comercialName
                      ? `${activeFiscalProfile.comercialName}${activeFiscalProfile.nif ? " · " + activeFiscalProfile.nif : ""}`
                      : (activeClinic?.cifNif || "")}
                  </p>
                  {/* Dirección del perfil fiscal */}
                  <p>
                    {activeFiscalProfile
                      ? [activeFiscalProfile.address, activeFiscalProfile.postalCode, activeFiscalProfile.municipality].filter(Boolean).join(", ")
                      : (activeClinic?.address || "")}
                  </p>
                </div>
              </div>
            </div>

            {/* Date and Invoice Number Fields */}
            <div className={styles.invoiceFieldsRow}>
              <div className={styles.invoiceFieldGroup}>
                <label>Fecha</label>
                <input
                  type="date"
                  className={styles.conceptInputText}
                  value={activeInvoiceEdit.date}
                  onChange={(e) => setActiveInvoiceEdit({ ...activeInvoiceEdit, date: e.target.value })}
                />
              </div>
              <div className={styles.invoiceFieldGroup}>
                <label>Nº de factura</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className={styles.conceptInputText}
                    style={{ width: "120px" }}
                    value={activeInvoiceEdit.series}
                    onChange={(e) => {
                      const newSeries = e.target.value as "NORMAL" | "SIMPLIFIED";
                      const nextNum = getNextInvoiceNumber(newSeries);
                      setActiveInvoiceEdit({ ...activeInvoiceEdit, series: newSeries, number: nextNum });
                    }}
                  >
                    <option value="NORMAL">Sin serie (INV-)</option>
                    <option value="SIMPLIFIED">Simplificada (SIMP-)</option>
                  </select>
                  <input
                    type="number"
                    className={styles.conceptInputText}
                    style={{ width: "80px", textAlign: "center" }}
                    value={activeInvoiceEdit.number}
                    onChange={(e) => setActiveInvoiceEdit({ ...activeInvoiceEdit, number: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* Dirigido A section */}
            <div className={styles.dirigidoSection}>
              <h4 className={styles.dirigidoTitle}>Dirigido a</h4>
              <div className={styles.dirigidoCard}>
                <div className={styles.dirigidoCardHeader}>
                  <strong>{activeInvoiceEdit.clientName}</strong>
                  <button
                    type="button"
                    className={styles.btnEditClient}
                    title="Editar contacto"
                    onClick={handleOpenEditClient}
                  >
                    <Icons.Edit size={16} />
                  </button>
                </div>
                <div className={styles.dirigidoCardBody}>
                  {activeInvoiceEdit.clientDni && activeInvoiceEdit.clientDni !== "-" && `${activeInvoiceEdit.clientDni}, `}
                  {activeInvoiceEdit.clientAddress}
                </div>
              </div>
            </div>

            {/* Concepts Table */}
            <div className={styles.conceptsTableWrapper}>
              <table className={styles.conceptsTable}>
                <thead>
                  <tr>
                    <th style={{ width: "60%" }}>Concepto</th>
                    <th style={{ width: "10%", textAlign: "center" }}>C</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Precio</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoiceEdit.concepts.map((c: any, index: number) => (
                    <tr key={c.id || index}>
                      <td>
                        <input
                          type="text"
                          className={styles.conceptInputText}
                          value={c.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...activeInvoiceEdit.concepts];
                            updated[index] = { ...c, text: val };
                            setActiveInvoiceEdit({ ...activeInvoiceEdit, concepts: updated });
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          className={styles.conceptInputNumber}
                          value={c.quantity}
                          min={1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const updated = [...activeInvoiceEdit.concepts];
                            updated[index] = { ...c, quantity: val, subtotal: val * c.price };
                            setActiveInvoiceEdit({ ...activeInvoiceEdit, concepts: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className={styles.conceptInputText}
                          style={{ textAlign: "right" }}
                          value={c.price}
                          step="0.01"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...activeInvoiceEdit.concepts];
                            updated[index] = { ...c, price: val, subtotal: c.quantity * val };
                            setActiveInvoiceEdit({ ...activeInvoiceEdit, concepts: updated });
                          }}
                        />
                      </td>
                      <td className={styles.conceptSubtotalVal}>
                        {(c.price * c.quantity).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal and Grand Total Summaries */}
            <div className={styles.invoiceTotalsArea}>
              <div className={styles.invoiceTotalsRow}>
                <span>Subtotal:</span>
                <span>{totalSum.toFixed(2)} €</span>
              </div>
              <div className={styles.invoiceTotalsRow + " " + styles.grand}>
                <span>TOTAL:</span>
                <span>{totalSum.toFixed(2)} €</span>
              </div>
            </div>

            {/* Observaciones */}
            <div className={styles.observacionesArea}>
              <label>Observaciones</label>
              <textarea
                className={styles.observacionesTextarea}
                placeholder="Puedes añadir anotaciones a la factura"
                value={activeInvoiceEdit.observations}
                onChange={(e) => setActiveInvoiceEdit({ ...activeInvoiceEdit, observations: e.target.value })}
              />
            </div>

            {/* Pie de factura: comentarios del perfil fiscal */}
            {activeFiscalProfile?.footerNotes && (
              <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                  {activeFiscalProfile.footerNotes}
                </p>
              </div>
            )}

            {/* Firma y Sello del perfil fiscal */}
            {(activeFiscalProfile?.firma || activeFiscalProfile?.sello) && (
              <div style={{ display: "flex", gap: "24px", marginTop: "20px", justifyContent: "flex-end" }}>
                {activeFiscalProfile?.firma && (
                  <div style={{ textAlign: "center" }}>
                    <img src={activeFiscalProfile.firma} alt="Firma" style={{ maxHeight: "60px", maxWidth: "140px", objectFit: "contain" }} />
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>Firma</p>
                  </div>
                )}
                {activeFiscalProfile?.sello && (
                  <div style={{ textAlign: "center" }}>
                    <img src={activeFiscalProfile.sello} alt="Sello" style={{ maxHeight: "60px", maxWidth: "140px", objectFit: "contain" }} />
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>Sello</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right controls column */}
        <div className={styles.invoiceEditSidebar}>
          {activeInvoiceEdit.isExisting && (
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => setShowOpcionesDropdown(!showOpcionesDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 16px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  color: "var(--text-color)"
                }}
              >
                <span>Opciones</span>
                <Icons.ChevronDown size={14} style={{ transform: showOpcionesDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>

              {showOpcionesDropdown && (
                <div className={styles.optionsDropdownMenu}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handlePrint();
                    }}
                    className={styles.dropdownOptionBtn}
                  >
                    <IconPrinter size={16} />
                    <span>Imprimir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handlePrintThermal();
                    }}
                    className={styles.dropdownOptionBtn}
                  >
                    <IconThermal size={16} />
                    <span>Imp. térmica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handleDownloadPDF();
                    }}
                    className={styles.dropdownOptionBtn}
                  >
                    <IconDownload size={16} />
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handleSendEmail();
                    }}
                    className={styles.dropdownOptionBtn}
                  >
                    <IconMail size={16} />
                    <span>Enviar via email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handleSendWhatsapp();
                    }}
                    className={styles.dropdownOptionBtn}
                  >
                    <IconWhatsapp size={16} />
                    <span>Enviar por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handleRectify();
                    }}
                    className={styles.dropdownOptionBtn}
                  >
                    <IconRectify size={16} />
                    <span>Rectificar</span>
                  </button>
                  <div style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0" }} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowOpcionesDropdown(false);
                      handleDeleteInvoice();
                    }}
                    className={styles.dropdownOptionBtn}
                    style={{ color: "#ef4444" }}
                  >
                    <IconTrash size={16} />
                    <span>Eliminar factura</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Agrupar Card */}
          <div className={styles.sidebarCard}>
            <h4 className={styles.sidebarCardTitle}>Agrupar</h4>
            <div
              className={styles.sidebarToggleRow}
              onClick={() => {
                const updatedVal = !activeInvoiceEdit.groupServices;
                setActiveInvoiceEdit({ ...activeInvoiceEdit, groupServices: updatedVal });
              }}
            >
              <span className={styles.sidebarToggleLabel}>Por Servicio y Cliente</span>
              <div className={`${styles.toggleSwitch} ${activeInvoiceEdit.groupServices ? styles.toggleSwitchActive : ""}`}>
                <div className={styles.toggleSwitchThumb} />
              </div>
            </div>
            <div
              className={styles.sidebarToggleRow}
              onClick={() => {
                const updatedVal = !activeInvoiceEdit.groupAll;
                const newConcepts = applyGrouping(activeInvoiceEdit.concepts, updatedVal);
                setActiveInvoiceEdit({
                  ...activeInvoiceEdit,
                  groupAll: updatedVal,
                  concepts: newConcepts
                });
              }}
            >
              <span className={styles.sidebarToggleLabel}>Agrupar Todo</span>
              <div className={`${styles.toggleSwitch} ${activeInvoiceEdit.groupAll ? styles.toggleSwitchActive : ""}`}>
                <div className={styles.toggleSwitchThumb} />
              </div>
            </div>
          </div>

          {/* Mostrar en concepto Card */}
          <div className={styles.sidebarCard}>
            <h4 className={styles.sidebarCardTitle}>Mostrar en concepto</h4>
            {["showFecha", "showCliente", "showNif", "showDescripcion"].map((field) => {
              const fieldLabels: Record<string, string> = {
                showFecha: "Fecha",
                showCliente: "Cliente",
                showNif: "NIF",
                showDescripcion: "Descripción"
              };
              const label = fieldLabels[field];
              const isChecked = activeInvoiceEdit[field];

              return (
                <div
                  key={field}
                  className={styles.sidebarToggleRow}
                  onClick={() => {
                    const updatedVal = !isChecked;
                    const updatedOpts = {
                      ...activeInvoiceEdit,
                      [field]: updatedVal
                    };
                    
                    const updatedConcepts = activeInvoiceEdit.concepts.map((c: any) => {
                      const origItem = checkoutItems.find(i => i.id === c.id);
                      const itemDesc = origItem ? origItem.detalle : c.text.split(" | ").pop();
                      const newText = regenerateConceptText(itemDesc, updatedOpts);
                      return { ...c, text: newText };
                    });

                    setActiveInvoiceEdit({
                      ...updatedOpts,
                      concepts: updatedConcepts
                    });
                  }}
                >
                  <span className={styles.sidebarToggleLabel}>{label}</span>
                  <div className={`${styles.toggleSwitch} ${isChecked ? styles.toggleSwitchActive : ""}`}>
                    <div className={styles.toggleSwitchThumb} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Estado de la Factura Card */}
          <div className={styles.sidebarCard} style={{ position: "relative" }}>
            <h4 className={styles.sidebarCardTitle}>Estado de la Factura</h4>
            <div className={styles.invoiceStateRow}>
              <span className={`${styles.statePill} ${
                activeInvoiceEdit.estado === "PAGADO" ? styles.pagado :
                activeInvoiceEdit.estado === "PENDIENTE" ? styles.nopagado : styles.parcial
              }`}>
                {activeInvoiceEdit.estado === "PAGADO" ? "Pagado" :
                 activeInvoiceEdit.estado === "PENDIENTE" ? "No pagado" : "Pago parcial"}
              </span>
              <button
                type="button"
                className={styles.btnChangeState}
                onClick={() => setShowChangeStateDropdown(!showChangeStateDropdown)}
              >
                Cambiar
              </button>
            </div>

            {showChangeStateDropdown && (
              <div className={styles.dropdownChangeStateMenu} style={{ right: "20px", top: "70px" }}>
                {[
                  { key: "PAGADO", label: "Pagado" },
                  { key: "PENDIENTE", label: "No pagado" },
                  { key: "PAGO_PARCIAL", label: "Pago parcial" }
                ].map((st) => (
                  <div
                    key={st.key}
                    className={styles.dropdownChangeStateItem}
                    onClick={() => {
                      setActiveInvoiceEdit({ ...activeInvoiceEdit, estado: st.key });
                      setShowChangeStateDropdown(false);
                    }}
                  >
                    {st.label}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  if (onlyCobrar) {
    return (
      <div className={styles.container}>
        <div className="glass" style={{ padding: "32px", borderRadius: "12px", maxWidth: "600px", margin: "20px auto" }}>
          <div className={styles.posDrawerHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "20px" }}>
            <h2>Registrar Nueva Venta (POS)</h2>
          </div>
          {renderPosFormContent()}
        </div>
      </div>
    );
  }

  if (activeInvoiceEdit) {
    return (
      <div className={styles.container}>
        {renderInvoiceEditor()}
        {showEditClientModal && renderEditClientDrawer()}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {selectedItemForPayment ? (
        <div className={styles.checkoutContainer}>
          {/* Checkout Top Bar */}
          <div className={styles.checkoutHeader}>
            <button
              type="button"
              className={styles.btnBackToSales}
              onClick={() => {
                if (selectedItemForPayment.estado === "PAGADO") {
                  handleSave(true);
                } else {
                  setSelectedItemForPayment(null);
                }
              }}
            >
              ‹ Volver
            </button>
            <div className={styles.checkoutHeaderActions}>
              <div className={styles.dropdownWrapper} style={{ position: "relative" }}>
                <button 
                  type="button" 
                  className={styles.btnCreateInvoice}
                  onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                >
                  {invoiceRequested === "NORMAL" ? "Factura Completa ✓ ▾" : invoiceRequested === "SIMPLIFIED" ? "Factura Simplificada ✓ ▾" : "Crear factura ▾"}
                </button>
                {showInvoiceDropdown && (
                  <div className="invoice-dropdown-menu" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", zIndex: 999, minWidth: "180px" }}>
                    <div 
                      className="invoice-dropdown-item" 
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)" }}
                      onClick={() => {
                        setShowInvoiceDropdown(false);
                        handleOpenInvoiceEditor("NORMAL");
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      Crear factura
                    </div>
                    <div 
                      className="invoice-dropdown-item" 
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", borderBottom: invoiceRequested !== "NONE" ? "1px solid var(--border-color)" : "none" }}
                      onClick={() => {
                        setShowInvoiceDropdown(false);
                        handleOpenInvoiceEditor("SIMPLIFIED");
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      Crear factura simplificada
                    </div>
                    {invoiceRequested !== "NONE" && (
                      <div 
                        className="invoice-dropdown-item" 
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", color: "var(--danger)", fontWeight: 500 }}
                        onClick={() => {
                          setInvoiceRequested("NONE");
                          setShowInvoiceDropdown(false);
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--danger-light, #fee2e2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Quitar factura
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.btnSaveCheckout}
                onClick={() => handleSave(false)}
              >
                Guardar
              </button>
            </div>
          </div>

          {/* Checkout Columns Body */}
          <div className={styles.checkoutBody}>
            {/* Column 1: Client & Articles info */}
            <div className={styles.checkoutCol}>
              <div className={styles.checkoutCard}>
                <div className={styles.clientAvatarRow}>
                  <div className={styles.clientAvatarInitials}>
                    {selectedItemForPayment.cliente.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.clientInfoBlock}>
                    <h3 className={styles.clientNameTitle}>
                      {selectedItemForPayment.clientId ? (
                        <Link href={`/dashboard/contacts/${selectedItemForPayment.clientId}`} className={styles.clientLink}>
                          {selectedItemForPayment.cliente}
                        </Link>
                      ) : (
                        selectedItemForPayment.cliente
                      )}
                    </h3>
                    <span className={styles.clientNumberLabel}>
                      {selectedItemForPayment.clientNumber}
                    </span>
                  </div>
                </div>

                <div className={styles.articlesSectionWrapper}>
                  <h4 className={styles.sectionHeaderTitle}>Artículo(s)</h4>
                  {checkoutItems.map((item) => (
                    <div key={item.id} className={styles.articleItemCardActive} style={{ marginBottom: "8px" }}>
                      <div className={styles.articleActiveLeftBar} />
                      <div className={styles.articleActiveContent}>
                        <div className={styles.articleActiveHeaderRow}>
                          <strong className={styles.articleActiveName}>{item.detalle}</strong>
                          <span className={styles.articleActivePrice}>{item.price.toFixed(2)} €</span>
                        </div>
                        <span className={styles.articleActiveMeta}>
                          {item.hora !== "-" ? item.hora.split(" - ")[0] : "1 hora"} - {item.empleado}
                        </span>
                      </div>
                      <div className={styles.articleActiveIcons}>
                        <button
                          type="button"
                          className={styles.iconMiniBtn}
                          title="Quitar servicio de la venta"
                          onClick={() => {
                            if (confirm("¿Quitar este servicio de la venta?")) {
                              if (checkoutItems.length === 1) {
                                setSelectedItemForPayment(null);
                              } else {
                                setCheckoutItems(checkoutItems.filter((i) => i.id !== item.id));
                              }
                            }
                          }}
                        >
                          <Icons.Trash size={13} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconMiniBtn}
                          title="Editar Servicio"
                          onClick={() => {
                            const clientObj = clients.find((c) => c.id === item.clientId);
                            const isSelfEmployed = clientObj?.isSelfEmployed || false;
                            setEditServiceName(item.detalle);
                            setEditingCheckoutItemId(item.id);
                            if (isSelfEmployed) {
                              setEditServicePrice(item.price);
                              setEditServiceIva(0);
                            } else {
                              setEditServicePrice(item.price / (1 + checkoutIva / 100));
                              setEditServiceIva(checkoutIva);
                            }
                            setEditServiceTotal(item.price);
                            setShowEditServiceModal(true);
                          }}
                        >
                          <Icons.Edit size={13} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconMiniBtn}
                          title="Añadir Descuento"
                          onClick={() => {
                            setDiscountModalValue("");
                            setDiscountModalType("percentage");
                            setShowDiscountModal(true);
                          }}
                        >
                          <Icons.DollarCircle size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className={styles.btnAddArticleCheckout}
                    onClick={() => setShowAddArticleModal(true)}
                  >
                    Añadir artículo
                  </button>

                  {/* Pasado Section */}
                  {(() => {
                    const clientAppts = appointments.filter((a: any) => {
                      if (!selectedItemForPayment.clientId) return false;
                      return (
                        a.clientId === selectedItemForPayment.clientId &&
                        a.status !== "COMPLETED" &&
                        a.status !== "CANCELLED"
                      );
                    });
                    const now = new Date();
                    const pastAppts = clientAppts.filter((a: any) => new Date(a.end) < now);
                    const futureAppts = clientAppts.filter((a: any) => new Date(a.start) >= now);

                    return (
                      <>
                        <div
                          className={styles.collapsibleRow}
                          onClick={() => setShowPastAppts(!showPastAppts)}
                        >
                          <span>Pasado ({pastAppts.length})</span>
                          <span>{showPastAppts ? "▴" : "▾"}</span>
                        </div>
                        {showPastAppts && pastAppts.length > 0 && (
                          <div className={styles.apptHistoryList}>
                            {pastAppts.map((appt: any) => (
                              <div key={appt.id} className={styles.apptHistoryItem}>
                                <div className={styles.apptHistoryInfo}>
                                  <span className={styles.apptHistoryName}>
                                    {appt.service?.name || "Tratamiento"}
                                  </span>
                                  <span className={styles.apptHistoryPrice}>
                                    {(appt.service?.price || 0).toFixed(2)} €
                                  </span>
                                </div>
                                <div className={styles.apptHistoryBottom}>
                                  <span className={styles.apptHistoryDate}>
                                    {new Date(appt.start).toLocaleDateString("es-ES")}
                                  </span>
                                  <button
                                    type="button"
                                    className={styles.btnCobrarSmall}
                                    onClick={() => {
                                      const appDate = new Date(appt.start);
                                      setSelectedItemForPayment({
                                        id: `db-app-${appt.id}`,
                                        refMov: `#${appt.id.substring(0, 4).toUpperCase()}`,
                                        nuV: "-",
                                        fecha: appDate.toLocaleDateString("es-ES"),
                                        fechaRaw: appDate,
                                        hora: `${String(appDate.getHours()).padStart(2, "0")}:${String(appDate.getMinutes()).padStart(2, "0")}`,
                                        tipo: "Servicio",
                                        detalle: appt.service?.name || "Tratamiento",
                                        clientNumber: selectedItemForPayment.clientNumber,
                                        cliente: selectedItemForPayment.cliente,
                                        clientId: selectedItemForPayment.clientId,
                                        dni: selectedItemForPayment.dni,
                                        empleado: appt.user?.name || "Especialista",
                                        consulta: activeClinic?.name || "Clifav Central",
                                        estado: appt.status === "COMPLETED" ? "PAGADO" : "PENDIENTE",
                                        metodoPago: appt.status === "COMPLETED" ? "Tarjeta" : "-",
                                        fechaPago: appt.status === "COMPLETED" ? appDate.toLocaleDateString("es-ES") : "-",
                                        price: appt.service?.price || 0,
                                      });
                                    }}
                                  >
                                    Cobrar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          className={styles.collapsibleRow}
                          onClick={() => setShowFutureAppts(!showFutureAppts)}
                        >
                          <span>Futuro ({futureAppts.length})</span>
                          <span>{showFutureAppts ? "▴" : "▾"}</span>
                        </div>
                        {showFutureAppts && futureAppts.length > 0 && (
                          <div className={styles.apptHistoryList}>
                            {futureAppts.map((appt: any) => (
                              <div key={appt.id} className={styles.apptHistoryItem}>
                                <div className={styles.apptHistoryInfo}>
                                  <span className={styles.apptHistoryName}>
                                    {appt.service?.name || "Tratamiento"}
                                  </span>
                                  <span className={styles.apptHistoryPrice}>
                                    {(appt.service?.price || 0).toFixed(2)} €
                                  </span>
                                </div>
                                <div className={styles.apptHistoryBottom}>
                                  <span className={styles.apptHistoryDate}>
                                    {new Date(appt.start).toLocaleDateString("es-ES")}
                                  </span>
                                  <button
                                    type="button"
                                    className={styles.btnCobrarSmall}
                                    onClick={() => {
                                      const appDate = new Date(appt.start);
                                      setSelectedItemForPayment({
                                        id: `db-app-${appt.id}`,
                                        refMov: `#${appt.id.substring(0, 4).toUpperCase()}`,
                                        nuV: "-",
                                        fecha: appDate.toLocaleDateString("es-ES"),
                                        fechaRaw: appDate,
                                        hora: `${String(appDate.getHours()).padStart(2, "0")}:${String(appDate.getMinutes()).padStart(2, "0")}`,
                                        tipo: "Servicio",
                                        detalle: appt.service?.name || "Tratamiento",
                                        clientNumber: selectedItemForPayment.clientNumber,
                                        cliente: selectedItemForPayment.cliente,
                                        clientId: selectedItemForPayment.clientId,
                                        dni: selectedItemForPayment.dni,
                                        empleado: appt.user?.name || "Especialista",
                                        consulta: activeClinic?.name || "Clifav Central",
                                        estado: appt.status === "COMPLETED" ? "PAGADO" : "PENDIENTE",
                                        metodoPago: appt.status === "COMPLETED" ? "Tarjeta" : "-",
                                        fechaPago: appt.status === "COMPLETED" ? appDate.toLocaleDateString("es-ES") : "-",
                                        price: appt.service?.price || 0,
                                      });
                                    }}
                                  >
                                    Cobrar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Column 2: Importe totals */}
            <div className={styles.checkoutCol}>
              <div className={styles.checkoutCard}>
                <h3 className={styles.clientNameTitle} style={{ marginBottom: "16px" }}>Importe</h3>
                
                {(() => {
                  const clientObj = clients.find((c) => c.id === selectedItemForPayment.clientId);
                  const isSelfEmployed = clientObj?.isSelfEmployed || false;

                  const subtotal = checkoutSubtotal;
                  const discountAmt = checkoutDiscountAmt;
                  const totalAfterDiscount = checkoutTotalAfterDiscount;
                  const paidSum = checkoutPaidSum;
                  const restante = checkoutRestante;
                  // Tax calculations
                  let taxLabel = "IVA";
                  let taxAmt = 0;
                  let calculatedSubtotal = totalAfterDiscount;

                  if (isSelfEmployed) {
                    taxLabel = "IRPF";
                    taxAmt = 0;
                    calculatedSubtotal = totalAfterDiscount;
                  } else {
                    calculatedSubtotal = totalAfterDiscount / (1 + checkoutIva / 100);
                    taxAmt = totalAfterDiscount - calculatedSubtotal;
                  }

                  return (
                    <>
                      <div className={styles.totalItemRow}>
                        <span>Subtotal</span>
                        <span>{calculatedSubtotal.toFixed(2)} €</span>
                      </div>

                      {checkoutDiscount && (
                        <div className={styles.totalItemRow}>
                          <span>Descuento</span>
                          <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}>
                            - {discountAmt.toFixed(2)} €
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Eliminar descuento"
                              style={{ padding: 0, height: "auto", width: "auto", color: "var(--danger)" }}
                              onClick={() => setCheckoutDiscount(null)}
                            >
                              <Icons.Trash size={12} />
                            </button>
                          </span>
                        </div>
                      )}

                      <div className={styles.totalItemRow}>
                        <span>{taxLabel}</span>
                        {isEditingTaxInline && !isSelfEmployed ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="number"
                              className="input"
                              value={tempTaxRateInput}
                              onChange={(e) => setTempTaxRateInput(e.target.value)}
                              style={{ width: "60px", padding: "2px 6px", height: "28px", fontSize: "13px" }}
                            />
                            <span>%</span>
                            <button
                              type="button"
                              className={styles.btnCobrarSmall}
                              style={{ padding: "2px 8px", height: "28px", fontSize: "11px" }}
                              onClick={() => {
                                const newTax = parseFloat(tempTaxRateInput) || 0;
                                setCheckoutIva(newTax);
                                setIsEditingTaxInline(false);
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.btnBackToSales}
                              style={{ padding: "2px 8px", height: "28px", fontSize: "11px", margin: 0 }}
                              onClick={() => setIsEditingTaxInline(false)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <span className={styles.taxValueRow}>
                            {isSelfEmployed ? "0% / 0,00 €" : `${checkoutIva}% / ${taxAmt.toFixed(2)} €`}
                            {!isSelfEmployed && (
                              <Icons.Edit
                                size={12}
                                style={{ marginLeft: "6px", cursor: "pointer", color: "var(--text-muted)" }}
                                onClick={() => {
                                  setTempTaxRateInput(checkoutIva.toString());
                                  setIsEditingTaxInline(true);
                                }}
                              />
                            )}
                          </span>
                        )}
                      </div>

                      <div className={styles.totalItemRow} style={{ borderTop: "1.5px solid var(--border-color)", paddingTop: "12px", marginTop: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>Total</strong>
                        <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{totalAfterDiscount.toFixed(2)} €</strong>
                      </div>

                      {/* Partial payment entries */}
                      {partialPayments.map((pp) => (
                        <div key={pp.id} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px 0", borderBottom: "1px dashed var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-primary)" }}>
                            <span>{pp.voucherName ? `Bono: "${pp.voucherName}"` : pp.method} ({pp.date})</span>
                            <span style={{ fontWeight: 600 }}>{pp.amount.toFixed(2)} €</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Ver comprobante"
                              onClick={() => {
                                const singlePaySale = {
                                  invoiceNumber: selectedItemForPayment.nuV && selectedItemForPayment.nuV !== "-" 
                                    ? selectedItemForPayment.nuV 
                                    : `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                  createdAt: new Date(),
                                  total: pp.amount,
                                  discount: 0,
                                  paymentMethod: pp.method === "Tarjeta" ? "CARD" : pp.method === "Efectivo" ? "CASH" : pp.method === "Transferencia" ? "TRANSFER" : pp.method,
                                  itemsJson: JSON.stringify([{
                                    name: selectedItemForPayment.detalle,
                                    price: selectedItemForPayment.price,
                                    quantity: 1
                                  }]),
                                  client: {
                                    firstName: selectedItemForPayment.cliente?.split(" ")[0] || "Cliente",
                                    lastName: selectedItemForPayment.cliente?.split(" ").slice(1).join(" ") || "General",
                                    dniNif: selectedItemForPayment.dni || "-",
                                    phone: "",
                                  }
                                };
                                printReceipt(singlePaySale, activeClinic);
                              }}
                            >
                              <Icons.Eye size={11} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Imprimir comprobante"
                              onClick={() => {
                                const singlePaySale = {
                                  invoiceNumber: selectedItemForPayment.nuV && selectedItemForPayment.nuV !== "-" 
                                    ? selectedItemForPayment.nuV 
                                    : `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                  createdAt: new Date(),
                                  total: pp.amount,
                                  discount: 0,
                                  paymentMethod: pp.method === "Tarjeta" ? "CARD" : pp.method === "Efectivo" ? "CASH" : pp.method === "Transferencia" ? "TRANSFER" : pp.method,
                                  itemsJson: JSON.stringify([{
                                    name: selectedItemForPayment.detalle,
                                    price: selectedItemForPayment.price,
                                    quantity: 1
                                  }]),
                                  client: {
                                    firstName: selectedItemForPayment.cliente?.split(" ")[0] || "Cliente",
                                    lastName: selectedItemForPayment.cliente?.split(" ").slice(1).join(" ") || "General",
                                    dniNif: selectedItemForPayment.dni || "-",
                                    phone: "",
                                  }
                                };
                                printReceipt(singlePaySale, activeClinic);
                              }}
                            >
                              <Icons.Download size={11} />
                            </button>
                            {!pp.isSaved && (
                              <button
                                type="button"
                                className={styles.iconMiniBtn}
                                title="Revertir"
                                onClick={() => {
                                  if (confirm("¿Revertir este pago?")) {
                                    setPartialPayments(partialPayments.filter(p => p.id !== pp.id));
                                    const newRestante = restante + pp.amount;
                                    setCobrarAmount(newRestante.toFixed(2));
                                  }
                                }}
                              >
                                <Icons.Close size={11} />
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Eliminar pago"
                              style={{ color: "var(--danger)" }}
                              onClick={async () => {
                                if (confirm("¿Eliminar este pago?")) {
                                  if (pp.isSaved) {
                                    try {
                                      const res = await fetch(`/api/sales?id=${pp.id}`, {
                                        method: "DELETE"
                                      });
                                      if (!res.ok) {
                                        console.error("Failed to delete sale from database:", await res.text());
                                        alert("Error al eliminar el pago de la base de datos.");
                                        return;
                                      }
                                    } catch (err) {
                                      console.error("Error deleting sale:", err);
                                      alert("Error al eliminar el pago de la base de datos.");
                                      return;
                                    }
                                  }
                                  
                                  setPartialPayments(partialPayments.filter(p => p.id !== pp.id));
                                  const newRestante = restante + pp.amount;
                                  setCobrarAmount(newRestante.toFixed(2));

                                  if (pp.isSaved) {
                                    // If we deleted a saved payment, make sure the appointment goes back from completed to its original status or pending
                                    for (const item of checkoutItems) {
                                      if (item.id.startsWith("db-app-")) {
                                        const appId = item.id.replace("db-app-", "");
                                        const appObj = appointments.find(a => a.id === appId);
                                        const originalStatus = appObj ? appObj.status : "PENDING";
                                        try {
                                          await fetch("/api/appointments", {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              id: appId,
                                              status: originalStatus === "COMPLETED" ? "PENDING" : originalStatus,
                                            }),
                                          });
                                        } catch (err) {
                                          console.error("Error resetting appointment status:", err);
                                        }
                                      }
                                    }
                                    fetchSalesData();
                                  }
                                }
                              }}
                            >
                              <Icons.Trash size={11} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {selectedItemForPayment.estado === "PAGADO" && partialPayments.length === 0 && (
                        <div key="legacy-paid" style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px 0", borderBottom: "1px dashed var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-primary)" }}>
                            <span>{selectedItemForPayment.metodoPago} ({selectedItemForPayment.fechaPago})</span>
                            <span style={{ fontWeight: 600 }}>{totalAfterDiscount.toFixed(2)} €</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Ver detalles"
                              onClick={() => alert(`Detalles del pago:\nMétodo: ${selectedItemForPayment.metodoPago}\nMonto: ${totalAfterDiscount.toFixed(2)} €\nFecha: ${selectedItemForPayment.fechaPago}`)}
                            >
                              <Icons.Eye size={11} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Revertir"
                              onClick={() => {
                                if (confirm("¿Revertir este pago?")) {
                                  const newOverrides = { ...paymentOverrides };
                                  for (const item of checkoutItems) {
                                    newOverrides[item.id] = { estado: "PENDIENTE", metodoPago: "-", fechaPago: "-" };
                                  }
                                  setPaymentOverrides(newOverrides);
                                  setSelectedItemForPayment({ ...selectedItemForPayment, estado: "PENDIENTE", metodoPago: "-", fechaPago: "-" });
                                  setCobrarAmount(totalAfterDiscount.toFixed(2));
                                }
                              }}
                            >
                              <Icons.Close size={11} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Eliminar pago"
                              style={{ color: "var(--danger)" }}
                              onClick={() => {
                                if (confirm("¿Eliminar este pago?")) {
                                  const newOverrides = { ...paymentOverrides };
                                  for (const item of checkoutItems) {
                                    newOverrides[item.id] = { estado: "PENDIENTE", metodoPago: "-", fechaPago: "-" };
                                  }
                                  setPaymentOverrides(newOverrides);
                                  setSelectedItemForPayment({ ...selectedItemForPayment, estado: "PENDIENTE", metodoPago: "-", fechaPago: "-" });
                                  setCobrarAmount(totalAfterDiscount.toFixed(2));
                                }
                              }}
                            >
                              <Icons.Trash size={11} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={styles.totalItemRow} style={{ marginTop: "12px" }}>
                        <span>Restante</span>
                        <span style={{ color: restante > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: 700 }}>
                          {restante.toFixed(2)} €
                        </span>
                      </div>

                      {selectedItemForPayment.estado === "PAGADO" ? (
                        <button type="button" className={styles.btnAddArticleCheckout} style={{ marginTop: "16px" }}>
                          Crear devolución
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.btnAddArticleCheckout}
                          style={{ marginTop: "16px" }}
                          onClick={() => {
                            setDiscountModalValue("");
                            setDiscountModalType("percentage");
                            setShowDiscountModal(true);
                          }}
                        >
                          Crear descuento
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Column 3: Payment actions */}
            <div className={styles.checkoutCol}>
              {(() => {
                const subtotal = checkoutSubtotal;
                const discountAmt = checkoutDiscountAmt;
                const totalAfterDiscount = checkoutTotalAfterDiscount;
                const paidSum = checkoutPaidSum;
                const restante = checkoutRestante;
                const isFullyPaid = restante <= 0 && (partialPayments.length > 0 || selectedItemForPayment.estado === "PAGADO");

                if (selectedItemForPayment.estado === "PAGADO") {
                  // Paid view (matches Image 2)
                  return (
                    <div className={styles.successBannerCard}>
                      <p className={styles.successTextBanner}>
                        El pago se ha añadido con éxito. Si así lo deseas, puedes generar una factura o enviar un recibo al cliente.
                      </p>
                      <button
                        type="button"
                        className={styles.btnDeletePaymentSuccess}
                        onClick={() => {
                          const newOverrides = { ...paymentOverrides };
                          for (const item of checkoutItems) {
                            newOverrides[item.id] = { estado: "PENDIENTE", metodoPago: "-", fechaPago: "-" };
                          }
                          setPaymentOverrides(newOverrides);
                          setSelectedItemForPayment({ ...selectedItemForPayment, estado: "PENDIENTE", metodoPago: "-", fechaPago: "-" });
                          setPartialPayments([]); // Clear partial payments list to start over
                        }}
                      >
                        Eliminar pago
                      </button>
                      <button
                        type="button"
                        className={styles.btnActionCobrar}
                        style={{ marginTop: "12px", background: "var(--success)", borderColor: "var(--success)", width: "100%" }}
                        onClick={handlePrintReceiptForCurrent}
                      >
                        <Icons.Download size={16} style={{ marginRight: "6px" }} />
                        Imprimir Comprobante
                      </button>
                      <button
                        type="button"
                        className={styles.btnBackToPaymentsOutline}
                        onClick={() => handleSave(true)}
                      >
                        Volver a pagos
                      </button>
                    </div>
                  );
                }

                if (isFullyPaid) {
                  // Fully paid via partial payments — show completion options
                  return (
                    <div className={styles.successBannerCard}>
                      <p className={styles.successTextBanner}>
                        El pago se ha añadido con éxito. Si así lo deseas, puedes generar una factura o enviar un recibo al cliente.
                      </p>
                      <button
                        type="button"
                        className={styles.btnActionCobrar}
                        onClick={async () => {
                          await persistUnsavedPayments("NONE");

                          // Update appointment status to COMPLETED
                          for (const item of checkoutItems) {
                            if (item.id.startsWith("db-app-")) {
                              const appId = item.id.replace("db-app-", "");
                              try {
                                await fetch("/api/appointments", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: appId, status: "COMPLETED" }),
                                });
                              } catch (err) {
                                console.error("Error updating appointment status:", err);
                              }
                            }
                          }

                          await fetchSalesData();

                          const dateStr = new Date().toLocaleDateString("es-ES");
                          const methods = [...new Set(partialPayments.map(p => p.method))].join(", ");
                          const newOverrides = { ...paymentOverrides };
                          for (const item of checkoutItems) {
                            newOverrides[item.id] = { estado: "PAGADO", metodoPago: methods, fechaPago: dateStr };
                          }
                          setPaymentOverrides(newOverrides);
                          setSelectedItemForPayment({ ...selectedItemForPayment, estado: "PAGADO", metodoPago: methods, fechaPago: dateStr });
                        }}
                      >
                        Cobrar
                      </button>
                      <button 
                        type="button" 
                        className={styles.btnBackToPaymentsOutline} 
                        style={{ color: "var(--accent)" }}
                        onClick={async () => {
                          await persistUnsavedPayments("NORMAL");

                          // Update appointment status to COMPLETED
                          for (const item of checkoutItems) {
                            if (item.id.startsWith("db-app-")) {
                              const appId = item.id.replace("db-app-", "");
                              try {
                                await fetch("/api/appointments", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: appId, status: "COMPLETED" }),
                                });
                              } catch (err) {
                                console.error("Error updating appointment status:", err);
                              }
                            }
                          }

                          await fetchSalesData();

                          const dateStr = new Date().toLocaleDateString("es-ES");
                          const methods = [...new Set(partialPayments.map(p => p.method))].join(", ");
                          const newOverrides = { ...paymentOverrides };
                          for (const item of checkoutItems) {
                            newOverrides[item.id] = { estado: "PAGADO", metodoPago: methods, fechaPago: dateStr };
                          }
                          setPaymentOverrides(newOverrides);
                          setSelectedItemForPayment({ ...selectedItemForPayment, estado: "PAGADO", metodoPago: methods, fechaPago: dateStr });
                        }}
                      >
                        Completar pago y facturar
                      </button>
                      <button 
                        type="button" 
                        className={styles.btnBackToPaymentsOutline} 
                        style={{ color: "var(--accent)" }}
                        onClick={async () => {
                          await persistUnsavedPayments("SIMPLIFIED");

                          // Update appointment status to COMPLETED
                          for (const item of checkoutItems) {
                            if (item.id.startsWith("db-app-")) {
                              const appId = item.id.replace("db-app-", "");
                              try {
                                await fetch("/api/appointments", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: appId, status: "COMPLETED" }),
                                });
                              } catch (err) {
                                console.error("Error updating appointment status:", err);
                              }
                            }
                          }

                          await fetchSalesData();

                          const dateStr = new Date().toLocaleDateString("es-ES");
                          const methods = [...new Set(partialPayments.map(p => p.method))].join(", ");
                          const newOverrides = { ...paymentOverrides };
                          for (const item of checkoutItems) {
                            newOverrides[item.id] = { estado: "PAGADO", metodoPago: methods, fechaPago: dateStr };
                          }
                          setPaymentOverrides(newOverrides);
                          setSelectedItemForPayment({ ...selectedItemForPayment, estado: "PAGADO", metodoPago: methods, fechaPago: dateStr });
                        }}
                      >
                        Completar pago y facturar simple
                      </button>
                      <button
                        type="button"
                        className={styles.btnBackToPaymentsOutline}
                        onClick={() => setSelectedItemForPayment(null)}
                      >
                        Volver a pagos
                      </button>
                    </div>
                  );
                }

                // Not fully paid — show payment method selection
                return (
                  <div className={styles.checkoutCard}>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" style={{ color: "var(--text-muted)", fontSize: "12px" }}>Fecha</label>
                      <div style={{ display: "flex", alignItems: "center", background: "var(--bg-input)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", cursor: "pointer" }}>
                        <Icons.Calendar size={16} style={{ marginRight: "8px", color: "var(--text-secondary)" }} />
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>{new Date().toLocaleDateString("es-ES")}</span>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Cobrar</label>
                      <div className={styles.cobrarInputWrapper}>
                        <input
                          type="number"
                          className="input"
                          value={cobrarAmount}
                          onChange={(e) => setCobrarAmount(e.target.value)}
                          placeholder={restante.toFixed(2)}
                          style={{ fontWeight: 700, fontSize: "16px", paddingRight: "30px" }}
                        />
                        <span className={styles.currencySymbol}>€</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-12px", marginBottom: "12px" }}>
                      <Icons.Edit
                        size={16}
                        style={{ cursor: "pointer", color: "var(--accent)" }}
                        onClick={() => {
                          setTempPaymentMethods([...paymentMethods]);
                          setSearchMethodQuery("");
                          setIsCreatingNewMethod(false);
                          setShowPaymentMethodsDrawer(true);
                        }}
                      />
                    </div>

                    <div className={styles.methodGridContainer}>
                      {showBonoPaymentOption && (
                        <button
                          type="button"
                          className={`${styles.methodBtn} ${styles.methodBtnBono}`}
                          onClick={() => {
                            if (selectedClientVouchers.length === 0) {
                              alert("Este cliente no tiene ningún bono activo.");
                              return;
                            }
                            setSelectedCheckoutVoucherId("");
                            setShowVoucherSelectionModal(true);
                          }}
                        >
                          BONO
                        </button>
                      )}

                      {clientBudgetsWithBalance.length > 0 && (
                        <button
                          type="button"
                          className={styles.methodBtn}
                          style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                          onClick={() => {
                            setSelectedCheckoutBudgetId("");
                            setShowBudgetSelectionModal(true);
                          }}
                        >
                          PRESUPUESTO
                        </button>
                      )}

                      
                      {/* Render all enabled payment methods except "Otro" */}
                      {paymentMethods
                        .filter(m => m.enabled && m.key !== "Otro")
                        .map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            className={`${styles.methodBtn} ${m.className || styles.methodBtnCustom}`}
                            onClick={() => {
                              const amt = parseFloat(cobrarAmount) || restante;
                              const actualAmt = Math.min(amt, restante);
                              if (actualAmt <= 0) return;
                              setPartialPayments([
                                ...partialPayments,
                                { id: `pp-${Date.now()}`, method: m.key, amount: actualAmt, date: new Date().toLocaleDateString("es-ES") }
                              ]);
                              const newRestante = restante - actualAmt;
                              setCobrarAmount(newRestante > 0 ? newRestante.toFixed(2) : "");
                            }}
                          >
                            {m.label}
                          </button>
                        ))}

                      {/* Render "Otro" if enabled, spanning columns conditionally */}
                      {paymentMethods.find(m => m.key === "Otro" && m.enabled) && (() => {
                        const otherActiveCount = paymentMethods.filter(m => m.enabled && m.key !== "Otro").length + (showBonoPaymentOption ? 1 : 0);
                        const isOtherCountOdd = otherActiveCount % 2 !== 0;
                        return (
                          <button
                            type="button"
                            className={styles.methodBtnOtro}
                            style={{
                              gridColumn: isOtherCountOdd ? "span 1" : "span 2",
                              margin: 0,
                              width: "100%",
                            }}
                            onClick={() => {
                              const amt = parseFloat(cobrarAmount) || restante;
                              const actualAmt = Math.min(amt, restante);
                              if (actualAmt <= 0) return;
                              setPartialPayments([
                                ...partialPayments,
                                { id: `pp-${Date.now()}`, method: "Otro", amount: actualAmt, date: new Date().toLocaleDateString("es-ES") }
                              ]);
                              const newRestante = restante - actualAmt;
                              setCobrarAmount(newRestante > 0 ? newRestante.toFixed(2) : "");
                            }}
                          >
                            OTRO
                          </button>
                        );
                      })()}
                    </div>

                    <button
                      type="button"
                      className={styles.btnActionCobrar}
                      onClick={() => {
                        const amt = parseFloat(cobrarAmount) || restante;
                        const actualAmt = Math.min(amt, restante);
                        if (actualAmt <= 0) return;
                        const method = "Efectivo";
                        setPartialPayments([
                          ...partialPayments,
                          { id: `pp-${Date.now()}`, method, amount: actualAmt, date: new Date().toLocaleDateString("es-ES") }
                        ]);
                        const newRestante = restante - actualAmt;
                        setCobrarAmount(newRestante > 0 ? newRestante.toFixed(2) : "");
                      }}
                    >
                      COBRAR
                    </button>
                  </div>
                );
              })()}
          </div>
        </div>

          {/* Edit Service Modal */}
          {showEditServiceModal && (
            <div className={styles.modalOverlay} onClick={() => setShowEditServiceModal(false)}>
              <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <span className={styles.modalTitle}>Editar Servicio</span>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setShowEditServiceModal(false)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.editServiceForm}>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel}>Servicio *</label>
                      <input
                        type="text"
                        className="input"
                        value={editServiceName}
                        readOnly
                        style={{ backgroundColor: "var(--bg-input)" }}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel}>precio</label>
                      <div className={styles.fieldWithUnit}>
                        <input
                          type="number"
                          className="input"
                          value={editServicePrice}
                          onChange={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            setEditServicePrice(p);
                            setEditServiceTotal(p + (p * editServiceIva / 100));
                          }}
                        />
                        <span className={styles.fieldUnit}>€</span>
                      </div>
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel}>IVA (%)</label>
                      <input
                        type="number"
                        className="input"
                        value={editServiceIva}
                        onChange={(e) => {
                          const iva = parseFloat(e.target.value) || 0;
                          setEditServiceIva(iva);
                          setEditServiceTotal(editServicePrice + (editServicePrice * iva / 100));
                        }}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel}>total *</label>
                      <div className={styles.fieldWithUnit}>
                        <input
                          type="number"
                          className="input"
                          value={editServiceTotal}
                          readOnly
                          style={{ fontWeight: 700 }}
                        />
                        <span className={styles.fieldUnit}>€</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnModalSecondary} onClick={() => setShowEditServiceModal(false)}>
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className={styles.btnModalPrimary}
                    onClick={() => {
                      if (editingCheckoutItemId) {
                        setCheckoutItems((prev) =>
                          prev.map((item) => {
                            if (item.id === editingCheckoutItemId) {
                              return { ...item, price: editServiceTotal };
                            }
                            return item;
                          })
                        );
                        if (selectedItemForPayment && selectedItemForPayment.id === editingCheckoutItemId) {
                          setSelectedItemForPayment({
                            ...selectedItemForPayment,
                            price: editServiceTotal,
                          });
                        }
                        setCheckoutIva(editServiceIva);
                      } else if (selectedItemForPayment) {
                        setSelectedItemForPayment({
                          ...selectedItemForPayment,
                          price: editServiceTotal,
                        });
                        setCheckoutItems((prev) =>
                          prev.map((item) => {
                            if (item.id === selectedItemForPayment.id) {
                              return { ...item, price: editServiceTotal };
                            }
                            return item;
                          })
                        );
                        setCheckoutIva(editServiceIva);
                      }
                      setShowEditServiceModal(false);
                      setEditingCheckoutItemId(null);
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Discount Modal */}
          {showDiscountModal && (
            <div className={styles.modalOverlay} onClick={() => setShowDiscountModal(false)}>
              <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <span className={styles.modalTitle}>APLICAR DESCUENTO</span>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setShowDiscountModal(false)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.discountForm}>
                    <div className={styles.formField} style={{ flex: 1 }}>
                      <label className={styles.formFieldLabel}>Descuento</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="0"
                        value={discountModalValue}
                        onChange={(e) => setDiscountModalValue(e.target.value)}
                      />
                    </div>
                    <div className={styles.formField} style={{ flex: 1 }}>
                      <label className={styles.formFieldLabel}>Tipo</label>
                      <select
                        className="input select"
                        value={discountModalType}
                        onChange={(e) => setDiscountModalType(e.target.value as "percentage" | "fixed")}
                      >
                        <option value="percentage">(%) Porcentaje</option>
                        <option value="fixed">(€) Monto fijo</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnModalSecondary} onClick={() => setShowDiscountModal(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnModalPrimary}
                    disabled={!discountModalValue || parseFloat(discountModalValue) <= 0}
                    onClick={() => {
                      if (selectedItemForPayment) {
                        const val = parseFloat(discountModalValue) || 0;
                        let amount = 0;
                        if (discountModalType === "percentage") {
                          amount = (selectedItemForPayment.price * val) / 100;
                        } else {
                          amount = val;
                        }
                        amount = Math.min(amount, selectedItemForPayment.price);
                        setCheckoutDiscount({
                          value: val,
                          type: discountModalType,
                          amount: amount
                        });
                      }
                      setShowDiscountModal(false);
                      setDiscountModalValue("");
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voucher Selection Modal */}
          {showVoucherSelectionModal && (
            <div className={styles.modalOverlay} onClick={() => setShowVoucherSelectionModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <span className={styles.modalTitle} style={{ fontWeight: 600, fontSize: "16px", color: "var(--primary)" }}>Añadir venta</span>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setShowVoucherSelectionModal(false)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.discountForm} style={{ display: "block" }}>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Bono a aplicar</label>
                      <select
                        className="input select"
                        value={selectedCheckoutVoucherId}
                        onChange={(e) => setSelectedCheckoutVoucherId(e.target.value)}
                        style={{ width: "100%", marginTop: "8px" }}
                      >
                        <option value="">Seleccionar</option>
                        {selectedClientVouchers
                          .filter((cv) => {
                            if (!cv.serviceIds) return false;
                            const allowedIds = cv.serviceIds.split(",");
                            return checkoutItems.some((item) => {
                              const srvId = getServiceIdForArticleItem(item);
                              return srvId && allowedIds.includes(srvId);
                            });
                          })
                          .map((cv) => (
                            <option key={cv.id} value={cv.id}>
                              {cv.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter} style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "none", padding: "16px 24px" }}>
                  <button
                    type="button"
                    className={styles.btnModalSecondary}
                    onClick={() => setShowVoucherSelectionModal(false)}
                    style={{ border: "1px solid var(--border-color)", background: "none", color: "var(--text-secondary)", borderRadius: "6px", padding: "8px 16px", fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnModalPrimary}
                    disabled={!selectedCheckoutVoucherId}
                    style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 600, opacity: selectedCheckoutVoucherId ? 1 : 0.6 }}
                    onClick={() => {
                      const cv = selectedClientVouchers.find(v => v.id === selectedCheckoutVoucherId);
                      if (cv && selectedItemForPayment) {
                        const usedCount = cv.sessions - cv.remainingSessions;
                        const voucherMethodString = `${cv.name} (${usedCount + 1}/${cv.sessions})`;

                        setPartialPayments([
                          ...partialPayments,
                          {
                            id: `pp-voucher-${cv.id}-${Date.now()}`,
                            method: voucherMethodString,
                            amount: checkoutRestante,
                            date: new Date().toLocaleDateString("es-ES"),
                            clientVoucherId: cv.id,
                            voucherName: cv.name
                          }
                        ]);
                        setCobrarAmount("");
                      }
                      setShowVoucherSelectionModal(false);
                    }}
                  >
                    Añadir venta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Budget Selection Modal */}
          {showBudgetSelectionModal && (
            <div className={styles.modalOverlay} onClick={() => setShowBudgetSelectionModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <span className={styles.modalTitle} style={{ fontWeight: 600, fontSize: "16px", color: "var(--primary)" }}>Cobrar con Presupuesto</span>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setShowBudgetSelectionModal(false)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.discountForm} style={{ display: "block" }}>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Selecciona el Presupuesto Aprobado</label>
                      <select
                        className="input select"
                        value={selectedCheckoutBudgetId}
                        onChange={(e) => setSelectedCheckoutBudgetId(e.target.value)}
                        style={{ width: "100%", marginTop: "8px" }}
                      >
                        <option value="">Seleccionar presupuesto...</option>
                        {clientBudgetsWithBalance.map((b) => (
                          <option key={b.id} value={b.id}>
                            PRE-{b.budgetNumber}: {b.title} (Saldo: {b.remainingAmount.toFixed(2)}€)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter} style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "none", padding: "16px 24px" }}>
                  <button
                    type="button"
                    className={styles.btnModalSecondary}
                    onClick={() => setShowBudgetSelectionModal(false)}
                    style={{ border: "1px solid var(--border-color)", background: "none", color: "var(--text-secondary)", borderRadius: "6px", padding: "8px 16px", fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnModalPrimary}
                    disabled={!selectedCheckoutBudgetId}
                    style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 600, opacity: selectedCheckoutBudgetId ? 1 : 0.6 }}
                    onClick={() => {
                      const b = clientBudgetsWithBalance.find(x => x.id === selectedCheckoutBudgetId);
                      if (b) {
                        const amt = parseFloat(cobrarAmount) || checkoutRestante;
                        const actualAmt = Math.min(amt, checkoutRestante, b.remainingAmount);
                        if (actualAmt > 0) {
                          setPartialPayments([
                            ...partialPayments,
                            {
                              id: `pp-budget-${b.id}-${Date.now()}`,
                              method: `PRE-PRESUPUESTO`, // Usamos PRE-PRESUPUESTO para identificarlo
                              amount: actualAmt,
                              date: new Date().toLocaleDateString("es-ES"),
                              clientBudgetId: b.id,
                              budgetName: `PRE-${b.budgetNumber} (${b.title})`
                            }
                          ]);
                          const newRestante = checkoutRestante - actualAmt;
                          setCobrarAmount(newRestante > 0 ? newRestante.toFixed(2) : "");
                        }
                      }
                      setShowBudgetSelectionModal(false);
                    }}
                  >
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Article Modal - Selecciona el servicio popup */}


          {showAddArticleModal && (
            <div className={styles.modalOverlay} onClick={() => setShowAddArticleModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <span className={styles.modalTitle} style={{ fontWeight: 600, fontSize: "16px", color: "var(--primary)" }}>Selecciona el servicio</span>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setShowAddArticleModal(false)}>×</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.discountForm} style={{ display: "block" }}>
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Servicio</label>
                      <select
                        className="input select"
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        style={{ width: "100%", marginTop: "8px" }}
                      >
                        <option value="">Seleccionar un servicio...</option>
                        {services.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} ({srv.price.toFixed(2)} €)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter} style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "none", padding: "16px 24px" }}>
                  <button
                    type="button"
                    className={styles.btnModalSecondary}
                    onClick={() => {
                      setShowAddArticleModal(false);
                      setSelectedServiceId("");
                    }}
                    style={{ border: "1px solid var(--border-color)", background: "none", color: "var(--text-secondary)", borderRadius: "6px", padding: "8px 16px", fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnModalPrimary}
                    disabled={!selectedServiceId}
                    style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 600, opacity: selectedServiceId ? 1 : 0.6 }}
                    onClick={() => {
                      const srv = services.find((s) => s.id === selectedServiceId);
                      if (srv && selectedItemForPayment) {
                        const newArticleItem: ArticleItem = {
                          id: `custom-item-${Date.now()}`,
                          refMov: `#ADD-${Date.now().toString().slice(-4)}`,
                          nuV: "-",
                          fecha: new Date().toLocaleDateString("es-ES"),
                          fechaRaw: new Date(),
                          hora: "-",
                          tipo: "Servicio",
                          detalle: srv.name,
                          clientNumber: selectedItemForPayment.clientNumber,
                          cliente: selectedItemForPayment.cliente,
                          clientId: selectedItemForPayment.clientId,
                          dni: selectedItemForPayment.dni,
                          empleado: "Especialista",
                          consulta: activeClinic?.name || "Clifav Central",
                          estado: "PENDIENTE",
                          metodoPago: "-",
                          fechaPago: "-",
                          price: srv.price,
                        };
                        setCheckoutItems([...checkoutItems, newArticleItem]);
                        setSelectedServiceId("");
                        setShowAddArticleModal(false);
                      }
                    }}
                  >
                    Añadir a venta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tipo de pagos side drawer */}
          <div className={`${styles.posDrawerOverlay} ${showPaymentMethodsDrawer ? styles.posDrawerOverlayOpen : ""}`} onClick={() => setShowPaymentMethodsDrawer(false)} style={{ zIndex: 1100 }} />
          <div className={`${styles.posDrawer} ${showPaymentMethodsDrawer ? styles.posDrawerOpen : ""}`} style={{ zIndex: 1200 }}>
            {isCreatingNewMethod ? (
              // Create payment method view (Image 3)
              <>
                <div className={styles.posDrawerHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewMethod(false);
                        setNewMethodName("");
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", display: "flex", alignItems: "center", padding: 0 }}
                    >
                      <Icons.ArrowLeft size={20} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Crear método de pago</h2>
                  </div>
                  <button onClick={() => setShowPaymentMethodsDrawer(false)} className={styles.closeBtn}>
                    <Icons.Plus size={24} style={{ transform: "rotate(45deg)" }} />
                  </button>
                </div>

                <div className={styles.posForm} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 70px)" }}>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label" style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Nombre *</label>
                    <input
                      type="text"
                      className="input"
                      value={newMethodName}
                      onChange={(e) => setNewMethodName(e.target.value)}
                      placeholder="Nombre del método de pago"
                      style={{ width: "100%", marginTop: "8px" }}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
                    <button
                      type="button"
                      className={styles.btnModalSecondary}
                      onClick={() => {
                        setIsCreatingNewMethod(false);
                        setNewMethodName("");
                      }}
                      style={{ border: "1px solid var(--border-color)", background: "none", color: "var(--text-secondary)", borderRadius: "6px", padding: "8px 16px", fontWeight: 600 }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={styles.btnModalPrimary}
                      disabled={!newMethodName.trim()}
                      onClick={() => {
                        if (!newMethodName.trim()) return;
                        const key = newMethodName.trim();
                        const label = key.toUpperCase();
                        const exists = tempPaymentMethods.some(m => m.key.toLowerCase() === key.toLowerCase());
                        if (exists) {
                          alert("Este método de pago ya existe.");
                          return;
                        }
                        const newMethod: PaymentMethodItem = {
                          key,
                          label,
                          enabled: true,
                          className: styles.methodBtnCustom,
                          isCustom: true
                        };
                        setTempPaymentMethods([...tempPaymentMethods, newMethod]);
                        setNewMethodName("");
                        setIsCreatingNewMethod(false);
                      }}
                      style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 600, opacity: newMethodName.trim() ? 1 : 0.6 }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Payment method list and checkbox toggling view (Image 2)
              <>
                <div className={styles.posDrawerHeader}>
                  <h2>Tipo de pagos</h2>
                  <button onClick={() => setShowPaymentMethodsDrawer(false)} className={styles.closeBtn}>
                    <Icons.Plus size={24} style={{ transform: "rotate(45deg)" }} />
                  </button>
                </div>

                <div className={styles.posForm} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 70px)" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <Icons.Search
                        size={16}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--text-muted)"
                        }}
                      />
                      <input
                        type="text"
                        className="input"
                        value={searchMethodQuery}
                        onChange={(e) => setSearchMethodQuery(e.target.value)}
                        placeholder="Buscar método de pago"
                        style={{ paddingLeft: "36px", fontSize: "13px", height: "38px" }}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.btnBackToSales}
                      style={{
                        margin: 0,
                        height: "38px",
                        padding: "0 12px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderColor: "var(--border-color)",
                        color: "var(--accent)",
                        fontWeight: 600
                      }}
                      onClick={() => setIsCreatingNewMethod(true)}
                    >
                      <Icons.Plus size={14} />
                      <span>Nuevo método</span>
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {tempPaymentMethods
                      .filter((m) => m.key.toLowerCase().includes(searchMethodQuery.toLowerCase()))
                      .map((m) => (
                        <div
                          key={m.key}
                          onClick={() => {
                            setTempPaymentMethods(prev => prev.map(item => {
                              if (item.key === m.key) {
                                return { ...item, enabled: !item.enabled };
                              }
                              return item;
                            }));
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 8px",
                            cursor: "pointer",
                            borderRadius: "6px",
                            transition: "background 0.2s"
                          }}
                          className={styles.paymentMethodRowHover}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: m.enabled ? "none" : "2px solid var(--border-color)",
                              backgroundColor: m.enabled ? "var(--accent)" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white"
                            }}
                          >
                            {m.enabled && <Icons.Check size={14} />}
                          </div>
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                            {m.key}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
                    <button
                      type="button"
                      className={styles.btnModalSecondary}
                      onClick={() => {
                        setShowPaymentMethodsDrawer(false);
                      }}
                      style={{ border: "1px solid var(--border-color)", background: "none", color: "var(--text-secondary)", borderRadius: "6px", padding: "8px 16px", fontWeight: 600 }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={styles.btnModalPrimary}
                      onClick={() => {
                        setPaymentMethods(tempPaymentMethods);
                        setShowPaymentMethodsDrawer(false);
                      }}
                      style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 600 }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Top dashboard header panel */}
          <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.title}>GESTIÓN INTERNA / VENTAS</h1>
          <span className={styles.clinicSubtitle}>{activeClinic?.name || "Clifav"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button className="btn btn-primary" onClick={() => setShowPosDrawer(true)}>
            <Icons.Plus size={16} />
            <span>Nueva Venta</span>
          </button>
          <div
            style={{
              width: "36px",
              height: "36px",
                      borderRadius: "50%",
              backgroundColor: "#e2e8f0",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            VL
          </div>
        </div>
      </header>

      {/* TABS SELECTOR LIST */}
      <div className={styles.tabsHeader}>
        {(["articulos", "facturas", "pagos", "resumen", "ingresos_gastos", "presupuestos"] as const)
          .filter((tab) => {
            if (tab === "articulos") return showArticulosTab;
            if (tab === "facturas") return showFacturasTab;
            if (tab === "pagos") return showPagosTab;
            if (tab === "resumen") return showResumenTab;
            if (tab === "ingresos_gastos") return showIngresosGastosTab;
            if (tab === "presupuestos") return showFacturasTab;
            return true;
          })
          .map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "articulos"
                ? "Artículos"
                : tab === "facturas"
                ? "Facturas"
                : tab === "pagos"
                ? "Pagos"
                : tab === "resumen"
                ? "Resumen"
                : tab === "ingresos_gastos"
                ? "Ingresos & Gastos"
                : "Presupuestos"}
            </button>
          ))}
      </div>

      {/* MAIN SALES DASHBOARD VIEWPORT */}
      <div className="glass" style={{ padding: "24px", borderRadius: "12px" }}>
        {/* SUB-TABS (Facturas only) */}
        {activeTab === "facturas" && (
          <div className={styles.subTabsHeader}>
            <button
              className={`${styles.subTabBtn} ${activeSubTab === "emitidas" ? styles.subTabBtnActive : ""}`}
              onClick={() => setActiveSubTab("emitidas")}
            >
              Emitidas
            </button>
            <button
              className={`${styles.subTabBtn} ${activeSubTab === "recibidas" ? styles.subTabBtnActive : ""}`}
              onClick={() => setActiveSubTab("recibidas")}
            >
              Recibidas
            </button>
          </div>
        )}

        {/* FILTERS AREA */}
        <div className={styles.filterBar} ref={datePickerRef} style={{ position: "relative" }}>
          <button
            type="button"
            className={styles.filterBtn}
            onClick={() => {
              if (dateFilterStart) {
                setPickerStart(dateFilterStart);
                setTempStartInput(formatDateToInput(dateFilterStart));
                setCalendarMonth(new Date(dateFilterStart.getFullYear(), dateFilterStart.getMonth(), 1));
              } else {
                setPickerStart(null);
                setTempStartInput("");
              }
              if (dateFilterEnd) {
                setPickerEnd(dateFilterEnd);
                setTempEndInput(formatDateToInput(dateFilterEnd));
              } else {
                setPickerEnd(null);
                setTempEndInput("");
              }
              setShowDatePicker(!showDatePicker);
            }}
          >
            <Icons.Filter size={16} />
            <span>Filtrar</span>
          </button>

          <div
            className={styles.dateRangeTag}
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (dateFilterStart) {
                setPickerStart(dateFilterStart);
                setTempStartInput(formatDateToInput(dateFilterStart));
                setCalendarMonth(new Date(dateFilterStart.getFullYear(), dateFilterStart.getMonth(), 1));
              } else {
                setPickerStart(null);
                setTempStartInput("");
              }
              if (dateFilterEnd) {
                setPickerEnd(dateFilterEnd);
                setTempEndInput(formatDateToInput(dateFilterEnd));
              } else {
                setPickerEnd(null);
                setTempEndInput("");
              }
              setShowDatePicker(!showDatePicker);
            }}
          >
            <Icons.Calendar size={14} />
            <span>FECHA: {getFilterText()}</span>
            {dateFilterStart && dateFilterEnd && (
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
            )}
          </div>

          {/* Custom Date Picker Popover */}
          {showDatePicker && (
            <div className={styles.datePickerPopover}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "13px" }}>Rango de fechas</label>
                <select
                  className="input select"
                  value={pickerPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="ultimos_7">Últimos 7 días</option>
                  <option value="ultimos_30">Últimos 30 días</option>
                  <option value="ultimos_90">Últimos 90 días</option>
                  <option value="esta_semana">Esta semana</option>
                  <option value="este_mes">Este mes</option>
                  <option value="mes_anterior">Mes anterior</option>
                  <option value="semana_fecha">Semana a fecha</option>
                  <option value="mes_fecha">Mes a fecha</option>
                  <option value="personalizado">Personalizado</option>
                  <option value="octubre_2025">Octubre 1-15, 2025 (Demo)</option>
                  <option value="junio_2026">Junio 1-22, 2026 (Demo)</option>
                </select>
              </div>

              {/* Dual Calendar View (Visible for Custom / Personalizado) */}
              {pickerPreset === "personalizado" && (
                <div>
                  {/* Date text inputs row */}
                  <div className={styles.pickerInputsRow}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>Inicio</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="DD-MM-YYYY"
                        value={tempStartInput}
                        onChange={(e) => handleStartInputChange(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>Final</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="DD-MM-YYYY"
                        value={tempEndInput}
                        onChange={(e) => handleEndInputChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Dual Calendar Grids */}
                  <div className={styles.calendarsBlock}>
                    {/* Navigation Bar */}
                    <div className={styles.calendarNav}>
                      <button type="button" className={styles.navArrow} onClick={handlePrevMonths}>
                        ‹
                      </button>
                      <strong className={styles.calendarMonthLabel}>{getMonthHeaderLabel(calendarMonth)}</strong>
                      <strong className={styles.calendarMonthLabel}>
                        {getMonthHeaderLabel(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      </strong>
                      <button type="button" className={styles.navArrow} onClick={handleNextMonths}>
                        ›
                      </button>
                    </div>

                    {/* Grids Body */}
                    <div className={styles.gridsContainer}>
                      {/* Left Month Calendar */}
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

                      {/* Right Month Calendar */}
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

              {/* Buttons Footer */}
              <div className={styles.pickerFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => {
                    setShowDatePicker(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.btnApply}
                  onClick={() => {
                    if (pickerStart && pickerEnd && pickerEnd < pickerStart) {
                      alert("La fecha final no puede ser anterior a la fecha de inicio.");
                      return;
                    }
                    setDateFilterStart(pickerStart);
                    setDateFilterEnd(pickerEnd);
                    setShowDatePicker(false);
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          {activeTab !== "resumen" && (
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                activeTab === "facturas"
                  ? "Número de Factura o Cliente..."
                  : activeTab === "ingresos_gastos"
                  ? "Concepto..."
                  : "Buscar cliente o detalle..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          {activeTab === "articulos" && (
            <div className={styles.columnSelectorWrapper} ref={columnSelectorRef}>
              <button
                type="button"
                className={styles.gearBtn}
                title="Configurar Columnas"
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              >
                <Icons.Settings size={18} />
              </button>
              {showColumnDropdown && (
                <div className={styles.columnDropdown}>
                  <div className={styles.columnDropdownHeader}>Mostrar Columnas</div>
                  <div className={styles.columnDropdownList}>
                    {Object.keys(visibleColumns).map((colKey) => (
                      <label key={colKey} className={styles.columnDropdownItem}>
                        <input
                          type="checkbox"
                          checked={visibleColumns[colKey]}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              [colKey]: !visibleColumns[colKey],
                            })
                          }
                        />
                        <span>
                          {colKey === "refMov"
                            ? "REF. MOV"
                            : colKey === "nuV"
                            ? "NU. V"
                            : colKey === "fecha"
                            ? "FECHA"
                            : colKey === "hora"
                            ? "HORA"
                            : colKey === "tipo"
                            ? "TIPO"
                            : colKey === "detalle"
                            ? "DETALLE"
                            : colKey === "clientNumber"
                            ? "NÚMERO DE CLIENTE"
                            : colKey === "cliente"
                            ? "CLIENTE"
                            : colKey === "dni"
                            ? "DNI"
                            : colKey === "empleado"
                            ? "EMPLEADO"
                            : colKey === "consulta"
                            ? "CONSULTA"
                            : colKey === "estado"
                            ? "ESTADO"
                            : colKey === "metodoPago"
                            ? "MÉTODO DE PAGO"
                            : colKey === "fechaPago"
                            ? "FECHA DE PAGO"
                            : colKey === "factura"
                            ? "FACTURA"
                            : colKey === "precio"
                            ? "PRECIO"
                            : colKey === "iva"
                            ? "IVA"
                            : colKey === "irpf"
                            ? "IRPF"
                            : colKey === "total"
                            ? "TOTAL"
                            : "PAGADO"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "ingresos_gastos" && (
            <button
              className={styles.filterBtn}
              style={{ marginLeft: "auto", borderColor: "#0ea5e9", color: "#0ea5e9" }}
              onClick={() => {
                const now = new Date();
                setMovDate(now.toISOString().substring(0, 10));
                setShowMovementModal(true);
              }}
            >
              <Icons.Plus size={16} />
              <span>Añadir movimiento</span>
            </button>
          )}
        </div>

        {/* TAB 1: ARTÍCULOS */}
        {activeTab === "articulos" && (
          <div>
            {/* Stats summaries block */}
            {(() => {
              const stats = calculateArticlesStats();
              return (
                <div className={styles.metricsRow}>
                  <div className={styles.metricItem}>
                    Volumen de negocio: <span>{stats.volumenNegocio.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <div className={styles.metricItem}>
                    Citas: <span>{stats.citasSum.toLocaleString("es-ES", { minimumFractionDigits: 2 })} € ({stats.citasCount})</span>
                  </div>
                  <div className={styles.metricItem}>
                    Bonos: <span>0,00 € (0)</span>
                  </div>
                  <div className={styles.metricItem}>
                    Productos: <span>{stats.productosSum.toLocaleString("es-ES", { minimumFractionDigits: 2 })} € ({stats.productosCount})</span>
                  </div>
                  <div className={styles.metricItem}>
                    Suscripciones: <span>0,00 € (0)</span>
                  </div>
                  <div className={styles.metricItem}>
                    Presupuestos: <span>0,00 € (0)</span>
                  </div>
                </div>
              );
            })()}

            {/* Toggle switches */}
            <div className={styles.togglesRow}>
              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={verBaseImponible}
                  onChange={(e) => setVerBaseImponible(e.target.checked)}
                />
                <span className={styles.switchSlider}></span>
                <span>Ver Importes Por Base Imponible</span>
              </label>

              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={verBonosDevengo}
                  onChange={(e) => setVerBonosDevengo(e.target.checked)}
                />
                <span className={styles.switchSlider}></span>
                <span>Ver Bonos Por Devengo</span>
              </label>
            </div>

            {/* Articles List Table */}
            <div className={styles.tableWrapper} style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.length === getArticlesList().length && getArticlesList().length > 0}
                        onChange={() => {
                          if (selectedRowIds.length === getArticlesList().length) {
                            setSelectedRowIds([]);
                          } else {
                            setSelectedRowIds(getArticlesList().map((item) => item.id));
                          }
                        }}
                      />
                    </th>
                    {visibleColumns.refMov && (
                      <th
                        onClick={() => handleSort("refMov")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        REF. MOV {sortColumn === "refMov" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.nuV && <th>NU. V</th>}
                    {visibleColumns.fecha && (
                      <th
                        onClick={() => handleSort("fecha")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        FECHA {sortColumn === "fecha" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.hora && (
                      <th
                        onClick={() => handleSort("hora")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        HORA {sortColumn === "hora" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.tipo && (
                      <th
                        onClick={() => handleSort("tipo")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        TIPO {sortColumn === "tipo" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.detalle && (
                      <th
                        onClick={() => handleSort("detalle")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        DETALLE {sortColumn === "detalle" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.clientNumber && <th>NÚMERO DE CLIENTE</th>}
                    {visibleColumns.cliente && (
                      <th
                        onClick={() => handleSort("cliente")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        CLIENTE {sortColumn === "cliente" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.dni && <th>DNI</th>}
                    {visibleColumns.empleado && <th>EMPLEADO</th>}
                    {visibleColumns.consulta && <th>CONSULTA</th>}
                    {visibleColumns.estado && <th>ESTADO</th>}
                    {visibleColumns.metodoPago && <th>MÉTODO DE PAGO</th>}
                    {visibleColumns.fechaPago && <th>FECHA DE PAGO</th>}
                    {visibleColumns.factura && (
                      <th
                        onClick={() => handleSort("factura")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        FACTURA {sortColumn === "factura" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.precio && (
                      <th
                        onClick={() => handleSort("precio")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        PRECIO {sortColumn === "precio" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.iva && (
                      <th
                        onClick={() => handleSort("iva")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        IVA {sortColumn === "iva" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.irpf && (
                      <th
                        onClick={() => handleSort("irpf")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        IRPF {sortColumn === "irpf" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.total && (
                      <th
                        onClick={() => handleSort("total")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        TOTAL {sortColumn === "total" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.pagado && (
                      <th
                        onClick={() => handleSort("pagado")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        PAGADO {sortColumn === "pagado" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getArticlesList().length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className={styles.emptyState}>
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    getArticlesList()
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.includes(item.id)}
                            onChange={() => handleToggleRow(item.id)}
                          />
                        </td>
                        {visibleColumns.refMov && (
                          <td>
                            <button
                              type="button"
                              className={styles.refMovLink}
                              onClick={() => setSelectedItemForPayment(item)}
                            >
                              {item.refMov}
                            </button>
                          </td>
                        )}
                        {visibleColumns.nuV && (
                          <td>
                            {item.nuV !== "-" ? (
                              <button
                                type="button"
                                className={styles.refMovLink}
                                onClick={() => setSelectedItemForPayment(item)}
                              >
                                {item.nuV}
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                        )}
                        {visibleColumns.fecha && <td>{item.fecha}</td>}
                        {visibleColumns.hora && <td>{item.hora}</td>}
                        {visibleColumns.tipo && <td>{item.tipo}</td>}
                        {visibleColumns.detalle && <td>{item.detalle}</td>}
                        {visibleColumns.clientNumber && <td>{item.clientNumber}</td>}
                        {visibleColumns.cliente && (
                          <td>
                            {item.clientId ? (
                              <Link href={`/dashboard/contacts/${item.clientId}`} className={styles.clientLink}>
                                {item.cliente}
                              </Link>
                            ) : (
                              item.cliente
                            )}
                          </td>
                        )}
                        {visibleColumns.dni && <td>{item.dni}</td>}
                        {visibleColumns.empleado && <td>{item.empleado}</td>}
                        {visibleColumns.consulta && <td>{item.consulta}</td>}
                        {visibleColumns.estado && (
                          <td>
                            <span
                              className={
                                item.estado === "GRATUITO"
                                  ? styles.badgeGratuito
                                  : item.estado === "PAGADO"
                                  ? styles.badgePagado
                                  : styles.badgePendiente
                              }
                            >
                              {item.estado === "PAGADO" && "✓ "}
                              {item.estado}
                            </span>
                          </td>
                        )}
                        {visibleColumns.metodoPago && <td>{item.metodoPago}</td>}
                        {visibleColumns.fechaPago && <td>{item.fechaPago}</td>}
                        {visibleColumns.factura && <td>{item.factura}</td>}
                        {visibleColumns.precio && <td>{item.precio.toFixed(2).replace(".", ",")}</td>}
                        {visibleColumns.iva && <td>{item.iva.toFixed(2).replace(".", ",")}</td>}
                        {visibleColumns.irpf && <td>{item.irpf.toFixed(2).replace(".", ",")}</td>}
                        {visibleColumns.total && <td>{item.total.toFixed(2).replace(".", ",")}</td>}
                        {visibleColumns.pagado && <td>{item.pagado.toFixed(2).replace(".", ",")}</td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(getArticlesList().length)}
          </div>
        )}

        {/* TAB 2: FACTURAS */}
        {activeTab === "facturas" && (
          <div>
            {/* Tax totals metric bar */}
            {(() => {
              const fStats = calculateInvoiceStats();
              return (
                <div className={styles.metricsRow} style={{ color: "#475569" }}>
                  <div className={styles.metricItem} style={{ fontWeight: 500 }}>
                    Base imponible: <strong style={{ color: "black" }}>{fStats.base.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</strong>
                  </div>
                  <div className={styles.metricItem} style={{ fontWeight: 500 }}>
                    IVA: <strong style={{ color: "black" }}>{fStats.iva.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</strong>
                  </div>
                  <div className={styles.metricItem} style={{ fontWeight: 500 }}>
                    IRPF: <strong style={{ color: "black" }}>0,00 €</strong>
                  </div>
                  <div className={styles.metricItem} style={{ fontWeight: 500 }}>
                    Total: <strong style={{ color: "black" }}>{fStats.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</strong>
                  </div>
                </div>
              );
            })()}

            {/* Invoices List Table */}
            <div className={styles.tableWrapper} style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.length === getInvoicesList().length && getInvoicesList().length > 0}
                        onChange={() => {
                          if (selectedRowIds.length === getInvoicesList().length) {
                            setSelectedRowIds([]);
                          } else {
                            setSelectedRowIds(getInvoicesList().map((item) => item.id));
                          }
                        }}
                      />
                    </th>
                    <th>REF. FAC ▾</th>
                    <th>FECHA CREACIÓN ▾</th>
                    <th>FECHA OPERACIÓN ▾</th>
                    <th>CLIENTE</th>
                    <th>NÚMERO DE CLIENTE</th>
                    <th>NIF</th>
                    <th>DIRECCIÓN</th>
                    <th>CIUDAD</th>
                    <th>CÓDIGO POSTAL</th>
                    <th>PRECIO BRUTO</th>
                    <th>DESCUENTO</th>
                    <th>BASE IMPONIBLE</th>
                    <th>IVA</th>
                    <th>RETENCIÓN</th>
                    <th>TOTAL</th>
                    <th>MÉTODO DE PAGO</th>
                    <th>TIPO</th>
                    <th>ESTADO PAGO</th>
                  </tr>
                </thead>
                <tbody>
                  {getInvoicesList().length === 0 ? (
                    <tr>
                      <td colSpan={19} className={styles.emptyState}>
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    getInvoicesList()
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.includes(item.id)}
                              onChange={() => handleToggleRow(item.id)}
                            />
                          </td>
                          <td>
                            {item.rawSale ? (
                              <button
                                className={styles.clientLink}
                                style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
                                onClick={() => handleOpenExistingInvoice(item.rawSale)}
                              >
                                {item.refFac}
                              </button>
                            ) : (
                              item.refFac
                            )}
                          </td>
                          <td>{item.fechaCreacion}</td>
                          <td>{item.fechaOperacion}</td>
                          <td>{item.cliente}</td>
                          <td>{item.clientNumber}</td>
                          <td>{item.nif}</td>
                          <td>{item.direccion}</td>
                          <td>{item.ciudad}</td>
                          <td>{item.codigoPostal}</td>
                          <td>{item.precioBruto.toFixed(2)} €</td>
                          <td>{item.descuento.toFixed(2)} €</td>
                          <td>{item.baseImponible.toFixed(2)} €</td>
                          <td>{item.iva.toFixed(2)} €</td>
                          <td>{item.retencion.toFixed(2)} €</td>
                          <td>
                            <strong>{item.total.toFixed(2)} €</strong>
                          </td>
                          <td>{item.metodoPago}</td>
                          <td>{item.tipo}</td>
                          <td>
                            <span className={styles.badgePagado}>✓ PAGADO</span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination(getInvoicesList().length)}
          </div>
        )}

        {/* TAB 3: PAGOS */}
        {activeTab === "pagos" && (
          <div>
            <div className={styles.tableWrapper}>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>FECHA</th>
                    <th>TRANSACCIÓN</th>
                    <th>USUARIO</th>
                    <th>NÚMERO DE VENTA</th>
                    <th>MÉTODO DE PAGO</th>
                    <th>TOTAL</th>
                    <th>TOTAL REEMBOLSADO</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaymentsList().length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyState}>
                        No hay transacciones registradas
                      </td>
                    </tr>
                  ) : (
                    getPaymentsList()
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((item, idx) => (
                        <tr key={item.id}>
                          <td>#{533 - ((currentPage - 1) * pageSize + idx)}</td>
                          <td>{item.fecha}</td>
                          <td>
                            <span className={styles.badgePagado}>PAGO</span>
                          </td>
                          <td>{item.usuario}</td>
                          <td>
                            <strong style={{ color: "#0284c7" }}>{item.nuV}</strong>
                          </td>
                          <td>{item.metodoPago}</td>
                          <td>{item.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</td>
                          <td>{item.reembolsado.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(getPaymentsList().length)}
          </div>
        )}

        {/* TAB 4: RESUMEN */}
        {activeTab === "resumen" && (
          <div>
            {(() => {
              const summary = calculatePaymentSummary();
              return (
                <div className={styles.summaryContainer}>
                  <div className={styles.summaryRow}>
                    <span>Efectivo:</span>
                    <strong>{summary.efectivo.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tarjeta:</span>
                    <strong>{summary.tarjeta.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR</strong>
                  </div>
                  {summary.transferencia > 0 && (
                    <div className={styles.summaryRow}>
                      <span>Transferencia:</span>
                      <strong>{summary.transferencia.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR</strong>
                    </div>
                  )}
                  <div className={styles.summaryRowTotal}>
                    <span>Total:</span>
                    <strong>{summary.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR</strong>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: INGRESOS & GASTOS */}
        {activeTab === "ingresos_gastos" && (
          <div className={styles.tableWrapper} style={{ overflow: "visible" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>CONCEPTO</th>
                  <th>CANTIDAD</th>
                  <th>MÉTODO</th>
                  <th>MOVIMIENTO</th>
                  <th>FECHA</th>
                  <th style={{ width: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {getMovementsList().length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      No se encontraron resultados
                    </td>
                  </tr>
                ) : (
                  getMovementsList().map((item) => (
                    <tr key={item.id}>
                      <td>{item.concepto}</td>
                      <td>{item.cantidad.toFixed(2)} €</td>
                      <td>{item.metodo}</td>
                      <td>
                        <span className={item.movimiento === "INGRESO" ? styles.badgeIngreso : styles.badgeGasto}>
                          {item.movimiento}
                        </span>
                      </td>
                      <td>{item.fecha}</td>
                      <td style={{ position: "relative", textAlign: "right" }}>
                        <button
                          type="button"
                          className={styles.rowActionsBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextId = openDropdownMovId === item.id ? null : item.id;
                            setOpenDropdownMovId(nextId);
                            if (nextId === null) {
                              setConfirmDeleteMovId(null);
                            }
                          }}
                        >
                          ...
                        </button>
                        {openDropdownMovId === item.id && (
                          <div className={styles.rowDropdownMenu}>
                            {confirmDeleteMovId === item.id ? (
                              <>
                                <div style={{ padding: "6px 12px 2px", fontSize: "11px", color: "var(--text-secondary)", fontWeight: 700, textAlign: "left" }}>
                                  ¿Eliminar?
                                </div>
                                <button
                                  type="button"
                                  className={styles.deleteOption}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const res = await fetch(`/api/movements?id=${item.id}`, { method: "DELETE" });
                                    if (res.ok) {
                                      fetchSalesData();
                                    } else {
                                      alert("Error al eliminar el movimiento");
                                    }
                                    setConfirmDeleteMovId(null);
                                    setOpenDropdownMovId(null);
                                  }}
                                >
                                  Sí, borrar
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteMovId(null);
                                  }}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMovementId(item.id);
                                    setMovConcept(item.concepto);
                                    setMovAmount(String(item.cantidad));
                                    
                                    // Map method back to enums
                                    let m = "CASH";
                                    if (item.metodo === "Tarjeta") m = "CARD";
                                    else if (item.metodo === "Transferencia") m = "TRANSFER";
                                    setMovMethod(m);

                                    setMovType(item.movimiento === "INGRESO" ? "INCOME" : "EXPENSE");
                                    setMovDate(item.fechaRaw.toISOString().substring(0, 10));
                                    setShowMovementModal(true);
                                    setOpenDropdownMovId(null);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteOption}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteMovId(item.id);
                                  }}
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: PRESUPUESTOS (Ventas) */}
        {activeTab === "presupuestos" && (() => {
          // Filter budgets by selected dates
          const filteredBudgets = salesBudgets.filter(b => {
            const date = new Date(b.createdAt);
            if (dateFilterStart && date < dateFilterStart) return false;
            if (dateFilterEnd && date > dateFilterEnd) return false;
            return true;
          });

          // Compute summaries
          const totalPresupuestado = filteredBudgets.reduce((sum, b) => sum + b.total, 0);
          const totalAceptado = filteredBudgets.filter(b => b.status === "ACCEPTED").reduce((sum, b) => sum + b.total, 0);
          const totalPendiente = filteredBudgets.filter(b => b.status === "PENDING").reduce((sum, b) => sum + b.total, 0);
          const totalRechazado = filteredBudgets.filter(b => b.status === "REJECTED").reduce((sum, b) => sum + b.total, 0);

          return (
            <div>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Emitido</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{totalPresupuestado.toFixed(2)}€</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{filteredBudgets.length} presupuestos</div>
                </div>

                <div style={{ background: "rgba(16,185,129,0.06)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ fontSize: "11px", color: "#10b981", textTransform: "uppercase", fontWeight: 700 }}>Aceptados</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>{totalAceptado.toFixed(2)}€</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {totalPresupuestado > 0 ? ((totalAceptado / totalPresupuestado) * 100).toFixed(0) : 0}% del total
                  </div>
                </div>

                <div style={{ background: "rgba(245,158,11,0.06)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", fontWeight: 700 }}>Pendientes</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>{totalPendiente.toFixed(2)}€</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {totalPresupuestado > 0 ? ((totalPendiente / totalPresupuestado) * 100).toFixed(0) : 0}% del total
                  </div>
                </div>

                <div style={{ background: "rgba(239,68,68,0.06)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ fontSize: "11px", color: "#ef4444", textTransform: "uppercase", fontWeight: 700 }}>Rechazados</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>{totalRechazado.toFixed(2)}€</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {totalPresupuestado > 0 ? ((totalRechazado / totalPresupuestado) * 100).toFixed(0) : 0}% del total
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className={styles.tableWrapper}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "12px", textAlign: "left" }}>Nº Presupuesto</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Paciente</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Concepto</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Fecha</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Total</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Saldo Restante</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Estado</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBudgets.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                          No se encontraron presupuestos en el periodo seleccionado.
                        </td>
                      </tr>
                    ) : (
                      filteredBudgets.map((b) => {
                        const patientName = b.client ? `${b.client.firstName} ${b.client.lastName || ""}`.trim() : "Paciente Eliminado";
                        return (
                          <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "12px" }}><strong>PRE-{b.budgetNumber}</strong></td>
                            <td style={{ padding: "12px" }}>{patientName}</td>
                            <td style={{ padding: "12px" }}>{b.title}</td>
                            <td style={{ padding: "12px" }}>{new Date(b.createdAt).toLocaleDateString("es-ES")}</td>
                            <td style={{ padding: "12px", fontWeight: "bold" }}>{b.total.toFixed(2)}€</td>
                            <td style={{ padding: "12px", color: b.remainingAmount > 0 ? "#10b981" : "var(--text-secondary)" }}>
                              {b.status === "ACCEPTED" ? `${b.remainingAmount.toFixed(2)}€` : "-"}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span style={{
                                padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                                background: b.status === "ACCEPTED" ? "rgba(16,185,129,0.12)" : b.status === "REJECTED" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                                color: b.status === "ACCEPTED" ? "#10b981" : b.status === "REJECTED" ? "#ef4444" : "#f59e0b"
                              }}>
                                {b.status === "ACCEPTED" ? "Aceptado" : b.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                              </span>
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextStatus = b.status === "PENDING" ? "ACCEPTED" : b.status === "ACCEPTED" ? "REJECTED" : "PENDING";
                                    const nextLabel = nextStatus === "ACCEPTED" ? "Aceptar" : nextStatus === "REJECTED" ? "Rechazar" : "Pendiente";
                                    if (confirm(`¿Cambiar estado de PRE-${b.budgetNumber} a ${nextLabel}?`)) {
                                      const res = await fetch(`/api/budgets/${b.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: nextStatus, total: b.total })
                                      });
                                      if (res.ok && activeClinic) {
                                        // Refresh
                                        fetch(`/api/budgets?clinicId=${activeClinic.id}`)
                                          .then(r => r.json())
                                          .then(data => { if (Array.isArray(data)) setSalesBudgets(data); });
                                      }
                                    }
                                  }}
                                  style={{ padding: "3px 8px", fontSize: "11px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  🔄 Estado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const printWindow = window.open("", "_blank");
                                    if (!printWindow) return;
                                    let items = [];
                                    try { items = JSON.parse(b.itemsJson); } catch (e) {}
                                    const itemsHtml = items.map((item: any, idx: number) => `
                                      <tr>
                                        <td>${idx + 1}</td>
                                        <td>${item.name}</td>
                                        <td>${item.price.toFixed(2)}€</td>
                                        <td>${item.qty}</td>
                                        <td>${item.discount}%</td>
                                        <td>${item.tax}%</td>
                                        <td><strong>${item.total.toFixed(2)}€</strong></td>
                                      </tr>
                                    `).join("");
                                    printWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>Presupuesto #${b.budgetNumber}</title>
                                          <style>
                                            body { font-family: sans-serif; padding: 40px; color: #333; }
                                            .header { border-bottom: 2px solid #334bfa; padding-bottom: 20px; display: flex; justify-content: space-between; }
                                            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                                            th, td { border-bottom: 1px solid #eee; padding: 12px; text-align: left; }
                                            th { background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="header">
                                            <div>
                                              <h1 style="color: #334bfa; margin: 0;">${activeClinic?.name || "CLIFAV"}</h1>
                                              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${activeClinic?.address || ""}</div>
                                            </div>
                                            <div style="text-align: right;">
                                              <h2 style="margin: 0;">PRESUPUESTO</h2>
                                              <div style="font-size: 13px;">Nº PRE-${b.budgetNumber}</div>
                                              <div style="font-size: 13px;">Fecha: ${new Date(b.createdAt).toLocaleDateString("es-ES")}</div>
                                            </div>
                                          </div>

                                          <div style="margin: 30px 0; background: #f8fafc; padding: 16px; border-radius: 8px;">
                                            <strong>Paciente:</strong> ${patientName}<br/>
                                            <strong>Tratamiento:</strong> ${b.title}
                                          </div>
                                          <table>
                                            <thead>
                                              <tr><th>#</th><th>Concepto</th><th>Precio</th><th>Cant.</th><th>Dcto</th><th>IVA</th><th>Total</th></tr>
                                            </thead>
                                            <tbody>
                                              ${itemsHtml}
                                              <tr style="background: #f8fafc; font-weight: bold; font-size: 16px;">
                                                <td colspan="5"></td>
                                                <td>TOTAL:</td>
                                                <td style="color: #334bfa; font-size: 18px;">${b.total.toFixed(2)}€</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                          <script>window.onload = function() { window.print(); }</script>
                                        </body>
                                      </html>
                                    `);
                                    printWindow.document.close();
                                  }}
                                  style={{ padding: "3px 8px", fontSize: "11px", background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  🖨️ PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

    </>
  )}

      {/* POS COLLAPSIBLE SLIDE-OUT DRAWER */}
      {/* ── Modal: Sin Datos Fiscales Configurados ─────────────────── */}
      {showNoFiscalProfileModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowNoFiscalProfileModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card)", borderRadius: "16px",
              padding: "36px 40px", maxWidth: "440px", width: "90%",
              boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "rgba(245,158,11,0.12)", border: "2px solid rgba(245,158,11,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <h3 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Datos fiscales no configurados
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Para crear facturas necesitas configurar primero tus{" "}
              <strong>Datos Fiscales</strong> (nombre comercial, NIF, dirección, etc.).
              Estos datos aparecerán en todas tus facturas.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowNoFiscalProfileModal(false)}
                style={{
                  padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-primary)", cursor: "pointer",
                  fontSize: "14px", fontWeight: 500,
                }}
              >
                Cancelar
              </button>
              <Link
                href="/dashboard/settings?tab=datosFiscales"
                onClick={() => setShowNoFiscalProfileModal(false)}
                style={{
                  padding: "10px 20px", borderRadius: "8px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "white", textDecoration: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: "6px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
                Ir a Configuración
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.posDrawerOverlay} ${showPosDrawer ? styles.posDrawerOverlayOpen : ""}`} onClick={() => setShowPosDrawer(false)} />
      <div className={`${styles.posDrawer} ${showPosDrawer ? styles.posDrawerOpen : ""}`}>
        <div className={styles.posDrawerHeader}>
          <h2>Registrar Nueva Venta (POS)</h2>
          <button onClick={() => setShowPosDrawer(false)} className={styles.closeBtn}>
            <Icons.Plus size={24} style={{ transform: "rotate(45deg)" }} />
          </button>
        </div>
        <div style={{ padding: "0 24px 24px", height: "calc(100% - 70px)", overflowY: "auto" }}>
          {renderPosFormContent()}
        </div>
      </div>

      {/* DETAILED INVOICE MODAL */}
      {selectedSaleDetail && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h2>Factura Simplificada</h2>
              <button onClick={() => setSelectedSaleDetail(null)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div className={styles.invoiceDoc}>
              <div className={styles.invoiceDocHeader}>
                <div className={styles.invoiceLogo}>CF</div>
                <div className={styles.invoiceHeaderMeta}>
                  <h3>{activeClinic?.name || "Clifav"}</h3>
                  <p>{activeClinic?.address || "Dirección de Clínica"}</p>
                </div>
              </div>

              <div className={styles.invoiceDocMeta}>
                <div>
                  <strong>Nº Factura:</strong> {selectedSaleDetail.invoiceNumber}
                </div>
                <div>
                  <strong>Fecha:</strong> {new Date(selectedSaleDetail.createdAt).toLocaleDateString("es-ES")}
                </div>
                <div>
                  <strong>Paciente:</strong> {selectedSaleDetail.client?.firstName} {selectedSaleDetail.client?.lastName}
                </div>
                <div>
                  <strong>Método de Pago:</strong> {getPaymentMethodText(selectedSaleDetail.paymentMethod)}
                </div>
              </div>

              <div className={styles.invoiceDocItems}>
                <div className={styles.itemHeader}>
                  <span>Descripción</span>
                  <span>Cant</span>
                  <span>Total</span>
                </div>
                {JSON.parse(selectedSaleDetail.itemsJson || "[]").map((item: any, idx: number) => (
                  <div key={idx} className={styles.itemRow}>
                    <span>{item.name}</span>
                    <span>{item.quantity}</span>
                    <span>{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              <div className={styles.invoiceDocTotals}>
                {selectedSaleDetail.discount > 0 && (
                  <div className={styles.totalsRow}>
                    <span>Descuento aplicado:</span>
                    <span>-{selectedSaleDetail.discount.toFixed(2)} €</span>
                  </div>
                )}
                <div className={`${styles.totalsRow} ${styles.invoiceDocGrand}`}>
                  <span>Total Abonado:</span>
                  <span>{selectedSaleDetail.total.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                Imprimir Factura
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedSaleDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUAL MOVEMENT MODAL */}
      {showMovementModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h2>{editingMovementId ? "Editar movimiento de caja" : "Añadir movimiento de caja"}</h2>
              <button onClick={handleCloseMovementModal} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className={styles.posForm}>
              <div className="form-group">
                <label className="form-label">Tipo de Movimiento</label>
                <select
                  className="input select"
                  value={movType}
                  onChange={(e) => setMovType(e.target.value as "INCOME" | "EXPENSE")}
                >
                  <option value="INCOME">Ingreso</option>
                  <option value="EXPENSE">Gasto</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Concepto / Descripción</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Compra de insumos, Venta de material..."
                  value={movConcept}
                  onChange={(e) => setMovConcept(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad (€)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="Ej: 50.00"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select className="input select" value={movMethod} onChange={(e) => setMovMethod(e.target.value)}>
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  className="input"
                  value={movDate}
                  onChange={(e) => setMovDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseMovementModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
