"use client";

import React, { useState, useRef, useEffect } from "react";
import LinkComponent from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "./Icons";
import styles from "./Sidebar.module.css";
import { hasPermission } from "@/lib/permissions";
import { translate } from "@/lib/translations";

interface ConfigSubGroup {
  groupTitle?: string;
  items: {
    id: string;
    name: string;
    path: string;
    icon?: React.ReactNode;
  }[];
}

interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  configSubGroups?: ConfigSubGroup[];
}

export default function Sidebar() {
  const {
    user,
    activeClinic,
    setActiveClinic,
    sidebarCollapsed,
    setSidebarCollapsed,
    logout,
    theme,
    toggleTheme,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    language,
  } = useApp();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showClinicsDropdown, setShowClinicsDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  // Top Header quick action popovers & search states
  const [showQuickSearchModal, setShowQuickSearchModal] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [showQuickAddPopover, setShowQuickAddPopover] = useState(false);

  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<{
    clients: any[];
    appointments: any[];
    services: any[];
  }>({ clients: [], appointments: [], services: [] });
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(3);

  const clinicsDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const headerActionsRef = useRef<HTMLDivElement>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  // Fetch header notification logs
  const fetchHeaderNotifications = async () => {
    if (!activeClinic?.id) return;
    try {
      const res = await fetch(`/api/notifications/logs?clinicId=${activeClinic.id}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setNotificationsList(data.slice(0, 8));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowQuickSearchModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowQuickSearchModal(false);
        setShowNotificationsPopover(false);
        setShowQuickAddPopover(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Perform global search
  useEffect(() => {
    if (!globalSearchQuery.trim() || !activeClinic?.id) {
      setGlobalSearchResults({ clients: [], appointments: [], services: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingGlobal(true);
      try {
        const [cRes, sRes] = await Promise.all([
          fetch(`/api/clients?clinicId=${activeClinic.id}&search=${encodeURIComponent(globalSearchQuery)}`),
          fetch(`/api/services?clinicId=${activeClinic.id}`),
        ]);
        const clients = cRes.ok ? await cRes.json() : [];
        const servicesAll = sRes.ok ? await sRes.json() : [];
        const matchedServices = Array.isArray(servicesAll)
          ? servicesAll.filter((s: any) => s.name?.toLowerCase().includes(globalSearchQuery.toLowerCase()))
          : [];

        setGlobalSearchResults({
          clients: Array.isArray(clients) ? clients.slice(0, 5) : [],
          appointments: [],
          services: matchedServices.slice(0, 5),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingGlobal(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [globalSearchQuery, activeClinic]);

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
  }, [pathname, searchParams, setMobileSidebarOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clinicsDropdownRef.current && !clinicsDropdownRef.current.contains(e.target as Node)) {
        setShowClinicsDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (headerActionsRef.current && !headerActionsRef.current.contains(e.target as Node)) {
        setShowNotificationsPopover(false);
        setShowQuickAddPopover(false);
      }
      // Collapse sidebar on click outside when expanded on desktop
      if (
        !sidebarCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setSidebarCollapsed(true);
      }
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

  const cName = activeClinic?.name || "";
  const hasAccountingAccess =
    user.role === "ADMIN" ||
    hasPermission(user, "contabilidad", "Artículos - Todo") ||
    hasPermission(user, "contabilidad", "Artículos - Solo artículos relacionados") ||
    hasPermission(user, "contabilidad", "Facturas - Todo") ||
    hasPermission(user, "contabilidad", "Facturas - " + cName) ||
    hasPermission(user, "contabilidad", "Pagos") ||
    hasPermission(user, "contabilidad", "Resumen") ||
    hasPermission(user, "contabilidad", "Ingresos y Gastos") ||
    hasPermission(user, "contabilidad", "Solo cobrar");

  const hasContactsAccess = user.role === "ADMIN" || hasPermission(user, "clientes", "Ver clientes");
  const hasStatsAccess = user.role === "ADMIN" || hasPermission(user, "estadisticas", "Ver Estadisticas");
  const hasSettingsAccess =
    user.role === "ADMIN" ||
    hasPermission(user, "configuracion", "Ver configuración") ||
    hasPermission(user, "configuracion", "Editar su propio horario");

  // Config sub-groups matching Image 2
  const configSubGroups: ConfigSubGroup[] = [
    {
      groupTitle: "MI CONSULTA",
      items: [
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración")
          ? [{ id: "cfg-clinic", name: "Información general", path: "/dashboard/settings?tab=clinic", icon: <Icons.Info size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Configurar servicios")
          ? [{ id: "cfg-services", name: "Servicios Clínicos", path: "/dashboard/settings?tab=services", icon: <Icons.CalendarClock size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Configurar notificaciones")
          ? [{ id: "cfg-notifications", name: "Notificaciones", path: "/dashboard/settings?tab=notifications", icon: <Icons.Bell size={14} /> }]
          : []),
      ],
    },
    {
      groupTitle: "PERSONAL Y GESTIÓN",
      items: [
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración") || hasPermission(user, "configuracion", "Editar su propio horario")
          ? [{ id: "cfg-users", name: "Usuarios y Horarios", path: "/dashboard/settings?tab=users", icon: <Icons.Users size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "contabilidad", "Resumen")
          ? [{ id: "cfg-liquidaciones", name: "Liquidaciones y Comisiones", path: "/dashboard/settings?tab=liquidaciones", icon: <Icons.DollarCircle size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Configurar servicios")
          ? [{ id: "cfg-bonos", name: "Bonos", path: "/dashboard/settings?tab=bonos", icon: <Icons.Award size={14} /> }]
          : []),
      ],
    },
    {
      groupTitle: "FACTURACIÓN",
      items: [
        ...(user.role === "ADMIN" || hasPermission(user, "contabilidad", "Facturas - Todo")
          ? [{ id: "cfg-fiscal", name: "Datos Fiscales", path: "/dashboard/settings?tab=datosFiscales", icon: <Icons.FileText size={14} /> }]
          : []),
      ],
    },
    {
      groupTitle: "CONFIGURACIÓN CLÍNICA",
      items: [
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración")
          ? [{ id: "cfg-formularios", name: "Formularios Personalizados", path: "/dashboard/settings?tab=formularios", icon: <Icons.FileText size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración")
          ? [{ id: "cfg-documents", name: "Plantillas Documentos", path: "/dashboard/settings?tab=documents", icon: <Icons.FileText size={14} /> }]
          : []),
      ],
    },
    {
      groupTitle: "HERRAMIENTAS Y SISTEMA",
      items: [
        ...(hasAccountingAccess
          ? [{ id: "cfg-inventario", name: "Almacén e Inventario", path: "/dashboard/almacen", icon: <Icons.Package size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "configuracion", "Ver configuración")
          ? [{ id: "cfg-sync", name: "Sincronizar Google", path: "/dashboard/settings?tab=sync", icon: <Icons.Sync size={14} /> }]
          : []),
        ...(user.role === "ADMIN" || hasPermission(user, "clientes", "Ver clientes")
          ? [{ id: "cfg-import", name: "Importar Contactos", path: "/dashboard/settings?tab=import", icon: <Icons.Download size={14} /> }]
          : []),
        ...(user.role === "ADMIN"
          ? [{ id: "cfg-papelera", name: "Papelera", path: "/dashboard/settings?tab=papelera", icon: <Icons.Trash size={14} /> }]
          : []),
      ],
    },
  ].filter((group) => group.items.length > 0);

  // Main menu items (Direct links, ONLY Configuración has configSubGroups)
  const menuItems: MenuItem[] = [
    {
      id: "agenda",
      name: translate("agenda", language),
      path: "/dashboard/agenda",
      icon: <Icons.Calendar size={18} />,
    },
    ...(hasContactsAccess
      ? [
          {
            id: "contacts",
            name: translate("contacts", language),
            path: "/dashboard/contacts",
            icon: <Icons.Users size={18} />,
          },
        ]
      : []),
    ...(hasAccountingAccess
      ? [
          {
            id: "cashRegister",
            name: "Caja y Arqueo",
            path: "/dashboard/cash-register",
            icon: <Icons.DollarCircle size={18} />,
          },
          {
            id: "sales",
            name: translate("sales", language),
            path: "/dashboard/sales",
            icon: <Icons.Sales size={18} />,
          },
          {
            id: "almacen",
            name: translate("warehouseInventory", language),
            path: "/dashboard/almacen",
            icon: <Icons.Package size={18} />,
          },
          {
            id: "clubSocios",
            name: "Club de Socios",
            path: "/dashboard/club-socios",
            icon: <Icons.CreditCard size={18} />,
          },
        ]
      : []),
    ...(hasStatsAccess
      ? [
          {
            id: "stats",
            name: translate("stats", language),
            path: "/dashboard/statistics",
            icon: <Icons.Stats size={18} />,
          },
        ]
      : []),
    ...(activeClinic?.controlHorarioActivo
      ? [
          {
            id: "clockControl",
            name: translate("clockControl", language),
            path: "/dashboard/control-horario",
            icon: <Icons.CalendarClock size={18} />,
          },
        ]
      : []),
    ...(hasSettingsAccess
      ? [
          {
            id: "settings",
            name: translate("settings", language),
            path: "/dashboard/settings",
            icon: <Icons.Settings size={18} />,
            configSubGroups,
          },
        ]
      : []),
  ];

  // Helper to check if a config subitem is active
  const isSubItemActive = (subPath: string) => {
    const currentTab = searchParams?.get("tab") || "";
    if (subPath.includes("?tab=")) {
      const targetTab = subPath.split("?tab=")[1];
      if (pathname === "/dashboard/settings") {
        if (targetTab === "clinic") {
          return !currentTab || currentTab === "clinic";
        }
        return currentTab === targetTab;
      }
      return false;
    }
    const currentQuery = searchParams?.toString() ? `?${searchParams.toString()}` : "";
    return (pathname + currentQuery) === subPath || pathname === subPath;
  };

  // Auto-expand Configuración if on settings page
  useEffect(() => {
    if (pathname === "/dashboard/settings") {
      setConfigExpanded(true);
    }
  }, [pathname, searchParams]);

  const userInitials = user.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "GV";

  return (
    <>
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className={styles.mobileOverlay}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""} ${
          mobileSidebarOpen ? styles.mobileOpen : ""
        }`}
      >
        {/* Top Header: Holded Logo + Quick Actions (Search, Bell, Plus) */}
        <div className={styles.topHeader}>
          <div className={styles.brandRow}>
            <div className={styles.holdedBrand}>
              <div className={styles.logoBadge}>LS</div>
              {!isCollapsed && <span className={styles.holdedLogoText}>LLUMSYNC</span>}
            </div>
            {!isCollapsed && (
              <div className={styles.headerActions} ref={headerActionsRef} style={{ position: "relative" }}>
                {/* 1. SEARCH BUTTON */}
                <button
                  type="button"
                  className={styles.headerIconBtn}
                  title="Buscar paciente, servicio o cita (Ctrl+K)"
                  onClick={() => {
                    setShowQuickSearchModal(true);
                    setShowNotificationsPopover(false);
                    setShowQuickAddPopover(false);
                    setTimeout(() => globalSearchInputRef.current?.focus(), 100);
                  }}
                >
                  <Icons.Search size={16} />
                </button>

                {/* 2. NOTIFICATIONS BUTTON */}
                <button
                  type="button"
                  className={styles.headerIconBtn}
                  title="Notificaciones"
                  onClick={() => {
                    const nextState = !showNotificationsPopover;
                    setShowNotificationsPopover(nextState);
                    setShowQuickAddPopover(false);
                    if (nextState) {
                      setUnreadCount(0);
                      fetchHeaderNotifications();
                    }
                  }}
                >
                  {unreadCount > 0 && <div className={styles.notificationDot} />}
                  <Icons.Bell size={16} />
                </button>

                {/* 3. QUICK ADD (+) BUTTON */}
                <button
                  type="button"
                  className={styles.headerIconBtn}
                  title="Crear Nuevo..."
                  onClick={() => {
                    setShowQuickAddPopover(!showQuickAddPopover);
                    setShowNotificationsPopover(false);
                  }}
                >
                  <Icons.Plus size={16} />
                </button>

                {/* POP OVER: NOTIFICACIONES */}
                {showNotificationsPopover && (
                  <div className={`${styles.headerPopover} ${styles.notificationsPopover}`}>
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>🔔 Notificaciones del Sistema</span>
                      <button
                        type="button"
                        onClick={() => setNotificationsList([])}
                        style={{ border: "none", background: "transparent", fontSize: "11px", color: "var(--primary)", cursor: "pointer" }}
                      >
                        Limpiar
                      </button>
                    </div>

                    <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {notificationsList.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
                          No hay notificaciones recientes.
                        </div>
                      ) : (
                        notificationsList.map((n: any) => (
                          <div key={n.id} style={{ padding: "8px 10px", borderRadius: "8px", background: "var(--bg-card)", border: "1px solid var(--border-color)", fontSize: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                              <span>{n.channel === "WHATSAPP" ? "📱 WhatsApp" : "📧 Email"}</span>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                {new Date(n.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {n.clientName}: {n.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* POP OVER: CREAR NUEVO (+) */}
                {showQuickAddPopover && (
                  <div className={`${styles.headerPopover} ${styles.quickAddPopover}`}>
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>⚡ Acciones Rápidas</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <button
                        type="button"
                        className={styles.quickAddOption}
                        onClick={() => {
                          setShowQuickAddPopover(false);
                          router.push("/dashboard/agenda");
                        }}
                      >
                        <Icons.Calendar size={16} />
                        <span>Nueva Cita en Agenda</span>
                      </button>

                      <button
                        type="button"
                        className={styles.quickAddOption}
                        onClick={() => {
                          setShowQuickAddPopover(false);
                          router.push("/dashboard/contacts");
                        }}
                      >
                        <Icons.Users size={16} />
                        <span>Nuevo Paciente / Cliente</span>
                      </button>

                      <button
                        type="button"
                        className={styles.quickAddOption}
                        onClick={() => {
                          setShowQuickAddPopover(false);
                          router.push("/dashboard/sales");
                        }}
                      >
                        <Icons.Sales size={16} />
                        <span>Nueva Venta / Cobro</span>
                      </button>

                      <button
                        type="button"
                        className={styles.quickAddOption}
                        onClick={() => {
                          setShowQuickAddPopover(false);
                          router.push("/dashboard/settings?tab=inventario");
                        }}
                      >
                        <Icons.Folder size={16} />
                        <span>Nuevo Producto / Insumo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={styles.collapseToggleBtn}
              title={isCollapsed ? "Expandir menú" : "Plegar menú"}
            >
              <Icons.ChevronLeft size={16} className={isCollapsed ? styles.rotated : ""} />
            </button>
          </div>
        </div>

        {/* Company/Clinic Card Selector (Holded style) */}
        <div className={styles.clinicSelectorArea} ref={clinicsDropdownRef}>
          {isCollapsed ? (
            <div
              className={styles.clinicIndicatorCollapsed}
              title={activeClinic?.name || "Seleccionar Clínica"}
              onClick={() => setSidebarCollapsed(false)}
            >
              <div className={styles.clinicEmblem}>
                <Icons.MapPin size={16} />
              </div>
            </div>
          ) : (
            <div className={styles.clinicCardContainer}>
              <button
                className={styles.clinicCardBtn}
                onClick={() => setShowClinicsDropdown(!showClinicsDropdown)}
              >
                <div className={styles.clinicEmblem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className={styles.clinicCardName}>
                  {activeClinic?.name || "Cargando..."}
                </span>
                <Icons.ChevronDown size={14} className={styles.clinicChevron} />
              </button>

              {showClinicsDropdown && user.clinics && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>Cambiar Clínica</div>
                  {user.clinics.map((clinic) => (
                    <button
                      key={clinic.id}
                      className={`${styles.dropdownItem} ${
                        activeClinic?.id === clinic.id ? styles.activeDropdownItem : ""
                      }`}
                      onClick={() => {
                        setActiveClinic(clinic);
                        setShowClinicsDropdown(false);
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

        {/* Nav List */}
        <nav className={styles.navScrollArea}>
          <div className={styles.navList}>
            {menuItems.map((item) => {
              const isSettings = item.id === "settings";
              const isDirectActive = !isSettings && pathname.startsWith(item.path);

              if (isSettings && item.configSubGroups) {
                const isSettingsPageActive = pathname === "/dashboard/settings";
                return (
                  <div key={item.id} className={styles.navGroup}>
                    {/* Configuración Main Button (Unfolds config sub-groups) */}
                    <div
                      className={`${styles.navItem} ${isSettingsPageActive ? styles.navItemActive : ""} ${
                        configExpanded ? styles.navItemExpanded : ""
                      }`}
                      onClick={() => {
                        if (isCollapsed) setSidebarCollapsed(false);
                        setConfigExpanded(!configExpanded);
                      }}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      {!isCollapsed && <span className={styles.navText}>{item.name}</span>}
                      {!isCollapsed && (
                        <span className={styles.subChevron}>
                          {configExpanded ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
                        </span>
                      )}
                    </div>

                    {/* Configuración Submenu (Grouped by Category as in Image 2) */}
                    {!isCollapsed && configExpanded && (
                      <div className={styles.subMenuContainer}>
                        {item.configSubGroups.map((group, gIdx) => (
                          <div key={gIdx} className={styles.configSubGroupBlock}>
                            {group.groupTitle && (
                              <div className={styles.configGroupHeaderTitle}>
                                {group.groupTitle}
                              </div>
                            )}
                            {group.items.map((sub) => {
                              const active = isSubItemActive(sub.path);
                              return (
                                <LinkComponent
                                  key={sub.id}
                                  href={sub.path}
                                  className={`${styles.subMenuItem} ${
                                    active ? styles.subMenuItemActive : ""
                                  }`}
                                >
                                  {sub.icon && <span className={styles.subItemIcon}>{sub.icon}</span>}
                                  <span className={styles.subMenuText}>{sub.name}</span>
                                </LinkComponent>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              {/* Normal Main Navigation Item (Direct Link) */}
              return (
                <LinkComponent
                  key={item.id}
                  href={item.path}
                  className={`${styles.navItem} ${isDirectActive ? styles.navItemActive : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!isCollapsed && <span className={styles.navText}>{item.name}</span>}
                </LinkComponent>
              );
            })}
          </div>
        </nav>

        {/* Bottom Footer Area (Holded Style) */}
        <div className={styles.bottomFooter}>
          {/* Ayuda y Soporte */}
          <div
            className={styles.footerRowItem}
            onClick={() => router.push("/dashboard/settings")}
            title="Ayuda y soporte"
          >
            <span className={styles.footerIcon}>
              <Icons.HelpCircle size={18} />
            </span>
            {!isCollapsed && <span className={styles.footerText}>Ayuda y soporte</span>}
            {!isCollapsed && <Icons.ChevronRight size={14} className={styles.footerChevron} />}
          </div>

          {/* User Profile Row */}
          <div className={styles.userProfileContainer} ref={userMenuRef}>
            <div
              className={styles.userProfileRow}
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={user.name}
            >
              <div className={styles.userAvatarBubble}>{userInitials}</div>
              {!isCollapsed && (
                <div className={styles.userInfoCol}>
                  <span className={styles.userNameText}>{user.name}</span>
                </div>
              )}
              {!isCollapsed && <Icons.ChevronRight size={14} className={styles.footerChevron} />}
            </div>

            {/* User Menu Popover */}
            {showUserMenu && !isCollapsed && (
              <div className={styles.userMenuPopover}>
                <div className={styles.popoverHeader}>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <div className={styles.popoverDivider} />
                <button
                  className={styles.popoverItem}
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push("/dashboard/account");
                  }}
                >
                  <Icons.User size={16} />
                  <span>Mi cuenta</span>
                </button>
                <button
                  className={styles.popoverItem}
                  onClick={() => {
                    toggleTheme();
                    setShowUserMenu(false);
                  }}
                >
                  {theme === "light" ? <Icons.Moon size={16} /> : <Icons.Sun size={16} />}
                  <span>{theme === "light" ? "Modo Noche" : "Modo Claro"}</span>
                </button>
                <div className={styles.popoverDivider} />
                <button
                  className={`${styles.popoverItem} ${styles.popoverLogout}`}
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                >
                  <Icons.LogOut size={16} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* GLOBAL SEARCH MODAL (CMD+K / CTRL+K) */}
      {showQuickSearchModal && (
        <div className={styles.searchModalOverlay} onClick={() => setShowQuickSearchModal(false)}>
          <div className={styles.searchModalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border-color)", gap: "12px" }}>
              <Icons.Search size={20} style={{ color: "var(--text-muted)" }} />
              <input
                ref={globalSearchInputRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Buscar paciente, servicio, cita... (Escribe para buscar)"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: "var(--text-primary)", fontWeight: 500 }}
              />
              <span style={{ fontSize: "11px", background: "var(--bg-card)", padding: "3px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                ESC para cerrar
              </span>
            </div>

            <div style={{ maxHeight: "380px", overflowY: "auto", padding: "12px" }}>
              {searchingGlobal ? (
                <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Buscando...
                </div>
              ) : !globalSearchQuery.trim() ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  💡 Consejo: Escribe el nombre o teléfono de un paciente para acceder directamente.
                </div>
              ) : globalSearchResults.clients.length === 0 && globalSearchResults.services.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  Sin resultados para "{globalSearchQuery}".
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {globalSearchResults.clients.length > 0 && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                        👥 Pacientes ({globalSearchResults.clients.length})
                      </div>
                      {globalSearchResults.clients.map((c: any) => (
                        <div
                          key={c.id}
                          className={styles.quickAddOption}
                          onClick={() => {
                            setShowQuickSearchModal(false);
                            router.push(`/dashboard/contacts?id=${c.id}`);
                          }}
                        >
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px" }}>
                            {c.firstName?.[0]?.toUpperCase() || "P"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {c.firstName} {c.lastName}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {c.phone || c.email || "Sin datos de contacto"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {globalSearchResults.services.length > 0 && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                        ⚙️ Servicios Tratamiento ({globalSearchResults.services.length})
                      </div>
                      {globalSearchResults.services.map((s: any) => (
                        <div
                          key={s.id}
                          className={styles.quickAddOption}
                          onClick={() => {
                            setShowQuickSearchModal(false);
                            router.push(`/dashboard/settings?tab=services`);
                          }}
                        >
                          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: s.color || "var(--primary)" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {s.price} € • {s.duration} min
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
