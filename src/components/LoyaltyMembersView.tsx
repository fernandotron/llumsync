"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ToastContainer";
import styles from "./LoyaltyMembersView.module.css";
import { PRESET_TEMPLATES, CardTemplate, SvgQrCode } from "./LoyaltyCardDesigner";

export interface MemberClient {
  id: string;
  clientNumber: number;
  firstName: string;
  lastName: string;
  dniNif?: string;
  phone?: string;
  email?: string;
  address?: string;
  isMember?: boolean;
  memberNumber?: string;
  membershipDate?: string;
  membershipTier?: string;
  membershipStatus?: string;
  membershipPoints?: number;
  createdAt: string;
}

interface StatsState {
  totalMembers: number;
  activeMembers: number;
  activePercent: number;
  vipGoldMembers: number;
  totalPoints: number;
  newThisMonth: number;
  tierDistribution: {
    VIP: number;
    GOLD: number;
    PLATINUM: number;
    ESTÁNDAR: number;
    OTROS: number;
  };
}

export default function LoyaltyMembersView() {
  const { activeClinic } = useApp();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberClient[]>([]);
  const [allClients, setAllClients] = useState<MemberClient[]>([]);
  const [stats, setStats] = useState<StatsState>({
    totalMembers: 0,
    activeMembers: 0,
    activePercent: 100,
    vipGoldMembers: 0,
    totalPoints: 0,
    newThisMonth: 0,
    tierDistribution: { VIP: 0, GOLD: 0, PLATINUM: 0, ESTÁNDAR: 0, OTROS: 0 },
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState<MemberClient | null>(null);
  const [editingMember, setEditingMember] = useState<MemberClient | null>(null);
  const [unenrollMember, setUnenrollMember] = useState<MemberClient | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<CardTemplate>(PRESET_TEMPLATES[0]);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);

  // Add Member Form
  const [selectedClientId, setSelectedClientId] = useState("");
  const [customMemberNumber, setCustomMemberNumber] = useState("");
  const [customTier, setCustomTier] = useState("ESTÁNDAR");
  const [customPoints, setCustomPoints] = useState<number>(0);

  // Edit Member Form
  const [editMemberNumber, setEditMemberNumber] = useState("");
  const [editTier, setEditTier] = useState("ESTÁNDAR");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editPoints, setEditPoints] = useState<number>(0);

  const cardRef = useRef<HTMLDivElement>(null);

  const fetchMembers = async () => {
    if (!activeClinic?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/membership?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.members || [];
        setMembers(list);
        if (data.stats) {
          setStats(data.stats);
        }
      }

      // Fetch all clients to allow enrolling new members
      const clientsRes = await fetch(`/api/clients?clinicId=${activeClinic.id}`);
      if (clientsRes.ok) {
        const clientData = await clientsRes.json();
        const list = clientData.clients || clientData || [];
        setAllClients(list);
      }

      // Fetch active card template from PostgreSQL
      const tplRes = await fetch(`/api/loyalty/templates?clinicId=${activeClinic.id}`);
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        if (tplData) {
          const allTpls = [...PRESET_TEMPLATES, ...(tplData.templates || [])];
          const active = allTpls.find((t) => t.id === tplData.activeTemplateId) || PRESET_TEMPLATES[0];
          setActiveTemplate(active);
        }
      }
    } catch (err) {
      console.error("Error fetching members:", err);
      toast.error("Error al cargar la lista de socios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeClinic?.id]);

  // Open Edit Modal with patient's data
  const handleOpenEdit = (m: MemberClient) => {
    setEditingMember(m);
    setEditMemberNumber(m.memberNumber || "");
    setEditTier(m.membershipTier || "ESTÁNDAR");
    setEditStatus(m.membershipStatus || "ACTIVE");
    setEditPoints(m.membershipPoints || 0);
  };

  // Submit Edit Member
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const res = await fetch("/api/clients/membership", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: editingMember.id,
          memberNumber: editMemberNumber,
          membershipTier: editTier,
          membershipStatus: editStatus,
          membershipPoints: editPoints,
        }),
      });

      if (res.ok) {
        toast.success(`Datos del socio ${editMemberNumber} actualizados correctamente ✨`);
        setEditingMember(null);
        fetchMembers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al actualizar el socio");
      }
    } catch {
      toast.error("Error de conexión al actualizar");
    }
  };

  // Confirm Unenroll Member (Dar de baja)
  const handleConfirmUnenroll = async () => {
    if (!unenrollMember) return;

    try {
      const res = await fetch(`/api/clients/membership?clientId=${unenrollMember.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Membresía cancelada correctamente. El paciente sigue registrado en la clínica.`);
        setUnenrollMember(null);
        fetchMembers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al dar de baja al socio");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  // Handle Enroll Member
  const handleEnrollMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !activeClinic?.id) {
      toast.error("Selecciona un paciente");
      return;
    }
    try {
      const res = await fetch("/api/clients/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          clinicId: activeClinic.id,
          memberNumber: customMemberNumber || undefined,
          membershipTier: customTier,
          membershipPoints: customPoints,
          membershipStatus: "ACTIVE",
        }),
      });
      if (res.ok) {
        const newMember = await res.json();
        toast.success(`Socio ${newMember.memberNumber} (${customTier}) registrado con éxito ✨`);
        setShowAddMemberModal(false);
        setSelectedClientId("");
        setCustomMemberNumber("");
        setCustomTier("ESTÁNDAR");
        setCustomPoints(0);
        fetchMembers();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Error al registrar el socio");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  // Handle Send Card via WhatsApp
  const handleSendCardWhatsApp = (m: MemberClient) => {
    if (!m.phone) {
      toast.error("El socio no tiene número de teléfono registrado");
      return;
    }

    const cleanPhone = m.phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const clinicName = activeClinic?.name || "Clifav Medical Center";
    const fullName = `${m.firstName} ${m.lastName}`.trim();
    const tierName = m.membershipTier || "ESTÁNDAR";
    const mNum = m.memberNumber || "Socio";
    const pts = m.membershipPoints || 0;

    const message = `✨ *¡Hola, ${fullName}!* ✨\n\nTe compartimos los datos de tu *Tarjeta Digital del Club de Fidelización* en *${clinicName}*:\n\n` +
      `🏷️ *Nº de Socio:* ${mNum}\n` +
      `⭐ *Categoría:* ${tierName}\n` +
      `🎁 *Puntos Acumulados:* ${pts} pts\n` +
      `🩺 *Estado:* ACTIVO\n\n` +
      `Presenta este número o tu código QR en recepción para disfrutar de tus privilegios y descuentos exclusivos.\n\n` +
      `¡Muchas gracias por tu confianza! 🌟`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    window.open(waUrl, "_blank");
    toast.success("Abriendo WhatsApp con la tarjeta del socio 📲");
  };

  // Download Card as High-Res PNG
  const handleDownloadCardPng = async () => {
    if (!cardRef.current || !showCardModal) return;
    setIsDownloadingCard(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const filename = `Tarjeta_Socio_${showCardModal.memberNumber || "Club"}_${showCardModal.firstName}_${showCardModal.lastName}.png`.replace(/\s+/g, "_");
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Tarjeta digital descargada en alta resolución (PNG) 📥");
    } catch (err) {
      console.error("Error generating card PNG:", err);
      toast.error("Error al generar la imagen de la tarjeta");
    } finally {
      setIsDownloadingCard(false);
    }
  };

  // Official Multi-Column Excel Export
  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      const exportRows = filteredMembers.map((m) => ({
        "FECHA ALTA": m.membershipDate
          ? new Date(m.membershipDate).toLocaleDateString("es-ES")
          : new Date(m.createdAt).toLocaleDateString("es-ES"),
        "Nº SOCIO": m.memberNumber || "-",
        CATEGORÍA: m.membershipTier || "ESTÁNDAR",
        ESTADO: m.membershipStatus || "ACTIVE",
        "NOMBRE Y APELLIDOS": `${m.firstName} ${m.lastName}`.trim(),
        "DNI / NIF": m.dniNif || "-",
        TELÉFONO: m.phone || "-",
        EMAIL: m.email || "-",
        "PUNTOS FIDELIZACIÓN": m.membershipPoints || 0,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(
        exportRows.length > 0
          ? exportRows
          : [{ Info: "Sin socios registrados en los filtros seleccionados" }]
      );

      // Auto column widths
      worksheet["!cols"] = [
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 12 },
        { wch: 30 },
        { wch: 15 },
        { wch: 16 },
        { wch: 28 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Club de Socios");
      XLSX.writeFile(workbook, `Club_Socios_${(activeClinic?.name || "Clinica").replace(/\s+/g, "_")}.xlsx`);
      toast.success("Listado de socios exportado en Excel (.xlsx) 📊");
    } catch (err) {
      console.error("Excel error:", err);
      toast.error("Error al exportar a Excel");
    }
  };

  // Live member interpolation function for digital cards
  const replaceMemberData = (rawText?: string, m?: MemberClient | null) => {
    if (!rawText || !m) return "";
    const cName = activeClinic?.name || "Clínica DocFav";
    const fullName = `${m.firstName} ${m.lastName}`.trim();
    const mNum = m.memberNumber || "M00001";
    const dni = m.dniNif || "-";
    const dateStr = m.membershipDate
      ? new Date(m.membershipDate).toLocaleDateString("es-ES")
      : new Date(m.createdAt).toLocaleDateString("es-ES");
    const tier = m.membershipTier || "ESTÁNDAR";
    const pts = `${m.membershipPoints || 0} pts`;
    const status = m.membershipStatus === "ACTIVE" ? "ACTIVO" : m.membershipStatus || "ACTIVO";

    const cleanText = rawText.replace(/https?:\/\/clifav\.app\/verify\//g, "");

    return cleanText
      .replace(/\{\{Nombre de Cliente\}\}/g, fullName)
      .replace(/\{\{Numero de socio\}\}/g, mNum)
      .replace(/\{\{DNI\}\}/g, dni)
      .replace(/\{\{Fecha Alta\}\}/g, dateStr)
      .replace(/\{\{Nivel\}\}/g, tier)
      .replace(/\{\{Tier\}\}/g, tier)
      .replace(/\{\{Puntos\}\}/g, pts)
      .replace(/\{\{Estado\}\}/g, status)
      .replace(/\{\{Nombre Clinica\}\}/g, cName);
  };

  const filteredMembers = members.filter((m) => {
    if (tierFilter !== "ALL" && (m.membershipTier || "ESTÁNDAR").toUpperCase() !== tierFilter) {
      return false;
    }
    if (statusFilter !== "ALL" && (m.membershipStatus || "ACTIVE").toUpperCase() !== statusFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.memberNumber && m.memberNumber.toLowerCase().includes(q)) ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      (m.dniNif && m.dniNif.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.membershipTier && m.membershipTier.toLowerCase().includes(q))
    );
  });

  const nonMemberClients = allClients.filter((c) => !c.isMember);

  const getTierClass = (tier?: string) => {
    const t = (tier || "ESTÁNDAR").toUpperCase();
    if (t === "VIP") return styles.tierVIP;
    if (t === "GOLD") return styles.tierGOLD;
    if (t === "PLATINUM") return styles.tierPLATINUM;
    return styles.tierESTANDAR;
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "ACTIVE").toUpperCase();
    if (s === "ACTIVE") return <span className={`${styles.statusBadge} ${styles.statusActive}`}>● Activo</span>;
    if (s === "EXPIRED") return <span className={`${styles.statusBadge} ${styles.statusExpired}`}>● Expirado</span>;
    return <span className={`${styles.statusBadge} ${styles.statusCancelled}`}>● Cancelado</span>;
  };

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div>
          <h2 className={styles.headerTitle}>
            💳 Tarjetas de Fidelización y Club de Socios
          </h2>
          <p className={styles.headerSub}>
            Gestión ejecutiva de fidelización, categorías VIP/Gold, saldo de puntos y carnet digital
          </p>
        </div>

        <div className={styles.actionGroup}>
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
          <button className="btn btn-primary" onClick={() => setShowAddMemberModal(true)}>
            ✨ Dar de Alta Nuevo Socio
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI DASHBOARD */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: TOTAL SOCIOS */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: "rgba(59, 130, 246, 0.12)", color: "#2563eb" }}>
            👥
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total de Socios</span>
            <span className={styles.kpiValue}>{stats.totalMembers}</span>
            <span className={styles.kpiSubtext}>
              <span style={{ color: "#16a34a", fontWeight: 700 }}>{stats.activePercent}%</span> activos en la clínica
            </span>
          </div>
        </div>

        {/* KPI 2: SOCIOS VIP / GOLD */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: "rgba(245, 158, 11, 0.12)", color: "#d97706" }}>
            ⭐
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Socios VIP & Gold</span>
            <span className={styles.kpiValue}>{stats.vipGoldMembers}</span>
            <span className={styles.kpiSubtext}>
              {stats.tierDistribution.VIP} VIP · {stats.tierDistribution.GOLD} Gold · {stats.tierDistribution.PLATINUM} Plat.
            </span>
          </div>
        </div>

        {/* KPI 3: PUNTOS ACUMULADOS */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: "rgba(168, 85, 247, 0.12)", color: "#9333ea" }}>
            🎁
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Puntos Fidelización</span>
            <span className={styles.kpiValue}>{stats.totalPoints.toLocaleString("es-ES")}</span>
            <span className={styles.kpiSubtext}>Puntos canjeables acumulados</span>
          </div>
        </div>

        {/* KPI 4: NUEVAS ALTAS MES */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: "rgba(34, 197, 94, 0.12)", color: "#16a34a" }}>
            📈
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Altas este Mes</span>
            <span className={styles.kpiValue}>+{stats.newThisMonth}</span>
            <span className={styles.kpiSubtext}>Nuevos socios incorporados</span>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className={styles.sectionCard}>
        {/* Filters Toolbar */}
        <div className={styles.toolbarRow}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className="input"
              style={{ width: "100%" }}
              placeholder="Buscar por Nº de Socio, Nombre, DNI o Teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tier Filter Pills */}
          <div className={styles.filterPillsRow}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginRight: "4px" }}>
              Nivel:
            </span>
            {["ALL", "VIP", "GOLD", "PLATINUM", "ESTÁNDAR"].map((t) => (
              <button
                key={t}
                className={`${styles.filterPill} ${tierFilter === t ? styles.filterPillActive : ""}`}
                onClick={() => setTierFilter(t)}
              >
                {t === "ALL" ? "Todos" : t}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className={styles.filterPillsRow}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginRight: "4px" }}>
              Estado:
            </span>
            {[
              { id: "ALL", label: "Todos" },
              { id: "ACTIVE", label: "Activos" },
              { id: "EXPIRED", label: "Expirados" },
              { id: "CANCELLED", label: "Cancelados" },
            ].map((s) => (
              <button
                key={s.id}
                className={`${styles.filterPill} ${statusFilter === s.id ? styles.filterPillActive : ""}`}
                onClick={() => setStatusFilter(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member Table */}
        <div className={styles.tableContainer}>
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
              Cargando socios del club...
            </p>
          ) : filteredMembers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
              <p style={{ fontSize: "16px", fontWeight: 600 }}>No hay socios que coincidan con la búsqueda o filtro.</p>
              <p style={{ fontSize: "13px" }}>Puedes añadir nuevos socios con el botón "Dar de Alta Nuevo Socio".</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha Alta</th>
                  <th>Nº Socio</th>
                  <th>Categoría</th>
                  <th>Nombre y Apellidos</th>
                  <th>DNI / NIF</th>
                  <th>Teléfono</th>
                  <th>Puntos</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.membershipDate
                        ? new Date(m.membershipDate).toLocaleDateString("es-ES")
                        : new Date(m.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td>
                      <span className={styles.memberBadge}>{m.memberNumber || "M00001"}</span>
                    </td>
                    <td>
                      <span className={`${styles.tierBadge} ${getTierClass(m.membershipTier)}`}>
                        {m.membershipTier || "ESTÁNDAR"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>
                      {m.firstName} {m.lastName}
                    </td>
                    <td>{m.dniNif || "-"}</td>
                    <td>{m.phone || "-"}</td>
                    <td>
                      <strong style={{ color: "var(--primary)" }}>{m.membershipPoints || 0} pts</strong>
                    </td>
                    <td>{getStatusBadge(m.membershipStatus)}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "12px", color: "var(--primary)", borderColor: "var(--primary)" }}
                          onClick={() => setShowCardModal(m)}
                          title="Ver tarjeta digital"
                        >
                          📇 Carnet
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "12px" }}
                          onClick={() => handleOpenEdit(m)}
                          title="Editar socio"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "12px", color: "#ef4444", borderColor: "#fca5a5" }}
                          onClick={() => setUnenrollMember(m)}
                          title="Dar de baja membresía"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: DAR DE ALTA NUEVO SOCIO */}
      {showAddMemberModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>✨ Registrar Nuevo Socio</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              Asigna una membresía y tarjeta digital de fidelización a un paciente registrado.
            </p>

            <form onSubmit={handleEnrollMember}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Seleccionar Paciente *</label>
                <select
                  className="input select"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar paciente de la lista...</option>
                  {nonMemberClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.dniNif ? `(${c.dniNif})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Categoría / Nivel</label>
                  <select
                    className="input select"
                    value={customTier}
                    onChange={(e) => setCustomTier(e.target.value)}
                  >
                    <option value="ESTÁNDAR">ESTÁNDAR</option>
                    <option value="GOLD">GOLD</option>
                    <option value="VIP">VIP</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Puntos Iniciales</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Código de Socio (Opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: M00015 (Vacío para autogenerar secuencial)"
                  value={customMemberNumber}
                  onChange={(e) => setCustomMemberNumber(e.target.value)}
                />
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                  Si lo dejas en blanco, el sistema asignará automáticamente el siguiente número secuencial `M000XX`.
                </span>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMemberModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Alta de Socio
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EDITAR SOCIO */}
      {editingMember && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
              ✏️ Modificar Socio: {editingMember.firstName} {editingMember.lastName}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
              Actualiza el número de socio, categoría de fidelización, saldo de puntos o estado.
            </p>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">Nº de Socio</label>
                <input
                  type="text"
                  className="input"
                  value={editMemberNumber}
                  onChange={(e) => setEditMemberNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Categoría / Nivel</label>
                  <select
                    className="input select"
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                  >
                    <option value="ESTÁNDAR">ESTÁNDAR</option>
                    <option value="GOLD">GOLD</option>
                    <option value="VIP">VIP</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado de Membresía</label>
                  <select
                    className="input select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVO</option>
                    <option value="EXPIRED">EXPIRADO</option>
                    <option value="CANCELLED">CANCELADO</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Saldo de Puntos de Fidelización</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={editPoints}
                  onChange={(e) => setEditPoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMember(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: DAR DE BAJA MEMBRESÍA */}
      {unenrollMember && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#dc2626" }}>
              ⚠️ Confirmar Baja de Membresía
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--text-primary)" }}>
              ¿Estás seguro de que deseas retirar la membresía del socio{" "}
              <strong>
                {unenrollMember.firstName} {unenrollMember.lastName} (#{unenrollMember.memberNumber})
              </strong>
              ?
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "var(--text-secondary)" }}>
              Esta acción desactivará su tarjeta de socio pero <strong>mantendrá intacto</strong> todo su historial clínico, citas y datos en la clínica.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setUnenrollMember(null)}>
                Volver
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                onClick={handleConfirmUnenroll}
              >
                Sí, Dar de Baja Membresía
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: TARJETA DIGITAL PREMIUM DE SOCIO */}
      {showCardModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalBox} ${styles.modalBoxLarge}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>📇 Tarjeta Digital de Socio</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                  {showCardModal.firstName} {showCardModal.lastName} · {showCardModal.membershipTier || "ESTÁNDAR"}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "4px 8px" }}
                onClick={() => setShowCardModal(null)}
              >
                ✕
              </button>
            </div>

            {/* Render Canva Active Template Membership Card */}
            <div className={styles.cardContainerStage}>
              <div
                ref={cardRef}
                style={{
                  width: "537px",
                  height: "338px",
                  position: "relative",
                  borderRadius: `${activeTemplate.borderRadius || 18}px`,
                  boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                  userSelect: "none",
                  flexShrink: 0,
                  background:
                    activeTemplate.bgType === "solid"
                      ? activeTemplate.bgColor1 || "#0f172a"
                      : activeTemplate.bgType === "image" && activeTemplate.bgImage
                      ? `url(${activeTemplate.bgImage}) center/cover no-repeat`
                      : `linear-gradient(${activeTemplate.gradientAngle || 135}deg, ${
                          activeTemplate.bgColor1 || "#0f172a"
                        } 0%, ${activeTemplate.bgColor2 || "#1e293b"} 100%)`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />

                {activeTemplate.elements.map((el) => (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      zIndex: el.zIndex,
                    }}
                  >
                    {el.type === "text" ? (
                      <div
                        style={{
                          fontSize: `${el.fontSize || 16}px`,
                          fontFamily: el.fontFamily || "Inter",
                          color: el.color || "#ffffff",
                          fontWeight: el.fontWeight || "normal",
                          fontStyle: el.fontStyle || "normal",
                          textDecoration: el.textDecoration || "none",
                          textTransform: el.textTransform || "none",
                          textAlign: el.textAlign || "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {replaceMemberData(el.content, showCardModal)}
                      </div>
                    ) : el.type === "image" && el.content ? (
                      <img
                        src={el.content}
                        alt="Card asset"
                        style={{
                          width: `${el.width || 100}px`,
                          height: `${el.height || 100}px`,
                          opacity: el.opacity ?? 1,
                          borderRadius: `${el.borderRadius || 0}px`,
                          objectFit: "contain",
                        }}
                      />
                    ) : el.type === "qr" ? (
                      <SvgQrCode
                        value={replaceMemberData(el.content, showCardModal)}
                        size={el.width || 80}
                        fgColor={el.qrFgColor || "#ffffff"}
                        bgColor={el.qrBgColor || "transparent"}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons: WhatsApp, Download PNG, Print */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "20px",
                borderTop: "1px solid var(--border-color)",
                paddingTop: "16px",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={`${styles.whatsappBtn} btn`}
                  onClick={() => handleSendCardWhatsApp(showCardModal)}
                  title="Enviar tarjeta al paciente por WhatsApp"
                >
                  📲 Enviar por WhatsApp
                </button>
                <button
                  className={`${styles.downloadBtn} btn`}
                  onClick={handleDownloadCardPng}
                  disabled={isDownloadingCard}
                  title="Descargar imagen PNG para imprimir o guardar"
                >
                  {isDownloadingCard ? "⏳ Generando..." : "📥 Descargar Carnet (PNG)"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  🖨️ Imprimir
                </button>
                <button className="btn btn-primary" onClick={() => setShowCardModal(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
