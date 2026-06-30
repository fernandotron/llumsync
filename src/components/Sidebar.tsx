"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/navigation"; // Wait! In next.js 15+ we import Link from "next/link"
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "./Icons";
import styles from "./Sidebar.module.css";
import LinkComponent from "next/link"; // importing Link directly as next/link is safer
import { hasPermission } from "@/lib/permissions";

export default function Sidebar() {
  const { user, activeClinic, setActiveClinic, sidebarCollapsed, setSidebarCollapsed, logout, theme, toggleTheme } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [showClinicsDropdown, setShowClinicsDropdown] = useState(false);
  const clinicsDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Close clinics dropdown when clicking outside it
      if (clinicsDropdownRef.current && !clinicsDropdownRef.current.contains(e.target as Node)) {
        setShowClinicsDropdown(false);
      }
      // Collapse the full sidebar when clicking outside it (only when expanded)
      if (
        !sidebarCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setSidebarCollapsed(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  if (!user) return null;

  // Check if user has accounting permissions
  const cName = activeClinic?.name || "";
  const hasAccountingAccess = user.role === "ADMIN" || 
    hasPermission(user, "contabilidad", "Artículos - Todo") ||
    hasPermission(user, "contabilidad", "Artículos - Solo artículos relacionados") ||
    hasPermission(user, "contabilidad", "Facturas - Todo") ||
    hasPermission(user, "contabilidad", "Facturas - " + cName) ||
    hasPermission(user, "contabilidad", "Pagos") ||
    hasPermission(user, "contabilidad", "Resumen") ||
    hasPermission(user, "contabilidad", "Ingresos y Gastos") ||
    hasPermission(user, "contabilidad", "Solo cobrar");

  const navItems = [
    { name: "Agenda", path: "/dashboard/agenda", icon: <Icons.Calendar size={20} /> },
    ...(user.role === "ADMIN" || hasPermission(user, "clientes", "Ver clientes") ? [
      { name: "Contactos", path: "/dashboard/contacts", icon: <Icons.Users size={20} /> }
    ] : []),
    ...(hasAccountingAccess ? [
      { name: "Ventas", path: "/dashboard/sales", icon: <Icons.Sales size={20} /> }
    ] : []),
    ...(user.role === "ADMIN" || hasPermission(user, "estadisticas", "Ver Estadisticas") ? [
      { name: "Estadísticas", path: "/dashboard/statistics", icon: <Icons.Stats size={20} /> }
    ] : []),
    ...(activeClinic?.controlHorarioActivo ? [
      { name: "Control Horario", path: "/dashboard/control-horario", icon: <Icons.CalendarClock size={20} /> }
    ] : []),
    ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración") || hasPermission(user, "configuracion", "Editar su propio horario") ? [
      { name: "Configuración", path: "/dashboard/settings", icon: <Icons.Settings size={20} /> }
    ] : []),
  ];

  return (
    <aside ref={sidebarRef} className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""} glass`}>
      {/* Brand Header */}
      <div className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>LS</div>
          {!sidebarCollapsed && <span className={styles.logoText}>LLUMSYNC</span>}
        </div>
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          className={styles.toggleBtn}
          title={sidebarCollapsed ? "Desplegar menú" : "Colapsar menú"}
        >
          <Icons.Menu size={18} />
        </button>
      </div>

      {/* Clinic Selector */}
      <div className={styles.clinicSelectorArea}>
        {sidebarCollapsed ? (
          <div 
            className={styles.clinicIndicator} 
            title={activeClinic?.name || "Seleccionar Clínica"}
            onClick={() => setSidebarCollapsed(false)}
          >
            <Icons.MapPin size={16} />
          </div>
        ) : (
          <div className={styles.clinicDropdownContainer} ref={clinicsDropdownRef}>
            <button 
              className={styles.clinicSelectBtn}
              onClick={() => setShowClinicsDropdown(!showClinicsDropdown)}
            >
              <Icons.MapPin size={16} className={styles.pinIcon} />
              <div className={styles.clinicInfo}>
                <span className={styles.clinicLabel}>Sede Activa</span>
                <span className={styles.clinicName}>{activeClinic?.name || "Cargando..."}</span>
              </div>
              <Icons.ChevronDown size={14} className={styles.chevronIcon} />
            </button>

            {showClinicsDropdown && user.clinics && (
              <div className={`${styles.dropdownMenu} glass`}>
                <div className={styles.dropdownHeader}>Cambiar de clínica</div>
                {user.clinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    className={`${styles.dropdownItem} ${activeClinic?.id === clinic.id ? styles.activeItem : ""}`}
                    onClick={() => {
                      setActiveClinic(clinic);
                      setShowClinicsDropdown(false);
                      // Force reload page to refresh contextual queries
                      router.refresh();
                    }}
                  >
                    <span className={styles.dropdownClinicName}>{clinic.name}</span>
                    <span className={styles.dropdownClinicAddress}>{clinic.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <LinkComponent
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              title={sidebarCollapsed ? item.name : undefined}
              onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  window.location.href = item.path;
                }
              }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && <span className={styles.navName}>{item.name}</span>}
              {isActive && !sidebarCollapsed && <div className={styles.activeIndicator} />}
            </LinkComponent>
          );
        })}
      </nav>

      {/* User Area */}
      <div className={styles.userFooter}>
        <div className={styles.userInfoArea}>
          <div className={styles.avatar}>
            {user.name.charAt(0)}
          </div>
          {!sidebarCollapsed && (
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>
                {user.role === "ADMIN" ? "Administrador" : user.role === "DOCTOR" ? "Fisioterapeuta" : "Personal"}
              </span>
            </div>
          )}
        </div>
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme} 
          className={styles.themeToggleBtn}
          title={theme === "light" ? "Activar modo noche" : "Activar modo claro"}
        >
          {theme === "light" ? <Icons.Moon size={18} /> : <Icons.Sun size={18} />}
          {!sidebarCollapsed && <span>{theme === "light" ? "Modo Noche" : "Modo Claro"}</span>}
        </button>

        <button 
          onClick={logout} 
          className={styles.logoutBtn} 
          title="Cerrar sesión"
        >
          <Icons.LogOut size={18} />
          {!sidebarCollapsed && <span>Salir</span>}
        </button>
      </div>
    </aside>
  );
}
