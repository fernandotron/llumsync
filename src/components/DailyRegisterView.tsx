"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ToastContainer";
import styles from "./DailyRegisterView.module.css";

interface DailyItem {
  id: string;
  appointmentId?: string;
  date: string;
  time: string;
  patientName: string;
  clientId: string;
  dni: string;
  phone: string;
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
  treatment: string;
  nextAppointment: string;
  comments: string;
  status: string;
  statusLabel: string;
}

export default function DailyRegisterView() {
  const { activeClinic } = useApp();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DailyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    totalConsultations: 0,
    totalCash: 0,
    totalCard: 0,
    totalGrand: 0,
  });

  const formattedDateString = selectedDate.toISOString().split("T")[0];

  const fetchDailyRegister = async () => {
    if (!activeClinic?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-register?clinicId=${activeClinic.id}&date=${formattedDateString}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Error fetching daily register:", err);
      toast.error("Error al cargar el libro diario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyRegister();
  }, [activeClinic?.id, formattedDateString]);

  // Handle Date Navigation
  const changeDateByDays = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // Handle Save Comment for row
  const handleSaveComment = async (id: string, appointmentId?: string, newComment?: string) => {
    if (!appointmentId) return;
    setSavingId(id);
    try {
      const res = await fetch("/api/daily-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          comments: newComment,
        }),
      });
      if (res.ok) {
        toast.success("Comentario guardado correctamente");
      }
    } catch (err) {
      toast.error("Error al guardar el comentario");
    } finally {
      setSavingId(null);
    }
  };

  // Handle Excel Export (Réplica exacta de la Imagen 2)
  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      const exportRows = items.map((item) => ({
        FECHA: item.date,
        HORA: item.time,
        PACIENTE: item.patientName,
        DNI: item.dni,
        ESTADO: item.statusLabel,
        "CASH (€)": item.cashAmount > 0 ? item.cashAmount : "-",
        "TPV (€)": item.cardAmount > 0 ? item.cardAmount : "-",
        "TOTAL (€)": item.totalAmount > 0 ? item.totalAmount : "-",
        "TRATAMIENTO REALIZADO": item.treatment,
        "PRÓXIMA CITA": item.nextAppointment || "-",
        COMENTARIOS: item.comments || "-",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows.length > 0 ? exportRows : [{ Info: "Sin registros para este día" }]);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Diario Consultas");
      XLSX.writeFile(workbook, `Libro_Diario_Consultas_${formattedDateString}.xlsx`);
      toast.success("Libro diario descargado en Excel 📊");
    } catch (err) {
      toast.error("Error al exportar a Excel");
    }
  };

  const filteredItems = items.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.patientName.toLowerCase().includes(q) ||
      i.dni.toLowerCase().includes(q) ||
      i.treatment.toLowerCase().includes(q) ||
      i.comments.toLowerCase().includes(q) ||
      i.statusLabel.toLowerCase().includes(q)
    );
  });

  const displayDateText = selectedDate.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.dateNavGroup}>
          <button className={styles.dateNavBtn} onClick={() => changeDateByDays(-1)} title="Día Anterior">
            ◄
          </button>
          <div>
            <h2 className={styles.dateTitle} style={{ textTransform: "capitalize" }}>
              {displayDateText}
            </h2>
            <p className={styles.dateSub}>Libro Diario de Consultas, Cobros y Comentarios</p>
          </div>
          <button className={styles.dateNavBtn} onClick={() => changeDateByDays(1)} title="Día Siguiente">
            ►
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px" }}
            onClick={() => setSelectedDate(new Date())}
          >
            Hoy
          </button>
        </div>

        <div className={styles.actionGroup}>
          <input
            type="date"
            className="input"
            style={{ fontSize: "13px", padding: "6px 12px" }}
            value={formattedDateString}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
          />
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
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Consultas Atendidas</span>
          <div className={styles.metricValue}>{metrics.totalConsultations} pacientes</div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Efectivo (CASH)</span>
          <div className={styles.metricValue} style={{ color: "#16a34a" }}>
            +{metrics.totalCash.toFixed(2)} €
          </div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Datáfono (TPV)</span>
          <div className={styles.metricValue} style={{ color: "#9333ea" }}>
            {metrics.totalCard.toFixed(2)} €
          </div>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Facturado del Día</span>
          <div className={styles.metricValue} style={{ color: "#4f46e5" }}>
            {metrics.totalGrand.toFixed(2)} €
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className={styles.sectionCard}>
        <div className={styles.filterBar}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
            Registro de Citas y Tratamientos del Día
          </h3>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por paciente, DNI, tratamiento, estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.tableContainer}>
          {filteredItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
              No hay consultas ni citas registradas para la fecha seleccionada.
            </p>
          ) : (
            <table className={styles.excelTable}>
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>CASH (€)</th>
                  <th style={{ textAlign: "right" }}>TPV (€)</th>
                  <th style={{ textAlign: "right" }}>TOTAL (€)</th>
                  <th>Tratamiento Realizado</th>
                  <th>Próxima Cita</th>
                  <th style={{ width: "25%" }}>Comentarios / Observaciones de Cobro</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.status === "COMPLETED"
                        ? styles.rowCompleted
                        : item.status === "CANCELLED" || item.status === "NOSHOW"
                        ? styles.rowPending
                        : styles.rowReview
                    }
                  >
                    <td>
                      <strong>{item.date}</strong>{" "}
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{item.time}</span>
                    </td>
                    <td className={styles.patientCell}>
                      {item.clientId ? (
                        <Link
                          href={`/dashboard/contacts?id=${item.clientId}`}
                          style={{ color: "inherit", textDecoration: "underline", textDecorationStyle: "dotted" }}
                          title="Ver ficha completa del paciente"
                        >
                          👤 {item.patientName}
                        </Link>
                      ) : (
                        item.patientName
                      )}
                    </td>
                    <td>{item.dni}</td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 800,
                          background:
                            item.status === "COMPLETED"
                              ? "rgba(34, 197, 94, 0.15)"
                              : item.status === "CANCELLED" || item.status === "NOSHOW"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                          color:
                            item.status === "COMPLETED"
                              ? "#15803d"
                              : item.status === "CANCELLED" || item.status === "NOSHOW"
                              ? "#dc2626"
                              : "#d97706",
                        }}
                      >
                        {item.statusLabel}
                      </span>
                      {(item as any).saleId && (
                        <Link
                          href={`/dashboard/sales?saleId=${(item as any).saleId}`}
                          style={{
                            marginLeft: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#6366f1",
                            background: "rgba(99, 102, 241, 0.12)",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Abrir cobro en Caja / Ventas"
                        >
                          🎟️ Caja
                        </Link>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: item.cashAmount > 0 ? "#16a34a" : "var(--text-muted)" }}>
                      {item.cashAmount > 0 ? `${item.cashAmount.toFixed(2)} €` : "-"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: item.cardAmount > 0 ? "#9333ea" : "var(--text-muted)" }}>
                      {item.cardAmount > 0 ? `${item.cardAmount.toFixed(2)} €` : "-"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>
                      {item.totalAmount > 0 ? `${item.totalAmount.toFixed(2)} €` : "-"}
                    </td>
                    <td className={styles.treatmentCell}>{item.treatment}</td>
                    <td style={{ fontSize: "12px", color: "#d97706", fontWeight: 600 }}>
                      {item.nextAppointment || "-"}
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.commentInput}
                        defaultValue={item.comments}
                        placeholder="Escribe anotaciones de cobro..."
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== item.comments) {
                            handleSaveComment(item.id, item.appointmentId, val);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
