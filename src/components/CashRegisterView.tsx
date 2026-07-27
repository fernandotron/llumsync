"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ToastContainer";
import styles from "./CashRegisterView.module.css";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dniNif?: string;
  phone?: string;
}

interface ClientDebt {
  id: string;
  clientId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    dniNif?: string;
    phone?: string;
  };
  amount: number;
  concept: string;
  notes?: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  date: string;
}

interface Movement {
  id: string;
  concept: string;
  amount: number;
  method: string;
  type: "INCOME" | "EXPENSE";
  date: string;
}

const OUTFLOW_CATEGORIES = [
  { id: "MERCADONA", label: "Supermercado", icon: "🛒" },
  { id: "DOC", label: "Pago Doctor", icon: "👨‍⚕️" },
  { id: "FARMACIA", label: "Farmacia", icon: "💊" },
  { id: "TECNICO", label: "Serv. Técnico", icon: "⚙️" },
  { id: "VARIOS", label: "Varios", icon: "📝" },
];

const BILL_COIN_DENOMINATIONS = [
  { key: "500", label: "500 €", value: 500, isBill: true },
  { key: "200", label: "200 €", value: 200, isBill: true },
  { key: "100", label: "100 €", value: 100, isBill: true },
  { key: "50", label: "50 €", value: 50, isBill: true },
  { key: "20", label: "20 €", value: 20, isBill: true },
  { key: "10", label: "10 €", value: 10, isBill: true },
  { key: "5", label: "5 €", value: 5, isBill: true },
  { key: "2", label: "2 €", value: 2, isBill: false },
  { key: "1", label: "1 €", value: 1, isBill: false },
  { key: "0.5", label: "0,50 €", value: 0.5, isBill: false },
  { key: "0.2", label: "0,20 €", value: 0.2, isBill: false },
  { key: "0.1", label: "0,10 €", value: 0.1, isBill: false },
];

const parseNumber = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === "") return 0;
  const str = val.toString().replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export default function CashRegisterView() {
  const { activeClinic, user } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"movements" | "debts">("movements");

  // State from API
  const [session, setSession] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    initialCash: 0,
    cashSalesTotal: 0,
    cardSalesTotal: 0,
    transferSalesTotal: 0,
    cashIncomeMovements: 0,
    cashExpenseMovements: 0,
    totalCashIn: 0,
    totalCashOut: 0,
    expectedCashInHand: 0,
    pendingDebtsCount: 0,
    totalPendingDebtsAmount: 0,
  });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [debts, setDebts] = useState<ClientDebt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOutflowModal, setShowOutflowModal] = useState(false);
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [showPayDebtModal, setShowPayDebtModal] = useState<ClientDebt | null>(null);

  // Open Form
  const [openInitialCash, setOpenInitialCash] = useState("300.00");
  const [openNotes, setOpenNotes] = useState("");

  // Outflow Form
  const [outflowCategory, setOutflowCategory] = useState("MERCADONA");
  const [outflowConcept, setOutflowConcept] = useState("");
  const [outflowAmount, setOutflowAmount] = useState("");
  const [outflowNotes, setOutflowNotes] = useState("");

  // Add Debt Form
  const [debtClientId, setDebtClientId] = useState("");
  const [debtConcept, setDebtConcept] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtNotes, setDebtNotes] = useState("");

  // Close / Arqueo Form
  const [denomCounts, setDenomCounts] = useState<Record<string, number>>({});
  const [closeNotes, setCloseNotes] = useState("");

  // Pay Debt Form
  const [debtPayMethod, setDebtPayMethod] = useState("CASH");

  const fetchCashState = async () => {
    if (!activeClinic?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cash-register/current?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.activeSession);
        if (data.metrics) setMetrics(data.metrics);
        setMovements(data.movements || []);
        setDebts(data.pendingDebts || []);
      }

      // Fetch clients list for debt assignment dropdown
      const clientsRes = await fetch(`/api/clients?clinicId=${activeClinic.id}`);
      if (clientsRes.ok) {
        const clientData = await clientsRes.json();
        setClients(clientData.clients || clientData || []);
      }
    } catch (err) {
      console.error("Error fetching cash register state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashState();
  }, [activeClinic?.id]);

  // Excel Export Handler
  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      // 1. Resumen de Caja Sheet
      const summaryData = [
        { Concepto: "Estado de Caja", Valor: session?.status === "OPEN" ? "ABIERTA" : "CERRADA" },
        { Concepto: "Fecha de Apertura", Valor: session?.openedAt ? new Date(session.openedAt).toLocaleString("es-ES") : "-" },
        { Concepto: "Saldo Inicial de Caja", Valor: `${metrics.initialCash.toFixed(2)} €` },
        { Concepto: "Entradas en Efectivo (Cobros)", Valor: `${metrics.totalCashIn.toFixed(2)} €` },
        { Concepto: "Salidas de Efectivo (Gastos)", Valor: `${metrics.totalCashOut.toFixed(2)} €` },
        { Concepto: "Cobros en Tarjeta (TPV)", Valor: `${metrics.cardSalesTotal.toFixed(2)} €` },
        { Concepto: "Saldo Teórico Actual en Caja", Valor: `${metrics.expectedCashInHand.toFixed(2)} €` },
        { Concepto: "Total Deudas Pendientes", Valor: `${metrics.totalPendingDebtsAmount.toFixed(2)} € (${metrics.pendingDebtsCount} pacientes)` },
      ];

      // 2. Movimientos del Día Sheet
      const movementsData = movements.map((m) => ({
        Fecha: new Date(m.date).toLocaleDateString("es-ES"),
        Hora: new Date(m.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        Concepto: m.concept,
        Tipo: m.type === "INCOME" ? "INGRESO" : "GASTO / SALIDA",
        "Método de Pago": m.method === "CASH" ? "Efectivo" : m.method === "CARD" ? "Tarjeta" : "Transferencia",
        "Importe (€)": m.amount,
      }));

      // 3. Deudas Pendientes Sheet
      const debtsData = debts.map((d) => ({
        Fecha: new Date(d.date).toLocaleDateString("es-ES"),
        Paciente: `${d.client?.firstName || ""} ${d.client?.lastName || ""}`.trim(),
        "DNI / NIF": d.client?.dniNif || "-",
        Teléfono: d.client?.phone || "-",
        Concepto: d.concept,
        "Importe Deuda (€)": d.amount,
        Estado: "PENDIENTE",
      }));

      const workbook = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsMovements = XLSX.utils.json_to_sheet(movementsData.length > 0 ? movementsData : [{ Info: "Sin movimientos" }]);
      const wsDebts = XLSX.utils.json_to_sheet(debtsData.length > 0 ? debtsData : [{ Info: "Sin deudas pendientes" }]);

      XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumen de Caja");
      XLSX.utils.book_append_sheet(workbook, wsMovements, "Movimientos del Día");
      XLSX.utils.book_append_sheet(workbook, wsDebts, "Deudas Pendientes");

      const todayStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Control_Caja_${activeClinic?.name || "Clinica"}_${todayStr}.xlsx`);
      toast.success("Excel de caja descargado correctamente 📊");
    } catch (err) {
      console.error("Error generating Excel:", err);
      toast.error("Error al generar el archivo Excel");
    }
  };

  // Handle Open Cash
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic?.id) {
      toast.error("No se ha detectado la clínica activa");
      return;
    }
    try {
      const parsedCash = parseNumber(openInitialCash);
      const res = await fetch("/api/cash-register/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic.id,
          initialCash: parsedCash,
          notes: openNotes,
          openedByUserId: user?.id,
        }),
      });
      if (res.ok) {
        toast.success("Caja abierta correctamente");
        setShowOpenModal(false);
        fetchCashState();
      } else {
        const errData = await res.json();
        toast.error(errData.details ? `${errData.error}: ${errData.details}` : (errData.error || "Error al abrir la caja"));
      }
    } catch (err) {
      toast.error("Error de conexión al servidor");
    }
  };

  // Handle Outflow (Salida de caja)
  const handleCreateOutflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic?.id || !outflowAmount) return;
    try {
      const res = await fetch("/api/cash-register/outflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic.id,
          category: outflowCategory,
          concept: outflowConcept || outflowCategory,
          amount: parseNumber(outflowAmount),
          notes: outflowNotes,
        }),
      });
      if (res.ok) {
        toast.success("Salida de caja registrada correctamente");
        setShowOutflowModal(false);
        setOutflowConcept("");
        setOutflowAmount("");
        setOutflowNotes("");
        fetchCashState();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Error al registrar la salida");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  // Handle Add Debt (Registrar Deuda de Paciente)
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic?.id || !debtClientId || !debtAmount || !debtConcept) {
      toast.error("Selecciona paciente, concepto e importe de la deuda");
      return;
    }
    try {
      const res = await fetch("/api/cash-register/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic.id,
          clientId: debtClientId,
          concept: debtConcept,
          amount: parseNumber(debtAmount),
          notes: debtNotes,
        }),
      });
      if (res.ok) {
        toast.success("Deuda de paciente registrada correctamente 📝");
        setShowAddDebtModal(false);
        setDebtClientId("");
        setDebtConcept("");
        setDebtAmount("");
        setDebtNotes("");
        fetchCashState();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Error al registrar la deuda");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  // Calculate actual total counted from denominations
  const totalCountedFromDenoms = Object.entries(denomCounts).reduce((sum, [key, count]) => {
    const denom = BILL_COIN_DENOMINATIONS.find((d) => d.key === key);
    return sum + (denom ? denom.value * (count || 0) : 0);
  }, 0);

  // Handle Close Cash (Arqueo)
  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id) return;
    try {
      const res = await fetch("/api/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          actualCash: totalCountedFromDenoms,
          denominations: denomCounts,
          notes: closeNotes,
          closedByUserId: user?.id,
        }),
      });
      if (res.ok) {
        const closed = await res.json();
        const disc = closed.discrepancy || 0;
        if (Math.abs(disc) < 0.01) {
          toast.success("Caja cerrada sin descuadre ✨");
        } else {
          toast.warning(`Caja cerrada con descuadre de ${disc > 0 ? "+" : ""}${disc.toFixed(2)} €`);
        }
        setShowCloseModal(false);
        fetchCashState();
      } else {
        toast.error("Error al cerrar la caja");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  // Handle Settle Debt
  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayDebtModal) return;
    try {
      const res = await fetch("/api/cash-register/debts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: showPayDebtModal.id,
          paymentMethod: debtPayMethod,
          createMovement: true,
        }),
      });
      if (res.ok) {
        toast.success("Deuda saldada e ingresada en caja correctamente");
        setShowPayDebtModal(null);
        fetchCashState();
      } else {
        toast.error("Error al saldar la deuda");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  const isSessionOpen = session && session.status === "OPEN";

  return (
    <div className={styles.container}>
      {/* Header & Status Banner */}
      <div className={styles.headerBanner}>
        <div className={styles.statusGroup}>
          <div className={isSessionOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed}>
            <span className={styles.statusDot} />
            <span>{isSessionOpen ? "CAJA ABIERTA" : "CAJA CERRADA"}</span>
          </div>
          <div>
            <h2 className={styles.headerTitle}>Control y Arqueo de Caja Diario</h2>
            <p className={styles.headerSub}>
              {isSessionOpen
                ? `Abierta el ${new Date(session.openedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} (Apertura: ${session.initialCash?.toFixed(2)} €)`
                : "No hay sesión de caja abierta actualmente."}
            </p>
          </div>
        </div>

        <div className={styles.actionGroup}>
          {/* Botón Descargar Excel */}
          <button
            className="btn btn-secondary"
            onClick={handleDownloadExcel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 700,
              color: "#15803d",
              borderColor: "#86efac",
              background: "rgba(34, 197, 94, 0.08)",
            }}
          >
            📊 Descargar Excel
          </button>

          {!isSessionOpen ? (
            <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
              🔓 Abrir Caja del Día
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                onClick={() => setShowOutflowModal(true)}
              >
                📤 Registrar Salida de Efectivo
              </button>
              <button className="btn btn-primary" onClick={() => setShowCloseModal(true)}>
                🔒 Arqueo y Cierre de Caja
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Saldo Inicial</span>
            <div className={`${styles.metricIcon} ${styles.iconInitial}`}>💵</div>
          </div>
          <div className={styles.metricValue}>{metrics.initialCash.toFixed(2)} €</div>
          <div className={styles.metricSubtext}>Base fija de apertura</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Entradas Efectivo</span>
            <div className={`${styles.metricIcon} ${styles.iconIn}`}>📥</div>
          </div>
          <div className={styles.metricValue}>+{metrics.totalCashIn.toFixed(2)} €</div>
          <div className={styles.metricSubtext}>{metrics.cashSalesTotal.toFixed(2)} € cobros cita</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Salidas Efectivo</span>
            <div className={`${styles.metricIcon} ${styles.iconOut}`}>📤</div>
          </div>
          <div className={styles.metricValue} style={{ color: "#dc2626" }}>
            -{metrics.totalCashOut.toFixed(2)} €
          </div>
          <div className={styles.metricSubtext}>Gastos supermercado, doctor...</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Cobros TPV / Tarjeta</span>
            <div className={`${styles.metricIcon} ${styles.iconCard}`}>💳</div>
          </div>
          <div className={styles.metricValue}>{metrics.cardSalesTotal.toFixed(2)} €</div>
          <div className={styles.metricSubtext}>En datáfono del día</div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricCardHighlight}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel} style={{ color: "#4f46e5" }}>
              Saldo Actual en Caja
            </span>
            <div className={`${styles.metricIcon} ${styles.iconTotal}`}>💰</div>
          </div>
          <div className={styles.metricValue} style={{ color: "#4f46e5" }}>
            {metrics.expectedCashInHand.toFixed(2)} €
          </div>
          <div className={styles.metricSubtext}>Efectivo que debe haber en cajón</div>
        </div>
      </div>

      {/* Main Section Card */}
      <div className={styles.sectionCard}>
        <div className={styles.tabBar} style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`${styles.tabBtn} ${activeTab === "movements" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("movements")}
            >
              📋 Movimientos y Salidas de Caja ({movements.length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "debts" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("debts")}
            >
              ⚠️ Deudas Pendientes de Clientes ({metrics.pendingDebtsCount})
            </button>
          </div>

          {activeTab === "debts" && (
            <button
              className="btn btn-primary"
              style={{ fontSize: "13px", padding: "6px 14px" }}
              onClick={() => setShowAddDebtModal(true)}
            >
              📝 Registrar Deuda de Cliente
            </button>
          )}
        </div>

        {activeTab === "movements" && (
          <div className={styles.tableContainer}>
            {movements.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "30px 0" }}>
                No hay movimientos ni cobros registrados en la sesión actual de caja.
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th>Método</th>
                    <th style={{ textAlign: "right" }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {new Date(m.date).toLocaleDateString("es-ES")}{" "}
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {new Date(m.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {m.type === "INCOME" && (m as any).nuV ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <Link
                              href={(m as any).saleId ? `/dashboard/sales?saleId=${(m as any).saleId}` : "/dashboard/sales"}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                background: "rgba(99, 102, 241, 0.12)",
                                color: "#6366f1",
                                fontWeight: 800,
                                fontSize: "12px",
                                textDecoration: "none",
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                              }}
                              title="Ver cobro en Caja / Ventas"
                            >
                              🎟️ {(m as any).nuV.replace("NU.V:", "REF.M:")}
                            </Link>
                            {(m as any).clientId ? (
                              <Link
                                href={`/dashboard/contacts?id=${(m as any).clientId}`}
                                style={{ color: "inherit", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted" }}
                                title="Ver ficha del paciente"
                              >
                                👤 {m.concept.split("]").pop()?.trim() || m.concept}
                              </Link>
                            ) : (
                              <span>{m.concept.split("]").pop()?.trim() || m.concept}</span>
                            )}
                          </div>
                        ) : (
                          m.concept
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: m.type === "INCOME" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                            color: m.type === "INCOME" ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {m.type === "INCOME" ? "INGRESO" : "GASTO / SALIDA"}
                        </span>
                      </td>
                      <td>{m.method === "CASH" ? "💵 Efectivo" : m.method === "CARD" ? "💳 Tarjeta" : "🏦 Transferencia"}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                          color: m.type === "INCOME" ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {m.type === "INCOME" ? "+" : "-"}{m.amount.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "debts" && (
          <div className={styles.tableContainer}>
            {debts.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "30px 0" }}>
                ¡Excelente! No hay pacientes con deudas pendientes registradas.
              </p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Paciente</th>
                    <th>DNI / Teléfono</th>
                    <th>Concepto de la Deuda</th>
                    <th>Importe Deudores</th>
                    <th style={{ textAlign: "right" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.date).toLocaleDateString("es-ES")}</td>
                      <td style={{ fontWeight: 700 }}>
                        {d.client?.firstName} {d.client?.lastName}
                      </td>
                      <td>
                        {d.client?.dniNif || "-"} {d.client?.phone ? `(${d.client.phone})` : ""}
                      </td>
                      <td style={{ color: "#d97706", fontWeight: 600 }}>{d.concept}</td>
                      <td style={{ fontWeight: 800, color: "#dc2626" }}>{d.amount.toFixed(2)} €</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 14px", fontSize: "12px" }}
                          onClick={() => setShowPayDebtModal(d)}
                        >
                          💳 Saldar Deuda
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ABRIR CAJA */}
      {showOpenModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>🔓 Apertura de Caja del Día</h3>
            <form onSubmit={handleOpenCash}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Fondo Inicial de Caja (€)</label>
                <input
                  type="text"
                  className="input"
                  value={openInitialCash}
                  onChange={(e) => setOpenInitialCash(e.target.value)}
                  required
                />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Importe en billetes/monedas que hay en el cajón al empezar el turno.
                </span>
              </div>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Observaciones de Apertura</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Turno de Mañana - Recepción"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Abrir Caja
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: REGISTRAR SALIDA / GASTO DE CAJA */}
      {showOutflowModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#dc2626" }}>
              📤 Registrar Salida de Efectivo
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              Anota el dinero en efectivo retirado de la caja para compras o pagos del día.
            </p>

            <form onSubmit={handleCreateOutflow}>
              <label className="form-label">Categoría de Salida Rápida</label>
              <div className={styles.categoryGrid}>
                {OUTFLOW_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className={`${styles.categoryPill} ${outflowCategory === cat.id ? styles.categoryPillSelected : ""}`}
                    onClick={() => setOutflowCategory(cat.id)}
                  >
                    <span className={styles.categoryPillIcon}>{cat.icon}</span>
                    <span className={styles.categoryPillText}>{cat.label}</span>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Concepto / Descripción</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Compra de café y agua para recepción"
                  value={outflowConcept}
                  onChange={(e) => setOutflowConcept(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Importe Retirado (€)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: 20.60"
                  value={outflowAmount}
                  onChange={(e) => setOutflowAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOutflowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: "#dc2626" }}>
                  Guardar Salida
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: REGISTRAR DEUDA DE CLIENTE */}
      {showAddDebtModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#d97706" }}>
              📝 Registrar Deuda / Pendiente de Paciente
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              Anota deudas pendientes (ej: *"MARIA PILAR: Debe 200€ del Hialurónico del 20 de Abril"*).
            </p>

            <form onSubmit={handleAddDebt}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Paciente / Cliente *</label>
                <select
                  className="input select"
                  value={debtClientId}
                  onChange={(e) => setDebtClientId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar paciente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.dniNif ? `(${c.dniNif})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Concepto de la Deuda *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Debe 200€ del Hialurónico que se puso el 20 de Abril"
                  value={debtConcept}
                  onChange={(e) => setDebtConcept(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Importe Pendiente (€) *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: 200.00"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Notas Adicionales</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Dijo que estaba en Alicante y llamará la semana que viene"
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDebtModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: "#d97706" }}>
                  Guardar Deuda
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: ARQUEO Y CIERRE DE CAJA */}
      {showCloseModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox} style={{ maxWidth: "650px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800 }}>🔒 Recuento y Arqueo de Caja</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              Introduce la cantidad de billetes y monedas que has contado físicamente en el cajón.
            </p>

            <form onSubmit={handleCloseCash}>
              <div className={styles.denomGrid}>
                {BILL_COIN_DENOMINATIONS.map((d) => (
                  <div key={d.key} className={styles.denomItem}>
                    <span className={styles.denomLabel}>{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.denomInput}
                      placeholder="0"
                      value={denomCounts[d.key] || ""}
                      onChange={(e) =>
                        setDenomCounts({
                          ...denomCounts,
                          [d.key]: parseInt(e.target.value || "0", 10),
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0", fontSize: "14px" }}>
                <span>Efectivo Teórico (Segons Sistema):</span>
                <strong>{metrics.expectedCashInHand.toFixed(2)} €</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800 }}>
                <span>Total Contado Físicamente:</span>
                <span style={{ color: "#4f46e5" }}>{totalCountedFromDenoms.toFixed(2)} €</span>
              </div>

              {/* Discrepancy indicator */}
              {(() => {
                const diff = totalCountedFromDenoms - metrics.expectedCashInHand;
                if (Math.abs(diff) < 0.01) {
                  return (
                    <div className={styles.discrepancyBoxOK}>
                      <span>✨ Arqueo perfecto: Sin descuadre de caja</span>
                      <span>0.00 €</span>
                    </div>
                  );
                }
                return (
                  <div className={styles.discrepancyBoxErr}>
                    <span>⚠️ Descuadre detectado ({diff > 0 ? "Sobrante" : "Faltante"}):</span>
                    <span>{diff > 0 ? "+" : ""}{diff.toFixed(2)} €</span>
                  </div>
                );
              })()}

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label className="form-label">Notas de Cierre</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Todo correcto sin incidencias"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Cerrar Caja y Guardar Arqueo
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: SALDAR DEUDA */}
      {showPayDebtModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>💳 Saldar Deuda de Paciente</h3>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--text-secondary)" }}>
              <strong>{showPayDebtModal.client?.firstName} {showPayDebtModal.client?.lastName}</strong> —{" "}
              <span style={{ color: "#dc2626", fontWeight: 800 }}>{showPayDebtModal.amount.toFixed(2)} €</span>
            </p>

            <form onSubmit={handleSettleDebt}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Método de Pago con el que Abona</label>
                <select
                  className="input select"
                  value={debtPayMethod}
                  onChange={(e) => setDebtPayMethod(e.target.value)}
                >
                  <option value="CASH">💵 Efectivo (Suma a la caja de hoy)</option>
                  <option value="CARD">💳 Tarjeta / Datáfono</option>
                  <option value="TRANSFER">🏦 Transferencia / Bizum</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayDebtModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Cobro de Deuda
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
