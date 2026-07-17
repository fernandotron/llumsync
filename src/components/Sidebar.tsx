"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/navigation"; // Wait! In next.js 15+ we import Link from "next/link"
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "./Icons";
import styles from "./Sidebar.module.css";
import LinkComponent from "next/link"; // importing Link directly as next/link is safer
import { hasPermission } from "@/lib/permissions";
import { translate } from "@/lib/translations";

export default function Sidebar() {
  const { user, activeClinic, setActiveClinic, sidebarCollapsed, setSidebarCollapsed, logout, theme, toggleTheme, mobileSidebarOpen, setMobileSidebarOpen, language } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [showClinicsDropdown, setShowClinicsDropdown] = useState(false);
  const clinicsDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isCollapsed = sidebarCollapsed && !isMobile;

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

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
      // Also close mobile sidebar if clicking outside
      if (
        mobileSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setMobileSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen]);

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
    { name: translate("agenda", language), path: "/dashboard/agenda", icon: <Icons.Calendar size={20} /> },
    ...(user.role === "ADMIN" || hasPermission(user, "clientes", "Ver clientes") ? [
      { name: translate("contacts", language), path: "/dashboard/contacts", icon: <Icons.Users size={20} /> }
    ] : []),
    ...(hasAccountingAccess ? [
      { name: translate("sales", language), path: "/dashboard/sales", icon: <Icons.Sales size={20} /> }
    ] : []),
    ...(user.role === "ADMIN" || hasPermission(user, "estadisticas", "Ver Estadisticas") ? [
      { name: translate("stats", language), path: "/dashboard/statistics", icon: <Icons.Stats size={20} /> }
    ] : []),
    ...(activeClinic?.controlHorarioActivo ? [
      { name: translate("clockControl", language), path: "/dashboard/control-horario", icon: <Icons.CalendarClock size={20} /> }
    ] : []),
    ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración") || hasPermission(user, "configuracion", "Editar su propio horario") ? [
      { name: translate("settings", language), path: "/dashboard/settings", icon: <Icons.Settings size={20} /> }
    ] : []),
  ];

  return (
    <>
      {/* Mobile background overlay */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
        />
      )}
      <aside 
        ref={sidebarRef} 
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""} ${mobileSidebarOpen ? styles.mobileOpen : ""} glass`}
        style={{
          zIndex: mobileSidebarOpen ? 1000 : undefined
        }}
      >
        {/* Brand Header */}
        <div className={styles.header}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>LS</div>
            {!isCollapsed && <span className={styles.logoText}>LLUMSYNC</span>}
          </div>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className={styles.toggleBtn}
            title={isCollapsed ? translate("expandMenu", language) : translate("collapseMenu", language)}
          >
            <Icons.Menu size={18} />
          </button>
        </div>

      {/* Clinic Selector */}
      <div className={styles.clinicSelectorArea}>
        {isCollapsed ? (
          <div 
            className={styles.clinicIndicator} 
            title={activeClinic?.name || translate("selectClinic", language)}
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
                <span className={styles.clinicLabel}>{translate("activeSite", language)}</span>
                <span className={styles.clinicName}>{activeClinic?.name || translate("loading", language)}</span>
              </div>
              <Icons.ChevronDown size={14} className={styles.chevronIcon} />
            </button>

            {showClinicsDropdown && user.clinics && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>{translate("changeClinic", language)}</div>
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
              title={isCollapsed ? item.name : undefined}
              onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  window.location.href = item.path;
                }
              }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!isCollapsed && <span className={styles.navName}>{item.name}</span>}
              {isActive && !isCollapsed && <div className={styles.activeIndicator} />}
            </LinkComponent>
          );
        })}
      </nav>

      {/* User Area */}
      <div className={styles.userFooter}>
        {isCollapsed ? (
          <div className={styles.footerControlsStack}>
            {/* 1. Gradient Avatar */}
            <div 
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "14px", cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,143,163,0.3)", flexShrink: 0,
              }}
              onClick={() => router.push("/dashboard/account")}
              title={translate("myAccount", language)}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            {/* 2. Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className={styles.footerIconBtn}
              title={theme === "light" ? translate("activateNightMode", language) : translate("activateLightMode", language)}
            >
              {theme === "light" ? <Icons.Moon size={18} /> : <Icons.Sun size={18} />}
            </button>
            
            {/* 3. Logout */}
            <button 
              onClick={logout} 
              className={styles.logoutIconBtn} 
              title={translate("closeSession", language)}
            >
              <Icons.LogOut size={18} />
            </button>
          </div>
        ) : (
          /* Expanded: Show user name + role + controls */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* User info row */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "12px",
                background: "rgba(0,143,163,0.06)", border: "1px solid rgba(0,143,163,0.12)",
                cursor: "pointer", transition: "background 0.2s"
              }}
              onClick={() => router.push("/dashboard/account")}
              title={translate("myAccount", language)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,143,163,0.12)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,143,163,0.06)"}
            >
              {/* Gradient avatar */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "14px", flexShrink: 0,
                boxShadow: "0 4px 12px rgba(0,143,163,0.25)"
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "13px", fontWeight: 700, color: "var(--text-primary)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {user.name}
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center",
                  fontSize: "10px", fontWeight: 700,
                  color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px"
                }}>
                  {user.role === "ADMIN" ? "Admin" : user.role === "DOCTOR" ? "Doctor" : user.role === "THERAPIST" ? "Terapeuta" : user.role === "RECEPTIONIST" ? "Recepción" : user.role}
                </div>
              </div>
            </div>

            {/* Action buttons row */}
            <div className={styles.footerControlsRow}>
              <button 
                onClick={toggleTheme} 
                className={styles.footerIconBtn}
                title={theme === "light" ? translate("activateNightMode", language) : translate("activateLightMode", language)}
              >
                {theme === "light" ? <Icons.Moon size={18} /> : <Icons.Sun size={18} />}
              </button>
              
              <button 
                onClick={logout} 
                className={styles.logoutIconBtn} 
                title={translate("closeSession", language)}
              >
                <Icons.LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>

    </>
  );
}
