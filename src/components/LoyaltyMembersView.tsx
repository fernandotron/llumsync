"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ToastContainer";
import styles from "./LoyaltyMembersView.module.css";

import { PRESET_TEMPLATES, CardTemplate, SvgQrCode } from "./LoyaltyCardDesigner";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dniNif?: string;
  phone?: string;
  isMember?: boolean;
  memberNumber?: string;
  membershipDate?: string;
  createdAt: string;
}

export default function LoyaltyMembersView() {
  const { activeClinic } = useApp();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState<Client | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<CardTemplate>(PRESET_TEMPLATES[0]);

  // Add Member Form
  const [selectedClientId, setSelectedClientId] = useState("");
  const [customMemberNumber, setCustomMemberNumber] = useState("");

  const fetchMembers = async () => {
    if (!activeClinic?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/membership?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data || []);
      }

      // Fetch all clients to allow enrolling new members
      const clientsRes = await fetch(`/api/clients?clinicId=${activeClinic.id}`);
      if (clientsRes.ok) {
        const clientData = await clientsRes.json();
        const list = clientData.clients || clientData || [];
        setAllClients(list);
      }

      // Fetch active card template
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
        }),
      });
      if (res.ok) {
        const newMember = await res.json();
        toast.success(`Socio ${newMember.memberNumber} registrado correctamente ✨`);
        setShowAddMemberModal(false);
        setSelectedClientId("");
        setCustomMemberNumber("");
        fetchMembers();
      } else {
        toast.error("Error al registrar el socio");
      }
    } catch (err) {
      toast.error("Error de conexión");
    }
  };

  // Handle Excel Export (Réplica exacta de la Imagen 3 del Excel)
  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      const exportRows = members.map((m) => ({
        FECHA: m.membershipDate ? new Date(m.membershipDate).toLocaleDateString("es-ES") : new Date(m.createdAt).toLocaleDateString("es-ES"),
        NOMBRE: `${m.firstName} ${m.lastName}`.trim(),
        "Nº SOCIO": m.memberNumber || "-",
        DNI: m.dniNif || "-",
        TELÉFONO: m.phone || "-",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows.length > 0 ? exportRows : [{ Info: "Sin socios registrados" }]);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Club de Socios");
      XLSX.writeFile(workbook, `Socios_Fidelizacion_${activeClinic?.name || "Clinica"}.xlsx`);
      toast.success("Listado de socios descargado en Excel 📊");
    } catch (err) {
      toast.error("Error al exportar a Excel");
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.memberNumber && m.memberNumber.toLowerCase().includes(q)) ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      (m.dniNif && m.dniNif.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q))
    );
  });

  const nonMemberClients = allClients.filter((c) => !c.isMember);

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div>
          <h2 className={styles.headerTitle}>💳 Tarjetas de Fidelización y Club de Socios</h2>
          <p className={styles.headerSub}>
            Programa de Socios y Tarjetas de Experiencias ({members.length} socios activos)
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

      {/* Main Section */}
      <div className={styles.sectionCard}>
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            className="input"
            style={{ width: "100%", maxWidth: "400px" }}
            placeholder="Buscar por Nº de Socio (ej: M00001), Nombre o DNI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.tableContainer}>
          {filteredMembers.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px 0" }}>
              No hay socios registrados que coincidan con la búsqueda.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha Alta</th>
                  <th>Nº Socio</th>
                  <th>Nombre y Apellidos</th>
                  <th>DNI / NIF</th>
                  <th>Teléfono</th>
                  <th style={{ textAlign: "right" }}>Tarjeta Digital</th>
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
                    <td style={{ fontWeight: 800 }}>
                      {m.firstName} {m.lastName}
                    </td>
                    <td>{m.dniNif || "-"}</td>
                    <td>{m.phone || "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "6px 14px", fontSize: "12px", color: "var(--primary)", borderColor: "var(--primary)" }}
                        onClick={() => setShowCardModal(m)}
                      >
                        📇 Ver Tarjeta Socio
                      </button>
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
              Asigna una tarjeta de fidelización a un paciente registrado.
            </p>

            <form onSubmit={handleEnrollMember}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
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

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Código de Socio (Opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: M00015 (Vacío para autogenerar secuencial)"
                  value={customMemberNumber}
                  onChange={(e) => setCustomMemberNumber(e.target.value)}
                />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Si lo dejas en blanco, el sistema asignará el número `M000XX` siguiente.
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

      {/* MODAL: TARJETA DIGITAL PREMIUM DE SOCIO */}
      {showCardModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>📇 Tarjeta Digital de Socio</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: "4px 8px" }}
                onClick={() => setShowCardModal(null)}
              >
                ✕
              </button>
            </div>

            {/* Render Canva Active Template Membership Card */}
            <div
              style={{
                width: "537px",
                height: "338px",
                margin: "20px auto 0",
                position: "relative",
                borderRadius: `${activeTemplate.borderRadius || 18}px`,
                boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
                overflow: "hidden",
                userSelect: "none",
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

              {activeTemplate.elements.map((el) => {
                const replaceMemberData = (rawText?: string) => {
                  if (!rawText) return "";
                  const cName = activeClinic?.name || "Clínica Centro";
                  const fullName = `${showCardModal.firstName} ${showCardModal.lastName}`.trim();
                  const mNum = showCardModal.memberNumber || "M00001";
                  const dni = showCardModal.dniNif || "-";
                  const dateStr = showCardModal.membershipDate
                    ? new Date(showCardModal.membershipDate).toLocaleDateString("es-ES")
                    : new Date(showCardModal.createdAt).toLocaleDateString("es-ES");

                  const cleanText = rawText.replace(/https?:\/\/clifav\.app\/verify\//g, "");

                  return cleanText
                    .replace(/\{\{Nombre de Cliente\}\}/g, fullName)
                    .replace(/\{\{Numero de socio\}\}/g, mNum)
                    .replace(/\{\{DNI\}\}/g, dni)
                    .replace(/\{\{Fecha Alta\}\}/g, dateStr)
                    .replace(/\{\{Nombre Clinica\}\}/g, cName);
                };

                return (
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
                          textAlign: el.textAlign || "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {replaceMemberData(el.content)}
                      </div>
                    ) : el.type === "qr" ? (
                      <SvgQrCode
                        value={replaceMemberData(el.content)}
                        size={el.width || 80}
                        fgColor={el.qrFgColor || "#ffffff"}
                        bgColor={el.qrBgColor || "transparent"}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ Imprimir Tarjeta
              </button>
              <button className="btn btn-primary" onClick={() => setShowCardModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
