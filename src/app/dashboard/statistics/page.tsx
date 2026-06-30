"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Statistics.module.css";

interface KPIState {
  totalRevenue: number;
  appointmentsCount: number;
  activeClientsCount: number;
  avgTicket: number;
}

interface MonthlyTrend {
  name: string;
  value: number;
}

interface StaffStat {
  name: string;
  count: number;
}

interface ServiceStat {
  name: string;
  count: number;
  color: string;
}

export default function StatisticsPage() {
  const router = useRouter();
  const { activeClinic, user: currentUser } = useApp();

  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "estadisticas", "Ver Estadisticas")) {
      router.push("/dashboard/agenda");
    }
  }, [currentUser, router]);
  const [kpis, setKpis] = useState<KPIState>({
    totalRevenue: 0,
    appointmentsCount: 0,
    activeClientsCount: 0,
    avgTicket: 0,
  });
  
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyTrend[]>([]);
  const [appointmentsByStaff, setAppointmentsByStaff] = useState<StaffStat[]>([]);
  const [appointmentsByService, setAppointmentsByService] = useState<ServiceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClinic) return;
    setLoading(true);

    fetch(`/api/statistics?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        setKpis(data.kpis);
        setMonthlyRevenue(data.charts.monthlyRevenue);
        setAppointmentsByStaff(data.charts.appointmentsByStaff);
        setAppointmentsByService(data.charts.appointmentsByService);
        setLoading(false);
      });
  }, [activeClinic]);

  if (loading) {
    return <div className={styles.loadingState}>Calculando métricas y análisis de consulta...</div>;
  }

  // Helper calculation for Donut Chart
  const totalServiceCount = appointmentsByService.reduce((acc, curr) => acc + curr.count, 0);
  let accumulatedPercent = 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.title}>Estadísticas y Analítica</h1>
          <span className={styles.clinicSubtitle}>{activeClinic?.name}</span>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiHeader}>
            <span>Facturación Total</span>
            <div className={`${styles.kpiIcon} ${styles.blue}`}>€</div>
          </div>
          <div className={styles.kpiValue}>{kpis.totalRevenue.toFixed(2)}€</div>
          <div className={styles.kpiFooter}>Facturas cobradas en el centro</div>
        </div>

        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiHeader}>
            <span>Citas Registradas</span>
            <div className={`${styles.kpiIcon} ${styles.purple}`}>
              <Icons.Calendar size={16} />
            </div>
          </div>
          <div className={styles.kpiValue}>{kpis.appointmentsCount}</div>
          <div className={styles.kpiFooter}>Sesiones reservadas en agenda</div>
        </div>

        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiHeader}>
            <span>Pacientes Activos</span>
            <div className={`${styles.kpiIcon} ${styles.green}`}>
              <Icons.Users size={16} />
            </div>
          </div>
          <div className={styles.kpiValue}>{kpis.activeClientsCount}</div>
          <div className={styles.kpiFooter}>Fichas de clientes en esta sede</div>
        </div>

        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiHeader}>
            <span>Ticket Medio</span>
            <div className={`${styles.kpiIcon} ${styles.pink}`}>TM</div>
          </div>
          <div className={styles.kpiValue}>{kpis.avgTicket.toFixed(2)}€</div>
          <div className={styles.kpiFooter}>Media facturada por transacción</div>
        </div>
      </div>

      {/* Charts Grid Section */}
      <div className={styles.chartsGrid}>
        {/* CHART 1: LINE CHART (Revenue trend) */}
        <div className={`${styles.chartCard} glass`}>
          <h3>Evolución de Ingresos (Mensual)</h3>
          <div className={styles.chartCanvasWrapper}>
            {monthlyRevenue.length > 0 && (
              <svg viewBox="0 0 500 220" className={styles.svgChart}>
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="40" y1="20" x2="480" y2="20" className={styles.gridLine} />
                <line x1="40" y1="80" x2="480" y2="80" className={styles.gridLine} />
                <line x1="40" y1="140" x2="480" y2="140" className={styles.gridLine} />
                <line x1="40" y1="180" x2="480" y2="180" className={styles.axisLine} />

                {/* Y Axis labels */}
                <text x="30" y="24" className={styles.chartText} textAnchor="end">Max</text>
                <text x="30" y="84" className={styles.chartText} textAnchor="end">50%</text>
                <text x="30" y="144" className={styles.chartText} textAnchor="end">25%</text>
                <text x="30" y="184" className={styles.chartText} textAnchor="end">0</text>

                {/* Render area path and line path */}
                {(() => {
                  const maxVal = Math.max(...monthlyRevenue.map((m) => m.value)) || 100;
                  const points = monthlyRevenue.map((item, idx) => {
                    const x = 40 + idx * 80;
                    const y = 180 - (item.value / maxVal) * 150;
                    return { x, y };
                  });

                  const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  const areaPath = `${linePath} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

                  return (
                    <>
                      <path d={areaPath} fill="url(#chartGradient)" />
                      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                      
                      {/* Dots on points */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-panel-solid)" stroke="var(--primary)" strokeWidth="2" />
                          {/* Label values above dots */}
                          <text x={p.x} y={p.y - 10} className={styles.pointLabel} textAnchor="middle">
                            {Math.round(monthlyRevenue[idx].value)}€
                          </text>
                        </g>
                      ))}

                      {/* X Axis Labels */}
                      {points.map((p, idx) => (
                        <text key={idx} x={p.x} y="200" className={styles.chartText} textAnchor="middle">
                          {monthlyRevenue[idx].name}
                        </text>
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* CHART 2: BAR CHART (Appointments by Staff) */}
        <div className={`${styles.chartCard} glass`}>
          <h3>Citas por Especialista</h3>
          <div className={styles.chartCanvasWrapper}>
            {appointmentsByStaff.length === 0 ? (
              <div className={styles.emptyChart}>No hay datos suficientes.</div>
            ) : (
              <svg viewBox="0 0 500 220" className={styles.svgChart}>
                <line x1="50" y1="180" x2="480" y2="180" className={styles.axisLine} />
                
                {(() => {
                  const maxCount = Math.max(...appointmentsByStaff.map((s) => s.count)) || 10;
                  const barWidth = 40;
                  const spacing = 70;
                  
                  return appointmentsByStaff.map((staff, idx) => {
                    const x = 70 + idx * (barWidth + spacing);
                    const barHeight = (staff.count / maxCount) * 140;
                    const y = 180 - barHeight;

                    return (
                      <g key={idx} className={styles.barGroup}>
                        {/* Rounded bar */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          fill="var(--accent)"
                          className={styles.barRect}
                        />
                        {/* Value label on top of bar */}
                        <text x={x + barWidth / 2} y={y - 8} className={styles.barValueLabel} textAnchor="middle">
                          {staff.count}
                        </text>
                        {/* Staff name below bar */}
                        <text x={x + barWidth / 2} y="196" className={styles.chartText} textAnchor="middle" style={{ fontSize: "10px" }}>
                          {staff.name.split(" ")[1] || staff.name.split(" ")[0]}
                        </text>
                      </g>
                    );
                  });
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* CHART 3: DONUT CHART (Services Popularity) */}
        <div className={`${styles.chartCard} glass`}>
          <h3>Distribución de Tratamientos</h3>
          <div className={styles.donutLayout}>
            <div className={styles.donutWrapper}>
              {appointmentsByService.length === 0 ? (
                <div className={styles.emptyChart}>Sin datos.</div>
              ) : (
                <svg viewBox="0 0 200 200" className={styles.svgDonut}>
                  <circle cx="100" cy="100" r="80" fill="transparent" stroke="var(--bg-input)" strokeWidth="20" />
                  
                  {appointmentsByService.map((service, idx) => {
                    const percent = service.count / totalServiceCount;
                    const radius = 80;
                    const circumference = 2 * Math.PI * radius;
                    
                    const strokeDasharray = `${circumference * percent} ${circumference}`;
                    const strokeDashoffset = -circumference * accumulatedPercent;
                    
                    // Update accumulator
                    accumulatedPercent += percent;

                    return (
                      <circle
                        key={idx}
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="transparent"
                        stroke={service.color}
                        strokeWidth="20"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 100 100)"
                      />
                    );
                  })}
                  
                  {/* Text middle */}
                  <text x="100" y="95" textAnchor="middle" className={styles.donutMiddleLabel}>Servicios</text>
                  <text x="100" y="120" textAnchor="middle" className={styles.donutMiddleValue}>{totalServiceCount}</text>
                </svg>
              )}
            </div>

            {/* Legend list */}
            <div className={styles.donutLegend}>
              {appointmentsByService.map((service, idx) => (
                <div key={idx} className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ backgroundColor: service.color }} />
                  <span className={styles.legendName}>{service.name}</span>
                  <span className={styles.legendCount}>
                    {service.count} ({Math.round((service.count / totalServiceCount) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART 4: SUMMARY LISTS */}
        <div className={`${styles.chartCard} glass`}>
          <h3>Rendimiento del Centro</h3>
          <div className={styles.rankingContainer}>
            <div className={styles.rankingBlock}>
              <h4>Tratamientos Populares</h4>
              <div className={styles.rankingList}>
                {appointmentsByService.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={styles.rankingItem}>
                    <span className={styles.rankNum}>#{idx + 1}</span>
                    <span className={styles.rankName}>{item.name}</span>
                    <span className={styles.rankMetric}>{item.count} citas</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.rankingBlock}>
              <h4>Especialistas con más reservas</h4>
              <div className={styles.rankingList}>
                {appointmentsByStaff.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={styles.rankingItem}>
                    <span className={styles.rankNum}>#{idx + 1}</span>
                    <span className={styles.rankName}>{item.name}</span>
                    <span className={styles.rankMetric}>{item.count} citas</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
