"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import styles from "./ControlHorario.module.css";

interface WorkEntry {
  id: string;
  userId: string;
  clinicId: string;
  clockIn: string;
  clockOut: string | null;
  breakStart: string | null;
  totalBreaksMinutes: number;
  inNotes: string | null;
  outNotes: string | null;
  createdAt: string;
  user?: {
    name: string;
    lastName: string | null;
    role: string;
  };
}

export default function ControlHorarioPage() {
  const { user, activeClinic } = useApp();
  const [activeTab, setActiveTab] = useState<"fichar" | "admin">("fichar");
  
  // Real-time Clock display
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");

  // Control Horario states
  const [activeEntry, setActiveEntry] = useState<WorkEntry | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [notes, setNotes] = useState("");

  // History List (current user)
  const [myHistory, setMyHistory] = useState<WorkEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Admin section states
  const [adminEntries, setAdminEntries] = useState<WorkEntry[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [filterStaffId, setFilterStaffId] = useState("all");
  
  // Date filters
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [filterStartDate, setFilterStartDate] = useState(firstDayOfMonth.toISOString().substring(0, 10));
  const [filterEndDate, setFilterEndDate] = useState(lastDayOfMonth.toISOString().substring(0, 10));

  // Timer calculation for current shift
  const [elapsedTimeStr, setElapsedTimeStr] = useState("00:00:00");
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDateStr(
        now.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current status and history
  const fetchCurrentStatus = async () => {
    if (!user || !activeClinic) return;
    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/control-horario?clinicId=${activeClinic.id}&userId=${user.id}&todayOnly=true`);
      if (res.ok) {
        const data = await res.json();
        setActiveEntry(data);
      }
    } catch (e) {
      console.error("Error fetching control horario status:", e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchMyHistory = async () => {
    if (!user || !activeClinic) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/control-horario?clinicId=${activeClinic.id}&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMyHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAdminData = async () => {
    if (!activeClinic) return;
    setLoadingAdmin(true);
    try {
      let url = `/api/control-horario?clinicId=${activeClinic.id}&startDate=${filterStartDate}T00:00:00.000Z&endDate=${filterEndDate}T23:59:59.999Z`;
      if (filterStaffId !== "all") {
        url += `&userId=${filterStaffId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAdminEntries(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const fetchStaffList = async () => {
    if (!activeClinic) return;
    try {
      const res = await fetch(`/api/users?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setStaffList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCurrentStatus();
    fetchMyHistory();
  }, [user, activeClinic]);

  useEffect(() => {
    if (activeTab === "admin") {
      fetchAdminData();
      fetchStaffList();
    }
  }, [activeTab, filterStaffId, filterStartDate, filterEndDate, activeClinic]);

  // Handle elapsed time for active shift
  useEffect(() => {
    if (activeEntry && !activeEntry.clockOut) {
      const startTime = new Date(activeEntry.clockIn).getTime();

      const computeElapsed = () => {
        const now = new Date().getTime();
        let diffMs = now - startTime;

        // If on break, subtract time from current break start to now
        if (activeEntry.breakStart) {
          const breakStartMs = new Date(activeEntry.breakStart).getTime();
          diffMs = breakStartMs - startTime;
        }

        // Subtract accumulated break time
        diffMs -= activeEntry.totalBreaksMinutes * 60 * 1000;
        
        if (diffMs < 0) diffMs = 0;

        const secs = Math.floor((diffMs / 1000) % 60);
        const mins = Math.floor((diffMs / 1000 / 60) % 60);
        const hours = Math.floor(diffMs / 1000 / 60 / 60);

        setElapsedTimeStr(
          `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      };

      computeElapsed();
      if (!activeEntry.breakStart) {
        elapsedTimerRef.current = setInterval(computeElapsed, 1000);
      } else {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      }
    } else {
      setElapsedTimeStr("00:00:00");
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [activeEntry]);

  // Actions
  const handleClockIn = async () => {
    if (!user || !activeClinic) return;
    try {
      const res = await fetch("/api/control-horario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          clinicId: activeClinic.id,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveEntry(data);
        setNotes("");
        fetchMyHistory();
      } else {
        const err = await res.json();
        alert(err.error || "Error al fichar entrada.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  const handleUpdateStatus = async (action: "BREAK_START" | "BREAK_END" | "CLOCK_OUT") => {
    if (!activeEntry) return;
    try {
      const res = await fetch("/api/control-horario", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeEntry.id,
          action,
          notes: action === "CLOCK_OUT" && notes.trim() ? notes.trim() : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (action === "CLOCK_OUT") {
          setActiveEntry(null);
        } else {
          setActiveEntry(data);
        }
        setNotes("");
        fetchMyHistory();
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar estado.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  // Compute total duration of finished work entry
  const getDuration = (entry: WorkEntry): string => {
    if (!entry.clockOut) return "En curso";
    const start = new Date(entry.clockIn).getTime();
    const end = new Date(entry.clockOut).getTime();
    let netMs = end - start - (entry.totalBreaksMinutes * 60 * 1000);
    if (netMs < 0) netMs = 0;

    const mins = Math.floor((netMs / 1000 / 60) % 60);
    const hours = Math.floor(netMs / 1000 / 60 / 60);
    return `${hours}h ${mins}m`;
  };

  // Legal PDF Generation Report
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = adminEntries.map(entry => {
      const userName = `${entry.user?.name} ${entry.user?.lastName || ""}`.trim();
      const date = new Date(entry.clockIn).toLocaleDateString("es-ES");
      const inTime = new Date(entry.clockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const outTime = entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "En curso";
      const breakMins = entry.totalBreaksMinutes + " min";
      const totalHours = getDuration(entry);
      const notes = `${entry.inNotes || ""} ${entry.outNotes || ""}`.trim() || "-";

      return `
        <tr>
          <td>${userName}</td>
          <td>${date}</td>
          <td>${inTime}</td>
          <td>${outTime}</td>
          <td>${breakMins}</td>
          <td><strong>${totalHours}</strong></td>
          <td>${notes}</td>
          <td style="font-size: 10px; color: #888; text-align: center; font-family: monospace;">Firma Digital<br/>[OK]</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Registro de Jornada Laboral - ${activeClinic?.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; }
            .meta { font-size: 12px; text-align: right; line-height: 1.5; }
            .meta span { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .footer { margin-top: 50px; font-size: 10px; color: #555; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 8px; margin-top: 40px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Registro Oficial de Jornada Laboral</h1>
              <p style="font-size: 12px; color: #555; margin: 4px 0 0 0;">Real Decreto-ley 8/2019 de Registro de Jornada</p>
            </div>
            <div class="meta">
              <div><span>Empresa/Sede:</span> ${activeClinic?.name}</div>
              <div><span>Dirección:</span> ${activeClinic?.address}</div>
              <div><span>Periodo:</span> ${new Date(filterStartDate).toLocaleDateString("es-ES")} - ${new Date(filterEndDate).toLocaleDateString("es-ES")}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Pausas</th>
                <th>Horas Netas</th>
                <th>Observaciones</th>
                <th>Firma del Profesional</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top: 30px; font-size: 11px; color: #555; border: 1px dashed #999; padding: 12px; border-radius: 6px; background: #fafafa;">
            <strong>Declaración de Conformidad:</strong> La empresa certifica que el presente documento refleja fielmente los registros de jornada diaria de los trabajadores incorporados al sistema digital de control horario CLIFAV, en pleno cumplimiento de la legislación laboral vigente.
          </div>

          <div class="footer">
            <div class="signature">Firma del Representante Legal</div>
            <div class="signature">Firma de los Profesionales Recogidas</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Control Horario</h2>
          <div className={styles.subtitle}>{currentDateStr}</div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* LEFT COLUMN: Shift action card */}
        <div className={styles.card + " " + styles.clockCard}>
          <div className={styles.dateDisplay}>{currentTime}</div>
          <div className={styles.timeDisplay}>
            {activeEntry && !activeEntry.clockOut ? elapsedTimeStr : "00:00:00"}
          </div>

          {/* Dynamic Status Badge */}
          {loadingStatus ? (
            <div className={styles.statusIndicator + " " + styles.statusInactive}>Cargando...</div>
          ) : !activeEntry || activeEntry.clockOut ? (
            <div className={styles.statusIndicator + " " + styles.statusInactive}>🔴 Fuera de Jornada</div>
          ) : activeEntry.breakStart ? (
            <div className={styles.statusIndicator + " " + styles.statusBreak}>🟡 En Descanso</div>
          ) : (
            <div className={styles.statusIndicator + " " + styles.statusActive}>🟢 Jornada Activa</div>
          )}

          {/* Action Notes */}
          {(!activeEntry || !activeEntry.clockOut) && (
            <div className={styles.clockNotesArea}>
              <label>Observaciones / Notas del turno</label>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  !activeEntry || activeEntry.clockOut
                    ? "Notas al iniciar jornada (ej. Teletrabajo, guardia)..."
                    : "Notas al cerrar jornada o pausar..."
                }
              />
            </div>
          )}

          {/* Dynamic Action Buttons */}
          {!loadingStatus && (
            <div className={styles.btnGroup}>
              {!activeEntry || activeEntry.clockOut ? (
                <button type="button" className="btn btn-primary" onClick={handleClockIn} style={{ width: "100%" }}>
                  🚀 Iniciar Entrada (Clock In)
                </button>
              ) : (
                <>
                  {activeEntry.breakStart ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleUpdateStatus("BREAK_END")}
                      style={{ width: "100%", background: "#10b981", color: "#fff" }}
                    >
                      ▶️ Reanudar Trabajo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleUpdateStatus("BREAK_START")}
                      style={{ width: "100%", background: "#f59e0b", color: "#fff" }}
                    >
                      ⏸️ Iniciar Descanso (Pausa)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleUpdateStatus("CLOCK_OUT")}
                    style={{ width: "100%", background: "#ef4444", color: "#fff" }}
                  >
                    ⏹️ Registrar Salida (Clock Out)
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: History & Admin tabs */}
        <div className={styles.card + " " + styles.historyCard}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "fichar" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("fichar")}
            >
              Mi Historial
            </button>
            {user?.role === "ADMIN" && (
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "admin" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                Informes de Plantilla (Admin)
              </button>
            )}
          </div>

          {/* TAB 1: User personal history */}
          {activeTab === "fichar" && (
            <div className={styles.tableContainer}>
              {loadingHistory ? (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)" }}>
                  <div className={styles.spinner} />
                  Cargando tus fichajes...
                </div>
              ) : myHistory.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px" }}>
                  Aún no has registrado ningún fichaje en esta sede.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Pausas</th>
                      <th>Jornada Neta</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {new Date(item.clockIn).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td>{new Date(item.clockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td>
                          {item.clockOut
                            ? new Date(item.clockOut).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                            : "Activa"}
                        </td>
                        <td>{item.totalBreaksMinutes} min</td>
                        <td>
                          <strong>{getDuration(item)}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            {item.inNotes && `[Entrada]: ${item.inNotes}`}
                            {item.outNotes && ` [Salida]: ${item.outNotes}`}
                            {!item.inNotes && !item.outNotes && "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: Admin Reports panel */}
          {activeTab === "admin" && user?.role === "ADMIN" && (
            <div>
              {/* Filters */}
              <div className={styles.filtersRow}>
                <select
                  className={styles.select}
                  value={filterStaffId}
                  onChange={(e) => setFilterStaffId(e.target.value)}
                >
                  <option value="all">👥 Todos los empleados</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.lastName || ""}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="date"
                    className={styles.inputDate}
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>a</span>
                  <input
                    type="date"
                    className={styles.inputDate}
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>

                <button type="button" className={styles.exportBtn} onClick={handleDownloadPDF}>
                  📋 Exportar PDF Legal
                </button>
              </div>

              {/* Table */}
              <div className={styles.tableContainer}>
                {loadingAdmin ? (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--text-secondary)" }}>
                    <div className={styles.spinner} />
                    Consultando jornada de plantilla...
                  </div>
                ) : adminEntries.length === 0 ? (
                  <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px" }}>
                    No hay registros en el rango seleccionado.
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Profesional</th>
                        <th>Fecha</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Pausas</th>
                        <th>Horas Netas</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminEntries.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>
                              {item.user?.name} {item.user?.lastName || ""}
                            </strong>
                          </td>
                          <td>
                            {new Date(item.clockIn).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            {new Date(item.clockIn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td>
                            {item.clockOut
                              ? new Date(item.clockOut).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Activo"}
                          </td>
                          <td>{item.totalBreaksMinutes} min</td>
                          <td>
                            <strong>{getDuration(item)}</strong>
                          </td>
                          <td style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
                            {item.inNotes && `[E]: ${item.inNotes} `}
                            {item.outNotes && `[S]: ${item.outNotes}`}
                            {!item.inNotes && !item.outNotes && "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
