"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Sales.module.css";
import { translate } from "@/lib/translations";
import { getCountryConfig } from "@/lib/countries";
import { toast } from "@/components/ToastContainer";
import { ReceivedInvoiceUploadModal } from "@/components/sales/ReceivedInvoiceUploadModal";
import { ReceivedInvoiceDetailModal } from "@/components/sales/ReceivedInvoiceDetailModal";

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
  country?: string;
  email?: string;
  phone?: string;
  birthDate?: Date | string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  tax?: number;
  duration?: number;
  category?: string;
}

interface CartItem {
  id: string;
  name: string;
  type: "service" | "product";
  price: number;
  quantity: number;
  ivaRate?: number;
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
  clientName?: string;
  invoiceType?: string;
  rectifiesInvoiceNumber?: string;
  rectificationReason?: string;
  veriFactuHash?: string;
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

const IconEuro = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h12M4 14h9M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12a7.9 7.9 0 0 0 7.8 8 7.7 7.7 0 0 0 5.2-2"/>
  </svg>
);

const IconBanknote = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <circle cx="12" cy="12" r="2"/>
    <path d="M6 12h.01M18 12h.01"/>
  </svg>
);

const IconCreditCard = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconBizum = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);

const IconReceipt = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
    <line x1="8" y1="8" x2="16" y2="8"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="8" y1="16" x2="12" y2="16"/>
  </svg>
);

const IconShield = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconSparkles = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>
  </svg>
);

const IconTax = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19"/>
    <circle cx="6.5" cy="6.5" r="2.5"/>
    <circle cx="17.5" cy="17.5" r="2.5"/>
  </svg>
);

const IconClock = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconFileInvoice = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

interface ArticleItem {
  id: string;
  checkoutGroupId?: string;
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
    factura: "Si",
    precio: 214.88,
    iva: 45.12,
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
    factura: "Si",
    precio: 82.64,
    iva: 17.36,
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
    factura: "Si",
    precio: 214.88,
    iva: 45.12,
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
    factura: "Si",
    precio: 214.88,
    iva: 45.12,
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
    factura: "Si",
    precio: 99.17,
    iva: 20.83,
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
    factura: "Si",
    precio: 206.61,
    iva: 43.39,
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
    factura: "Si",
    precio: 214.88,
    iva: 45.12,
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
  const { activeClinic, user: currentUser, language } = useApp();
  const t = (key: string) => translate(key, language);
  const cConfig = getCountryConfig(activeClinic?.country || "ES");
  const currencySymbol = cConfig.currency;
  const taxLabel = cConfig.taxName;
  const identityLabel = cConfig.idName;

  const formatPrice = (val: number | null | undefined) => {
    const amount = val ?? 0;
    if (currencySymbol === "€") {
      return `${amount.toFixed(2)} €`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

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
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedDirecciones, setSelectedDirecciones] = useState<string[]>([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState<string[]>([]);
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [selectedEstadosPago, setSelectedEstadosPago] = useState<string[]>([]);
  const [selectedEstadosCita, setSelectedEstadosCita] = useState<string[]>([]);
  const [selectedMetodosPago, setSelectedMetodosPago] = useState<string[]>([]);
  const [selectedFacturado, setSelectedFacturado] = useState<string[]>([]);
  const [selectedServicios, setSelectedServicios] = useState<string[]>([]);
  const [selectedEtiquetas, setSelectedEtiquetas] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; color: string }[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clifav_available_tags");
      if (saved) {
        try {
          setAvailableTags(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing clifav_available_tags:", e);
        }
      }
    }
  }, []);

  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");

  const [clientSearchText, setClientSearchText] = useState("");
  const [direccionSearchText, setDireccionSearchText] = useState("");
  const [empleadoSearchText, setEmpleadoSearchText] = useState("");
  const [servicioSearchText, setServicioSearchText] = useState("");
  const [tagSearchText, setTagSearchText] = useState("");

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilterOption, setActiveFilterOption] = useState<string>("fechaArticulos");

  const [verBaseImponible, setVerBaseImponible] = useState(false);
  const [verBonosDevengo, setVerBonosDevengo] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Database list states
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clientProducts, setClientProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<any[]>([]);
  const [showUploadInvoiceModal, setShowUploadInvoiceModal] = useState(false);
  const [selectedReceivedInvoiceDetail, setSelectedReceivedInvoiceDetail] = useState<any | null>(null);
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
  const [itemIvaRate, setItemIvaRate] = useState<number>(0); // 0% Exento médico Art. 20 LIVA default
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFixed, setDiscountFixed] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH" | "TRANSFER" | "BIZUM">("CARD");
  const [posInvoiceType, setPosInvoiceType] = useState<"SIMPLIFIED" | "NORMAL">("SIMPLIFIED");

  // Factura Rectificativa / Abono Modal states (Ley 11/2021 & RD 1619/2012)
  const [showRectifyModal, setShowRectifyModal] = useState<boolean>(false);
  const [rectifyReason, setRectifyReason] = useState<string>("R1: Error de cálculo, omisión o conceptos erróneos (Art. 80.Uno, Dos y Seis LIVA)");
  const [rectifyType, setRectifyType] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [rectifyPaymentMethod, setRectifyPaymentMethod] = useState<string>("CASH");
  const [rectifyRestock, setRectifyRestock] = useState<boolean>(true);

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
  const [partialPayments, setPartialPayments] = useState<{ id: string; method: string; amount: number; date: string; rawDate?: string; clientVoucherId?: string; voucherName?: string; clientBudgetId?: string; budgetName?: string; isSaved?: boolean }[]>([]);

  // Cobrar input amount
  const [cobrarAmount, setCobrarAmount] = useState("");
  const [checkoutPaymentDate, setCheckoutPaymentDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const checkoutDateInputRef = useRef<HTMLInputElement>(null);

  // Voucher payment states
  const [showVoucherSelectionModal, setShowVoucherSelectionModal] = useState(false);
  const [selectedCheckoutVoucherId, setSelectedCheckoutVoucherId] = useState("");
  const [selectedClientVouchers, setSelectedClientVouchers] = useState<any[]>([]);
  const [clientVouchers, setClientVouchers] = useState<any[]>([]);

  // Budget payment states
  const [clientBudgetsWithBalance, setClientBudgetsWithBalance] = useState<any[]>([]);
  const [showBudgetSelectionModal, setShowBudgetSelectionModal] = useState(false);
  const [selectedCheckoutBudgetId, setSelectedCheckoutBudgetId] = useState("");

  // Invoice requested during checkout
  const [invoiceRequested, setInvoiceRequested] = useState<"NONE" | "NORMAL" | "SIMPLIFIED">("NONE");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // Active fiscal profile for invoice rendering
  const [activeFiscalProfile, setActiveFiscalProfile] = useState<any | null>(null);

  // States for Fiscal Profile setup modal
  const [fiscalEntityType, setFiscalEntityType] = useState("Empresa");
  const [fiscalComercialName, setFiscalComercialName] = useState("");
  const [fiscalNif, setFiscalNif] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [fiscalMunicipality, setFiscalMunicipality] = useState("");
  const [fiscalPostalCode, setFiscalPostalCode] = useState("");
  const [showFiscalSetupModal, setShowFiscalSetupModal] = useState(false);
  const [isSavingFiscal, setIsSavingFiscal] = useState(false);

  // Helper to check if fiscal profile is missing crucial fields
  const isFiscalProfileMissing = !activeFiscalProfile || 
    !activeFiscalProfile.comercialName?.trim() || 
    !activeFiscalProfile.nif?.trim() || 
    !activeFiscalProfile.address?.trim() || 
    !activeFiscalProfile.municipality?.trim() || 
    !activeFiscalProfile.postalCode?.trim();

  // Save/Update fiscal profile from setup modal
  const handleSaveFiscalProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeClinic) return;

    if (
      !fiscalComercialName.trim() || 
      !fiscalNif.trim() || 
      !fiscalAddress.trim() || 
      !fiscalMunicipality.trim() || 
      !fiscalPostalCode.trim()
    ) {
      toast.warning("Por favor, rellene todos los campos obligatorios.");
      return;
    }

    setIsSavingFiscal(true);
    try {
      const isUpdate = !!activeFiscalProfile;
      const url = isUpdate ? `/api/fiscal-profiles/${activeFiscalProfile.id}` : `/api/fiscal-profiles`;
      const method = isUpdate ? "PUT" : "POST";

      const payload: any = {
        entityType: fiscalEntityType,
        comercialName: fiscalComercialName.trim(),
        nif: fiscalNif.trim(),
        address: fiscalAddress.trim(),
        municipality: fiscalMunicipality.trim(),
        postalCode: fiscalPostalCode.trim(),
      };

      if (!isUpdate) {
        payload.clinicId = activeClinic.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveFiscalProfile(data);
        setShowFiscalSetupModal(false);
      } else {
        throw new Error("Failed to save fiscal profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar los datos fiscales.");
    } finally {
      setIsSavingFiscal(false);
    }
  };

  const handleCancelFiscalSetup = () => {
    setShowFiscalSetupModal(false);
    setSelectedItemForPayment(null);
  };

  // Auto-open fiscal profile setup modal if payment selection is active and fiscal data is missing
  useEffect(() => {
    if (!loading && selectedItemForPayment && isFiscalProfileMissing) {
      setShowFiscalSetupModal(true);
    }
  }, [selectedItemForPayment, activeFiscalProfile, loading, isFiscalProfileMissing]);

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
  const [addArticleTab, setAddArticleTab] = useState<"servicio" | "producto">("servicio");
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

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

  const handleExportGestoriaExcel = async () => {
    if (!salesHistory || salesHistory.length === 0) {
      toast.error("No hay facturas registradas en el período seleccionado.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const realInvoices = salesHistory.filter((s) => s.invoiceNumber && !s.invoiceNumber.startsWith("TKT-") && !s.invoiceNumber.startsWith("TKT"));
      if (realInvoices.length === 0) {
        toast.error("No hay facturas registradas en el período seleccionado.");
        return;
      }
      const exportData = realInvoices.map((sale) => {
        const clientName = sale.client ? `${sale.client.firstName} ${sale.client.lastName}`.trim() : "Cliente Varios";
        const taxRate = 21;
        const baseImponible = sale.total / (1 + taxRate / 100);
        const cuotaIva = sale.total - baseImponible;

        return {
          "Nº Factura": sale.invoiceNumber,
          "Fecha": new Date(sale.createdAt).toLocaleDateString("es-ES"),
          "Cliente": clientName,
          "DNI / NIF": sale.client?.dniNif || "-",
          "Forma de Pago": sale.paymentMethod,
          "Base Imponible (€)": parseFloat(baseImponible.toFixed(2)),
          "% IVA": taxRate,
          "Cuota IVA (€)": parseFloat(cuotaIva.toFixed(2)),
          "Total Factura (€)": sale.total,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Libro Facturas Emitidas");
      XLSX.writeFile(workbook, `Libro_Facturas_Gestoria_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel del Libro de Facturas para Gestoría descargado con éxito.");
    } catch (e) {
      console.error("Error exporting gestoría excel:", e);
      toast.error("Error al exportar el archivo Excel.");
    }
  };

  // Reset states when checkout item changes
  useEffect(() => {
    setCheckoutDiscount(null);
    setCobrarAmount("");
    setIsEditingTaxInline(false);
    setCheckoutPaymentDate(new Date().toISOString().split("T")[0]);

    if (selectedItemForPayment) {
      if (selectedItemForPayment.checkoutGroupId) {
        const allArticles = getArticlesList();
        const grouped = allArticles.filter(item => item.checkoutGroupId === selectedItemForPayment.checkoutGroupId);
        if (grouped.length > 0) {
          setCheckoutItems(grouped);
        } else {
          setCheckoutItems([selectedItemForPayment]);
        }
      } else {
        setCheckoutItems([selectedItemForPayment]);
      }
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
        setShowFilterDropdown(false);
      }
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptionsDropdown(false);
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
      const [clientsRes, servicesRes, productsRes, salesRes, appRes, movementsRes, budgetsRes, fiscalRes, clientVouchersRes, clientProductsRes, receivedInvoicesRes] = await Promise.all([
        fetch(`/api/clients?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/services?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/products?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/sales?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/appointments?clinicId=${activeClinic.id}&start=${dateFilterStart ? dateFilterStart.toISOString() : "2025-01-01T00:00:00.000Z"}&end=${dateFilterEnd ? dateFilterEnd.toISOString() : "2030-12-31T23:59:59.000Z"}`, { cache: "no-store" }),
        fetch(`/api/movements?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/budgets?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/fiscal-profiles?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/client-vouchers?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/client-products?clinicId=${activeClinic.id}`, { cache: "no-store" }),
        fetch(`/api/invoices/received?clinicId=${activeClinic.id}`, { cache: "no-store" }),
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

      const productsData = await productsRes.json();
      if (Array.isArray(productsData)) {
        setProductsList(productsData);
        if (productsData.length > 0) {
          setSelectedProductId(productsData[0].id);
        }
      }

      const salesData = await salesRes.json();
      setSalesHistory(salesData);

      const appData = await appRes.json();
      setAppointments(appData);

      const movementsData = await movementsRes.json();
      setMovements(movementsData);

      const receivedInvoicesData = await receivedInvoicesRes.json();
      if (Array.isArray(receivedInvoicesData)) setReceivedInvoices(receivedInvoicesData);

      const budgetsData = await budgetsRes.json();
      if (Array.isArray(budgetsData)) setSalesBudgets(budgetsData);

      const fiscalData = await fiscalRes.json();
      if (Array.isArray(fiscalData) && fiscalData.length > 0) {
        const profile = fiscalData[0];
        setActiveFiscalProfile(profile);
        setFiscalEntityType(profile.entityType || "Empresa");
        setFiscalComercialName(profile.comercialName || "");
        setFiscalNif(profile.nif || "");
        setFiscalAddress(profile.address || "");
        setFiscalMunicipality(profile.municipality || "");
        setFiscalPostalCode(profile.postalCode || "");
      } else {
        setActiveFiscalProfile(null);
        setFiscalEntityType("Empresa");
        setFiscalComercialName("");
        setFiscalNif("");
        setFiscalAddress("");
        setFiscalMunicipality("");
        setFiscalPostalCode("");
      }

      const clientVouchersData = await clientVouchersRes.json();
      if (Array.isArray(clientVouchersData)) setClientVouchers(clientVouchersData);

      const clientProductsData = await clientProductsRes.json();
      if (Array.isArray(clientProductsData)) setClientProducts(clientProductsData);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchSalesData();
  }, [activeClinic, dateFilterStart, dateFilterEnd]);

  // Auto-open specific appointment or sale when navigated from contacts page via ?appointmentId=... or ?saleId=...
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get("saleId");
    const appointmentId = params.get("appointmentId");
    
    if (!saleId && !appointmentId) return;

    const allArticles = getArticlesList();

    if (saleId && salesHistory.length > 0) {
      let foundItem = allArticles.find(item => item.id.includes(saleId));
      
      if (!foundItem) {
        const saleObj = salesHistory.find(s => s.id === saleId);
        if (saleObj) {
          try {
            const itemsArr = JSON.parse(saleObj.itemsJson || "[]");
            const appItem = itemsArr.find((i: any) => i.id && (i.id.startsWith("db-app-") || appointments.some(a => a.id === i.id)));
            if (appItem) {
              const cleanAppId = appItem.id.replace("db-app-", "");
              foundItem = allArticles.find(item => item.id === `db-app-${cleanAppId}`);
            } else {
              const voucherItem = itemsArr.find((i: any) => i.id && (i.id.startsWith("db-voucher-") || i.id.startsWith("voucher-") || clientVouchers.some(v => v.id === i.id || `db-voucher-${v.id}` === i.id || `voucher-${v.id}` === i.id)));
              if (voucherItem) {
                const cleanVoucherId = voucherItem.id.replace("db-voucher-", "").replace("voucher-", "");
                foundItem = allArticles.find(item => item.id === `db-voucher-${cleanVoucherId}`);
              }
            }
          } catch (e) {}
        }
      }

      if (foundItem) {
        setShowPosDrawer(false);
        setSelectedItemForPayment(foundItem);
        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      }
    }

    if (appointmentId && appointments.length > 0) {
      const foundItem = allArticles.find(item => item.id === `db-app-${appointmentId}`);
      if (foundItem) {
        setShowPosDrawer(false);
        setSelectedItemForPayment(foundItem);
        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      }
    }
  }, [loading, appointments, clients, salesHistory, activeClinic, clientVouchers]);

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
    const urlClientProductId = params.get("clientProductId");

    const allArticles = getArticlesList();

    // 0. If clientProductId is present, open checkout view directly
    if (urlClientProductId && clientProducts.length > 0) {
      const foundItem = allArticles.find(item => item.id === `db-product-${urlClientProductId}`);
      if (foundItem) {
        setShowPosDrawer(false);
        setSelectedItemForPayment(foundItem);
        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      }
    }

    // 1. If clientVoucherId is present, open checkout view directly as setSelectedItemForPayment
    if (urlClientVoucherId && clientVouchers.length > 0) {
      const foundItem = allArticles.find(item => item.id === `db-voucher-${urlClientVoucherId}`);
      if (foundItem) {
        setShowPosDrawer(false);
        setSelectedItemForPayment(foundItem);
        // Clean URL params without reload
        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      }
    }

    // 2. If appointmentId present, open checkout view directly
    if (urlAppointmentId) {
      const foundItem = allArticles.find(item => item.id === `db-app-${urlAppointmentId}`);
      if (foundItem) {
        setShowPosDrawer(false);
        setSelectedItemForPayment(foundItem);
        // Clean URL params without reload
        window.history.replaceState({}, "", "/dashboard/sales");
        return;
      } else if (urlClientId && urlServiceId) {
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
            factura: "",
            precio: matchService.price,
            iva: 0,
            irpf: 0,
            total: matchService.price,
            pagado: 0,
          };
          setSelectedItemForPayment(checkoutItem);
          // Clean URL params without reload
          window.history.replaceState({}, "", "/dashboard/sales");
          return;
        }
      }
    }

    if (urlClientId && !urlAppointmentId && !urlClientVoucherId && !params.get("saleId")) {
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
  }, [clients, services, clientVouchers, salesHistory, activeClinic]);

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
      ivaRate: itemIvaRate,
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
  const discountAmount = discountType === "percent" ? (subtotal * discountPercent) / 100 : Math.min(subtotal, discountFixed);
  const totalPOS = Math.max(0, subtotal - discountAmount);

  const renderPosFormContent = () => (
    <div className={styles.posForm}>
      {/* Patient Selector */}
      <div className="form-group">
        <label className="form-label">Paciente / Cliente *</label>
        <select
          className="input select"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          required
        >
          <option value="">Selecciona paciente...</option>
          <option value="generic">👤 Cliente de Contado / Venta General (Sin registrar)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName} {c.dniNif ? `(${c.dniNif})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Invoice Type Selector */}
      <div className="form-group" style={{ marginBottom: "12px" }}>
        <label className="form-label">Tipo de Factura / Serie</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`${styles.typeBtn} ${posInvoiceType === "SIMPLIFIED" ? styles.typeBtnActive : ""}`}
            onClick={() => setPosInvoiceType("SIMPLIFIED")}
            style={{ flex: 1, padding: "6px 10px", fontSize: "12px" }}
          >
            Simplificada / Ticket ({activeFiscalProfile?.serieFacturaSimplificada || "SIMP-"})
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${posInvoiceType === "NORMAL" ? styles.typeBtnActive : ""}`}
            onClick={() => setPosInvoiceType("NORMAL")}
            style={{ flex: 1, padding: "6px 10px", fontSize: "12px" }}
          >
            Factura Ordinaria ({activeFiscalProfile?.serieFacturaOrdinaria || "INV-"})
          </button>
        </div>
      </div>

      {/* Quick Add Item Row */}
      <form onSubmit={handleAddToCart} className={styles.itemAdderBlock}>
        <div className={styles.itemTypeToggle}>
          <button
            type="button"
            className={`${styles.typeBtn} ${itemType === "service" ? styles.typeBtnActive : ""}`}
            onClick={() => {
              setItemType("service");
              setItemIvaRate(0); // Default 0% exempt for medical services
            }}
          >
            Servicios Clínicos
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${itemType === "product" ? styles.typeBtnActive : ""}`}
            onClick={() => {
              setItemType("product");
              setItemIvaRate(21); // Default 21% for products
            }}
          >
            Productos / Cosmética
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
                placeholder="Ej: Crema hidratante, Venda, Suplemento..."
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Precio ({currencySymbol})</label>
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

            <div className="form-group" style={{ width: "70px" }}>
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

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Tipo IVA</label>
              <select
                className="input select"
                value={itemIvaRate}
                onChange={(e) => setItemIvaRate(parseFloat(e.target.value) || 0)}
              >
                <option value={0}>0% Exento (Art. 20 LIVA)</option>
                <option value={21}>21% General</option>
                <option value={10}>10% Reducido</option>
                <option value={4}>4% Superreducido</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "6px" }}>
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
                    {item.type === "service" ? "Servicio" : "Producto"} · IVA {item.ivaRate || 0}%
                  </span>
                </div>
                <span className={styles.cartItemMath}>
                  {item.quantity} × {formatPrice(item.price)}
                </span>
                <span className={styles.cartItemTotal}>{formatPrice(item.price * item.quantity)}</span>
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
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={styles.totalsRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Descuento:</span>
              <button
                type="button"
                onClick={() => setDiscountType(discountType === "percent" ? "fixed" : "percent")}
                style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--bg-input)", cursor: "pointer", fontWeight: 700 }}
              >
                {discountType === "percent" ? "%" : currencySymbol}
              </button>
            </div>
            {discountType === "percent" ? (
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                style={{ width: "80px", padding: "4px 8px", fontSize: "13px" }}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              />
            ) : (
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                style={{ width: "80px", padding: "4px 8px", fontSize: "13px" }}
                value={discountFixed}
                onChange={(e) => setDiscountFixed(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            )}
          </div>
          <div className={`${styles.totalsRow} ${styles.grandTotal}`}>
            <span>Total Neto:</span>
            <span>{formatPrice(totalPOS)}</span>
          </div>
        </div>

        <div className={styles.paymentMethodSelect}>
          <label className="form-label">Forma de Pago</label>
          <div className={styles.paymentRadios}>
            {(["CARD", "CASH", "TRANSFER", "BIZUM"] as const).map((method) => (
              <button
                key={method}
                type="button"
                className={`${styles.payBtn} ${paymentMethod === method ? styles.payBtnActive : ""}`}
                onClick={() => setPaymentMethod(method)}
              >
                {method === "CARD" ? "Tarjeta" : method === "CASH" ? "Efectivo" : method === "TRANSFER" ? "Transferencia" : "Bizum"}
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
      toast.warning("Por favor, selecciona un paciente o 'Cliente de Contado'.");
      return;
    }
    if (cart.length === 0) {
      toast.warning("El carrito está vacío.");
      return;
    }
    if (!activeClinic) return;

    if (isFiscalProfileMissing) {
      setShowFiscalSetupModal(true);
      return;
    }

    const payload = {
      clientId: selectedClientId === "generic" ? "generic" : selectedClientId,
      clinicId: activeClinic.id,
      total: totalPOS,
      discount: discountAmount,
      paymentMethod,
      invoiceType: posInvoiceType,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        price: item.price,
        ivaRate: item.ivaRate !== undefined ? item.ivaRate : 0,
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
      toast.success("Venta registrada con éxito.");
    } else {
      toast.error("Error al procesar la venta.");
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
      toast.error(editingMovementId ? "Error al actualizar el movimiento de caja." : "Error al guardar el movimiento de caja.");
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
      toast.warning("Por favor, permite las ventanas emergentes para poder imprimir el comprobante.");
      return;
    }

    const receiptCountryConfig = getCountryConfig(clinic?.country || "ES");
    const receiptCurrencySymbol = receiptCountryConfig.currency;
    const formatReceiptPrice = (val: number) => {
      if (receiptCurrencySymbol === "€") {
        return `${val.toFixed(2)} €`;
      }
      return `${receiptCurrencySymbol}${val.toFixed(2)}`;
    };

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
          <h2>${clinic?.name || ''}</h2>
          ${(activeFiscalProfile?.nif || clinic?.cifNif) ? `
            <p>${activeFiscalProfile?.nif ? `${activeFiscalProfile.comercialName || ''} · ${activeFiscalProfile.nif}` : (clinic?.cifNif || '')}</p>
          ` : ''}
          <p>${activeFiscalProfile?.address || clinic?.address || ''} ${activeFiscalProfile?.postalCode || ''} ${activeFiscalProfile?.municipality || ''}</p>
        </div>
        
        <div class="title">Comprobante de Pago</div>
        
        <table class="details-table">
          <tr>
            <td class="label">Fecha</td>
            <td class="value">${dateStr}</td>
          </tr>
          <tr>
            <td class="label">Monto</td>
            <td class="value" style="font-weight: bold;">${formatReceiptPrice(sale.total)}</td>
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
    const updatedPayments = [...partialPayments];

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

      const paymentDateIso = (p as any).rawDate 
        ? new Date((p as any).rawDate + "T12:00:00").toISOString() 
        : (checkoutPaymentDate ? new Date(checkoutPaymentDate + "T12:00:00").toISOString() : undefined);

      const salePayload = {
        clientId: selectedItemForPayment.clientId || "",
        clinicId: activeClinic?.id || "",
        total: p.amount,
        discount: discountAmt,
        paymentMethod: paymentMethodToSave,
        date: paymentDateIso,
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

            // Mark this payment as saved and assign database ID
            const matchIdx = updatedPayments.findIndex((x) => x.id === p.id);
            if (matchIdx !== -1) {
              updatedPayments[matchIdx] = {
                ...updatedPayments[matchIdx],
                id: createdSale.id,
                isSaved: true,
              };
            }

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
    setPartialPayments(updatedPayments);
    return createdSales;
  };

  const getNextInvoiceNumber = (series: "NORMAL" | "SIMPLIFIED" | "RECTIFICATIVA") => {
    const year = new Date().getFullYear();
    let prefix = "";
    if (series === "RECTIFICATIVA") {
      prefix = activeFiscalProfile?.serieRectificadaOrdinaria
        ? (activeFiscalProfile.serieRectificadaOrdinaria.endsWith("-") ? activeFiscalProfile.serieRectificadaOrdinaria : `${activeFiscalProfile.serieRectificadaOrdinaria}-`)
        : `R-${year}-`;
    } else if (series === "SIMPLIFIED") {
      prefix = activeFiscalProfile?.serieFacturaSimplificada
        ? (activeFiscalProfile.serieFacturaSimplificada.endsWith("-") ? activeFiscalProfile.serieFacturaSimplificada : `${activeFiscalProfile.serieFacturaSimplificada}-`)
        : `SIMP-${year}-`;
    } else {
      prefix = activeFiscalProfile?.serieFacturaOrdinaria
        ? (activeFiscalProfile.serieFacturaOrdinaria.endsWith("-") ? activeFiscalProfile.serieFacturaOrdinaria : `${activeFiscalProfile.serieFacturaOrdinaria}-`)
        : `INV-${year}-`;
    }
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

  const handleCreateInvoiceForArticles = (itemsToBill: ArticleItem[]) => {
    if (itemsToBill.length === 0) return;

    // Guard: must have fiscal profile configured
    if (!activeFiscalProfile) {
      setShowNoFiscalProfileModal(true);
      return;
    }

    const mainItem = itemsToBill[0];
    const clientId = mainItem.clientId || "";
    const clientObj = clients.find(c => c.id === clientId);
    const clientName = clientObj ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim() : mainItem.cliente || "Cliente General";
    const clientDni = clientObj ? clientObj.dniNif || "-" : mainItem.dni || "-";
    const clientAddress = clientObj ? `${clientObj.address || ""}, ${clientObj.postalCode || ""}, ${clientObj.municipality || ""}, ${clientObj.country || ""}`.trim() : "-";
    
    const appDate = mainItem.fecha || new Date().toLocaleDateString("es-ES");
    
    const concepts = itemsToBill.map(item => ({
      id: item.id,
      text: `${appDate} | ${clientName} | ${clientDni} | ${item.detalle}`,
      quantity: 1,
      price: item.price,
      subtotal: item.price,
    }));

    const nextNum = getNextInvoiceNumber("NORMAL");

    setActiveInvoiceEdit({
      clientId,
      clientName,
      clientDni,
      clientAddress,
      clientEmail: clientObj?.email || "",
      clientPhone: clientObj?.phone || "",
      date: new Date().toISOString().split("T")[0],
      series: "NORMAL",
      number: nextNum,
      concepts,
      observations: "Puedes añadir anotaciones a la factura",
      groupServices: false,
      groupAll: false,
      showFecha: true,
      showCliente: true,
      showNif: true,
      showDescripcion: true,
      estado: mainItem.estado === "PAGADO" ? "PAGADO" : "PENDIENTE",
    });
  };

  const handleExportArticlesExcel = async () => {
    const list = getArticlesList();
    if (list.length === 0) {
      toast.success("No hay datos para exportar.");
      return;
    }

    const XLSX = await import("xlsx");
    const sheetData: any[][] = [];

    // Header row
    const headers = [
      "REF. MOV",
      "NU. V",
      "FECHA",
      "HORA",
      "TIPO",
      "DETALLE",
      "NÚMERO DE CLIENTE",
      "CLIENTE",
      "DNI/NIF",
      "EMPLEADO",
      "CONSULTA",
      "ESTADO",
      "MÉTODO DE PAGO",
      "FECHA DE PAGO",
      "FACTURA",
      "PRECIO",
      "IVA",
      "IRPF",
      "TOTAL",
      "PAGADO",
    ];
    sheetData.push(headers);

    // Data rows
    list.forEach((item) => {
      sheetData.push([
        item.refMov,
        item.nuV,
        item.fecha,
        item.hora,
        item.tipo,
        item.detalle,
        item.clientNumber,
        item.cliente,
        item.dni,
        item.empleado,
        item.consulta,
        item.estado,
        item.metodoPago,
        item.fechaPago,
        item.factura,
        item.precio,
        item.iva,
        item.irpf,
        item.total,
        item.pagado,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");

    const fileClinicName = (activeClinic?.name || "Clinica").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Ventas_${fileClinicName}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleExportInvoicesExcel = async () => {
    const list = getInvoicesList();
    if (list.length === 0) {
      toast.success("No hay facturas para exportar.");
      return;
    }

    const XLSX = await import("xlsx");
    const sheetData: any[][] = [];

    // Header row for Libro Registro de Facturas Emitidas
    const headers = [
      "NÚMERO DE FACTURA / REF",
      "TIPO DE FACTURA",
      "FECHA EXPEDICIÓN",
      "FECHA OPERACIÓN",
      "NIF / CIF DESTINATARIO",
      "NOMBRE / RAZÓN SOCIAL",
      "BASE IMPONIBLE (€)",
      "CUOTA IVA (€)",
      "RETENCIÓN IRPF (€)",
      "TOTAL FACTURA (€)",
      "MÉTODO DE PAGO",
      "ESTADO PAGO",
      "FACTURA RECTIFICADA",
      "MOTIVO RECTIFICACIÓN",
      "HUELLA VERI*FACTU",
    ];
    sheetData.push(headers);

    let totBase = 0;
    let totIva = 0;
    let totRet = 0;
    let totFinal = 0;

    // Data rows
    list.forEach((item) => {
      totBase += item.baseImponible || 0;
      totIva += item.iva || 0;
      totRet += item.retencion || 0;
      totFinal += item.total || 0;

      sheetData.push([
        item.refFac,
        item.tipo,
        item.fechaCreacion,
        item.fechaOperacion,
        item.nif,
        item.cliente,
        item.baseImponible,
        item.iva,
        item.retencion,
        item.total,
        item.metodoPago,
        item.estadoPago,
        item.rectifiesInvoiceNumber || "-",
        item.rectificationReason || "-",
        item.veriFactuHash ? item.veriFactuHash.substring(0, 16) + "..." : "-",
      ]);
    });

    // Totals row
    sheetData.push([
      "TOTALES",
      "",
      "",
      "",
      "",
      `${list.length} facturas`,
      parseFloat(totBase.toFixed(2)),
      parseFloat(totIva.toFixed(2)),
      parseFloat(totRet.toFixed(2)),
      parseFloat(totFinal.toFixed(2)),
      "",
      "",
      "",
      "",
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Libro Facturas Emitidas");

    const fileClinicName = (activeClinic?.name || "Clinica").replace(/[^a-zA-Z0-9]/g, "_");
    const year = new Date().getFullYear();
    const filename = `Libro_Facturas_Emitidas_${fileClinicName}_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("Libro de facturas emitidas exportado a Excel correctamente.");
  };

  const handleExportReceivedInvoicesExcel = async () => {
    const list = getInvoicesList();
    if (list.length === 0) {
      toast.success("No hay facturas recibidas para exportar.");
      return;
    }

    const XLSX = await import("xlsx");
    const sheetData: any[][] = [];

    // Header row for Libro Registro de Facturas Recibidas (AEAT)
    const headers = [
      "Nº RECEPCIÓN",
      "Nº FACTURA PROVEEDOR",
      "FECHA EXPEDICIÓN",
      "FECHA RECEPCIÓN",
      "PROVEEDOR / RAZÓN SOCIAL",
      "NIF / CIF PROVEEDOR",
      "CONCEPTO / DETALLE",
      "CATEGORÍA GASTO",
      "BASE IMPONIBLE (€)",
      "CUOTA IVA SOPORTADO (€)",
      "RETENCIÓN IRPF (€)",
      "TOTAL FACTURA (€)",
      "MÉTODO DE PAGO",
      "ESTADO PAGO",
      "TIENE ARCHIVO ADJUNTO",
    ];
    sheetData.push(headers);

    let totBase = 0;
    let totIva = 0;
    let totRet = 0;
    let totFinal = 0;

    list.forEach((item, idx) => {
      totBase += item.baseImponible || 0;
      totIva += item.iva || 0;
      totRet += item.retencion || 0;
      totFinal += item.total || 0;

      sheetData.push([
        `REC-${String(idx + 1).padStart(4, "0")}`,
        item.refFac,
        item.fechaCreacion,
        item.fechaOperacion,
        item.cliente,
        item.nif,
        item.concept || "-",
        item.tipo,
        parseFloat((item.baseImponible || 0).toFixed(2)),
        parseFloat((item.iva || 0).toFixed(2)),
        parseFloat((item.retencion || 0).toFixed(2)),
        parseFloat((item.total || 0).toFixed(2)),
        item.metodoPago,
        item.estadoPago,
        item.fileUrl ? "Sí" : "No",
      ]);
    });

    // Totals row
    sheetData.push([
      "TOTALES",
      "",
      "",
      "",
      `${list.length} facturas recibidas`,
      "",
      "",
      "",
      parseFloat(totBase.toFixed(2)),
      parseFloat(totIva.toFixed(2)),
      parseFloat(totRet.toFixed(2)),
      parseFloat(totFinal.toFixed(2)),
      "",
      "",
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Libro Facturas Recibidas");

    const fileClinicName = (activeClinic?.name || "Clinica").replace(/[^a-zA-Z0-9]/g, "_");
    const year = new Date().getFullYear();
    const filename = `Libro_Facturas_Recibidas_${fileClinicName}_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("Libro de facturas recibidas exportado a Excel correctamente.");
  };

  const printInvoice = (inv: any, clinic: any, fiscalProfile?: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.warning("Por favor, permite las ventanas emergentes para poder imprimir/descargar la factura.");
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
            <span>${totalAmount.toFixed(2)} ${currencySymbol}</span>
          </div>
          <div class="totals-row">
            <span>IVA 0% (${totalAmount.toFixed(2)}):</span>
            <span>0,00 ${currencySymbol}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total:</span>
            <span>${totalAmount.toFixed(2)} ${currencySymbol}</span>
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
        toast.error("Error al guardar la factura.");
        return;
      }

      const createdSale = await saleRes.json();

      // Update related appointment status if this came from one
      if (selectedItemForPayment) {
        const updatedAppIds = new Set<string>();
        for (const item of checkoutItems) {
          if (item.id.startsWith("db-app-")) {
            const appId = item.id.replace("db-app-", "").split("-srv-")[0];
            if (updatedAppIds.has(appId)) continue;
            updatedAppIds.add(appId);
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
      toast.error("Error de red al guardar la factura.");
    }
  };

  const handleSaveExistingInvoice = async () => {
    if (!activeInvoiceEdit) return;
    toast.error("De conformidad con la Ley 11/2021 y Veri*Factu (RD 1007/2023), una factura expedida no admite modificaciones directas. Utilice 'Emitir Factura Rectificativa / Abono'.");
    setShowRectifyModal(true);
  };

  const handleOpenExistingInvoice = (sale: any) => {
    const clientName = `${sale.client?.firstName || ""} ${sale.client?.lastName || ""}`.trim();
    const clientDni = sale.client?.dniNif || "-";
    const clientAddress = `${sale.client?.address || ""}, ${sale.client?.postalCode || ""}, ${sale.client?.municipality || ""}, ${sale.client?.country || ""}`.trim();
    
    let concepts: any[] = [];
    let parsedItems: any[] = [];
    try {
      parsedItems = JSON.parse(sale.itemsJson || "[]");
      concepts = parsedItems.map((c: any) => ({
        id: c.id || c.name || Math.random().toString(),
        text: c.name || c.detalle || "Servicio",
        quantity: c.quantity || 1,
        price: c.price || c.total || 0,
        subtotal: (c.price || 0) * (c.quantity || 1),
        ivaRate: c.ivaRate !== undefined ? c.ivaRate : (c.taxRate !== undefined ? c.taxRate : 0),
      }));
    } catch (err) {
      console.error(err);
    }

    const isRectificativa =
      sale.invoiceNumber.startsWith("R-") ||
      sale.invoiceNumber.startsWith("RS-") ||
      sale.invoiceNumber.includes("REC") ||
      sale.total < 0 ||
      parsedItems[0]?.invoiceType === "RECTIFICATIVA";

    const series = isRectificativa
      ? "RECTIFICATIVA"
      : sale.invoiceNumber.startsWith("SIMP-") || sale.invoiceNumber.startsWith("RS-") || sale.invoiceNumber.startsWith("TKT-")
      ? "SIMPLIFIED"
      : "NORMAL";

    const numPart = parseInt(sale.invoiceNumber.split("-").pop() || "1") || 1;
    const rectifiesInvoiceNumber = parsedItems[0]?.rectifiesInvoiceNumber || "";
    const rectificationReason = parsedItems[0]?.rectificationReason || "";
    const veriFactuHash = parsedItems[0]?.veriFactuHash || sale.veriFactuHash || "";

    setActiveInvoiceEdit({
      id: sale.id,
      isExisting: true,
      invoiceNumber: sale.invoiceNumber,
      isRectificativa,
      rectifiesInvoiceNumber,
      rectificationReason,
      veriFactuHash,
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
      observations: sale.observations || (isRectificativa ? `Rectificación de la factura ${rectifiesInvoiceNumber}. Motivo: ${rectificationReason}` : "Puedes añadir anotaciones a la factura"),
      groupServices: false,
      groupAll: false,
      showFecha: true,
      showCliente: true,
      showNif: true,
      showDescripcion: true,
      estado: sale.paymentMethod === "OTHER" ? "PENDIENTE" : "PAGADO",
      paymentMethod: sale.paymentMethod,
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
      toast.warning("Por favor, permite las ventanas emergentes para poder imprimir.");
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
          ${activeInvoiceEdit.clientDni !== "-" ? `<strong>NIF:</strong> ${activeInvoiceEdit.clientDni}<br/>` : ""}
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
          <span>${totalAmount.toFixed(2)} ${currencySymbol}</span>
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
      const QRCode = await import("qrcode");
      const doc = new jsPDF();

      const clinicName = activeFiscalProfile?.comercialName || activeClinic?.name || "Clínica";
      const cifNif = activeFiscalProfile?.nif ? `${activeFiscalProfile.comercialName || ""} · ${activeFiscalProfile.nif}` : (activeClinic?.name || "Clínica");
      const address = activeFiscalProfile ? `${activeFiscalProfile.address || ""}${activeFiscalProfile.municipality ? ", " + (activeFiscalProfile.postalCode ? activeFiscalProfile.postalCode + " " : "") + activeFiscalProfile.municipality : ""}` : (activeClinic?.address || "");
      const dateStr = new Date(activeInvoiceEdit.date).toLocaleDateString("es-ES");
      
      const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : activeInvoiceEdit.series === "RECTIFICATIVA" ? "R" : "SIMP";
      const invoiceLabel = activeInvoiceEdit.invoiceNumber || `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;
      const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

      // Top color ribbon
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, 210, 6, "F");

      let y = 18;

      // Clinic Logo or Initials
      let logoDrawn = false;
      if (activeFiscalProfile?.logo && activeFiscalProfile.logo.startsWith("data:image")) {
        try {
          doc.addImage(activeFiscalProfile.logo, "JPEG", 15, y - 4, 30, 16);
          logoDrawn = true;
        } catch (e) {
          // ignore
        }
      }

      const clinicTextX = logoDrawn ? 52 : 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(clinicName, clinicTextX, y + 2);

      // Invoice Title & Status Badge
      doc.setFontSize(13);
      if (activeInvoiceEdit.isRectificativa || activeInvoiceEdit.series === "RECTIFICATIVA" || totalAmount < 0) {
        doc.setTextColor(220, 38, 38);
        doc.text("FACTURA RECTIFICATIVA (ABONO)", 195, y, { align: "right" });
      } else if (activeInvoiceEdit.series === "SIMPLIFIED") {
        doc.setTextColor(2, 132, 199);
        doc.text("FACTURA SIMPLIFICADA", 195, y, { align: "right" });
      } else {
        doc.setTextColor(2, 132, 199);
        doc.text("FACTURA ORDINARIA", 195, y, { align: "right" });
      }

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Nº Factura: ${invoiceLabel}`, 195, y, { align: "right" });
      doc.text(`Fecha Emisión: ${dateStr}`, 195, y + 5);
      doc.text(`Fecha Operación: ${dateStr}`, 195, y + 10);

      doc.setTextColor(51, 65, 85);
      doc.text(cifNif, clinicTextX, y);
      doc.text(address, clinicTextX, y + 5);

      y += 18;

      // Rectificativa Legal Reference Box (Art. 15 RD 1619/2012)
      if (activeInvoiceEdit.isRectificativa || activeInvoiceEdit.series === "RECTIFICATIVA" || activeInvoiceEdit.rectifiesInvoiceNumber) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 165, 165);
        doc.roundedRect(15, y - 2, 180, 14, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(185, 28, 28);
        doc.text(`RECTIFICACIÓN DE FACTURA (Art. 15 RD 1619/2012): Factura original rectificada: ${activeInvoiceEdit.rectifiesInvoiceNumber || "Factura de origen"}`, 18, y + 3);
        doc.setFont("helvetica", "normal");
        doc.text(`Motivo legal: ${activeInvoiceEdit.rectificationReason || "R1: Error en conceptos / cálculo (Art. 80 LIVA)"}`, 18, y + 8);
        y += 18;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 195, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(2, 132, 199);
      doc.text("DATOS DEL CLIENTE / PACIENTE", 15, y);

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(activeInvoiceEdit.clientName || "Cliente General", 15, y);

      y += 5;
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      if (activeInvoiceEdit.clientDni && activeInvoiceEdit.clientDni !== "-") {
        doc.text(`NIF / DNI: ${activeInvoiceEdit.clientDni}`, 15, y);
        y += 5;
      }
      if (activeInvoiceEdit.clientAddress && activeInvoiceEdit.clientAddress !== "-") {
        doc.text(`Dirección: ${activeInvoiceEdit.clientAddress}`, 15, y);
        y += 5;
      }

      y += 8;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 195, y);

      // Table Header
      y += 8;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, 180, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("CONCEPTO / TRATAMIENTO", 18, y + 1);
      doc.text("CANT", 115, y + 1);
      doc.text("PRECIO UNIT", 145, y + 1, { align: "right" });
      doc.text("IVA %", 168, y + 1, { align: "right" });
      doc.text("TOTAL", 192, y + 1, { align: "right" });

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      let totalBase = 0;
      let totalIva = 0;

      activeInvoiceEdit.concepts.forEach((c: any) => {
        const itemQty = c.quantity || 1;
        const itemTotal = (c.price || 0) * itemQty;
        const rate = c.ivaRate !== undefined ? c.ivaRate : 0;
        
        let itemBase = itemTotal;
        let itemIva = 0;
        if (rate > 0) {
          itemBase = itemTotal / (1 + rate / 100);
          itemIva = itemTotal - itemBase;
        }

        totalBase += itemBase;
        totalIva += itemIva;

        const splitText = doc.splitTextToSize(c.text, 92);
        doc.text(splitText, 18, y);
        doc.text(String(itemQty), 115, y);
        doc.text(`${c.price.toFixed(2)} ${currencySymbol}`, 145, y, { align: "right" });
        doc.text(`${rate}%`, 168, y, { align: "right" });
        doc.text(`${itemTotal.toFixed(2)} ${currencySymbol}`, 192, y, { align: "right" });

        y += (splitText.length * 4.5) + 3;
      });

      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 195, y);

      // Financial & Tax Totals Box
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Base Imponible:", 145, y, { align: "right" });
      doc.text(`${totalBase.toFixed(2)} ${currencySymbol}`, 192, y, { align: "right" });

      y += 5;
      doc.text("Cuota IVA:", 145, y, { align: "right" });
      doc.text(`${totalIva.toFixed(2)} ${currencySymbol}`, 192, y, { align: "right" });

      y += 7;
      doc.setFillColor(241, 245, 249);
      doc.rect(130, y - 5, 65, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("TOTAL FACTURA:", 145, y + 1, { align: "right" });
      doc.text(`${totalAmount.toFixed(2)} ${currencySymbol}`, 192, y + 1, { align: "right" });

      // Payment method
      y += 14;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const payMethodLabel = getPaymentMethodText(activeInvoiceEdit.paymentMethod || "CASH");
      doc.text(`Forma de pago: ${payMethodLabel}`, 15, y);

      if (activeFiscalProfile?.iban) {
        doc.setFont("helvetica", "normal");
        doc.text(`Cuenta Bancaria (IBAN): ${activeFiscalProfile.iban}`, 15, y + 4.5);
      }

      // Veri*Factu QR Code & Compliance Notice
      y += 14;
      const veriFactuQrText = `https://verifactu.agenciatributaria.gob.es/qr?nif=${encodeURIComponent(activeFiscalProfile?.nif || "")}&num=${encodeURIComponent(invoiceLabel)}&date=${encodeURIComponent(new Date(activeInvoiceEdit.date).toISOString().slice(0, 10))}&total=${encodeURIComponent(totalAmount.toFixed(2))}&hash=${encodeURIComponent((activeInvoiceEdit.veriFactuHash || "SHA256").slice(0, 16))}`;
      
      try {
        const qrDataUrl = await QRCode.toDataURL(veriFactuQrText, { margin: 1, width: 120 });
        doc.addImage(qrDataUrl, "PNG", 15, y, 22, 22);
      } catch (qrErr) {
        // ignore QR render fallback
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text("SISTEMA VERI*FACTU - LEY ANTIFRAUDE 11/2021 & RD 1007/2023", 42, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Factura expedida con sistema informático de facturación verificable e inalterable.", 42, y + 9);
      doc.text(`Huella digital SHA-256: ${activeInvoiceEdit.veriFactuHash || "VERIFIED-CHAIN-CLIFAV-2026"}`, 42, y + 13);
      doc.text("Exención médica IVA: Tratamientos médicos y sanitarios exentos en virtud del Art. 20.Uno.3º Ley 37/1992 (LIVA).", 42, y + 17);

      if (activeFiscalProfile?.footerNotes) {
        y += 28;
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y, 195, y);
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        const splitFooter = doc.splitTextToSize(activeFiscalProfile.footerNotes, 180);
        doc.text(splitFooter, 15, y);
      }

      doc.save(`Factura-${invoiceLabel}.pdf`);
      toast.success("Factura descargada en PDF con éxito.");
    } catch (e) {
      console.error("Error generating PDF invoice:", e);
      toast.error("Error al generar el PDF de la factura.");
    }
  };

  const handleSendEmail = async () => {
    if (!activeInvoiceEdit) return;
    const defaultEmail = activeInvoiceEdit.clientEmail || "";
    const emailTo = prompt("Introduce el correo electrónico del paciente para enviar la factura:", defaultEmail);
    if (!emailTo) return;

    const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : activeInvoiceEdit.series === "RECTIFICATIVA" ? "R" : "SIMP";
    const invoiceLabel = activeInvoiceEdit.invoiceNumber || `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;
    const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const bodyMsg = `Estimado/a ${activeInvoiceEdit.clientName},\n\nLe adjuntamos los detalles de su factura ${invoiceLabel}.\n\nConceptos:\n${activeInvoiceEdit.concepts.map((c: any) => `- ${c.text} x${c.quantity} (${(c.price * c.quantity).toFixed(2)} ${currencySymbol})`).join("\n")}\n\nTotal: ${totalAmount.toFixed(2)} ${currencySymbol}\n\nGracias por su confianza.\n\n${activeClinic?.name || "Clifav"}`;

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
        toast.success("Correo enviado con éxito.");
      } else {
        const err = await res.json();
        toast.error("Error al enviar el correo: " + (err.error || ""));
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de red al enviar el correo.");
    }
  };

  const handleSendWhatsapp = () => {
    if (!activeInvoiceEdit) return;
    const phoneClean = (activeInvoiceEdit.clientPhone || "").replace(/\D/g, "");
    const clientPhone = phoneClean ? (phoneClean.startsWith("34") ? phoneClean : `34${phoneClean}`) : "";
    const phoneTo = prompt("Introduce el número de teléfono del paciente (con prefijo de país, ej. 34600000000):", clientPhone || "34");
    if (!phoneTo) return;

    const seriesPrefix = activeInvoiceEdit.series === "NORMAL" ? "INV" : activeInvoiceEdit.series === "RECTIFICATIVA" ? "R" : "SIMP";
    const invoiceLabel = activeInvoiceEdit.invoiceNumber || `${seriesPrefix}-${new Date(activeInvoiceEdit.date).getFullYear()}-${String(activeInvoiceEdit.number).padStart(4, "0")}`;
    const totalAmount = activeInvoiceEdit.concepts.reduce((sum: number, c: any) => sum + (c.price * c.quantity), 0);

    const message = `Hola ${activeInvoiceEdit.clientName}, adjunto los detalles de su factura ${invoiceLabel}. Total: ${totalAmount.toFixed(2)} ${currencySymbol}. Gracias por confiar en nosotros.`;
    const encodedMsg = encodeURIComponent(message);

    const mode = activeClinic?.defaultWhatsappMode || "Web";
    const url = mode === "App" 
      ? `https://api.whatsapp.com/send?phone=${phoneTo}&text=${encodedMsg}`
      : `https://web.whatsapp.com/send?phone=${phoneTo}&text=${encodedMsg}`;

    window.open(url, "_blank");
  };

  const handleRectify = () => {
    setShowOpcionesDropdown(false);
    setShowRectifyModal(true);
  };

  const handleDeleteInvoice = async () => {
    setShowOpcionesDropdown(false);
    alert("CONFORMIDAD CON LA LEY ANTIFRAUDE 11/2021 Y RD 1007/2023 (VERI*FACTU):\n\nUna factura expedida tiene carácter tributario inalterable y no puede ser borrada ni alterada arbitrariamente.\n\nPara cancelar su efecto económico y tributario, debe expedir formalmente una Factura Rectificativa (Abono). Pulse en 'Emitir Factura Rectificativa / Abono' para proceder.");
    setShowRectifyModal(true);
  };

  const handleConfirmRectify = async () => {
    if (!activeInvoiceEdit) return;

    const origInvoiceNumber = activeInvoiceEdit.invoiceNumber || activeInvoiceEdit.rawSale?.invoiceNumber;
    const origSale = activeInvoiceEdit.rawSale;

    const negatedConcepts = activeInvoiceEdit.concepts.map((c: any) => ({
      ...c,
      quantity: c.quantity || 1,
      price: -Math.abs(c.price),
      subtotal: -Math.abs((c.price || 0) * (c.quantity || 1)),
      restock: rectifyRestock,
    }));

    const totalSum = negatedConcepts.reduce((acc: number, c: any) => acc + (c.price * c.quantity), 0);

    const isOrigSimplificada =
      (origInvoiceNumber && (origInvoiceNumber.startsWith("SIMP-") || origInvoiceNumber.startsWith("RS-") || origInvoiceNumber.startsWith("TKT-"))) ||
      activeInvoiceEdit.series === "SIMPLIFIED";

    const payload = {
      clientId: activeInvoiceEdit.clientId || origSale?.clientId,
      clinicId: activeClinic?.id || origSale?.clinicId,
      total: totalSum,
      discount: 0,
      paymentMethod: rectifyPaymentMethod,
      items: negatedConcepts,
      invoiceType: "RECTIFICATIVA",
      rectifiesType: isOrigSimplificada ? "SIMPLIFIED" : "ORDINARIA",
      rectifiesInvoiceNumber: origInvoiceNumber,
      rectifiesInvoiceId: activeInvoiceEdit.id || origSale?.id,
      rectificationReason: rectifyReason,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.error("Error al emitir la factura rectificativa.");
        return;
      }

      const newRectificativa = await res.json();
      setShowRectifyModal(false);
      setActiveInvoiceEdit(null);
      await fetchSalesData();
      toast.success(`Factura Rectificativa ${newRectificativa.invoiceNumber} emitida con éxito. Ajustados stock y caja.`);
    } catch (e) {
      console.error("Error creating rectificativa:", e);
      toast.error("Error de red al expedir la factura rectificativa.");
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
        toast.error("Error al actualizar contacto.");
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
      toast.error("Error al guardar cambios.");
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
    const updatedAppIds = new Set<string>();
    for (const item of checkoutItems) {
      if (item.id.startsWith("db-app-")) {
        const appId = item.id.replace("db-app-", "").split("-srv-")[0];
        if (updatedAppIds.has(appId)) continue;
        updatedAppIds.add(appId);
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
      toast.success("Cambios guardados con éxito.");
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

  const handleSelectQuickDatePreset = (preset: "hoy" | "esta_semana" | "este_mes" | "todo") => {
    if (preset === "todo") {
      setDateFilterStart(null);
      setDateFilterEnd(null);
      setPickerStart(null);
      setPickerEnd(null);
      setPickerPreset("todo");
      return;
    }
    const range = calculatePresetRange(preset);
    if (range) {
      setDateFilterStart(range.start);
      setDateFilterEnd(range.end);
      setPickerStart(range.start);
      setPickerEnd(range.end);
      setPickerPreset(preset);
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
  function getArticlesList(): ArticleItem[] {
    const isMockClinic = activeClinic && (activeClinic.id === "1941b619-8ead-4388-91f4-aedd9100a7e9" || activeClinic.id === "6fe5ca72-4169-48da-94a2-79196efbe581");
    let items: ArticleItem[] = isMockClinic ? [...MOCK_ARTICULOS] : [];
    if (!isMockClinic) {
      let dbItems: ArticleItem[] = [];

      // Merge real database sales
      salesHistory.forEach((sale, saleIdx) => {
        const saleDate = new Date(sale.createdAt);
        const itemsArr = JSON.parse(sale.itemsJson || "[]");

        // Skip the entire sale in the standalone sales loop if the sale contains any item corresponding to a database appointment or voucher checkout.
        // Those items (and their checkout siblings) will be processed in the appointments or clientVouchers loops instead.
        const belongsToAppOrVoucher = itemsArr.some((item: any) => 
          item.id && (
            item.id.startsWith("db-app-") ||
            appointments.some(a => a.id === item.id) ||
            item.id.startsWith("db-voucher-") ||
            item.id.startsWith("voucher-") ||
            clientVouchers.some(v => v.id === item.id || `db-voucher-${v.id}` === item.id || `voucher-${v.id}` === item.id)
          )
        );

        if (belongsToAppOrVoucher) {
          return;
        }

        itemsArr.forEach((item: any, itemIdx: number) => {
          dbItems.push({
            id: `db-sale-item-${sale.id}-${itemIdx}`,
            refMov: "", // Assigned below
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
            factura: sale.invoiceNumber && sale.invoiceNumber !== "-" && !sale.invoiceNumber.startsWith("TKT-") ? "Si" : "",
            precio: item.price * item.quantity,
            iva: 0.00,
            irpf: 0.00,
            total: item.price * item.quantity,
            pagado: item.price * item.quantity,
          });
        });
      });

      // Merge real database appointments
      appointments.forEach((app, appIdx) => {
        const appStatus = (app.status || "").toUpperCase();

        // Citas con estado CANCELADA, PENDIENTE o NO ASISTIO no suponen un ingreso y NO salen en ventas.
        // Solo salen las citas CONFIRMADAS o COMPLETADAS.
        const isExcludedStatus = 
          appStatus === "CANCELLED" || 
          appStatus === "CANCELADA" || 
          appStatus === "PENDING" || 
          appStatus === "PENDIENTE" || 
          appStatus === "NOSHOW" || 
          appStatus === "NO_SHOW" || 
          appStatus === "NO ASISTIO" || 
          appStatus === "NO ASISTIÓ" ||
          appStatus === "NO_ASISTIO";

        if (isExcludedStatus) {
          return;
        }

        const appDate = new Date(app.start);

        // Check for multiple services or custom price in appointment
        let parsedServices: any[] = [];
        if (app.servicesJson) {
          try {
            const raw = typeof app.servicesJson === "string" ? JSON.parse(app.servicesJson) : app.servicesJson;
            if (Array.isArray(raw) && raw.length > 0) {
              parsedServices = raw;
            }
          } catch (e) {}
        }

        const totalExpectedPrice = parsedServices.length > 0
          ? parsedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
          : (app.customPrice !== null && app.customPrice !== undefined ? Number(app.customPrice) : (app.service?.price || 0));

        // Find all database sales that belong to this appointment
        const matchingSales = salesHistory.filter((sale) => {
          try {
            const itemsArr = JSON.parse(sale.itemsJson || "[]");
            return itemsArr.some((i: any) => i.id === `db-app-${app.id}` || i.id === app.id || (i.id && i.id.startsWith(`db-app-${app.id}`)));
          } catch (e) {
            return false;
          }
        });

        const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);

        let resolvedEstado = "PENDIENTE";
        if (totalExpectedPrice === 0) {
          resolvedEstado = "GRATUITO";
        } else if (totalPaid >= totalExpectedPrice) {
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

        if (parsedServices.length > 0) {
          parsedServices.forEach((srv, srvIdx) => {
            const srvPrice = Number(srv.price) || 0;
            const itemId = srvIdx === 0 ? `db-app-${app.id}` : `db-app-${app.id}-srv-${srvIdx}`;
            const srvPagado = resolvedEstado === "PAGADO"
              ? srvPrice
              : (totalExpectedPrice > 0 ? Math.min(srvPrice, (totalPaid * (srvPrice / totalExpectedPrice))) : 0);

            dbItems.push({
              id: itemId,
              checkoutGroupId: `app-${app.id}`,
              refMov: "", // Assigned below
              nuV: "", // Assigned below
              fecha: appDate.toLocaleDateString("es-ES"),
              fechaRaw: new Date(appDate.getTime() + srvIdx * 1000),
              hora: `${String(appDate.getHours()).padStart(2, "0")}:${String(appDate.getMinutes()).padStart(2, "0")} - ${String(new Date(app.end).getHours()).padStart(2, "0")}:${String(new Date(app.end).getMinutes()).padStart(2, "0")}`,
              tipo: "Servicio",
              detalle: srv.name || app.service?.name || "Tratamiento Clínico",
              clientNumber: `#${app.client?.clientNumber || 300 + appIdx}`,
              cliente: `${app.client?.firstName || ""} ${app.client?.lastName || ""}`,
              clientId: app.client?.id,
              dni: app.client?.dniNif || "-",
              empleado: app.user?.name || "Especialista",
              consulta: activeClinic?.name || "Clifav Central",
              estado: resolvedEstado,
              metodoPago: resolvedMetodo,
              fechaPago: resolvedFechaPago,
              price: srvPrice,
              factura: resolvedNuV && resolvedNuV !== "-" && !resolvedNuV.startsWith("TKT-") ? "Si" : "",
              precio: srvPrice,
              iva: srv.tax || 0.00,
              irpf: 0.00,
              total: srvPrice,
              pagado: srvPagado,
            });
          });
        } else {
          const fallbackPrice = app.customPrice !== null && app.customPrice !== undefined ? Number(app.customPrice) : (app.service?.price || 0);
          dbItems.push({
            id: `db-app-${app.id}`,
            checkoutGroupId: `app-${app.id}`,
            refMov: "", // Assigned below
            nuV: "", // Assigned below
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
            price: fallbackPrice,
            factura: resolvedNuV && resolvedNuV !== "-" && !resolvedNuV.startsWith("TKT-") ? "Si" : "",
            precio: fallbackPrice,
            iva: 0.00,
            irpf: 0.00,
            total: fallbackPrice,
            pagado: resolvedEstado === "PAGADO" ? fallbackPrice : totalPaid,
          });
        }

        // Find any added items in matchingSales
        const addedItemsMap = new Map<string, any>();
        matchingSales.forEach((sale) => {
          try {
            const itemsArr = JSON.parse(sale.itemsJson || "[]");
            itemsArr.forEach((item: any) => {
              if (item.id === `db-app-${app.id}` || item.id === app.id || (item.id && item.id.startsWith(`db-app-${app.id}`))) {
                return;
              }
              addedItemsMap.set(item.id || item.name, {
                ...item,
                saleDate: new Date(sale.createdAt),
              });
            });
          } catch {}
        });

        // Push separate rows for added items, sharing checkoutGroupId and invoice/nuV logic
        let addedIdx = 0;
        addedItemsMap.forEach((addedItem) => {
          addedIdx++;
          dbItems.push({
            id: `db-app-added-${app.id}-${addedItem.id || addedItem.name}`,
            checkoutGroupId: `app-${app.id}`,
            refMov: "", // Assigned below
            nuV: "", // Shared with main appointment
            fecha: appDate.toLocaleDateString("es-ES"),
            fechaRaw: new Date(appDate.getTime() + addedIdx * 1000),
            hora: "-",
            tipo: addedItem.type === "product" ? "Producto" : "Servicio",
            detalle: addedItem.name,
            clientNumber: `#${app.client?.clientNumber || 300 + appIdx}`,
            cliente: `${app.client?.firstName || ""} ${app.client?.lastName || ""}`,
            clientId: app.client?.id,
            dni: app.client?.dniNif || "-",
            empleado: app.user?.name || "Especialista",
            consulta: activeClinic?.name || "Clifav Central",
            estado: resolvedEstado,
            metodoPago: resolvedMetodo,
            fechaPago: resolvedFechaPago,
            price: addedItem.price * (addedItem.quantity || 1),
            factura: resolvedNuV && resolvedNuV !== "-" && !resolvedNuV.startsWith("TKT-") ? "Si" : "",
            precio: addedItem.price * (addedItem.quantity || 1),
            iva: 0.00,
            irpf: 0.00,
            total: addedItem.price * (addedItem.quantity || 1),
            pagado: resolvedEstado === "PAGADO" ? addedItem.price * (addedItem.quantity || 1) : 0,
          });
        });
      });

      // Merge real database client vouchers
      clientVouchers.forEach((cv, cvIdx) => {
        const cvDate = new Date(cv.createdAt);

        // Find all database sales that belong to this client voucher
        const matchingSales = salesHistory.filter((sale) => {
          try {
            const itemsArr = JSON.parse(sale.itemsJson || "[]");
            return itemsArr.some((i: any) => i.id === `db-voucher-${cv.id}` || i.id === `voucher-${cv.id}` || i.id === cv.id);
          } catch (e) {
            return false;
          }
        });

        const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);
        const voucherPrice = cv.price || 0;

        let resolvedEstado = "PENDIENTE";
        if (voucherPrice === 0) {
          resolvedEstado = "GRATUITO";
        } else if (totalPaid >= voucherPrice) {
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

        dbItems.push({
          id: `db-voucher-${cv.id}`,
          checkoutGroupId: `voucher-${cv.id}`,
          refMov: "", // Assigned below
          nuV: "", // Assigned below
          fecha: cvDate.toLocaleDateString("es-ES"),
          fechaRaw: cvDate,
          hora: "-",
          tipo: "Bono",
          detalle: cv.name || "Bono de Sesiones",
          clientNumber: `#${cv.client?.clientNumber || 400 + cvIdx}`,
          cliente: `${cv.client?.firstName || ""} ${cv.client?.lastName || ""}`,
          clientId: cv.client?.id,
          dni: cv.client?.dniNif || "-",
          empleado: "Recepción",
          consulta: activeClinic?.name || "Clifav Central",
          estado: resolvedEstado,
          metodoPago: resolvedMetodo,
          fechaPago: resolvedFechaPago,
          price: voucherPrice,
          factura: resolvedNuV && resolvedNuV !== "-" && !resolvedNuV.startsWith("TKT-") ? "Si" : "",
          precio: voucherPrice,
          iva: 0.00,
          irpf: 0.00,
          total: voucherPrice,
          pagado: resolvedEstado === "PAGADO" ? voucherPrice : totalPaid,
        });

        // Find any added items in matchingSales
        const addedItemsMap = new Map<string, any>();
        matchingSales.forEach((sale) => {
          try {
            const itemsArr = JSON.parse(sale.itemsJson || "[]");
            itemsArr.forEach((item: any) => {
              if (item.id === `db-voucher-${cv.id}` || item.id === `voucher-${cv.id}` || item.id === cv.id) {
                return;
              }
              addedItemsMap.set(item.id || item.name, {
                ...item,
                saleDate: new Date(sale.createdAt),
              });
            });
          } catch {}
        });

        // Push separate rows for added items, sharing checkoutGroupId and invoice/nuV logic
        let addedIdx = 0;
        addedItemsMap.forEach((addedItem) => {
          addedIdx++;
          dbItems.push({
            id: `db-voucher-added-${cv.id}-${addedItem.id || addedItem.name}`,
            checkoutGroupId: `voucher-${cv.id}`,
            refMov: "", // Assigned below
            nuV: "", // Shared with main voucher
            fecha: cvDate.toLocaleDateString("es-ES"),
            fechaRaw: new Date(cvDate.getTime() + addedIdx * 1000),
            hora: "-",
            tipo: addedItem.type === "product" ? "Producto" : "Servicio",
            detalle: addedItem.name,
            clientNumber: `#${cv.client?.clientNumber || 400 + cvIdx}`,
            cliente: `${cv.client?.firstName || ""} ${cv.client?.lastName || ""}`,
            clientId: cv.client?.id,
            dni: cv.client?.dniNif || "-",
            empleado: "Recepción",
            consulta: activeClinic?.name || "Clifav Central",
            estado: resolvedEstado,
            metodoPago: resolvedMetodo,
            fechaPago: resolvedFechaPago,
            price: addedItem.price * (addedItem.quantity || 1),
            factura: resolvedNuV && resolvedNuV !== "-" && !resolvedNuV.startsWith("TKT-") ? "Si" : "",
            precio: addedItem.price * (addedItem.quantity || 1),
            iva: 0.00,
            irpf: 0.00,
            total: addedItem.price * (addedItem.quantity || 1),
            pagado: resolvedEstado === "PAGADO" ? addedItem.price * (addedItem.quantity || 1) : 0,
          });
        });
      });

      // Merge real database client products
      clientProducts.forEach((cp, cpIdx) => {
        const cpDate = new Date(cp.date || cp.createdAt);

        // Find all database sales that belong to this client product
        const matchingSales = salesHistory.filter((sale) => {
          try {
            const itemsArr = JSON.parse(sale.itemsJson || "[]");
            return itemsArr.some((i: any) => i.id === `db-product-${cp.id}` || i.id === cp.id);
          } catch (e) {
            return false;
          }
        });

        const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);
        const prodPrice = cp.total || cp.price || 0;

        let resolvedEstado = "NO PAGADO";
        if (totalPaid >= prodPrice && prodPrice > 0) {
          resolvedEstado = "PAGADO";
        } else if (totalPaid > 0) {
          resolvedEstado = "PAGO PARCIAL";
        }

        const methods = [...new Set(matchingSales.map(s => getPaymentMethodText(s.paymentMethod)))];
        const resolvedMetodo = methods.length > 0 ? methods.join(", ") : "-";

        const latestSale = matchingSales.length > 0
          ? matchingSales.reduce((latest, s) => new Date(s.createdAt) > new Date(latest.createdAt) ? s : latest, matchingSales[0])
          : null;
        const resolvedFechaPago = latestSale
          ? new Date(latestSale.createdAt).toLocaleDateString("es-ES")
          : "-";

        const invoiceNumbers = matchingSales.map(s => s.invoiceNumber).filter(Boolean);
        const resolvedNuV = invoiceNumbers.length > 0 ? invoiceNumbers.join(", ") : "-";

        const vatAmount = cp.vat ? (cp.price * (cp.vat / 100)) : 0;

        dbItems.push({
          id: `db-product-${cp.id}`,
          checkoutGroupId: `product-${cp.id}`,
          refMov: "", // Assigned per type below
          nuV: resolvedNuV !== "-" ? resolvedNuV : "-",
          fecha: cpDate.toLocaleDateString("es-ES"),
          fechaRaw: cpDate,
          hora: "-",
          tipo: "Producto",
          detalle: cp.productName || "Producto",
          clientNumber: `#${cp.client?.clientNumber || 1}`,
          cliente: cp.client ? `${cp.client.firstName} ${cp.client.lastName}` : (cp.clientName || "-"),
          clientId: cp.client?.id || cp.clientId,
          dni: cp.client?.dniNif || "-",
          empleado: cp.professionalName || "Recepción",
          consulta: activeClinic?.name || "Clifav Central",
          estado: resolvedEstado,
          metodoPago: resolvedMetodo,
          fechaPago: resolvedFechaPago,
          price: cp.price || 0,
          factura: resolvedNuV && resolvedNuV !== "-" && !resolvedNuV.startsWith("TKT-") ? "Si" : "",
          precio: cp.price || 0,
          iva: parseFloat(vatAmount.toFixed(2)),
          irpf: 0.00,
          total: cp.total || cp.price || 0,
          pagado: resolvedEstado === "PAGADO" ? (cp.total || cp.price || 0) : totalPaid,
        });
      });

      // Sort db items ascending by date/time (fechaRaw)
      dbItems.sort((a, b) => a.fechaRaw.getTime() - b.fechaRaw.getTime());

      // Assign sequential reference numbers per item type (#1, #2...) and sale numbers
      const typeIndexMap: Record<string, number> = {};
      const checkoutGroupNuV: Record<string, string> = {};
      let nextNuVIndex = 1;

      dbItems.forEach((item) => {
        const t = item.tipo || "Servicio";
        if (!typeIndexMap[t]) typeIndexMap[t] = 1;
        item.refMov = `#${typeIndexMap[t]++}`;
        
        if (item.checkoutGroupId) {
          if (!checkoutGroupNuV[item.checkoutGroupId]) {
            checkoutGroupNuV[item.checkoutGroupId] = `#${nextNuVIndex}`;
            nextNuVIndex++;
          }
          item.nuV = item.estado === "PAGADO" || item.estado === "PAGO PARCIAL" ? checkoutGroupNuV[item.checkoutGroupId] : "-";
        } else {
          if (!item.nuV || item.nuV === "") {
            item.nuV = item.estado === "PAGADO" || item.estado === "PAGO PARCIAL" ? `#${nextNuVIndex++}` : "-";
          }
        }
      });

      items = dbItems;
    }

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
          const cleanId = item.id.replace("db-sale-item-", "").replace("db-app-", "").replace("db-voucher-", "");
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
        const cleanId = item.id.replace("db-sale-item-", "").replace("db-app-", "").replace("db-voucher-", "");
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
        if (statusFilter !== "TODOS" && item.estado !== statusFilter) return false;

        // Cascade filters
        if (selectedClients.length > 0 && !selectedClients.includes(item.cliente)) return false;
        if (selectedDirecciones.length > 0 && !selectedDirecciones.includes(item.consulta)) return false;
        if (selectedEmpleados.length > 0 && !selectedEmpleados.includes(item.empleado)) return false;
        if (selectedTipos.length > 0 && !selectedTipos.includes(item.tipo)) return false;
        if (selectedEstadosPago.length > 0 && !selectedEstadosPago.includes(item.estado)) return false;
        if (selectedMetodosPago.length > 0 && !selectedMetodosPago.some(m => item.metodoPago.toLowerCase().includes(m.toLowerCase()))) return false;
        if (selectedFacturado.length > 0) {
          const isFacturado = item.factura === "Si" ? "Si" : "No";
          if (!selectedFacturado.includes(isFacturado)) return false;
        }
        if (selectedServicios.length > 0 && !selectedServicios.includes(item.detalle)) return false;
        if (invoiceSearchQuery && !item.nuV.toLowerCase().includes(invoiceSearchQuery.toLowerCase())) return false;

        if (selectedEstadosCita.length > 0) {
          if (!item.id.startsWith("db-app-")) return false;
          const appId = item.id.replace("db-app-", "");
          const appt = appointments.find(a => a.id === appId);
          if (!appt || !selectedEstadosCita.includes(appt.status)) return false;
        }

        if (selectedEtiquetas.length > 0) {
          if (!item.id.startsWith("db-app-")) return false;
          const appId = item.id.replace("db-app-", "");
          const appt = appointments.find(a => a.id === appId);
          if (!appt || !appt.tags) return false;
          const appTags = appt.tags.split(",").map((t: string) => t.split(":")[0].trim().toLowerCase());
          const match = selectedEtiquetas.some(t => appTags.includes(t.toLowerCase()));
          if (!match) return false;
        }

        if (searchQuery) {
          const s = searchQuery.toLowerCase();
          return (
            item.cliente.toLowerCase().includes(s) ||
            item.detalle.toLowerCase().includes(s) ||
            item.nuV.toLowerCase().includes(s) ||
            (item.dni && item.dni.toLowerCase().includes(s))
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
      salesHistory.forEach((sale) => {
        // Any sale in history has an invoiceNumber
        if (!sale.invoiceNumber) return;

        let parsedItems: any[] = [];
        try {
          parsedItems = JSON.parse(sale.itemsJson || "[]");
        } catch (e) {
          parsedItems = [];
        }

        // Los tickets de cobro/pago de caja (TKT-...) van en la pestaña PAGOS, NO en FACTURAS
        const isTicket =
          sale.invoiceNumber.startsWith("TKT-") ||
          sale.invoiceNumber.startsWith("TKT") ||
          (sale as any).invoiceType === "TICKET" ||
          (sale as any).invoiceType === "NONE" ||
          (parsedItems.length > 0 && (parsedItems[0]?.invoiceType === "TICKET" || parsedItems[0]?.invoiceType === "NONE"));

        if (isTicket) return;

        const saleDate = new Date(sale.createdAt);
        const isRectificativa = (sale as any).isRectificativa ||
          (sale as any).invoiceType === "RECTIFICATIVA" ||
          sale.invoiceNumber.startsWith("REC") ||
          sale.invoiceNumber.startsWith("R-") ||
          sale.invoiceNumber.startsWith("RS-") ||
          sale.invoiceNumber.startsWith("A-") ||
          sale.total < 0;
        const isSimplificada = (sale as any).invoiceType === "SIMPLIFICADA" ||
          (sale as any).invoiceType === "SIMPLIFIED" ||
          sale.invoiceNumber.startsWith("SIMP-");

        // Calculate itemized taxes from JSON if present
        let baseImponible = 0;
        let iva = 0;

        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          parsedItems.forEach((it) => {
            const itPrice = (it.price || 0) * (it.quantity || 1) - (it.discount || 0);
            const rate = it.ivaRate !== undefined ? Number(it.ivaRate) : 0;
            if (rate > 0) {
              const base = itPrice / (1 + rate / 100);
              baseImponible += base;
              iva += (itPrice - base);
            } else {
              baseImponible += itPrice;
            }
          });
        } else {
          // Fallback: healthcare services exempt (0% IVA Art. 20 LIVA)
          baseImponible = sale.total;
          iva = 0;
        }

        const tipo = isRectificativa ? "Rectificativa" : (isSimplificada ? "Simplificada" : "Completa");

        items.push({
          id: sale.id,
          refFac: sale.invoiceNumber,
          fechaCreacion: saleDate.toLocaleDateString("es-ES"),
          fechaOperacion: saleDate.toLocaleDateString("es-ES"),
          fechaRaw: saleDate,
          cliente: sale.client ? `${sale.client.firstName || ""} ${sale.client.lastName || ""}`.trim() : (sale.clientName || "Cliente Contado"),
          clientNumber: sale.client?.clientNumber ? `#${sale.client.clientNumber}` : "-",
          nif: sale.client?.dniNif || "-",
          direccion: sale.client?.address || "-",
          ciudad: sale.client?.municipality || "-",
          codigoPostal: sale.client?.postalCode || "-",
          precioBruto: sale.total + (sale.discount || 0),
          descuento: sale.discount || 0,
          baseImponible: parseFloat(baseImponible.toFixed(2)),
          iva: parseFloat(iva.toFixed(2)),
          retencion: 0,
          total: sale.total,
          metodoPago: getPaymentMethodText(sale.paymentMethod),
          tipo,
          estadoPago: "PAGADO",
          isRectificativa,
          isSimplificada,
          rectifiesInvoiceNumber: (sale as any).rectifiesInvoiceNumber || null,
          rectificationReason: (sale as any).rectificationReason || null,
          veriFactuHash: (sale as any).veriFactuHash || null,
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
      // Recibidas (Facturas de Proveedores y Gastos)
      receivedInvoices.forEach((inv) => {
        const invDate = new Date(inv.issueDate);
        items.push({
          id: inv.id,
          rawInvoice: inv,
          isReceivedInvoice: true,
          refFac: inv.invoiceNumber,
          fechaCreacion: invDate.toLocaleDateString("es-ES"),
          fechaOperacion: invDate.toLocaleDateString("es-ES"),
          fechaRaw: invDate,
          cliente: inv.supplierName,
          clientNumber: "-",
          nif: inv.supplierNif || "-",
          direccion: "-",
          ciudad: "-",
          codigoPostal: "-",
          precioBruto: inv.baseAmount,
          descuento: 0,
          baseImponible: inv.baseAmount,
          iva: inv.taxAmount,
          retencion: inv.retentionAmount,
          total: inv.total,
          metodoPago: getPaymentMethodText(inv.paymentMethod),
          tipo: inv.category ? inv.category.replace(/_/g, " ") : "Proveedor",
          estadoPago: inv.status || "PAGADO",
          fileUrl: inv.fileUrl,
          concept: inv.concept,
        });
      });

      // Incluir también los movimientos manuales antiguos
      movements
        .filter((m) => m.type === "EXPENSE" && !receivedInvoices.some(inv => inv.id === m.id))
        .forEach((mov) => {
          const movDate = new Date(mov.date);
          items.push({
            id: mov.id,
            isReceivedInvoice: false,
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
            tipo: "Gasto manual",
            estadoPago: "PAGADO",
            fileUrl: null,
            concept: mov.concept,
          });
        });
    }

    return items
      .filter((item) => {
        if (dateFilterStart && item.fechaRaw < dateFilterStart) return false;
        if (dateFilterEnd && item.fechaRaw > dateFilterEnd) return false;
        if (statusFilter !== "TODOS" && item.estadoPago !== statusFilter) return false;

        // Cascade filters
        if (selectedClients.length > 0 && !selectedClients.includes(item.cliente)) return false;
        if (selectedDirecciones.length > 0 && !selectedDirecciones.includes(item.ciudad)) return false;
        if (selectedTipos.length > 0 && !selectedTipos.includes(item.tipo)) return false;
        if (selectedEstadosPago.length > 0 && !selectedEstadosPago.includes(item.estadoPago)) return false;
        if (selectedMetodosPago.length > 0 && !selectedMetodosPago.some(m => item.metodoPago.toLowerCase().includes(m.toLowerCase()))) return false;
        if (selectedFacturado.length > 0) {
          const hasInv = item.refFac !== "-";
          const isFacturado = hasInv ? "Si" : "No";
          if (!selectedFacturado.includes(isFacturado)) return false;
        }
        if (invoiceSearchQuery && !item.refFac.toLowerCase().includes(invoiceSearchQuery.toLowerCase())) return false;

        if (searchQuery) {
          const s = searchQuery.toLowerCase();
          return (
            item.refFac.toLowerCase().includes(s) ||
            item.cliente.toLowerCase().includes(s) ||
            (item.nif && item.nif.toLowerCase().includes(s))
          );
        }
        return true;
      })
      .sort((a, b) => b.fechaRaw.getTime() - a.fechaRaw.getTime());
  };

  const getPaymentsList = () => {
    const isMockClinic = activeClinic && (activeClinic.id === "1941b619-8ead-4388-91f4-aedd9100a7e9" || activeClinic.id === "6fe5ca72-4169-48da-94a2-79196efbe581");
    let items = isMockClinic ? [...MOCK_PAGOS] : [];

    // Merge db sales (únicamente tickets de pago de caja, NO facturas emitidas)
    salesHistory.forEach((sale) => {
      if (!sale.invoiceNumber) return;

      let parsedItems: any[] = [];
      try {
        parsedItems = JSON.parse(sale.itemsJson || "[]");
      } catch (e) {
        parsedItems = [];
      }

      // En pagos van únicamente los tickets de pagos (TKT-...), NO las facturas emitidas (SIMP-, INV-, R-)
      const isTicket =
        sale.invoiceNumber.startsWith("TKT-") ||
        sale.invoiceNumber.startsWith("TKT") ||
        (sale as any).invoiceType === "TICKET" ||
        (sale as any).invoiceType === "NONE" ||
        (parsedItems.length > 0 && (parsedItems[0]?.invoiceType === "TICKET" || parsedItems[0]?.invoiceType === "NONE"));

      if (!isTicket) return;

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
          transaccion: "INGRESO",
          usuario: "admin@clifav.com",
          nuV: `INC-${mov.id.substring(0, 4).toUpperCase()}`,
          metodoPago: getPaymentMethodText(mov.method),
          total: mov.amount,
          reembolsado: 0,
        });
      });

    // Merge manual expense movements
    movements
      .filter((m) => m.type === "EXPENSE")
      .forEach((mov) => {
        const movDate = new Date(mov.date);
        items.push({
          id: `db-pay-mov-exp-${mov.id}`,
          fecha: movDate.toLocaleString("es-ES", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          fechaRaw: movDate,
          transaccion: "GASTO",
          usuario: "admin@clifav.com",
          nuV: `EXP-${mov.id.substring(0, 4).toUpperCase()}`,
          metodoPago: getPaymentMethodText(mov.method),
          total: -mov.amount,
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
    const bonosSum = list.filter((i) => i.tipo === "Bono").reduce((sum, item) => sum + item.price, 0);
    const bonosCount = list.filter((i) => i.tipo === "Bono").length;

    return {
      volumenNegocio: totalVolume,
      citasSum: appointmentsSum,
      citasCount: appointmentsCount,
      productosSum: productsSum,
      productosCount: productsCount,
      bonosSum: bonosSum,
      bonosCount: bonosCount,
    };
  };

  // Calculating executive invoice stats & tax breakdown for Facturas screen
  const calculateInvoiceStats = () => {
    const list = getInvoicesList();
    let totalSum = 0;
    let baseSum = 0;
    let ivaSum = 0;
    let retencionSum = 0;
    let cashSum = 0;
    let cardSum = 0;
    let transferBizumSum = 0;
    let exentoSum = 0;

    let pendingSum = 0;
    let pendingCount = 0;

    list.forEach((item) => {
      const tot = item.total || 0;
      const base = item.baseImponible || 0;
      const iva = item.iva || 0;
      const ret = item.retencion || 0;
      totalSum += tot;
      baseSum += base;
      ivaSum += iva;
      retencionSum += ret;

      if (item.estadoPago === "PENDIENTE") {
        pendingSum += tot;
        pendingCount++;
      }

      if (iva === 0 && base !== 0) {
        exentoSum += base;
      }

      const method = (item.metodoPago || "").toLowerCase();
      if (method.includes("efectivo")) {
        cashSum += tot;
      } else if (method.includes("tarjeta")) {
        cardSum += tot;
      } else {
        transferBizumSum += tot;
      }
    });

    const count = list.length;
    const ticketMedio = count > 0 ? totalSum / count : 0;

    return {
      total: totalSum,
      base: baseSum,
      iva: ivaSum,
      retencion: retencionSum,
      cash: cashSum,
      card: cardSum,
      transferBizum: transferBizumSum,
      exento: exentoSum,
      pendingSum,
      pendingCount,
      count,
      ticketMedio,
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
    if (!showEditClientModal || typeof window === "undefined") return null;

    return createPortal(
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
      </div>,
      document.body
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
              <div style={{ display: "flex", flex: 1, justifyContent: "center", marginRight: "60px", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <div className={styles.immutableBanner}>
                  <IconShield size={16} />
                  <span>Factura Expedida e Inalterable (Ley 11/2021)</span>
                </div>
                {!activeInvoiceEdit.isRectificativa && (
                  <button
                    type="button"
                    className={styles.btnSave}
                    style={{ background: "#dc2626", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    onClick={handleRectify}
                  >
                    <IconRectify size={16} />
                    <span>Emitir Rectificativa / Abono</span>
                  </button>
                )}
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
                      : ""}
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
                  disabled={activeInvoiceEdit.isExisting}
                  onChange={(e) => setActiveInvoiceEdit({ ...activeInvoiceEdit, date: e.target.value })}
                />
              </div>
              <div className={styles.invoiceFieldGroup}>
                <label>Nº de factura</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className={styles.conceptInputText}
                    style={{ width: "160px" }}
                    value={activeInvoiceEdit.series}
                    disabled={activeInvoiceEdit.isExisting}
                    onChange={(e) => {
                      const newSeries = e.target.value as "NORMAL" | "SIMPLIFIED" | "RECTIFICATIVA";
                      const nextNum = getNextInvoiceNumber(newSeries);
                      setActiveInvoiceEdit({ ...activeInvoiceEdit, series: newSeries, number: nextNum });
                    }}
                  >
                    <option value="NORMAL">Ordinaria ({activeFiscalProfile?.serieFacturaOrdinaria || "INV-"})</option>
                    <option value="SIMPLIFIED">Simplificada ({activeFiscalProfile?.serieFacturaSimplificada || "SIMP-"})</option>
                    <option value="RECTIFICATIVA">Rectificativa ({activeFiscalProfile?.serieRectificadaOrdinaria || "RECT-"})</option>
                  </select>
                  <input
                    type="number"
                    className={styles.conceptInputText}
                    style={{ width: "80px", textAlign: "center" }}
                    value={activeInvoiceEdit.number}
                    disabled={activeInvoiceEdit.isExisting}
                    onChange={(e) => setActiveInvoiceEdit({ ...activeInvoiceEdit, number: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            {/* Rectificativa alert box */}
            {activeInvoiceEdit.isRectificativa && (
              <div className={styles.rectifyAlertBox} style={{ margin: "14px 0" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Factura Rectificativa / Abono</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "12px" }}>
                    Rectifica a la factura original: <strong>{activeInvoiceEdit.rectifiesInvoiceNumber || "-"}</strong>
                    {activeInvoiceEdit.rectificationReason && (
                      <> · Motivo: <em>{activeInvoiceEdit.rectificationReason}</em></>
                    )}
                  </p>
                </div>
              </div>
            )}

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
                        {formatPrice(c.price * c.quantity)}
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
                <span>{formatPrice(totalSum)}</span>
              </div>
              <div className={styles.invoiceTotalsRow + " " + styles.grand}>
                <span>TOTAL:</span>
                <span>{formatPrice(totalSum)}</span>
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

  const hasDeepLink = isHydrated && typeof window !== "undefined" && (
    window.location.search.includes("appointmentId") ||
    window.location.search.includes("saleId")
  );

  if (loading && hasDeepLink) {
    return (
      <div className={styles.container} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <div style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: 500 }}>
          Cargando caja...
        </div>
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
                    <span className={styles.clientNumberLabel} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span>{selectedItemForPayment.clientNumber}</span>
                      {selectedItemForPayment.nuV && selectedItemForPayment.nuV !== "-" && (
                        <span style={{ 
                          backgroundColor: "rgba(16, 185, 129, 0.12)", 
                          color: "#10b981", 
                          padding: "2px 8px", 
                          borderRadius: "12px", 
                          fontSize: "11px", 
                          fontWeight: 700 
                        }}>
                          NU. V: {selectedItemForPayment.nuV}
                        </span>
                      )}
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
                          <span className={styles.articleActivePrice}>{formatPrice(item.price)}</span>
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
                                    {formatPrice(appt.service?.price)}
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
                                        factura: "",
                                        precio: appt.service?.price || 0,
                                        iva: 0.00,
                                        irpf: 0.00,
                                        total: appt.service?.price || 0,
                                        pagado: appt.status === "COMPLETED" ? (appt.service?.price || 0) : 0,
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
                                    {formatPrice(appt.service?.price)}
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
                                        factura: "",
                                        precio: appt.service?.price || 0,
                                        iva: 0.00,
                                        irpf: 0.00,
                                        total: appt.service?.price || 0,
                                        pagado: appt.status === "COMPLETED" ? (appt.service?.price || 0) : 0,
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
                  let currentTaxLabel = taxLabel;
                  let taxAmt = 0;
                  let calculatedSubtotal = totalAfterDiscount;

                  if (isSelfEmployed) {
                    currentTaxLabel = "IRPF";
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
                        <span>{formatPrice(calculatedSubtotal)}</span>
                      </div>

                      {checkoutDiscount && (
                        <div className={styles.totalItemRow}>
                          <span>Descuento</span>
                          <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}>
                            - {formatPrice(discountAmt)}
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
                        <span>{currentTaxLabel}</span>
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
                            {isSelfEmployed ? `0% / ${formatPrice(0)}` : `${checkoutIva}% / ${formatPrice(taxAmt)}`}
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
                        <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{formatPrice(totalAfterDiscount)}</strong>
                      </div>

                      {/* Partial payment entries */}
                      {partialPayments.map((pp) => (
                        <div key={pp.id} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "6px 0", borderBottom: "1px dashed var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-primary)" }}>
                            <span>{pp.voucherName ? `Bono: "${pp.voucherName}"` : pp.method} ({pp.date})</span>
                            <span style={{ fontWeight: 600 }}>{formatPrice(pp.amount)}</span>
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
                                        toast.error("Error al eliminar el pago de la base de datos.");
                                        return;
                                      }
                                    } catch (err) {
                                      console.error("Error deleting sale:", err);
                                      toast.error("Error al eliminar el pago de la base de datos.");
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
                                    toast.success("Pago eliminado correctamente.");
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
                            <span style={{ fontWeight: 600 }}>{formatPrice(totalAfterDiscount)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              type="button"
                              className={styles.iconMiniBtn}
                              title="Ver detalles"
                              onClick={() => alert(`Detalles del pago:\nMétodo: ${selectedItemForPayment.metodoPago}\nMonto: ${formatPrice(totalAfterDiscount)}\nFecha: ${selectedItemForPayment.fechaPago}`)}
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
                          {formatPrice(restante)}
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

                if (selectedItemForPayment.estado === "PAGADO" && restante <= 0.01) {
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
                          const updatedAppIds = new Set<string>();
                          for (const item of checkoutItems) {
                            if (item.id.startsWith("db-app-")) {
                              const appId = item.id.replace("db-app-", "").split("-srv-")[0];
                              if (updatedAppIds.has(appId)) continue;
                              updatedAppIds.add(appId);
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
                          const updatedAppIds = new Set<string>();
                          for (const item of checkoutItems) {
                            if (item.id.startsWith("db-app-")) {
                              const appId = item.id.replace("db-app-", "").split("-srv-")[0];
                              if (updatedAppIds.has(appId)) continue;
                              updatedAppIds.add(appId);
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
                          const updatedAppIds = new Set<string>();
                          for (const item of checkoutItems) {
                            if (item.id.startsWith("db-app-")) {
                              const appId = item.id.replace("db-app-", "").split("-srv-")[0];
                              if (updatedAppIds.has(appId)) continue;
                              updatedAppIds.add(appId);
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
                      <div 
                        style={{ 
                          position: "relative",
                          display: "flex", 
                          alignItems: "center", 
                          background: "var(--bg-input, #f8fafc)", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm, 8px)", 
                          border: "1px solid var(--border-color, #cbd5e1)", 
                          cursor: "pointer" 
                        }}
                        onClick={() => {
                          if (checkoutDateInputRef.current) {
                            if (typeof checkoutDateInputRef.current.showPicker === "function") {
                              checkoutDateInputRef.current.showPicker();
                            } else {
                              checkoutDateInputRef.current.focus();
                            }
                          }
                        }}
                      >
                        <Icons.Calendar size={16} style={{ marginRight: "8px", color: "var(--text-secondary)", pointerEvents: "none" }} />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", pointerEvents: "none", flex: 1 }}>
                          {(() => {
                            if (!checkoutPaymentDate) return new Date().toLocaleDateString("es-ES");
                            const [y, m, d] = checkoutPaymentDate.split("-").map(Number);
                            if (y && m && d) {
                              return `${d}/${m}/${y}`;
                            }
                            return new Date().toLocaleDateString("es-ES");
                          })()}
                        </span>
                        <input
                          ref={checkoutDateInputRef}
                          type="date"
                          value={checkoutPaymentDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setCheckoutPaymentDate(e.target.value);
                            }
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            opacity: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                        />
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
                        <span className={styles.currencySymbol}>{currencySymbol}</span>
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
                              toast.success("Este cliente no tiene ningún bono activo.");
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
                              const pDateObj = checkoutPaymentDate ? new Date(checkoutPaymentDate + "T12:00:00") : new Date();
                              const formattedPDate = pDateObj.toLocaleDateString("es-ES");
                              setPartialPayments([
                                ...partialPayments,
                                { 
                                  id: `pp-${Date.now()}`, 
                                  method: m.key, 
                                  amount: actualAmt, 
                                  date: formattedPDate,
                                  rawDate: checkoutPaymentDate 
                                }
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
                              const pDateObj = checkoutPaymentDate ? new Date(checkoutPaymentDate + "T12:00:00") : new Date();
                              const formattedPDate = pDateObj.toLocaleDateString("es-ES");
                              setPartialPayments([
                                ...partialPayments,
                                { 
                                  id: `pp-${Date.now()}`, 
                                  method: "Otro", 
                                  amount: actualAmt, 
                                  date: formattedPDate,
                                  rawDate: checkoutPaymentDate 
                                }
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
                        const pDateObj = checkoutPaymentDate ? new Date(checkoutPaymentDate + "T12:00:00") : new Date();
                        const formattedPDate = pDateObj.toLocaleDateString("es-ES");
                        setPartialPayments([
                          ...partialPayments,
                          { 
                            id: `pp-${Date.now()}`, 
                            method, 
                            amount: actualAmt, 
                            date: formattedPDate,
                            rawDate: checkoutPaymentDate 
                          }
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
          {showEditServiceModal && typeof window !== "undefined" && createPortal(
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
            </div>,
            document.body
          )}

          {/* Premium Discount Modal */}
          {showDiscountModal && typeof window !== "undefined" && createPortal(
            <div className={styles.modalOverlay} onClick={() => setShowDiscountModal(false)}>
              <div className={`${styles.modalBox} ${styles.discountModalBox}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.discountModalHeader}>
                  <div className={styles.discountHeaderTitleGroup}>
                    <div className={styles.discountHeaderIconBadge}>
                      <Icons.Percent size={20} />
                    </div>
                    <div>
                      <h3 className={styles.discountModalTitle}>Aplicar Descuento</h3>
                      <p className={styles.discountModalSubtitle}>
                        {selectedItemForPayment
                          ? `Para: ${(selectedItemForPayment as any)?.name || (selectedItemForPayment as any)?.detalle}`
                          : "Aplica un descuento a la venta actual"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.discountModalCloseBtn}
                    onClick={() => setShowDiscountModal(false)}
                    aria-label="Cerrar"
                  >
                    <Icons.Plus size={18} style={{ transform: "rotate(45deg)" }} />
                  </button>
                </div>

                {/* Body */}
                <div className={styles.discountModalBody}>
                  {/* Segmented Type Selector */}
                  <div className={styles.discountTypeSegmented}>
                    <button
                      type="button"
                      className={`${styles.discountSegmentBtn} ${discountModalType === "percentage" ? styles.discountSegmentActive : ""}`}
                      onClick={() => setDiscountModalType("percentage")}
                    >
                      <Icons.Percent size={15} />
                      <span>Porcentaje (%)</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.discountSegmentBtn} ${discountModalType === "fixed" ? styles.discountSegmentActive : ""}`}
                      onClick={() => setDiscountModalType("fixed")}
                    >
                      <Icons.Euro size={15} />
                      <span>Monto Fijo (€)</span>
                    </button>
                  </div>

                  {/* Preset Pills */}
                  {discountModalType === "percentage" && (
                    <div className={styles.discountPresetsRow}>
                      {[5, 10, 15, 20, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`${styles.discountPresetBadge} ${discountModalValue === String(preset) ? styles.discountPresetActive : ""}`}
                          onClick={() => setDiscountModalValue(String(preset))}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Numeric Input */}
                  <div className={styles.discountInputGroup}>
                    <label className={styles.discountInputLabel}>
                      {discountModalType === "percentage" ? "Porcentaje de Descuento" : "Importe de Descuento (€)"}
                    </label>
                    <div className={styles.discountInputWrapper}>
                      <input
                        type="number"
                        min="0"
                        max={discountModalType === "percentage" ? "100" : undefined}
                        step="any"
                        className={styles.discountBigInput}
                        placeholder="0"
                        value={discountModalValue}
                        onChange={(e) => setDiscountModalValue(e.target.value)}
                        autoFocus
                      />
                      <span className={styles.discountInputSuffix}>
                        {discountModalType === "percentage" ? "%" : "€"}
                      </span>
                    </div>
                  </div>

                  {/* Live Calculation Preview */}
                  {selectedItemForPayment && (
                    <div className={styles.discountSummaryCard}>
                      <div className={styles.discountSummaryRow}>
                        <span>Precio original:</span>
                        <span className={styles.discountOriginalPrice}>{selectedItemForPayment.price.toFixed(2)} €</span>
                      </div>
                      {Boolean(discountModalValue) && parseFloat(discountModalValue) > 0 && (
                        <>
                          <div className={styles.discountSummaryRow}>
                            <span>Descuento ({discountModalType === "percentage" ? `${discountModalValue}%` : "Fijo"}):</span>
                            <span className={styles.discountAppliedAmount}>
                              -{(() => {
                                const val = parseFloat(discountModalValue) || 0;
                                let amt = discountModalType === "percentage"
                                  ? (selectedItemForPayment.price * val) / 100
                                  : val;
                                return Math.min(amt, selectedItemForPayment.price).toFixed(2);
                              })()} €
                            </span>
                          </div>
                          <div className={styles.discountDivider} />
                          <div className={`${styles.discountSummaryRow} ${styles.discountFinalRow}`}>
                            <span>Precio final:</span>
                            <span className={styles.discountFinalPrice}>
                              {(() => {
                                const val = parseFloat(discountModalValue) || 0;
                                let amt = discountModalType === "percentage"
                                  ? (selectedItemForPayment.price * val) / 100
                                  : val;
                                amt = Math.min(amt, selectedItemForPayment.price);
                                return Math.max(0, selectedItemForPayment.price - amt).toFixed(2);
                              })()} €
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className={styles.discountModalFooter}>
                  <button
                    type="button"
                    className={styles.discountBtnSecondary}
                    onClick={() => setShowDiscountModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.discountBtnPrimary}
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
                    <Icons.Check size={16} />
                    <span>Aplicar Descuento</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Voucher Selection Modal */}
          {showVoucherSelectionModal && typeof window !== "undefined" && createPortal(
            <div className={styles.modalOverlay} onClick={() => setShowVoucherSelectionModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: "450px", margin: "auto", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
            </div>,
            document.body
          )}

          {/* Budget Selection Modal */}
          {showBudgetSelectionModal && typeof window !== "undefined" && createPortal(
            <div className={styles.modalOverlay} onClick={() => setShowBudgetSelectionModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: "450px", margin: "auto", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
                            PRE-{b.budgetNumber}: {b.title} (Saldo: {formatPrice(b.remainingAmount)})
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
            </div>,
            document.body
          )}

          {/* Add Article Modal - Selecciona el servicio popup */}

          {showAddArticleModal && typeof window !== "undefined" && createPortal(
            <div className={styles.modalOverlay} onClick={() => setShowAddArticleModal(false)}>
              <div className={styles.modalBox} style={{ maxWidth: "520px", padding: 0, overflow: "hidden", borderRadius: "16px", border: "1px solid var(--border-color)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", margin: "auto", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.modalHeader} style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-panel-solid)" }}>
                  <div>
                    <h3 className={styles.modalTitle} style={{ fontWeight: 700, fontSize: "17px", color: "var(--text-primary)", margin: 0 }}>
                      Añadir Artículo a la Venta
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                      Selecciona un servicio o producto para incorporar a la cuenta
                    </p>
                  </div>
                  <button type="button" className={styles.modalCloseBtn} onClick={() => setShowAddArticleModal(false)}>×</button>
                </div>

                <div className={styles.modalBody} style={{ padding: "20px 24px", overflowY: "auto" }}>
                  {/* Selector de Tipo (Servicio vs Producto) */}
                  <div className={styles.addArticleTabs} style={{ display: "flex", gap: "8px", padding: "4px", background: "var(--bg-input)", borderRadius: "10px", marginBottom: "20px" }}>
                    <button
                      type="button"
                      className={addArticleTab === "servicio" ? styles.addArticleTabBtnActive : styles.addArticleTabBtn}
                      onClick={() => setAddArticleTab("servicio")}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                        background: addArticleTab === "servicio" ? "var(--primary)" : "transparent",
                        color: addArticleTab === "servicio" ? "#ffffff" : "var(--text-secondary)",
                        boxShadow: addArticleTab === "servicio" ? "0 2px 8px rgba(15, 118, 110, 0.3)" : "none",
                      }}
                    >
                      <span>⚡ Servicio</span>
                      <span style={{ fontSize: "11px", opacity: 0.9, background: addArticleTab === "servicio" ? "rgba(255,255,255,0.25)" : "var(--border-color)", padding: "2px 7px", borderRadius: "10px" }}>
                        {services.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={addArticleTab === "producto" ? styles.addArticleTabBtnActive : styles.addArticleTabBtn}
                      onClick={() => setAddArticleTab("producto")}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                        background: addArticleTab === "producto" ? "var(--primary)" : "transparent",
                        color: addArticleTab === "producto" ? "#ffffff" : "var(--text-secondary)",
                        boxShadow: addArticleTab === "producto" ? "0 2px 8px rgba(15, 118, 110, 0.3)" : "none",
                      }}
                    >
                      <span>📦 Producto</span>
                      <span style={{ fontSize: "11px", opacity: 0.9, background: addArticleTab === "producto" ? "rgba(255,255,255,0.25)" : "var(--border-color)", padding: "2px 7px", borderRadius: "10px" }}>
                        {productsList.length}
                      </span>
                    </button>
                  </div>

                  {/* Tab Contenido: Servicio */}
                  {addArticleTab === "servicio" && (
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel} style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>
                        Selecciona el servicio
                      </label>
                      <select
                        className="input select"
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        style={{ width: "100%", marginTop: "8px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel-solid)", color: "var(--text-primary)", fontSize: "14px" }}
                      >
                        <option value="">Seleccionar un servicio...</option>
                        {services.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.name} — {formatPrice(srv.price)} {srv.category ? `(${srv.category})` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Card Preview Servicio */}
                      {(() => {
                        const srv = services.find((s) => s.id === selectedServiceId);
                        if (!srv) return null;
                        return (
                          <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "rgba(15, 118, 110, 0.06)", border: "1px solid rgba(15, 118, 110, 0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{srv.name}</div>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                {srv.category ? `Categoría: ${srv.category} • ` : ""}{srv.duration ? `Duración: ${srv.duration} min` : ""}
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--primary)" }}>
                              {formatPrice(srv.price)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tab Contenido: Producto */}
                  {addArticleTab === "producto" && (
                    <div className={styles.formField}>
                      <label className={styles.formFieldLabel} style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>
                        Selecciona el producto
                      </label>
                      {productsList.length === 0 ? (
                        <div style={{ marginTop: "8px", padding: "16px", textAlign: "center", background: "var(--bg-input)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "13px" }}>
                          No hay productos registrados en esta clínica. Puedes crearlos en Almacén o Configuración.
                        </div>
                      ) : (
                        <select
                          className="input select"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          style={{ width: "100%", marginTop: "8px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel-solid)", color: "var(--text-primary)", fontSize: "14px" }}
                        >
                          <option value="">Seleccionar un producto...</option>
                          {productsList.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} — {formatPrice(prod.price)} {prod.hasStock ? `(Stock: ${prod.stock})` : ""}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Card Preview Producto */}
                      {(() => {
                        const prod = productsList.find((p) => p.id === selectedProductId);
                        if (!prod) return null;
                        return (
                          <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "rgba(15, 118, 110, 0.06)", border: "1px solid rgba(15, 118, 110, 0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{prod.name}</div>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                IVA: {prod.vat || 21}% {prod.hasStock ? `• Stock disponible: ${prod.stock}` : ""}
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--primary)" }}>
                              {formatPrice(prod.price)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className={styles.modalFooter} style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border-color)", padding: "16px 24px", background: "var(--bg-panel-solid)" }}>
                  <button
                    type="button"
                    className={styles.btnModalSecondary}
                    onClick={() => {
                      setShowAddArticleModal(false);
                      setSelectedServiceId("");
                      setSelectedProductId("");
                    }}
                    style={{ border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", borderRadius: "8px", padding: "10px 18px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.btnModalPrimary}
                    disabled={addArticleTab === "servicio" ? !selectedServiceId : !selectedProductId}
                    style={{
                      background: "var(--primary)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: (addArticleTab === "servicio" ? selectedServiceId : selectedProductId) ? "pointer" : "not-allowed",
                      opacity: (addArticleTab === "servicio" ? selectedServiceId : selectedProductId) ? 1 : 0.5,
                      boxShadow: (addArticleTab === "servicio" ? selectedServiceId : selectedProductId) ? "0 4px 12px rgba(15, 118, 110, 0.3)" : "none",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => {
                      if (!selectedItemForPayment) return;

                      if (addArticleTab === "servicio") {
                        const srv = services.find((s) => s.id === selectedServiceId);
                        if (srv) {
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
                            factura: "",
                            precio: srv.price,
                            iva: 0,
                            irpf: 0,
                            total: srv.price,
                            pagado: 0,
                            checkoutGroupId: selectedItemForPayment.checkoutGroupId,
                          };
                          setCheckoutItems([...checkoutItems, newArticleItem]);
                          setSelectedServiceId("");
                          setShowAddArticleModal(false);
                        }
                      } else {
                        const prod = productsList.find((p) => p.id === selectedProductId);
                        if (prod) {
                          const newArticleItem: ArticleItem = {
                            id: `custom-prod-${Date.now()}`,
                            refMov: `#PROD-${Date.now().toString().slice(-4)}`,
                            nuV: "-",
                            fecha: new Date().toLocaleDateString("es-ES"),
                            fechaRaw: new Date(),
                            hora: "-",
                            tipo: "Producto",
                            detalle: prod.name,
                            clientNumber: selectedItemForPayment.clientNumber,
                            cliente: selectedItemForPayment.cliente,
                            clientId: selectedItemForPayment.clientId,
                            dni: selectedItemForPayment.dni,
                            empleado: "Venta Directa",
                            consulta: activeClinic?.name || "Clifav Central",
                            estado: "PENDIENTE",
                            metodoPago: "-",
                            fechaPago: "-",
                            price: prod.price,
                            factura: "",
                            precio: prod.price,
                            iva: prod.vat || 21,
                            irpf: 0,
                            total: prod.price,
                            pagado: 0,
                            checkoutGroupId: selectedItemForPayment.checkoutGroupId,
                          };
                          setCheckoutItems([...checkoutItems, newArticleItem]);
                          setSelectedProductId("");
                          setShowAddArticleModal(false);
                        }
                      }
                    }}
                  >
                    Añadir a venta
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Tipo de pagos side drawer */}
          {typeof window !== "undefined" && createPortal(
            <>
              <div className={`${styles.posDrawerOverlay} ${showPaymentMethodsDrawer ? styles.posDrawerOverlayOpen : ""}`} onClick={() => setShowPaymentMethodsDrawer(false)} style={{ zIndex: 99998 }} />
              <div className={`${styles.posDrawer} ${showPaymentMethodsDrawer ? styles.posDrawerOpen : ""}`} style={{ zIndex: 99999 }}>
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
                          toast.success("Este método de pago ya existe.");
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
            </>,
            document.body
          )}
        </div>
      ) : (
        <>
          {/* Top dashboard header panel */}
          <header className={styles.toolbar} style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "10px" }}>
            <div>
              {/* Breadcrumb / Category Badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-input)", border: "1px solid var(--border-color)", padding: "2px 8px", borderRadius: "14px", marginBottom: "4px" }}>
                <span>Gestión Interna</span>
                <span style={{ opacity: 0.4 }}>/</span>
                <span style={{ color: "var(--primary)", fontWeight: 700 }}>Ventas & Cobros</span>
              </div>

              {/* Main Title */}
              <h1 style={{ fontSize: "19px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                Gestión de Ventas
              </h1>

              {/* Subtitle / Clinic Pill */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>📍</span> {activeClinic?.name || "Clifav Central"}
                </span>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Caja activa</span>
              </div>
            </div>

            {/* Header Right Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--bg-panel-solid)", border: "1px solid var(--border-color)", padding: "0 12px", height: "32px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", boxShadow: "0 1px 4px rgba(0,0,0,0.02)", boxSizing: "border-box" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{new Date().toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
            </div>
          </header>

          {/* ============================
              PREMIUM SALES KPI PANEL
              ============================ */}
          {(() => {
            const artList = getArticlesList();
            const totalVolumen = artList.reduce((s, i) => s + i.price, 0);
            const totalPagado = artList.filter(i => i.estado === "PAGADO" || i.estado === "GRATUITO").reduce((s, i) => s + i.pagado, 0);
            const totalPendiente = artList.filter(i => i.estado === "PENDIENTE").reduce((s, i) => s + i.total, 0);
            // Most used method
            const metodoCounts: Record<string, number> = {};
            artList.forEach(i => { if (i.metodoPago && i.metodoPago !== "-") metodoCounts[i.metodoPago] = (metodoCounts[i.metodoPago] || 0) + 1; });
            const topMethodEntry = Object.entries(metodoCounts).sort((a, b) => b[1] - a[1])[0];
            const topMethod = topMethodEntry?.[0] || "—";
            const topMethodCount = topMethodEntry?.[1] || 0;
            const cobradosCount = artList.filter(i => i.estado === "PAGADO" || i.estado === "GRATUITO").length;
            const pendientesCount = artList.filter(i => i.estado === "PENDIENTE").length;

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "14px", width: "100%", boxSizing: "border-box" }}>
                {/* Ingresos Totales */}
                <div
                  style={{
                    background: "var(--bg-panel-solid)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.03)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(14,165,233,0.25)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ingresos Totales</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "1px 0" }}>
                      {formatPrice(totalVolumen)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {artList.length} artículo{artList.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Total Cobrado */}
                <div
                  style={{
                    background: "var(--bg-panel-solid)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.03)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(16,185,129,0.25)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Cobrado</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#059669", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "1px 0" }}>
                      {formatPrice(totalPagado)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {cobradosCount} cobrados {artList.length > 0 ? `(${Math.round((cobradosCount / artList.length) * 100)}%)` : ""}
                    </div>
                  </div>
                </div>

                {/* Pendiente */}
                <div
                  style={{
                    background: "var(--bg-panel-solid)",
                    border: totalPendiente > 0 ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: totalPendiente > 0 ? "0 2px 8px -2px rgba(245, 158, 11, 0.08)" : "0 2px 8px -2px rgba(0, 0, 0, 0.03)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(245,158,11,0.25)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pendiente</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: totalPendiente > 0 ? "#d97706" : "var(--text-primary)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "1px 0" }}>
                      {formatPrice(totalPendiente)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {pendientesCount} sin cobrar
                    </div>
                  </div>
                </div>

                {/* Método + Usado */}
                <div
                  style={{
                    background: "var(--bg-panel-solid)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.03)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(139,92,246,0.25)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Método + Usado</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "1px 0" }}>
                      {topMethod}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {topMethodCount} operaciones
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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
                ? t("tabArticles")
                : tab === "facturas"
                ? t("tabInvoices")
                : tab === "pagos"
                ? t("tabPayments")
                : tab === "resumen"
                ? t("tabSummary")
                : tab === "ingresos_gastos"
                ? t("tabIncomeExpenses")
                : t("tabBudgets")}
            </button>
          ))}
      </div>

      {/* MAIN SALES DASHBOARD VIEWPORT */}
      <div className="glass" style={{ padding: "14px 16px", borderRadius: "10px", width: "100%", boxSizing: "border-box" }}>
        {/* SUB-TABS (Facturas only) */}
        {activeTab === "facturas" && (
          <div className={styles.subTabsHeader}>
            <button
              className={`${styles.subTabBtn} ${activeSubTab === "emitidas" ? styles.subTabBtnActive : ""}`}
              onClick={() => setActiveSubTab("emitidas")}
            >
              {t("timezone") === "Time Zone" ? "Issued" : t("timezone") === "Zona horària" ? "Emeses" : t("timezone") === "Ordu-eremua" ? "Igorritakoak" : "Emitidas"}
            </button>
            <button
              className={`${styles.subTabBtn} ${activeSubTab === "recibidas" ? styles.subTabBtnActive : ""}`}
              onClick={() => setActiveSubTab("recibidas")}
            >
              {t("timezone") === "Time Zone" ? "Received" : t("timezone") === "Zona horària" ? "Rebudes" : t("timezone") === "Ordu-eremua" ? "Jasotakoak" : "Recibidas"}
            </button>
          </div>
        )}

        {/* FILTERS AREA */}
        <div className={styles.filterBar} ref={datePickerRef} style={{ position: "relative" }}>
          <button
            type="button"
            className={styles.filterBtn}
            onClick={() => {
              setShowFilterDropdown(!showFilterDropdown);
            }}
            style={showFilterDropdown ? { borderColor: "#009bb3", color: "#009bb3" } : undefined}
          >
            <Icons.Filter size={16} />
            <span>{t("filter")}</span>
          </button>

          {/* ACTIVE FILTER BADGES */}
          {dateFilterStart && dateFilterEnd && (
            <div
              className={styles.filterTagBadge}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setShowFilterDropdown(true);
                setActiveFilterOption(activeTab === "facturas" ? "fechaPagos" : "fechaArticulos");
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

          {selectedClients.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.Users size={12} />
              <span>CLIENTE: {selectedClients.length === 1 ? selectedClients[0] : `${selectedClients.length} selec.`}</span>
              <button onClick={() => setSelectedClients([])}>×</button>
            </div>
          )}

          {selectedDirecciones.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.MapPin size={12} />
              <span>DIRECCIÓN: {selectedDirecciones.length === 1 ? selectedDirecciones[0] : `${selectedDirecciones.length} selec.`}</span>
              <button onClick={() => setSelectedDirecciones([])}>×</button>
            </div>
          )}

          {selectedEmpleados.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.Users size={12} />
              <span>EMPLEADO: {selectedEmpleados.length === 1 ? selectedEmpleados[0] : `${selectedEmpleados.length} selec.`}</span>
              <button onClick={() => setSelectedEmpleados([])}>×</button>
            </div>
          )}

          {selectedTipos.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.Settings size={12} />
              <span>TIPO: {selectedTipos.join(", ")}</span>
              <button onClick={() => setSelectedTipos([])}>×</button>
            </div>
          )}

          {selectedEstadosPago.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.DollarCircle size={12} />
              <span>ESTADO PAGO: {selectedEstadosPago.length === 1 ? selectedEstadosPago[0] : `${selectedEstadosPago.length} selec.`}</span>
              <button onClick={() => setSelectedEstadosPago([])}>×</button>
            </div>
          )}

          {selectedEstadosCita.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.Calendar size={12} />
              <span>ESTADO CITA: {selectedEstadosCita.length === 1 ? (selectedEstadosCita[0] === "COMPLETED" ? "Completada" : selectedEstadosCita[0] === "PENDING" ? "Pendiente" : "Confirmada") : `${selectedEstadosCita.length} selec.`}</span>
              <button onClick={() => setSelectedEstadosCita([])}>×</button>
            </div>
          )}

          {selectedMetodosPago.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.DollarCircle size={12} />
              <span>MÉTODO: {selectedMetodosPago.join(", ")}</span>
              <button onClick={() => setSelectedMetodosPago([])}>×</button>
            </div>
          )}

          {selectedFacturado.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.FileText size={12} />
              <span>FACTURADO: {selectedFacturado.join(", ")}</span>
              <button onClick={() => setSelectedFacturado([])}>×</button>
            </div>
          )}

          {selectedServicios.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.Settings size={12} />
              <span>SERVICIOS: {selectedServicios.length === 1 ? selectedServicios[0] : `${selectedServicios.length} selec.`}</span>
              <button onClick={() => setSelectedServicios([])}>×</button>
            </div>
          )}

          {selectedEtiquetas.length > 0 && (
            <div className={styles.filterTagBadge}>
              <Icons.Settings size={12} />
              <span>ETIQUETAS: {selectedEtiquetas.join(", ")}</span>
              <button onClick={() => setSelectedEtiquetas([])}>×</button>
            </div>
          )}

          {invoiceSearchQuery && (
            <div className={styles.filterTagBadge}>
              <Icons.Search size={12} />
              <span>FACTURA: {invoiceSearchQuery}</span>
              <button onClick={() => setInvoiceSearchQuery("")}>×</button>
            </div>
          )}

          {/* Cascade Filter Popover */}
          {showFilterDropdown && (
            <div className={styles.cascadeFilterPopover}>
              {/* Left Column: Menu list */}
              <div className={styles.cascadeFilterLeftCol}>
                {[
                  { key: "fechaArticulos", label: "Fecha(Artículos)", icon: <Icons.Calendar size={16} /> },
                  { key: "fechaPagos", label: "Fecha (Pagos)", icon: <Icons.Calendar size={16} /> },
                  { key: "cliente", label: "Cliente", icon: <Icons.Users size={16} /> },
                  { key: "direccion", label: "Dirección", icon: <Icons.MapPin size={16} /> },
                  { key: "empleado", label: "Empleado", icon: <Icons.Users size={16} /> },
                  { key: "tipo", label: "Tipo", icon: <Icons.Settings size={16} /> },
                  { key: "etiquetas", label: "Etiquetas de cita", icon: <Icons.Settings size={16} /> },
                  { key: "estadoPago", label: "Estado de pago", icon: <Icons.DollarCircle size={16} /> },
                  { key: "estadoCita", label: "Estado de cita", icon: <Icons.Calendar size={16} /> },
                  { key: "metodoPago", label: "Método de pago", icon: <Icons.DollarCircle size={16} /> },
                  { key: "facturado", label: "Facturado", icon: <Icons.FileText size={16} /> },
                  { key: "servicios", label: "Servicios", icon: <Icons.Settings size={16} /> },
                  { key: "buscarFactura", label: "Buscar factura", icon: <Icons.Search size={16} /> }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`${styles.cascadeFilterItem} ${activeFilterOption === opt.key ? styles.cascadeFilterItemActive : ""}`}
                    onClick={() => setActiveFilterOption(opt.key)}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {opt.icon}
                      {opt.label}
                    </span>
                    <Icons.ChevronRight size={14} style={{ opacity: 0.6 }} />
                  </button>
                ))}
              </div>

              {/* Right Column: Sub-menu filter content */}
              <div
                className={styles.cascadeFilterRightCol}
                style={{
                  width: (activeFilterOption === "fechaArticulos" || activeFilterOption === "fechaPagos") ? "620px" : "320px"
                }}
              >
                {/* 1. Date Range picker (Fecha Artículos & Fecha Pagos) */}
                {(activeFilterOption === "fechaArticulos" || activeFilterOption === "fechaPagos") && (
                  <div>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Calendar size={16} />
                      {activeFilterOption === "fechaArticulos" ? "Fecha(Artículos)" : "Fecha (Pagos)"}
                    </h3>
                    <div className="form-group" style={{ marginBottom: "8px" }}>
                      <label className="form-label" style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "11px", marginBottom: "4px" }}>Rango de fechas</label>
                      <select
                        className="input select"
                        value={pickerPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        style={{ width: "100%", height: "28px", padding: "2px 8px", fontSize: "12px" }}
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

                    {pickerPreset === "personalizado" && (
                      <div>
                        <div className={styles.pickerInputsRow}>
                          <div className="form-group" style={{ flex: 1, marginBottom: "4px" }}>
                            <label className="form-label" style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Inicio</label>
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
                            <label className="form-label" style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Final</label>
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

                          <div className={styles.gridsContainer}>
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
                        onClick={() => {
                          setShowFilterDropdown(false);
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={styles.btnApply}
                        onClick={() => {
                          if (pickerStart && pickerEnd && pickerEnd < pickerStart) {
                            toast.warning("La fecha final no puede ser anterior a la fecha de inicio.");
                            return;
                          }
                          setDateFilterStart(pickerStart);
                          setDateFilterEnd(pickerEnd);
                          setShowFilterDropdown(false);
                        }}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Client filter */}
                {activeFilterOption === "cliente" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Users size={16} />
                      Cliente
                    </h3>
                    <div className={styles.subFilterSearchWrapper}>
                      <Icons.Search size={14} className={styles.subFilterSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.subFilterSearchInput}
                        value={clientSearchText}
                        onChange={(e) => setClientSearchText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFilterCheckboxList}>
                      {[...new Set(clients.map(c => `${c.firstName} ${c.lastName || ""}`.trim()).filter(Boolean))].sort()
                        .filter(name => name.toLowerCase().includes(clientSearchText.toLowerCase()))
                        .map(name => {
                          const isChecked = selectedClients.includes(name);
                          return (
                            <label key={name} className={styles.subFilterCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedClients(selectedClients.filter(c => c !== name));
                                  } else {
                                    setSelectedClients([...selectedClients, name]);
                                  }
                                }}
                              />
                              <span>{name}</span>
                            </label>
                          );
                        })
                      }
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 3. Address/Dirección filter */}
                {activeFilterOption === "direccion" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.MapPin size={16} />
                      Dirección
                    </h3>
                    <div className={styles.subFilterSearchWrapper}>
                      <Icons.Search size={14} className={styles.subFilterSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.subFilterSearchInput}
                        value={direccionSearchText}
                        onChange={(e) => setDireccionSearchText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFilterCheckboxList}>
                      {["Medicina Estética del Mediterráneo", activeClinic?.name || "Clifav Central"].filter(Boolean).sort()
                        .filter(name => name.toLowerCase().includes(direccionSearchText.toLowerCase()))
                        .map(name => {
                          const isChecked = selectedDirecciones.includes(name);
                          return (
                            <label key={name} className={styles.subFilterCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedDirecciones(selectedDirecciones.filter(d => d !== name));
                                  } else {
                                    setSelectedDirecciones([...selectedDirecciones, name]);
                                  }
                                }}
                              />
                              <span>{name}</span>
                            </label>
                          );
                        })
                      }
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 4. Employee filter */}
                {activeFilterOption === "empleado" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Users size={16} />
                      Empleado
                    </h3>
                    <div className={styles.subFilterSearchWrapper}>
                      <Icons.Search size={14} className={styles.subFilterSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.subFilterSearchInput}
                        value={empleadoSearchText}
                        onChange={(e) => setEmpleadoSearchText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFilterCheckboxList}>
                      {[...new Set(appointments.map(a => a.user?.name).concat(salesHistory.map(s => "Recepción")).filter(Boolean))].sort()
                        .filter(name => name.toLowerCase().includes(empleadoSearchText.toLowerCase()))
                        .map(name => {
                          const isChecked = selectedEmpleados.includes(name);
                          return (
                            <label key={name} className={styles.subFilterCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedEmpleados(selectedEmpleados.filter(e => e !== name));
                                  } else {
                                    setSelectedEmpleados([...selectedEmpleados, name]);
                                  }
                                }}
                              />
                              <span>{name}</span>
                            </label>
                          );
                        })
                      }
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 5. Tipo filter */}
                {activeFilterOption === "tipo" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Settings size={16} />
                      Tipo
                    </h3>
                    <div className={styles.subFilterCheckboxList}>
                      {["Servicio", "Producto", "Bono"].map(type => {
                        const isChecked = selectedTipos.includes(type);
                        return (
                          <label key={type} className={styles.subFilterCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedTipos(selectedTipos.filter(t => t !== type));
                                } else {
                                  setSelectedTipos([...selectedTipos, type]);
                                }
                              }}
                            />
                            <span>{type}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 6. Etiquetas filter */}
                {activeFilterOption === "etiquetas" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Settings size={16} />
                      Etiquetas de cita
                    </h3>
                    <div className={styles.subFilterSearchWrapper}>
                      <Icons.Search size={14} className={styles.subFilterSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.subFilterSearchInput}
                        value={tagSearchText}
                        onChange={(e) => setTagSearchText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFilterCheckboxList}>
                      {availableTags
                        .filter(tag => tag.name.toLowerCase().includes(tagSearchText.toLowerCase()))
                        .map(tag => {
                          const isChecked = selectedEtiquetas.includes(tag.name);
                          return (
                            <label key={tag.name} className={styles.subFilterCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedEtiquetas(selectedEtiquetas.filter(t => t !== tag.name));
                                  } else {
                                    setSelectedEtiquetas([...selectedEtiquetas, tag.name]);
                                  }
                                }}
                              />
                              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{
                                  display: "inline-block",
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  backgroundColor: tag.color || "gray"
                                }} />
                                {tag.name}
                              </span>
                            </label>
                          );
                        })
                      }
                      {availableTags.length === 0 && (
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No hay etiquetas disponibles</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 7. Estado de pago filter */}
                {activeFilterOption === "estadoPago" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.DollarCircle size={16} />
                      Estado de pago
                    </h3>
                    <div className={styles.subFilterCheckboxList}>
                      {[
                        { val: "PAGADO", label: "Pagado" },
                        { val: "PENDIENTE", label: "No pagado / Pendiente" },
                        { val: "PAGO PARCIAL", label: "Pago parcial" },
                        { val: "GRATUITO", label: "Gratuito" }
                      ].map(st => {
                        const isChecked = selectedEstadosPago.includes(st.val);
                        return (
                          <label key={st.val} className={styles.subFilterCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedEstadosPago(selectedEstadosPago.filter(e => e !== st.val));
                                } else {
                                  setSelectedEstadosPago([...selectedEstadosPago, st.val]);
                                }
                              }}
                            />
                            <span>{st.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 8. Estado de cita filter */}
                {activeFilterOption === "estadoCita" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Calendar size={16} />
                      Estado de cita
                    </h3>
                    <div className={styles.subFilterCheckboxList}>
                      {[
                        { val: "PENDING", label: "Pendiente" },
                        { val: "CONFIRMED", label: "Confirmada" },
                        { val: "COMPLETED", label: "Completada" },
                        { val: "CANCELLED", label: "Cancelada" }
                      ].map(st => {
                        const isChecked = selectedEstadosCita.includes(st.val);
                        return (
                          <label key={st.val} className={styles.subFilterCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedEstadosCita(selectedEstadosCita.filter(e => e !== st.val));
                                } else {
                                  setSelectedEstadosCita([...selectedEstadosCita, st.val]);
                                }
                              }}
                            />
                            <span>{st.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 9. Método de pago filter */}
                {activeFilterOption === "metodoPago" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.DollarCircle size={16} />
                      Método de pago
                    </h3>
                    <div className={styles.subFilterCheckboxList}>
                      {["Efectivo", "Tarjeta", "Transferencia", "Bono", "Monedero"].map(method => {
                        const isChecked = selectedMetodosPago.includes(method);
                        return (
                          <label key={method} className={styles.subFilterCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedMetodosPago(selectedMetodosPago.filter(m => m !== method));
                                } else {
                                  setSelectedMetodosPago([...selectedMetodosPago, method]);
                                }
                              }}
                            />
                            <span>{method}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 10. Facturado filter */}
                {activeFilterOption === "facturado" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.FileText size={16} />
                      Facturado
                    </h3>
                    <div className={styles.subFilterCheckboxList}>
                      {[
                        { val: "Si", label: "Facturado (Sí)" },
                        { val: "No", label: "No facturado (No)" }
                      ].map(f => {
                        const isChecked = selectedFacturado.includes(f.val);
                        return (
                          <label key={f.val} className={styles.subFilterCheckboxLabel}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedFacturado(selectedFacturado.filter(v => v !== f.val));
                                } else {
                                  setSelectedFacturado([...selectedFacturado, f.val]);
                                }
                              }}
                            />
                            <span>{f.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 11. Servicios filter */}
                {activeFilterOption === "servicios" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Settings size={16} />
                      Servicios
                    </h3>
                    <div className={styles.subFilterSearchWrapper}>
                      <Icons.Search size={14} className={styles.subFilterSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.subFilterSearchInput}
                        value={servicioSearchText}
                        onChange={(e) => setServicioSearchText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFilterCheckboxList}>
                      {services.map(s => s.name).sort()
                        .filter(name => name.toLowerCase().includes(servicioSearchText.toLowerCase()))
                        .map(name => {
                          const isChecked = selectedServicios.includes(name);
                          return (
                            <label key={name} className={styles.subFilterCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedServicios(selectedServicios.filter(s => s !== name));
                                  } else {
                                    setSelectedServicios([...selectedServicios, name]);
                                  }
                                }}
                              />
                              <span>{name}</span>
                            </label>
                          );
                        })
                      }
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* 12. Buscar factura filter */}
                {activeFilterOption === "buscarFactura" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <h3 className={styles.subFilterTitle}>
                      <Icons.Search size={16} />
                      Buscar factura
                    </h3>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <input
                        type="text"
                        placeholder="Introduce nº de factura..."
                        className="input"
                        value={invoiceSearchQuery}
                        onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "10px", fontSize: "13px" }}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.subFilterCloseBtn}
                      onClick={() => setShowFilterDropdown(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "ingresos_gastos" && (
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Concepto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          {activeTab === "articulos" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Opciones Dropdown */}
              <div className={styles.dropdownWrapper} ref={optionsRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 12px", fontSize: "12px", fontWeight: 600, borderRadius: "8px", borderColor: "var(--border-color)", background: "#ffffff", color: "var(--text-primary)" }}
                  onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                >
                  <span>Opciones</span>
                  <Icons.ChevronDown size={14} />
                </button>

                {showOptionsDropdown && (
                  <div
                    className="options-dropdown-menu"
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "6px",
                      background: "#ffffff",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 999,
                      minWidth: "180px",
                      overflow: "hidden",
                    }}
                  >
                    {selectedRowIds.length > 0 && (
                      <div
                        className="options-dropdown-item"
                        style={{
                          padding: "10px 16px",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: "var(--text-primary)",
                          borderBottom: "1px solid var(--border-color)",
                          transition: "background 0.2s",
                        }}
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          const selectedItems = getArticlesList().filter(item => selectedRowIds.includes(item.id));
                          handleCreateInvoiceForArticles(selectedItems);
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Nueva Factura
                      </div>
                    )}
                    <div
                      className="options-dropdown-item"
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        transition: "background 0.2s",
                      }}
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        handleExportArticlesExcel();
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-input)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      Descargar Excel
                    </div>
                  </div>
                )}
              </div>

              {/* Column selector */}
              <div className={styles.columnSelectorWrapper} ref={columnSelectorRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className={styles.gearBtn}
                  title="Configurar Columnas"
                  onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
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
              <span>{t("timezone") === "Time Zone" ? "Add movement" : "Añadir movimiento"}</span>
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
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {/* Volumen de negocio Card */}
                  <div style={{
                    background: "linear-gradient(135deg, rgba(14, 165, 233, 0.06) 0%, rgba(14, 165, 233, 0.12) 100%)",
                    border: "1px solid rgba(14, 165, 233, 0.25)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: "1 1 130px",
                    minWidth: "120px",
                    boxShadow: "0 2px 4px -1px rgba(14, 165, 233, 0.05)",
                  }}>
                    <span style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                      {t("businessVolume")}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: "#0ea5e9" }}>
                      {formatPrice(stats.volumenNegocio)}
                    </span>
                  </div>

                  {/* Citas Card */}
                  <div style={{
                    background: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: "1 1 130px",
                    minWidth: "120px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)",
                  }}>
                    <span style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                      {t("appointments")}
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {formatPrice(stats.citasSum)} <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: "normal" }}>({stats.citasCount})</span>
                    </span>
                  </div>

                  {/* Bonos Card */}
                  <div style={{
                    background: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: "1 1 130px",
                    minWidth: "120px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)",
                  }}>
                    <span style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                      {t("vouchers")}
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {formatPrice(stats.bonosSum)} <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: "normal" }}>({stats.bonosCount})</span>
                    </span>
                  </div>

                  {/* Productos Card */}
                  <div style={{
                    background: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: "1 1 130px",
                    minWidth: "120px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)",
                  }}>
                    <span style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                      {t("products")}
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {formatPrice(stats.productosSum)} <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: "normal" }}>({stats.productosCount})</span>
                    </span>
                  </div>

                  {/* Suscripciones Card */}
                  <div style={{
                    background: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: "1 1 130px",
                    minWidth: "120px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)",
                  }}>
                    <span style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                      {t("subscriptions")}
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {formatPrice(0)} <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: "normal" }}>(0)</span>
                    </span>
                  </div>

                  {/* Presupuestos Card */}
                  <div style={{
                    background: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    flex: "1 1 130px",
                    minWidth: "120px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.01)",
                  }}>
                    <span style={{ fontSize: "9.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                      {t("budgets")}
                    </span>
                    <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {formatPrice(0)} <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: "normal" }}>(0)</span>
                    </span>
                  </div>
                </div>
              );
            })()}

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
                        {t("colRefMov")} {sortColumn === "refMov" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.nuV && <th>{t("colNuV")}</th>}
                    {visibleColumns.fecha && (
                      <th
                        onClick={() => handleSort("fecha")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("colDate")} {sortColumn === "fecha" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.hora && (
                      <th
                        onClick={() => handleSort("hora")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("colTime")} {sortColumn === "hora" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.tipo && (
                      <th
                        onClick={() => handleSort("tipo")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("colType")} {sortColumn === "tipo" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.detalle && (
                      <th
                        onClick={() => handleSort("detalle")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("colDetail")} {sortColumn === "detalle" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.clientNumber && <th>{t("colClientNum2")}</th>}
                    {visibleColumns.cliente && (
                      <th
                        onClick={() => handleSort("cliente")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("clientCol")} {sortColumn === "cliente" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.dni && <th>{identityLabel}</th>}
                    {visibleColumns.empleado && <th>{t("colEmployee")}</th>}
                    {visibleColumns.consulta && <th>{t("colClinic")}</th>}
                    {visibleColumns.estado && <th>{t("invoiceStatus").toUpperCase()}</th>}
                    {visibleColumns.metodoPago && <th>{t("paymentMethods").toUpperCase()}</th>}
                    {visibleColumns.fechaPago && <th>{t("timezone") === "Time Zone" ? "PAYMENT DATE" : t("timezone") === "Zona horària" ? "DATA DE PAGAMENT" : t("timezone") === "Ordu-eremua" ? "ORDAINKETA DATA" : "FECHA DE PAGO"}</th>}
                    {visibleColumns.factura && (
                      <th
                        onClick={() => handleSort("factura")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("invoiceNumber").toUpperCase()} {sortColumn === "factura" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.precio && (
                      <th
                        onClick={() => handleSort("precio")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("timezone") === "Time Zone" ? "PRICE" : "PRECIO"} {sortColumn === "precio" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.iva && (
                      <th
                        onClick={() => handleSort("iva")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {taxLabel} {sortColumn === "iva" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
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
                        {t("totalLabel").toUpperCase()} {sortColumn === "total" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                    {visibleColumns.pagado && (
                      <th
                        onClick={() => handleSort("pagado")}
                        style={{ cursor: "pointer", userSelect: "none" }}
                      >
                        {t("invoicePaid").toUpperCase()} {sortColumn === "pagado" ? (sortDirection === "asc" ? "▴" : "▾") : "▾"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getArticlesList().length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className={styles.emptyState}>
                        {t("timezone") === "Time Zone" ? "No results found" : t("timezone") === "Zona horària" ? "No s'han trobat resultats" : t("timezone") === "Ordu-eremua" ? "Ez da emaitzarik aurkitu" : "No se encontraron resultados"}
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
            {/* Quick date filter chips & Search/Export toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div className={styles.quickFilterChips}>
                <button
                  type="button"
                  className={`${styles.quickChip} ${pickerPreset === "hoy" ? styles.quickChipActive : ""}`}
                  onClick={() => handleSelectQuickDatePreset("hoy")}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={`${styles.quickChip} ${pickerPreset === "esta_semana" ? styles.quickChipActive : ""}`}
                  onClick={() => handleSelectQuickDatePreset("esta_semana")}
                >
                  Esta semana
                </button>
                <button
                  type="button"
                  className={`${styles.quickChip} ${pickerPreset === "este_mes" ? styles.quickChipActive : ""}`}
                  onClick={() => handleSelectQuickDatePreset("este_mes")}
                >
                  Este mes
                </button>
                <button
                  type="button"
                  className={`${styles.quickChip} ${pickerPreset === "todo" || (!dateFilterStart && !dateFilterEnd) ? styles.quickChipActive : ""}`}
                  onClick={() => handleSelectQuickDatePreset("todo")}
                >
                  Todo el año
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder={activeSubTab === "recibidas" ? "Buscar nº factura, proveedor o CIF..." : "Buscar nº factura, cliente o NIF..."}
                  className={styles.facturasSearchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {activeSubTab === "recibidas" && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      height: "32px",
                      padding: "0 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "8px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => setShowUploadInvoiceModal(true)}
                    title="Subir PDF o foto de factura con escaneo y extracción automática con Inteligencia Artificial"
                  >
                    <IconSparkles size={15} />
                    <span>Subir Factura (IA)</span>
                  </button>
                )}
                {showExcelDownload && (
                  activeSubTab === "recibidas" ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        height: "32px",
                        padding: "0 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        background: "#ffffff",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      onClick={handleExportReceivedInvoicesExcel}
                      title="Exportar Libro Registro de Facturas Recibidas para Gestoría"
                    >
                      <IconDownload size={14} />
                      <span>Libro Facturas Recibidas</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        height: "32px",
                        padding: "0 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        background: "#ffffff",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      onClick={handleExportInvoicesExcel}
                      title="Exportar Libro Registro de Facturas Emitidas para Gestoría / Asesoría Fiscal"
                    >
                      <IconDownload size={14} />
                      <span>Libro Facturas Excel</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 5 Executive Metric Cards */}
            {(() => {
              const fStats = calculateInvoiceStats();
              return (
                <>
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                      <div className={styles.metricCardHeader}>
                        <span className={styles.metricCardTitle}>
                          {activeSubTab === "recibidas" ? "Total Facturas Recibidas" : "Total Facturado"}
                        </span>
                        <div
                          className={styles.metricCardIcon}
                          style={{
                            background: activeSubTab === "recibidas" ? "rgba(15, 118, 110, 0.12)" : "rgba(14, 165, 233, 0.1)",
                            color: activeSubTab === "recibidas" ? "var(--primary, #0f766e)" : "#0ea5e9",
                          }}
                        >
                          <IconEuro size={16} />
                        </div>
                      </div>
                      <div className={styles.metricCardValue}>{formatPrice(fStats.total)}</div>
                      <div className={styles.metricCardSub}>
                        {activeSubTab === "recibidas" ? `${fStats.count} facturas registradas` : `${fStats.count} facturas emitidas`}
                      </div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricCardHeader}>
                        <span className={styles.metricCardTitle}>
                          {activeSubTab === "recibidas" ? "Base Deducible" : "Cobrado en Efectivo"}
                        </span>
                        <div
                          className={styles.metricCardIcon}
                          style={{
                            background: activeSubTab === "recibidas" ? "rgba(2, 132, 199, 0.12)" : "rgba(16, 185, 129, 0.1)",
                            color: activeSubTab === "recibidas" ? "#0284c7" : "#10b981",
                          }}
                        >
                          {activeSubTab === "recibidas" ? <IconFileInvoice size={16} /> : <IconBanknote size={16} />}
                        </div>
                      </div>
                      <div className={styles.metricCardValue}>
                        {activeSubTab === "recibidas" ? formatPrice(fStats.base) : formatPrice(fStats.cash)}
                      </div>
                      <div className={styles.metricCardSub}>
                        {activeSubTab === "recibidas" ? "Base imponible computable" : "Caja física"}
                      </div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricCardHeader}>
                        <span className={styles.metricCardTitle}>
                          {activeSubTab === "recibidas" ? "IVA Soportado" : "Cobrado en Tarjeta"}
                        </span>
                        <div
                          className={styles.metricCardIcon}
                          style={{
                            background: "rgba(99, 102, 241, 0.12)",
                            color: "#6366f1",
                          }}
                        >
                          {activeSubTab === "recibidas" ? <IconTax size={16} /> : <IconCreditCard size={16} />}
                        </div>
                      </div>
                      <div className={styles.metricCardValue}>
                        {activeSubTab === "recibidas" ? formatPrice(fStats.iva) : formatPrice(fStats.card)}
                      </div>
                      <div className={styles.metricCardSub}>
                        {activeSubTab === "recibidas" ? "Deducible Mod. 303 AEAT" : "TPV Bancario"}
                      </div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricCardHeader}>
                        <span className={styles.metricCardTitle}>
                          {activeSubTab === "recibidas" ? "Retenciones IRPF" : "Transferencias / Bizum"}
                        </span>
                        <div
                          className={styles.metricCardIcon}
                          style={{
                            background: activeSubTab === "recibidas" ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.1)",
                            color: activeSubTab === "recibidas" ? "#dc2626" : "#f59e0b",
                          }}
                        >
                          {activeSubTab === "recibidas" ? <IconShield size={16} /> : <IconBizum size={16} />}
                        </div>
                      </div>
                      <div className={styles.metricCardValue}>
                        {activeSubTab === "recibidas" ? formatPrice(fStats.retencion) : formatPrice(fStats.transferBizum)}
                      </div>
                      <div className={styles.metricCardSub}>
                        {activeSubTab === "recibidas" ? "A declarar Mod. 111 / 115" : "Cuenta corriente / Bizum"}
                      </div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricCardHeader}>
                        <span className={styles.metricCardTitle}>
                          {activeSubTab === "recibidas" ? "Pendiente de Pago" : "Ticket Medio"}
                        </span>
                        <div
                          className={styles.metricCardIcon}
                          style={{
                            background: activeSubTab === "recibidas" ? "rgba(245, 158, 11, 0.12)" : "rgba(139, 92, 246, 0.1)",
                            color: activeSubTab === "recibidas" ? "#d97706" : "#8b5cf6",
                          }}
                        >
                          {activeSubTab === "recibidas" ? <IconClock size={16} /> : <IconReceipt size={16} />}
                        </div>
                      </div>
                      <div className={styles.metricCardValue}>
                        {activeSubTab === "recibidas" ? formatPrice(fStats.pendingSum) : formatPrice(fStats.ticketMedio)}
                      </div>
                      <div className={styles.metricCardSub}>
                        {activeSubTab === "recibidas" ? `${fStats.pendingCount} facturas pendientes` : "Promedio por factura"}
                      </div>
                    </div>
                  </div>

                  {/* Tax Summary Strip */}
                  <div className={styles.taxSummaryStrip}>
                    <div className={styles.taxSummaryItem}>
                      <span>Base Imponible Total:</span>
                      <strong>{formatPrice(fStats.base)}</strong>
                    </div>
                    {fStats.exento > 0 && (
                      <div className={styles.taxSummaryItem}>
                        <span>Base Exenta (Art. 20 LIVA):</span>
                        <strong style={{ color: "#0284c7" }}>{formatPrice(fStats.exento)}</strong>
                      </div>
                    )}
                    <div className={styles.taxSummaryItem}>
                      <span>{activeSubTab === "recibidas" ? "Cuota IVA Soportado:" : "Cuota IVA Repercutido:"}</span>
                      <strong>{formatPrice(fStats.iva)}</strong>
                    </div>
                    {fStats.retencion > 0 && (
                      <div className={styles.taxSummaryItem}>
                        <span>Retenciones IRPF:</span>
                        <strong style={{ color: "#ef4444" }}>-{formatPrice(fStats.retencion)}</strong>
                      </div>
                    )}
                    <div className={styles.taxSummaryItem}>
                      <span>{activeSubTab === "recibidas" ? "Total Gastos Recibidos:" : "Total General:"}</span>
                      <strong style={{ color: "#0f172a", fontSize: "14px" }}>{formatPrice(fStats.total)}</strong>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Invoices List Table */}
            <div className={styles.tableWrapper} style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                <thead>
                  {activeSubTab === "recibidas" ? (
                    <tr>
                      <th style={{ width: "36px" }}>
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
                      <th>REF. FACTURA ▾</th>
                      <th>FECHA EMISIÓN ▾</th>
                      <th>PROVEEDOR / RAZÓN SOCIAL ▾</th>
                      <th>CIF / NIF</th>
                      <th>CONCEPTO</th>
                      <th>CATEGORÍA</th>
                      <th>BASE IMPONIBLE</th>
                      <th>IVA</th>
                      <th>RETENCIÓN</th>
                      <th>TOTAL</th>
                      <th>MÉTODO DE PAGO</th>
                      <th>ESTADO</th>
                      <th>DOCUMENTO</th>
                      <th style={{ textAlign: "center" }}>ACCIONES</th>
                    </tr>
                  ) : (
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
                  )}
                </thead>
                <tbody>
                  {getInvoicesList().length === 0 ? (
                    <tr>
                      <td colSpan={activeSubTab === "recibidas" ? 15 : 19} className={styles.emptyState}>
                        {activeSubTab === "recibidas"
                          ? "No se encontraron facturas recibidas en este período. Pulsa \"Subir Factura (IA)\" para añadir la primera."
                          : "No se encontraron resultados"}
                      </td>
                    </tr>
                  ) : (
                    getInvoicesList()
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((item) => (
                        activeSubTab === "recibidas" ? (
                          <tr key={item.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(item.id)}
                                onChange={() => handleToggleRow(item.id)}
                              />
                            </td>
                            <td>
                              <button
                                className={styles.clientLink}
                                style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", fontWeight: 700, color: "#0ea5e9" }}
                                onClick={() => setSelectedReceivedInvoiceDetail(item.rawInvoice || item)}
                              >
                                {item.refFac}
                              </button>
                            </td>
                            <td>{item.fechaCreacion}</td>
                            <td>
                              <strong>{item.cliente}</strong>
                            </td>
                            <td>{item.nif}</td>
                            <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.concept}>
                              {item.concept || "-"}
                            </td>
                            <td>
                              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", backgroundColor: "#f1f5f9", color: "#475569" }}>
                                {item.tipo}
                              </span>
                            </td>
                            <td>{formatPrice(item.baseImponible)}</td>
                            <td>{formatPrice(item.iva)}</td>
                            <td>{formatPrice(item.retencion)}</td>
                            <td>
                              <strong style={{ color: "#0f172a" }}>
                                {formatPrice(item.total)}
                              </strong>
                            </td>
                            <td>{item.metodoPago}</td>
                            <td>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  backgroundColor: item.estadoPago === "PAGADO" ? "#dcfce7" : "#fef9c3",
                                  color: item.estadoPago === "PAGADO" ? "#166534" : "#854d0e",
                                }}
                              >
                                {item.estadoPago === "PAGADO" ? "✓ PAGADO" : "PENDIENTE"}
                              </span>
                            </td>
                            <td>
                              {item.fileUrl ? (
                                <a
                                  href={item.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "12px",
                                    color: "#0284c7",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                  }}
                                  title="Ver archivo adjunto"
                                >
                                  <Icons.Eye size={14} /> Ver PDF
                                </a>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                style={{
                                  background: "none",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  color: "#334155",
                                }}
                                onClick={() => setSelectedReceivedInvoiceDetail(item.rawInvoice || item)}
                                title="Ver detalles y gestionar factura"
                              >
                                Gestionar
                              </button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={item.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(item.id)}
                                onChange={() => handleToggleRow(item.id)}
                              />
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {item.rawSale ? (
                                  <button
                                    className={styles.clientLink}
                                    style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", fontWeight: 600 }}
                                    onClick={() => handleOpenExistingInvoice(item.rawSale)}
                                  >
                                    {item.refFac}
                                  </button>
                                ) : (
                                  <strong>{item.refFac}</strong>
                                )}
                                {item.isRectificativa && (
                                  <span className={styles.badgeRectificativa}>RECT</span>
                                )}
                                {item.isSimplificada && (
                                  <span className={styles.badgeSimplificada}>SIMP</span>
                                )}
                                {item.veriFactuHash && (
                                  <span className={styles.badgeVerifactu} title="Huella Veri*Factu verificada">✓ VF</span>
                                )}
                              </div>
                            </td>
                            <td>{item.fechaCreacion}</td>
                            <td>{item.fechaOperacion}</td>
                            <td>{item.cliente}</td>
                            <td>{item.clientNumber}</td>
                            <td>{item.nif}</td>
                            <td>{item.direccion}</td>
                            <td>{item.ciudad}</td>
                            <td>{item.codigoPostal}</td>
                            <td>{formatPrice(item.precioBruto)}</td>
                            <td>{formatPrice(item.descuento)}</td>
                            <td>{formatPrice(item.baseImponible)}</td>
                            <td>{formatPrice(item.iva)}</td>
                            <td>{formatPrice(item.retencion)}</td>
                            <td>
                              <strong style={{ color: item.total < 0 ? "#dc2626" : "inherit" }}>
                                {formatPrice(item.total)}
                              </strong>
                            </td>
                            <td>{item.metodoPago}</td>
                            <td>
                              {item.isRectificativa ? (
                                <span className={styles.badgeAbono}>Abono</span>
                              ) : (
                                item.tipo
                              )}
                            </td>
                            <td>
                              <span className={styles.badgePagado}>✓ PAGADO</span>
                            </td>
                          </tr>
                        )
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
                            {item.transaccion === "GASTO" ? (
                              <span className={styles.badgeGasto}>GASTO</span>
                            ) : item.transaccion === "INGRESO" ? (
                              <span className={styles.badgeIngreso}>INGRESO</span>
                            ) : (
                              <span className={styles.badgePagado}>PAGO</span>
                            )}
                          </td>
                          <td>{item.usuario}</td>
                          <td>
                            <strong style={{ color: "#0284c7" }}>{item.nuV}</strong>
                          </td>
                          <td>{item.metodoPago}</td>
                          <td>{formatPrice(item.total)}</td>
                          <td>{formatPrice(item.reembolsado)}</td>
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
                    <strong>{summary.efectivo.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tarjeta:</span>
                    <strong>{summary.tarjeta.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</strong>
                  </div>
                  {summary.transferencia > 0 && (
                    <div className={styles.summaryRow}>
                      <span>Transferencia:</span>
                      <strong>{summary.transferencia.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</strong>
                    </div>
                  )}
                  <div className={styles.summaryRowTotal}>
                    <span>Total:</span>
                    <strong>{summary.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</strong>
                  </div>
                </div>
              );
            })()}

            {/* Desglose por día Section */}
            {(() => {
              const summary = calculatePaymentSummary();
              
              // Group payments list by day
              const paymentsList = getPaymentsList();
              const groups: { [dateStr: string]: { efectivo: number; tarjeta: number; transferencia: number; total: number; rawDate: Date } } = {};

              paymentsList.forEach((item) => {
                const d = item.fechaRaw;
                const dateStr = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
                if (!groups[dateStr]) {
                  groups[dateStr] = { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0, rawDate: d };
                }
                
                const met = item.metodoPago;
                if (met === "Efectivo") {
                  groups[dateStr].efectivo += item.total;
                } else if (met === "Tarjeta") {
                  groups[dateStr].tarjeta += item.total;
                } else if (met === "Transferencia") {
                  groups[dateStr].transferencia += item.total;
                }
                groups[dateStr].total += item.total;
              });

              const dailyData = Object.keys(groups)
                .map(key => ({ dateStr: key, ...groups[key] }))
                .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

              const hasTransfers = summary.transferencia > 0;

              return (
                <div style={{ marginTop: "32px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                        Desglose por día
                      </h3>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                        Un movimiento por cada día con cobros dentro del rango filtrado. La fila de totales cuadra con el resumen general de arriba.
                      </p>
                    </div>
                    {dailyData.length > 0 && (
                      <button
                        className={styles.filterBtn}
                        style={{ borderColor: "#10b981", color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}
                        onClick={async () => {
                          const XLSX = await import("xlsx");
                          const sheetData: any[][] = [];
                          
                          // Row 1: Clinic Name
                          const clinicName = activeClinic?.name || "Clínica";
                          sheetData.push([clinicName]);
                          
                          // Row 2: Headers
                          const headers = ["FECHA", "EFECTIVO", "TARJETA"];
                          if (hasTransfers) {
                            headers.push("TRANSFERENCIA");
                          }
                          headers.push("TOTAL");
                          sheetData.push(headers);
                          
                          // Data rows
                          dailyData.forEach((day) => {
                            const row = [
                              day.dateStr,
                              day.efectivo,
                              day.tarjeta
                            ];
                            if (hasTransfers) {
                              row.push(day.transferencia);
                            }
                            row.push(day.total);
                            sheetData.push(row);
                          });
                          
                          // Totals row
                          const totalsRow = [
                            "TOTAL DEL PERIODO",
                            summary.efectivo,
                            summary.tarjeta
                          ];
                          if (hasTransfers) {
                            totalsRow.push(summary.transferencia);
                          }
                          totalsRow.push(summary.total);
                          sheetData.push(totalsRow);
                          
                          // Create sheet
                          const ws = XLSX.utils.aoa_to_sheet(sheetData);
                          
                          // Set column spans/merges for A1:D1 or A1:E1
                          const lastColIndex = hasTransfers ? 4 : 3;
                          ws["!merges"] = [
                            { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } }
                          ];
                          
                          // Set column widths
                          ws["!cols"] = [
                            { wch: 22 }, // Fecha / Total del Periodo
                            { wch: 14 }, // Efectivo
                            { wch: 14 }, // Tarjeta
                            ...(hasTransfers ? [{ wch: 16 }] : []), // Transferencia
                            { wch: 14 }  // Total
                          ];
                          
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Desglose Diario");
                          
                          const fileClinicName = clinicName.replace(/[^a-zA-Z0-9]/g, "_");
                          const filename = `Desglose_Diario_${fileClinicName}.xlsx`;
                          XLSX.writeFile(wb, filename);
                        }}
                      >
                        <Icons.Download size={16} />
                        <span>Descargar Excel</span>
                      </button>
                    )}
                  </div>

                  <div className={styles.tableWrapper} style={{ overflowX: "auto" }}>
                    <table className="table" style={{ width: "100%", whiteSpace: "nowrap" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>FECHA</th>
                          <th style={{ textAlign: "right" }}>EFECTIVO</th>
                          <th style={{ textAlign: "right" }}>TARJETA</th>
                          {hasTransfers && <th style={{ textAlign: "right" }}>TRANSFERENCIA</th>}
                          <th style={{ textAlign: "right" }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.length === 0 ? (
                          <tr>
                            <td colSpan={hasTransfers ? 5 : 4} className={styles.emptyState} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                              No hay movimientos en este periodo
                            </td>
                          </tr>
                        ) : (
                          <>
                            {dailyData.map((day) => (
                              <tr key={day.dateStr}>
                                <td style={{ textAlign: "left" }}>{day.dateStr}</td>
                                <td style={{ textAlign: "right" }}>{day.efectivo.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                                <td style={{ textAlign: "right" }}>{day.tarjeta.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                                {hasTransfers && (
                                  <td style={{ textAlign: "right" }}>{day.transferencia.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                                )}
                                <td style={{ textAlign: "right", fontWeight: 600 }}>{day.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: "2px solid var(--border-color)", backgroundColor: "var(--bg-hover)" }}>
                              <td style={{ textAlign: "left", fontWeight: 700 }}>Total periodo</td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>{summary.efectivo.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>{summary.tarjeta.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                              {hasTransfers && (
                                <td style={{ textAlign: "right", fontWeight: 700 }}>{summary.transferencia.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                              )}
                              <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{summary.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} {currencySymbol}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
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
                      <td>{formatPrice(item.cantidad)}</td>
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
                                      toast.error("Error al eliminar el movimiento");
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                <div style={{ background: "var(--bg-input)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "9.5px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Emitido</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>{formatPrice(totalPresupuestado)}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>{filteredBudgets.length} presupuestos</div>
                </div>

                <div style={{ background: "rgba(16,185,129,0.06)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ fontSize: "9.5px", color: "#10b981", textTransform: "uppercase", fontWeight: 700 }}>Aceptados</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>{formatPrice(totalAceptado)}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {totalPresupuestado > 0 ? ((totalAceptado / totalPresupuestado) * 100).toFixed(0) : 0}% del total
                  </div>
                </div>

                <div style={{ background: "rgba(245,158,11,0.06)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div style={{ fontSize: "9.5px", color: "#f59e0b", textTransform: "uppercase", fontWeight: 700 }}>Pendientes</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>{formatPrice(totalPendiente)}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {totalPresupuestado > 0 ? ((totalPendiente / totalPresupuestado) * 100).toFixed(0) : 0}% del total
                  </div>
                </div>

                <div style={{ background: "rgba(239,68,68,0.06)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ fontSize: "9.5px", color: "#ef4444", textTransform: "uppercase", fontWeight: 700 }}>Rechazados</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#ef4444", marginTop: "2px" }}>{formatPrice(totalRechazado)}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {totalPresupuestado > 0 ? ((totalRechazado / totalPresupuestado) * 100).toFixed(0) : 0}% del total
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className={styles.tableWrapper}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                      <th style={{ textAlign: "left" }}>Nº Presupuesto</th>
                      <th style={{ textAlign: "left" }}>Paciente</th>
                      <th style={{ textAlign: "left" }}>Concepto</th>
                      <th style={{ textAlign: "left" }}>Fecha</th>
                      <th style={{ textAlign: "left" }}>Total</th>
                      <th style={{ textAlign: "left" }}>Saldo Restante</th>
                      <th style={{ textAlign: "left" }}>Estado</th>
                      <th style={{ textAlign: "center" }}>Acciones</th>
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
                            <td><strong>PRE-{b.budgetNumber}</strong></td>
                            <td>{patientName}</td>
                            <td>{b.title}</td>
                            <td>{new Date(b.createdAt).toLocaleDateString("es-ES")}</td>
                            <td style={{ fontWeight: "bold" }}>{formatPrice(b.total)}</td>
                            <td style={{ color: b.remainingAmount > 0 ? "#10b981" : "var(--text-secondary)" }}>
                              {b.status === "ACCEPTED" ? formatPrice(b.remainingAmount) : "-"}
                            </td>
                            <td>
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
                                  style={{ height: "28px", padding: "0 10px", fontSize: "11.5px", fontWeight: 600, background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
                                  style={{ height: "28px", padding: "0 10px", fontSize: "11.5px", fontWeight: 600, background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
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
      {showNoFiscalProfileModal && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
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
              margin: "auto", maxHeight: "90vh", overflowY: "auto",
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
        </div>,
        document.body
      )}

      {/* ── Modal: Configuración de Datos Fiscales ─────────────────── */}
      {showFiscalSetupModal && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowFiscalSetupModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card)",
              borderRadius: "20px",
              padding: "40px",
              maxWidth: "520px",
              width: "100%",
              margin: "auto",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              border: "1px solid var(--border-color)",
              position: "relative",
            }}
          >
            {/* Ambient Background Gradient for Premium look */}
            <div style={{
              position: "absolute",
              top: "-50px",
              right: "-50px",
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)",
              pointerEvents: "none",
            }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6366f1",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                  Datos Fiscales Requeridos
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Es obligatorio rellenar los datos del centro para poder cobrar citas.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveFiscalProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  Tipo de Entidad
                </label>
                <div style={{ display: "flex", gap: "8px", background: "var(--bg-input)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  {(["Empresa", "Particular"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFiscalEntityType(type)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "8px",
                        background: fiscalEntityType === type ? "var(--primary)" : "transparent",
                        color: fiscalEntityType === type ? "#ffffff" : "var(--text-secondary)",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {type === "Empresa" ? "Empresa / Sociedad" : "Autónomo / Particular"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  Nombre Comercial / Razón Social <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clínica Dental Central S.L."
                  value={fiscalComercialName}
                  onChange={(e) => setFiscalComercialName(e.target.value)}
                  className="input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  NIF / CIF <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: B12345678"
                  value={fiscalNif}
                  onChange={(e) => setFiscalNif(e.target.value)}
                  className="input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  Dirección Fiscal <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Calle, número, piso, puerta"
                  value={fiscalAddress}
                  onChange={(e) => setFiscalAddress(e.target.value)}
                  className="input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Municipio / Ciudad <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Alicante"
                    value={fiscalMunicipality}
                    onChange={(e) => setFiscalMunicipality(e.target.value)}
                    className="input"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Código Postal <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 03001"
                    value={fiscalPostalCode}
                    onChange={(e) => setFiscalPostalCode(e.target.value)}
                    className="input"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handleCancelFiscalSetup}
                  style={{
                    padding: "11px 20px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingFiscal}
                  style={{
                    padding: "11px 24px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, var(--primary), #4f46e5)",
                    color: "#ffffff",
                    cursor: isSavingFiscal ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isSavingFiscal ? (
                    <>
                      <div style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar y Continuar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {typeof window !== "undefined" && createPortal(
        <>
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
        </>,
        document.body
      )}

      {/* DETAILED INVOICE MODAL */}
      {selectedSaleDetail && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setSelectedSaleDetail(null)}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px", margin: "auto", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
        </div>,
        document.body
      )}

      {/* ADD MANUAL MOVEMENT MODAL */}
      {showMovementModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={handleCloseMovementModal}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px", margin: "auto", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
        </div>,
        document.body
      )}

      {/* ── Modal: Emitir Factura Rectificativa / Abono (Art. 15 RD 1619/2012) ── */}
      {showRectifyModal && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowRectifyModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card, #ffffff)",
              borderRadius: "16px",
              padding: "28px 32px",
              maxWidth: "540px",
              width: "100%",
              margin: "auto",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(220, 38, 38, 0.1)",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconRectify size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Emitir Factura Rectificativa / Abono
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  Conforme al Art. 15 del RD 1619/2012 y Ley 11/2021 Veri*Factu
                </p>
              </div>
            </div>

            {/* Target invoice info */}
            {activeInvoiceEdit && (
              <div
                style={{
                  background: "var(--bg-input, #f8fafc)",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Factura a rectificar:</span>
                  <strong>{activeInvoiceEdit.invoiceNumber || activeInvoiceEdit.rawSale?.invoiceNumber || "-"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Cliente destinatario:</span>
                  <span>{activeInvoiceEdit.clientName || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Importe total a abonar:</span>
                  <strong style={{ color: "#dc2626", fontSize: "15px" }}>
                    -{formatPrice(activeInvoiceEdit.concepts.reduce((acc: number, c: any) => acc + (c.price * c.quantity), 0))}
                  </strong>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Causa / Motivo legal de rectificación (Art. 15 RD 1619/2012) *
                </label>
                <select
                  className="input select"
                  value={rectifyReason}
                  onChange={(e) => setRectifyReason(e.target.value)}
                  style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px" }}
                >
                  <option value="R1: Error fundado en derecho y causas art. 80 Uno, Dos y Seis LIVA">
                    R1: Error fundado en derecho y causas art. 80 Uno, Dos y Seis LIVA
                  </option>
                  <option value="R2: Concurso de acreedores (art. 80 Tres LIVA)">
                    R2: Concurso de acreedores (art. 80 Tres LIVA)
                  </option>
                  <option value="R3: Crédito total o parcialmente incobrable (art. 80 Cuatro LIVA)">
                    R3: Crédito total o parcialmente incobrable (art. 80 Cuatro LIVA)
                  </option>
                  <option value="R4: Devolución existencias, descuentos posteriores o error en importes">
                    R4: Devolución de existencias, descuentos o error en importes/datos
                  </option>
                  <option value="R5: Facturas rectificativas en facturas simplificadas">
                    R5: Facturas rectificativas en facturas simplificadas
                  </option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "var(--text-secondary)" }}>
                  Método de devolución / reembolso *
                </label>
                <select
                  className="input select"
                  value={rectifyPaymentMethod}
                  onChange={(e) => setRectifyPaymentMethod(e.target.value)}
                  style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px" }}
                >
                  <option value="CASH">Efectivo (salida de caja física)</option>
                  <option value="CARD">Tarjeta (devolución datáfono / TPV)</option>
                  <option value="TRANSFER">Transferencia bancaria</option>
                  <option value="BIZUM">Bizum</option>
                </select>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  padding: "6px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={rectifyRestock}
                  onChange={(e) => setRectifyRestock(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#0ea5e9" }}
                />
                <span>Reincorporar automáticamente productos a inventario (stock)</span>
              </label>

              <div
                style={{
                  background: "rgba(220, 38, 38, 0.06)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#991b1b",
                  lineHeight: 1.45,
                }}
              >
                <strong>Immutabilidad fiscal:</strong> Esta operación generará una Factura Rectificativa correlativa en la serie de abonos con encadenamiento SHA-256 Veri*Factu, cancelando el saldo contable y registrando la salida de caja correspondiente.
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRectifyModal(false)}
                style={{ padding: "10px 18px", fontSize: "13px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmRectify}
                style={{
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "#dc2626",
                  borderColor: "#dc2626",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <IconRectify size={16} />
                <span>Expedir Rectificativa</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showEditClientModal && renderEditClientDrawer()}

      {/* RECEIVED INVOICE UPLOAD & AI SCAN MODAL */}
      <ReceivedInvoiceUploadModal
        isOpen={showUploadInvoiceModal}
        onClose={() => setShowUploadInvoiceModal(false)}
        clinicId={activeClinic?.id || ""}
        onSuccess={fetchSalesData}
      />

      {/* RECEIVED INVOICE DETAIL & ACTIONS MODAL */}
      <ReceivedInvoiceDetailModal
        isOpen={!!selectedReceivedInvoiceDetail}
        onClose={() => setSelectedReceivedInvoiceDetail(null)}
        invoice={selectedReceivedInvoiceDetail}
        onUpdated={fetchSalesData}
      />
    </div>
  );
}
