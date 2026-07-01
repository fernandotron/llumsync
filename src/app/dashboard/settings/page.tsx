"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Settings.module.css";

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  controlHorarioActivo?: boolean;
  notifyAssignedUser?: boolean;
  adminNotificationUserIds?: string;
  senderEmail?: string;
  defaultWhatsappMode?: string;
  whatsappApiUrl?: string;
  whatsappInstanceName?: string;
  whatsappApiToken?: string;
  whatsappConnected?: boolean;
}


interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  color: string;
  category?: string;
  type?: string;
  tax?: number;
  total?: number;
  allowedUserIds?: string;
}

interface Shift {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
}

interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  phone?: string;
  dniNif?: string;
  address?: string;
  municipality?: string;
  postalCode?: string;
  additionalData?: string;
  color?: string;
  showInAgenda?: boolean;
  shifts?: Shift[];
  permissionsJson?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

function SettingsTabNavigator({ setActiveTab }: { setActiveTab: (tab: any) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams, setActiveTab]);
  return null;
}

export default function SettingsPage() {
  const { activeClinic, user: currentUser, setActiveClinic } = useApp();
  const showGanancias = currentUser?.role === "ADMIN" || hasPermission(currentUser, "contabilidad", "Artículos - Ver Ganancias");
  const [activeTab, setActiveTab] = useState<"clinic" | "services" | "users" | "sync" | "documents" | "import" | "bonos" | "formularios" | "papelera" | "notifications" | "inventario" | "liquidaciones" | "datosFiscales">("clinic");

  // Datos Fiscales states
  const [fiscalProfiles, setFiscalProfiles] = useState<any[]>([]);
  const [selectedFiscalProfile, setSelectedFiscalProfile] = useState<any | null>(null);
  const [fiscalFormOpen, setFiscalFormOpen] = useState(false);
  const [editingFiscalProfile, setEditingFiscalProfile] = useState<any | null>(null);
  // Fiscal form state
  const [fpEntityType, setFpEntityType] = useState("Empresa");
  const [fpComercialName, setFpComercialName] = useState("");
  const [fpNif, setFpNif] = useState("");
  const [fpAddress, setFpAddress] = useState("");
  const [fpMunicipality, setFpMunicipality] = useState("");
  const [fpPostalCode, setFpPostalCode] = useState("");
  const [fpLogo, setFpLogo] = useState("");
  const [fpIrpf, setFpIrpf] = useState("");
  const [fpCreditorSuffix, setFpCreditorSuffix] = useState("0000");
  const [fpIban, setFpIban] = useState("");
  const [fpBicSwift, setFpBicSwift] = useState("");
  const [fpSerieFacturaOrdinaria, setFpSerieFacturaOrdinaria] = useState("");
  const [fpSerieRectificadaOrdinaria, setFpSerieRectificadaOrdinaria] = useState("");
  const [fpSerieFacturaSimplificada, setFpSerieFacturaSimplificada] = useState("");
  const [fpSerieRectificadaSimplificada, setFpSerieRectificadaSimplificada] = useState("");
  const [fpFooterNotes, setFpFooterNotes] = useState("");
  const [fpFooterNotesSimplified, setFpFooterNotesSimplified] = useState("");
  const [fpFirma, setFpFirma] = useState("");
  const [fpSello, setFpSello] = useState("");
  const [fpSaving, setFpSaving] = useState(false);
  const fpLogoInputRef = React.useRef<HTMLInputElement>(null);
  const fpFirmaInputRef = React.useRef<HTMLInputElement>(null);
  const fpSelloInputRef = React.useRef<HTMLInputElement>(null);

  // Liquidations & Commissions module states
  const [activeLiquidationsSubTab, setActiveLiquidationsSubTab] = useState<"config" | "calculo">("calculo");
  const [liquidations, setLiquidations] = useState<any[]>([]);
  const [loadingLiquidations, setLoadingLiquidations] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState("");
  const [therapistCommissionType, setTherapistCommissionType] = useState<"PERCENTAGE" | "FIXED" | "DAILY_FIXED">("PERCENTAGE");
  const [therapistCommissionValue, setTherapistCommissionValue] = useState("0");
  const [therapistOverrides, setTherapistOverrides] = useState<Record<string, { type: "PERCENTAGE" | "FIXED" | "DAILY_FIXED"; value: number }>>({});
  const [savingCommissionConfig, setSavingCommissionConfig] = useState(false);
  
  const [selectedCalculateTherapistId, setSelectedCalculateTherapistId] = useState("");
  const [calculateMonth, setCalculateMonth] = useState(""); // e.g. "2026-06"
  const [calculatedDraft, setCalculatedDraft] = useState<any | null>(null);
  const [calculatingDraft, setCalculatingDraft] = useState(false);
  const [savingLiquidation, setSavingLiquidation] = useState(false);
  const [selectedLiquidationForDetails, setSelectedLiquidationForDetails] = useState<any | null>(null);

  // Inventory module states
  const [activeInventorySubTab, setActiveInventorySubTab] = useState<"productos" | "transacciones">("productos");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [productTransactions, setProductTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Product Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productFormName, setProductFormName] = useState("");
  const [productFormSku, setProductFormSku] = useState("");
  const [productFormStock, setProductFormStock] = useState("");
  const [productFormMinStock, setProductFormMinStock] = useState("");
  const [productFormCostPrice, setProductFormCostPrice] = useState("");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  // Stock Adjustment Manual State
  const [showStockAdjustModal, setShowStockAdjustModal] = useState<any | null>(null);
  const [stockAdjustmentVal, setStockAdjustmentVal] = useState("");
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState("");

  // Service Consumibles State
  const [serviceConsumibles, setServiceConsumibles] = useState<any[]>([]);
  const [showAddConsumibleToService, setShowAddConsumibleToService] = useState(false);
  const [selectedConsumibleId, setSelectedConsumibleId] = useState("");
  const [selectedConsumibleQty, setSelectedConsumibleQty] = useState("1");


  // Notifications module states
  const [notificationsSubTab, setNotificationsSubTab] = useState<"recordatorios" | "notificaciones" | "logs" | "config" | "whatsapp">("recordatorios");
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [searchReminderQuery, setSearchReminderQuery] = useState("");
  const [reminderLogs, setReminderLogs] = useState<any[]>([]);
  const [loadingReminderLogs, setLoadingReminderLogs] = useState(false);

  // Form states for creating/editing reminders
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [reminderFormName, setReminderFormName] = useState("");
  const [reminderFormChannel, setReminderFormChannel] = useState("WHATSAPP_MANUAL");
  const [reminderFormCondition, setReminderFormCondition] = useState("PENDING");
  const [reminderFormHours, setReminderFormHours] = useState("24");
  const [reminderFormMinutes, setReminderFormMinutes] = useState("0");
  const [reminderFormMessage, setReminderFormMessage] = useState("");
  const [reminderFormAllServices, setReminderFormAllServices] = useState(true);
  const [reminderFormServiceIds, setReminderFormServiceIds] = useState<string[]>([]);
  const [isReminderSystemForm, setIsReminderSystemForm] = useState(false);
  const [reminderFormTriggerWhen, setReminderFormTriggerWhen] = useState("BOTH");
  const [reminderFormTemplateId, setReminderFormTemplateId] = useState("");
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);


  // Clinic configurations states
  const [configSubTab, setConfigSubTab] = useState<"avisos" | "otros">("avisos");
  const [configNotifyAssignedUser, setConfigNotifyAssignedUser] = useState(true);
  const [configAdminNotificationUserIds, setConfigAdminNotificationUserIds] = useState<string[]>([]);
  const [configSenderEmail, setConfigSenderEmail] = useState("");
  const [configDefaultWhatsappMode, setConfigDefaultWhatsappMode] = useState("Web");

  // WhatsApp settings states
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappInstanceName, setWhatsappInstanceName] = useState("");
  const [whatsappApiToken, setWhatsappApiToken] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappQrCode, setWhatsappQrCode] = useState<string | null>(null);
  const [checkingWhatsappStatus, setCheckingWhatsappStatus] = useState(false);
  const [whatsappStatusMessage, setWhatsappStatusMessage] = useState("");


  
  // Vouchers / Bonos states
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any | null>(null);
  const [voucherFormName, setVoucherFormName] = useState("");
  const [voucherFormSessions, setVoucherFormSessions] = useState("");
  const [voucherFormPrice, setVoucherFormPrice] = useState("");
  const [voucherFormTax, setVoucherFormTax] = useState("0");
  const [voucherFormHasExpiration, setVoucherFormHasExpiration] = useState(false);
  const [voucherFormExpirationMonths, setVoucherFormExpirationMonths] = useState("12");
  const [voucherFormServiceIds, setVoucherFormServiceIds] = useState<string[]>([]);
  const [useVoucherAsDefault, setUseVoucherAsDefault] = useState(false);

  // Papelera states
  const [papeleraTab, setPapeleraTab] = useState<"citas" | "clientes" | "presupuestos">("citas");
  const [papeleraCitas, setPapeleraCitas] = useState<any[]>([]);
  const [papeleraClientes, setPapeleraClientes] = useState<any[]>([]);
  const [papeleraPresupuestos, setPapeleraPresupuestos] = useState<any[]>([]);

  const [loadingPapelera, setLoadingPapelera] = useState(false);
  const [papeleraLogsAppId, setPapeleraLogsAppId] = useState<string | null>(null);
  const [papeleraLogs, setPapeleraLogs] = useState<any[]>([]);
  const [loadingPapeleraLogs, setLoadingPapeleraLogs] = useState(false);
  const [showPapeleraLogsModal, setShowPapeleraLogsModal] = useState(false);

  // Excel Import states
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: boolean; createdCount: number; updatedCount: number; message: string } | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Clinic form
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicLogo, setClinicLogo] = useState("");
  const [clinicControlHorarioActivo, setClinicControlHorarioActivo] = useState(false);

  
  // Lists
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Services form
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("45");
  const [newServiceColor, setNewServiceColor] = useState("#3b82f6");
  const [newServiceCategory, setNewServiceCategory] = useState("Fisioterapia");

  // Redesigned services state variables
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Todas las categorías");
  const [formActiveTab, setFormActiveTab] = useState<"general" | "users" | "resources" | "advanced" | "consumibles">("general");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Redesigned form state variables
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormType, setServiceFormType] = useState("Presencial"); // "Presencial", "Videollamada", "A Domicilio"
  const [serviceFormIsGroup, setServiceFormIsGroup] = useState(false);
  const [serviceFormHours, setServiceFormHours] = useState(0);
  const [serviceFormMinutes, setServiceFormMinutes] = useState(45);
  const [serviceFormPrice, setServiceFormPrice] = useState("");
  const [serviceFormTax, setServiceFormTax] = useState("0");
  const [serviceFormTotal, setServiceFormTotal] = useState("0.00");
  const [serviceFormAllowedUserIds, setServiceFormAllowedUserIds] = useState<string[]>([]);
  const [serviceFormColor, setServiceFormColor] = useState("#3b82f6");
  const [serviceFormCategory, setServiceFormCategory] = useState("");

  // New Category popup state
  const [showNewCategoryPopup, setShowNewCategoryPopup] = useState(false);
  const [newCategoryPopupName, setNewCategoryPopupName] = useState("");

  // Memoized categories list derived from services and customCategories
  const categoriesList = useMemo(() => {
    const unique = Array.from(new Set(services.map((s) => s.category).filter(Boolean))) as string[];
    const combined = Array.from(new Set([...unique, ...customCategories]));
    return ["Todas las categorías", "No categorizado", ...combined];
  }, [services, customCategories]);

  // Filtered services based on category selection
  const filteredServices = useMemo(() => {
    if (selectedCategory === "Todas las categorías") return services;
    if (selectedCategory === "No categorizado") return services.filter((s) => !s.category);
    return services.filter((s) => s.category === selectedCategory);
  }, [services, selectedCategory]);

  // Staff form
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffLastName, setNewStaffLastName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("DOCTOR");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffDniNif, setNewStaffDniNif] = useState("");
  const [newStaffAddress, setNewStaffAddress] = useState("");
  const [newStaffMunicipality, setNewStaffMunicipality] = useState("");
  const [newStaffPostalCode, setNewStaffPostalCode] = useState("");
  const [newStaffAdditionalData, setNewStaffAdditionalData] = useState("");
  const [newStaffColor, setNewStaffColor] = useState("#3b82f6");
  const [newStaffPermissions, setNewStaffPermissions] = useState<any>({});
  const [newStaffClinics, setNewStaffClinics] = useState<string[]>([]);
  const [createStaffActiveTab, setCreateStaffActiveTab] = useState<"generales" | "permisos" | "consultas" | null>(null);

  // Shifts & Users sub-tabs and forms
  const [usersSubTab, setUsersSubTab] = useState<"equipo" | "horario">("equipo");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [assignClientsToCreator, setAssignClientsToCreator] = useState(true);
  const [showCreateStaffDrawer, setShowCreateStaffDrawer] = useState(false);
  
  // Edit staff states (Image 1 and 2)
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedEmployeeTab, setSelectedEmployeeTab] = useState<"generales" | "permisos" | "consultas" | "comisiones" | "config" | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffLastName, setEditStaffLastName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffDniNif, setEditStaffDniNif] = useState("");
  const [editStaffPhone, setEditStaffPhone] = useState("");
  const [editStaffAddress, setEditStaffAddress] = useState("");
  const [editStaffMunicipality, setEditStaffMunicipality] = useState("");
  const [editStaffPostalCode, setEditStaffPostalCode] = useState("");
  const [editStaffAdditionalData, setEditStaffAdditionalData] = useState("");
  const [editStaffColor, setEditStaffColor] = useState("#3b82f6");
  const [editStaffShowInAgenda, setEditStaffShowInAgenda] = useState(true);
  const [editStaffSaveStatus, setEditStaffSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editStaffPermissions, setEditStaffPermissions] = useState<any>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Date selector for Horario subtab
  const [scheduleWeekStart, setScheduleWeekStart] = useState<Date>(() => {
    const monday = new Date();
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Shift editing state
  const [activeShiftUser, setActiveShiftUser] = useState<User | null>(null);
  const [activeShiftDay, setActiveShiftDay] = useState<number | null>(null); // 0-6
  const [shiftEditMode, setShiftEditMode] = useState<"single" | "bulk" | null>(null); // "single" or "bulk"
  
  // Single day shift edit form
  const [singleShiftStartDate, setSingleShiftStartDate] = useState("");
  const [singleShiftEndDate, setSingleShiftEndDate] = useState("");
  const [singleShiftStartTime, setSingleShiftStartTime] = useState("08:00");
  const [singleShiftEndTime, setSingleShiftEndTime] = useState("20:00");

  // Bulk shift edit form
  const [bulkShiftsActiveTab, setBulkShiftsActiveTab] = useState<"regular" | "dias_libres">("regular");
  const [bulkShiftStartDate, setBulkShiftStartDate] = useState("");
  const [bulkShiftEndDate, setBulkShiftEndDate] = useState("");
  const [bulkDaysConfig, setBulkDaysConfig] = useState<{ dayOfWeek: number; active: boolean; startTime: string; endTime: string }[]>([
    { dayOfWeek: 1, active: true, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 2, active: true, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 3, active: true, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 4, active: true, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 5, active: true, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 6, active: false, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 0, active: false, startTime: "08:00", endTime: "20:00" },
  ]);

  // Dropdown menu state for cell
  const [activeCellMenu, setActiveCellMenu] = useState<{ userId: string; dayOfWeek: number } | null>(null);
  const [cellMenuPosition, setCellMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Template Form
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [showVariablesDropdown, setShowVariablesDropdown] = useState(false);
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [htmlModalContent, setHtmlModalContent] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync state
  const [gSyncConfigured, setGSyncConfigured] = useState(false);
  const [syncMail, setSyncMail] = useState("");

  // ─── Custom Form Templates state ───────────────────────
  const [formsPanelSub, setFormsPanelSub] = useState<"seguimientos" | "formularios" | "pizarra">("seguimientos");

  // Episode forms (Seguimientos)
  const [episodeForms, setEpisodeForms] = useState<any[]>([]);
  const [selectedEpisodeForm, setSelectedEpisodeForm] = useState<any | null>(null);
  const [episodeFormName, setEpisodeFormName] = useState("");
  const [episodeFormFields, setEpisodeFormFields] = useState<any[]>([]);
  const [episodeFormSaving, setEpisodeFormSaving] = useState(false);
  const [newEpisodeFieldName, setNewEpisodeFieldName] = useState("");

  // Client forms (Formularios)
  const [clientForms, setClientForms] = useState<any[]>([]);
  const [selectedClientForm, setSelectedClientForm] = useState<any | null>(null);
  const [clientFormName, setClientFormName] = useState("");
  const [clientFormFields, setClientFormFields] = useState<any[]>([]);
  const [clientFormSaving, setClientFormSaving] = useState(false);
  const [newClientFieldName, setNewClientFieldName] = useState("");

  // Custom Form Drawers states
  const [showCreateClientFormDrawer, setShowCreateClientFormDrawer] = useState(false);
  const [newClientFormDrawerName, setNewClientFormDrawerName] = useState("");
  const [showAddClientFieldDrawer, setShowAddClientFieldDrawer] = useState(false);
  const [newClientFieldType, setNewClientFieldType] = useState("Texto");
  
  const [showAddEpisodeFieldDrawer, setShowAddEpisodeFieldDrawer] = useState(false);
  const [newEpisodeFieldType, setNewEpisodeFieldType] = useState("Texto");

  const [showEditFieldDrawer, setShowEditFieldDrawer] = useState(false);
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null);
  const [editingFieldName, setEditingFieldName] = useState("");
  const [editingFieldType, setEditingFieldType] = useState("Texto");
  const [editingFieldTarget, setEditingFieldTarget] = useState<"client" | "episode" | null>(null);

  // Drag and drop states
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isDraggingEnabled, setIsDraggingEnabled] = useState(false);

  const fetchEpisodeForms = () => {
    if (!activeClinic) return;
    fetch(`/api/episode-forms?clinicId=${activeClinic.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEpisodeForms(data);
      })
      .catch(console.error);
  };

  const fetchClientForms = () => {
    if (!activeClinic) return;
    fetch(`/api/client-forms?clinicId=${activeClinic.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setClientForms(data);
      })
      .catch(console.error);
  };

  const selectEpisodeForm = (form: any) => {
    setSelectedEpisodeForm(form);
    setEpisodeFormName(form.name);
    try {
      const parsed = JSON.parse(form.fields);
      const normalized = Array.isArray(parsed)
        ? parsed.map((f: any) => typeof f === "string" ? { name: f, type: "Texto" } : f)
        : [];
      setEpisodeFormFields(normalized);
    } catch {
      setEpisodeFormFields([]);
    }
  };

  const selectClientForm = (form: any) => {
    setSelectedClientForm(form);
    setClientFormName(form.name);
    try {
      const parsed = JSON.parse(form.fields);
      const normalized = Array.isArray(parsed)
        ? parsed.map((f: any) => typeof f === "string" ? { name: f, type: "Texto" } : f)
        : [];
      setClientFormFields(normalized);
    } catch {
      setClientFormFields([]);
    }
  };

  const handleCreateEpisodeForm = async () => {
    if (!activeClinic) return;
    const res = await fetch("/api/episode-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nuevo formulario", fields: [], clinicId: activeClinic.id }),
    });
    const newForm = await res.json();
    setEpisodeForms(prev => [...prev, newForm]);
    selectEpisodeForm(newForm);
  };

  const handleCreateClientForm = async (name: string) => {
    if (!activeClinic || !name.trim()) return;
    const res = await fetch("/api/client-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), fields: [], clinicId: activeClinic.id }),
    });
    const newForm = await res.json();
    setClientForms(prev => [...prev, newForm]);
    selectClientForm(newForm);
    setShowCreateClientFormDrawer(false);
    setNewClientFormDrawerName("");
  };

  const handleSaveEpisodeForm = async () => {
    if (!selectedEpisodeForm) return;
    setEpisodeFormSaving(true);
    const res = await fetch(`/api/episode-forms/${selectedEpisodeForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: episodeFormName, fields: episodeFormFields }),
    });
    const updated = await res.json();
    setEpisodeForms(prev => prev.map(f => f.id === updated.id ? updated : f));
    setSelectedEpisodeForm(updated);
    setEpisodeFormSaving(false);
  };

  const handleSaveClientForm = async (markAsMain = false) => {
    if (!selectedClientForm) return;
    setClientFormSaving(true);
    const res = await fetch(`/api/client-forms/${selectedClientForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientFormName, fields: clientFormFields, isMain: markAsMain || selectedClientForm.isMain, clinicId: activeClinic?.id }),
    });
    const updated = await res.json();
    if (markAsMain) {
      setClientForms(prev => prev.map(f => ({ ...f, isMain: f.id === updated.id })));
    } else {
      setClientForms(prev => prev.map(f => f.id === updated.id ? updated : f));
    }
    setSelectedClientForm(updated);
    setClientFormSaving(false);
  };

  const handleDeleteEpisodeForm = async () => {
    if (!selectedEpisodeForm) return;
    await fetch(`/api/episode-forms/${selectedEpisodeForm.id}`, { method: "DELETE" });
    setEpisodeForms(prev => prev.filter(f => f.id !== selectedEpisodeForm.id));
    setSelectedEpisodeForm(null);
    setEpisodeFormName("");
    setEpisodeFormFields([]);
  };

  const handleDeleteClientForm = async () => {
    if (!selectedClientForm) return;
    await fetch(`/api/client-forms/${selectedClientForm.id}`, { method: "DELETE" });
    setClientForms(prev => prev.filter(f => f.id !== selectedClientForm.id));
    setSelectedClientForm(null);
    setClientFormName("");
    setClientFormFields([]);
  };

  const moveEpisodeField = (idx: number, dir: "up" | "down") => {
    const arr = [...episodeFormFields];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setEpisodeFormFields(arr);
  };

  const moveClientField = (idx: number, dir: "up" | "down") => {
    const arr = [...clientFormFields];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setClientFormFields(arr);
  };

  // Drag & Drop handlers for custom fields
  const handleClientDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleClientDragEnter = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const arr = [...clientFormFields];
    const draggedItem = arr[draggedIdx];
    arr.splice(draggedIdx, 1);
    arr.splice(targetIdx, 0, draggedItem);
    setDraggedIdx(targetIdx);
    setClientFormFields(arr);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setIsDraggingEnabled(false);
  };

  const handleEpisodeDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleEpisodeDragEnter = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const arr = [...episodeFormFields];
    const draggedItem = arr[draggedIdx];
    arr.splice(draggedIdx, 1);
    arr.splice(targetIdx, 0, draggedItem);
    setDraggedIdx(targetIdx);
    setEpisodeFormFields(arr);
  };

  const fetchReminders = () => {
    if (!activeClinic) return;
    setLoadingReminders(true);
    fetch(`/api/notifications/reminders?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReminders(data);
      })
      .catch(console.error)
      .finally(() => setLoadingReminders(false));
  };

  const fetchNotificationLogs = () => {
    if (!activeClinic) return;
    setLoadingReminderLogs(true);
    fetch(`/api/notifications/logs?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReminderLogs(data);
      })
      .catch(console.error)
      .finally(() => setLoadingReminderLogs(false));
  };

  // Notifications Handlers
  const handleOpenReminderForm = (reminder: any = null, isSystem: boolean = false) => {
    setIsReminderSystemForm(isSystem);
    if (reminder) {
      setEditingReminder(reminder);
      setReminderFormName(reminder.name);
      setReminderFormChannel(reminder.channel);
      setReminderFormCondition(reminder.condition);
      setReminderFormHours(String(reminder.hoursBefore));
      setReminderFormMinutes(String(reminder.minutesBefore));
      setReminderFormMessage(reminder.message);
      setReminderFormAllServices(reminder.allServices);
      setReminderFormServiceIds(reminder.serviceIds ? reminder.serviceIds.split(",") : []);
      setReminderFormTriggerWhen(reminder.triggerWhen || "BOTH");
      setReminderFormTemplateId(reminder.templateId || "");
    } else {
      setEditingReminder(null);
      setReminderFormName("");
      setReminderFormChannel(isSystem ? "EMAIL" : "WHATSAPP_MANUAL");
      setReminderFormCondition("PENDING");
      setReminderFormHours("24");
      setReminderFormMinutes("0");
      setReminderFormMessage("");
      setReminderFormAllServices(true);
      setReminderFormServiceIds([]);
      setReminderFormTriggerWhen("BOTH");
      setReminderFormTemplateId("");
    }
    setShowReminderForm(true);
  };

  const handleSaveReminder = async () => {
    if (!reminderFormName.trim()) {
      alert("Por favor, introduce un nombre para el recordatorio.");
      return;
    }
    if (!activeClinic) return;

    const payload = {
      name: reminderFormName.trim(),
      channel: reminderFormChannel,
      condition: reminderFormCondition,
      hoursBefore: parseInt(reminderFormHours) || 0,
      minutesBefore: parseInt(reminderFormMinutes) || 0,
      message: reminderFormMessage,
      clinicId: activeClinic.id,
      allServices: reminderFormAllServices,
      serviceIds: reminderFormServiceIds.join(","),
      isSystem: isReminderSystemForm,
      triggerWhen: reminderFormTriggerWhen,
      templateId: reminderFormTemplateId,
    };

    try {
      let res;
      if (editingReminder) {
        res = await fetch(`/api/notifications/reminders/${editingReminder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/notifications/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowReminderForm(false);
        fetchReminders();
        alert(isReminderSystemForm ? "Notificación guardada correctamente." : "Recordatorio guardado correctamente.");
      } else {
        const err = await res.json();
        alert(err.error || "Error al guardar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };


  const handleDeleteReminder = (reminderId: string) => {
    setReminderToDelete(reminderId);
  };

  const executeDeleteReminder = async () => {
    if (!reminderToDelete) return;
    try {
      const res = await fetch(`/api/notifications/reminders/${reminderToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReminderToDelete(null);
        setShowReminderForm(false);
        fetchReminders();
        alert(isReminderSystemForm ? "Notificación eliminada." : "Recordatorio eliminado.");
      } else {
        alert("Error al eliminar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };




  const handleTriggerRemindersCron = async () => {
    if (!activeClinic) return;
    try {
      const res = await fetch("/api/notifications/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: activeClinic.id }),
      });
      if (res.ok) {
        const data = await res.json();
        fetchNotificationLogs();
        alert(`${data.message} (${data.processedCount} recordatorios registrados).`);
      } else {
        alert("Error al simular recordatorios.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  const handleToggleReminderEnabled = async (reminder: any) => {

    try {
      const res = await fetch(`/api/notifications/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !reminder.enabled }),
      });
      if (res.ok) {
        fetchReminders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotificationConfig = async () => {
    if (!activeClinic) return;
    try {
      const res = await fetch(`/api/clinics/${activeClinic.id}/notifications-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyAssignedUser: configNotifyAssignedUser,
          adminNotificationUserIds: configAdminNotificationUserIds.join(","),
          senderEmail: configSenderEmail.trim(),
          defaultWhatsappMode: configDefaultWhatsappMode,
        }),
      });

      if (res.ok) {
        const updatedClinic = await res.json();
        setActiveClinic(updatedClinic);
        alert("Configuración de notificaciones guardada correctamente.");
      } else {
        alert("Error al guardar la configuración.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  const handleSaveWhatsappCredentials = async () => {
    if (!activeClinic) return;
    setCheckingWhatsappStatus(true);
    setWhatsappStatusMessage("");
    try {
      const res = await fetch(`/api/clinics/${activeClinic.id}/notifications-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappApiUrl: whatsappApiUrl.trim(),
          whatsappInstanceName: whatsappInstanceName.trim(),
          whatsappApiToken: whatsappApiToken.trim(),
        }),
      });

      if (res.ok) {
        const updatedClinic = await res.json();
        setActiveClinic(updatedClinic);
        alert("Credenciales de WhatsApp guardadas con éxito.");
      } else {
        alert("Error al guardar las credenciales.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error de conexión.");
    } finally {
      setCheckingWhatsappStatus(false);
    }
  };

  const handleGetWhatsappQr = async () => {
    if (!activeClinic) return;
    setCheckingWhatsappStatus(true);
    setWhatsappStatusMessage("Generando código QR... Por favor espera.");
    setWhatsappQrCode(null);
    try {
      const res = await fetch(`/api/clinics/${activeClinic.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-qr",
          whatsappApiUrl: whatsappApiUrl.trim(),
          whatsappInstanceName: whatsappInstanceName.trim(),
          whatsappApiToken: whatsappApiToken.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.base64) {
          setWhatsappQrCode(data.base64);
          setWhatsappStatusMessage("Escanea el código QR con tu aplicación de WhatsApp.");
        } else if (data.status === "CONNECTED") {
          setWhatsappConnected(true);
          setWhatsappStatusMessage("¡La instancia ya está conectada!");
        } else {
          setWhatsappStatusMessage("No se pudo obtener el código QR en este momento. Inténtalo de nuevo.");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setWhatsappStatusMessage(`Error: ${err.error || "No se pudo comunicar con el servidor de WhatsApp."}`);
      }
    } catch (e: any) {
      console.error(e);
      setWhatsappStatusMessage("Error de red al solicitar el código QR.");
    } finally {
      setCheckingWhatsappStatus(false);
    }
  };

  const handleCheckWhatsappStatus = async () => {
    if (!activeClinic) return;
    setCheckingWhatsappStatus(true);
    setWhatsappStatusMessage("Verificando estado de conexión...");
    try {
      const res = await fetch(`/api/clinics/${activeClinic.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-status",
          whatsappApiUrl: whatsappApiUrl.trim(),
          whatsappInstanceName: whatsappInstanceName.trim(),
          whatsappApiToken: whatsappApiToken.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const connected = data.state === "CONNECTED";
        setWhatsappConnected(connected);
        if (connected) {
          setWhatsappQrCode(null);
          setWhatsappStatusMessage("✓ WhatsApp conectado correctamente.");
          // Update active clinic locally
          setActiveClinic({
            ...activeClinic,
            whatsappConnected: true,
            whatsappApiUrl: whatsappApiUrl.trim(),
            whatsappInstanceName: whatsappInstanceName.trim(),
            whatsappApiToken: whatsappApiToken.trim(),
          });
        } else {
          setWhatsappStatusMessage("La instancia no está conectada. Por favor, escanea el código QR.");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setWhatsappStatusMessage(`Error al comprobar estado: ${err.error || "Desconocido"}`);
      }
    } catch (e: any) {
      console.error(e);
      setWhatsappStatusMessage("Error de red al comprobar el estado.");
    } finally {
      setCheckingWhatsappStatus(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    if (!activeClinic) return;
    if (!confirm("¿Estás seguro de que deseas desconectar WhatsApp? Se eliminará la sesión del servidor.")) return;
    setCheckingWhatsappStatus(true);
    setWhatsappStatusMessage("Desconectando...");
    try {
      const res = await fetch(`/api/clinics/${activeClinic.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          whatsappApiUrl: whatsappApiUrl.trim(),
          whatsappInstanceName: whatsappInstanceName.trim(),
          whatsappApiToken: whatsappApiToken.trim(),
        }),
      });

      if (res.ok) {
        setWhatsappConnected(false);
        setWhatsappQrCode(null);
        setWhatsappStatusMessage("WhatsApp desconectado.");
        setActiveClinic({
          ...activeClinic,
          whatsappConnected: false,
        });
      } else {
        alert("Error al desconectar.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error de red.");
    } finally {
      setCheckingWhatsappStatus(false);
    }
  };

  const fetchData = () => {
    if (!activeClinic) return;
    
    // Populate clinic data
    setClinicName(activeClinic.name);
    setClinicAddress(activeClinic.address);
    setClinicPhone(activeClinic.phone || "");
    setClinicEmail(activeClinic.email || "");
    setClinicControlHorarioActivo(activeClinic.controlHorarioActivo || false);
    
    // Populate notification config data
    setConfigNotifyAssignedUser(activeClinic.notifyAssignedUser ?? true);
    setConfigAdminNotificationUserIds(activeClinic.adminNotificationUserIds ? activeClinic.adminNotificationUserIds.split(",") : []);
    setConfigSenderEmail(activeClinic.senderEmail || "");
    setConfigDefaultWhatsappMode(activeClinic.defaultWhatsappMode || "Web");

    setWhatsappApiUrl(activeClinic.whatsappApiUrl || "");
    setWhatsappInstanceName(activeClinic.whatsappInstanceName || "");
    setWhatsappApiToken(activeClinic.whatsappApiToken || "");
    setWhatsappConnected(activeClinic.whatsappConnected || false);
    setWhatsappQrCode(null);
    setWhatsappStatusMessage("");

    fetchReminders();
    fetchNotificationLogs();
    fetchProducts();
    fetchProductTransactions();




    // Fetch services
    fetch(`/api/services?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          console.error("Fetched services is not an array:", data);
          setServices([]);
        }
      });

    // Fetch staff
    fetch(`/api/users?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => setStaff(data));

    // Fetch templates
    fetch("/api/documents/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data));

    // Fetch vouchers
    fetch(`/api/vouchers?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => setVouchers(Array.isArray(data) ? data : []));

    // Fetch custom form templates
    fetch(`/api/episode-forms?clinicId=${activeClinic.id}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setEpisodeForms(d); });
    fetch(`/api/client-forms?clinicId=${activeClinic.id}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setClientForms(d); });
  };

  useEffect(() => {
    fetchData();
  }, [activeClinic]);

  // Redirect to first allowed tab for non-admins
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "ADMIN") return;
    
    const allowedTabs: string[] = [];
    if (hasPermission(currentUser, "configuracion", "Ver configuración")) allowedTabs.push("clinic");
    if (hasPermission(currentUser, "configuracion", "Configurar servicios")) allowedTabs.push("services");
    if (hasPermission(currentUser, "configuracion", "Editar su propio horario")) allowedTabs.push("users");
    if (hasPermission(currentUser, "configuracion", "Configurar notificaciones")) allowedTabs.push("notifications");
    
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] as any);
    }
    
    // Also redirect usersSubTab to horario if they are not admin
    if (usersSubTab === "equipo") {
      setUsersSubTab("horario");
    }
  }, [currentUser, activeTab, usersSubTab]);

  // Calculate total price based on price and tax percentage
  useEffect(() => {
    const priceVal = parseFloat(serviceFormPrice) || 0;
    const taxVal = parseFloat(serviceFormTax) || 0;
    const totalVal = priceVal * (1 + taxVal / 100);
    setServiceFormTotal(totalVal.toFixed(2));
  }, [serviceFormPrice, serviceFormTax]);

  // Tab check from query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "usuarios") {
        setActiveTab("users");
      } else if (tab === "import") {
        setActiveTab("import");
      }
    }
  }, []);

  // ==========================================
  // LIQUIDATIONS AND COMMISSIONS HANDLERS
  // ==========================================
  const fetchLiquidations = async () => {
    if (!activeClinic) return;
    setLoadingLiquidations(true);
    try {
      const res = await fetch(`/api/liquidations?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setLiquidations(data);
      }
    } catch (e) {
      console.error("Error fetching liquidations:", e);
    } finally {
      setLoadingLiquidations(false);
    }
  };

  const fetchCommissionConfig = async (therapistId: string) => {
    if (!activeClinic || !therapistId) return;
    try {
      const res = await fetch(`/api/users/${therapistId}/commission-config?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setTherapistCommissionType(data.defaultType || "PERCENTAGE");
        setTherapistCommissionValue(String(data.defaultValue || 0));
        setTherapistOverrides(data.overridesJson ? JSON.parse(data.overridesJson) : {});
      }
    } catch (e) {
      console.error("Error fetching commission config:", e);
    }
  };

  const handleSaveCommissionConfig = async () => {
    if (!activeClinic || !selectedTherapistId) {
      alert("Por favor, selecciona un profesional.");
      return;
    }
    setSavingCommissionConfig(true);
    try {
      const res = await fetch(`/api/users/${selectedTherapistId}/commission-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic.id,
          defaultType: therapistCommissionType,
          defaultValue: parseFloat(therapistCommissionValue) || 0,
          overridesJson: JSON.stringify(therapistOverrides)
        })
      });
      if (res.ok) {
        alert("Configuración de comisiones guardada correctamente.");
      } else {
        alert("Error al guardar la configuración.");
      }
    } catch (e) {
      console.error("Error saving commission config:", e);
      alert("Error de red.");
    } finally {
      setSavingCommissionConfig(false);
    }
  };

  const handleCalculateDraft = async () => {
    if (!activeClinic || !selectedCalculateTherapistId || !calculateMonth) {
      alert("Por favor, selecciona un profesional y el mes de liquidación.");
      return;
    }
    setCalculatingDraft(true);
    setCalculatedDraft(null);

    const [year, month] = calculateMonth.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999).toISOString();

    try {
      const res = await fetch("/api/liquidations/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCalculateTherapistId,
          clinicId: activeClinic.id,
          startDate,
          endDate
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCalculatedDraft(data);
      } else {
        const err = await res.json();
        alert(err.error || "Error al calcular la liquidación.");
      }
    } catch (e) {
      console.error("Error calculating draft:", e);
      alert("Error de red.");
    } finally {
      setCalculatingDraft(false);
    }
  };

  const handleSaveLiquidation = async () => {
    if (!calculatedDraft || !activeClinic) return;
    setSavingLiquidation(true);
    try {
      const res = await fetch("/api/liquidations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: calculatedDraft.userId,
          clinicId: activeClinic.id,
          periodStart: calculatedDraft.periodStart,
          periodEnd: calculatedDraft.periodEnd,
          totalAmount: calculatedDraft.totalAmount,
          details: calculatedDraft.details
        })
      });
      if (res.ok) {
        alert("Liquidación guardada y cerrada correctamente.");
        setCalculatedDraft(null);
        fetchLiquidations();
      } else {
        alert("Error al guardar la liquidación.");
      }
    } catch (e) {
      console.error("Error saving liquidation:", e);
      alert("Error de red.");
    } finally {
      setSavingLiquidation(false);
    }
  };

  const handlePayLiquidation = async (id: string) => {
    try {
      const res = await fetch(`/api/liquidations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" })
      });
      if (res.ok) {
        alert("Liquidación marcada como pagada.");
        fetchLiquidations();
      } else {
        alert("Error al actualizar la liquidación.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLiquidation = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta liquidación histórica?")) return;
    try {
      const res = await fetch(`/api/liquidations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Liquidación eliminada.");
        fetchLiquidations();
      } else {
        alert("Error al eliminar.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPDF = async (liq: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      const clinicName = activeClinic?.name || "CLIFAV";
      const docRef = `LIQ-${liq.id.substring(0, 8).toUpperCase()}`;
      const issueDate = new Date().toLocaleDateString("es-ES");
      const periodLabel = new Date(liq.periodStart).toLocaleString("es-ES", { month: "long", year: "numeric" }).toUpperCase();
      const userFullName = `${liq.user?.name} ${liq.user?.lastName || ""}`.trim();
      const userRole = liq.user?.role === "ADMIN" ? "Administrador" : liq.user?.role === "DOCTOR" ? "Médico" : "Terapeuta";
      const statusLabel = liq.status === "PAID" ? "PAGADO" : "PENDIENTE DE PAGO";
      const details = JSON.parse(liq.detailsJson || "[]");

      let y = 20;

      // Header Banner
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 8, "F");

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55);
      doc.text(clinicName, 15, y);

      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("INFORME DE LIQUIDACIÓN", 130, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Referencia: ${docRef}`, 130, y);
      doc.text(`Fecha Emisión: ${issueDate}`, 130, y + 5);

      y += 15;
      doc.setDrawColor(229, 231, 235);
      doc.line(15, y, 195, y);

      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(59, 130, 246);
      doc.text("INFORMACIÓN DEL PROFESIONAL", 15, y);
      doc.text("PERÍODO DE LIQUIDACIÓN", 115, y);

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(`Nombre: ${userFullName}`, 15, y);
      doc.text(`Cargo: ${userRole}`, 15, y + 5);

      doc.text(`Mes: ${periodLabel}`, 115, y);
      doc.text(`Estado: ${statusLabel}`, 115, y + 5);

      y += 18;
      doc.setFillColor(243, 244, 246);
      doc.rect(15, y, 180, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text("Fecha", 17, y + 6);
      doc.text("Concepto / Servicio", 45, y + 6);
      doc.text("PVP Servicio", 125, y + 6);
      doc.text("Comisión", 155, y + 6);
      doc.text("Total", 182, y + 6);

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      
      let totalPvp = 0;

      for (const item of details) {
        if (y > 265) {
          doc.addPage();
          doc.setFillColor(59, 130, 246);
          doc.rect(0, 0, 210, 8, "F");
          y = 25;
          doc.setFillColor(243, 244, 246);
          doc.rect(15, y, 180, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.text("Fecha", 17, y + 6);
          doc.text("Concepto / Servicio", 45, y + 6);
          doc.text("PVP Servicio", 125, y + 6);
          doc.text("Comisión", 155, y + 6);
          doc.text("Total", 182, y + 6);
          y += 8;
          doc.setFont("helvetica", "normal");
        }

        const itemDate = new Date(item.date).toLocaleDateString("es-ES");
        const concept = item.serviceName;
        const pvp = `${item.servicePrice.toFixed(2)} €`;
        const rate = item.commissionType === "PERCENTAGE" 
          ? `${item.commissionValue}%` 
          : item.commissionType === "DAILY_FIXED" 
            ? `${item.commissionValue.toFixed(2)} €/día` 
            : `${item.commissionValue.toFixed(2)} €`;
        const total = `${item.calculatedAmount.toFixed(2)} €`;

        totalPvp += item.servicePrice;

        doc.text(itemDate, 17, y + 6);
        doc.text(concept.substring(0, 38), 45, y + 6);
        doc.text(pvp, 125, y + 6);
        doc.text(rate, 155, y + 6);
        doc.text(total, 182, y + 6);

        y += 8;
      }

      y += 10;
      if (y > 240) {
        doc.addPage();
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 210, 8, "F");
        y = 25;
      }

      doc.setFillColor(249, 250, 251);
      doc.rect(115, y, 80, 32, "F");
      doc.setDrawColor(229, 231, 235);
      doc.rect(115, y, 80, 32, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("Resumen:", 120, y + 6);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Total PVP Facturado:`, 120, y + 14);
      doc.text(`${totalPvp.toFixed(2)} €`, 175, y + 14);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text(`Total Liquidar:`, 120, y + 24);
      doc.text(`${liq.totalAmount.toFixed(2)} €`, 175, y + 24);

      if (liq.status === "PAID") {
        doc.setDrawColor(16, 185, 129);
        doc.rect(15, y + 5, 50, 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text("PAGADO", 26, y + 16);
      } else {
        doc.setDrawColor(245, 158, 11);
        doc.rect(15, y + 5, 50, 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(245, 158, 11);
        doc.text("PENDIENTE", 23, y + 16);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Documento generado de forma automática por Clifav.", 15, 285);
      
      doc.save(`liquidacion_${userFullName.replace(/\s+/g, "_")}_${periodLabel.toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error al generar el PDF.");
    }
  };

  useEffect(() => {
    if (activeTab === "liquidaciones" && activeClinic) {
      fetchLiquidations();
    }
  }, [activeTab, activeClinic]);

  useEffect(() => {
    if (selectedTherapistId) {
      fetchCommissionConfig(selectedTherapistId);
    }
  }, [selectedTherapistId]);

  // ==========================================
  // INVENTORY AND CONSUMIBLES HANDLERS
  // ==========================================
  const fetchProducts = async () => {
    if (!activeClinic) return;
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/inventory?clinicId=${activeClinic.id}&search=${searchProductQuery}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error("Error fetching products:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchProductTransactions = async () => {
    if (!activeClinic) return;
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/inventory/transactions?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setProductTransactions(data);
      }
    } catch (e) {
      console.error("Error fetching inventory transactions:", e);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Trigger search when query updates
  useEffect(() => {
    if (activeClinic) {
      fetchProducts();
    }
  }, [searchProductQuery]);

  const handleOpenProductForm = (prod: any = null) => {
    setProductFormError(null);
    if (prod) {
      setEditingProduct(prod);
      setProductFormName(prod.name);
      setProductFormSku(prod.sku || "");
      setProductFormStock(String(prod.stock));
      setProductFormMinStock(String(prod.minStock));
      setProductFormCostPrice(String(prod.costPrice));
    } else {
      setEditingProduct(null);
      setProductFormName("");
      setProductFormSku("");
      setProductFormStock("0");
      setProductFormMinStock("0");
      setProductFormCostPrice("0");
    }
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    setProductFormError(null);
    const nameVal = (productFormName || "").trim();
    const skuVal = (productFormSku || "").trim() || null;

    if (!nameVal || !activeClinic) {
      setProductFormError("El nombre del producto es obligatorio.");
      alert("El nombre del producto es obligatorio.");
      return;
    }

    const payload = {
      name: nameVal,
      sku: skuVal,
      stock: parseInt(productFormStock) || 0,
      minStock: parseInt(productFormMinStock) || 0,
      costPrice: parseFloat(productFormCostPrice) || 0,
      clinicId: activeClinic.id,
      userId: currentUser?.id || null,
    };

    try {
      let res;
      if (editingProduct) {
        res = await fetch(`/api/inventory/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            sku: payload.sku,
            minStock: payload.minStock,
            costPrice: payload.costPrice,
            userId: currentUser?.id || null,
          }),
        });
      } else {
        res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowProductForm(false);
        fetchProducts();
        fetchProductTransactions();
        alert(editingProduct ? "Producto actualizado correctamente." : "Producto creado correctamente.");
      } else {
        const err = await res.json();
        setProductFormError(err.error || "Error al guardar el producto.");
        alert(err.error || "Error al guardar el producto.");
      }
    } catch (e) {
      console.error(e);
      setProductFormError("Error de red.");
      alert("Error de red.");
    }
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/inventory/${productToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProductToDelete(null);
        setShowProductForm(false);
        fetchProducts();
        fetchProductTransactions();
        alert("Producto eliminado del inventario.");
      } else {
        alert("Error al eliminar el producto.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  const handleOpenStockAdjustModal = (prod: any) => {
    setShowStockAdjustModal(prod);
    setStockAdjustmentVal("");
    setStockAdjustmentReason("");
  };

  const handleExecuteStockAdjustment = async () => {
    if (!showStockAdjustModal || !stockAdjustmentVal) return;
    const adjustment = parseInt(stockAdjustmentVal);
    if (isNaN(adjustment) || adjustment === 0) {
      alert("Ingresa una cantidad de ajuste válida (distinta de cero).");
      return;
    }

    try {
      const res = await fetch(`/api/inventory/${showStockAdjustModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockAdjustment: adjustment,
          adjustmentReason: stockAdjustmentReason.trim() || null,
          userId: currentUser?.id || null,
        }),
      });

      if (res.ok) {
        setShowStockAdjustModal(null);
        fetchProducts();
        fetchProductTransactions();
        alert("Ajuste de stock realizado correctamente.");
      } else {
        const err = await res.json();
        alert(err.error || "Error al realizar ajuste.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  // Service Consumibles Handlers
  const fetchServiceConsumibles = async (serviceId: string) => {
    try {
      const res = await fetch(`/api/services/${serviceId}/consumibles`);
      if (res.ok) {
        const data = await res.json();
        setServiceConsumibles(data);
      }
    } catch (e) {
      console.error("Error fetching service consumibles:", e);
    }
  };

  const handleAddConsumibleToService = async () => {
    if (!editingService || !selectedConsumibleId || !selectedConsumibleQty || !activeClinic) return;
    const quantity = parseInt(selectedConsumibleQty);
    if (isNaN(quantity) || quantity <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return;
    }

    try {
      const res = await fetch(`/api/services/${editingService.id}/consumibles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedConsumibleId,
          quantity,
          clinicId: activeClinic.id,
        }),
      });

      if (res.ok) {
        setSelectedConsumibleId("");
        setSelectedConsumibleQty("1");
        setShowAddConsumibleToService(false);
        fetchServiceConsumibles(editingService.id);
        alert("Material asociado correctamente.");
      } else {
        const err = await res.json();
        alert(err.error || "Error al asociar material.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  const handleDeleteConsumibleFromService = async (productId: string) => {
    if (!editingService) return;
    if (!confirm("¿Seguro que deseas desvincular este material de este servicio?")) return;

    try {
      const res = await fetch(`/api/services/${editingService.id}/consumibles?productId=${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchServiceConsumibles(editingService.id);
        alert("Material desvinculado correctamente.");
      } else {
        alert("Error al desvincular material.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };


  // Voucher-related handlers
  const handleNewVoucherClick = () => {
    setEditingVoucher(null);
    setVoucherFormName("");
    setVoucherFormSessions("10");
    setVoucherFormPrice("");
    setVoucherFormTax("0");
    setVoucherFormHasExpiration(false);
    setVoucherFormExpirationMonths("12");
    setVoucherFormServiceIds([]);
    setShowVoucherForm(true);
  };

  const handleEditVoucherClick = (voucher: any) => {
    setEditingVoucher(voucher);
    setVoucherFormName(voucher.name);
    setVoucherFormSessions(String(voucher.sessions));
    setVoucherFormPrice(String(voucher.price));
    setVoucherFormTax(String(voucher.tax || 0));
    setVoucherFormHasExpiration(!!voucher.expirationMonths);
    setVoucherFormExpirationMonths(String(voucher.expirationMonths || 12));
    setVoucherFormServiceIds(voucher.serviceIds ? voucher.serviceIds.split(",") : []);
    setShowVoucherForm(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic) return;

    if (voucherFormServiceIds.length === 0) {
      alert("Debe seleccionar al menos un servicio para asociar a este bono.");
      return;
    }

    const payload = {
      name: voucherFormName,
      sessions: voucherFormSessions,
      price: voucherFormPrice,
      tax: voucherFormTax,
      expirationMonths: voucherFormHasExpiration ? voucherFormExpirationMonths : null,
      serviceIds: voucherFormServiceIds.join(","),
      clinicId: activeClinic.id,
    };

    try {
      const url = editingVoucher 
        ? `/api/vouchers/${editingVoucher.id}`
        : "/api/vouchers";
      const method = editingVoucher ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Error al guardar el bono");
      }

      const saved = await res.json();
      
      if (editingVoucher) {
        setVouchers(vouchers.map((v) => v.id === saved.id ? saved : v));
      } else {
        // Al guardar, se coloca arriba de nuevo bono (which is handled by sorting/rendering order)
        setVouchers([saved, ...vouchers]);
      }

      setShowVoucherForm(false);
      setEditingVoucher(null);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el bono. Revisa los datos e inténtalo de nuevo.");
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este bono?")) return;
    try {
      const res = await fetch(`/api/vouchers/${voucherId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVouchers(vouchers.filter((v) => v.id !== voucherId));
        if (editingVoucher?.id === voucherId) {
          setShowVoucherForm(false);
          setEditingVoucher(null);
        }
      } else {
        alert("Error al eliminar el bono");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const fakeEvent = {
          target: {
            files: e.dataTransfer.files
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleExcelUpload(fakeEvent);
      } else {
        alert("Por favor, sube únicamente archivos de Excel (.xlsx, .xls).");
      }
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setImportResult(null);

    // Dynamically import xlsx (SheetJS) to reduce initial bundle load
    const XLSX = await import("xlsx");
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse sheet to JSON array, raw headers
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
        
        if (rows.length < 2) {
          alert("El archivo de Excel parece estar vacío o no contiene suficientes filas.");
          return;
        }

        // The first row is the header row
        const rawHeaders = rows[0] as string[];
        
        // Let's match headers to database fields
        const matchedHeadersIndices: { [key: string]: number } = {};
        
        const cleanStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        rawHeaders.forEach((header, index) => {
          if (!header) return;
          const h = cleanStr(header.toString());
          
          if (h === "id") matchedHeadersIndices["id"] = index;
          else if (h === "numero de cliente" || h === "numero cliente" || h === "clientnumber") matchedHeadersIndices["clientNumber"] = index;
          else if (h === "nombres" || h === "nombre" || h === "firstname") matchedHeadersIndices["firstName"] = index;
          else if (h === "apellidos" || h === "apellido" || h === "lastname") matchedHeadersIndices["lastName"] = index;
          else if (h === "nombre y apellidos" || h === "nombres y apellidos" || h === "nombre completo" || h === "fullname") matchedHeadersIndices["fullName"] = index;
          else if (h === "dni" || h === "nif" || h === "dninif" || h === "identificacion") matchedHeadersIndices["dniNif"] = index;
          else if (h === "correo electronico" || h === "correo" || h === "email" || h === "correo elect.") matchedHeadersIndices["email"] = index;
          else if (h === "telefono" || h === "tel" || h === "phone") matchedHeadersIndices["phone"] = index;
          else if (h === "genero" || h === "sexo" || h === "gender") matchedHeadersIndices["gender"] = index;
          else if (h === "fecha de nacimiento" || h === "nacimiento" || h === "f.nacimiento" || h === "birthdate") matchedHeadersIndices["birthDate"] = index;
          else if (h === "direccion" || h === "domicilio" || h === "address") matchedHeadersIndices["address"] = index;
          else if (h === "ciudad" || h === "municipio" || h === "localidad" || h === "city" || h === "municipality") matchedHeadersIndices["municipality"] = index;
          else if (h === "codigo postal" || h === "cp" || h === "postalcode") matchedHeadersIndices["postalCode"] = index;
          else if (h === "etiquetas" || h === "tags") matchedHeadersIndices["tags"] = index;
          else if (h === "fecha de creacion" || h === "creacion" || h === "f.creacion" || h === "createdat") matchedHeadersIndices["createdAt"] = index;
          else if (h === "iban") matchedHeadersIndices["iban"] = index;
          else if (h === "bic") matchedHeadersIndices["bic"] = index;
          else if (h === "pais" || h === "country") matchedHeadersIndices["country"] = index;
        });

        // Parse rows
        const clientsToImport: any[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          if (!row || row.length === 0) continue;

          const getVal = (field: string) => {
            const index = matchedHeadersIndices[field];
            if (index === undefined) return undefined;
            const val = row[index];
            return val !== undefined && val !== null ? val.toString().trim() : undefined;
          };

          const client: any = {};
          
          client.id = getVal("id");
          client.clientNumber = getVal("clientNumber");
          
          const rawFirstName = getVal("firstName");
          const rawLastName = getVal("lastName");
          const rawFullName = getVal("fullName");

          if (rawFirstName !== undefined) {
            client.firstName = rawFirstName;
          }
          if (rawLastName !== undefined) {
            client.lastName = rawLastName;
          }

          if (rawFullName && (!client.firstName || !client.lastName)) {
            const parts = rawFullName.trim().split(/\s+/);
            if (parts.length > 0) {
              if (!client.firstName) {
                if (parts.length === 1) {
                  client.firstName = parts[0];
                  client.lastName = "";
                } else if (parts.length === 2) {
                  client.firstName = parts[0];
                  client.lastName = parts[1];
                } else {
                  client.firstName = parts[0];
                  client.lastName = parts.slice(1).join(" ");
                }
              } else if (!client.lastName) {
                client.lastName = parts.slice(1).join(" ");
              }
            }
          }

          // Fallback to empty string if undefined to satisfy typescript and model constraint
          if (client.firstName === undefined) client.firstName = "";
          if (client.lastName === undefined) client.lastName = "";

          client.dniNif = getVal("dniNif");
          client.email = getVal("email");
          client.phone = getVal("phone");
          client.gender = getVal("gender");
          client.birthDate = getVal("birthDate");
          client.address = getVal("address");
          client.municipality = getVal("municipality");
          client.postalCode = getVal("postalCode");
          client.tags = getVal("tags");
          client.createdAt = getVal("createdAt");
          client.iban = getVal("iban");
          client.bic = getVal("bic");
          client.country = getVal("country");

          // Skip completely empty rows
          if (!client.firstName && !client.lastName) {
            continue;
          }

          clientsToImport.push(client);
        }

        setExcelData(clientsToImport);
      } catch (err) {
        console.error(err);
        alert("Error al leer el archivo Excel. Asegúrate de que tiene un formato válido.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const startImport = async () => {
    if (excelData.length === 0 || !activeClinic) return;

    setImporting(true);
    setImportProgress(10);
    
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clients: excelData,
          clinicId: activeClinic.id
        })
      });

      setImportProgress(60);

      const data = await res.json();
      setImportProgress(100);

      if (res.ok) {
        setImportResult({
          success: true,
          createdCount: data.createdCount,
          updatedCount: data.updatedCount,
          message: data.message
        });
        setExcelData([]);
        setExcelFileName("");
      } else {
        setImportResult({
          success: false,
          createdCount: 0,
          updatedCount: 0,
          message: data.error || "Ocurrió un error al procesar el archivo."
        });
      }
    } catch (err) {
      console.error(err);
      setImportResult({
        success: false,
        createdCount: 0,
        updatedCount: 0,
        message: "Error de red al realizar la importación."
      });
    } finally {
      setImporting(false);
    }
  };

  // Update clinic settings
  const handleUpdateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic) return;

    const payload = {
      name: clinicName,
      address: clinicAddress,
      phone: clinicPhone,
      email: clinicEmail,
      logo: clinicLogo,
      controlHorarioActivo: clinicControlHorarioActivo,
    };


    const res = await fetch(`/api/clinics/${activeClinic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updatedClinic = await res.json();
      setActiveClinic(updatedClinic);
      alert("Configuración de clínica actualizada con éxito.");
    }
  };

  // Delete service
  const handleDeleteService = async () => {
    if (!editingService) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar el servicio "${editingService.name}"?`)) return;

    try {
      const res = await fetch(`/api/services?id=${editingService.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowServiceForm(false);
        setEditingService(null);
        
        // Reset form variables
        setServiceFormName("");
        setServiceFormType("Presencial");
        setServiceFormIsGroup(false);
        setServiceFormHours(0);
        setServiceFormMinutes(45);
        setServiceFormPrice("");
        setServiceFormTax("0");
        setServiceFormTotal("0.00");
        setServiceFormAllowedUserIds([]);
        setServiceFormColor("#3b82f6");
        setServiceFormCategory("");

        fetchData();
        alert("Servicio eliminado con éxito.");
      } else {
        alert("Error al eliminar el servicio.");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Error en el servidor al intentar eliminar el servicio.");
    }
  };

  // Save or edit service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormName || serviceFormPrice === "") {
      alert("Por favor, rellene el nombre y el precio del servicio.");
      return;
    }

    const payload = {
      id: editingService?.id,
      name: serviceFormName,
      price: parseFloat(serviceFormPrice),
      duration: serviceFormHours * 60 + serviceFormMinutes,
      color: serviceFormColor,
      category: serviceFormCategory || null,
      type: serviceFormType,
      tax: parseFloat(serviceFormTax) || 0,
      total: parseFloat(serviceFormTotal) || 0,
      allowedUserIds: serviceFormAllowedUserIds.join(","),
      clinicId: activeClinic?.id || null,
    };

    const method = editingService ? "PUT" : "POST";
    const res = await fetch("/api/services", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowServiceForm(false);
      setEditingService(null);
      
      // Reset form variables
      setServiceFormName("");
      setServiceFormType("Presencial");
      setServiceFormIsGroup(false);
      setServiceFormHours(0);
      setServiceFormMinutes(45);
      setServiceFormPrice("");
      setServiceFormTax("0");
      setServiceFormTotal("0.00");
      setServiceFormAllowedUserIds([]);
      setServiceFormColor("#3b82f6");
      setServiceFormCategory("");

      fetchData();
      alert(editingService ? "Servicio actualizado con éxito." : "Servicio registrado con éxito.");
    } else {
      alert("Error al guardar el servicio.");
    }
  };

  const handleEditServiceClick = (service: Service) => {
    setEditingService(service);
    setServiceFormName(service.name);
    setServiceFormType(service.type || "Presencial");
    setServiceFormIsGroup(false);
    setServiceFormHours(Math.floor(service.duration / 60));
    setServiceFormMinutes(service.duration % 60);
    setServiceFormPrice(service.price.toString());
    setServiceFormTax((service.tax !== undefined ? service.tax : 0).toString());
    setServiceFormTotal((service.total !== undefined ? service.total : service.price).toFixed(2));
    setServiceFormAllowedUserIds(service.allowedUserIds ? service.allowedUserIds.split(",") : []);
    setServiceFormColor(service.color || "#3b82f6");
    setServiceFormCategory(service.category || "");
    
    setFormActiveTab("general");
    setShowServiceForm(true);
  };

  const handleNewServiceClick = () => {
    setEditingService(null);
    setServiceFormName("");
    setServiceFormType("Presencial");
    setServiceFormIsGroup(false);
    setServiceFormHours(0);
    setServiceFormMinutes(45);
    setServiceFormPrice("");
    setServiceFormTax("0");
    setServiceFormTotal("0.00");
    // Default allowed user ids to all current staff members
    setServiceFormAllowedUserIds(staff.map(s => s.id));
    setServiceFormColor("#3b82f6");
    setServiceFormCategory(selectedCategory !== "Todas las categorías" && selectedCategory !== "No categorizado" ? selectedCategory : "");
    
    setFormActiveTab("general");
    setShowServiceForm(true);
  };

  // Create staff user
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStaffClinics.length === 0) {
      alert("Debes seleccionar al menos una clínica");
      return;
    }

    const payload = {
      name: newStaffName,
      lastName: newStaffLastName,
      email: newStaffEmail,
      password: newStaffPassword,
      role: newStaffRole,
      phone: newStaffPhone,
      dniNif: newStaffDniNif,
      address: newStaffAddress,
      municipality: newStaffMunicipality,
      postalCode: newStaffPostalCode,
      additionalData: newStaffAdditionalData,
      color: newStaffColor,
      permissionsJson: JSON.stringify(newStaffPermissions),
      clinicIds: newStaffClinics,
    };

    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setNewStaffName("");
      setNewStaffLastName("");
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffPhone("");
      setNewStaffDniNif("");
      setNewStaffAddress("");
      setNewStaffMunicipality("");
      setNewStaffPostalCode("");
      setNewStaffAdditionalData("");
      setNewStaffColor("#3b82f6");
      setNewStaffPermissions({});
      setNewStaffClinics(activeClinic ? [activeClinic.id] : []);
      setCreateStaffActiveTab(null);
      fetchData();
      setShowCreateStaffDrawer(false);
      alert("Miembro del personal registrado y agendas asignadas.");
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const handleOpenEmployeeDrawer = (user: User) => {
    setSelectedEmployee(user);
    setSelectedEmployeeTab(null);
    setEditStaffName(user.name || "");
    setEditStaffLastName(user.lastName || "");
    setEditStaffEmail(user.email || "");
    setEditStaffDniNif(user.dniNif || "");
    setEditStaffPhone(user.phone || "");
    setEditStaffAddress(user.address || "");
    setEditStaffMunicipality(user.municipality || "");
    setEditStaffPostalCode(user.postalCode || "");
    setEditStaffAdditionalData(user.additionalData || "");
    setEditStaffColor(user.color || "#3b82f6");
    setEditStaffShowInAgenda(user.showInAgenda !== false);
    setEditStaffSaveStatus("idle");
    setOpenDropdown(null);
    try {
      setEditStaffPermissions(user.permissionsJson ? JSON.parse(user.permissionsJson) : {});
    } catch {
      setEditStaffPermissions({});
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    setEditStaffSaveStatus("saving");
    try {
      const res = await fetch(`/api/users/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissionsJson: JSON.stringify(editStaffPermissions)
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        // Update in local staff list without a full re-fetch
        setStaff(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        setSelectedEmployee(prev => prev ? { ...prev, ...updatedUser } : prev);
        setEditStaffSaveStatus("saved");
        setTimeout(() => setEditStaffSaveStatus("idle"), 2500);
      } else {
        setEditStaffSaveStatus("error");
        setTimeout(() => setEditStaffSaveStatus("idle"), 3000);
      }
    } catch (err) {
      console.error("Error saving permissions:", err);
      setEditStaffSaveStatus("error");
      setTimeout(() => setEditStaffSaveStatus("idle"), 3000);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!editStaffName.trim()) return;

    setEditStaffSaveStatus("saving");
    try {
      const res = await fetch(`/api/users/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editStaffName.trim(),
          lastName: editStaffLastName.trim(),
          email: editStaffEmail.trim(),
          dniNif: editStaffDniNif.trim(),
          phone: editStaffPhone.trim(),
          address: editStaffAddress.trim(),
          municipality: editStaffMunicipality.trim(),
          postalCode: editStaffPostalCode.trim(),
          additionalData: editStaffAdditionalData.trim(),
          color: editStaffColor,
          showInAgenda: editStaffShowInAgenda
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        // Update in local staff list without a full re-fetch
        setStaff(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        setSelectedEmployee(prev => prev ? { ...prev, ...updatedUser } : prev);
        setEditStaffSaveStatus("saved");
        setTimeout(() => setEditStaffSaveStatus("idle"), 2500);
      } else {
        const err = await res.json();
        console.error("Error updating employee:", err);
        setEditStaffSaveStatus("error");
        setTimeout(() => setEditStaffSaveStatus("idle"), 3000);
      }
    } catch (err) {
      console.error(err);
      setEditStaffSaveStatus("error");
      setTimeout(() => setEditStaffSaveStatus("idle"), 3000);
    }
  };

  // Shift management handlers
  const handleDeleteShift = async (userId: string, dayOfWeek: number) => {
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          clinicId: activeClinic?.id,
          dayOfWeek,
          mode: "delete",
        }),
      });
      if (res.ok) {
        fetchData();
        setActiveCellMenu(null);
      } else {
        alert("Error al eliminar el turno.");
      }
    } catch (err) {
      console.error("Error deleting shift:", err);
    }
  };

  const handleSaveSingleShift = async () => {
    if (!activeShiftUser || activeShiftDay === null) return;
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeShiftUser.id,
          clinicId: activeClinic?.id,
          dayOfWeek: activeShiftDay,
          startTime: singleShiftStartTime,
          endTime: singleShiftEndTime,
          startDate: singleShiftStartDate || null,
          endDate: singleShiftEndDate || null,
          mode: "single",
        }),
      });
      if (res.ok) {
        fetchData();
        setShiftEditMode(null);
        setActiveShiftUser(null);
        setActiveShiftDay(null);
      } else {
        alert("Error al guardar el turno.");
      }
    } catch (err) {
      console.error("Error saving single shift:", err);
    }
  };

  const handleSaveBulkShifts = async () => {
    if (!activeShiftUser) return;
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeShiftUser.id,
          clinicId: activeClinic?.id,
          startDate: bulkShiftStartDate || null,
          endDate: bulkShiftEndDate || null,
          shifts: bulkDaysConfig,
          mode: "bulk",
        }),
      });
      if (res.ok) {
        fetchData();
        setShiftEditMode(null);
        setActiveShiftUser(null);
      } else {
        alert("Error al guardar los turnos.");
      }
    } catch (err) {
      console.error("Error saving bulk shifts:", err);
    }
  };

  const handlePrevWeek = () => {
    setScheduleWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setScheduleWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const getWeekDays = () => {
    const days = [];
    const labels = ["Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb.", "Dom."];
    for (let i = 0; i < 7; i++) {
      const d = new Date(scheduleWeekStart);
      d.setDate(scheduleWeekStart.getDate() + i);
      days.push({
        date: d,
        dayOfWeek: i === 6 ? 0 : i + 1, // Monday=1, ..., Saturday=6, Sunday=0
        label: `${labels[i]} ${d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}`
      });
    }
    return days;
  };

  const getWeekRangeLabel = () => {
    const end = new Date(scheduleWeekStart);
    end.setDate(scheduleWeekStart.getDate() + 6);
    
    const formatDate = (d: Date) => {
      return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    };
    
    return `${formatDate(scheduleWeekStart)} - ${formatDate(end)}`;
  };

  const getUserShiftForDay = (user: User, dayOfWeek: number) => {
    return user.shifts?.find(
      (s) => s.dayOfWeek === dayOfWeek && (!s.clinicId || s.clinicId === activeClinic?.id)
    );
  };

  const generateTimeOptionsList = () => {
    const options = [];
    for (let hour = 7; hour <= 22; hour++) {
      for (let min = 0; min < 60; min += 30) {
        if (hour === 22 && min > 0) break;
        const hStr = String(hour).padStart(2, "0");
        const mStr = String(min).padStart(2, "0");
        options.push(`${hStr}:${mStr}`);
      }
    }
    return options;
  };
  const timeOptionsList = generateTimeOptionsList();

  const getDayNameSpanish = (dayNum: number | null) => {
    if (dayNum === null) return "";
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return days[dayNum];
  };

  // Insert Variable into cursor in template editor
  const handleInsertVariable = (variable: string) => {
    let html = "";
    if (variable === "{{client.firstName}}" || variable === "{{Cliente:Nombre}}") {
      html = '<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Nombre]</span>';
    } else if (variable === "{{client.lastName}}" || variable === "{{Cliente:Apellidos}}") {
      html = '<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Apellidos]</span>';
    } else if (variable === "{{Cliente:Dirección_Cliente}}") {
      html = '<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Direccion_cliente]</span>';
    } else if (variable === "{{client.dniNif}}" || variable === "{{Empleado_DNI}}") {
      html = '<span class="var-badge" style="border:1px solid #db2777; color:#db2777; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[NIF]</span>';
    } else if (variable === "{{client.birthDate}}") {
      html = '<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Fecha_nacimiento]</span>';
    } else if (variable === "{{client.allergies}}") {
      html = '<span class="var-badge" style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Alergias]</span>';
    } else if (variable === "{{clinic.name}}" || variable === "{{Nombre_Consulta}}") {
      html = '<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Nombre_clinica]</span>';
    } else if (variable === "{{clinic.municipality}}") {
      html = '<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Municipio_clinica]</span>';
    } else if (variable === "{{document.date}}") {
      html = '<span class="var-badge" style="background:#2563eb; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Fecha_documento]</span>';
    } else if (variable === "{{signature.client}}") {
      html = '<span class="var-badge var-signature" data-type="ordinary" style="background:#eab308; color:black; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_ordinaria]</span>';
    } else if (variable === "{{signature.certified}}") {
      html = '<span class="var-badge var-signature" data-type="certified" style="background:#ca8a04; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_certificada]</span>';
    } else if (variable === "{{signature.digital}}") {
      html = '<span class="var-badge var-signature" data-type="digital" style="background:#06b6d4; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_digital]</span>';
    } else if (variable === "{{Dirección_Consulta}}") {
      html = '<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Direccion_consulta]</span>';
    } else if (variable === "{{Fecha_Hora_Cita}}") {
      html = '<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Fecha_hora_cita]</span>';
    } else if (variable === "{{Fecha_larga}}") {
      html = '<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Fecha_larga]</span>';
    } else if (variable === "{{Hora_Cita}}") {
      html = '<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Hora_cita]</span>';
    } else if (variable === "{{Nombre_Servicio}}") {
      html = '<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Nombre_servicio]</span>';
    } else if (variable === "{{Link_VideoConsulta}}") {
      html = '<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Link_videoconsulta]</span>';
    } else if (variable === "{{Link_Cancelar_Cita}}") {
      html = '<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Link_cancelar_cita]</span>';
    } else if (variable === "{{Link_Mover_Cita}}") {
      html = '<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Link_mover_cita]</span>';
    } else if (variable === "{{Link_Confirmar_Cita}}") {
      html = '<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Link_confirmar_cita]</span>';
    } else if (variable === "{{Link_Pago_Online}}") {
      html = '<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Link_pago_online]</span>';
    } else if (variable === "{{Recurso}}") {
      html = '<span class="var-badge" style="background:#8b5cf6; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Recurso]</span>';
    } else if (variable === "{{Zona_horaria}}") {
      html = '<span class="var-badge" style="background:#8b5cf6; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Zona_horaria]</span>';
    } else if (variable === "{{Empleado_Nombre_Completo}}") {
      html = '<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Empleado_nombre_completo]</span>';
    } else if (variable === "{{Empleado_Nombre}}") {
      html = '<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Empleado_nombre]</span>';
    } else if (variable === "{{Empleado_Apellidos}}") {
      html = '<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Empleado_apellidos]</span>';
    } else if (variable === "{{Empleado_Correo}}") {
      html = '<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Empleado_correo]</span>';
    } else if (variable === "{{Empleado_Teléfono}}") {
      html = '<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Empleado_telefono]</span>';
    } else if (variable === "{{Deuda}}") {
      html = '<span class="var-badge" style="background:#f43f5e; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Deuda]</span>';
    } else {
      html = variable;
    }
    insertHTMLAtCursor(html);
  };

  const insertHTMLAtCursor = (html: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    const container = editorRef.current;
    if (!container) return;

    // Focus editor if selection is outside
    if (!container.contains(selection.anchorNode)) {
      container.focus();
    }

    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const el = document.createElement("div");
    el.innerHTML = html;

    const fragment = document.createDocumentFragment();
    let node;
    while ((node = el.firstChild)) {
      fragment.appendChild(node);
    }

    range.insertNode(fragment);
    
    // Position cursor after inserted node
    const lastNode = fragment.lastChild || el;
    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    setTemplateContent(container.innerHTML);
  };

  const handleCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setTemplateContent(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setTemplateContent(editorRef.current.innerHTML);
    }
  };

  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplateId(t.id);
    setTemplateName(t.name);
    setTemplateContent(t.content);
    setShowHtmlModal(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = t.content;
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplateId("");
    setTemplateName("");
    setTemplateContent("");
    setShowHtmlModal(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: templateName,
      content: templateContent,
    };

    let url = "/api/documents/templates";
    let method = "POST";

    if (selectedTemplateId) {
      url = `/api/documents/templates/${selectedTemplateId}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fetchData(); // reload list
      if (!selectedTemplateId) {
        handleClearTemplate();
      }
      alert(selectedTemplateId ? "Plantilla actualizada correctamente." : "Plantilla creada correctamente.");
    } else {
      alert("Error al guardar la plantilla.");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta plantilla?")) return;

    const res = await fetch(`/api/documents/templates/${selectedTemplateId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      handleClearTemplate();
      fetchData();
      alert("Plantilla eliminada correctamente.");
    } else {
      alert("Error al eliminar la plantilla.");
    }
  };

  // Config Google Sync
  const handleConfigSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncMail) return;
    setGSyncConfigured(true);
    alert(`Google Calendar sincronizado correctamente con ${syncMail}`);
  };

  return (
    <>
      <React.Suspense fallback={null}>
        <SettingsTabNavigator setActiveTab={setActiveTab} />
      </React.Suspense>
      <div className={styles.container}>
      {/* Header */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.title}>Configuración</h1>
          <span className={styles.clinicSubtitle}>{activeClinic?.name}</span>
        </div>
      </header>

      {/* Premium Settings Split Layout */}
      <div className={styles.settingsLayout}>
        {/* Left Column: Sidebar Settings Menu */}
        <div className={styles.settingsSidebar}>
          {/* Group 1: Mi Consulta */}
          <div className={styles.sidebarGroup}>
            <span className={styles.sidebarGroupTitle}>Mi Consulta</span>
            {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "configuracion", "Ver configuración")) && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "clinic" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("clinic")}
              >
                <Icons.Info size={16} />
                <span>Información General</span>
              </button>
            )}
            {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "configuracion", "Configurar servicios")) && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "services" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("services")}
              >
                <Icons.CalendarClock size={16} />
                <span>Servicios Clínicos</span>
              </button>
            )}
            {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "configuracion", "Configurar notificaciones")) && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "notifications" ? styles.sidebarItemActive : ""}`}
                onClick={() => { 
                  setActiveTab("notifications"); 
                  fetchReminders();
                  fetchNotificationLogs();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "2px" }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <span>Notificaciones</span>
              </button>
            )}
          </div>

          {/* Group 2: Personal y Gestión */}
          <div className={styles.sidebarGroup}>
            <span className={styles.sidebarGroupTitle}>Personal y Gestión</span>
            {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "configuracion", "Editar su propio horario")) && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "users" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("users")}
              >
                <Icons.Users size={16} />
                <span>Usuarios y Horarios</span>
              </button>
            )}
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "liquidaciones" ? styles.sidebarItemActive : ""}`}
                onClick={() => { 
                  setActiveTab("liquidaciones");
                  fetchLiquidations();
                }}
              >
                <Icons.DollarCircle size={16} />
                <span>Liquidaciones y Comisiones</span>
              </button>
            )}
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "bonos" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("bonos")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path><path d="M12 5v14"></path></svg>
                <span>Bonos</span>
              </button>
            )}
          </div>

          {/* Group 3: Facturación */}
          <div className={styles.sidebarGroup}>
            <span className={styles.sidebarGroupTitle}>Facturación</span>
            {(currentUser?.role === "ADMIN") && (
              <button
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "datosFiscales" ? styles.sidebarItemActive : ""}`}
                onClick={() => {
                  setActiveTab("datosFiscales");
                  if (activeClinic?.id) {
                    fetch(`/api/fiscal-profiles?clinicId=${activeClinic.id}`)
                      .then(r => r.json())
                      .then(data => {
                        const arr = Array.isArray(data) ? data : [];
                        setFiscalProfiles(arr);
                        if (arr.length > 0) setSelectedFiscalProfile(arr[0]);
                        else setSelectedFiscalProfile(null);
                      })
                      .catch(console.error);
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <span>Datos Fiscales</span>
              </button>
            )}
          </div>

          {/* Group 4: Configuración Clínica */}
          <div className={styles.sidebarGroup}>
            <span className={styles.sidebarGroupTitle}>Configuración Clínica</span>
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "formularios" ? styles.sidebarItemActive : ""}`}
                onClick={() => { setActiveTab("formularios"); }}
              >
                <Icons.FileText size={16} />
                <span>Formularios Personalizados</span>
              </button>
            )}
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "documents" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("documents")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>Plantillas Documentos</span>
              </button>
            )}
          </div>

          {/* Group 4: Herramientas y Sistema */}
          <div className={styles.sidebarGroup}>
            <span className={styles.sidebarGroupTitle}>Herramientas y Sistema</span>
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "inventario" ? styles.sidebarItemActive : ""}`}
                onClick={() => { 
                  setActiveTab("inventario"); 
                  fetchProducts();
                  fetchProductTransactions();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <span>Almacén e Inventario</span>
              </button>
            )}
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "sync" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("sync")}
              >
                <Icons.Sync size={16} />
                <span>Sincronizar Google</span>
              </button>
            )}
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "import" ? styles.sidebarItemActive : ""}`}
                onClick={() => setActiveTab("import")}
              >
                <Icons.Download size={16} />
                <span>Importar Contactos</span>
              </button>
            )}
            {currentUser?.role === "ADMIN" && (
              <button 
                type="button"
                className={`${styles.sidebarItem} ${activeTab === "papelera" ? styles.sidebarItemActive : ""}`}
                onClick={() => {
                  setActiveTab("papelera");
                  if (activeClinic?.id) {
                    setLoadingPapelera(true);
                    Promise.all([
                      fetch(`/api/papelera/citas?clinicId=${activeClinic.id}`).then(r => r.json()),
                      fetch(`/api/papelera/clientes?clinicId=${activeClinic.id}`).then(r => r.json()),
                      fetch(`/api/papelera/presupuestos?clinicId=${activeClinic.id}`).then(r => r.json()),
                    ]).then(([citas, clientes, presupuestos]) => {
                      setPapeleraCitas(Array.isArray(citas) ? citas : []);
                      setPapeleraClientes(Array.isArray(clientes) ? clientes : []);
                      setPapeleraPresupuestos(Array.isArray(presupuestos) ? presupuestos : []);
                    }).catch(console.error).finally(() => setLoadingPapelera(false));
                  }
                }}
              >
                <Icons.Trash size={16} />
                <span>Papelera</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Active Tab Content Canvas */}
        <div className={`${styles.contentCanvas} ${styles.settingsContent} glass`}>
        {/* TAB 1: Clinic Profile */}
        {activeTab === "clinic" && (
          <form onSubmit={handleUpdateClinic} className={styles.formLayout}>
            <h3>Editar Datos de Consulta</h3>
            
            <div className="form-group">
              <label className="form-label">Nombre del Centro Clínico *</label>
              <input
                type="text"
                className="input"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dirección Completa *</label>
              <input
                type="text"
                className="input"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Teléfono de Atención</label>
                <input
                  type="text"
                  className="input"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Email Corporativo</label>
                <input
                  type="email"
                  className="input"
                  value={clinicEmail}
                  onChange={(e) => setClinicEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Simular Logotipo (Base64 o URL)</label>
              <input
                type="text"
                className="input"
                placeholder="Introducir ruta de logotipo..."
                value={clinicLogo}
                onChange={(e) => setClinicLogo(e.target.value)}
              />
            </div>

            <div style={{ marginTop: "24px", padding: "16px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700 }}>Opciones Avanzadas de la Consulta</h4>
              <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "12px" }}>Habilita o deshabilita funcionalidades avanzadas del sistema.</p>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>⏰ Activar Control Horario</span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Permite a los profesionales fichar su jornada y pausas diarias.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <label style={{ display: "inline-block", position: "relative", width: "44px", height: "24px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={clinicControlHorarioActivo}
                      onChange={(e) => setClinicControlHorarioActivo(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute", inset: 0, borderRadius: "24px", transition: "all 0.2s",
                      backgroundColor: clinicControlHorarioActivo ? "var(--primary)" : "var(--border-color)"
                    }}>
                      <span style={{
                        position: "absolute", height: "18px", width: "18px", left: "3px", bottom: "3px",
                        backgroundColor: "#fff", borderRadius: "50%", transition: "all 0.2s",
                        transform: clinicControlHorarioActivo ? "translateX(20px)" : "translateX(0)"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>


            <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>
              Guardar Cambios
            </button>
          </form>
        )}

        {/* TAB 2: Services list and creation */}
        {activeTab === "services" && (
          <div className={styles.servicesTabContainer}>
            {/* Sidebar with categories on the left */}
            <div className={styles.categorySidebar}>
              <div className={styles.categorySidebarTitle}>Categorías</div>
              {categoriesList.map((catName) => (
                <div
                  key={catName}
                  className={`${styles.categoryItem} ${selectedCategory === catName ? styles.categoryItemActive : ""}`}
                  onClick={() => {
                    setSelectedCategory(catName);
                    setShowServiceForm(false);
                  }}
                >
                  {catName}
                </div>
              ))}
            </div>

            {/* Right Pane: list of services OR form */}
            <div style={{ flex: 1 }}>
              {!showServiceForm ? (
                <>
                  <div className={styles.servicesHeaderRow}>
                    <h3>{selectedCategory}</h3>
                    <button
                      type="button"
                      className={styles.btnCrearServicio}
                      onClick={handleNewServiceClick}
                    >
                      <Icons.Plus size={16} />
                      <span>Crear servicios</span>
                    </button>
                  </div>

                  <div className={styles.servicesGrid}>
                    {filteredServices.length === 0 ? (
                      <div style={{ padding: "32px 0", color: "var(--text-muted)", textAlign: "center", fontStyle: "italic" }}>
                        No hay servicios registrados en esta categoría.
                      </div>
                    ) : (
                      filteredServices.map((s) => (
                        <div
                          key={s.id}
                          className={styles.serviceItem}
                          style={{ borderLeftColor: s.color, cursor: "pointer" }}
                          onClick={() => handleEditServiceClick(s)}
                          title="Clic para editar servicio"
                        >
                          <div className={styles.serviceMeta}>
                            <span className={styles.serviceName}>{s.name}</span>
                            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                              <span className={styles.serviceCategory} style={{ background: "var(--bg-input)", padding: "1px 6px", borderRadius: "4px" }}>
                                {s.category || "No categorizado"}
                              </span>
                              <span className={styles.serviceCategory} style={{ color: "var(--primary)", fontWeight: 600 }}>
                                {s.type || "Presencial"}
                              </span>
                            </div>
                          </div>
                          <div className={styles.serviceMath}>
                            <span>{s.duration} min</span>
                            <strong>{s.price.toFixed(2)}€</strong>
                            {s.tax !== undefined && s.tax > 0 && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                (Total con {s.tax}% IVA: {s.total ? s.total.toFixed(2) : s.price}€)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveService}>
                  <div className={styles.servicesHeaderRow}>
                    <h3>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</h3>
                    <div style={{ display: "flex", gap: "12px" }}>
                      {editingService && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ backgroundColor: "var(--danger)", color: "white" }}
                          onClick={handleDeleteService}
                        >
                          Eliminar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowServiceForm(false);
                          setEditingService(null);
                        }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--success)" }}>
                        Guardar
                      </button>
                    </div>
                  </div>

                  {/* Tabs header */}
                  <div className={styles.formTabsContainer}>
                    <button
                      type="button"
                      className={`${styles.formTabBtn} ${formActiveTab === "general" ? styles.formTabBtnActive : ""}`}
                      onClick={() => setFormActiveTab("general")}
                    >
                      Datos Generales
                    </button>
                    <button
                      type="button"
                      className={`${styles.formTabBtn} ${formActiveTab === "users" ? styles.formTabBtnActive : ""}`}
                      onClick={() => setFormActiveTab("users")}
                    >
                      Usuarios
                    </button>
                    <button
                      type="button"
                      className={`${styles.formTabBtn} ${formActiveTab === "resources" ? styles.formTabBtnActive : ""}`}
                      onClick={() => setFormActiveTab("resources")}
                    >
                      Recursos
                    </button>
                    <button
                      type="button"
                      className={`${styles.formTabBtn} ${formActiveTab === "advanced" ? styles.formTabBtnActive : ""}`}
                      onClick={() => setFormActiveTab("advanced")}
                    >
                      Opciones Avanzadas
                    </button>
                    {editingService && (
                      <button
                        type="button"
                        className={`${styles.formTabBtn} ${formActiveTab === "consumibles" ? styles.formTabBtnActive : ""}`}
                        onClick={() => {
                          setFormActiveTab("consumibles");
                          fetchServiceConsumibles(editingService.id);
                        }}
                      >
                        Consumo de Material
                      </button>
                    )}

                  </div>

                  {/* Tab Panel contents */}
                  <div className={styles.formTabContent}>
                    {formActiveTab === "general" && (
                      <div className={styles.generalFormGrid}>
                        <div className="form-group" style={{ gridColumn: "span 2" }}>
                          <label className="form-label">Nombre del servicio *</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="¿Cuál es el nombre del servicio?"
                            value={serviceFormName}
                            onChange={(e) => setServiceFormName(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Tipo del servicio</label>
                          <select
                            className="input select"
                            value={serviceFormType}
                            onChange={(e) => setServiceFormType(e.target.value)}
                          >
                            <option value="Presencial">Presencial</option>
                            <option value="Videollamada">Videollamada</option>
                            <option value="A Domicilio">A Domicilio</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ display: "flex", alignItems: "center" }}>
                          <div className={styles.switchContainer}>
                            <label className={styles.assignClientsLabel} style={{ cursor: "pointer" }}>
                              <div
                                style={{
                                  width: "36px",
                                  height: "20px",
                                  backgroundColor: serviceFormIsGroup ? "var(--primary)" : "var(--border-color)",
                                  borderRadius: "10px",
                                  position: "relative",
                                  cursor: "pointer",
                                  transition: "background 0.2s"
                                }}
                                onClick={() => setServiceFormIsGroup(!serviceFormIsGroup)}
                              >
                                <div
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    backgroundColor: "white",
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "2px",
                                    left: serviceFormIsGroup ? "18px" : "2px",
                                    transition: "left 0.2s"
                                  }}
                                />
                              </div>
                              <span className={styles.switchLabelText}>Servicio Grupal</span>
                            </label>
                          </div>
                        </div>

                        <div className="form-group" style={{ gridColumn: "span 2" }}>
                          <label className="form-label">Duración</label>
                          <div style={{ display: "flex", gap: "16px" }}>
                            <select
                              className="input select"
                              style={{ flex: 1 }}
                              value={serviceFormHours}
                              onChange={(e) => setServiceFormHours(parseInt(e.target.value))}
                            >
                              {Array.from({ length: 9 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i} {i === 1 ? "hora" : "horas"}
                                </option>
                              ))}
                            </select>
                            <select
                              className="input select"
                              style={{ flex: 1 }}
                              value={serviceFormMinutes}
                              onChange={(e) => setServiceFormMinutes(parseInt(e.target.value))}
                            >
                              {Array.from({ length: 12 }, (_, i) => i * 5).map((min) => (
                                <option key={min} value={min}>
                                  {String(min).padStart(2, "0")} minutos
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ gridColumn: "span 2" }}>
                          <div className={styles.priceTaxTotalRow}>
                            <div>
                              <label className="form-label">Precio (€) *</label>
                              <div style={{ position: "relative" }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="input"
                                  placeholder="Precio €"
                                  value={serviceFormPrice}
                                  onChange={(e) => setServiceFormPrice(e.target.value)}
                                  required
                                  style={{ paddingRight: "30px" }}
                                />
                                <span style={{ position: "absolute", right: "12px", top: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>€</span>
                              </div>
                            </div>
                            <div>
                              <label className="form-label">IVA (%)</label>
                              <div style={{ position: "relative" }}>
                                <input
                                  type="number"
                                  step="1"
                                  className="input"
                                  placeholder="0"
                                  value={serviceFormTax}
                                  onChange={(e) => setServiceFormTax(e.target.value)}
                                  style={{ paddingRight: "30px" }}
                                />
                                <span style={{ position: "absolute", right: "12px", top: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>%</span>
                              </div>
                            </div>
                            <div>
                              <label className="form-label">Total (€)</label>
                              <div style={{ position: "relative" }}>
                                <input
                                  type="text"
                                  className={`input ${styles.totalInputDisabled}`}
                                  value={serviceFormTotal}
                                  readOnly
                                  style={{ paddingRight: "30px" }}
                                />
                                <span style={{ position: "absolute", right: "12px", top: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>€</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {formActiveTab === "users" && (
                      <div className={styles.treeContainer}>
                        <div className={styles.clinicNode}>
                          <div className={styles.clinicNodeHeader}>
                            <Icons.ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
                            <span>{activeClinic?.name}</span>
                          </div>
                          <div className={styles.medicsList}>
                            {staff.map((m) => {
                              const isChecked = serviceFormAllowedUserIds.includes(m.id);
                              return (
                                <label key={m.id} className={styles.medicNode}>
                                  <input
                                    type="checkbox"
                                    className={styles.medicCheckbox}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setServiceFormAllowedUserIds([...serviceFormAllowedUserIds, m.id]);
                                      } else {
                                        setServiceFormAllowedUserIds(
                                          serviceFormAllowedUserIds.filter((id) => id !== m.id)
                                        );
                                      }
                                    }}
                                  />
                                  <span className={styles.medicNameText}>
                                    {m.name} {m.lastName || ""}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {formActiveTab === "resources" && (
                      <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-input)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                        No hay recursos asignables para este servicio.
                      </div>
                    )}

                    {formActiveTab === "advanced" && (
                      <div className={styles.generalFormGrid}>
                        <div className="form-group" style={{ gridColumn: "span 2" }}>
                          <label className="form-label" style={{ display: "block", marginBottom: "8px" }}>Asignar Color</label>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            {["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#34d399", "#a855f7"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                className={`${styles.colorDotBtn} ${serviceFormColor === c ? styles.colorDotBtnActive : ""}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setServiceFormColor(c)}
                              />
                            ))}
                            {/* Native picker fallback */}
                            <input
                              type="color"
                              style={{ width: "24px", height: "24px", padding: 0, border: "none", borderRadius: "50%", cursor: "pointer", display: "inline-block" }}
                              value={serviceFormColor}
                              onChange={(e) => setServiceFormColor(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ gridColumn: "span 2" }}>
                          <label className="form-label">Categoría de servicio</label>
                          <select
                            className="input select"
                            value={serviceFormCategory}
                            onChange={(e) => setServiceFormCategory(e.target.value)}
                          >
                            <option value="">Seleccionar categoría...</option>
                            {categoriesList
                              .filter((c) => c !== "Todas las categorías" && c !== "No categorizado")
                              .map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            className={styles.btnNewCategory}
                            onClick={() => setShowNewCategoryPopup(true)}
                          >
                            + Nueva categoría
                          </button>
                        </div>
                      </div>
                    )}

                    {formActiveTab === "consumibles" && editingService && (
                      <div style={{ padding: "16px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Materiales consumidos por sesión</h4>
                          {!showAddConsumibleToService && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setShowAddConsumibleToService(true);
                                setSelectedConsumibleId("");
                                setSelectedConsumibleQty("1");
                              }}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              + Añadir Material
                            </button>
                          )}
                        </div>

                        {/* Formulario Añadir Consumible */}
                        {showAddConsumibleToService && (
                          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                            <h5 style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700 }}>Asociar material al servicio</h5>
                            <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                              <div className="form-group" style={{ flex: 2, margin: 0 }}>
                                <label className="form-label" style={{ fontSize: "11px", fontWeight: 600 }}>Seleccionar Insumo *</label>
                                <select
                                  className="input select"
                                  value={selectedConsumibleId}
                                  onChange={(e) => setSelectedConsumibleId(e.target.value)}
                                  style={{ width: "100%", background: "var(--bg-panel-solid)" }}
                                >
                                  <option value="">-- Elige un producto --</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {p.sku ? `(${p.sku})` : ""} - Stock: {p.stock}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                <label className="form-label" style={{ fontSize: "11px", fontWeight: 600 }}>Cantidad a usar *</label>
                                <input
                                  type="number"
                                  className="input"
                                  placeholder="1"
                                  value={selectedConsumibleQty}
                                  onChange={(e) => setSelectedConsumibleQty(e.target.value)}
                                  style={{ width: "100%", background: "var(--bg-panel-solid)" }}
                                />
                              </div>

                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => setShowAddConsumibleToService(false)}
                                  style={{ padding: "8px 12px", fontSize: "12px" }}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={handleAddConsumibleToService}
                                  style={{ padding: "8px 16px", fontSize: "12px" }}
                                >
                                  Vincular
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Listado de Consumibles */}
                        {serviceConsumibles.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "32px", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "13px" }}>
                            No hay materiales asociados a este servicio. Las sesiones no descontarán stock del almacén.
                          </div>
                        ) : (
                          <div className="table-container">
                            <table className="table" style={{ fontSize: "12px", width: "100%" }}>
                              <thead>
                                <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                                  <th style={{ padding: "10px" }}>Material / Consumible</th>
                                  <th style={{ padding: "10px" }}>SKU</th>
                                  <th style={{ padding: "10px", textAlign: "center" }}>Cantidad por sesión</th>
                                  <th style={{ padding: "10px", textAlign: "right" }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {serviceConsumibles.map((sc) => (
                                  <tr key={sc.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "10px" }}><strong>{sc.product?.name}</strong></td>
                                    <td style={{ padding: "10px" }}><code>{sc.product?.sku || "N/A"}</code></td>
                                    <td style={{ padding: "10px", textAlign: "center", fontWeight: 600 }}>{sc.quantity} uds</td>
                                    <td style={{ padding: "10px", textAlign: "right" }}>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteConsumibleFromService(sc.productId)}
                                        style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                      >
                                        Desvincular
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Staff & User management */}
        {activeTab === "users" && (
          <div>
            {/* Sub-tabs header (Image 1) */}
            <div className={styles.subTabsContainer}>
              {currentUser?.role === "ADMIN" && (
                <button
                  type="button"
                  className={`${styles.subTabBtn} ${usersSubTab === "equipo" ? styles.subTabBtnActive : ""}`}
                  onClick={() => setUsersSubTab("equipo")}
                >
                  Equipo
                </button>
              )}
              <button
                type="button"
                className={`${styles.subTabBtn} ${usersSubTab === "horario" ? styles.subTabBtnActive : ""}`}
                onClick={() => setUsersSubTab("horario")}
              >
                Horario
              </button>
            </div>

            {/* Sub-tab content: Equipo */}
            {usersSubTab === "equipo" && (
              <div className={styles.equipoLayout}>
                {/* Crear empleado button */}
                <button
                  type="button"
                  className={styles.crearEmpleadoBtn}
                  onClick={() => {
                    setCreateStaffActiveTab("generales");
                    setNewStaffClinics(activeClinic ? [activeClinic.id] : []);
                    setNewStaffPermissions({
                      agenda: ["Sus agendas"],
                      clientes: ["Ver clientes", "Ver datos personales"],
                      configuracion: [],
                      contabilidad: [],
                      estadisticas: [],
                      otros: []
                    });
                    setShowCreateStaffDrawer(true);
                  }}
                >
                  <Icons.Plus size={16} />
                  <span>Crear empleado</span>
                </button>

                {/* Buscar empleado input */}
                <div className={styles.buscarEmpleadoWrapper}>
                  <Icons.Search size={16} className={styles.buscarEmpleadoIcon} />
                  <input
                    type="text"
                    placeholder="Buscar empleado"
                    className={styles.buscarEmpleadoInput}
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                  />
                </div>

                {/* List of employees */}
                <div className={styles.employeeList}>
                  {staff
                    .filter((u) => {
                      const fullName = `${u.name} ${u.lastName || ""}`.toLowerCase();
                      return fullName.includes(staffSearchQuery.toLowerCase());
                    })
                    .map((u) => (
                      <div 
                        key={u.id} 
                        className={`${styles.employeeRow} ${selectedEmployee?.id === u.id ? styles.employeeRowActive : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleOpenEmployeeDrawer(u)}
                      >
                        <div className={styles.employeeLeft}>
                          {/* Drag handle dots */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, cursor: "grab", marginRight: "4px" }}>
                            <circle cx="9" cy="5" r="1" />
                            <circle cx="9" cy="12" r="1" />
                            <circle cx="9" cy="19" r="1" />
                            <circle cx="15" cy="5" r="1" />
                            <circle cx="15" cy="12" r="1" />
                            <circle cx="15" cy="19" r="1" />
                          </svg>

                          {/* Avatar circle */}
                          <div className={styles.employeeAvatar}>
                            {`${u.name} ${u.lastName || ""}`
                              .trim()
                              .split(/\s+/)
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>

                          {/* Name */}
                          <span className={styles.employeeName}>{u.name} {u.lastName || ""}</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Assign clients bottom switch */}
                <div className={styles.assignClientsSection}>
                  <label className={styles.assignClientsLabel}>
                    <div 
                      style={{ 
                        width: "36px", 
                        height: "20px", 
                        backgroundColor: assignClientsToCreator ? "var(--primary)" : "var(--border-color)", 
                        borderRadius: "10px", 
                        position: "relative", 
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onClick={() => setAssignClientsToCreator(!assignClientsToCreator)}
                    >
                      <div 
                        style={{ 
                          width: "16px", 
                          height: "16px", 
                          backgroundColor: "white", 
                          borderRadius: "50%", 
                          position: "absolute", 
                          top: "2px", 
                          left: assignClientsToCreator ? "18px" : "2px",
                          transition: "left 0.2s"
                        }}
                      />
                    </div>
                    <span>Asignar Clientes Al Creador</span>
                    <span style={{ display: "inline-block", width: "6px", height: "6px", backgroundColor: "#3b82f6", borderRadius: "50%" }}></span>
                  </label>
                </div>
              </div>
            )}

            {/* Sub-tab content: Horario */}
            {usersSubTab === "horario" && (
              <div className={styles.horarioLayout}>
                {/* Horario toolbar (Image 2) */}
                <div className={styles.horarioToolbar}>
                  <select 
                    className={styles.clinicSelect} 
                    value={activeClinic?.id || ""} 
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const clinicObj = currentUser?.clinics.find(c => c.id === selectedId);
                      if (clinicObj) {
                        setActiveClinic(clinicObj);
                      }
                    }}
                  >
                    {currentUser?.clinics?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <div className={styles.dateSelector}>
                    <button type="button" className={styles.dateSelectorBtn} onClick={handlePrevWeek}>
                      <Icons.ChevronLeft size={16} />
                    </button>
                    <span className={styles.dateRangeText}>{getWeekRangeLabel()}</span>
                    <button type="button" className={styles.dateSelectorBtn} onClick={handleNextWeek}>
                      <Icons.ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Grid table */}
                <div className={styles.horarioTableWrapper}>
                  <table className={styles.horarioTable}>
                    <thead>
                      <tr>
                        <th className={`${styles.horarioTh} ${styles.horarioThFirst}`}>Empleado</th>
                        {getWeekDays().map((day, dIdx) => (
                          <th key={dIdx} className={styles.horarioTh}>
                            {day.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.filter(u => currentUser?.role === "ADMIN" || u.id === currentUser?.id).map((u) => (
                        <tr key={u.id}>
                          {/* Employee cell */}
                          <td className={`${styles.horarioTd} ${styles.horarioTdFirst}`}>
                            <div className={styles.employeeCell}>
                              <div className={styles.employeeAvatar}>
                                {(u.name + " " + (u.lastName || ""))
                                  .trim()
                                  .split(" ")
                                  .map(n => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <span className={styles.employeeName}>{u.name} {u.lastName || ""}</span>
                            </div>
                          </td>

                          {/* Days cells */}
                          {getWeekDays().map((day, dIdx) => {
                            const shift = getUserShiftForDay(u, day.dayOfWeek);
                            const menuOpen = activeCellMenu?.userId === u.id && activeCellMenu?.dayOfWeek === day.dayOfWeek;
                            
                            return (
                              <td key={dIdx} className={styles.horarioTd} style={{ position: "relative" }}>
                                {shift ? (
                                  <button
                                    type="button"
                                    className={styles.shiftDropdownBtn}
                                    onClick={(e) => {
                                      if (menuOpen) {
                                        setActiveCellMenu(null);
                                        setCellMenuPosition(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setActiveCellMenu({ userId: u.id, dayOfWeek: day.dayOfWeek });
                                        setCellMenuPosition({
                                          top: rect.bottom + window.scrollY,
                                          left: rect.left + window.scrollX
                                        });
                                      }
                                    }}
                                  >
                                    <span>{shift.startTime} a {shift.endTime}</span>
                                    <Icons.ChevronDown size={12} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.addShiftBtn}
                                    onClick={() => {
                                      setActiveShiftUser(u);
                                      setActiveShiftDay(day.dayOfWeek);
                                      setShiftEditMode("single");
                                      
                                      const dayStr = day.date.toISOString().split("T")[0];
                                      setSingleShiftStartDate(dayStr);
                                      setSingleShiftEndDate(dayStr);
                                      setSingleShiftStartTime("08:00");
                                      setSingleShiftEndTime("20:00");
                                    }}
                                  >
                                    <Icons.Plus size={16} />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Google Calendar Sync panel */}
        {activeTab === "sync" && (
          <div className={styles.syncLayout}>
            <div className={styles.syncCard}>
              <Icons.Sync size={48} className={styles.syncCardIcon} />
              <h3>Sincronización con Google Calendar</h3>
              <p>
                Permite sincronizar las reservas en tiempo real. Cuando una cita sea registrada en Clifav,
                se publicará automáticamente en el Google Calendar asignado al especialista y viceversa.
              </p>

              {gSyncConfigured ? (
                <div className={styles.syncStatusSuccess}>
                  <Icons.Check size={20} />
                  <span>Sincronización Activa con <strong>{syncMail}</strong></span>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setGSyncConfigured(false)}
                    style={{ marginTop: "12px" }}
                  >
                    Desvincular Cuenta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfigSync} className={styles.syncSetupForm}>
                  <div className="form-group">
                    <label className="form-label">Correo de Google Workspace</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="ejemplo@gmail.com"
                      value={syncMail}
                      onChange={(e) => setSyncMail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Vincular y Sincronizar
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Custom Templates Editor with variable helper placeholders */}
        {activeTab === "documents" && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", alignItems: "start", width: "100%" }}>
            {/* Left Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-card)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleClearTemplate}
                style={{ width: "100%", justifyContent: "center", gap: "8px" }}
              >
                <Icons.Plus size={16} />
                <span>Crear documento</span>
              </button>

              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Buscar documento"
                  className="input"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  style={{ paddingLeft: "32px", fontSize: "13px", width: "100%" }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
                  🔍
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "400px", overflowY: "auto" }}>
                {templates
                  .filter(t => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()))
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "6px",
                        background: selectedTemplateId === t.id ? "var(--primary-light)" : "var(--bg-input)",
                        border: selectedTemplateId === t.id ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                        color: selectedTemplateId === t.id ? "var(--primary)" : "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                    >
                      📄 {t.name}
                    </div>
                  ))}
                {templates.filter(t => t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: "center", padding: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    No hay documentos
                  </div>
                )}
              </div>
            </div>

            {/* Right Workspace (Editor) */}
            <form onSubmit={handleCreateTemplate} style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid var(--border-color)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, border: "none", padding: 0 }}>
                  {selectedTemplateId ? "Editar Plantilla" : "Crear Plantilla"}
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  {selectedTemplateId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleDeleteTemplate}
                      style={{ color: "var(--danger)", borderColor: "var(--danger)", background: "transparent" }}
                    >
                      Eliminar
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ background: "#10b981", borderColor: "#10b981" }}>
                    Guardar
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: "12px" }}>Nombre del documento *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Consentimiento informado..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
              </div>

              {/* Toolbar */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px", borderRadius: "6px" }}>
                <button type="button" onClick={() => handleCommand('bold')} style={{ padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>B</button>
                <button type="button" onClick={() => handleCommand('italic')} style={{ padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", fontStyle: "italic", cursor: "pointer" }}>i</button>
                <button type="button" onClick={() => handleCommand('underline')} style={{ padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", textDecoration: "underline", cursor: "pointer" }}>U</button>
                <button type="button" onClick={() => {
                  const color = prompt("Color hexadecimal (ej: #ef4444):");
                  if (color) handleCommand('foreColor', color);
                }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>A🎨</button>
                
                <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                <button type="button" onClick={() => handleCommand('justifyLeft')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>Align L</button>
                <button type="button" onClick={() => handleCommand('justifyCenter')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>Align C</button>
                <button type="button" onClick={() => handleCommand('justifyRight')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>Align R</button>
                
                <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                <button type="button" onClick={() => {
                  const url = prompt("Introduce la URL del enlace:");
                  if (url) handleCommand('createLink', url);
                }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>🔗 Enlace</button>
                
                <button type="button" onClick={() => {
                  const url = prompt("Introduce la URL de la imagen:");
                  if (url) handleCommand('insertImage', url);
                }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>🖼️ Imagen</button>
                
                <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                <button type="button" onClick={() => handleCommand('undo')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>↩️</button>
                <button type="button" onClick={() => handleCommand('redo')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>↪️</button>
                
                <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                <button type="button" onClick={() => {
                  setHtmlModalContent(templateContent);
                  setShowHtmlModal(true);
                }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>&lt;/&gt;</span>
                  <span>HTML</span>
                </button>
                
                <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                {/* Variables Dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowVariablesDropdown(!showVariablesDropdown)}
                    style={{ padding: "6px 12px", background: "var(--primary)", color: "white", border: "none", borderRadius: "4px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Variables ▾
                  </button>
                  {showVariablesDropdown && (
                    <div style={{ 
                      position: "absolute", 
                      top: "100%", 
                      left: 0, 
                      background: "white", 
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
                      border: "1px solid #e2e8f0", 
                      borderRadius: "6px", 
                      width: "240px", 
                      zIndex: 10, 
                      maxHeight: "300px", 
                      overflowY: "auto", 
                      padding: "6px 0", 
                      marginTop: "4px" 
                    }}>
                      <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>PACIENTE</div>
                      <button type="button" onClick={() => { handleInsertVariable("{{client.firstName}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Paciente</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{client.lastName}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Apellidos Paciente</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Cliente:Dirección_Cliente}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Dirección Paciente</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{client.dniNif}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>NIF Paciente</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{client.birthDate}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>F. Nacimiento</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{client.allergies}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Alergias</button>

                      <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>CLÍNICA / CONSULTA</div>
                      <button type="button" onClick={() => { handleInsertVariable("{{clinic.name}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Clínica</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Dirección_Consulta}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Dirección Clínica</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{clinic.municipality}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Municipio Clínica</button>

                      <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>CITA</div>
                      <button type="button" onClick={() => { handleInsertVariable("{{Fecha_Hora_Cita}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Fecha/Hora Cita</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Fecha_larga}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Fecha Larga Cita</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Hora_Cita}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Hora Cita</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Nombre_Servicio}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Servicio</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Recurso}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Recurso/Cabina</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Zona_horaria}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Zona Horaria</button>

                      <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>LINKS</div>
                      <button type="button" onClick={() => { handleInsertVariable("{{Link_VideoConsulta}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Videoconsulta</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Link_Cancelar_Cita}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Cancelar Cita</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Link_Mover_Cita}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Mover Cita</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Link_Confirmar_Cita}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Confirmar Cita</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Link_Pago_Online}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Pago Online</button>

                      <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>EMPLEADO / TUTOR</div>
                      <button type="button" onClick={() => { handleInsertVariable("{{Empleado_Nombre_Completo}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Completo</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Empleado_Nombre}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Empleado</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Empleado_Apellidos}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Apellidos Empleado</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Empleado_Correo}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Correo Empleado</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{Empleado_Teléfono}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Teléfono Empleado</button>

                      <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>OTRO</div>
                      <button type="button" onClick={() => { handleInsertVariable("{{Deuda}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Deuda Pendiente</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{document.date}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Fecha Documento</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{signature.client}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", color: "var(--accent)", width: "100%" }}>Firma Paciente (Ordinary)</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{signature.certified}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", color: "var(--accent)", width: "100%" }}>Firma Médico (Certified)</button>
                      <button type="button" onClick={() => { handleInsertVariable("{{signature.digital}}"); setShowVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", color: "var(--accent)", width: "100%" }}>Firma Digital (Remote Link)</button>
                    </div>
                  )}
                </div>
              </div>

              {/* ContentEditable Sheet */}
              <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "12px" }}>Cuerpo de la Plantilla *</label>
                <div
                  ref={editorRef}
                  contentEditable={true}
                  onInput={handleEditorInput}
                  style={{
                    minHeight: "350px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "24px",
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: "#334155",
                    outline: "none",
                    background: "#ffffff",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                    overflowY: "auto",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Popup Modal for HTML Editor */}
              {showHtmlModal && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                  <div style={{ background: "white", borderRadius: "8px", width: "650px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, border: "none", padding: 0 }}>Editar Código HTML</h3>
                      <button type="button" onClick={() => setShowHtmlModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-secondary)" }}>✕</button>
                    </div>
                    <textarea
                      style={{ width: "100%", height: "350px", fontFamily: "monospace", fontSize: "13px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", resize: "vertical", boxSizing: "border-box" }}
                      value={htmlModalContent}
                      onChange={(e) => setHtmlModalContent(e.target.value)}
                      placeholder="Escribe o pega aquí tu código HTML..."
                    />
                    <div style={{ display: "flex", justifyContent: "end", gap: "10px" }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowHtmlModal(false)} style={{ fontSize: "13px" }}>Cancelar</button>
                      <button type="button" className="btn btn-primary" onClick={() => {
                        setTemplateContent(htmlModalContent);
                        if (editorRef.current) {
                          editorRef.current.innerHTML = htmlModalContent;
                        }
                        setShowHtmlModal(false);
                      }} style={{ fontSize: "13px" }}>Insertar</button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 6: Excel Import */}
        {activeTab === "import" && (
          <div className={styles.importContainer}>
            <div className={styles.importExplanation}>
              <Icons.FileText size={32} className={styles.importTitleIcon} />
              <div>
                <h3>Importar Contactos (Excel)</h3>
                <p style={{ marginTop: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>
                  Sube una hoja de cálculo en formato Excel (.xlsx, .xls) para importar masivamente tu base de datos de pacientes.
                  El sistema detectará y procesará las columnas del archivo de forma automática.
                </p>
              </div>
            </div>

            {/* Dropzone Area */}
            <div 
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icons.Sync size={36} className={styles.uploadCloudIcon} style={{ transform: "rotate(180deg)", color: "var(--primary)", marginBottom: "8px" }} />
              <p>Arrastra tu archivo Excel aquí, o <span style={{ color: "var(--primary)", textDecoration: "underline", fontWeight: "600", cursor: "pointer" }}>haz clic para examinar</span></p>
              <span className={styles.fileSupportLabel}>Formatos soportados: .xlsx, .xls</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className={styles.fileInputHidden}
                onChange={handleExcelUpload}
                style={{ display: "none" }}
              />
            </div>

            {/* Uploaded File Panel */}
            {excelFileName && (
              <div className={styles.fileSummaryCard}>
                <div className={styles.fileCardInfo}>
                  <Icons.Check size={20} className={styles.successColorIcon} />
                  <div>
                    <strong>{excelFileName}</strong>
                    <span>{excelData.length} contactos detectados para importar</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setExcelFileName("");
                    setExcelData([]);
                    setImportResult(null);
                  }}
                >
                  Quitar archivo
                </button>
              </div>
            )}

            {/* Import Status Alert */}
            {importing && (
              <div className={styles.importProgressWrapper}>
                <span>Procesando e insertando contactos en la base de datos...</span>
                <div className={styles.progressBarBg}>
                  <div className={styles.progressBarFill} style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            )}

            {/* Import Success / Error Result */}
            {importResult && (
              <div className={importResult.success ? styles.importSuccessBox : styles.importErrorBox}>
                <div className={styles.resultHeader}>
                  {importResult.success ? <Icons.Check size={24} /> : <Icons.Plus size={24} style={{ transform: "rotate(45deg)" }} />}
                  <h4>{importResult.success ? "¡Importación exitosa!" : "Error en la importación"}</h4>
                </div>
                <p>{importResult.message}</p>
              </div>
            )}

            {/* Data Preview Table */}
            {excelData.length > 0 && (
              <div className={styles.previewSection}>
                <h4>Vista previa (Primeros 5 registros)</h4>
                <div className={styles.previewTableWrapper}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Apellidos</th>
                        <th>DNI/NIF</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Ciudad</th>
                        <th>País</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.firstName || <span className={styles.emptyCellText}>--</span>}</td>
                          <td>{row.lastName || <span className={styles.emptyCellText}>--</span>}</td>
                          <td>{row.dniNif || <span className={styles.emptyCellText}>--</span>}</td>
                          <td>{row.email || <span className={styles.emptyCellText}>--</span>}</td>
                          <td>{row.phone || <span className={styles.emptyCellText}>--</span>}</td>
                          <td>{row.municipality || <span className={styles.emptyCellText}>--</span>}</td>
                          <td>{row.country || <span className={styles.emptyCellText}>--</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startImport}
                    disabled={importing}
                    style={{ marginTop: "16px", padding: "12px 24px" }}
                  >
                    {importing ? "Importando..." : `Importar ${excelData.length} contactos`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: Vouchers / Bonos management */}
        {activeTab === "bonos" && (
          <div className={styles.bonosTabContainer}>
            {/* Left Sidebar: Mis bonos */}
            <div className={styles.bonosSidebar}>
              <div className={styles.categorySidebarTitle}>Mis bonos</div>
              
              <div className={styles.bonosList}>
                {vouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className={`${styles.bonoItem} ${editingVoucher?.id === voucher.id ? styles.bonoItemActive : ""}`}
                    onClick={() => handleEditVoucherClick(voucher)}
                  >
                    <div className={styles.bonoItemMeta}>
                      <span className={styles.bonoItemName}>{voucher.name}</span>
                      <span className={styles.bonoItemSessions}>{voucher.sessions} sesiones</span>
                    </div>
                    <div className={styles.bonoItemPrice}>
                      {voucher.price.toFixed(2)}€
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                className={styles.btnCrearBono}
                onClick={handleNewVoucherClick}
              >
                <Icons.Plus size={16} />
                <span>Nuevo bono</span>
              </button>

              <div className={styles.defaultPaymentRow}>
                <div 
                  style={{ 
                    width: "36px", 
                    height: "20px", 
                    backgroundColor: useVoucherAsDefault ? "var(--primary)" : "var(--border-color)", 
                    borderRadius: "10px", 
                    position: "relative", 
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onClick={() => setUseVoucherAsDefault(!useVoucherAsDefault)}
                >
                  <div 
                    style={{ 
                      width: "16px", 
                      height: "16px", 
                      backgroundColor: "white", 
                      borderRadius: "50%", 
                      position: "absolute", 
                      top: "2px", 
                      left: useVoucherAsDefault ? "18px" : "2px",
                      transition: "left 0.2s"
                    }}
                  />
                </div>
                <span className={styles.defaultPaymentLabel}>Usar como pago predeterminado</span>
              </div>
            </div>

            {/* Right Pane: Form & Services */}
            <div style={{ flex: 1, display: "flex", gap: "24px" }}>
              {showVoucherForm ? (
                <form onSubmit={handleSaveVoucher} style={{ display: "flex", width: "100%", gap: "24px" }}>
                  {/* Form fields column */}
                  <div className={styles.bonoFormSection} style={{ flex: 1 }}>
                    <div className={styles.bonoFormHeader}>
                      <h3>{editingVoucher ? `Editar bono: ${editingVoucher.name}` : "Nuevo bono"}</h3>
                      <div className={styles.bonoFormActions}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowVoucherForm(false);
                            setEditingVoucher(null);
                          }}
                        >
                          Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ backgroundColor: "var(--success)" }}>
                          Guardar
                        </button>
                        {editingVoucher && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleDeleteVoucher(editingVoucher.id)}
                            style={{ marginLeft: "8px" }}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.bonoFormGrid}>
                      <div className="form-group">
                        <label className="form-label">Nombre de bono *</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ej: Bono 10 sesiones"
                          value={voucherFormName}
                          onChange={(e) => setVoucherFormName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Sesiones *</label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          placeholder="Número de sesiones"
                          value={voucherFormSessions}
                          onChange={(e) => setVoucherFormSessions(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Precio (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input"
                          placeholder="Precio"
                          value={voucherFormPrice}
                          onChange={(e) => setVoucherFormPrice(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">IVA (%)</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          placeholder="0"
                          value={voucherFormTax}
                          onChange={(e) => setVoucherFormTax(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ display: "flex", alignItems: "center", marginTop: "12px" }}>
                        <div 
                          style={{ 
                            width: "36px", 
                            height: "20px", 
                            backgroundColor: voucherFormHasExpiration ? "var(--primary)" : "var(--border-color)", 
                            borderRadius: "10px", 
                            position: "relative", 
                            cursor: "pointer",
                            transition: "background 0.2s",
                            marginRight: "10px"
                          }}
                          onClick={() => setVoucherFormHasExpiration(!voucherFormHasExpiration)}
                        >
                          <div 
                            style={{ 
                              width: "16px", 
                              height: "16px", 
                              backgroundColor: "white", 
                              borderRadius: "50%", 
                              position: "absolute", 
                              top: "2px", 
                              left: voucherFormHasExpiration ? "18px" : "2px",
                              transition: "left 0.2s"
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Caducidad</span>
                      </div>

                      {voucherFormHasExpiration && (
                        <div className="form-group" style={{ marginTop: "8px" }}>
                          <label className="form-label">Caduca en meses</label>
                          <input
                            type="number"
                            min="1"
                            className="input"
                            placeholder="Número de meses"
                            value={voucherFormExpirationMonths}
                            onChange={(e) => setVoucherFormExpirationMonths(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Services applicable checklist column */}
                  <div className={styles.bonoServicesSection}>
                    <div className={styles.servicesSidebarTitle} style={{ borderBottom: "1px dashed var(--border-color)", paddingBottom: "8px", marginBottom: "12px" }}>Servicios</div>
                    <p className={styles.servicesHelperText} style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>Selecciona los servicios en los que se puede canjear este bono:</p>
                    <div className={styles.servicesChecklist} style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
                      {services.map((service) => {
                        const isChecked = voucherFormServiceIds.includes(service.id);
                        return (
                          <label key={service.id} className={styles.serviceChecklistItem} style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer", padding: "8px", borderRadius: "6px", backgroundColor: "var(--bg-input)" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setVoucherFormServiceIds([...voucherFormServiceIds, service.id]);
                                } else {
                                  setVoucherFormServiceIds(voucherFormServiceIds.filter((id) => id !== service.id));
                                }
                              }}
                              style={{ width: "16px", height: "16px", accentColor: "var(--primary)", cursor: "pointer", marginTop: "2px" }}
                            />
                            <div className={styles.checklistServiceInfo} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span className={styles.checklistServiceName} style={{ fontSize: "13px", fontWeight: "600" }}>{service.name}</span>
                              <span className={styles.checklistServiceMeta} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{service.duration} min - {service.price.toFixed(2)}€</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </form>
              ) : (
                <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-secondary)", fontStyle: "italic", border: "1px dashed var(--border-color)", borderRadius: "8px", padding: "40px" }}>
                  Selecciona un bono de la lista para editarlo o pulsa en "Nuevo bono".
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Formularios Personalizados */}
        {activeTab === "formularios" && (
          <div className={styles.formsBuilderContainer}>
            {/* Left Column: Sub-options */}
            <div className={styles.formsBuilderLeft}>
              {(["seguimientos", "formularios", "pizarra"] as const).map((sub) => (
                <button
                  key={sub}
                  className={`${styles.formsBuilderSubBtn} ${formsPanelSub === sub ? styles.formsBuilderSubBtnActive : ""}`}
                  onClick={() => setFormsPanelSub(sub)}
                >
                  {sub.charAt(0).toUpperCase() + sub.slice(1)}
                </button>
              ))}
            </div>

            {/* Center Column: Form List */}
            <div className={styles.formsBuilderCenter}>
              {formsPanelSub === "seguimientos" && (
                <>
                  <button className={styles.createFormBtn} onClick={handleCreateEpisodeForm}>
                    Crear formulario de episodios
                  </button>
                  <div className={styles.formsList}>
                    {episodeForms.map(f => (
                      <div
                        key={f.id}
                        className={`${styles.formsListItem} ${selectedEpisodeForm?.id === f.id ? styles.formsListItemActive : ""}`}
                        onClick={() => selectEpisodeForm(f)}
                      >
                        {f.name}
                      </div>
                    ))}
                    {episodeForms.length === 0 && (
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", padding: "12px 0" }}>
                        Sin formularios. Crea uno.
                      </div>
                    )}
                  </div>
                </>
              )}

              {formsPanelSub === "formularios" && (
                <>
                  <button className={styles.createFormBtn} onClick={() => { setShowCreateClientFormDrawer(true); setNewClientFormDrawerName(""); }}>
                    Crear formulario
                  </button>
                  <div className={styles.formsList}>
                    {clientForms.map(f => (
                      <div
                        key={f.id}
                        className={`${styles.formsListItem} ${selectedClientForm?.id === f.id ? styles.formsListItemActive : ""}`}
                        onClick={() => selectClientForm(f)}
                      >
                        {f.name}
                        {f.isMain && <span className={styles.mainBadge}>Principal</span>}
                      </div>
                    ))}
                    {clientForms.length === 0 && (
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", padding: "12px 0" }}>
                        Sin formularios. Crea uno.
                      </div>
                    )}
                  </div>
                </>
              )}

              {formsPanelSub === "pizarra" && (
                <div style={{ padding: "16px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Próximamente disponible.
                </div>
              )}
            </div>

            {/* Right Column: Editor */}
            <div className={styles.formsBuilderRight}>
              {/* ─── SEGUIMIENTOS EDITOR ─── */}
              {formsPanelSub === "seguimientos" && selectedEpisodeForm && (
                <>
                  {/* Toolbar */}
                  <div className={styles.formEditorToolbar}>
                    <h2 className={styles.formEditorTitle}>{episodeFormName || "Sin nombre"}</h2>
                    <div className={styles.formEditorActions}>
                      <button className={styles.formActionDanger} onClick={handleDeleteEpisodeForm}>Eliminar</button>
                      <button
                        className={styles.formActionSecondary}
                        onClick={() => {
                          setShowAddEpisodeFieldDrawer(true);
                          setNewEpisodeFieldName("");
                          setNewEpisodeFieldType("Texto");
                        }}
                      >
                        Agregar
                      </button>
                      <button
                        className={styles.formActionPrimary}
                        onClick={handleSaveEpisodeForm}
                        disabled={episodeFormSaving}
                      >
                        {episodeFormSaving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>

                  {/* Name field */}
                  <div className={styles.formNameRow}>
                    <label className={styles.formFieldLabel}>Nombre del formulario *</label>
                    <input
                      type="text"
                      className={styles.formNameInput}
                      value={episodeFormName}
                      onChange={e => setEpisodeFormName(e.target.value)}
                    />
                  </div>

                  {/* Fields list */}
                  <div className={styles.formFieldsList}>
                    {episodeFormFields.map((field, idx) => (
                      <div 
                        key={idx} 
                        className={styles.formFieldRow}
                        draggable={isDraggingEnabled}
                        onDragStart={() => handleEpisodeDragStart(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => handleEpisodeDragEnter(idx)}
                        onDragEnd={handleDragEnd}
                        style={{ opacity: draggedIdx === idx ? 0.4 : 1 }}
                      >
                        <div
                          className={styles.formFieldDragHandle}
                          onMouseDown={() => setIsDraggingEnabled(true)}
                          onMouseUp={() => setIsDraggingEnabled(false)}
                          title="Arrastrar para mover"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                          </svg>
                        </div>
                        <button
                          type="button"
                          className={styles.formFieldBtn}
                          onClick={() => {
                            setEditingFieldIdx(idx);
                            setEditingFieldName(field.name || "");
                            setEditingFieldType(field.type || "Texto");
                            setEditingFieldTarget("episode");
                            setShowEditFieldDrawer(true);
                          }}
                        >
                          <span>{field.name || ""}</span>
                          {(field.type === "Opción única" || field.type === "Opción múltiple") && (
                            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>▾</span>
                          )}
                        </button>
                        <button
                          type="button"
                          className={styles.formFieldDeleteBtn}
                          onClick={() => setEpisodeFormFields(prev => prev.filter((_, i) => i !== idx))}
                          title="Eliminar campo"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6 17.5 20.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {episodeFormFields.length === 0 && (
                      <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontStyle: "italic", padding: "20px 0" }}>
                        Sin campos. Pulsa "Agregar" para añadir.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── FORMULARIOS EDITOR ─── */}
              {formsPanelSub === "formularios" && selectedClientForm && (
                <>
                  {/* Toolbar */}
                  <div className={styles.formEditorToolbar}>
                    <h2 className={styles.formEditorTitle}>{clientFormName || "Sin nombre"}</h2>
                    <div className={styles.formEditorActions}>
                      <button className={styles.formActionDanger} onClick={handleDeleteClientForm}>Eliminar</button>
                      <button
                        className={styles.formActionSecondary}
                        onClick={() => {
                          setShowAddClientFieldDrawer(true);
                          setNewClientFieldName("");
                          setNewClientFieldType("Texto");
                        }}
                      >
                        Agregar
                      </button>
                      <button
                        className={styles.formActionMark}
                        onClick={() => handleSaveClientForm(true)}
                        disabled={clientFormSaving}
                      >
                        Marcar como principal
                      </button>
                      <button
                        className={styles.formActionPrimary}
                        onClick={() => handleSaveClientForm(false)}
                        disabled={clientFormSaving}
                      >
                        {clientFormSaving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>

                  {/* Name field */}
                  <div className={styles.formNameRow}>
                    <label className={styles.formFieldLabel}>Nombre del formulario *</label>
                    <input
                      type="text"
                      className={styles.formNameInput}
                      value={clientFormName}
                      onChange={e => setClientFormName(e.target.value)}
                    />
                  </div>

                  {/* Fields list */}
                  <div className={styles.formFieldsList}>
                    {clientFormFields.map((field, idx) => (
                      <div 
                        key={idx} 
                        className={styles.formFieldRow}
                        draggable={isDraggingEnabled}
                        onDragStart={() => handleClientDragStart(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => handleClientDragEnter(idx)}
                        onDragEnd={handleDragEnd}
                        style={{ opacity: draggedIdx === idx ? 0.4 : 1 }}
                      >
                        <div
                          className={styles.formFieldDragHandle}
                          onMouseDown={() => setIsDraggingEnabled(true)}
                          onMouseUp={() => setIsDraggingEnabled(false)}
                          title="Arrastrar para mover"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                          </svg>
                        </div>
                        <button
                          type="button"
                          className={styles.formFieldBtn}
                          onClick={() => {
                            setEditingFieldIdx(idx);
                            setEditingFieldName(field.name || "");
                            setEditingFieldType(field.type || "Texto");
                            setEditingFieldTarget("client");
                            setShowEditFieldDrawer(true);
                          }}
                        >
                          <span>{field.name || ""}</span>
                          {(field.type === "Opción única" || field.type === "Opción múltiple") && (
                            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>▾</span>
                          )}
                        </button>
                        <button
                          type="button"
                          className={styles.formFieldDeleteBtn}
                          onClick={() => setClientFormFields(prev => prev.filter((_, i) => i !== idx))}
                          title="Eliminar campo"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6 17.5 20.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {clientFormFields.length === 0 && (
                      <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontStyle: "italic", padding: "20px 0" }}>
                        Sin campos. Pulsa "Agregar" para añadir.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Placeholder when no form selected */}
              {formsPanelSub !== "pizarra" && !selectedEpisodeForm && formsPanelSub === "seguimientos" && (
                <div className={styles.formEditorPlaceholder}>
                  Selecciona un formulario o crea uno nuevo.
                </div>
              )}
              {formsPanelSub !== "pizarra" && !selectedClientForm && formsPanelSub === "formularios" && (
                <div className={styles.formEditorPlaceholder}>
                  Selecciona un formulario o crea uno nuevo.
                </div>
              )}
              {formsPanelSub === "pizarra" && (
                <div className={styles.formEditorPlaceholder}>
                  La pizarra estará disponible próximamente.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Almacén e Inventario */}
        {activeTab === "inventario" && (
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>📦 Almacén e Inventario</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "13px" }}>
                  Gestiona el stock de tus materiales y consumibles clínicos. Descuentos automáticos al completar sesiones.
                </p>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setActiveInventorySubTab("productos")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    background: activeInventorySubTab === "productos" ? "var(--primary)" : "var(--bg-input)",
                    color: activeInventorySubTab === "productos" ? "#fff" : "var(--text-primary)"
                  }}
                >
                  Productos y Consumibles
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInventorySubTab("transacciones")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    background: activeInventorySubTab === "transacciones" ? "var(--primary)" : "var(--bg-input)",
                    color: activeInventorySubTab === "transacciones" ? "#fff" : "var(--text-primary)"
                  }}
                >
                  Movimientos de Almacén
                </button>
              </div>
            </div>

            {/* SUBTAB 1: PRODUCTOS */}
            {activeInventorySubTab === "productos" && (
              <div>
                {/* Barra de Filtros y Búsqueda */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px" }}>
                  <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Buscar por nombre o SKU..."
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      style={{ paddingLeft: "36px", width: "100%" }}
                    />
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>🔍</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenProductForm(null)}
                  >
                    + Nuevo Producto
                  </button>
                </div>

                {/* Tabla de Productos */}
                {loadingProducts ? (
                  <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>Cargando inventario...</div>
                ) : products.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-secondary)" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📦</div>
                    No hay productos registrados en el inventario. Pulsa "+ Nuevo Producto" para comenzar.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table" style={{ fontSize: "13px", width: "100%" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                          <th style={{ padding: "12px" }}>Producto</th>
                          <th style={{ padding: "12px" }}>SKU / Código</th>
                          <th style={{ padding: "12px", textAlign: "right" }}>{showGanancias ? "Precio Costo" : ""}</th>
                          <th style={{ padding: "12px", textAlign: "center" }}>Stock</th>
                          <th style={{ padding: "12px", textAlign: "center" }}>Stock Mín.</th>
                          <th style={{ padding: "12px" }}>Estado</th>
                          <th style={{ padding: "12px", textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((prod) => {
                          const isCritical = prod.stock <= prod.minStock;
                          return (
                            <tr key={prod.id} style={{ borderBottom: "1px solid var(--border-color)", verticalAlign: "middle" }}>
                              <td style={{ padding: "12px" }}>
                                <strong>{prod.name}</strong>
                              </td>
                              <td style={{ padding: "12px" }}>
                                <code style={{ fontSize: "11px", background: "var(--bg-input)", padding: "2px 6px", borderRadius: "4px" }}>
                                  {prod.sku || "N/A"}
                                </code>
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                {showGanancias ? (prod.costPrice ? `${prod.costPrice.toFixed(2)} €` : "0.00 €") : ""}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", fontWeight: 700 }}>
                                <span style={{ color: isCritical ? "#ef4444" : "inherit" }}>
                                  {prod.stock} uds
                                </span>
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", color: "var(--text-secondary)" }}>
                                {prod.minStock} uds
                              </td>
                              <td style={{ padding: "12px" }}>
                                <span style={{
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background: isCritical ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                                  color: isCritical ? "#ef4444" : "#10b981"
                                }}>
                                  {isCritical ? "⚠️ Stock Crítico" : "✓ Óptimo"}
                                </span>
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStockAdjustModal(prod)}
                                    style={{
                                      padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                                      background: "var(--primary-light)", color: "var(--primary)",
                                      border: "none", borderRadius: "4px", cursor: "pointer"
                                    }}
                                  >
                                    ⚡ Ajustar Stock
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenProductForm(prod)}
                                    style={{
                                      padding: "4px 8px", fontSize: "11px",
                                      background: "none", border: "1px solid var(--border-color)",
                                      borderRadius: "4px", cursor: "pointer", color: "var(--text-primary)"
                                    }}
                                  >
                                    Editar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* FORMULARIO DRAWER CREAR/EDITAR PRODUCTO */}
                {showProductForm && typeof window !== "undefined" && createPortal(
                  <div className={styles.drawerOverlay} onClick={() => setShowProductForm(false)}>
                    <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.drawerHeader}>
                        <h2>
                          {editingProduct ? "✏️ Editar Insumo" : "📦 Nuevo Insumo"}
                        </h2>
                        <button
                          type="button"
                          className={styles.drawerCloseBtn}
                          onClick={() => setShowProductForm(false)}
                        >
                          <Icons.Close size={20} />
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 73px)" }}>
                        <div className={styles.drawerBody}>
                          {productFormError && (
                            <div style={{
                              background: "rgba(239, 68, 68, 0.08)",
                              color: "#ef4444",
                              padding: "10px 14px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              marginBottom: "16px",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}>
                              <span style={{ fontSize: "14px" }}>⚠️</span>
                              <span>{productFormError}</span>
                            </div>
                          )}
                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Nombre del material *</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="Ej. Agujas Acupuntura 0.25x25"
                              value={productFormName}
                              onChange={(e) => setProductFormName(e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>SKU / Código Referencia</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="Ej. SKU-AG-99"
                              value={productFormSku}
                              onChange={(e) => setProductFormSku(e.target.value)}
                            />
                          </div>

                          {!editingProduct && (
                            <div className="form-group">
                              <label className="form-label" style={{ fontWeight: 600 }}>Stock inicial</label>
                              <input
                                type="number"
                                className="input"
                                placeholder="0"
                                value={productFormStock}
                                onChange={(e) => setProductFormStock(e.target.value)}
                              />
                            </div>
                          )}

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Stock Mínimo (Alerta Crítica)</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="0"
                              value={productFormMinStock}
                              onChange={(e) => setProductFormMinStock(e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Precio Coste (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              placeholder="0.00"
                              value={productFormCostPrice}
                              onChange={(e) => setProductFormCostPrice(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className={styles.drawerFooter}>
                          {editingProduct ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setProductToDelete(editingProduct.id)}
                              style={{ color: "#ef4444", borderColor: "#ef4444" }}
                            >
                              Eliminar
                            </button>
                          ) : <div />}

                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setShowProductForm(false)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleSaveProduct}
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}

            {/* SUBTAB 2: TRANSACCIONES */}
            {activeInventorySubTab === "transacciones" && (
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: "var(--text-secondary)" }}>
                  Bitácora de movimientos históricos
                </h4>

                {loadingTransactions ? (
                  <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>Cargando bitácora...</div>
                ) : productTransactions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-secondary)" }}>
                    No se registran movimientos en el inventario.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table" style={{ fontSize: "12px", width: "100%" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                          <th style={{ padding: "10px" }}>Fecha / Hora</th>
                          <th style={{ padding: "10px" }}>Insumo</th>
                          <th style={{ padding: "10px" }}>Tipo de Movimiento</th>
                          <th style={{ padding: "10px" }}>Usuario</th>
                          <th style={{ padding: "10px", textAlign: "center" }}>Cantidad</th>
                          <th style={{ padding: "10px" }}>Notas / Justificación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productTransactions.map((tx) => {
                          const isAdd = tx.type === "ADD";
                          const isRemove = tx.type === "REMOVE";
                          const isConsumption = tx.type === "CONSUMPTION";

                          return (
                            <tr key={tx.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                                {new Date(tx.createdAt).toLocaleString("es-ES")}
                              </td>
                              <td style={{ padding: "10px" }}>
                                <strong>{tx.product?.name || "Insumo eliminado"}</strong>
                              </td>
                              <td style={{ padding: "10px" }}>
                                <span style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  background: isAdd ? "rgba(16, 185, 129, 0.1)" : isRemove ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                                  color: isAdd ? "#10b981" : isRemove ? "#ef4444" : "#3b82f6"
                                }}>
                                  {isAdd ? "⬆ Entrada de stock" : isRemove ? "⬇ Salida manual" : "⚙ Consumo automático"}
                                </span>
                              </td>
                              <td style={{ padding: "10px" }}>
                                {tx.user ? `${tx.user.name} ${tx.user.lastName || ""}`.trim() : "Sistema / Automático"}
                              </td>
                              <td style={{ padding: "10px", textAlign: "center", fontWeight: 700 }}>
                                <span style={{ color: isAdd ? "#10b981" : isRemove ? "#ef4444" : "#3b82f6" }}>
                                  {isAdd ? "+" : "-"}{tx.quantity} uds
                                </span>
                              </td>
                              <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                                {tx.notes || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: Liquidaciones y Comisiones */}
        {activeTab === "liquidaciones" && (
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>💵 Liquidaciones y Comisiones</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "13px" }}>
                  Configura porcentajes y tarifas de comisiones de tus profesionales y calcula sus liquidaciones mensuales de forma automática.
                </p>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setActiveLiquidationsSubTab("calculo")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    background: activeLiquidationsSubTab === "calculo" ? "var(--primary)" : "var(--bg-input)",
                    color: activeLiquidationsSubTab === "calculo" ? "#fff" : "var(--text-primary)"
                  }}
                >
                  Cálculo e Historial
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLiquidationsSubTab("config")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    background: activeLiquidationsSubTab === "config" ? "var(--primary)" : "var(--bg-input)",
                    color: activeLiquidationsSubTab === "config" ? "#fff" : "var(--text-primary)"
                  }}
                >
                  Configurar Comisiones
                </button>
              </div>
            </div>

            {/* SUBTAB 1: CONFIGURAR COMISIONES */}
            {activeLiquidationsSubTab === "config" && (
              <div style={{ display: "flex", gap: "24px", minHeight: "500px" }}>
                {/* Lateral: Lista de Profesionales */}
                <div style={{ width: "240px", borderRight: "1px solid var(--border-color)", paddingRight: "16px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 12px", color: "var(--text-secondary)" }}>
                    Profesionales Clínicos
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {staff
                      .filter(u => u.role === "DOCTOR" || u.role === "THERAPIST" || u.role === "ADMIN")
                      .map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedTherapistId(u.id)}
                          style={{
                            padding: "10px 12px",
                            fontSize: "13px",
                            fontWeight: selectedTherapistId === u.id ? 600 : 400,
                            borderRadius: "6px",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            background: selectedTherapistId === u.id ? "var(--primary-light)" : "none",
                            color: selectedTherapistId === u.id ? "var(--primary)" : "var(--text-primary)",
                            transition: "all 0.15s"
                          }}
                        >
                          {u.name} {u.lastName || ""}
                          <span style={{ display: "block", fontSize: "10px", color: "var(--text-secondary)", fontWeight: 400 }}>
                            {u.role === "ADMIN" ? "Administrador" : u.role === "DOCTOR" ? "Médico" : "Terapeuta"}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Contenido: Configuración */}
                <div style={{ flex: 1 }}>
                  {!selectedTherapistId ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", padding: "48px" }}>
                      <div style={{ fontSize: "40px", marginBottom: "8px" }}>👤</div>
                      Selecciona un profesional clínico de la lista lateral para configurar sus comisiones.
                    </div>
                  ) : (
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
                        Comisión por Defecto
                      </h4>

                      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", maxWidth: "500px" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>Tipo de Comisión</label>
                          <select
                            className="input select"
                            value={therapistCommissionType}
                            onChange={(e) => setTherapistCommissionType(e.target.value as any)}
                          >
                            <option value="PERCENTAGE">Porcentaje (%)</option>
                            <option value="FIXED">Tarifa Fija por Cita (€)</option>
                            <option value="DAILY_FIXED">Tarifa Fija por Día Trabajado (€)</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>
                            Valor ({therapistCommissionType === "PERCENTAGE" ? "%" : therapistCommissionType === "DAILY_FIXED" ? "€/día" : "€"})
                          </label>
                          <input
                            type="number"
                            className="input"
                            value={therapistCommissionValue}
                            onChange={(e) => setTherapistCommissionValue(e.target.value)}
                          />
                        </div>
                      </div>

                      {therapistCommissionType === "DAILY_FIXED" ? (
                        <div style={{
                          background: "var(--bg-input)",
                          padding: "16px 20px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color)",
                          marginBottom: "24px",
                          color: "var(--text-secondary)",
                          fontSize: "13px"
                        }}>
                          <strong>💡 Nota sobre Tarifa Diaria:</strong> Al seleccionar la tarifa fija por día trabajado, el profesional cobrará el importe configurado por cada día de la agenda en el que registre al menos una cita completada. Se omiten las excepciones por servicio.
                        </div>
                      ) : (
                        <>
                          <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
                            Comisiones Especiales por Servicio (Excepciones)
                          </h4>

                          <div className="table-container" style={{ marginBottom: "24px" }}>
                            <table className="table" style={{ fontSize: "12px", width: "100%" }}>
                              <thead>
                                <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                                  <th style={{ padding: "10px" }}>Servicio Clínico</th>
                                  <th style={{ padding: "10px", textAlign: "right" }}>Precio PVP</th>
                                  <th style={{ padding: "10px" }}>Regla Aplicada</th>
                                  <th style={{ padding: "10px" }}>Tipo Comisión</th>
                                  <th style={{ padding: "10px" }}>Valor Comisión</th>
                                </tr>
                              </thead>
                              <tbody>
                                {services.map(srv => {
                                  const hasOverride = !!therapistOverrides[srv.id];
                                  const override = therapistOverrides[srv.id] || { type: "PERCENTAGE", value: 0 };

                                  return (
                                    <tr key={srv.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                      <td style={{ padding: "10px" }}>
                                        <strong>{srv.name}</strong>
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right" }}>
                                        {srv.price ? `${srv.price.toFixed(2)} €` : "0.00 €"}
                                      </td>
                                      <td style={{ padding: "10px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", margin: 0 }}>
                                          <input
                                            type="checkbox"
                                            checked={hasOverride}
                                            onChange={(e) => {
                                              const next = { ...therapistOverrides };
                                              if (e.target.checked) {
                                                next[srv.id] = { type: "PERCENTAGE", value: 0 };
                                              } else {
                                                delete next[srv.id];
                                              }
                                              setTherapistOverrides(next);
                                            }}
                                          />
                                          <span style={{ fontSize: "11px", fontWeight: hasOverride ? 600 : 400, color: hasOverride ? "var(--primary)" : "inherit" }}>
                                            {hasOverride ? "Excepción activa" : "Usar por defecto"}
                                          </span>
                                        </label>
                                      </td>
                                      <td style={{ padding: "10px" }}>
                                        <select
                                          disabled={!hasOverride}
                                          className="input select"
                                          style={{ padding: "4px 8px", fontSize: "11px", height: "auto", minWidth: "120px" }}
                                          value={override.type}
                                          onChange={(e) => {
                                            const next = { ...therapistOverrides };
                                            next[srv.id] = { ...override, type: e.target.value as any };
                                            setTherapistOverrides(next);
                                          }}
                                        >
                                          <option value="PERCENTAGE">Porcentaje (%)</option>
                                          <option value="FIXED">Fijo (€)</option>
                                        </select>
                                      </td>
                                      <td style={{ padding: "10px" }}>
                                        <input
                                          type="number"
                                          disabled={!hasOverride}
                                          className="input"
                                          style={{ padding: "4px 8px", fontSize: "11px", height: "auto", width: "80px" }}
                                          value={hasOverride ? override.value : ""}
                                          onChange={(e) => {
                                            const next = { ...therapistOverrides };
                                            next[srv.id] = { ...override, value: parseFloat(e.target.value) || 0 };
                                            setTherapistOverrides(next);
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingCommissionConfig}
                          onClick={handleSaveCommissionConfig}
                        >
                          {savingCommissionConfig ? "Guardando..." : "Guardar Configuración"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 2: CÁLCULO E HISTORIAL */}
            {activeLiquidationsSubTab === "calculo" && (
              <div>
                {/* Formulario de Cálculo */}
                <div style={{ background: "var(--bg-input)", borderRadius: "8px", padding: "18px 24px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    🧮 Calcular Liquidación Mensual
                  </h4>
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div className="form-group" style={{ flex: 1, minWidth: "200px", margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: "11px" }}>PROFESIONAL</label>
                      <select
                        className="input select"
                        value={selectedCalculateTherapistId}
                        onChange={(e) => setSelectedCalculateTherapistId(e.target.value)}
                      >
                        <option value="">Selecciona profesional...</option>
                        {staff
                          .filter(u => u.role === "DOCTOR" || u.role === "THERAPIST" || u.role === "ADMIN")
                          .map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} {u.lastName || ""}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1, minWidth: "150px", margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: "11px" }}>PERÍODO MENSUAL</label>
                      <input
                        type="month"
                        className="input"
                        value={calculateMonth}
                        onChange={(e) => setCalculateMonth(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={calculatingDraft}
                      onClick={handleCalculateDraft}
                      style={{ height: "40px" }}
                    >
                      {calculatingDraft ? "Calculando..." : "Calcular comisiones"}
                    </button>
                  </div>
                </div>

                {/* Previsualización del Borrador Calculado */}
                {calculatedDraft && (
                  <div style={{ border: "1px solid var(--primary)", borderRadius: "8px", padding: "24px", marginBottom: "32px", background: "rgba(59, 130, 246, 0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--primary)" }}>
                        🔍 Previsualización de Liquidación ({calculateMonth})
                      </h4>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setCalculatedDraft(null)}
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingLiquidation}
                          onClick={handleSaveLiquidation}
                        >
                          {savingLiquidation ? "Guardando..." : "Cerrar y Guardar Liquidación"}
                        </button>
                      </div>
                    </div>

                    {/* Tarjetas de Resumen */}
                    <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                      <div style={{ flex: 1, background: "var(--bg-panel-solid)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>CITAS REALIZADAS</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {calculatedDraft.details?.length || 0} citas
                        </div>
                      </div>
                      <div style={{ flex: 1, background: "var(--bg-panel-solid)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>PVP TOTAL CITAS</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {(calculatedDraft.details?.reduce((acc: number, item: any) => acc + item.servicePrice, 0) || 0).toFixed(2)} €
                        </div>
                      </div>
                      <div style={{ flex: 1, background: "var(--bg-panel-solid)", padding: "16px", borderRadius: "8px", border: "1px solid var(--primary-light)", textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)", marginBottom: "4px" }}>TOTAL COMISIONES A LIQUIDAR</div>
                        <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>
                          {calculatedDraft.totalAmount?.toFixed(2)} €
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Citas del Borrador */}
                    <h5 style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--text-secondary)" }}>DETALLE DE CITAS COMPLEMENTADAS</h5>
                    <div className="table-container" style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <table className="table" style={{ fontSize: "11px", width: "100%" }}>
                        <thead>
                          <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                            <th style={{ padding: "8px" }}>Fecha / Hora</th>
                            <th style={{ padding: "8px" }}>Cliente</th>
                            <th style={{ padding: "8px" }}>Servicio</th>
                            <th style={{ padding: "8px", textAlign: "right" }}>Precio PVP</th>
                            <th style={{ padding: "8px", textAlign: "center" }}>Comisión Aplicada</th>
                            <th style={{ padding: "8px", textAlign: "right" }}>Comisión (€)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculatedDraft.details?.map((item: any, index: number) => (
                            <tr key={index} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "8px" }}>{new Date(item.date).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                              <td style={{ padding: "8px" }}>{item.clientName}</td>
                              <td style={{ padding: "8px" }}>{item.serviceName}</td>
                              <td style={{ padding: "8px", textAlign: "right" }}>{item.servicePrice.toFixed(2)} €</td>
                              <td style={{ padding: "8px", textAlign: "center" }}>
                                {item.commissionType === "PERCENTAGE" 
                                  ? `${item.commissionValue}%` 
                                  : item.commissionType === "DAILY_FIXED" 
                                    ? `${item.commissionValue.toFixed(2)} €/día` 
                                    : `${item.commissionValue.toFixed(2)} €`}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "var(--primary)" }}>
                                {item.calculatedAmount.toFixed(2)} €
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Historial de Liquidaciones Cerradas */}
                <h4 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
                  📋 Historial de Liquidaciones Guardadas
                </h4>

                {loadingLiquidations ? (
                  <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>Cargando historial...</div>
                ) : liquidations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-secondary)" }}>
                    No se registran liquidaciones cerradas en el historial.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table" style={{ fontSize: "12px", width: "100%" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                          <th style={{ padding: "12px" }}>Profesional</th>
                          <th style={{ padding: "12px" }}>Periodo</th>
                          <th style={{ padding: "12px", textAlign: "right" }}>Total Liquidado</th>
                          <th style={{ padding: "12px", textAlign: "center" }}>Citas</th>
                          <th style={{ padding: "12px" }}>Estado</th>
                          <th style={{ padding: "12px", textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liquidations.map((liq) => {
                          const details = JSON.parse(liq.detailsJson || "[]");
                          const start = new Date(liq.periodStart);
                          const periodLabel = start.toLocaleString("es-ES", { month: "long", year: "numeric" });
                          const isPaid = liq.status === "PAID";

                          return (
                            <tr key={liq.id} style={{ borderBottom: "1px solid var(--border-color)", verticalAlign: "middle" }}>
                              <td style={{ padding: "12px" }}>
                                <strong>{liq.user?.name} {liq.user?.lastName || ""}</strong>
                              </td>
                              <td style={{ padding: "12px", textTransform: "capitalize" }}>
                                {periodLabel}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                                {liq.totalAmount.toFixed(2)} €
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", color: "var(--text-secondary)" }}>
                                {details.length} uds
                              </td>
                              <td style={{ padding: "12px" }}>
                                <span style={{
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background: isPaid ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                  color: isPaid ? "#10b981" : "#f59e0b"
                                }}>
                                  {isPaid ? "✓ Pagado" : "⏳ Pendiente"}
                                </span>
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLiquidationForDetails(liq)}
                                    style={{
                                      padding: "4px 8px", fontSize: "11px",
                                      background: "var(--bg-input)", border: "1px solid var(--border-color)",
                                      borderRadius: "4px", cursor: "pointer", color: "var(--text-primary)"
                                    }}
                                  >
                                    Ver Detalle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExportPDF(liq)}
                                    style={{
                                      padding: "4px 8px", fontSize: "11px",
                                      background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)",
                                      borderRadius: "4px", cursor: "pointer", color: "var(--primary)"
                                    }}
                                  >
                                    Descargar PDF
                                  </button>
                                  {!isPaid && (
                                    <button
                                      type="button"
                                      onClick={() => handlePayLiquidation(liq.id)}
                                      style={{
                                        padding: "4px 8px", fontSize: "11px", fontWeight: 600,
                                        background: "var(--primary-light)", color: "var(--primary)",
                                        border: "none", borderRadius: "4px", cursor: "pointer"
                                      }}
                                    >
                                      Pagar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLiquidation(liq.id)}
                                    style={{
                                      padding: "4px 8px", fontSize: "11px",
                                      background: "none", border: "1px solid #ef4444",
                                      borderRadius: "4px", cursor: "pointer", color: "#ef4444"
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DETALLES DE LIQUIDACION HISTORICA MODAL */}
        {selectedLiquidationForDetails && typeof window !== "undefined" && createPortal(
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setSelectedLiquidationForDetails(null)}
          >
            <div
              style={{ background: "var(--bg-panel-solid)", borderRadius: "12px", width: "700px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                  📋 Desglose de Liquidación - {selectedLiquidationForDetails.user?.name} {selectedLiquidationForDetails.user?.lastName || ""}
                </h3>
                <button type="button" onClick={() => setSelectedLiquidationForDetails(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1 }}>✕</button>
              </div>
              
              <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
                <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>PERIODO</span>
                    <strong style={{ textTransform: "capitalize" }}>
                      {new Date(selectedLiquidationForDetails.periodStart).toLocaleString("es-ES", { month: "long", year: "numeric" })}
                    </strong>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>ESTADO</span>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: selectedLiquidationForDetails.status === "PAID" ? "#10b981" : "#f59e0b"
                    }}>
                      {selectedLiquidationForDetails.status === "PAID" ? "✓ Pagado" : "⏳ Pendiente de Pago"}
                    </span>
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>IMPORTE TOTAL</span>
                    <strong style={{ fontSize: "18px", color: "var(--primary)" }}>
                      {selectedLiquidationForDetails.totalAmount.toFixed(2)} €
                    </strong>
                  </div>
                </div>

                <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", color: "var(--text-secondary)" }}>
                  Citas Realizadas
                </h4>

                <div className="table-container">
                  <table className="table" style={{ fontSize: "11px", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "8px" }}>Fecha</th>
                        <th style={{ padding: "8px" }}>Cliente</th>
                        <th style={{ padding: "8px" }}>Servicio</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Precio PVP</th>
                        <th style={{ padding: "8px", textAlign: "center" }}>Comisión</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {JSON.parse(selectedLiquidationForDetails.detailsJson || "[]").map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "8px" }}>
                            {new Date(item.date).toLocaleDateString("es-ES")}
                          </td>
                          <td style={{ padding: "8px" }}>{item.clientName}</td>
                          <td style={{ padding: "8px" }}>{item.serviceName}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>{item.servicePrice.toFixed(2)} €</td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            {item.commissionType === "PERCENTAGE" 
                              ? `${item.commissionValue}%` 
                              : item.commissionType === "DAILY_FIXED" 
                                ? `${item.commissionValue.toFixed(2)} €/día` 
                                : `${item.commissionValue.toFixed(2)} €`}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "var(--primary)" }}>
                            {item.calculatedAmount.toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedLiquidationForDetails(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* TAB: Papelera */}
        {activeTab === "papelera" && (
          <div style={{ padding: "32px" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>Papelera</h3>
            <p style={{ margin: "0 0 24px", color: "var(--text-secondary)", fontSize: "14px" }}>
              Citas y clientes eliminados de manera temporal. Puedes restaurarlos o eliminarlos permanentemente.
            </p>

            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid var(--border-color)", paddingBottom: "0" }}>
              {(["citas", "clientes", "presupuestos"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPapeleraTab(t)}
                  style={{
                    padding: "8px 20px", fontSize: "13px", fontWeight: papeleraTab === t ? 600 : 400,
                    color: papeleraTab === t ? "var(--primary)" : "var(--text-secondary)",
                    background: "none", border: "none", cursor: "pointer",
                    borderBottom: papeleraTab === t ? "2px solid var(--primary)" : "2px solid transparent",
                    marginBottom: "-1px", transition: "all 0.15s",
                  }}
                >
                  {t === "presupuestos" ? "Presupuestos" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>


            {loadingPapelera ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "32px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                <div style={{ width: 20, height: 20, border: "2px solid var(--border-color)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Cargando papelera...
              </div>
            ) : papeleraTab === "citas" ? (
              papeleraCitas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
                  La papelera de citas está vacía.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Fecha Cita</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Fecha Eliminación</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Cliente</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Empleado</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Servicio</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {papeleraCitas.map((cita: any) => (
                        <tr key={cita.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px", color: "var(--text-primary)" }}>
                            {new Date(cita.start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            {" "}
                            {new Date(cita.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(cita.end).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td style={{ padding: "12px", color: "#ef4444", fontSize: "12px" }}>
                            {cita.deletedAt ? new Date(cita.deletedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                          </td>
                          <td style={{ padding: "12px", color: "var(--primary)", fontWeight: 500 }}>
                            {cita.client?.firstName} {cita.client?.lastName}
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                            {cita.user?.name} {cita.user?.lastName || ""}
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-primary)" }}>
                            {cita.service?.name || "-"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  const actorName = currentUser ? currentUser.name : "Sistema";
                                  const actorId = currentUser?.id || "";
                                  await fetch(`/api/appointments/${cita.id}/restore`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userName: actorName, userId: actorId })
                                  });
                                  setPapeleraCitas(prev => prev.filter(c => c.id !== cita.id));
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                ♻️ Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm("¿Eliminar esta cita definitivamente? Esta acción no se puede deshacer.")) return;
                                  await fetch(`/api/appointments/${cita.id}/permanent`, { method: "DELETE" });
                                  setPapeleraCitas(prev => prev.filter(c => c.id !== cita.id));
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                🗑️ Definitivo
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  setPapeleraLogsAppId(cita.id);
                                  setShowPapeleraLogsModal(true);
                                  setLoadingPapeleraLogs(true);
                                  setPapeleraLogs([]);
                                  const res = await fetch(`/api/appointments/${cita.id}/logs`);
                                  const data = await res.json();
                                  setPapeleraLogs(Array.isArray(data) ? data : []);
                                  setLoadingPapeleraLogs(false);
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                📋 Logs
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : papeleraTab === "clientes" ? (
              papeleraClientes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
                  La papelera de clientes está vacía.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Nombre</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Email</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Teléfono</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Fecha Eliminación</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {papeleraClientes.map((cli: any) => (
                        <tr key={cli.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px", color: "var(--primary)", fontWeight: 500 }}>
                            {cli.firstName} {cli.lastName}
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{cli.email || "-"}</td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{cli.phone || "-"}</td>
                          <td style={{ padding: "12px", color: "#ef4444", fontSize: "12px" }}>
                            {cli.deletedAt ? new Date(cli.deletedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/clients/${cli.id}/restore`, { method: "POST" });
                                  setPapeleraClientes(prev => prev.filter(c => c.id !== cli.id));
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                ♻️ Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm("¿Eliminar este cliente definitivamente? Se borrarán todos sus datos.")) return;
                                  await fetch(`/api/clients/${cli.id}/permanent`, { method: "DELETE" });
                                  setPapeleraClientes(prev => prev.filter(c => c.id !== cli.id));
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                🗑️ Definitivo
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              papeleraPresupuestos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
                  La papelera de presupuestos está vacía.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Nº Presupuesto</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Concepto</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Total</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Fecha Eliminación</th>
                        <th style={{ padding: "10px 12px", textAlign: "left" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {papeleraPresupuestos.map((b: any) => (
                        <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px", fontWeight: "bold" }}>
                            PRE-{b.budgetNumber}
                          </td>
                          <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{b.title}</td>
                          <td style={{ padding: "12px", color: "var(--text-primary)", fontWeight: 600 }}>{b.total.toFixed(2)}€</td>
                          <td style={{ padding: "12px", color: "#ef4444", fontSize: "12px" }}>
                            {b.deletedAt ? new Date(b.deletedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/budgets/${b.id}/restore`, { method: "POST" });
                                  setPapeleraPresupuestos(prev => prev.filter(x => x.id !== b.id));
                                  alert("Presupuesto restaurado con éxito.");
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                ♻️ Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm("¿Eliminar este presupuesto definitivamente? Esta acción no se puede deshacer.")) return;
                                  await fetch(`/api/budgets/${b.id}/permanent`, { method: "DELETE" });
                                  setPapeleraPresupuestos(prev => prev.filter(x => x.id !== b.id));
                                  alert("Presupuesto eliminado permanentemente.");
                                }}
                                style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                              >
                                🗑️ Definitivo
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB: DATOS FISCALES */}
        {activeTab === "datosFiscales" && (
          <div style={{ display: "flex", height: "100%", minHeight: "600px" }}>
            {/* Left sidebar: list of profiles */}
            <div style={{ width: "240px", flexShrink: 0, borderRight: "1px solid var(--border-color)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--text-color)" }}>Título</h4>

              {fiscalProfiles.map(fp => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => {
                    setSelectedFiscalProfile(fp);
                    setFiscalFormOpen(false);
                    setEditingFiscalProfile(null);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: selectedFiscalProfile?.id === fp.id ? "#0d9488" : "var(--bg-card)",
                    color: selectedFiscalProfile?.id === fp.id ? "#fff" : "var(--text-color)",
                    fontSize: "13px",
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {fp.comercialName || "Sin nombre"} ({fp.nif || "-"})
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFiscalFormOpen(true);
                  setEditingFiscalProfile(null);
                  setSelectedFiscalProfile(null);
                  setFpEntityType("Empresa");
                  setFpComercialName(""); setFpNif(""); setFpAddress("");
                  setFpMunicipality(""); setFpPostalCode(""); setFpLogo("");
                  setFpIrpf(""); setFpCreditorSuffix("0000"); setFpIban("");
                  setFpBicSwift(""); setFpSerieFacturaOrdinaria(""); setFpSerieRectificadaOrdinaria("");
                  setFpSerieFacturaSimplificada(""); setFpSerieRectificadaSimplificada("");
                  setFpFooterNotes(""); setFpFooterNotesSimplified(""); setFpFirma(""); setFpSello("");
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--primary)",
                  background: "transparent",
                  color: "var(--primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  marginTop: "4px",
                }}
              >
                Crear nuevo
              </button>

              {/* Toggles fiscales */}
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {[["TicketBAI", false], ["IGIC", false], ["IPSI", false], ["Preguntar en factura", true]].map(([label, active]) => (
                  <div key={label as string} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={{ position: "relative", width: "36px", height: "20px", cursor: "pointer", flexShrink: 0 }}>
                      <input type="checkbox" defaultChecked={active as boolean} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{
                        position: "absolute", inset: 0, borderRadius: "20px", transition: "all 0.2s",
                        backgroundColor: active ? "var(--primary)" : "var(--border-color)",
                      }}>
                        <span style={{
                          position: "absolute", height: "14px", width: "14px", left: "3px", bottom: "3px",
                          backgroundColor: "#fff", borderRadius: "50%", transition: "all 0.2s",
                          transform: active ? "translateX(16px)" : "translateX(0)",
                        }} />
                      </span>
                    </label>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label as string}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: view or form */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
              {/* VIEW MODE: selected profile */}
              {!fiscalFormOpen && selectedFiscalProfile && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>
                      {selectedFiscalProfile.comercialName || "Perfil fiscal"}
                    </h3>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFiscalProfile(selectedFiscalProfile);
                          setFiscalFormOpen(true);
                          setFpEntityType(selectedFiscalProfile.entityType || "Empresa");
                          setFpComercialName(selectedFiscalProfile.comercialName || "");
                          setFpNif(selectedFiscalProfile.nif || "");
                          setFpAddress(selectedFiscalProfile.address || "");
                          setFpMunicipality(selectedFiscalProfile.municipality || "");
                          setFpPostalCode(selectedFiscalProfile.postalCode || "");
                          setFpLogo(selectedFiscalProfile.logo || "");
                          setFpIrpf(selectedFiscalProfile.irpf?.toString() || "");
                          setFpCreditorSuffix(selectedFiscalProfile.creditorSuffix || "0000");
                          setFpIban(selectedFiscalProfile.iban || "");
                          setFpBicSwift(selectedFiscalProfile.bicSwift || "");
                          setFpSerieFacturaOrdinaria(selectedFiscalProfile.serieFacturaOrdinaria || "");
                          setFpSerieRectificadaOrdinaria(selectedFiscalProfile.serieRectificadaOrdinaria || "");
                          setFpSerieFacturaSimplificada(selectedFiscalProfile.serieFacturaSimplificada || "");
                          setFpSerieRectificadaSimplificada(selectedFiscalProfile.serieRectificadaSimplificada || "");
                          setFpFooterNotes(selectedFiscalProfile.footerNotes || "");
                          setFpFooterNotesSimplified(selectedFiscalProfile.footerNotesSimplified || "");
                          setFpFirma(selectedFiscalProfile.firma || "");
                          setFpSello(selectedFiscalProfile.sello || "");
                        }}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-color)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("¿Eliminar este perfil fiscal? Esta acción no se puede deshacer.")) return;
                          await fetch(`/api/fiscal-profiles/${selectedFiscalProfile.id}`, { method: "DELETE" });
                          const newList = fiscalProfiles.filter(f => f.id !== selectedFiscalProfile.id);
                          setFiscalProfiles(newList);
                          setSelectedFiscalProfile(newList.length > 0 ? newList[0] : null);
                        }}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "24px", border: "1px solid var(--border-color)" }}>
                    <p style={{ margin: "0 0 16px", fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>Emisor principal</p>

                    {/* Entity type buttons */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                      {["Empresa", "Autónomo"].map(t => (
                        <span key={t} style={{ padding: "6px 16px", borderRadius: "20px", border: "1px solid var(--border-color)", fontSize: "13px", background: selectedFiscalProfile.entityType === t ? "var(--primary)" : "transparent", color: selectedFiscalProfile.entityType === t ? "#fff" : "var(--text-secondary)", fontWeight: 600 }}>{t}</span>
                      ))}
                    </div>

                    {/* Logo */}
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text-color)" }}>Logo</label>
                      {selectedFiscalProfile.logo ? (
                        <img src={selectedFiscalProfile.logo} alt="Logo" style={{ maxHeight: "80px", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Sin logo</span>
                      )}
                    </div>

                    {/* Fields grid */}
                    {[
                      ["Nombre comercial", selectedFiscalProfile.comercialName],
                      ["NIF", selectedFiscalProfile.nif],
                      ["Dirección", selectedFiscalProfile.address],
                    ].map(([label, value]) => (
                      <div key={label as string} style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>{label as string}</label>
                        <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "8px", fontSize: "13px", color: "var(--text-color)", border: "1px solid var(--border-color)" }}>{value as string || "-"}</div>
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                      {[["Municipio", selectedFiscalProfile.municipality], ["CP", selectedFiscalProfile.postalCode]].map(([label, value]) => (
                        <div key={label as string} style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>{label as string}</label>
                          <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "8px", fontSize: "13px", color: "var(--text-color)", border: "1px solid var(--border-color)" }}>{value as string || "-"}</div>
                        </div>
                      ))}
                    </div>

                    {[
                      ["IRPF", `${selectedFiscalProfile.irpf || 0}%`],
                      ["Sufijo del acreedor", selectedFiscalProfile.creditorSuffix],
                      ["IBAN", selectedFiscalProfile.iban],
                      ["BIC/SWIFT", selectedFiscalProfile.bicSwift],
                    ].map(([label, value]) => (
                      <div key={label as string} style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>{label as string}</label>
                        <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "8px", fontSize: "13px", color: "var(--text-color)", border: "1px solid var(--border-color)" }}>{value as string || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FORM MODE: create or edit */}
              {fiscalFormOpen && (
                <div>
                  <h3 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 700, color: "var(--text-color)" }}>
                    {editingFiscalProfile ? "Editar perfil fiscal" : "Nuevo perfil fiscal"}
                  </h3>

                  {/* Entity type toggle */}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                    {["Empresa", "Autónomo"].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFpEntityType(t)}
                        style={{ padding: "8px 20px", borderRadius: "20px", border: "1px solid var(--border-color)", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: fpEntityType === t ? "var(--bg-input)" : "transparent", color: fpEntityType === t ? "var(--text-color)" : "var(--text-secondary)" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Logo upload */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text-color)" }}>Logo</label>
                    {fpLogo && (
                      <div style={{ marginBottom: "8px" }}>
                        <img src={fpLogo} alt="Logo" style={{ maxHeight: "80px", maxWidth: "160px", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
                      </div>
                    )}
                    <div
                      style={{ border: "1.5px dashed var(--border-color)", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "var(--bg-input)" }}
                      onClick={() => fpLogoInputRef.current?.click()}
                    >
                      <span style={{ fontSize: "13px" }}>
                        <span style={{ color: "var(--primary)", cursor: "pointer", textDecoration: "underline" }}>Seleccionar archivo</span>
                        {" "}o arrástralo aquí
                      </span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <input
                      ref={fpLogoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setFpLogo(ev.target?.result as string || "");
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>

                  {/* Form fields */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>Nombre comercial</label>
                    <input type="text" className="input" placeholder="Nombre comercial" value={fpComercialName} onChange={e => setFpComercialName(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>NIF</label>
                    <input type="text" className="input" placeholder="Añadir NIF" value={fpNif} onChange={e => setFpNif(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>Dirección</label>
                    <input type="text" className="input" placeholder="Introduce la dirección" value={fpAddress} onChange={e => setFpAddress(e.target.value)} />
                  </div>

                  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>Municipio</label>
                      <input type="text" className="input" placeholder="Ciudad" value={fpMunicipality} onChange={e => setFpMunicipality(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>CP</label>
                      <input type="text" className="input" placeholder="CP" value={fpPostalCode} onChange={e => setFpPostalCode(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>IRPF</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                      <input type="number" className="input" placeholder="Porcentaje de IRPF" value={fpIrpf} onChange={e => setFpIrpf(e.target.value)} style={{ borderRadius: "8px 0 0 8px", flex: 1 }} />
                      <span style={{ padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderLeft: "none", borderRadius: "0 8px 8px 0", fontSize: "13px", color: "var(--text-secondary)" }}>%</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>Sufijo del acreedor</label>
                    <input type="text" className="input" placeholder="0000" value={fpCreditorSuffix} onChange={e => setFpCreditorSuffix(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>IBAN</label>
                    <input type="text" className="input" placeholder="0000 0000 0000 0000 0000" value={fpIban} onChange={e => setFpIban(e.target.value)} />
                  </div>

                  <div className="form-group" style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "var(--text-color)" }}>BIC/SWIFT</label>
                    <input type="text" className="input" placeholder="AABB1234" value={fpBicSwift} onChange={e => setFpBicSwift(e.target.value)} />
                  </div>

                  {/* Factura Ordinaria */}
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>Factura Ordinaria</h4>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Serie factura ordinaria</label>
                        <select className="input" value={fpSerieFacturaOrdinaria} onChange={e => setFpSerieFacturaOrdinaria(e.target.value)}>
                          <option value="">-</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Serie factura rectificada</label>
                        <select className="input" value={fpSerieRectificadaOrdinaria} onChange={e => setFpSerieRectificadaOrdinaria(e.target.value)}>
                          <option value="">-</option>
                          <option value="R">R</option>
                          <option value="RC">RC</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Simplificada */}
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>Simplificada</h4>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Serie factura simplificada</label>
                        <select className="input" value={fpSerieFacturaSimplificada} onChange={e => setFpSerieFacturaSimplificada(e.target.value)}>
                          <option value="">-</option>
                          <option value="S">S</option>
                          <option value="T">T</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Serie factura rectificada</label>
                        <select className="input" value={fpSerieRectificadaSimplificada} onChange={e => setFpSerieRectificadaSimplificada(e.target.value)}>
                          <option value="">-</option>
                          <option value="RS">RS</option>
                          <option value="RC">RC</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Footer notes */}
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginBottom: "20px" }}>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--primary)", marginBottom: "6px" }}>Comentarios al pie de factura</label>
                      <textarea
                        className="input"
                        placeholder="Ejemplo: Exento de IVA según artículo 20"
                        value={fpFooterNotes}
                        onChange={e => setFpFooterNotes(e.target.value)}
                        rows={3}
                        style={{ resize: "vertical", width: "100%" }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--primary)", marginBottom: "6px" }}>Comentarios al pie de factura simplificada</label>
                      <textarea
                        className="input"
                        placeholder="Ejemplo: Exento de IVA según artículo 20"
                        value={fpFooterNotesSimplified}
                        onChange={e => setFpFooterNotesSimplified(e.target.value)}
                        rows={3}
                        style={{ resize: "vertical", width: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Firma upload */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text-color)" }}>Firma</label>
                    {fpFirma && <img src={fpFirma} alt="Firma" style={{ maxHeight: "60px", marginBottom: "8px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />}
                    <div
                      style={{ border: "1.5px dashed var(--border-color)", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "var(--bg-input)" }}
                      onClick={() => fpFirmaInputRef.current?.click()}
                    >
                      <span style={{ fontSize: "13px" }}>
                        <span style={{ color: "var(--primary)", cursor: "pointer", textDecoration: "underline" }}>Seleccionar archivo</span>
                        {" "}o arrástralo aquí
                      </span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <input ref={fpFirmaInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFpFirma(ev.target?.result as string || ""); r.readAsDataURL(f); }} />
                  </div>

                  {/* Sello upload */}
                  <div style={{ marginBottom: "32px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text-color)" }}>Sello</label>
                    {fpSello && <img src={fpSello} alt="Sello" style={{ maxHeight: "60px", marginBottom: "8px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />}
                    <div
                      style={{ border: "1.5px dashed var(--border-color)", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "var(--bg-input)" }}
                      onClick={() => fpSelloInputRef.current?.click()}
                    >
                      <span style={{ fontSize: "13px" }}>
                        <span style={{ color: "var(--primary)", cursor: "pointer", textDecoration: "underline" }}>Seleccionar archivo</span>
                        {" "}o arrástralo aquí
                      </span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <input ref={fpSelloInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setFpSello(ev.target?.result as string || ""); r.readAsDataURL(f); }} />
                  </div>

                  {/* Cancel / Save buttons */}
                  <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                    <button
                      type="button"
                      onClick={() => { setFiscalFormOpen(false); setEditingFiscalProfile(null); }}
                      style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={fpSaving}
                      onClick={async () => {
                        if (!activeClinic?.id) return;
                        setFpSaving(true);
                        const payload = {
                          clinicId: activeClinic.id,
                          entityType: fpEntityType,
                          comercialName: fpComercialName,
                          nif: fpNif,
                          address: fpAddress,
                          municipality: fpMunicipality,
                          postalCode: fpPostalCode,
                          logo: fpLogo,
                          irpf: parseFloat(fpIrpf) || 0,
                          creditorSuffix: fpCreditorSuffix,
                          iban: fpIban,
                          bicSwift: fpBicSwift,
                          serieFacturaOrdinaria: fpSerieFacturaOrdinaria,
                          serieRectificadaOrdinaria: fpSerieRectificadaOrdinaria,
                          serieFacturaSimplificada: fpSerieFacturaSimplificada,
                          serieRectificadaSimplificada: fpSerieRectificadaSimplificada,
                          footerNotes: fpFooterNotes,
                          footerNotesSimplified: fpFooterNotesSimplified,
                          firma: fpFirma,
                          sello: fpSello,
                        };
                        try {
                          let saved: any;
                          if (editingFiscalProfile) {
                            const res = await fetch(`/api/fiscal-profiles/${editingFiscalProfile.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            });
                            saved = await res.json();
                            setFiscalProfiles(prev => prev.map(f => f.id === saved.id ? saved : f));
                          } else {
                            const res = await fetch("/api/fiscal-profiles", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            });
                            saved = await res.json();
                            setFiscalProfiles(prev => [...prev, saved]);
                          }
                          setSelectedFiscalProfile(saved);
                          setFiscalFormOpen(false);
                          setEditingFiscalProfile(null);
                        } catch (err) {
                          console.error(err);
                          alert("Error al guardar el perfil fiscal.");
                        } finally {
                          setFpSaving(false);
                        }
                      }}
                      style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: fpSaving ? "not-allowed" : "pointer", opacity: fpSaving ? 0.7 : 1 }}
                    >
                      {fpSaving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!fiscalFormOpen && !selectedFiscalProfile && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "16px", opacity: 0.4 }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  <p style={{ fontSize: "14px" }}>Selecciona o crea un perfil fiscal</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFiscalFormOpen(true);
                      setFpEntityType("Empresa"); setFpComercialName(""); setFpNif("");
                      setFpAddress(""); setFpMunicipality(""); setFpPostalCode("");
                      setFpLogo(""); setFpIrpf(""); setFpCreditorSuffix("0000");
                      setFpIban(""); setFpBicSwift("");
                      setFpSerieFacturaOrdinaria(""); setFpSerieRectificadaOrdinaria("");
                      setFpSerieFacturaSimplificada(""); setFpSerieRectificadaSimplificada("");
                      setFpFooterNotes(""); setFpFooterNotesSimplified(""); setFpFirma(""); setFpSello("");
                    }}
                    style={{ marginTop: "12px", padding: "10px 24px", borderRadius: "8px", border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                  >
                    + Crear nuevo perfil fiscal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: NOTIFICACIONES (Recordatorios) */}
        {activeTab === "notifications" && (
          <div style={{ display: "flex", gap: "24px", minHeight: "600px", padding: "16px" }}>
            {/* Sidebar de notificaciones (izquierda) */}
            <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
              {(["recordatorios", "notificaciones", "logs", "config", "whatsapp"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setNotificationsSubTab(t);
                    setShowReminderForm(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: notificationsSubTab === t ? 600 : 400,
                    background: notificationsSubTab === t ? "var(--bg-input)" : "transparent",
                    color: notificationsSubTab === t ? "var(--primary)" : "var(--text-secondary)",
                    border: "1px solid " + (notificationsSubTab === t ? "var(--border-color)" : "transparent"),
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {t === "recordatorios" ? "Recordatorios" :
                   t === "notificaciones" ? "Notificaciones" :
                   t === "logs" ? "Registro de envíos" :
                   t === "config" ? "Configuración" : "Conexión WhatsApp"}
                </button>
              ))}
            </div>

            {/* Contenedor principal derecho */}
            <div style={{ flex: 1, borderLeft: "1px solid var(--border-color)", paddingLeft: "24px" }}>
              
              {/* SUBTAB 1 & 2: RECORDATORIOS Y NOTIFICACIONES (CRUD COMPARTE FORMULARIO) */}
              {(notificationsSubTab === "recordatorios" || notificationsSubTab === "notificaciones") && (
                <div>
                  {showReminderForm ? (
                    // FORMULARIO CREACIÓN/EDICIÓN
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setShowReminderForm(false)}
                          style={{ padding: "6px 14px", fontSize: "12px" }}
                        >
                          ‹ Volver
                        </button>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {editingReminder && (
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleDeleteReminder(editingReminder.id)}
                              style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "6px 12px", cursor: "pointer" }}
                            >
                              Eliminar
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveReminder}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        {/* Configuración izquierda */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>
                              {isReminderSystemForm ? "Nombre de la notificación *" : "Nombre del recordatorio *"}
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={reminderFormName}
                              onChange={(e) => setReminderFormName(e.target.value)}
                              placeholder={isReminderSystemForm ? "Ej. Notificación Administrador" : "Ej. Recordatorio Cita 24h"}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Canal</label>
                            <select
                              className="input select"
                              value={reminderFormChannel}
                              onChange={(e) => {
                                const chan = e.target.value;
                                setReminderFormChannel(chan);
                                if (chan === "WHATSAPP") {
                                  // Asignar plantilla por defecto para Whatsapp automático
                                  setReminderFormTemplateId("standard");
                                  setReminderFormMessage("Hola {nombre} le recordamos que el {FechayHora} tiene una cita en {direcciónClínica}. {NombreClínica}");
                                } else {
                                  setReminderFormTemplateId("");
                                }
                              }}
                            >
                              {isReminderSystemForm ? (
                                <>
                                  <option value="EMAIL">Email</option>
                                  <option value="WHATSAPP">Whatsapp</option>
                                  <option value="SMS">SMS</option>
                                </>
                              ) : (
                                <>
                                  <option value="WHATSAPP_MANUAL">Whatsapp Manual</option>
                                  <option value="EMAIL">Email (Automático)</option>
                                  <option value="WHATSAPP">Whatsapp (Automático)</option>
                                  <option value="SMS">SMS (Automático)</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Condición</label>
                            <select
                              className="input select"
                              value={reminderFormCondition}
                              onChange={(e) => setReminderFormCondition(e.target.value)}
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="CONFIRMED">Confirmadas</option>
                              <option value="CANCELLED">Cancelada</option>
                              <option value="COMPLETED">Completada</option>
                              <option value="ABSENT">Ausente</option>
                            </select>
                          </div>

                          {/* Cuando se enviará la notificación (Solo para notificaciones de administración / isSystem) */}
                          {isReminderSystemForm ? (
                            <div className="form-group">
                              <label className="form-label" style={{ fontWeight: 600 }}>Cuando se enviará la notificación</label>
                              <select
                                className="input select"
                                value={reminderFormTriggerWhen}
                                onChange={(e) => setReminderFormTriggerWhen(e.target.value)}
                              >
                                <option value="BOTH">Al crear cita o modificar estado</option>
                                <option value="STATUS_ONLY">Solo al modificar estado</option>
                              </select>
                            </div>
                          ) : (
                            /* Enviar recordatorio (Solo para recordatorios a pacientes) */
                            <div className="form-group">
                              <label className="form-label" style={{ fontWeight: 600 }}>Enviar recordatorio</label>
                              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <select
                                  className="input select"
                                  value={reminderFormHours}
                                  onChange={(e) => setReminderFormHours(e.target.value)}
                                  style={{ width: "120px" }}
                                >
                                  {Array.from({ length: 49 }, (_, i) => (
                                    <option key={i} value={i}>{i} Horas</option>
                                  ))}
                                </select>
                                <select
                                  className="input select"
                                  value={reminderFormMinutes}
                                  onChange={(e) => setReminderFormMinutes(e.target.value)}
                                  style={{ width: "120px" }}
                                >
                                  <option value="0">0 Minutos</option>
                                  <option value="15">15 Minutos</option>
                                  <option value="30">30 Minutos</option>
                                  <option value="45">45 Minutos</option>
                                </select>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)" }}>ANTES</span>
                              </div>
                            </div>
                          )}

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Consultas</label>
                            <select className="input select" defaultValue="all">
                              <option value="all">Todos seleccionados</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Servicios</label>
                            <div style={{ marginBottom: "8px" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                                <input
                                  type="checkbox"
                                  checked={reminderFormAllServices}
                                  onChange={(e) => setReminderFormAllServices(e.target.checked)}
                                />
                                Todos los servicios
                              </label>
                            </div>
                            {!reminderFormAllServices && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px" }}>
                                {services.map((srv) => (
                                  <label key={srv.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                                    <input
                                      type="checkbox"
                                      checked={reminderFormServiceIds.includes(srv.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setReminderFormServiceIds([...reminderFormServiceIds, srv.id]);
                                        } else {
                                          setReminderFormServiceIds(reminderFormServiceIds.filter(id => id !== srv.id));
                                        }
                                      }}
                                    />
                                    {srv.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Editor de mensaje derecha */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {isReminderSystemForm ? (
                            /* Las notificaciones administrativas tienen mensajes automáticos definidos por sistema */
                            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", fontSize: "13px", height: "100%" }}>
                              <h5 style={{ fontWeight: 600, margin: "0 0 8px" }}>Plantilla de Notificación al Personal</h5>
                              <p style={{ color: "var(--text-secondary)", margin: "0 0 16px", fontSize: "12px" }}>
                                Este canal enviará una alerta automática al equipo administrativo seleccionado cuando ocurra la condición.
                              </p>
                              <div style={{ background: "var(--bg-app)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "12px", fontFamily: "monospace" }}>
                                [CLIFAV AVISO] Se ha registrado o actualizado la cita de {"{Paciente}"} para el servicio {"{Servicio}"} con estado {"{Estado}"}.
                              </div>
                            </div>
                          ) : reminderFormChannel === "WHATSAPP" ? (
                            /* WHATSAPP AUTOMÁTICO - SELECTOR DE MENSAJES PREDISEÑADOS OFICIALES Y ADVERTENCIA DE COSTES */
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Selecciona un mensaje</label>
                                <select
                                  className="input select"
                                  value={reminderFormTemplateId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setReminderFormTemplateId(val);
                                    if (val === "standard") {
                                      setReminderFormMessage("Hola {nombre} le recordamos que el {FechayHora} tiene una cita en {direcciónClínica}. {NombreClínica}");
                                    } else if (val === "confirmation") {
                                      setReminderFormMessage("Hola {nombre}, su cita para {servicio} el {FechayHora} ha sido confirmada con éxito.");
                                    }
                                  }}
                                >
                                  <option value="standard">Recordatorio</option>
                                  <option value="confirmation">Confirmación de cita</option>
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Mensaje</label>
                                <div style={{
                                  background: "var(--bg-input)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "6px",
                                  padding: "16px",
                                  fontSize: "13px",
                                  minHeight: "150px",
                                  color: "var(--text-primary)",
                                  lineHeight: "1.5"
                                }}>
                                  {reminderFormMessage}
                                </div>
                              </div>

                              <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "8px" }}>
                                Precio por WhatsApp enviado <strong>0,06 € + IVA</strong>
                              </div>
                            </div>
                          ) : (
                            /* EDITABLE MANUAL (WHATSAPP MANUAL O EMAIL) */
                            <div className="form-group" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Mensaje de la plantilla</label>
                                
                                {/* Dropdown de Variables */}
                                <div style={{ position: "relative" }}>
                                  <select
                                    className="input select"
                                    style={{ padding: "4px 8px", fontSize: "11px", width: "160px" }}
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const textarea = document.getElementById("reminder-message-textarea") as HTMLTextAreaElement;
                                        if (textarea) {
                                          const start = textarea.selectionStart;
                                          const end = textarea.selectionEnd;
                                          const text = reminderFormMessage;
                                          const before = text.substring(0, start);
                                          const after = text.substring(end, text.length);
                                          setReminderFormMessage(before + e.target.value + after);
                                          setTimeout(() => {
                                            textarea.focus();
                                            textarea.selectionStart = textarea.selectionEnd = start + e.target.value.length;
                                          }, 50);
                                        } else {
                                          setReminderFormMessage(prev => prev + e.target.value);
                                        }
                                        e.target.value = ""; // Reset
                                      }
                                    }}
                                  >
                                    <option value="" disabled>Variables ▾</option>
                                    <optgroup label="Cliente">
                                      <option value="{{Cliente:Nombre}}">Nombre</option>
                                      <option value="{{Cliente:Apellidos}}">Apellidos</option>
                                      <option value="{{Cliente:Dirección_Cliente}}">Dirección Cliente</option>
                                    </optgroup>
                                    <optgroup label="Consulta">
                                      <option value="{{Nombre_Consulta}}">Nombre Consulta</option>
                                      <option value="{{Dirección_Consulta}}">Dirección Consulta</option>
                                    </optgroup>
                                    <optgroup label="Cita">
                                      <option value="{{Fecha_Hora_Cita}}">Fecha y Hora Cita</option>
                                      <option value="{{Fecha_larga}}">Fecha larga</option>
                                      <option value="{{Hora_Cita}}">Hora Cita</option>
                                      <option value="{{Nombre_Servicio}}">Nombre Servicio</option>
                                      <option value="{{Link_VideoConsulta}}">Link VideoConsulta</option>
                                      <option value="{{Link_Cancelar_Cita}}">Link Cancelar Cita</option>
                                      <option value="{{Link_Mover_Cita}}">Link Mover Cita</option>
                                      <option value="{{Link_Confirmar_Cita}}">Link Confirmar Cita</option>
                                      <option value="{{Link_Pago_Online}}">Link Pago Online</option>
                                      <option value="{{Recurso}}">Recurso</option>
                                      <option value="{{Zona_horaria}}">Zona Horaria</option>
                                    </optgroup>
                                    <optgroup label="Empleado">
                                      <option value="{{Empleado_Nombre_Completo}}">Nombre Completo</option>
                                      <option value="{{Empleado_Nombre}}">Nombre</option>
                                      <option value="{{Empleado_Apellidos}}">Apellidos</option>
                                      <option value="{{Empleado_Correo}}">Correo</option>
                                      <option value="{{Empleado_DNI}}">DNI</option>
                                      <option value="{{Empleado_Teléfono}}">Teléfono</option>
                                    </optgroup>
                                    <optgroup label="Otro">
                                      <option value="{{Deuda}}">Deuda</option>
                                    </optgroup>
                                  </select>
                                </div>
                              </div>

                              <textarea
                                id="reminder-message-textarea"
                                className="textarea"
                                value={reminderFormMessage}
                                onChange={(e) => setReminderFormMessage(e.target.value)}
                                placeholder="Escribe el mensaje del recordatorio aquí..."
                                style={{ width: "100%", height: "280px", fontFamily: "inherit", fontSize: "13px", resize: "none", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "6px" }}
                              />
                              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                Las variables con doble llave <code>{"{{...}}"}</code> se sustituirán dinámicamente con los datos correspondientes.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // VISTA GENERAL: LISTADO Y BUSCADOR (FILTRADO POR RECORDATORIO O NOTIFICACIÓN INTERNA)
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleOpenReminderForm(null, notificationsSubTab === "notificaciones")}
                        >
                          Crear
                        </button>
                        <div style={{ position: "relative", width: "260px" }}>
                          <input
                            type="text"
                            className="input"
                            placeholder={notificationsSubTab === "notificaciones" ? "Buscar notificaciones..." : "Buscar recordatorios..."}
                            value={searchReminderQuery}
                            onChange={(e) => setSearchReminderQuery(e.target.value)}
                            style={{ paddingRight: "30px", fontSize: "13px" }}
                          />
                        </div>
                      </div>

                      {loadingReminders ? (
                        <div style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>Cargando...</div>
                      ) : reminders.filter(r => (notificationsSubTab === "notificaciones" ? r.isSystem : !r.isSystem) && r.name.toLowerCase().includes(searchReminderQuery.toLowerCase())).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                          {notificationsSubTab === "notificaciones" 
                            ? 'No hay notificaciones de sistema creadas. ¡Haz clic en "Crear" para añadir una!'
                            : 'No hay recordatorios creados. ¡Haz clic en "Crear" para añadir el primero!'
                          }
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {reminders
                            .filter(r => (notificationsSubTab === "notificaciones" ? r.isSystem : !r.isSystem) && r.name.toLowerCase().includes(searchReminderQuery.toLowerCase()))
                            .map((r) => (
                              <div
                                key={r.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  background: "var(--bg-input)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "8px",
                                  padding: "16px 20px"
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{r.name}</div>
                                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", display: "flex", gap: "12px" }}>
                                    <span><strong>Canal:</strong> {r.channel === "WHATSAPP_MANUAL" ? "WhatsApp Manual" : r.channel}</span>
                                    {!r.isSystem && <span><strong>Antelación:</strong> {r.hoursBefore}h {r.minutesBefore}m antes</span>}
                                    {r.isSystem && <span><strong>Frecuencia:</strong> {r.triggerWhen === "BOTH" ? "Al crear/modificar" : "Solo modificar"}</span>}
                                    <span><strong>Condición:</strong> {r.condition}</span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                  {/* Toggle Habilitado */}
                                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                                    <input
                                      type="checkbox"
                                      checked={r.enabled}
                                      onChange={() => handleToggleReminderEnabled(r)}
                                      style={{ marginRight: "6px" }}
                                    />
                                    <span style={{ fontSize: "12px", fontWeight: 500 }}>Activo</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReminderForm(r, notificationsSubTab === "notificaciones")}
                                    style={{ padding: "4px 10px", fontSize: "12px", background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", color: "var(--text-primary)" }}
                                  >
                                    Editar
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: REGISTRO DE ENVÍOS */}
              {notificationsSubTab === "logs" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Historial de Notificaciones Enviadas</h4>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleTriggerRemindersCron}
                      style={{ padding: "6px 14px", fontSize: "12px", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      ⚡ Simular Envíos Automáticos
                    </button>
                  </div>

                  
                  {loadingReminderLogs ? (
                    <div style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>Cargando historial de envíos...</div>
                  ) : reminderLogs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                      El registro de envíos está vacío.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="table" style={{ fontSize: "12px", width: "100%" }}>
                        <thead>
                          <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                            <th style={{ padding: "10px" }}>Paciente</th>
                            <th style={{ padding: "10px" }}>Destinatario</th>
                            <th style={{ padding: "10px" }}>Canal</th>
                            <th style={{ padding: "10px" }}>Mensaje</th>
                            <th style={{ padding: "10px" }}>Fecha Envió</th>
                            <th style={{ padding: "10px" }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reminderLogs.map((log: any) => (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "10px" }}><strong>{log.clientName}</strong></td>
                              <td style={{ padding: "10px" }}>{log.recipient}</td>
                              <td style={{ padding: "10px" }}>
                                <span style={{
                                  padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                                  background: log.channel === "WHATSAPP_MANUAL" ? "rgba(34,197,94,0.12)" : log.channel === "WHATSAPP" ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.12)",
                                  color: log.channel === "WHATSAPP_MANUAL" ? "#22c55e" : log.channel === "WHATSAPP" ? "#16a34a" : "#6366f1"
                                }}>
                                  {log.channel === "WHATSAPP_MANUAL" ? "WhatsApp Manual" : log.channel === "WHATSAPP" ? "WhatsApp Auto" : log.channel}
                                </span>
                              </td>
                              <td style={{ padding: "10px", maxHeight: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }} title={log.message}>
                                {log.message}
                              </td>
                              <td style={{ padding: "10px" }}>{new Date(log.sentAt).toLocaleString("es-ES")}</td>
                              <td style={{ padding: "10px" }}>
                                <span style={{
                                  padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                                  background: log.status === "SENT" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                                  color: log.status === "SENT" ? "#10b981" : "#ef4444"
                                }}>
                                  {log.status === "SENT" ? "Enviado" : "Fallido"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: CONFIGURACIÓN GENERAL (CON SUBPESTAÑAS AVISOS / OTROS) */}
              {notificationsSubTab === "config" && (
                <div style={{ padding: "8px 0" }}>
                  {/* Header de Configuración con Botón Guardar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setConfigSubTab("avisos")}
                        style={{
                          padding: "6px 16px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                          background: configSubTab === "avisos" ? "var(--primary)" : "var(--bg-input)",
                          color: configSubTab === "avisos" ? "#fff" : "var(--text-primary)"
                        }}
                      >
                        Avisos
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigSubTab("otros")}
                        style={{
                          padding: "6px 16px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                          background: configSubTab === "otros" ? "var(--primary)" : "var(--bg-input)",
                          color: configSubTab === "otros" ? "#fff" : "var(--text-primary)"
                        }}
                      >
                        Otros
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveNotificationConfig}
                    >
                      Guardar
                    </button>
                  </div>

                  {/* SUBTAB AVISOS: SWITCH TOGGLE Y CHECKBOXES DE EMPLEADOS */}
                  {configSubTab === "avisos" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={configNotifyAssignedUser}
                          onChange={(e) => setConfigNotifyAssignedUser(e.target.checked)}
                          style={{ width: "16px", height: "16px" }}
                        />
                        Al Usuario Relacionado
                      </label>

                      <div style={{ marginTop: "8px" }}>
                        <label className="form-label" style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>
                          Selecciona los usuarios administrativos que recibirán las copias de avisos:
                        </label>
                        <div style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          padding: "16px",
                          maxHeight: "300px",
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px"
                        }}>
                          {staff.map((u: any) => (
                            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={configAdminNotificationUserIds.includes(u.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setConfigAdminNotificationUserIds([...configAdminNotificationUserIds, u.id]);
                                  } else {
                                    setConfigAdminNotificationUserIds(configAdminNotificationUserIds.filter(id => id !== u.id));
                                  }
                                }}
                              />
                              <span>
                                <strong>{u.name} {u.lastName || ""}</strong> ({u.email})
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB OTROS: EMAIL EMISOR Y WHATSAPP POR DEFECTO */}
                  {configSubTab === "otros" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "450px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Email emisor</label>
                        <input
                          type="email"
                          className="input"
                          value={configSenderEmail}
                          onChange={(e) => setConfigSenderEmail(e.target.value)}
                          placeholder="noreply@clinica.com"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Whatsapp por defecto</label>
                        <select
                          className="input select"
                          value={configDefaultWhatsappMode}
                          onChange={(e) => setConfigDefaultWhatsappMode(e.target.value)}
                        >
                          <option value="Web">Web (WhatsApp Web en navegador)</option>
                          <option value="App">App (WhatsApp Desktop / Móvil)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {notificationsSubTab === "whatsapp" && (
                <div style={{ padding: "8px 0", animation: "fadeIn 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                    <div>
                      <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "var(--text-primary)" }}>
                        <span>💬</span> Conexión WhatsApp Multi-Clínica
                      </h2>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "600px" }}>
                        Conecta el número de WhatsApp de tu clínica escaneando el código QR con tu móvil (Dispositivos Vinculados) para enviar recordatorios de citas automáticos.
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: whatsappConnected ? "rgba(46, 125, 50, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: whatsappConnected ? "#2e7d32" : "#ef4444",
                        border: "1px solid " + (whatsappConnected ? "rgba(46, 125, 50, 0.3)" : "rgba(239, 68, 68, 0.3)")
                      }}>
                        <span style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: whatsappConnected ? "#4caf50" : "#f44336",
                          boxShadow: whatsappConnected ? "0 0 10px #4caf50" : "none",
                          animation: whatsappConnected ? "pulse 2s infinite" : "none"
                        }}></span>
                        {whatsappConnected ? "CONECTADO" : "DESCONECTADO"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "32px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* Panel Izquierdo: Configuración de Credenciales */}
                    <div style={{ flex: "1 1 350px", background: "var(--bg-panel-solid)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px" }}>
                      <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        ⚙️ Ajustes de la Instancia
                      </h3>

                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>URL de la API de WhatsApp</label>
                        <input
                          type="text"
                          className="input"
                          value={whatsappApiUrl}
                          onChange={(e) => setWhatsappApiUrl(e.target.value)}
                          placeholder="Ej: https://mi-evolution-api.up.railway.app"
                        />
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          Deja vacío para usar el servidor central por defecto.
                        </p>
                      </div>

                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Nombre de la Instancia (Instance Name)</label>
                        <input
                          type="text"
                          className="input"
                          value={whatsappInstanceName}
                          onChange={(e) => setWhatsappInstanceName(e.target.value)}
                          placeholder={`Ej: clinic-${activeClinic?.id.slice(0, 8)}`}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Token de Acceso (API Key / apikey)</label>
                        <input
                          type="password"
                          className="input"
                          value={whatsappApiToken}
                          onChange={(e) => setWhatsappApiToken(e.target.value)}
                          placeholder="Introduce el API Token de tu pasarela"
                        />
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleSaveWhatsappCredentials}
                          disabled={checkingWhatsappStatus}
                          style={{ flex: 1 }}
                        >
                          Guardar Ajustes
                        </button>
                      </div>
                    </div>

                    {/* Panel Derecho: Escanear QR / Estado Conexión */}
                    <div style={{ flex: "1 1 350px", background: "var(--bg-panel-solid)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "330px" }}>
                      
                      {whatsappConnected ? (
                        <div style={{ textAlign: "center", padding: "24px" }}>
                          <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>✅</span>
                          <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#2e7d32", margin: "0 0 8px" }}>
                            ¡WhatsApp Conectado!
                          </h4>
                          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 24px", maxWidth: "280px" }}>
                            Tu sistema está listo. Los recordatorios automáticos de citas serán enviados directamente desde tu número de teléfono vinculado.
                          </p>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={handleCheckWhatsappStatus}
                              disabled={checkingWhatsappStatus}
                              style={{ fontSize: "12px" }}
                            >
                              Verificar Estado
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={handleDisconnectWhatsapp}
                              disabled={checkingWhatsappStatus}
                              style={{ background: "#ef4444", color: "#fff", border: "none", fontSize: "12px" }}
                            >
                              Desconectar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", textAlign: "center" }}>
                          {whatsappQrCode ? (
                            <div style={{ padding: "12px", background: "#fff", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", marginBottom: "16px" }}>
                              <img
                                src={whatsappQrCode}
                                alt="Código QR de WhatsApp"
                                style={{ width: "200px", height: "200px", display: "block" }}
                              />
                            </div>
                          ) : (
                            <div style={{ padding: "24px", color: "var(--text-secondary)" }}>
                              <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>📱</span>
                              <p style={{ fontSize: "12px", margin: "0 0 16px", maxWidth: "260px" }}>
                                Haz clic abajo para generar el código QR de conexión y vincular tu número.
                              </p>
                            </div>
                          )}

                          {whatsappStatusMessage && (
                            <p style={{
                              fontSize: "12px",
                              fontWeight: 500,
                              margin: "0 0 16px",
                              color: whatsappStatusMessage.includes("Error") ? "#ef4444" : "var(--text-primary)",
                              maxWidth: "300px"
                            }}>
                              {whatsappStatusMessage}
                            </p>
                          )}

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleGetWhatsappQr}
                              disabled={checkingWhatsappStatus}
                              style={{ fontSize: "12px" }}
                            >
                              {whatsappQrCode ? "Actualizar QR" : "Generar Código QR"}
                            </button>

                            {whatsappQrCode && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCheckWhatsappStatus}
                                disabled={checkingWhatsappStatus}
                                style={{ fontSize: "12px" }}
                              >
                                {checkingWhatsappStatus ? "Verificando..." : "Ya he escaneado"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>




      {/* MODAL ELIMINAR RECORDATORIO/NOTIFICACION */}
      {reminderToDelete && typeof window !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setReminderToDelete(null)}
        >
          <div
            style={{ background: "var(--bg-panel-solid)", borderRadius: "12px", width: "420px", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid var(--border-color)", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>
              🗑️ {isReminderSystemForm ? "Eliminar Notificación" : "Eliminar Recordatorio"}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: "1.5" }}>
              ¿Estás seguro de que deseas eliminar {isReminderSystemForm ? "esta notificación" : "este recordatorio"}? Esta acción es irreversible.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReminderToDelete(null)}
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={executeDeleteReminder}
                style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", fontSize: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ELIMINAR PRODUCTO DE INVENTARIO */}
      {productToDelete && typeof window !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            style={{ background: "var(--bg-panel-solid)", borderRadius: "12px", width: "420px", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid var(--border-color)", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>
              🗑️ Eliminar Insumo
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: "1.5" }}>
              ¿Estás seguro de que deseas eliminar este insumo del inventario? Esta acción es irreversible y afectará a las relaciones de servicios asociados.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProductToDelete(null)}
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={executeDeleteProduct}
                style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", fontSize: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL AJUSTE MANUAL RAPIDO DE STOCK */}
      {showStockAdjustModal && typeof window !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowStockAdjustModal(null)}
        >
          <div
            style={{ background: "var(--bg-panel-solid)", borderRadius: "12px", width: "420px", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid var(--border-color)", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}>
              ⚡ Ajustar Stock: {showStockAdjustModal.name}
            </h3>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Cantidad a Ajustar *</label>
              <input
                type="number"
                className="input"
                placeholder="Ej. 10 para añadir, -5 para descontar"
                value={stockAdjustmentVal}
                onChange={(e) => setStockAdjustmentVal(e.target.value)}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                Stock actual: <strong>{showStockAdjustModal.stock} uds</strong>.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Razón / Motivo del ajuste</label>
              <input
                type="text"
                className="input"
                placeholder="Ej. Entrada por compra, Muestra rota, etc."
                value={stockAdjustmentReason}
                onChange={(e) => setStockAdjustmentReason(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowStockAdjustModal(null)}
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteStockAdjustment}
                style={{ padding: "8px 16px", fontSize: "12px" }}
              >
                Ejecutar Ajuste
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PAPELERA LOGS MODAL */}
      {showPapeleraLogsModal && typeof window !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowPapeleraLogsModal(false)}
        >
          <div
            style={{ background: "var(--bg-panel-solid)", borderRadius: "12px", width: "520px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>📋 Historial de la cita</h3>
              <button type="button" onClick={() => setShowPapeleraLogsModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
              {loadingPapeleraLogs ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  <div style={{ width: 18, height: 18, border: "2px solid var(--border-color)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Cargando logs...
                </div>
              ) : papeleraLogs.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No hay eventos registrados.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {papeleraLogs.map((log: any, idx: number) => {
                    const colors: Record<string, string> = { CREATED: "#10b981", STATUS_CHANGED: "#6366f1", RESCHEDULED: "#f59e0b", STAFF_CHANGED: "#0ea5e9", SERVICE_CHANGED: "#8b5cf6", NOTES_CHANGED: "#64748b", DELETED: "#ef4444", RESTORED: "#10b981" };
                    const labels: Record<string, string> = { CREATED: "✨ Cita creada", STATUS_CHANGED: "🔄 Estado cambiado", RESCHEDULED: "📅 Reprogramada", STAFF_CHANGED: "👤 Profesional cambiado", SERVICE_CHANGED: "🔧 Servicio cambiado", NOTES_CHANGED: "📝 Notas actualizadas", DELETED: "🗑️ Enviada a papelera", RESTORED: "♻️ Restaurada" };
                    const color = colors[log.action] || "var(--text-secondary)";
                    const isLast = idx === papeleraLogs.length - 1;
                    return (
                      <div key={log.id} style={{ display: "flex", gap: "14px", minHeight: "56px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                            {(labels[log.action] || "📋").split(" ")[0]}
                          </div>
                          {!isLast && <div style={{ width: 2, flex: 1, background: "var(--border-color)", margin: "3px 0" }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: "16px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", paddingTop: "5px" }}>
                            {(labels[log.action] || log.action).replace(/^[^\s]+ /, "")}
                          </div>
                          {(log.previousValue || log.newValue) && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px", fontSize: "12px" }}>
                              {log.previousValue && <span style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "2px 8px", borderRadius: "4px", textDecoration: "line-through" }}>{log.previousValue}</span>}
                              {log.previousValue && log.newValue && <span style={{ color: "var(--text-secondary)" }}>→</span>}
                              {log.newValue && <span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "2px 8px", borderRadius: "4px", fontWeight: 500 }}>{log.newValue}</span>}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                            {log.userName && <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)", background: "var(--bg-input)", padding: "1px 8px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>{log.userName}</span>}
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              {new Date(log.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCreateStaffDrawer && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => { setShowCreateStaffDrawer(false); setCreateStaffActiveTab(null); }}>
          <div 
            className={styles.drawer} 
            style={{ 
              width: createStaffActiveTab ? "880px" : "440px", 
              transition: "width 0.25s ease",
              display: "flex",
              flexDirection: "row"
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT SIDE: Options menu */}
            <div style={{ width: "440px", height: "100%", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div className={styles.drawerHeader}>
                <h2>Añadir nuevo empleado</h2>
                <button 
                  type="button" 
                  className={styles.drawerCloseBtn} 
                  onClick={() => { setShowCreateStaffDrawer(false); setCreateStaffActiveTab(null); }}
                >
                  <Icons.Close size={20} />
                </button>
              </div>
              <div className={styles.drawerBody} style={{ gap: "8px" }}>
                {/* Datos generales option */}
                <div 
                  className={`${styles.drawerMenuOption} ${createStaffActiveTab === "generales" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setCreateStaffActiveTab("generales")}
                >
                  <div className={styles.optionLeft}>
                    <Icons.Users size={18} />
                    <span>Datos generales</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>

                {/* Permisos option */}
                <div 
                  className={`${styles.drawerMenuOption} ${createStaffActiveTab === "permisos" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setCreateStaffActiveTab("permisos")}
                >
                  <div className={styles.optionLeft}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Permisos</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>

                {/* Consultas option */}
                <div 
                  className={`${styles.drawerMenuOption} ${createStaffActiveTab === "consultas" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setCreateStaffActiveTab("consultas")}
                >
                  <div className={styles.optionLeft}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>Consultas</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Sub-menu details form */}
            {createStaffActiveTab && (
              <form onSubmit={handleCreateStaff} style={{ width: "440px", height: "100%", display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-color)", flexShrink: 0 }}>
                <div className={styles.drawerHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button 
                      type="button" 
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      onClick={() => setCreateStaffActiveTab(null)}
                    >
                      <Icons.Menu size={18} />
                    </button>
                    <h2 style={{ textTransform: "capitalize" }}>
                      {createStaffActiveTab === "generales" ? "Datos generales" : createStaffActiveTab}
                    </h2>
                  </div>
                  <button 
                    type="button" 
                    className={styles.drawerCloseBtn} 
                    onClick={() => { setShowCreateStaffDrawer(false); setCreateStaffActiveTab(null); }}
                  >
                    <Icons.Close size={20} />
                  </button>
                </div>

                {createStaffActiveTab === "generales" ? (
                  <>
                    <div className={styles.drawerBody} style={{ gap: "10px", padding: "16px 20px" }}>
                      {/* Nombre */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Nombre *</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                          placeholder="Nombre"
                          required
                        />
                      </div>

                      {/* Apellido */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Apellido *</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffLastName}
                          onChange={(e) => setNewStaffLastName(e.target.value)}
                          placeholder="Apellido"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Email *</label>
                        <input
                          type="email"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffEmail}
                          onChange={(e) => setNewStaffEmail(e.target.value)}
                          placeholder="Email"
                          required
                        />
                      </div>

                      {/* Contraseña */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Contraseña *</label>
                        <input
                          type="password"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          placeholder="Contraseña"
                          required
                        />
                      </div>

                      {/* DNI */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>DNI / NIF</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffDniNif}
                          onChange={(e) => setNewStaffDniNif(e.target.value)}
                          placeholder="DNI"
                        />
                      </div>

                      {/* Teléfono */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Teléfono</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffPhone}
                          onChange={(e) => setNewStaffPhone(e.target.value)}
                          placeholder="Teléfono"
                        />
                      </div>

                      {/* Dirección */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Dirección</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffAddress}
                          onChange={(e) => setNewStaffAddress(e.target.value)}
                          placeholder="Dirección"
                        />
                      </div>

                      {/* Ciudad */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Ciudad</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffMunicipality}
                          onChange={(e) => setNewStaffMunicipality(e.target.value)}
                          placeholder="Ciudad / Municipio"
                        />
                      </div>

                      {/* Cód. postal */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Cód. postal</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffPostalCode}
                          onChange={(e) => setNewStaffPostalCode(e.target.value)}
                          placeholder="Cód. postal"
                        />
                      </div>

                      {/* Dato adicional */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Dato adicional</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffAdditionalData}
                          onChange={(e) => setNewStaffAdditionalData(e.target.value)}
                          placeholder="Dato adicional"
                        />
                      </div>

                      {/* Rol */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Rol *</label>
                        <select
                          className="input select"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={newStaffRole}
                          onChange={(e) => setNewStaffRole(e.target.value)}
                          required
                        >
                          <option value="ADMIN">Administrador</option>
                          <option value="DOCTOR">Médico / Doctor</option>
                          <option value="THERAPIST">Fisioterapeuta / Terapeuta</option>
                          <option value="RECEPTIONIST">Recepcionista</option>
                        </select>
                      </div>

                      {/* Color Picker Row */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Color en agenda</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {["#bee3f8", "#3b82f6", "#2b6cb0", "#805ad5", "#dd6b20", "#ecc94b", "#48bb78", "#fbb6ce", "#ffffff", "#e2e8f0"].map((c) => (
                            <div 
                              key={c}
                              className={`${styles.colorCircle} ${newStaffColor === c ? styles.colorCircleActive : ""}`}
                              style={{ 
                                width: "24px", 
                                height: "24px", 
                                backgroundColor: c, 
                                border: c === "#ffffff" ? "1px solid var(--border-color)" : (newStaffColor === c ? "2px solid var(--primary)" : "none"),
                                boxSizing: "border-box"
                              }}
                              onClick={() => setNewStaffColor(c)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : createStaffActiveTab === "permisos" ? (
                  <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px 24px", overflowY: "visible", position: "relative" }}>
                    {/* Render permissions selection */}
                    {Object.entries({
                      agenda: {
                        title: "AGENDA",
                        options: [
                          "Sus agendas",
                          "Sus agendas y recursos",
                          "Ver todas las agendas",
                          "No eliminar citas",
                          "Sólo lectura",
                          "Personalizado"
                        ]
                      },
                      clientes: {
                        title: "CLIENTES",
                        options: [
                          "Ver clientes",
                          "Ver datos personales",
                          "Ver documentos",
                          "Formularios",
                          "Seguimientos",
                          "Gestión de permisos",
                          "Editar clientes",
                          "Eliminar clientes",
                          "Permitir descargar clientes",
                          "Artículos"
                        ]
                      },
                      configuracion: {
                        title: "CONFIGURACIÓN",
                        options: [
                          "Ver configuración",
                          "Configurar servicios",
                          "Configurar notificaciones",
                          "Editar su propio horario"
                        ]
                      },
                      contabilidad: {
                        title: "CONTABILIDAD",
                        options: [
                          "Artículos - Todo",
                          "Artículos - Solo artículos relacionados",
                          "Artículos - Ver Ganancias",
                          "Artículos - Descargar Excel",
                          "Facturas - Todo",
                          `Facturas - ${activeClinic?.name || "MEDESMED INTERNATIONAL SL"}`,
                          "Facturas - Descargar Excel en facturas",
                          "Pagos",
                          "Resumen",
                          "Ingresos y Gastos",
                          "Solo cobrar"
                        ]
                      },
                      estadisticas: {
                        title: "ESTADÍSTICAS",
                        options: ["Ver Estadisticas"]
                      },
                      otros: {
                        title: "OTROS",
                        options: ["Mostrar precio servicios"]
                      }
                    }).map(([key, section]) => {
                      const selectedOptions = newStaffPermissions[key] || [];
                      const isOpen = openDropdown === `create_${key}`;
                      let labelText = "0 Seleccionados";
                      if (selectedOptions.length > 0) {
                        labelText = `${selectedOptions.length} Seleccionado${selectedOptions.length > 1 ? "s" : ""}`;
                      }

                      return (
                        <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
                          <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {section.title}
                          </label>
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                padding: "10px 14px",
                                border: "1px solid var(--border-color)",
                                borderRadius: "6px",
                                backgroundColor: "var(--bg-input)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "14px",
                                textAlign: "left"
                              }}
                              onClick={() => setOpenDropdown(isOpen ? null : `create_${key}`)}
                            >
                              <span>{labelText}</span>
                              <Icons.ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                            </button>

                            {isOpen && (
                              <>
                                <div
                                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                                  onClick={() => setOpenDropdown(null)}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "105%",
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "var(--bg-card)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "6px",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                    zIndex: 50,
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    padding: "8px 0"
                                  }}
                                >
                                  {section.options.map((option) => {
                                    const isChecked = selectedOptions.includes(option);
                                    return (
                                      <label
                                        key={option}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                          padding: "8px 16px",
                                          cursor: "pointer",
                                          fontSize: "13px",
                                          color: "var(--text-primary)",
                                          userSelect: "none",
                                          transition: "background 0.15s"
                                        }}
                                        className="permission-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          style={{
                                            width: "16px",
                                            height: "16px",
                                            accentColor: "var(--primary)",
                                            cursor: "pointer"
                                          }}
                                          onChange={() => {
                                            const current = newStaffPermissions[key] || [];
                                            const next = current.includes(option)
                                              ? current.filter((o: string) => o !== option)
                                              : [...current, option];
                                            setNewStaffPermissions({
                                              ...newStaffPermissions,
                                              [key]: next
                                            });
                                          }}
                                        />
                                        <span>{option}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px" }}>
                    {/* Render clinics checklist WITHOUT configure button */}
                    {(currentUser?.clinics || []).map((clinic) => {
                      const isChecked = newStaffClinics.includes(clinic.id);
                      return (
                        <label 
                          key={clinic.id} 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "12px", 
                            padding: "12px 16px", 
                            border: "1px solid var(--border-color)", 
                            borderRadius: "8px", 
                            background: "var(--bg-card)", 
                            cursor: "pointer" 
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                            onChange={() => {
                              const next = isChecked
                                ? newStaffClinics.filter((id) => id !== clinic.id)
                                : [...newStaffClinics, clinic.id];
                              setNewStaffClinics(next);
                            }}
                          />
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{clinic.name}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{clinic.address}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateStaffDrawer(false); setCreateStaffActiveTab(null); }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* EDIT SINGLE DAY SHIFT DRAWER (IMAGE 4) */}
      {shiftEditMode === "single" && activeShiftUser && activeShiftDay !== null && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => { setShiftEditMode(null); setActiveShiftUser(null); setActiveShiftDay(null); }}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>{activeShiftUser.name}</h2>
              <button type="button" className={styles.drawerCloseBtn} onClick={() => { setShiftEditMode(null); setActiveShiftUser(null); setActiveShiftDay(null); }}>
                <Icons.Close size={20} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 73px)" }}>
              <div className={styles.drawerBody}>
                <div className={styles.dateInputGrid}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>FECHA DE INICIO</label>
                    <input
                      type="date"
                      className="input"
                      value={singleShiftStartDate}
                      onChange={(e) => setSingleShiftStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>FECHA DE FINALIZACIÓN</label>
                    <input
                      type="date"
                      className="input"
                      value={singleShiftEndDate}
                      onChange={(e) => setSingleShiftEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "24px", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px" }}>
                  <div className={styles.dayRowConfig} style={{ borderBottom: "none", padding: 0 }}>
                    <div className={styles.dayRowLeft}>
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        {getDayNameSpanish(activeShiftDay)}
                      </span>
                    </div>
                    <div className={styles.dayRowRight}>
                      <div className={styles.timeSelectPair}>
                        <select
                          className={styles.miniTimeSelect}
                          value={singleShiftStartTime}
                          onChange={(e) => setSingleShiftStartTime(e.target.value)}
                        >
                          {timeOptionsList.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <span style={{ color: "var(--text-secondary)" }}>a</span>
                        <select
                          className={styles.miniTimeSelect}
                          value={singleShiftEndTime}
                          onChange={(e) => setSingleShiftEndTime(e.target.value)}
                        >
                          {timeOptionsList.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button type="button" className={styles.addShiftBtn} style={{ width: "32px", height: "32px", borderRadius: "50%", padding: 0, display: "inline-flex", borderStyle: "solid", justifyContent: "center", alignItems: "center" }}>
                          <Icons.Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.drawerFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShiftEditMode(null); setActiveShiftUser(null); setActiveShiftDay(null); }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveSingleShift}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT BULK SHIFTS DRAWER (IMAGE 5) */}
      {shiftEditMode === "bulk" && activeShiftUser && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => { setShiftEditMode(null); setActiveShiftUser(null); }}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>{activeShiftUser.name}</h2>
              <button type="button" className={styles.drawerCloseBtn} onClick={() => { setShiftEditMode(null); setActiveShiftUser(null); }}>
                <Icons.Close size={20} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 73px)" }}>
              <div className={styles.drawerBody}>
                {/* Sub-tabs inside drawer (Image 5) */}
                <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
                  <button 
                    type="button" 
                    style={{ 
                      background: "none", 
                      border: "none", 
                      padding: "8px 12px", 
                      fontWeight: 700, 
                      fontSize: "13px",
                      color: bulkShiftsActiveTab === "regular" ? "var(--primary)" : "var(--text-muted)",
                      borderBottom: bulkShiftsActiveTab === "regular" ? "2px solid var(--primary)" : "2px solid transparent",
                      cursor: "pointer"
                    }}
                    onClick={() => setBulkShiftsActiveTab("regular")}
                  >
                    Turnos habituales
                  </button>
                  <button 
                    type="button" 
                    style={{ 
                      background: "none", 
                      border: "none", 
                      padding: "8px 12px", 
                      fontWeight: 700, 
                      fontSize: "13px",
                      color: bulkShiftsActiveTab === "dias_libres" ? "var(--primary)" : "var(--text-muted)",
                      borderBottom: bulkShiftsActiveTab === "dias_libres" ? "2px solid var(--primary)" : "2px solid transparent",
                      cursor: "pointer"
                    }}
                    onClick={() => setBulkShiftsActiveTab("dias_libres")}
                  >
                    Días libres
                  </button>
                </div>

                <div className={styles.dateInputGrid}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>FECHA DE INICIO</label>
                    <input
                      type="date"
                      className="input"
                      value={bulkShiftStartDate}
                      onChange={(e) => setBulkShiftStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px", fontWeight: "700" }}>FECHA DE FINALIZACIÓN</label>
                    <input
                      type="date"
                      className="input"
                      value={bulkShiftEndDate}
                      onChange={(e) => setBulkShiftEndDate(e.target.value)}
                      placeholder="Seleccionar"
                    />
                  </div>
                </div>

                <div style={{ marginTop: "24px", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "8px 16px" }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                    const dayConfig = bulkDaysConfig.find((d) => d.dayOfWeek === dow) || {
                      dayOfWeek: dow,
                      active: false,
                      startTime: "08:00",
                      endTime: "20:00"
                    };
                    const dayLabel = getDayNameSpanish(dow);

                    return (
                      <div key={dow} className={styles.dayRowConfig}>
                        <div className={styles.dayRowLeft}>
                          {/* Toggle switch (Image 5 style) */}
                          <div 
                            style={{ 
                              width: "36px", 
                              height: "20px", 
                              backgroundColor: dayConfig.active ? "var(--primary)" : "var(--border-color)", 
                              borderRadius: "10px", 
                              position: "relative", 
                              cursor: "pointer",
                              transition: "background 0.2s"
                            }}
                            onClick={() => {
                              const updated = bulkDaysConfig.map((d) => 
                                d.dayOfWeek === dow ? { ...d, active: !d.active } : d
                              );
                              setBulkDaysConfig(updated);
                            }}
                          >
                            <div 
                              style={{ 
                                width: "16px", 
                                height: "16px", 
                                backgroundColor: "white", 
                                borderRadius: "50%", 
                                position: "absolute", 
                                top: "2px", 
                                left: dayConfig.active ? "18px" : "2px",
                                transition: "left 0.2s"
                              }}
                            />
                          </div>
                          <span>{dayLabel}</span>
                        </div>

                        <div className={styles.dayRowRight}>
                          {dayConfig.active ? (
                            <div className={styles.timeSelectPair}>
                              <select
                                className={styles.miniTimeSelect}
                                value={dayConfig.startTime}
                                onChange={(e) => {
                                  const updated = bulkDaysConfig.map((d) => 
                                    d.dayOfWeek === dow ? { ...d, startTime: e.target.value } : d
                                  );
                                  setBulkDaysConfig(updated);
                                }}
                              >
                                {timeOptionsList.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <span style={{ color: "var(--text-secondary)" }}>a</span>
                              <select
                                className={styles.miniTimeSelect}
                                value={dayConfig.endTime}
                                onChange={(e) => {
                                  const updated = bulkDaysConfig.map((d) => 
                                    d.dayOfWeek === dow ? { ...d, endTime: e.target.value } : d
                                  );
                                  setBulkDaysConfig(updated);
                                }}
                              >
                                {timeOptionsList.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <button type="button" className={styles.addShiftBtn} style={{ width: "32px", height: "32px", borderRadius: "50%", padding: 0, display: "inline-flex", borderStyle: "solid", justifyContent: "center", alignItems: "center" }}>
                                <Icons.Plus size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className={styles.noWorksText}>No trabaja los {dayLabel}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={styles.drawerFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShiftEditMode(null); setActiveShiftUser(null); }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveBulkShifts}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL CELL MENU DROPDOWN TO PREVENT CLIPPING (IMAGE 3) */}
      {activeCellMenu && cellMenuPosition && typeof window !== "undefined" && (() => {
        const targetUser = staff.find(u => u.id === activeCellMenu.userId);
        if (!targetUser) return null;
        const targetDayOfWeek = activeCellMenu.dayOfWeek;
        const targetDay = getWeekDays().find(d => d.dayOfWeek === targetDayOfWeek);
        if (!targetDay) return null;
        const shift = getUserShiftForDay(targetUser, targetDayOfWeek);
        
        return createPortal(
          <>
            <div className={styles.cellMenuOverlay} onClick={() => { setActiveCellMenu(null); setCellMenuPosition(null); }} />
            <div 
              className={styles.cellMenuDropdown} 
              style={{ 
                position: "absolute",
                top: `${cellMenuPosition.top}px`, 
                left: `${cellMenuPosition.left}px`,
                margin: 0
              }}
            >
              <button
                type="button"
                className={styles.cellMenuItem}
                onClick={() => {
                  setActiveShiftUser(targetUser);
                  setActiveShiftDay(targetDayOfWeek);
                  setShiftEditMode("single");
                  
                  const dayStr = targetDay.date.toISOString().split("T")[0];
                  setSingleShiftStartDate(dayStr);
                  setSingleShiftEndDate(dayStr);
                  setSingleShiftStartTime(shift?.startTime || "08:00");
                  setSingleShiftEndTime(shift?.endTime || "20:00");
                  setActiveCellMenu(null);
                  setCellMenuPosition(null);
                }}
              >
                Editar este día
              </button>
              <button
                type="button"
                className={styles.cellMenuItem}
                onClick={() => {
                  setActiveShiftUser(targetUser);
                  setShiftEditMode("bulk");
                  setBulkShiftsActiveTab("regular");
                  
                  const dayStr = targetDay.date.toISOString().split("T")[0];
                  setBulkShiftStartDate(dayStr);
                  setBulkShiftEndDate("");
                  
                  // prefill bulk config
                  const currentConfig = [1, 2, 3, 4, 5, 6, 0].map(dow => {
                    const existShift = getUserShiftForDay(targetUser, dow);
                    return {
                      dayOfWeek: dow,
                      active: !!existShift,
                      startTime: existShift?.startTime || "08:00",
                      endTime: existShift?.endTime || "20:00",
                    };
                  });
                  setBulkDaysConfig(currentConfig);
                  setActiveCellMenu(null);
                  setCellMenuPosition(null);
                }}
              >
                Varios días
              </button>
              <button
                type="button"
                className={styles.cellMenuItem}
                onClick={() => {
                  handleDeleteShift(targetUser.id, targetDayOfWeek);
                  setCellMenuPosition(null);
                }}
              >
                Añadir día libre
              </button>
              <button
                type="button"
                className={`${styles.cellMenuItem} ${styles.cellMenuItemDanger}`}
                onClick={() => {
                  handleDeleteShift(targetUser.id, targetDayOfWeek);
                  setCellMenuPosition(null);
                }}
              >
                Eliminar turno
              </button>
            </div>
          </>,
          document.body
        );
      })()}

      {/* EMPLOYEE DETAILS DUAL DRAWER (IMAGE 1 & 2) */}
      {selectedEmployee && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => { setSelectedEmployee(null); setSelectedEmployeeTab(null); }}>
          <div 
            className={styles.drawer} 
            style={{ 
              width: selectedEmployeeTab ? "880px" : "440px", 
              transition: "width 0.25s ease",
              display: "flex",
              flexDirection: "row"
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT SIDE: Options menu (Image 1) */}
            <div style={{ width: "440px", height: "100%", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div className={styles.drawerHeader}>
                <h2>{selectedEmployee.name} {selectedEmployee.lastName || ""}</h2>
                <button 
                  type="button" 
                  className={styles.drawerCloseBtn} 
                  onClick={() => { setSelectedEmployee(null); setSelectedEmployeeTab(null); }}
                >
                  <Icons.Close size={20} />
                </button>
              </div>
              <div className={styles.drawerBody} style={{ gap: "8px" }}>
                {/* Datos generales option */}
                <div 
                  className={`${styles.drawerMenuOption} ${selectedEmployeeTab === "generales" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setSelectedEmployeeTab("generales")}
                >
                  <div className={styles.optionLeft}>
                    <Icons.Users size={18} />
                    <span>Datos generales</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>

                {/* Permisos option */}
                <div 
                  className={`${styles.drawerMenuOption} ${selectedEmployeeTab === "permisos" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setSelectedEmployeeTab("permisos")}
                >
                  <div className={styles.optionLeft}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Permisos</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>

                {/* Consultas option */}
                <div 
                  className={`${styles.drawerMenuOption} ${selectedEmployeeTab === "consultas" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setSelectedEmployeeTab("consultas")}
                >
                  <div className={styles.optionLeft}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>Consultas</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>

                {/* Comisiones option */}
                <div 
                  className={`${styles.drawerMenuOption} ${selectedEmployeeTab === "comisiones" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setSelectedEmployeeTab("comisiones")}
                >
                  <div className={styles.optionLeft}>
                    <Icons.DollarCircle size={18} />
                    <span>Comisiones</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>

                {/* Configuración option */}
                <div 
                  className={`${styles.drawerMenuOption} ${selectedEmployeeTab === "config" ? styles.drawerMenuOptionActive : ""}`}
                  onClick={() => setSelectedEmployeeTab("config")}
                >
                  <div className={styles.optionLeft}>
                    <Icons.Settings size={18} />
                    <span>Configuración</span>
                  </div>
                  <Icons.ChevronRight size={16} />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Sub-menu details form (Image 2) */}
            {selectedEmployeeTab && (
              <div style={{ width: "440px", height: "100%", display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-color)", flexShrink: 0 }}>
                <div className={styles.drawerHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button 
                      type="button" 
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      onClick={() => setSelectedEmployeeTab(null)}
                    >
                      <Icons.Menu size={18} />
                    </button>
                    <h2 style={{ textTransform: "capitalize" }}>
                      {selectedEmployeeTab === "generales" ? "Datos generales" : selectedEmployeeTab}
                    </h2>
                  </div>
                  <button 
                    type="button" 
                    className={styles.drawerCloseBtn} 
                    onClick={() => { setSelectedEmployee(null); setSelectedEmployeeTab(null); }}
                  >
                    <Icons.Close size={20} />
                  </button>
                </div>
                
                {selectedEmployeeTab === "generales" ? (
                  <form onSubmit={handleUpdateEmployee} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 73px)" }}>
                    <div className={styles.drawerBody} style={{ gap: "10px", padding: "16px 20px" }}>
                      {/* Nombre */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Nombre *</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffName}
                          onChange={(e) => setEditStaffName(e.target.value)}
                          required
                        />
                      </div>

                      {/* Apellido */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Apellido</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffLastName}
                          onChange={(e) => setEditStaffLastName(e.target.value)}
                          placeholder="Apellido"
                        />
                      </div>

                      {/* Email */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Email *</label>
                        <input
                          type="email"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffEmail}
                          onChange={(e) => setEditStaffEmail(e.target.value)}
                          required
                        />
                      </div>

                      {/* Teléfono */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Teléfono</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffPhone}
                          onChange={(e) => setEditStaffPhone(e.target.value)}
                          placeholder="Teléfono"
                        />
                      </div>

                      {/* DNI / NIF */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>DNI / NIF</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffDniNif}
                          onChange={(e) => setEditStaffDniNif(e.target.value)}
                          placeholder="DNI"
                        />
                      </div>

                      {/* Dirección */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Dirección</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffAddress}
                          onChange={(e) => setEditStaffAddress(e.target.value)}
                          placeholder="Dirección"
                        />
                      </div>

                      {/* Ciudad */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Ciudad</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffMunicipality}
                          onChange={(e) => setEditStaffMunicipality(e.target.value)}
                          placeholder="Ciudad"
                        />
                      </div>

                      {/* Cód. postal */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Cód. postal</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffPostalCode}
                          onChange={(e) => setEditStaffPostalCode(e.target.value)}
                          placeholder="C.P."
                        />
                      </div>

                      {/* Dato adicional */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Dato adicional</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "7px 10px", fontSize: "13px" }}
                          value={editStaffAdditionalData}
                          onChange={(e) => setEditStaffAdditionalData(e.target.value)}
                          placeholder="Dato adicional"
                        />
                      </div>

                      {/* Color Picker Row */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Color en agenda</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {["#bee3f8", "#3b82f6", "#2b6cb0", "#805ad5", "#dd6b20", "#ecc94b", "#48bb78", "#fbb6ce", "#ffffff", "#e2e8f0"].map((c) => (
                            <div 
                              key={c}
                              className={`${styles.colorCircle} ${editStaffColor === c ? styles.colorCircleActive : ""}`}
                              style={{ 
                                width: "24px", 
                                height: "24px", 
                                backgroundColor: c, 
                                border: c === "#ffffff" ? "1px solid var(--border-color)" : (editStaffColor === c ? "2px solid var(--primary)" : "none"),
                                boxSizing: "border-box"
                              }}
                              onClick={() => setEditStaffColor(c)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Show in Agenda Toggle */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
                        <div 
                          style={{ 
                            width: "36px", 
                            height: "20px", 
                            backgroundColor: editStaffShowInAgenda ? "var(--primary)" : "var(--border-color)", 
                            borderRadius: "10px", 
                            position: "relative", 
                            cursor: "pointer",
                            transition: "background 0.2s",
                            flexShrink: 0
                          }}
                          onClick={() => setEditStaffShowInAgenda(!editStaffShowInAgenda)}
                        >
                          <div 
                            style={{ 
                              width: "16px", 
                              height: "16px", 
                              backgroundColor: "white", 
                              borderRadius: "50%", 
                              position: "absolute", 
                              top: "2px", 
                              left: editStaffShowInAgenda ? "18px" : "2px",
                              transition: "left 0.2s"
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
                          Mostrar En Agenda
                        </span>
                      </div>
                    </div>
                    <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
                      {editStaffSaveStatus === "saved" && (
                        <span style={{ fontSize: "12px", color: "#48bb78", fontWeight: "600", marginRight: "auto" }}>✓ Guardado</span>
                      )}
                      {editStaffSaveStatus === "error" && (
                        <span style={{ fontSize: "12px", color: "#f56565", fontWeight: "600", marginRight: "auto" }}>✗ Error al guardar</span>
                      )}
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedEmployeeTab(null)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={editStaffSaveStatus === "saving"}>
                        {editStaffSaveStatus === "saving" ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                ) : selectedEmployeeTab === "permisos" ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSavePermissions(); }} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 73px)" }}>
                    <style>{`
                      .permission-item:hover {
                        background-color: var(--bg-hover) !important;
                      }
                    `}</style>
                    <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px 24px", overflowY: "visible", position: "relative" }}>
                      {/* Render permission dropdowns */}
                      {Object.entries({
                        agenda: {
                          title: "AGENDA",
                          options: [
                            "Sus agendas",
                            "Sus agendas y recursos",
                            "Ver todas las agendas",
                            "No eliminar citas",
                            "Sólo lectura",
                            "Personalizado"
                          ]
                        },
                        clientes: {
                          title: "CLIENTES",
                          options: [
                            "Ver clientes",
                            "Ver datos personales",
                            "Ver documentos",
                            "Formularios",
                            "Seguimientos",
                            "Gestión de permisos",
                            "Editar clientes",
                            "Eliminar clientes",
                            "Permitir descargar clientes",
                            "Artículos"
                          ]
                        },
                        configuracion: {
                          title: "CONFIGURACIÓN",
                          options: [
                            "Ver configuración",
                            "Configurar servicios",
                            "Configurar notificaciones",
                            "Editar su propio horario"
                          ]
                        },
                        contabilidad: {
                          title: "CONTABILIDAD",
                          options: [
                            "Artículos - Todo",
                            "Artículos - Solo artículos relacionados",
                            "Artículos - Ver Ganancias",
                            "Artículos - Descargar Excel",
                            "Facturas - Todo",
                            `Facturas - ${activeClinic?.name || "MEDESMED INTERNATIONAL SL"}`,
                            "Facturas - Descargar Excel en facturas",
                            "Pagos",
                            "Resumen",
                            "Ingresos y Gastos",
                            "Solo cobrar"
                          ]
                        },
                        estadisticas: {
                          title: "ESTADÍSTICAS",
                          options: ["Ver Estadisticas"]
                        },
                        otros: {
                          title: "OTROS",
                          options: ["Mostrar precio servicios"]
                        }
                      }).map(([key, section]) => {
                        const selectedOptions = editStaffPermissions[key] || [];
                        const isOpen = openDropdown === key;
                        
                        // Exact match labels as per screenshots
                        let labelText = "0 Seleccionados";
                        if (selectedOptions.length > 0) {
                          labelText = `${selectedOptions.length} Seleccionado${selectedOptions.length > 1 ? "s" : ""}`;
                        }

                        return (
                          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
                            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {section.title}
                            </label>
                            <div style={{ position: "relative" }}>
                              {/* Dropdown button */}
                              <button
                                type="button"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  padding: "10px 14px",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "6px",
                                  backgroundColor: "var(--bg-input)",
                                  color: "var(--text-primary)",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  textAlign: "left"
                                }}
                                onClick={() => setOpenDropdown(isOpen ? null : key)}
                              >
                                <span>{labelText}</span>
                                <Icons.ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                              </button>

                              {/* Dropdown list overlay */}
                              {isOpen && (
                                <>
                                  {/* Click outside backdrop for this dropdown */}
                                  <div
                                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                                    onClick={() => setOpenDropdown(null)}
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "105%",
                                      left: 0,
                                      right: 0,
                                      backgroundColor: "var(--bg-card)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "6px",
                                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                      zIndex: 50,
                                      maxHeight: "260px",
                                      overflowY: "auto",
                                      padding: "8px 0"
                                    }}
                                  >
                                    {section.options.map((option) => {
                                      const isChecked = selectedOptions.includes(option);
                                      return (
                                        <label
                                          key={option}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "8px 16px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            color: "var(--text-primary)",
                                            userSelect: "none",
                                            transition: "background 0.15s"
                                          }}
                                          className="permission-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            style={{
                                              width: "16px",
                                              height: "16px",
                                              accentColor: "var(--primary)",
                                              cursor: "pointer"
                                            }}
                                            onChange={() => {
                                              const current = editStaffPermissions[key] || [];
                                              const next = current.includes(option)
                                                ? current.filter((o: string) => o !== option)
                                                : [...current, option];
                                              setEditStaffPermissions({
                                                ...editStaffPermissions,
                                                [key]: next
                                              });
                                            }}
                                          />
                                          <span>{option}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
                      {editStaffSaveStatus === "saved" && (
                        <span style={{ fontSize: "12px", color: "#48bb78", fontWeight: "600", marginRight: "auto" }}>✓ Guardado</span>
                      )}
                      {editStaffSaveStatus === "error" && (
                        <span style={{ fontSize: "12px", color: "#f56565", fontWeight: "600", marginRight: "auto" }}>✗ Error al guardar</span>
                      )}
                      <button type="button" className="btn btn-secondary" onClick={() => { setSelectedEmployee(null); setSelectedEmployeeTab(null); }}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={editStaffSaveStatus === "saving"}>
                        {editStaffSaveStatus === "saving" ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={styles.drawerBody}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                      Esta sección está configurada por defecto para {selectedEmployee.name}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {showNewCategoryPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <div className={styles.popupHeader}>Nueva categoría</div>
            <div className={styles.popupBody}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre de la categoría *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Botox, Rellenos..."
                  value={newCategoryPopupName}
                  onChange={(e) => setNewCategoryPopupName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.popupFooter}>
              <button
                type="button"
                className={styles.btnPopupCancel}
                onClick={() => {
                  setShowNewCategoryPopup(false);
                  setNewCategoryPopupName("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPopupSave}
                onClick={() => {
                  if (newCategoryPopupName.trim()) {
                    const newCat = newCategoryPopupName.trim();
                    setCustomCategories([...customCategories, newCat]);
                    setServiceFormCategory(newCat);
                    setShowNewCategoryPopup(false);
                    setNewCategoryPopupName("");
                  } else {
                    alert("Por favor, ingrese un nombre para la categoría.");
                  }
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Crear formulario */}
      {showCreateClientFormDrawer && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => { setShowCreateClientFormDrawer(false); setNewClientFormDrawerName(""); }}>
          <div className={styles.drawer} style={{ width: "440px" }} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Crear formulario</h2>
              <button 
                type="button" 
                className={styles.drawerCloseBtn} 
                onClick={() => { setShowCreateClientFormDrawer(false); setNewClientFormDrawerName(""); }}
              >
                <Icons.Close size={20} />
              </button>
            </div>
            <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre del formulario de antecedentes *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Historia Clínica, Consentimiento..."
                  value={newClientFormDrawerName}
                  onChange={e => setNewClientFormDrawerName(e.target.value)}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowCreateClientFormDrawer(false); setNewClientFormDrawerName(""); }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!newClientFormDrawerName.trim()}
                onClick={() => handleCreateClientForm(newClientFormDrawerName)}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DRAWER: Agregar campo personalizado */}
      {showAddClientFieldDrawer && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowAddClientFieldDrawer(false)}>
          <div className={styles.drawer} style={{ width: "440px" }} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Agregar campo personalizado</h2>
              <button 
                type="button" 
                className={styles.drawerCloseBtn} 
                onClick={() => setShowAddClientFieldDrawer(false)}
              >
                <Icons.Close size={20} />
              </button>
            </div>
            <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nombre del campo"
                  value={newClientFieldName}
                  onChange={e => setNewClientFieldName(e.target.value)}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Tipo</label>
                <select
                  className="input"
                  value={newClientFieldType}
                  onChange={e => setNewClientFieldType(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-input)" }}
                >
                  <option value="Texto">Texto</option>
                  <option value="Texto largo">Texto largo</option>
                  <option value="Opción única">Opción única</option>
                  <option value="Opción múltiple">Opción múltiple</option>
                  <option value="Título">Título</option>
                </select>
              </div>
            </div>
            <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowAddClientFieldDrawer(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!newClientFieldName.trim()}
                onClick={() => {
                  if (newClientFieldName.trim()) {
                    setClientFormFields(prev => [...prev, { name: newClientFieldName.trim(), type: newClientFieldType }]);
                    setShowAddClientFieldDrawer(false);
                    setNewClientFieldName("");
                  }
                }}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DRAWER: Agregar campo personalizado (Seguimientos) */}
      {showAddEpisodeFieldDrawer && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowAddEpisodeFieldDrawer(false)}>
          <div className={styles.drawer} style={{ width: "440px" }} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Agregar campo personalizado</h2>
              <button 
                type="button" 
                className={styles.drawerCloseBtn} 
                onClick={() => setShowAddEpisodeFieldDrawer(false)}
              >
                <Icons.Close size={20} />
              </button>
            </div>
            <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nombre del campo"
                  value={newEpisodeFieldName}
                  onChange={e => setNewEpisodeFieldName(e.target.value)}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Tipo</label>
                <select
                  className="input"
                  value={newEpisodeFieldType}
                  onChange={e => setNewEpisodeFieldType(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-input)" }}
                >
                  <option value="Texto">Texto</option>
                  <option value="Texto largo">Texto largo</option>
                  <option value="Opción única">Opción única</option>
                  <option value="Opción múltiple">Opción múltiple</option>
                  <option value="Título">Título</option>
                </select>
              </div>
            </div>
            <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowAddEpisodeFieldDrawer(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!newEpisodeFieldName.trim()}
                onClick={() => {
                  if (newEpisodeFieldName.trim()) {
                    setEpisodeFormFields(prev => [...prev, { name: newEpisodeFieldName.trim(), type: newEpisodeFieldType }]);
                    setShowAddEpisodeFieldDrawer(false);
                    setNewEpisodeFieldName("");
                  }
                }}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DRAWER: Editar campo personalizado (Compartido) */}
      {showEditFieldDrawer && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowEditFieldDrawer(false)}>
          <div className={styles.drawer} style={{ width: "440px" }} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <h2>Editar campo personalizado</h2>
              <button 
                type="button" 
                className={styles.drawerCloseBtn} 
                onClick={() => setShowEditFieldDrawer(false)}
              >
                <Icons.Close size={20} />
              </button>
            </div>
            <div className={styles.drawerBody} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nombre del campo"
                  value={editingFieldName}
                  onChange={e => setEditingFieldName(e.target.value)}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Tipo</label>
                <select
                  className="input"
                  value={editingFieldType}
                  onChange={e => setEditingFieldType(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-input)" }}
                >
                  <option value="Texto">Texto</option>
                  <option value="Texto largo">Texto largo</option>
                  <option value="Opción única">Opción única</option>
                  <option value="Opción múltiple">Opción múltiple</option>
                  <option value="Título">Título</option>
                </select>
              </div>
            </div>
            <div className={styles.drawerFooter} style={{ padding: "12px 20px" }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowEditFieldDrawer(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!editingFieldName.trim()}
                onClick={() => {
                  if (editingFieldName.trim() && editingFieldIdx !== null) {
                    if (editingFieldTarget === "client") {
                      const arr = [...clientFormFields];
                      arr[editingFieldIdx] = { name: editingFieldName.trim(), type: editingFieldType };
                      setClientFormFields(arr);
                    } else if (editingFieldTarget === "episode") {
                      const arr = [...episodeFormFields];
                      arr[editingFieldIdx] = { name: editingFieldName.trim(), type: editingFieldType };
                      setEpisodeFormFields(arr);
                    }
                    setShowEditFieldDrawer(false);
                  }
                }}
              >
                Editar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </>
  );
}
