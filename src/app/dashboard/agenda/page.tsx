"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission, canDeleteAppointment, canCreateOrEditAppointment } from "@/lib/permissions";
import styles from "./Agenda.module.css";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  color: string;
  category?: string;
  allowedUserIds?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  clientNumber?: number;
  tags?: string;
  province?: string;
  landline?: string;
}

interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  shifts: Shift[];
}

interface Shift {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Appointment {
  id: string;
  clientId: string;
  userId: string;
  serviceId: string;
  clinicId: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  tags?: string;
  client: Client;
  user: User;
  service: Service;
  clinic?: {
    id: string;
    name: string;
  };
}

const COUNTRIES = [
  { flag: "🇪🇸", code: "ES", name: "España", dial: "+34" },
  { flag: "🇲🇽", code: "MX", name: "México", dial: "+52" },
  { flag: "🇦🇷", code: "AR", name: "Argentina", dial: "+54" },
  { flag: "🇨🇴", code: "CO", name: "Colombia", dial: "+57" },
  { flag: "🇨🇱", code: "CL", name: "Chile", dial: "+56" },
  { flag: "🇵🇪", code: "PE", name: "Perú", dial: "+51" },
  { flag: "🇻🇪", code: "VE", name: "Venezuela", dial: "+58" },
  { flag: "🇪🇨", code: "EC", name: "Ecuador", dial: "+593" },
  { flag: "🇧🇴", code: "BO", name: "Bolivia", dial: "+591" },
  { flag: "🇺🇾", code: "UY", name: "Uruguay", dial: "+598" },
  { flag: "🇵🇾", code: "PY", name: "Paraguay", dial: "+595" },
  { flag: "🇵🇹", code: "PT", name: "Portugal", dial: "+351" },
  { flag: "🇫🇷", code: "FR", name: "Francia", dial: "+33" },
  { flag: "🇩🇪", code: "DE", name: "Alemania", dial: "+49" },
  { flag: "🇮🇹", code: "IT", name: "Italia", dial: "+39" },
  { flag: "🇬🇧", code: "GB", name: "Reino Unido", dial: "+44" },
  { flag: "🇺🇸", code: "US", name: "Estados Unidos", dial: "+1" },
  { flag: "🇨🇦", code: "CA", name: "Canadá", dial: "+1" },
  { flag: "🇧🇷", code: "BR", name: "Brasil", dial: "+55" },
  { flag: "🇳🇱", code: "NL", name: "Países Bajos", dial: "+31" },
  { flag: "🇧🇪", code: "BE", name: "Bélgica", dial: "+32" },
  { flag: "🇨🇭", code: "CH", name: "Suiza", dial: "+41" },
  { flag: "🇦🇹", code: "AT", name: "Austria", dial: "+43" },
  { flag: "🇵🇱", code: "PL", name: "Polonia", dial: "+48" },
  { flag: "🇷🇴", code: "RO", name: "Rumanía", dial: "+40" },
  { flag: "🇲🇦", code: "MA", name: "Marruecos", dial: "+212" },
  { flag: "🇩🇿", code: "DZ", name: "Argelia", dial: "+213" },
  { flag: "🇨🇳", code: "CN", name: "China", dial: "+86" },
  { flag: "🇯🇵", code: "JP", name: "Japón", dial: "+81" },
  { flag: "🇰🇷", code: "KR", name: "Corea del Sur", dial: "+82" },
  { flag: "🇮🇳", code: "IN", name: "India", dial: "+91" },
  { flag: "🇷🇺", code: "RU", name: "Rusia", dial: "+7" },
  { flag: "🇹🇷", code: "TR", name: "Turquía", dial: "+90" },
  { flag: "🇸🇦", code: "SA", name: "Arabia Saudita", dial: "+966" },
  { flag: "🇦🇺", code: "AU", name: "Australia", dial: "+61" },
];

export default function AgendaPage() {
  const { activeClinic, user: currentUser } = useApp();
  const showPrices = currentUser?.role === "ADMIN" || hasPermission(currentUser, "otros", "Mostrar precio servicios");
  
  // State
  const [view, setView] = useState<"day" | "week" | "month">(() => {
    if (typeof window !== "undefined") {
      const savedView = window.localStorage.getItem("agenda_view");
      if (savedView === "day" || savedView === "week" || savedView === "month") {
        return savedView;
      }
    }
    return "day";
  });
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [zoomLevel, setZoomLevel] = useState<"poco" | "normal" | "grande">(() => {
    if (typeof window !== "undefined") {
      const savedZoom = window.localStorage.getItem("agenda_zoom");
      if (savedZoom === "poco" || savedZoom === "normal" || savedZoom === "grande") {
        return savedZoom;
      }
    }
    return "normal";
  });

  const zoomScale = useMemo(() => {
    if (zoomLevel === "poco") return 0.75;
    if (zoomLevel === "grande") return 1.333;
    return 1.0;
  }, [zoomLevel]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("agenda_zoom", zoomLevel);
    }
  }, [zoomLevel]);

  // Submenu Zoom state
  const [tempZoomLevel, setTempZoomLevel] = useState<"poco" | "normal" | "grande">("normal");

  // Convert TimeBlock to Appointment states
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertClientId, setConvertClientId] = useState("");
  const [convertServiceId, setConvertServiceId] = useState("");
  const [convertLocationId, setConvertLocationId] = useState("");

  // Filters Sidebar states
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [filtersSubView, setFiltersSubView] = useState<"menu" | "direcciones" | "servicios" | "clientes">("menu");
  const [tempFilterClinicId, setTempFilterClinicId] = useState("all");
  const [tempFilterServiceId, setTempFilterServiceId] = useState("all");
  const [tempFilterClientId, setTempFilterClientId] = useState("all");
  const [filterClinicId, setFilterClinicId] = useState("all");
  const [filterClientId, setFilterClientId] = useState("all");

  // Waitlist states
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [showWaitlistSidebar, setShowWaitlistSidebar] = useState(false);
  const [waitlistSubView, setWaitlistSubView] = useState<"list" | "add">("list");
  const [waitlistClientId, setWaitlistClientId] = useState("");
  const [waitlistUserId, setWaitlistUserId] = useState("all");
  const [waitlistServiceId, setWaitlistServiceId] = useState("all");
  const [waitlistNotes, setWaitlistNotes] = useState("");
  const [waitlistPreferredDay, setWaitlistPreferredDay] = useState("all");
  const [waitlistPreferredTime, setWaitlistPreferredTime] = useState("all");
  const [activeWaitlistEntryForAppointment, setActiveWaitlistEntryForAppointment] = useState<any | null>(null);

  const fetchWaitlist = useCallback(async () => {
    if (!activeClinic) return;
    try {
      const res = await fetch(`/api/waitlist?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setWaitlist(data);
      }
    } catch (err) {
      console.error("Error fetching waitlist:", err);
    }
  }, [activeClinic]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [checkedStaffIds, setCheckedStaffIds] = useState<string[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  
  // Dropdown filtering staff states
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [pinDropdown, setPinDropdown] = useState(false);
  const staffDropdownRef = useRef<HTMLDivElement>(null);
  const latestFetchIdRef = useRef(0);

  // Date Picker Dropdown states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Click outside staff dropdown menu handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pinDropdown) return;
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pinDropdown]);



  // Save checked staff list to localStorage when changed
  useEffect(() => {
    if (activeClinic?.id && staffList.length > 0 && typeof window !== "undefined") {
      window.localStorage.setItem(
        `agenda_checked_staff_ids_${activeClinic.id}`,
        JSON.stringify(checkedStaffIds)
      );
    }
  }, [checkedStaffIds, activeClinic?.id, staffList]);

  // Click outside date picker handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync date picker states with currentDate
  useEffect(() => {
    setPickerMonth(currentDate.getMonth());
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  // Filters
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formClinicId, setFormClinicId] = useState("");
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [showFormStatusDropdown, setShowFormStatusDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [appointmentTags, setAppointmentTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [formPatProvince, setFormPatProvince] = useState("");
  const [formPatLandline, setFormPatLandline] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; userId: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Time Block Modals & Form State
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showBlockDetailModal, setShowBlockDetailModal] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<any | null>(null);
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockNotes, setBlockNotes] = useState("");
  const [selectedBlockDates, setSelectedBlockDates] = useState<string[]>([]);
  const [showFrequencyPopover, setShowFrequencyPopover] = useState(false);
  const [popoverMonth, setPopoverMonth] = useState<number>(new Date().getMonth());
  const [popoverYear, setPopoverYear] = useState<number>(new Date().getFullYear());
  
  // Form fields
  const [formClientId, setFormClientId] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // States and refs for label/tag manager
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [tagsSubView, setTagsSubView] = useState<"list" | "create">("list");
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [newInfoTagName, setNewInfoTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#add8e6");
  const [availableTags, setAvailableTags] = useState<{ name: string; color: string }[]>([]);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  const TAG_COLORS = [
    "#add8e6", // Light Blue
    "#4299e1", // Blue
    "#008298", // Teal/Primary
    "#9f7aea", // Purple
    "#ed8936", // Orange
    "#fbd38d", // Light Orange
    "#9ae6b4", // Green
    "#feb2b2", // Red/Pink
    "#d6bcfa", // Light Purple
    "#faf089", // Yellow
    "#a0aec0", // Greyish Blue
  ];

  const handleAddTagToAppointment = async (tag: { name: string; color: string }) => {
    if (!selectedAppointment) return;
    const currentTags = selectedAppointment.tags 
      ? selectedAppointment.tags.split(",").filter(Boolean)
      : [];
    const tagString = `${tag.name}:${tag.color}`;
    if (currentTags.some(t => t.split(":")[0] === tag.name)) return;

    const newTags = [...currentTags, tagString].join(",");
    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAppointment.id,
          userId: selectedAppointment.userId,
          serviceId: selectedAppointment.serviceId,
          start: selectedAppointment.start,
          end: selectedAppointment.end,
          status: selectedAppointment.status,
          notes: selectedAppointment.notes || "",
          tags: newTags,
          actorName: currentUser ? currentUser.name : "Sistema",
          actorId: currentUser?.id,
        })
      });

      if (res.ok) {
        setSelectedAppointment(prev => prev ? { ...prev, tags: newTags } : null);
        fetchAppointments();
      }
    } catch (e) {
      console.error("Error adding tag:", e);
    }
  };

  const handleRemoveTagFromAppointment = async (tagName: string) => {
    if (!selectedAppointment) return;
    const currentTags = selectedAppointment.tags 
      ? selectedAppointment.tags.split(",").filter(Boolean)
      : [];
    const newTags = currentTags
      .filter(t => t.split(":")[0] !== tagName)
      .join(",");

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAppointment.id,
          userId: selectedAppointment.userId,
          serviceId: selectedAppointment.serviceId,
          start: selectedAppointment.start,
          end: selectedAppointment.end,
          status: selectedAppointment.status,
          notes: selectedAppointment.notes || "",
          tags: newTags,
          actorName: currentUser ? currentUser.name : "Sistema",
          actorId: currentUser?.id,
        })
      });

      if (res.ok) {
        setSelectedAppointment(prev => prev ? { ...prev, tags: newTags } : null);
        fetchAppointments();
      }
    } catch (e) {
      console.error("Error removing tag:", e);
    }
  };

  const handleCreateNewTagGlobal = (name: string, color: string) => {
    if (!name.trim()) return;
    const tagName = name.trim().toUpperCase();
    if (availableTags.some(t => t.name === tagName)) {
      alert("Esta etiqueta ya existe.");
      return;
    }
    const updated = [...availableTags, { name: tagName, color }];
    setAvailableTags(updated);
    localStorage.setItem("clifav_available_tags", JSON.stringify(updated));
    setNewInfoTagName("");
    setNewTagColor("#add8e6");
    setTagsSubView("list");
  };

  const handleDeleteTagGlobal = (tagName: string) => {
    const updated = availableTags.filter(t => t.name !== tagName);
    setAvailableTags(updated);
    localStorage.setItem("clifav_available_tags", JSON.stringify(updated));
  };

  // Notification reminders for WhatsApp button in drawer
  const [clinicReminders, setClinicReminders] = useState<any[]>([]);

  // Filter services dynamically based on selected professional
  const filteredServicesForDropdown = useMemo(() => {
    if (!formUserId) return servicesList;
    return servicesList.filter((s) => {
      if (!s.allowedUserIds) return true; // empty allows all
      return s.allowedUserIds.split(",").includes(formUserId);
    });
  }, [servicesList, formUserId]);

  // Filter staff dynamically based on selected service
  const filteredStaffForDropdown = useMemo(() => {
    if (!formServiceId) return staffList;
    const selectedService = servicesList.find((s) => s.id === formServiceId);
    if (!selectedService || !selectedService.allowedUserIds) return staffList;
    const allowed = selectedService.allowedUserIds.split(",");
    return staffList.filter((s) => allowed.includes(s.id));
  }, [staffList, servicesList, formServiceId]);

  // Autocomplete patient search & new patient fields
  const [patientSearch, setPatientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [newPatientTab, setNewPatientTab] = useState<"general" | "others">("general");

  // New patient form fields
  const [formPatFirstName, setFormPatFirstName] = useState("");
  const [formPatLastName, setFormPatLastName] = useState("");
  const [formPatBirthDate, setFormPatBirthDate] = useState("");
  const [formPatDniNif, setFormPatDniNif] = useState("");
  const [formPatPhone, setFormPatPhone] = useState("");
  const [formPatEmail, setFormPatEmail] = useState("");
  const [formPatAddress, setFormPatAddress] = useState("");
  const [formPatMunicipality, setFormPatMunicipality] = useState("");
  const [formPatPostalCode, setFormPatPostalCode] = useState("");
  const [formPatCountry, setFormPatCountry] = useState("España");
  
  // Country picker states
  const [dniCountry, setDniCountry] = useState({ flag: "🇪🇸", code: "ES", name: "España", dial: "+34" });
  const [phoneCountry, setPhoneCountry] = useState({ flag: "🇪🇸", code: "ES", name: "España", dial: "+34" });
  const [countryPickerSelected, setCountryPickerSelected] = useState({ flag: "🇪🇸", code: "ES", name: "España", dial: "+34" });
  const [showDniCountryPicker, setShowDniCountryPicker] = useState(false);
  const [showPhoneCountryPicker, setShowPhoneCountryPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dniPickerRef = useRef<HTMLDivElement>(null);
  const phonePickerRef = useRef<HTMLDivElement>(null);
  const countryPickerRef = useRef<HTMLDivElement>(null);
  

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );
  
  const [formPatIsSelfEmployed, setFormPatIsSelfEmployed] = useState(false);

  const [formPatIsCompany, setFormPatIsCompany] = useState(false);
  const [formPatReceivesReminders, setFormPatReceivesReminders] = useState(true);

  const [formPatOccupation, setFormPatOccupation] = useState("");
  const [formPatGender, setFormPatGender] = useState("Femenino");
  const [formPatMaritalStatus, setFormPatMaritalStatus] = useState("Soltero/a");
  const [formPatIban, setFormPatIban] = useState("");
  const [formPatBic, setFormPatBic] = useState("");

  // Edit/View modal custom states
  const [editModalTab, setEditModalTab] = useState<"datos" | "bonos" | "citas" | "seguimientos" | "historial">("datos");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isEditingApp, setIsEditingApp] = useState(false);
  const [editPatReceivesReminders, setEditPatReceivesReminders] = useState(true);
  const [citasSubTab, setCitasSubTab] = useState<"pasadas" | "futuras">("pasadas");

  // Vouchers displayed in appointment info panel (tab "bonos")
  const [appointmentClientVouchers, setAppointmentClientVouchers] = useState<any[]>([]);
  const [loadingAppointmentVouchers, setLoadingAppointmentVouchers] = useState(false);

  // Historial / Audit logs
  const [appointmentLogs, setAppointmentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [agendaSales, setAgendaSales] = useState<any[]>([]);

  // Voucher consumption states and hooks
  const [selectedClientVouchers, setSelectedClientVouchers] = useState<any[]>([]);
  const [useVoucherSession, setUseVoucherSession] = useState(false);

  useEffect(() => {
    if (!formClientId) {
      setSelectedClientVouchers([]);
      return;
    }
    fetch(`/api/clients/${formClientId}/vouchers`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSelectedClientVouchers(data);
        } else {
          setSelectedClientVouchers([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching client vouchers:", err);
        setSelectedClientVouchers([]);
      });
  }, [formClientId]);

  const matchingVoucher = useMemo(() => {
    if (!formServiceId || !selectedClientVouchers.length) return null;
    return selectedClientVouchers.find((cv) => {
      const isExpired = cv.expirationDate ? new Date(cv.expirationDate) < new Date() : false;
      const hasSessions = cv.remainingSessions > 0;
      const associatedServices = cv.serviceIds ? cv.serviceIds.split(",") : [];
      const matchesService = associatedServices.includes(formServiceId);
      return !isExpired && hasSessions && matchesService;
    });
  }, [formServiceId, selectedClientVouchers]);

  useEffect(() => {
    if (matchingVoucher) {
      setUseVoucherSession(true);
    } else {
      setUseVoucherSession(false);
    }
  }, [matchingVoucher]);

  // Follow-up (Seguimientos) form states
  const [segObservaciones, setSegObservaciones] = useState("");
  const [segDiagnostico, setSegDiagnostico] = useState("");
  const [segOperacion, setSegOperacion] = useState("");
  const [segTratamiento, setSegTratamiento] = useState("");
  const [segMedicacion, setSegMedicacion] = useState("");
  const [segMaterialLotes, setSegMaterialLotes] = useState("");

  // Settings & options sidebar states
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showOpcionesSidebar, setShowOpcionesSidebar] = useState(false);
  const [sidebarSubView, setSidebarSubView] = useState<"menu" | "weekends" | "zoom">("menu");
  // Read from localStorage synchronously so the initial render already knows the saved preference
  const [hideWeekends, setHideWeekends] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hideWeekends") === "true";
    }
    return false;
  });
  const [tempHideWeekends, setTempHideWeekends] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const moreOptionsRef = useRef<HTMLDivElement>(null);
  const blockDateInputRef = useRef<HTMLInputElement>(null);
  const frequencyPopoverRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-save hideWeekends to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("hideWeekends", String(hideWeekends));
  }, [hideWeekends]);

  // Load available tags from localStorage or set default initial tags
  useEffect(() => {
    const saved = localStorage.getItem("clifav_available_tags");
    if (saved) {
      try {
        setAvailableTags(JSON.parse(saved));
      } catch (e) {
        setAvailableTags([{ name: "URGENTE", color: "#f56565" }]);
      }
    } else {
      const initial = [{ name: "URGENTE", color: "#f56565" }];
      setAvailableTags(initial);
      localStorage.setItem("clifav_available_tags", JSON.stringify(initial));
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
        setShowMoreOptions(false);
      }
      if (frequencyPopoverRef.current && !frequencyPopoverRef.current.contains(event.target as Node)) {
        setShowFrequencyPopover(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close country pickers on outside click
  useEffect(() => {
    function closePickers(event: MouseEvent) {
      if (dniPickerRef.current && !dniPickerRef.current.contains(event.target as Node)) {
        setShowDniCountryPicker(false);
      }
      if (phonePickerRef.current && !phonePickerRef.current.contains(event.target as Node)) {
        setShowPhoneCountryPicker(false);
      }
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setShowCountryPicker(false);
      }
    }
    document.addEventListener("mousedown", closePickers);
    return () => { document.removeEventListener("mousedown", closePickers); };
  }, []);

  const filteredClientsForSearch = patientSearch.trim() === ""
    ? clientsList
    : clientsList.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(patientSearch)) ||
        (c.email && c.email.toLowerCase().includes(patientSearch.toLowerCase()))
      );

  // Load staff, services, and clients
  useEffect(() => {
    if (!activeClinic) return;

    // Fetch staff
    fetch(`/api/users?clinicId=${activeClinic.id}&onlyAgenda=true`)
      .then((res) => res.json())
      .then((data) => {
        let filteredStaff = data;
        if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "agenda", "Ver todas las agendas")) {
          filteredStaff = data.filter((u: any) => u.id === currentUser.id);
        }
        setStaffList(filteredStaff);
        if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "agenda", "Ver todas las agendas")) {
          setCheckedStaffIds([currentUser.id]);
          return;
        }
        // Check if we have saved staff selection in localStorage
        if (typeof window !== "undefined") {
          const savedIdsJson = window.localStorage.getItem(`agenda_checked_staff_ids_${activeClinic.id}`);
          if (savedIdsJson) {
            try {
              const parsed = JSON.parse(savedIdsJson);
              if (Array.isArray(parsed)) {
                // Filter to make sure saved staff IDs actually exist in this clinic's staff list
                const validIds = parsed.filter(id => filteredStaff.some((u: User) => u.id === id));
                setCheckedStaffIds(validIds);
                return;
              }
            } catch (e) {
              console.error("Error parsing saved staff IDs:", e);
            }
          }
        }
        // By default, check all staff
        setCheckedStaffIds(filteredStaff.map((u: User) => u.id));
      });

    // Fetch services
    fetch(`/api/services?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServicesList(data);
        } else {
          setServicesList([]);
        }
      });

    // Fetch clients
    fetch(`/api/clients?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClientsList(data);
          
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const urlClientId = params.get("createAppointmentForClientId");
            if (urlClientId) {
              setFormClientId(urlClientId);
              setIsNewPatient(false);
              const now = new Date();
              setFormDate(now.toISOString().split("T")[0]);
              setFormTime(`${String(now.getHours() + 1).padStart(2, "0")}:00`);
              setShowCreateModal(true);
              
              // Clean query parameter from URL
              const newUrl = window.location.pathname;
              window.history.replaceState({}, "", newUrl);
            }
          }
        } else {
          console.error("Failed to fetch clients:", data);
          setClientsList([]);
        }
      });

    // Fetch active WhatsApp Manual reminders for this clinic
    fetch(`/api/notifications/reminders?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClinicReminders(data.filter((r: any) => r.enabled));
      })
      .catch(console.error);

  }, [activeClinic]);

  // Fetch appointments and time blocks when date, clinic, or staff filters change
  const fetchAppointments = useCallback(() => {
    if (!activeClinic) return;
    
    const fetchId = ++latestFetchIdRef.current;

    // Set range based on date & view
    let startRange = new Date(currentDate);
    let endRange = new Date(currentDate);

    if (view === "day") {
      startRange.setHours(0, 0, 0, 0);
      endRange.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      // Find Monday
      const day = startRange.getDay();
      const diff = startRange.getDate() - day + (day === 0 ? -6 : 1);
      startRange.setDate(diff);
      startRange.setHours(0, 0, 0, 0);
      
      endRange.setDate(diff + 6);
      endRange.setHours(23, 59, 59, 999);
    } else {
      // Month
      startRange.setDate(1);
      startRange.setHours(0, 0, 0, 0);
      endRange.setMonth(endRange.getMonth() + 1);
      endRange.setDate(0);
      endRange.setHours(23, 59, 59, 999);
    }

    const clinicId = activeClinic.id;
    const startStr = startRange.toISOString();
    const endStr = endRange.toISOString();

    fetch(`/api/appointments?clinicId=${clinicId}&start=${startStr}&end=${endStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== latestFetchIdRef.current) return;
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setAppointments([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching appointments:", err);
        if (fetchId === latestFetchIdRef.current) setAppointments([]);
      });

    fetch(`/api/sales?clinicId=${clinicId}`)
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== latestFetchIdRef.current) return;
        if (Array.isArray(data)) {
          setAgendaSales(data);
        }
      })
      .catch((err) => {
        console.error("Error fetching sales for agenda:", err);
      });

    fetch(`/api/time-blocks?clinicId=${clinicId}&start=${startStr}&end=${endStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (fetchId !== latestFetchIdRef.current) return;
        if (Array.isArray(data)) {
          setTimeBlocks(data);
        } else {
          setTimeBlocks([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching time blocks:", err);
        if (fetchId === latestFetchIdRef.current) setTimeBlocks([]);
      });
  }, [activeClinic, currentDate, view]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Navigation
  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() - 1);
      if (hideWeekends) {
        if (newDate.getDay() === 0) { // Sunday, go back to Friday
          newDate.setDate(newDate.getDate() - 2);
        } else if (newDate.getDay() === 6) { // Saturday, go back to Friday
          newDate.setDate(newDate.getDate() - 1);
        }
      }
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() + 1);
      if (hideWeekends) {
        if (newDate.getDay() === 6) { // Saturday, go forward to Monday
          newDate.setDate(newDate.getDate() + 2);
        } else if (newDate.getDay() === 0) { // Sunday, go forward to Monday
          newDate.setDate(newDate.getDate() + 1);
        }
      }
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Google Calendar Sync Simulation
  const handleGoogleSync = () => {
    setGoogleSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setGoogleSyncing(false);
      setSyncSuccess(true);
      fetchAppointments();
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1500);
  };

  const triggerAutoSync = () => {
    setGoogleSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setGoogleSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  // Checkbox staff handler
  const handleStaffCheck = (staffId: string) => {
    if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "agenda", "Ver todas las agendas")) {
      setCheckedStaffIds([currentUser.id]);
      return;
    }
    if (checkedStaffIds.includes(staffId)) {
      setCheckedStaffIds(checkedStaffIds.filter((id) => id !== staffId));
    } else {
      setCheckedStaffIds([...checkedStaffIds, staffId]);
    }
  };

  // Format headers
  const getFormattedRange = () => {
    if (view === "day") {
      return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } else if (view === "week") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      return `${start.toLocaleDateString("es-ES", options)} - ${end.toLocaleDateString("es-ES", { ...options, year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    }
  };

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const m = new Date(date.setDate(diff));
    m.setHours(0, 0, 0, 0);
    return m;
  };

  const isTodayVisible = () => {
    const today = new Date();
    if (view === "day") {
      return today.toDateString() === currentDate.toDateString();
    } else if (view === "week") {
      const mon = getMonday(currentDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return today.getTime() >= mon.getTime() && today.getTime() <= sun.getTime();
    } else {
      return today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();
    }
  };

  const getFormattedDatePickerLabel = () => {
    const capitalized = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    if (view === "day") {
      return capitalized(currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }));
    } else if (view === "week") {
      const start = getMonday(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (hideWeekends ? 4 : 6));
      const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      return `${start.toLocaleDateString("es-ES", options)} - ${end.toLocaleDateString("es-ES", { ...options, year: "numeric" })}`;
    } else {
      return capitalized(currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" }));
    }
  };

  const handlePickerMonthChange = (newMonth: number) => {
    setPickerMonth(newMonth);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(newMonth);
      setCurrentDate(nextDate);
    }
  };

  const handlePickerYearChange = (newYear: number) => {
    setPickerYear(newYear);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setFullYear(newYear);
      setCurrentDate(nextDate);
    }
  };

  const handlePrevPickerMonth = () => {
    let newMonth = pickerMonth - 1;
    let newYear = pickerYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setPickerMonth(newMonth);
    setPickerYear(newYear);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(newMonth);
      nextDate.setFullYear(newYear);
      setCurrentDate(nextDate);
    }
  };

  const handleNextPickerMonth = () => {
    let newMonth = pickerMonth + 1;
    let newYear = pickerYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setPickerMonth(newMonth);
    setPickerYear(newYear);
    if (view === "month") {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(newMonth);
      nextDate.setFullYear(newYear);
      setCurrentDate(nextDate);
    }
  };

  // Calendar slot interactions (15-min intervals)
  const handleSlotClick = (userId: string, hour: number, minutes: number, customDate?: Date) => {
    const slotDate = new Date(customDate || currentDate);
    slotDate.setHours(hour, minutes, 0, 0);

    setSelectedSlot({ start: slotDate, userId });
    setFormUserId(userId);
    setFormClientId("");
    setFormServiceId(servicesList[0]?.id || "");
    
    // date picker format: YYYY-MM-DD
    const yyyy = slotDate.getFullYear();
    const mm = String(slotDate.getMonth() + 1).padStart(2, "0");
    const dd = String(slotDate.getDate()).padStart(2, "0");
    const dateFormatted = `${yyyy}-${mm}-${dd}`;
    setFormDate(dateFormatted);
    
    // time picker format: HH:MM
    const hh = String(slotDate.getHours()).padStart(2, "0");
    const min = String(slotDate.getMinutes()).padStart(2, "0");
    const timeFormatted = `${hh}:${min}`;
    setFormTime(timeFormatted);
    setFormNotes("");

    // Prefill Block Form fields as well
    setBlockTitle("");
    setSelectedBlockDates([dateFormatted]);
    setBlockStartTime(timeFormatted);
    setPopoverMonth(slotDate.getMonth());
    setPopoverYear(slotDate.getFullYear());
    setShowFrequencyPopover(false);
    
    let endHour = hour + 1;
    let endMinutes = minutes;
    if (endHour >= 20) {
      endHour = 20;
      endMinutes = 0;
    }
    const endHStr = String(endHour).padStart(2, "0");
    const endMStr = String(endMinutes).padStart(2, "0");
    setBlockEndTime(`${endHStr}:${endMStr}`);
    setBlockNotes("");

    // Clear patient search, suggestions and form fields
    setPatientSearch("");
    setShowSuggestions(false);
    setIsNewPatient(false);
    setNewPatientTab("general");
    
    setFormPatFirstName("");
    setFormPatLastName("");
    setFormPatBirthDate("");
    setFormPatDniNif("");
    setFormPatPhone("");
    setFormPatEmail("");
    setFormPatAddress("");
    setFormPatMunicipality("");
    setFormPatPostalCode("");
    setFormPatCountry("España");
    setFormPatIsSelfEmployed(false);
    setFormPatIsCompany(false);
    setFormPatReceivesReminders(true);
    setFormPatOccupation("");
    setFormPatGender("Femenino");
    setFormPatMaritalStatus("Soltero/a");
    setFormPatIban("");
    setFormPatBic("");
    setFormPatProvince("");
    setFormPatLandline("");
    
    // Nueva Cita drawer states
    setFormClinicId(activeClinic?.id || "");
    setFormStatus("CONFIRMED");
    setAppointmentTags([]);
    setShowTagInput(false);
    setNewTagName("");
    setShowServiceDropdown(false);
    setShowFormStatusDropdown(false);

    setShowOptionModal(true);
  };

  const handleAppointmentClick = (app: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(app);
    setFormClientId(app.clientId);
    setFormUserId(app.userId);
    setFormServiceId(app.serviceId);
    setFormStatus(app.status);
    setFormNotes(app.notes || "");
    
    const startD = new Date(app.start);
    const yyyy = startD.getFullYear();
    const mm = String(startD.getMonth() + 1).padStart(2, "0");
    const dd = String(startD.getDate()).padStart(2, "0");
    setFormDate(`${yyyy}-${mm}-${dd}`);
    
    const hh = String(startD.getHours()).padStart(2, "0");
    const min = String(startD.getMinutes()).padStart(2, "0");
    setFormTime(`${hh}:${min}`);
    
    // Reset custom view modal states
    setEditModalTab("datos");
    setIsEditingApp(false);
    setShowStatusDropdown(false);
    setShowMoreOptions(false);
    setEditPatReceivesReminders((app.client as any).receivesReminders ?? true);
    setCitasSubTab("pasadas");

    // Parse clinical notes
    let parsedNotes = {
      observaciones: "",
      diagnostico: "",
      operacion: "",
      tratamiento: "",
      medicacion: "",
      materialLotes: ""
    };
    if (app.notes) {
      const trimmedNotes = app.notes.trim();
      if (trimmedNotes.startsWith("{") && trimmedNotes.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmedNotes);
          parsedNotes = {
            observaciones: obj.observaciones || "",
            diagnostico: obj.diagnostico || "",
            operacion: obj.operacion || "",
            tratamiento: obj.tratamiento || "",
            medicacion: obj.medicacion || "",
            materialLotes: obj.materialLotes || ""
          };
        } catch (err) {
          parsedNotes.observaciones = app.notes;
        }
      } else {
        parsedNotes.observaciones = app.notes;
      }
    }
    setSegObservaciones(parsedNotes.observaciones);
    setSegDiagnostico(parsedNotes.diagnostico);
    setSegOperacion(parsedNotes.operacion);
    setSegTratamiento(parsedNotes.tratamiento);
    setSegMedicacion(parsedNotes.medicacion);
    setSegMaterialLotes(parsedNotes.materialLotes);
    
    // Load client vouchers (own + shared) for the appointment info panel
    setAppointmentClientVouchers([]);
    setLoadingAppointmentVouchers(true);
    fetch(`/api/clients/${app.clientId}/vouchers?includeShared=true`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAppointmentClientVouchers(data);
        }
      })
      .catch((err) => {
        console.error("Error loading appointment client vouchers:", err);
      })
      .finally(() => {
        setLoadingAppointmentVouchers(false);
      });

    // Load appointment audit logs
    setAppointmentLogs([]);
    setLoadingLogs(true);
    fetch(`/api/appointments/${app.id}/logs`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointmentLogs(data);
      })
      .catch((err) => console.error("Error loading appointment logs:", err))
      .finally(() => setLoadingLogs(false));

    setShowEditModal(true);
  };

  const handleToggleReminders = async (checked: boolean) => {
    setEditPatReceivesReminders(checked);
    if (!selectedAppointment) return;

    try {
      const res = await fetch(`/api/clients/${selectedAppointment.client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedAppointment.client,
          receivesReminders: checked,
        }),
      });

      if (res.ok) {
        const updatedClient = await res.json();
        setClientsList((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
        setSelectedAppointment((prev) => (prev ? { ...prev, client: updatedClient } : null));
        fetchAppointments();
      }
    } catch (err) {
      console.error("Error toggling reminders:", err);
    }
  };

  const getFormattedReminderMessage = (templateText: string, app: any) => {
    if (!templateText) return "";
    
    // Parse Dates
    const startD = new Date(app.start);
    const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const longDateFormatted = startD.toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const vars: Record<string, string> = {
      "{{Cliente:Nombre}}": app.client?.firstName || "",
      "{{Cliente:Apellidos}}": app.client?.lastName || "",
      "{{Cliente:Dirección_Cliente}}": app.client?.address || "",
      "{{Nombre_Consulta}}": app.clinic?.name || activeClinic?.name || "",
      "{{Dirección_Consulta}}": app.clinic?.address || activeClinic?.address || "",
      "{{Fecha_Hora_Cita}}": `${dateFormatted} a las ${timeFormatted}`,
      "{{Fecha_larga}}": longDateFormatted,
      "{{Hora_Cita}}": timeFormatted,
      "{{Nombre_Servicio}}": app.service?.name || "",
      "{{Empleado_Nombre_Completo}}": app.user ? `${app.user.name} ${app.user.lastName || ""}`.trim() : "",
      "{{Empleado_Nombre}}": app.user?.name || "",
      "{{Empleado_Apellidos}}": app.user?.lastName || "",
      "{{Empleado_Correo}}": app.user?.email || "",
      "{{Empleado_DNI}}": app.user?.dniNif || "",
      "{{Empleado_Teléfono}}": app.user?.phone || "",
      "{{Link_VideoConsulta}}": `https://meet.jit.si/clifav-${app.id}`,
      "{{Link_Cancelar_Cita}}": `${window.location.origin}/appointments/${app.id}/cancel`,
      "{{Link_Mover_Cita}}": `${window.location.origin}/appointments/${app.id}/reschedule`,
      "{{Link_Confirmar_Cita}}": `${window.location.origin}/appointments/${app.id}/confirm`,
      "{{Link_Pago_Online}}": `${window.location.origin}/appointments/${app.id}/pay`,
      "{{Recurso}}": "",
      "{{Zona_horaria}}": "Europe/Madrid",
      "{{Deuda}}": "0.00",
    };

    let msg = templateText;
    Object.keys(vars).forEach((key) => {
      msg = msg.replaceAll(key, vars[key]);
    });
    return msg;
  };

  const handleSendWhatsAppReminder = async (app: any) => {
    const cleanPhone = (app.client.phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      alert("El cliente no tiene un número de teléfono configurado.");
      return;
    }

    // Buscar recordatorio activo para el servicio y clínica
    const matchingReminder = clinicReminders.find((r) => {
      const matchClinic = r.clinicId === app.clinicId || r.clinicId === activeClinic?.id;
      const matchStatus = r.condition === app.status;
      const matchChannel = r.channel === "WHATSAPP_MANUAL";
      const matchService = r.allServices || (r.serviceIds ? r.serviceIds.split(",").includes(app.serviceId) : false);
      return matchClinic && matchStatus && matchChannel && matchService;
    });

    let message = "";
    if (matchingReminder) {
      message = getFormattedReminderMessage(matchingReminder.message, app);
    } else {
      // Mensaje genérico por defecto
      const startD = new Date(app.start);
      const timeFormatted = startD.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const dateFormatted = startD.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
      message = `Hola ${app.client.firstName}, te recordamos tu cita para ${app.service.name} el día ${dateFormatted} a las ${timeFormatted}. ¡Te esperamos!`;
    }

    const isAppMode = activeClinic?.defaultWhatsappMode === "App";
    const whatsappUrl = isAppMode 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");


    // Guardar en el log de forma asíncrona
    try {
      await fetch("/api/notifications/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: app.clinicId || activeClinic?.id,
          clientId: app.clientId,
          clientName: `${app.client.firstName} ${app.client.lastName || ""}`.trim(),
          appointmentId: app.id,
          channel: "WHATSAPP_MANUAL",
          recipient: cleanPhone,
          message: message,
          status: "SENT",
        }),
      });
    } catch (e) {
      console.error("Error creating notification log:", e);
    }
  };


  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedAppointment) return;
    if (!canCreateOrEditAppointment(currentUser)) {
      alert("No tienes permisos para modificar citas (Sólo lectura).");
      return;
    }

    const payload = {
      id: selectedAppointment.id,
      userId: selectedAppointment.userId,
      serviceId: selectedAppointment.serviceId,
      start: selectedAppointment.start,
      end: selectedAppointment.end,
      status: newStatus,
      notes: selectedAppointment.notes || "",
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (useVoucherSession && matchingVoucher && newStatus === "COMPLETED" && selectedAppointment.status !== "COMPLETED") {
          try {
            await fetch(`/api/clients/${selectedAppointment.clientId}/vouchers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clientVoucherId: matchingVoucher.id, action: "consume" }),
            });
          } catch (vErr) {
            console.error("Error consuming voucher session:", vErr);
          }
        }
        const updatedApp = { ...selectedAppointment, status: newStatus };
        setSelectedAppointment(updatedApp);
        setFormStatus(newStatus);
        fetchAppointments();
        triggerAutoSync();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
    setShowStatusDropdown(false);
  };

  const formatDrawerDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(`${dateStr}T12:00:00`);
      const weekday = date.toLocaleDateString("es-ES", { weekday: "short" });
      const day = date.getDate();
      const month = date.toLocaleDateString("es-ES", { month: "long" });
      return `${weekday} ${day} ${month}`;
    } catch {
      return dateStr;
    }
  };

  const handleSelectWalkInClient = async () => {
    let walkIn = clientsList.find(c => 
      c.firstName.toLowerCase() === "cliente de" && 
      c.lastName.toLowerCase() === "paso"
    );
    if (!walkIn) {
      const newClientPayload = {
        firstName: "Cliente de",
        lastName: "paso",
        phone: "",
        email: "",
        dniNif: "",
        birthDate: null,
        gender: "Otro",
        address: "",
        municipality: "",
        postalCode: "",
        country: "España",
        province: "",
        landline: "",
        iban: "",
        bic: "",
        tags: "",
        clinicId: activeClinic?.id || currentUser?.clinics[0]?.id || "",
        isSelfEmployed: false,
        isCompany: false,
        receivesReminders: false,
        occupation: "",
        maritalStatus: "Soltero/a",
      };
      try {
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newClientPayload),
        });
        if (clientRes.ok) {
          walkIn = await clientRes.json();
          setClientsList((prev) => [...prev, walkIn!]);
        }
      } catch (err) {
        console.error("Error creating walk-in client:", err);
      }
    }
    if (walkIn) {
      setFormClientId(walkIn.id);
    } else {
      alert("No se pudo crear o seleccionar el Cliente de paso");
    }
  };

  const handleCreateContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatFirstName || !formPatLastName || !activeClinic) {
      alert("Nombre y apellidos son obligatorios");
      return;
    }
    const newClientPayload = {
      firstName: formPatFirstName,
      lastName: formPatLastName,
      phone: formPatPhone,
      email: formPatEmail,
      dniNif: formPatDniNif,
      birthDate: formPatBirthDate || null,
      gender: formPatGender,
      address: formPatAddress,
      municipality: formPatMunicipality,
      postalCode: formPatPostalCode,
      country: formPatCountry,
      province: formPatProvince,
      landline: formPatLandline,
      iban: formPatIban,
      bic: formPatBic,
      tags: "",
      clinicId: activeClinic.id,
      isSelfEmployed: formPatIsSelfEmployed,
      isCompany: formPatIsCompany,
      receivesReminders: formPatReceivesReminders,
      occupation: formPatOccupation,
      maritalStatus: formPatMaritalStatus,
    };
    try {
      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientPayload),
      });

      if (!clientRes.ok) {
        const errData = await clientRes.json();
        alert(`Error al registrar el cliente: ${errData.error || "error desconocido"}`);
        return;
      }

      const newClient = await clientRes.json();
      setClientsList((prev) => [...prev, newClient]);
      setFormClientId(newClient.id);
      setShowCreateContactModal(false);
      
      // Clear contact form states
      setFormPatFirstName("");
      setFormPatLastName("");
      setFormPatBirthDate("");
      setFormPatDniNif("");
      setFormPatPhone("");
      setFormPatEmail("");
      setFormPatAddress("");
      setFormPatProvince("");
      setFormPatLandline("");
      setFormPatMunicipality("");
      setFormPatPostalCode("");
      setFormPatCountry("España");
      setFormPatIsSelfEmployed(false);
      setFormPatIsCompany(false);
      setFormPatReceivesReminders(true);
      setFormPatOccupation("");
      setFormPatGender("Femenino");
      setFormPatMaritalStatus("Soltero/a");
      setFormPatIban("");
      setFormPatBic("");
    } catch (err) {
      console.error(err);
      alert("Error al registrar el cliente");
    }
  };

  // Submit appointment creation
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateOrEditAppointment(currentUser)) {
      alert("No tienes permisos para crear citas (Sólo lectura).");
      return;
    }

    let clientIdToUse = formClientId;

    if (isNewPatient) {
      if (!formPatFirstName || !formPatLastName || !activeClinic) {
        alert("Nombre y apellidos son obligatorios para registrar al paciente");
        return;
      }

      const newClientPayload = {
        firstName: formPatFirstName,
        lastName: formPatLastName,
        phone: formPatPhone,
        email: formPatEmail,
        dniNif: formPatDniNif,
        birthDate: formPatBirthDate || null,
        gender: formPatGender,
        address: formPatAddress,
        municipality: formPatMunicipality,
        postalCode: formPatPostalCode,
        country: formPatCountry,
        iban: formPatIban,
        bic: formPatBic,
        tags: "",
        clinicId: activeClinic.id,
        isSelfEmployed: formPatIsSelfEmployed,
        isCompany: formPatIsCompany,
        receivesReminders: formPatReceivesReminders,
        occupation: formPatOccupation,
        maritalStatus: formPatMaritalStatus,
      };

      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClientPayload),
      });

      if (!clientRes.ok) {
        const errData = await clientRes.json();
        alert(`Error al registrar el paciente: ${errData.error || "error desconocido"}`);
        return;
      }

      const newClient = await clientRes.json();
      setClientsList((prev) => [...prev, newClient]);
      clientIdToUse = newClient.id;
    }

    if (!clientIdToUse || !formUserId || !formServiceId || !formDate || !formTime || !formClinicId) {
      alert("Por favor, selecciona o crea un paciente y rellena todos los campos.");
      return;
    }

    // Save tags to the client
    if (appointmentTags.length > 0) {
      const clientObj = clientsList.find(c => c.id === clientIdToUse);
      if (clientObj) {
        const existingTags = clientObj.tags ? clientObj.tags.split(",") : [];
        const combinedTags = Array.from(new Set([...existingTags, ...appointmentTags])).join(",");
        try {
          await fetch(`/api/clients/${clientIdToUse}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...clientObj, tags: combinedTags })
          });
        } catch (err) {
          console.error("Error saving client tags:", err);
        }
      }
    }

    const startDateTime = new Date(`${formDate}T${formTime}`);
    const selectedService = servicesList.find((s) => s.id === formServiceId);
    const duration = selectedService ? selectedService.duration : 45;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const payload = {
      clientId: clientIdToUse,
      userId: formUserId,
      serviceId: formServiceId,
      clinicId: formClinicId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      notes: formNotes,
      status: formStatus || "CONFIRMED",
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const createdApp = await res.json();
      if (useVoucherSession && matchingVoucher && (formStatus === "COMPLETED" || createdApp.status === "COMPLETED")) {
        try {
          await fetch(`/api/clients/${createdApp.clientId}/vouchers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientVoucherId: matchingVoucher.id, action: "consume" }),
          });
        } catch (vErr) {
          console.error("Error consuming voucher session:", vErr);
        }
      }
      if (activeWaitlistEntryForAppointment) {
        try {
          await fetch(`/api/waitlist/${activeWaitlistEntryForAppointment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ASSIGNED" }),
          });
          setActiveWaitlistEntryForAppointment(null);
          fetchWaitlist();
        } catch (wErr) {
          console.error("Error updating waitlist entry status:", wErr);
        }
      }
      setShowCreateModal(false);
      fetchAppointments();
      triggerAutoSync();
      return createdApp;
    } else {
      alert("Error al reservar la cita");
      return null;
    }
  };

  // Submit appointment edit
  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateOrEditAppointment(currentUser)) {
      alert("No tienes permisos para modificar citas (Sólo lectura).");
      return;
    }
    if (!selectedAppointment || !formUserId || !formServiceId || !formDate || !formTime) return;

    const startDateTime = new Date(`${formDate}T${formTime}`);
    const selectedService = servicesList.find((s) => s.id === formServiceId);
    const duration = selectedService ? selectedService.duration : 45;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const payload = {
      id: selectedAppointment.id,
      userId: formUserId,
      serviceId: formServiceId,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      status: formStatus,
      notes: formNotes,
      actorName: currentUser ? currentUser.name : "Sistema",
      actorId: currentUser?.id,
    };

    const res = await fetch("/api/appointments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (useVoucherSession && matchingVoucher && formStatus === "COMPLETED" && selectedAppointment.status !== "COMPLETED") {
        try {
          await fetch(`/api/clients/${selectedAppointment.clientId}/vouchers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientVoucherId: matchingVoucher.id, action: "consume" }),
          });
        } catch (vErr) {
          console.error("Error consuming voucher session:", vErr);
        }
      }
      setShowEditModal(false);
      fetchAppointments();
      triggerAutoSync();
    }
  };

  // Cancel/Delete appointment
  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    if (!canDeleteAppointment(currentUser)) {
      alert("No tienes permisos para eliminar citas.");
      return;
    }

    if (confirm("¿Estás seguro de que deseas cancelar y eliminar esta cita?")) {
      const userNameQuery = currentUser ? encodeURIComponent(currentUser.name) : "Sistema";
      const userIdQuery = currentUser?.id || "";
      const res = await fetch(`/api/appointments/${selectedAppointment.id}?userName=${userNameQuery}&userId=${userIdQuery}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchAppointments();
        triggerAutoSync();
      }
    }
  };

  // Save clinical follow-up (Seguimientos)
  const handleSaveSeguimiento = async () => {
    if (!selectedAppointment) return;

    const serializedNotes = JSON.stringify({
      observaciones: segObservaciones,
      diagnostico: segDiagnostico,
      operacion: segOperacion,
      tratamiento: segTratamiento,
      medicacion: segMedicacion,
      materialLotes: segMaterialLotes
    });

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAppointment.id,
          notes: serializedNotes,
          actorName: currentUser ? currentUser.name : "Sistema",
          actorId: currentUser?.id,
        }),
      });

      if (res.ok) {
        const updatedApp = { ...selectedAppointment, notes: serializedNotes };
        setSelectedAppointment(updatedApp);
        fetchAppointments();
        triggerAutoSync();
        alert("Seguimiento guardado correctamente.");
      } else {
        alert("Error al guardar el seguimiento.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar el seguimiento.");
    }
  };

  // Time Block creation and deletion
  const handleCreateTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleCreateTimeBlock triggered", {
      blockTitle,
      formUserId,
      selectedBlockDates,
      blockStartTime,
      blockEndTime,
      activeClinic
    });

    if (!blockTitle || !formUserId || selectedBlockDates.length === 0 || !blockStartTime || !blockEndTime || !activeClinic) {
      alert("Por favor, rellene todos los campos para crear el bloqueo.");
      return;
    }

    try {
      for (const dateStr of selectedBlockDates) {
        const startDateTime = new Date(`${dateStr}T${blockStartTime}`);
        const endDateTime = new Date(`${dateStr}T${blockEndTime}`);

        if (endDateTime.getTime() <= startDateTime.getTime()) {
          throw new Error(`La hora final debe ser posterior a la hora de inicio para el día ${dateStr}.`);
        }

        const payload = {
          title: blockTitle,
          userId: formUserId,
          clinicId: activeClinic.id,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          notes: blockNotes,
        };

        const res = await fetch("/api/time-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "error desconocido");
        }
      }

      setShowBlockModal(false);
      fetchAppointments();
      triggerAutoSync();
    } catch (err: any) {
      console.error("Error creating time blocks:", err);
      alert(`Error al crear el bloqueo: ${err.message || err}`);
    }
  };

  const handleDeleteTimeBlock = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este bloqueo de tiempo?")) return;
    try {
      const res = await fetch(`/api/time-blocks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowBlockDetailModal(false);
        setSelectedTimeBlock(null);
        fetchAppointments();
        triggerAutoSync();
      } else {
        alert("Error al eliminar el bloqueo");
      }
    } catch (err) {
      console.error("Error deleting time block:", err);
      alert("Error en el servidor");
    }
  };

  const handleUpdateTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimeBlock) return;
    
    const origStart = new Date(selectedTimeBlock.start);
    const yyyy = origStart.getFullYear();
    const mm = String(origStart.getMonth() + 1).padStart(2, "0");
    const dd = String(origStart.getDate()).padStart(2, "0");
    const dateFormatted = `${yyyy}-${mm}-${dd}`;

    const startDateTime = new Date(`${dateFormatted}T${blockStartTime}`);
    const endDateTime = new Date(`${dateFormatted}T${blockEndTime}`);

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      alert("La hora final debe ser posterior a la hora de inicio.");
      return;
    }

    try {
      const res = await fetch(`/api/time-blocks/${selectedTimeBlock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: blockTitle,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          notes: blockNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "error desconocido");
      }

      setShowBlockDetailModal(false);
      setSelectedTimeBlock(null);
      fetchAppointments();
      triggerAutoSync();
    } catch (err: any) {
      console.error("Error updating time block:", err);
      alert(`Error al actualizar el bloqueo: ${err.message || err}`);
    }
  };

  const handleConvertBlockToAppointment = () => {
    if (!selectedTimeBlock) return;
    
    setConvertClientId("");
    setConvertServiceId(servicesList[0]?.id || "");
    setConvertLocationId(activeClinic?.id || "");
    
    setShowBlockDetailModal(false);
    setShowConvertModal(true);
  };

  const handleExecuteConvertBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimeBlock || !convertClientId || !convertServiceId || !convertLocationId) return;

    try {
      const deleteRes = await fetch(`/api/time-blocks/${selectedTimeBlock.id}`, {
        method: "DELETE",
      });

      if (!deleteRes.ok) {
        alert("Error al eliminar la reserva de tiempo para la conversión.");
        return;
      }

      const appPayload = {
        clientId: convertClientId,
        userId: selectedTimeBlock.userId,
        serviceId: convertServiceId,
        clinicId: convertLocationId,
        start: selectedTimeBlock.start,
        end: selectedTimeBlock.end,
        status: "PENDING",
        notes: selectedTimeBlock.notes || "",
        actorName: currentUser ? currentUser.name : "Sistema",
        actorId: currentUser?.id,
      };

      const createRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appPayload),
      });

      if (!createRes.ok) {
        alert("Error al crear la cita.");
        return;
      }

      setShowConvertModal(false);
      setSelectedTimeBlock(null);
      fetchAppointments();
      alert("Reserva de tiempo convertida en cita con éxito.");
    } catch (err) {
      console.error("Error converting block to appointment:", err);
      alert("Error al realizar la conversión.");
    }
  };

  const handleAddToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistClientId || !activeClinic) {
      alert("Por favor, selecciona un paciente.");
      return;
    }

    try {
      const payload = {
        clientId: waitlistClientId,
        userId: waitlistUserId === "all" ? null : waitlistUserId,
        serviceId: waitlistServiceId === "all" ? null : waitlistServiceId,
        clinicId: activeClinic.id,
        notes: waitlistNotes,
        preferredDayOfWeek: waitlistPreferredDay === "all" ? null : Number(waitlistPreferredDay),
        preferredTimeRange: waitlistPreferredTime === "all" ? null : waitlistPreferredTime,
      };

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchWaitlist();
        setWaitlistSubView("list");
        alert("Paciente añadido a la lista de espera con éxito.");
      } else {
        alert("Error al añadir a la lista de espera.");
      }
    } catch (err) {
      console.error("Error adding to waitlist:", err);
      alert("Error al procesar la solicitud.");
    }
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar a este paciente de la lista de espera?")) return;

    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchWaitlist();
        alert("Entrada eliminada con éxito.");
      } else {
        alert("Error al eliminar de la lista de espera.");
      }
    } catch (err) {
      console.error("Error deleting waitlist entry:", err);
      alert("Error al procesar la solicitud.");
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 15) {
        if (hour === 20 && min > 0) break;
        const hStr = String(hour).padStart(2, "0");
        const mStr = String(min).padStart(2, "0");
        options.push(`${hStr}:${mStr}`);
      }
    }
    return options;
  };
  const timeOptions = generateTimeOptions();

  // Render Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
    const visibleStaff = staffList.filter((s) => checkedStaffIds.includes(s.id));

    if (visibleStaff.length === 0) {
      return (
        <div className={styles.emptyGrid}>
          Selecciona al menos un miembro del personal para ver su agenda.
        </div>
      );
    }

    return (
      <div className={styles.dayGridContainer} style={{ "--hour-row-height": `${60 * zoomScale}px` } as React.CSSProperties}>
        {/* Hour column on left */}
        <div className={styles.timeColumn}>
          <div className={styles.columnHeaderSpace}>Hora</div>
          {hours.map((hour) => (
            <div key={hour} className={styles.hourCell}>
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Staff columns side-by-side */}
        <div className={styles.staffColumnsContainer}>
          {visibleStaff.map((staff) => {
            // Get appointments for this staff member today
            const staffApps = appointments.filter(
              (app) =>
                app.userId === staff.id &&
                (selectedServiceId === "all" || app.serviceId === selectedServiceId) &&
                (filterClientId === "all" || app.clientId === filterClientId) &&
                (filterClinicId === "all" || app.clinicId === filterClinicId) &&
                (clientSearchQuery === "" ||
                  `${app.client.firstName} ${app.client.lastName}`
                    .toLowerCase()
                    .includes(clientSearchQuery.toLowerCase()))
            );

            // Get time blocks for this staff member today
            const staffBlocks = timeBlocks.filter(
              (block) =>
                block.userId === staff.id &&
                new Date(block.start).toDateString() === currentDate.toDateString()
            );

            return (
              <div key={staff.id} className={styles.staffColumn}>
                <div className={styles.staffColumnHeader}>
                  <span className={styles.staffName}>{staff.name} {staff.lastName || ""}</span>
                  <span className={styles.staffRole}>
                    {staff.role === "ADMIN" ? "Directora" : staff.role === "DOCTOR" ? "Médico/Fisio" : "Terapeuta"}
                  </span>
                </div>

                {/* Column Body Grid */}
                <div className={styles.columnGridBody}>
                  {hours.map((hour) => (
                    <div key={hour} className={styles.hourRow}>
                      {/* 15-minute sub-intervals shown on hover */}
                      <div className={styles.quarterIntervals}>
                        <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 0)}>
                          <span>+ {String(hour).padStart(2, "0")}:00</span>
                        </div>
                        <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 15)}>
                          <span>+ {String(hour).padStart(2, "0")}:15</span>
                        </div>
                        <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 30)}>
                          <span>+ {String(hour).padStart(2, "0")}:30</span>
                        </div>
                        <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 45)}>
                          <span>+ {String(hour).padStart(2, "0")}:45</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Absolute positioned appointments */}
                  {staffApps.map((app) => {
                    const startD = new Date(app.start);
                    const endD = new Date(app.end);
                    
                    const startHours = startD.getHours();
                    const startMins = startD.getMinutes();
                    const endHours = endD.getHours();
                    const endMins = endD.getMinutes();

                    // Calculate positioning: starts at 8:00 (480 minutes).
                    const startTotalMins = startHours * 60 + startMins;
                    const offsetMins = startTotalMins - 8 * 60; // relative to 8:00
                    const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                    // Compute styles: scale according to zoomLevel.
                    const top = offsetMins * zoomScale;
                    const height = durationMins * zoomScale;

                    // If it overflows the calendar view boundary (e.g. before 8am or after 8pm), clamp it.
                    if (top < 0) return null;

                    let statusClass = styles.statusPending;
                    if (app.status === "CONFIRMED") statusClass = styles.statusConfirmed;
                    if (app.status === "COMPLETED") statusClass = styles.statusCompleted;
                    if (app.status === "CANCELLED") statusClass = styles.statusCancelled;

                    const staffIdx = visibleStaff.findIndex(s => s.id === staff.id);
                    const isRightHalf = visibleStaff.length > 1 && staffIdx >= visibleStaff.length / 2;

                    let cardSizeClass = "";
                    if (durationMins < 25) {
                      cardSizeClass = styles.microCard;
                    } else if (durationMins < 45) {
                      cardSizeClass = styles.miniCard;
                    }

                    return (
                      <div
                        key={app.id}
                        className={`${styles.appointmentCard} ${statusClass} ${cardSizeClass}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          borderLeftColor: app.service.color || "var(--primary)",
                          padding: height < 25 ? "2px 6px" : height < 45 ? "4px 6px" : undefined,
                        }}
                        onClick={(e) => handleAppointmentClick(app, e)}
                      >
                        <div className={styles.appCardHeader}>
                          <div className={styles.appClient} style={{ margin: 0, padding: 0, minWidth: 0, flex: 1, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "3px" }}>
                            {app.tags && app.tags.split(",").filter(Boolean).map(tagStr => {
                              const [tagName, tagColor] = tagStr.split(":");
                              return (
                                <span 
                                  key={tagName} 
                                  style={{ 
                                    width: "8px", 
                                    height: "8px", 
                                    borderRadius: "50%", 
                                    backgroundColor: tagColor || "#ef4444", 
                                    display: "inline-block",
                                    flexShrink: 0
                                  }} 
                                  title={tagName}
                                />
                              );
                            })}
                            <span>{app.client.firstName} {app.client.lastName}</span>
                          </div>
                          <span className={`${styles.statusDot} ${styles[app.status.toLowerCase()]}`} style={{ flexShrink: 0, marginLeft: "6px" }}></span>
                        </div>
                        <div className={styles.appTime}>
                          {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                        </div>
                        <div className={styles.appService}>
                          {app.service.name}
                        </div>

                        {/* Tooltip on hover */}
                        <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                          <div className={styles.tooltipUserRow}>
                            <div className={styles.tooltipAvatar}>
                              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            </div>
                            <div className={styles.tooltipUserInfo}>
                              <div className={styles.tooltipUserName}>
                                {`${app.client.firstName} ${app.client.lastName}`.toUpperCase()}
                              </div>
                              <div className={styles.tooltipUserPhone}>
                                {app.client.phone || "Sin teléfono"}
                              </div>
                            </div>
                          </div>

                          <div className={styles.tooltipDivider} />

                          <div className={styles.tooltipDetailsRow}>
                            <div 
                              className={styles.tooltipTimeBox}
                              style={{ borderLeft: `4px solid ${app.service.color || "var(--primary)"}` }}
                            >
                              <div className={styles.tooltipTimeText}>
                                {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                              </div>
                              <div className={styles.tooltipTimeText}>
                                {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                              </div>
                            </div>
                            <div className={styles.tooltipServiceInfo}>
                              <div className={styles.tooltipServiceName}>{app.service.name}</div>
                              <div className={styles.tooltipServiceDate}>
                                {(() => {
                                  const yy = String(startD.getFullYear()).slice(-2);
                                  const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                  const dd = String(startD.getDate()).padStart(2, "0");
                                  return `${dd}.${mm}.${yy}`;
                                })()}
                              </div>
                            </div>
                          </div>

                          {app.notes && (
                            <>
                              <div className={styles.tooltipDivider} />
                              <div className={styles.tooltipNotesSection}>
                                <div className={styles.tooltipNotesHeader}>
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <span>Nota interna</span>
                                </div>
                                <div className={styles.tooltipNotesContent}>
                                  {app.notes}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Absolute positioned time blocks */}
                  {staffBlocks.map((block) => {
                    const startD = new Date(block.start);
                    const endD = new Date(block.end);

                    const startHours = startD.getHours();
                    const startMins = startD.getMinutes();
                    const endHours = endD.getHours();
                    const endMins = endD.getMinutes();

                    const startTotalMins = startHours * 60 + startMins;
                    const offsetMins = startTotalMins - 8 * 60; // relative to 8:00
                    const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                    const top = offsetMins * zoomScale;
                    const height = durationMins * zoomScale;

                    if (top < 0) return null;

                    const staffIdx = visibleStaff.findIndex(s => s.id === staff.id);
                    const isRightHalf = visibleStaff.length > 1 && staffIdx >= visibleStaff.length / 2;

                    return (
                      <div
                        key={block.id}
                        className={`${styles.appointmentCard} ${styles.timeBlockCard}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTimeBlock(block);
                          setBlockTitle(block.title);
                          const stD = new Date(block.start);
                          const enD = new Date(block.end);
                          const sh = String(stD.getHours()).padStart(2, "0");
                          const sm = String(stD.getMinutes()).padStart(2, "0");
                          const eh = String(enD.getHours()).padStart(2, "0");
                          const em = String(enD.getMinutes()).padStart(2, "0");
                          setBlockStartTime(`${sh}:${sm}`);
                          setBlockEndTime(`${eh}:${em}`);
                          setBlockNotes(block.notes || "");
                          setShowBlockDetailModal(true);
                        }}
                      >
                        <div className={styles.appCardHeader}>
                          <span className={styles.appTime}>
                            {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                          </span>
                          <Icons.Lock size={12} className={styles.blockLockIcon} />
                        </div>
                        <div className={styles.blockTitle}>
                          {block.title}
                        </div>
                        {block.notes && (
                          <div className={styles.blockNotes}>
                            {block.notes}
                          </div>
                        )}

                        {/* Tooltip on hover for time block */}
                        <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                          <div className={styles.tooltipDetailsRow}>
                            <div 
                              className={styles.tooltipTimeBox}
                              style={{ borderLeft: `4px solid #babcbe` }}
                            >
                              <div className={styles.tooltipTimeText}>
                                {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                              </div>
                              <div className={styles.tooltipTimeText}>
                                {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                              </div>
                            </div>
                            <div className={styles.tooltipServiceInfo}>
                              <div className={styles.tooltipServiceName}>{block.title}</div>
                              <div className={styles.tooltipServiceDate}>
                                {(() => {
                                  const yy = String(startD.getFullYear()).slice(-2);
                                  const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                  const dd = String(startD.getDate()).padStart(2, "0");
                                  return `${dd}.${mm}.${yy}`;
                                })()}
                              </div>
                            </div>
                          </div>

                          {block.notes && (
                            <>
                              <div className={styles.tooltipDivider} />
                              <div className={styles.tooltipNotesSection}>
                                <div className={styles.tooltipNotesHeader}>
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <span>Nota interna</span>
                                </div>
                                <div className={styles.tooltipNotesContent}>
                                  {block.notes}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
    const visibleStaff = staffList.filter((s) => checkedStaffIds.includes(s.id));

    if (visibleStaff.length === 0) {
      return (
        <div className={styles.emptyGrid}>
          Selecciona al menos un miembro del personal para ver su agenda.
        </div>
      );
    }

    // Compute the dates for this week
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const weekDates = Array.from({ length: hideWeekends ? 5 : 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    return (
      <div className={styles.weekGridContainer} style={{ "--hour-row-height": `${60 * zoomScale}px` } as React.CSSProperties}>
        {/* Left Hour Column */}
        <div className={styles.timeColumn}>
          <div className={styles.columnHeaderSpace}>Hora</div>
          <div className={styles.weekStaffSubheaderSpace} />
          {hours.map((hour) => (
            <div key={hour} className={styles.hourCell}>
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Days grid container */}
        <div className={styles.weekDaysContainer}>
          {weekDates.map((dateObj, idx) => {
            const isToday = new Date().toDateString() === dateObj.toDateString();
            return (
              <div key={idx} className={`${styles.weekDayColumn} ${isToday ? styles.todayColumn : ""}`}>
                {/* Day Header: Lunes 22.06.2026 */}
                <div className={styles.weekDayHeader}>
                  <span className={styles.weekDayLabel}>
                    {daysOfWeek[idx]} {dateObj.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>

                {/* Sub-columns container for selected staff */}
                <div className={styles.weekDayStaffColumns}>
                  {visibleStaff.map((staff) => {
                    // Filter appointments for this day and user
                    const staffDayApps = appointments.filter((app) => {
                      const appD = new Date(app.start);
                      return (
                        app.userId === staff.id &&
                        appD.toDateString() === dateObj.toDateString() &&
                        (selectedServiceId === "all" || app.serviceId === selectedServiceId) &&
                        (filterClientId === "all" || app.clientId === filterClientId) &&
                        (filterClinicId === "all" || app.clinicId === filterClinicId) &&
                        (clientSearchQuery === "" ||
                          `${app.client.firstName} ${app.client.lastName}`
                            .toLowerCase()
                            .includes(clientSearchQuery.toLowerCase()))
                      );
                    });

                    // Filter time blocks for this day and user
                    const staffDayBlocks = timeBlocks.filter((block) => {
                      const blockD = new Date(block.start);
                      return (
                        block.userId === staff.id &&
                        blockD.toDateString() === dateObj.toDateString()
                      );
                    });

                    return (
                      <div key={staff.id} className={styles.weekDayStaffColumn}>
                        {/* Staff Subheader: [Avatar] Name */}
                        <div className={styles.weekDayStaffSubheader}>
                          <div className={styles.staffMiniAvatar}>
                            {`${staff.name} ${staff.lastName || ""}`
                              .trim()
                              .split(/\s+/)
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className={styles.staffMiniName}>{staff.name} {staff.lastName || ""}</span>
                        </div>

                        {/* Column body with hour grids and absolute appointments */}
                        <div className={styles.columnGridBody}>
                          {hours.map((hour) => (
                            <div key={hour} className={styles.hourRow}>
                              <div className={styles.quarterIntervals}>
                                <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 0, dateObj)}>
                                  <span>+ {String(hour).padStart(2, "0")}:00</span>
                                </div>
                                <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 15, dateObj)}>
                                  <span>+ {String(hour).padStart(2, "0")}:15</span>
                                </div>
                                <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 30, dateObj)}>
                                  <span>+ {String(hour).padStart(2, "0")}:30</span>
                                </div>
                                <div className={styles.quarter} onClick={() => handleSlotClick(staff.id, hour, 45, dateObj)}>
                                  <span>+ {String(hour).padStart(2, "0")}:45</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Render appointments */}
                          {staffDayApps.map((app) => {
                            const startD = new Date(app.start);
                            const endD = new Date(app.end);
                            
                            const startHours = startD.getHours();
                            const startMins = startD.getMinutes();
                            const endHours = endD.getHours();
                            const endMins = endD.getMinutes();

                            const startTotalMins = startHours * 60 + startMins;
                            const offsetMins = startTotalMins - 8 * 60;
                            const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                            const top = offsetMins * zoomScale;
                            const height = durationMins * zoomScale;

                            if (top < 0) return null;

                            let statusClass = styles.statusPending;
                            if (app.status === "CONFIRMED") statusClass = styles.statusConfirmed;
                            if (app.status === "COMPLETED") statusClass = styles.statusCompleted;
                            if (app.status === "CANCELLED") statusClass = styles.statusCancelled;

                            const isRightHalf = idx >= (hideWeekends ? 2 : 3);

                            let cardSizeClass = "";
                            if (durationMins < 25) {
                              cardSizeClass = styles.microCard;
                            } else if (durationMins < 45) {
                              cardSizeClass = styles.miniCard;
                            }

                            return (
                              <div
                                key={app.id}
                                className={`${styles.appointmentCard} ${statusClass} ${cardSizeClass}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  borderLeftColor: app.service.color || "var(--primary)",
                                  padding: height < 25 ? "2px 4px" : height < 45 ? "3px 4px" : "4px 6px",
                                }}
                                onClick={(e) => handleAppointmentClick(app, e)}
                              >
                                <div className={styles.appCardHeader} style={{ marginBottom: "2px" }}>
                                  <div className={styles.appClient} style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: "3px" }}>
                                    {app.tags && app.tags.split(",").filter(Boolean).map(tagStr => {
                                      const [tagName, tagColor] = tagStr.split(":");
                                      return (
                                        <span 
                                          key={tagName} 
                                          style={{ 
                                            width: "8px", 
                                            height: "8px", 
                                            borderRadius: "50%", 
                                            backgroundColor: tagColor || "#ef4444", 
                                            display: "inline-block",
                                            flexShrink: 0
                                          }} 
                                          title={tagName}
                                        />
                                      );
                                    })}
                                    <span>{app.client.firstName} {app.client.lastName}</span>
                                  </div>
                                </div>
                                <div className={styles.appTime} style={{ fontSize: "10px", fontWeight: 700 }}>
                                  {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                </div>
                                <div className={styles.appService} style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {app.service.name}
                                </div>

                                {/* Tooltip on hover */}
                                <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                                  <div className={styles.tooltipUserRow}>
                                    <div className={styles.tooltipAvatar}>
                                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                      </svg>
                                    </div>
                                    <div className={styles.tooltipUserInfo}>
                                      <div className={styles.tooltipUserName}>
                                        {`${app.client.firstName} ${app.client.lastName}`.toUpperCase()}
                                      </div>
                                      <div className={styles.tooltipUserPhone}>
                                        {app.client.phone || "Sin teléfono"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className={styles.tooltipDivider} />

                                  <div className={styles.tooltipDetailsRow}>
                                    <div 
                                      className={styles.tooltipTimeBox}
                                      style={{ borderLeft: `4px solid ${app.service.color || "var(--primary)"}` }}
                                    >
                                      <div className={styles.tooltipTimeText}>
                                        {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                                      </div>
                                      <div className={styles.tooltipTimeText}>
                                        {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                      </div>
                                    </div>
                                    <div className={styles.tooltipServiceInfo}>
                                      <div className={styles.tooltipServiceName}>{app.service.name}</div>
                                      <div className={styles.tooltipServiceDate}>
                                        {(() => {
                                          const yy = String(startD.getFullYear()).slice(-2);
                                          const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                          const dd = String(startD.getDate()).padStart(2, "0");
                                          return `${dd}.${mm}.${yy}`;
                                        })()}
                                      </div>
                                    </div>
                                  </div>

                                  {app.notes && (
                                    <>
                                      <div className={styles.tooltipDivider} />
                                      <div className={styles.tooltipNotesSection}>
                                        <div className={styles.tooltipNotesHeader}>
                                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                          </svg>
                                          <span>Nota interna</span>
                                        </div>
                                        <div className={styles.tooltipNotesContent}>
                                          {app.notes}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Render time blocks */}
                          {staffDayBlocks.map((block) => {
                            const startD = new Date(block.start);
                            const endD = new Date(block.end);
                            
                            const startHours = startD.getHours();
                            const startMins = startD.getMinutes();
                            const endHours = endD.getHours();
                            const endMins = endD.getMinutes();

                            const startTotalMins = startHours * 60 + startMins;
                            const offsetMins = startTotalMins - 8 * 60;
                            const durationMins = (endD.getTime() - startD.getTime()) / 60000;

                            const top = offsetMins * zoomScale;
                            const height = durationMins * zoomScale;

                            if (top < 0) return null;

                            const isRightHalf = idx >= (hideWeekends ? 2 : 3);

                            return (
                              <div
                                key={block.id}
                                className={`${styles.appointmentCard} ${styles.timeBlockCard}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  padding: "2px 4px",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTimeBlock(block);
                                  setBlockTitle(block.title);
                                  const stD = new Date(block.start);
                                  const enD = new Date(block.end);
                                  const sh = String(stD.getHours()).padStart(2, "0");
                                  const sm = String(stD.getMinutes()).padStart(2, "0");
                                  const eh = String(enD.getHours()).padStart(2, "0");
                                  const em = String(enD.getMinutes()).padStart(2, "0");
                                  setBlockStartTime(`${sh}:${sm}`);
                                  setBlockEndTime(`${eh}:${em}`);
                                  setBlockNotes(block.notes || "");
                                  setShowBlockDetailModal(true);
                                }}
                              >
                                <div className={styles.appCardHeader} style={{ marginBottom: "2px" }}>
                                  <span className={styles.appTime} style={{ fontSize: "10px", fontWeight: 700 }}>
                                    {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")} - {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                  </span>
                                  <Icons.Lock size={10} className={styles.blockLockIcon} />
                                </div>
                                <div className={styles.blockTitle} style={{ fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {block.title}
                                </div>
                                {block.notes && (
                                  <div className={styles.blockNotes} style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {block.notes}
                                  </div>
                                )}

                                {/* Tooltip on hover for time block */}
                                <div className={`${styles.appointmentTooltip} ${isRightHalf ? styles.tooltipLeft : ""}`}>
                                  <div className={styles.tooltipDetailsRow}>
                                    <div 
                                      className={styles.tooltipTimeBox}
                                      style={{ borderLeft: `4px solid #babcbe` }}
                                    >
                                      <div className={styles.tooltipTimeText}>
                                        {String(startHours).padStart(2, "0")}:{String(startMins).padStart(2, "0")}
                                      </div>
                                      <div className={styles.tooltipTimeText}>
                                        {String(endHours).padStart(2, "0")}:{String(endMins).padStart(2, "0")}
                                      </div>
                                    </div>
                                    <div className={styles.tooltipServiceInfo}>
                                      <div className={styles.tooltipServiceName}>{block.title}</div>
                                      <div className={styles.tooltipServiceDate}>
                                        {(() => {
                                          const yy = String(startD.getFullYear()).slice(-2);
                                          const mm = String(startD.getMonth() + 1).padStart(2, "0");
                                          const dd = String(startD.getDate()).padStart(2, "0");
                                          return `${dd}.${mm}.${yy}`;
                                        })()}
                                      </div>
                                    </div>
                                  </div>

                                  {block.notes && (
                                    <>
                                      <div className={styles.tooltipDivider} />
                                      <div className={styles.tooltipNotesSection}>
                                        <div className={styles.tooltipNotesHeader}>
                                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.tooltipNotesIcon}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                          </svg>
                                          <span>Nota interna</span>
                                        </div>
                                        <div className={styles.tooltipNotesContent}>
                                          {block.notes}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Month View
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay(); // Sunday=0
    // Adjust Mon=0, Sun=6
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysArray: Date[] = [];

    // Start date of the grid should be: firstDay minus adjustedFirstDay
    const gridStartDate = new Date(firstDay);
    gridStartDate.setDate(firstDay.getDate() - adjustedFirstDay);

    // We render exactly 42 cells (6 rows * 7 days)
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStartDate);
      d.setDate(gridStartDate.getDate() + i);
      daysArray.push(d);
    }

    const weekNames = hideWeekends
      ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
      : ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    const filteredDaysArray = hideWeekends
      ? daysArray.filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
      : daysArray;

    return (
      <div className={styles.monthContainer}>
        <div 
          className={styles.monthWeekHeader}
          style={{ gridTemplateColumns: hideWeekends ? "repeat(5, 1fr)" : "repeat(7, 1fr)" }}
        >
          {weekNames.map((n) => (
            <div key={n} className={styles.monthWeekLabel}>{n}</div>
          ))}
        </div>
        
        <div 
          className={styles.monthGrid}
          style={{ gridTemplateColumns: hideWeekends ? "repeat(5, 1fr)" : "repeat(7, 1fr)" }}
        >
          {filteredDaysArray.map((dayDate, idx) => {
            const isToday = new Date().toDateString() === dayDate.toDateString();
            const isOutside = dayDate.getMonth() !== month;

            // Filter appointments for this date and selected staff
            const dayApps = appointments.filter((app) => {
              const appD = new Date(app.start);
              return (
                appD.toDateString() === dayDate.toDateString() &&
                checkedStaffIds.includes(app.userId) &&
                (selectedServiceId === "all" || app.serviceId === selectedServiceId) &&
                (clientSearchQuery === "" ||
                  `${app.client.firstName} ${app.client.lastName}`
                    .toLowerCase()
                    .includes(clientSearchQuery.toLowerCase()))
              );
            });

            // Filter time blocks for this date and selected staff
            const dayBlocks = timeBlocks.filter((block) => {
              const blockD = new Date(block.start);
              return (
                blockD.toDateString() === dayDate.toDateString() &&
                checkedStaffIds.includes(block.userId)
              );
            });

            // Format day label: "1 Jun." or "Hoy" or just number "2"
            let dayLabel = "";
            if (dayDate.getDate() === 1) {
              const shortMonth = dayDate.toLocaleDateString("es-ES", { month: "short" });
              dayLabel = `1 ${shortMonth.replace(".", "")}.`;
            } else if (isToday) {
              dayLabel = "Hoy";
            } else {
              dayLabel = String(dayDate.getDate());
            }

            return (
              <div
                key={idx}
                className={`${styles.monthDayCell} ${isToday ? styles.monthTodayCell : ""} ${isOutside ? styles.monthDayOutside : styles.monthDayClickable}`}
                style={{
                  borderRight: (idx + 1) % (hideWeekends ? 5 : 7) === 0 ? "none" : undefined
                }}
                 onClick={!isOutside ? () => {
                  setCurrentDate(dayDate);
                  setView("day");
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("agenda_view", "day");
                  }
                } : undefined}
              >
                <span className={styles.monthDayNum}>{dayLabel}</span>
                {(dayApps.length > 0 || dayBlocks.length > 0) && (
                  <div className={styles.monthAppsCount}>
                    {dayApps.length > 0 && <div>{dayApps.length} {dayApps.length === 1 ? "cita" : "citas"}</div>}
                    {dayBlocks.length > 0 && <div>{dayBlocks.length} {dayBlocks.length === 1 ? "bloqueo" : "bloqueos"}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Filters & Header Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className={styles.title}>Agenda</h1>
            {googleSyncing && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Icons.Sync size={12} className={styles.spinningIcon} />
                Sincronizando...
              </span>
            )}
            {!googleSyncing && syncSuccess && (
              <span style={{ fontSize: "12px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                ✓ Sincronizado
              </span>
            )}
          </div>
          <span className={styles.clinicSubtitle}>{activeClinic?.name}</span>
        </div>

        <div className={styles.toolbarFilters}>
          {/* Client Search */}
          <div className={styles.searchBox}>
            <Icons.Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar paciente..."
              className={styles.searchInput}
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className={styles.dashboardBody}>
        {/* Main Calendar View Area */}
        <section className={styles.calendarArea}>
          {/* Calendar view selector & navigation */}
          <div className={styles.calendarHeader}>
            <div className={styles.calendarHeaderLeft}>
              {/* Dropdown for Agenda selection */}
              <div className={styles.dropdownContainer} ref={staffDropdownRef}>
                <button
                  type="button"
                  className={styles.agendaDropdownBtn}
                  onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                >
                  <Icons.Users size={16} />
                  <span>Agenda</span>
                  <Icons.ChevronDown size={14} />
                </button>

                {showStaffDropdown && (
                  <div className={styles.agendaDropdownMenu}>
                    <div className={styles.dropdownHeader}>
                      <span>USUARIOS</span>
                    </div>
                    <div className={styles.dropdownSearchWrapper}>
                      <Icons.Search size={14} className={styles.dropdownSearchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        className={styles.dropdownSearchInput}
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on search box click
                      />
                    </div>
                    <div className={styles.dropdownFijarRow}>
                      <span className={styles.fijarLabel}>Fijar</span>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={pinDropdown}
                          onChange={(e) => setPinDropdown(e.target.checked)}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>
                    <div className={styles.dropdownScrollArea}>
                      <button
                        type="button"
                        className={styles.dropdownItemAll}
                        onClick={() => {
                          if (checkedStaffIds.length === staffList.length) {
                            setCheckedStaffIds([]);
                          } else {
                            setCheckedStaffIds(staffList.map((s) => s.id));
                          }
                        }}
                      >
                        <div className={styles.checkboxCustomDropdown}>
                          {checkedStaffIds.length === staffList.length && <Icons.Check size={10} style={{ color: "white" }} />}
                        </div>
                        <span>Todos</span>
                      </button>

                      {staffList
                        .filter((s) => {
                          const fullName = `${s.name} ${s.lastName || ""}`.toLowerCase();
                          return fullName.includes(staffSearchQuery.toLowerCase());
                        })
                        .map((staff) => {
                          const isChecked = checkedStaffIds.includes(staff.id);
                          return (
                            <button
                              key={staff.id}
                              type="button"
                              className={styles.dropdownItemStaff}
                              onClick={() => handleStaffCheck(staff.id)}
                            >
                              <div
                                className={styles.checkboxCustomDropdown}
                                style={{
                                  backgroundColor: isChecked ? "var(--primary)" : "var(--bg-input)",
                                  borderColor: isChecked ? "var(--primary)" : "var(--border-color)",
                                }}
                              >
                                {isChecked && <Icons.Check size={10} style={{ color: "white" }} />}
                              </div>
                              <div className={styles.dropdownItemInfo}>
                                <span className={styles.dropdownItemName}>{staff.name} {staff.lastName || ""}</span>
                                <span className={styles.dropdownItemRole}>{staff.role}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                    <div className={styles.dropdownFooter}>
                      <button
                        type="button"
                        className={styles.btnCrearUsuarioDropdown}
                        onClick={() => {
                          window.location.href = "/dashboard/settings?tab=usuarios";
                        }}
                      >
                        + Crear usuario
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View Selector (Día / Semana / Mes) */}
              <div className={styles.viewSelector}>
                <button
                  className={`${styles.viewBtn} ${view === "day" ? styles.viewBtnActive : ""}`}
                  onClick={() => {
                    setView("day");
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("agenda_view", "day");
                    }
                  }}
                >
                  Día
                </button>
                <button
                  className={`${styles.viewBtn} ${view === "week" ? styles.viewBtnActive : ""}`}
                  onClick={() => {
                    setView("week");
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("agenda_view", "week");
                    }
                  }}
                >
                  Semana
                </button>
                <button
                  className={`${styles.viewBtn} ${view === "month" ? styles.viewBtnActive : ""}`}
                  onClick={() => {
                    setView("month");
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("agenda_view", "month");
                    }
                  }}
                >
                  Mes
                </button>
              </div>
            </div>

            <div className={styles.calendarHeaderCenter}>
              <div className={styles.dateNav}>
                <button onClick={handlePrevDate} className={styles.navBtn}>
                  <Icons.ChevronLeft size={16} />
                </button>
                
                <button onClick={() => setShowDatePicker(!showDatePicker)} className={styles.datePickerBtn}>
                  <span>{getFormattedDatePickerLabel()}</span>
                  <Icons.Calendar size={16} />
                </button>
                
                <button onClick={handleNextDate} className={styles.navBtn}>
                  <Icons.ChevronRight size={16} />
                </button>

                {!isTodayVisible() && (
                  <button onClick={handleToday} className={styles.todayBtn}>Hoy</button>
                )}

                {showDatePicker && (
                  <div className={styles.datePickerDropdown} ref={datePickerRef}>
                    <div className={styles.pickerHeader}>
                      <button
                        type="button"
                        onClick={handlePrevPickerMonth}
                        className={styles.pickerNavBtn}
                      >
                        <Icons.ChevronLeft size={16} />
                      </button>
                      
                      <div className={styles.pickerSelectors}>
                        <select
                          value={pickerMonth}
                          onChange={(e) => handlePickerMonthChange(Number(e.target.value))}
                          className={styles.pickerSelect}
                        >
                          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, idx) => (
                            <option key={idx} value={idx}>{m}</option>
                          ))}
                        </select>
                        
                        <select
                          value={pickerYear}
                          onChange={(e) => handlePickerYearChange(Number(e.target.value))}
                          className={styles.pickerSelect}
                        >
                          {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextPickerMonth}
                        className={styles.pickerNavBtn}
                      >
                        <Icons.ChevronRight size={16} />
                      </button>
                    </div>

                    <div className={styles.pickerWeekdays}>
                      {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((w) => (
                        <div key={w} className={styles.pickerWeekdayLabel}>{w}</div>
                      ))}
                    </div>

                    <div className={styles.pickerGrid}>
                      {(() => {
                        const firstDay = new Date(pickerYear, pickerMonth, 1);
                        const firstDayIndex = firstDay.getDay(); // Sun=0, Mon=1
                        const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                        const gridStart = new Date(firstDay);
                        gridStart.setDate(firstDay.getDate() - adjustedFirstDay);

                        const pickerDays: Date[] = [];
                        for (let i = 0; i < 42; i++) {
                          const d = new Date(gridStart);
                          d.setDate(gridStart.getDate() + i);
                          pickerDays.push(d);
                        }

                        return pickerDays.map((dayDate, idx) => {
                          const isOutside = dayDate.getMonth() !== pickerMonth;
                          const isTodayCell = new Date().toDateString() === dayDate.toDateString();
                          
                          let isSelected = false;
                          if (view === "day") {
                            isSelected = dayDate.toDateString() === currentDate.toDateString();
                          } else if (view === "week") {
                            const currentMon = getMonday(currentDate);
                            const currentSun = new Date(currentMon);
                            currentSun.setDate(currentMon.getDate() + 6);
                            currentSun.setHours(23, 59, 59, 999);
                            
                            const isSelectedWeek = dayDate.getTime() >= currentMon.getTime() && dayDate.getTime() <= currentSun.getTime();
                            
                            let isHoveredWeek = false;
                            if (hoveredDate) {
                              const hoveredMon = getMonday(hoveredDate);
                              const hoveredSun = new Date(hoveredMon);
                              hoveredSun.setDate(hoveredMon.getDate() + 6);
                              hoveredSun.setHours(23, 59, 59, 999);
                              isHoveredWeek = dayDate.getTime() >= hoveredMon.getTime() && dayDate.getTime() <= hoveredSun.getTime();
                            }
                            isSelected = isSelectedWeek || isHoveredWeek;
                          } else if (view === "month") {
                            isSelected = dayDate.getMonth() === pickerMonth && dayDate.getFullYear() === pickerYear;
                          }

                          const handleDayClick = () => {
                            if (view === "day") {
                              setCurrentDate(dayDate);
                              setShowDatePicker(false);
                            } else if (view === "week") {
                              const mon = getMonday(dayDate);
                              setCurrentDate(mon);
                              setShowDatePicker(false);
                            }
                          };

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={handleDayClick}
                              className={`${styles.pickerDayCell} ${isOutside ? styles.pickerOutsideDayCell : ""} ${isTodayCell ? styles.pickerTodayCell : ""} ${isSelected ? styles.pickerSelectedDayCell : ""}`}
                              onMouseEnter={() => {
                                if (view === "week") {
                                  setHoveredDate(dayDate);
                                }
                              }}
                              onMouseLeave={() => {
                                if (view === "week") {
                                  setHoveredDate(null);
                                }
                              }}
                              disabled={view === "month"} // disable day interaction in month view
                            >
                              {dayDate.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.calendarHeaderRight}>
              <div className={styles.headerActionButtons}>
                <button
                  type="button"
                  className={styles.iconActionButton}
                  title="Historial de citas"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8M21 3v5h-5" />
                  </svg>
                </button>
                
                <div className={styles.settingsDropdownContainer} ref={settingsDropdownRef}>
                  <button
                    type="button"
                    className={`${styles.iconActionButton} ${showSettingsPopover ? styles.activeButton : ""}`}
                    onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                    title="Configuración"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                      <circle cx="8" cy="6" r="2.5" fill="var(--bg-panel-solid)" />
                      <circle cx="16" cy="12" r="2.5" fill="var(--bg-panel-solid)" />
                      <circle cx="10" cy="18" r="2.5" fill="var(--bg-panel-solid)" />
                    </svg>
                  </button>

                  {showSettingsPopover && (
                    <div className={styles.settingsPopover}>
                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setShowFiltersSidebar(true);
                          setFiltersSubView("menu");
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        <span>Filtros</span>
                      </button>

                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setShowWaitlistSidebar(true);
                          setWaitlistSubView("list");
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Lista de espera</span>
                      </button>

                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setShowOpcionesSidebar(true);
                          setSidebarSubView("menu");
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="4" y1="6" x2="20" y2="6" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                          <line x1="4" y1="18" x2="20" y2="18" />
                          <circle cx="8" cy="6" r="2.5" fill="var(--bg-panel-solid)" />
                          <circle cx="16" cy="12" r="2.5" fill="var(--bg-panel-solid)" />
                          <circle cx="10" cy="18" r="2.5" fill="var(--bg-panel-solid)" />
                        </svg>
                        <span>Configuración</span>
                      </button>

                      <button
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => {
                          setShowSettingsPopover(false);
                          setSelectedSlot(null);
                          setFormClientId("");
                          setPatientSearch("");
                          const now = new Date();
                          setFormDate(now.toISOString().split("T")[0]);
                          setFormTime(`${String(now.getHours() + 1).padStart(2, "0")}:00`);
                          setIsNewPatient(false);
                          
                          // Nueva Cita drawer states
                          setFormClinicId(activeClinic?.id || "");
                          setFormStatus("CONFIRMED");
                          setAppointmentTags([]);
                          setShowTagInput(false);
                          setNewTagName("");
                          setShowServiceDropdown(false);
                          setShowFormStatusDropdown(false);

                          setShowCreateModal(true);
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span>Nueva cita</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar view content */}
          <div className={`${styles.calendarCanvas} glass`}>
            {view === "day" && renderDayView()}
            {view === "week" && renderWeekView()}
            {view === "month" && renderMonthView()}
          </div>
        </section>
      </div>

      {/* CREATE APPOINTMENT DRAWER */}
      {showCreateModal && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.agendaDrawer} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateAppointment} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* Drawer Header */}
              <div className={styles.drawerHeader} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
                <div className={styles.drawerHeaderTopRow} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h2 className={styles.drawerTitle} style={{ fontSize: "20px", textTransform: "none", color: "#1a202c" }}>
                      {formatDrawerDate(formDate)}
                    </h2>
                    <span className={styles.dropdownArrow} style={{ cursor: "default" }}>▾</span>
                  </div>
                  
                  {/* Status Badge Dropdown */}
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className={styles.statusBadgeDropdownBtn}
                      style={{
                        backgroundColor:
                          formStatus === "CONFIRMED" || formStatus === "COMPLETED"
                            ? "#48bb78"
                            : formStatus === "PENDING"
                            ? "#ecc94b"
                            : formStatus === "CANCELLED"
                            ? "#f56565"
                            : "#a0aec0",
                      }}
                      onClick={() => setShowFormStatusDropdown(!showFormStatusDropdown)}
                    >
                      {formStatus === "CONFIRMED"
                        ? "Confirmado"
                        : formStatus === "COMPLETED"
                        ? "Completada"
                        : formStatus === "PENDING"
                        ? "Pendiente"
                        : formStatus === "CANCELLED"
                        ? "Cancelada"
                        : "No asistió"}{" "}
                      ▾
                    </button>
                    {showFormStatusDropdown && (
                      <div className={styles.statusDropdownMenu} style={{ zIndex: 10002 }}>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("PENDING"); setShowFormStatusDropdown(false); }}>
                          Pendiente
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("CONFIRMED"); setShowFormStatusDropdown(false); }}>
                          Confirmado
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("COMPLETED"); setShowFormStatusDropdown(false); }}>
                          Completada
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("CANCELLED"); setShowFormStatusDropdown(false); }}>
                          Cancelada
                        </div>
                        <div className={styles.statusItem} onClick={() => { setFormStatus("NOSHOW"); setShowFormStatusDropdown(false); }}>
                          No asistió
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle with slot duration */}
                <div className={styles.clientIdText} style={{ fontSize: "14px", color: "#4a5568", marginBottom: "12px", fontWeight: 500 }}>
                  {(() => {
                    const selectedService = servicesList.find((s) => s.id === formServiceId);
                    const duration = selectedService ? selectedService.duration : 60;
                    if (!formTime) return "";
                    const [hours, minutes] = formTime.split(":").map(Number);
                    const startDate = new Date();
                    startDate.setHours(hours, minutes, 0);
                    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                    const startStr = formTime;
                    const endStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
                    return `${startStr} - ${endStr} / Repeticiones`;
                  })()}
                </div>

                {/* Tags row */}
                <div className={styles.tagsRow}>
                  {appointmentTags.map((tag, idx) => (
                    <span key={idx} className={styles.tagBadge}>
                      {tag}
                      <button
                        type="button"
                        className={styles.removeTagBtn}
                        onClick={() => setAppointmentTags(prev => prev.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {showTagInput ? (
                    <div className={styles.tagInputWrapper}>
                      <input
                        type="text"
                        className={styles.addTagInput}
                        placeholder="Nueva etiqueta"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newTagName.trim()) {
                              setAppointmentTags(prev => [...prev, newTagName.trim()]);
                              setNewTagName("");
                              setShowTagInput(false);
                            }
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className={styles.addTagBtnConfirm}
                        onClick={() => {
                          if (newTagName.trim()) {
                            setAppointmentTags(prev => [...prev, newTagName.trim()]);
                            setNewTagName("");
                            setShowTagInput(false);
                          }
                        }}
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.plusSmallBtn}
                      onClick={() => setShowTagInput(true)}
                      title="Agregar etiqueta"
                      style={{ width: "24px", height: "24px", fontSize: "14px" }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Drawer Body */}
              <div className={styles.drawerBody} style={{ flex: 1, padding: "20px 24px" }}>
                
                {/* Contacto Section */}
                <div className="form-group" style={{ marginBottom: "20px", position: "relative" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Contacto</label>
                  {formClientId ? (
                    (() => {
                      const selectedClient = clientsList.find((c) => c.id === formClientId);
                      if (!selectedClient) return null;
                      return (
                        <div className={styles.contactSelectedCard}>
                          <div className={styles.contactAvatar}>
                            {selectedClient.firstName.charAt(0)}
                            {selectedClient.lastName ? selectedClient.lastName.charAt(0) : ""}
                          </div>
                          <div className={styles.contactMeta}>
                            <h3 className={styles.contactName}>
                              {selectedClient.firstName} {selectedClient.lastName}
                            </h3>
                            <span className={styles.contactDetails}>
                              {selectedClient.phone || "Sin teléfono"} | {selectedClient.email || "Sin email"}
                            </span>
                            <div>
                              <button
                                type="button"
                                className={styles.contactChangeLink}
                                onClick={() => {
                                  setFormClientId("");
                                  setPatientSearch("");
                                }}
                              >
                                Cambiar cliente
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Buscar contacto"
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        style={{ paddingLeft: "12px" }}
                      />
                      {showSuggestions && (
                        <div className={styles.suggestionsDropdown} ref={suggestionsRef} style={{ width: "100%", zIndex: 10002 }}>
                          {filteredClientsForSearch.length > 0 ? (
                            filteredClientsForSearch.slice(0, 8).map((c) => (
                              <div
                                key={c.id}
                                className={styles.suggestionItem}
                                onClick={() => {
                                  setFormClientId(c.id);
                                  setShowSuggestions(false);
                                }}
                              >
                                <span className={styles.suggestionName}>
                                  {c.firstName} {c.lastName}
                                </span>
                                <span className={styles.suggestionMeta}>
                                  {c.phone ? `${c.phone}` : ""} {c.email ? `| ${c.email}` : ""}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className={styles.noSuggestions}>No hay coincidencias</div>
                          )}
                        </div>
                      )}

                      {/* Sin resultados / Crear Contacto card */}
                      {!patientSearch && !formClientId && (
                        <div className={styles.contactNoResultsCard}>
                          <span className={styles.contactNoResultsText}>Sin resultados</span>
                          <div className={styles.contactNoResultsActions}>
                            <button
                              type="button"
                              className={styles.yellowBtn}
                              onClick={() => setShowCreateContactModal(true)}
                            >
                              Crear contacto
                            </button>
                            <button
                              type="button"
                              className={styles.whiteBorderBtn}
                              onClick={handleSelectWalkInClient}
                            >
                              Cliente de paso
                            </button>
                          </div>
                        </div>
                      )}
                      {patientSearch && !formClientId && filteredClientsForSearch.length === 0 && (
                        <div className={styles.contactNoResultsCard}>
                          <span className={styles.contactNoResultsText}>Sin resultados</span>
                          <div className={styles.contactNoResultsActions}>
                            <button
                              type="button"
                              className={styles.yellowBtn}
                              onClick={() => {
                                const parts = patientSearch.trim().split(/\s+/);
                                setFormPatFirstName(parts[0] || "");
                                setFormPatLastName(parts.slice(1).join(" ") || "");
                                setShowCreateContactModal(true);
                              }}
                            >
                              Crear contacto
                            </button>
                            <button
                              type="button"
                              className={styles.whiteBorderBtn}
                              onClick={handleSelectWalkInClient}
                            >
                              Cliente de paso
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Servicio Section */}
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Servicio</label>
                  <div className={styles.serviceDropdownContainer}>
                    {(() => {
                      const selectedService = servicesList.find(s => s.id === formServiceId);
                      return (
                        <button
                          type="button"
                          className={styles.serviceDropdownBtn}
                          onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {selectedService && (
                              <span
                                className={styles.colorDot}
                                style={{ backgroundColor: selectedService.color }}
                              />
                            )}
                            <span>
                              {selectedService
                                ? `${selectedService.name} (${selectedService.duration} min${showPrices ? ` - ${selectedService.price}€` : ""})`
                                : "Seleccionar servicio"}
                            </span>
                          </div>
                          <span>▾</span>
                        </button>
                      );
                    })()}
                    {showServiceDropdown && (
                      <div className={styles.serviceDropdownMenu}>
                        {filteredServicesForDropdown.map((s) => (
                          <div
                            key={s.id}
                            className={styles.serviceItem}
                            onClick={() => {
                              setFormServiceId(s.id);
                              setShowServiceDropdown(false);
                            }}
                          >
                            <span
                              className={styles.colorDot}
                              style={{ backgroundColor: s.color }}
                            />
                            <span>
                              {s.name} ({s.duration} min${showPrices ? ` - ${s.price}€` : ""})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {matchingVoucher && (
                    <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", backgroundColor: "var(--bg-input)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <input
                        type="checkbox"
                        id="useVoucherSessionCheckCreate"
                        checked={useVoucherSession}
                        onChange={(e) => setUseVoucherSession(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="useVoucherSessionCheckCreate" style={{ fontSize: "13px", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>{matchingVoucher.name}</span>
                        {matchingVoucher.expirationDate && (
                          <span style={{ color: "var(--text-muted)" }}>
                            {" "} - {new Date(matchingVoucher.expirationDate).toLocaleDateString("es-ES")}
                          </span>
                        )}
                        <span style={{ fontWeight: 600 }}>
                          {" "} - {matchingVoucher.sessions - matchingVoucher.remainingSessions}/{matchingVoucher.sessions} sesiones
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Ubicación Section */}
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Ubicación</label>
                  <select
                    className="input select"
                    value={formClinicId}
                    onChange={(e) => setFormClinicId(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar ubicación...</option>
                    {currentUser?.clinics && currentUser.clinics.length > 0 ? (
                      currentUser.clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      activeClinic && (
                        <option value={activeClinic.id}>{activeClinic.name}</option>
                      )
                    )}
                  </select>
                </div>

                {/* Profesional Section */}
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Profesional</label>
                  <div className={styles.profSelectWrapper}>
                    <select
                      className="input select"
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar profesional...</option>
                      {filteredStaffForDropdown.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.lastName || ""} (Disponible)
                        </option>
                      ))}
                    </select>
                    {formUserId && (
                      <button
                        type="button"
                        className={styles.clearProfBtn}
                        onClick={() => setFormUserId("")}
                        title="Limpiar profesional"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Nota Interna Section */}
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Nota Interna</label>
                  <textarea
                    className="input"
                    placeholder="Escribe tu mensaje"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{ minHeight: "80px", resize: "vertical" }}
                  />
                </div>
              </div>

              {/* Drawer Footer */}
              <div className={styles.drawerFooter}>
                <button
                  type="button"
                  className={styles.submenuCancelBtn}
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: "none", width: "100px" }}
                >
                  Cancelar
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className={styles.chargeBtn}
                    onClick={async (e) => {
                      const created = await handleCreateAppointment(e);
                      if (created) {
                        window.location.href = `/dashboard/sales?clientId=${created.clientId}&serviceId=${created.serviceId}&appointmentId=${created.id}`;
                      }
                    }}
                  >
                    Crear cita y cobrar
                  </button>
                  <button
                    type="submit"
                    className={styles.createApptBtn}
                  >
                    Crear cita
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREAR CLIENTE MODAL (SUPERPUESTO) */}
      {showCreateContactModal && typeof window !== "undefined" && createPortal(
        <div className={styles.centeredOverlay} onClick={() => setShowCreateContactModal(false)}>
          <div className={styles.centeredContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.centeredHeader}>
              <h2>Crear cliente</h2>
              <button
                type="button"
                onClick={() => setShowCreateContactModal(false)}
                className={styles.drawerCloseBtn}
              >
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleCreateContactSubmit} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              {/* Tabs */}
              <div className={styles.drawerHeader} style={{ padding: "0 24px", borderBottom: "1px solid #e2e8f0" }}>
                <div className={styles.drawerTabsContainer}>
                  <button
                    type="button"
                    className={`${styles.drawerTabBtn} ${newPatientTab === "general" ? styles.drawerTabBtnActive : ""}`}
                    onClick={() => setNewPatientTab("general")}
                  >
                    Información general
                  </button>
                  <button
                    type="button"
                    className={`${styles.drawerTabBtn} ${newPatientTab === "others" ? styles.drawerTabBtnActive : ""}`}
                    onClick={() => setNewPatientTab("others")}
                  >
                    Otros datos
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className={styles.centeredBody}>
                {newPatientTab === "general" ? (
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", marginBottom: "20px", letterSpacing: "0.05em" }}>Datos generales</h4>
                    
                    {/* Row 1: Nombre | Apellidos */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nombre</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir nombre"
                          value={formPatFirstName}
                          onChange={(e) => setFormPatFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Apellidos</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir apellidos"
                          value={formPatLastName}
                          onChange={(e) => setFormPatLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Fecha nacimiento | DNI/NIF */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Fecha de nacimiento</label>
                        <input
                          type="date"
                          className="input"
                          placeholder="dd/mm/yyyy"
                          value={formPatBirthDate}
                          onChange={(e) => setFormPatBirthDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">DNI/NIF</label>
                        <div style={{ position: "relative" }} ref={dniPickerRef}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-input)", padding: "0 10px", height: "40px" }}>
                            <button
                              type="button"
                              onClick={() => { setShowDniCountryPicker(!showDniCountryPicker); setShowPhoneCountryPicker(false); setShowCountryPicker(false); setCountrySearch(""); }}
                              style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
                            >
                              <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{dniCountry.code}</span>
                              <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>▾</span>
                            </button>
                            <input
                              type="text"
                              style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: "14px", color: "var(--text-primary)", fontFamily: "inherit" }}
                              placeholder="Añadir DNI"
                              value={formPatDniNif}
                              onChange={(e) => setFormPatDniNif(e.target.value)}
                            />
                          </div>
                          {showDniCountryPicker && (
                            <div style={{ position: "absolute", top: "44px", left: 0, zIndex: 9999, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: "240px", overflow: "hidden" }}>
                              <div style={{ padding: "8px" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar país..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredCountries.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setDniCountry(c); setShowDniCountryPicker(false); setCountrySearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 14px", background: dniCountry.code === c.code ? "var(--primary-light)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{c.code}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Teléfono | Email */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Número de teléfono</label>
                        <div style={{ position: "relative" }} ref={phonePickerRef}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-input)", padding: "0 10px", height: "40px" }}>
                            <button
                              type="button"
                              onClick={() => { setShowPhoneCountryPicker(!showPhoneCountryPicker); setShowDniCountryPicker(false); setShowCountryPicker(false); setCountrySearch(""); }}
                              style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: "0", flexShrink: 0 }}
                            >
                              <span style={{ fontSize: "16px" }}>{phoneCountry.flag}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600 }}>{phoneCountry.dial}</span>
                              <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>▾</span>
                            </button>
                            <input
                              type="text"
                              style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: "14px", color: "var(--text-primary)", fontFamily: "inherit" }}
                              placeholder="Número de teléfono"
                              value={formPatPhone}
                              onChange={(e) => setFormPatPhone(e.target.value)}
                            />
                          </div>
                          {showPhoneCountryPicker && (
                            <div style={{ position: "absolute", top: "44px", left: 0, zIndex: 9999, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: "260px", overflow: "hidden" }}>
                              <div style={{ padding: "8px" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar país o código..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredCountries.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setPhoneCountry(c); setShowPhoneCountryPicker(false); setCountrySearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 14px", background: phoneCountry.code === c.code ? "var(--primary-light)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 700 }}>{c.dial}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="input"
                          placeholder="Añadir email"
                          value={formPatEmail}
                          onChange={(e) => setFormPatEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Row 4: País | Dirección */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">País</label>
                        <div style={{ position: "relative" }} ref={countryPickerRef}>
                          <button
                            type="button"
                            onClick={() => { setShowCountryPicker(!showCountryPicker); setShowDniCountryPicker(false); setShowPhoneCountryPicker(false); setCountrySearch(""); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              height: "40px",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              background: "var(--bg-input)",
                              padding: "0 12px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontFamily: "inherit",
                              textAlign: "left"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "16px" }}>{countryPickerSelected.flag}</span>
                              <span style={{ fontSize: "14px", color: "var(--text-primary)" }}>{countryPickerSelected.name}</span>
                            </div>
                            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>▾</span>
                          </button>
                          {showCountryPicker && (
                            <div style={{ position: "absolute", top: "44px", left: 0, zIndex: 9999, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: "260px", overflow: "hidden" }}>
                              <div style={{ padding: "8px" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar país..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>
                              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredCountries.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => { setCountryPickerSelected(c); setFormPatCountry(c.name); setShowCountryPicker(false); setCountrySearch(""); }}
                                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 14px", background: countryPickerSelected.code === c.code ? "var(--primary-light)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", textAlign: "left", fontFamily: "inherit" }}
                                  >
                                    <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{c.dial}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Dirección</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir dirección"
                          value={formPatAddress}
                          onChange={(e) => setFormPatAddress(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Row 5: Ciudad/Municipio | Código Postal */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Ciudad / Municipio</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir ciudad / municipio"
                          value={formPatMunicipality}
                          onChange={(e) => setFormPatMunicipality(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Código Postal</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Añadir código postal"
                          value={formPatPostalCode}
                          onChange={(e) => setFormPatPostalCode(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Toggle Switches */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Es Autónomo */}
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div
                          onClick={() => setFormPatIsSelfEmployed(!formPatIsSelfEmployed)}
                          style={{
                            width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                            background: formPatIsSelfEmployed ? "#3b82f6" : "#d1d5db",
                            position: "relative", transition: "background 0.2s", cursor: "pointer"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "3px",
                            left: formPatIsSelfEmployed ? "19px" : "3px",
                            width: "16px", height: "16px", borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>Es Autónomo</span>
                      </label>
                      {/* Es Empresa */}
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div
                          onClick={() => setFormPatIsCompany(!formPatIsCompany)}
                          style={{
                            width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                            background: formPatIsCompany ? "#3b82f6" : "#d1d5db",
                            position: "relative", transition: "background 0.2s", cursor: "pointer"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "3px",
                            left: formPatIsCompany ? "19px" : "3px",
                            width: "16px", height: "16px", borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>Es Empresa</span>
                      </label>
                      {/* Recibirá Recordatorios */}
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div
                          onClick={() => setFormPatReceivesReminders(!formPatReceivesReminders)}
                          style={{
                            width: "38px", height: "22px", borderRadius: "11px", flexShrink: 0,
                            background: formPatReceivesReminders ? "#3b82f6" : "#d1d5db",
                            position: "relative", transition: "background 0.2s", cursor: "pointer"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: "3px",
                            left: formPatReceivesReminders ? "19px" : "3px",
                            width: "16px", height: "16px", borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                          }} />
                        </div>
                        <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>Recibirá Recordatorios</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className={styles.sectionSubTitle} style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "16px" }}>Más datos</h4>
                    
                    <div className={styles.fieldsGrid} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div className="form-group">
                        <label className="form-label">Ocupación</label>
                        <select
                          className="input select"
                          value={formPatOccupation}
                          onChange={(e) => setFormPatOccupation(e.target.value)}
                        >
                          <option value="">Selecciona o escribe</option>
                          <option value="Empleado/a">Empleado/a</option>
                          <option value="Autónomo/a">Autónomo/a</option>
                          <option value="Desempleado/a">Desempleado/a</option>
                          <option value="Estudiante">Estudiante</option>
                          <option value="Jubilado/a">Jubilado/a</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Género</label>
                        <select
                          className="input select"
                          value={formPatGender}
                          onChange={(e) => setFormPatGender(e.target.value)}
                        >
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ maxWidth: "50%", marginBottom: "16px" }}>
                      <label className="form-label">Estado civil</label>
                      <select
                        className="input select"
                        value={formPatMaritalStatus}
                        onChange={(e) => setFormPatMaritalStatus(e.target.value)}
                      >
                        <option value="Soltero/a">Soltero/a</option>
                        <option value="Casado/a">Casado/a</option>
                        <option value="Divorciado/a">Divorciado/a</option>
                        <option value="Viudo/a">Viudo/a</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">IBAN</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Añadir IBAN"
                        value={formPatIban}
                        onChange={(e) => setFormPatIban(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">BIC/SWIFT</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Añadir BIC/SWIFT"
                        value={formPatBic}
                        onChange={(e) => setFormPatBic(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={styles.centeredFooter}>
                <button
                  type="button"
                  className={styles.submenuCancelBtn}
                  onClick={() => setShowCreateContactModal(false)}
                  style={{ flex: "none", width: "100px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: "none" }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT APPOINTMENT MODAL */}
      {showEditModal && selectedAppointment && typeof window !== "undefined" && createPortal(
        <div 
          className={!isEditingApp ? styles.drawerOverlay : styles.modalOverlay}
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className={!isEditingApp ? styles.agendaDrawer : `${styles.modalContent} ${!isEditingApp ? styles.modalContentWide : ""} glass fade-in`}
            onClick={(e) => e.stopPropagation()}
          >
            {isEditingApp ? (
              // EDIT MODAL VIEW
              <>
                <div className={styles.modalHeader}>
                  <h2>Editar Cita</h2>
                  <button 
                    onClick={() => setShowEditModal(false)} 
                    className={styles.closeBtn}
                  >
                    <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                  </button>
                </div>
                <form onSubmit={handleUpdateAppointment} className={styles.modalForm} style={{ padding: "0 32px 32px 32px" }}>
                  <div className="form-group">
                    <label className="form-label">Fisioterapeuta / Especialista</label>
                    <select
                      className="input select"
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      required
                    >
                      {filteredStaffForDropdown.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.lastName || ""}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Servicio</label>
                    <select
                      className="input select"
                      value={formServiceId}
                      onChange={(e) => setFormServiceId(e.target.value)}
                      required
                    >
                      {filteredServicesForDropdown.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.duration} min{showPrices ? ` - ${s.price}€` : ""})
                        </option>
                      ))}
                    </select>
                    {matchingVoucher && (
                      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", backgroundColor: "var(--bg-input)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                        <input
                          type="checkbox"
                          id="useVoucherSessionCheckEdit"
                          checked={useVoucherSession}
                          onChange={(e) => setUseVoucherSession(e.target.checked)}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <label htmlFor="useVoucherSessionCheckEdit" style={{ fontSize: "13px", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "var(--primary)" }}>{matchingVoucher.name}</span>
                          {matchingVoucher.expirationDate && (
                            <span style={{ color: "var(--text-muted)" }}>
                              {" "} - {new Date(matchingVoucher.expirationDate).toLocaleDateString("es-ES")}
                            </span>
                          )}
                          <span style={{ fontWeight: 600 }}>
                            {" "} - {matchingVoucher.sessions - matchingVoucher.remainingSessions}/{matchingVoucher.sessions} sesiones
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "16px" }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Fecha</label>
                      <input
                        type="date"
                        className="input"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Hora</label>
                      <input
                        type="time"
                        className="input"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas de consulta</label>
                    <textarea
                      className="input"
                      style={{ minHeight: "80px", resize: "vertical" }}
                      placeholder="Añadir comentarios sobre la consulta..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                    />
                  </div>

                  <div className={styles.modalActions}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditingApp(false)}>
                      Atrás
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </>
            ) : (
              // DRAWER VIEW (INFORMACION)
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                {/* Header: Title and Tabs */}
                <div className={styles.drawerHeader}>
                  <div className={styles.drawerHeaderTopRow}>
                    <h2 className={styles.drawerTitle}>Información</h2>
                    <button 
                      onClick={() => setShowEditModal(false)} 
                      className={styles.drawerCloseBtn}
                    >
                      <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                    </button>
                  </div>
                  
                  <div className={styles.drawerTabsContainer}>
                    <button
                      type="button"
                      className={`${styles.drawerTabBtn} ${editModalTab === "datos" ? styles.drawerTabBtnActive : ""}`}
                      onClick={() => setEditModalTab("datos")}
                    >
                      Datos
                    </button>
                    <button
                      type="button"
                      className={`${styles.drawerTabBtn} ${editModalTab === "bonos" ? styles.drawerTabBtnActive : ""}`}
                      onClick={() => setEditModalTab("bonos")}
                    >
                      Bonos
                    </button>
                    <button
                      type="button"
                      className={`${styles.drawerTabBtn} ${editModalTab === "citas" ? styles.drawerTabBtnActive : ""}`}
                      onClick={() => setEditModalTab("citas")}
                    >
                      Citas
                    </button>
                    <button
                      type="button"
                      className={`${styles.drawerTabBtn} ${editModalTab === "seguimientos" ? styles.drawerTabBtnActive : ""}`}
                      onClick={() => setEditModalTab("seguimientos")}
                    >
                      Seguimientos
                    </button>
                    <button
                      type="button"
                      className={`${styles.drawerTabBtn} ${editModalTab === "historial" ? styles.drawerTabBtnActive : ""}`}
                      onClick={() => setEditModalTab("historial")}
                    >
                      Historial
                    </button>
                  </div>
                </div>

                {/* Status Toolbar Container */}
                <div className={styles.statusToolbarContainer}>
                  <div style={{ position: "relative" }} ref={statusDropdownRef}>
                    <button
                      type="button"
                      className={styles.statusBadgeDropdownBtn}
                      style={{
                        backgroundColor:
                          selectedAppointment.status === "CONFIRMED" || selectedAppointment.status === "COMPLETED"
                            ? "#48bb78"
                            : selectedAppointment.status === "PENDING"
                            ? "#ecc94b"
                            : selectedAppointment.status === "CANCELLED"
                            ? "#f56565"
                            : "#a0aec0",
                      }}
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    >
                      {selectedAppointment.status === "CONFIRMED"
                        ? "Confirmada"
                        : selectedAppointment.status === "COMPLETED"
                        ? "Completada"
                        : selectedAppointment.status === "PENDING"
                        ? "Pendiente"
                        : selectedAppointment.status === "CANCELLED"
                        ? "Cancelada"
                        : "No asistió"}{" "}
                      ▾
                    </button>
                    {showStatusDropdown && (
                      <div className={styles.statusDropdownMenu}>
                        <div className={styles.statusItem} onClick={() => handleUpdateStatus("PENDING")}>
                          Pendiente
                        </div>
                        <div className={styles.statusItem} onClick={() => handleUpdateStatus("CONFIRMED")}>
                          Confirmada
                        </div>
                        <div className={styles.statusItem} onClick={() => handleUpdateStatus("COMPLETED")}>
                          Completada
                        </div>
                        <div className={styles.statusItem} onClick={() => handleUpdateStatus("CANCELLED")}>
                          Cancelada
                        </div>
                        <div className={styles.statusItem} onClick={() => handleUpdateStatus("NOSHOW")}>
                          No asistió
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plus button + tag manager dropdown */}
                  <div style={{ position: "relative" }} ref={tagsDropdownRef}>
                    <button 
                      type="button" 
                      className={styles.plusSmallBtn} 
                      onClick={() => {
                        setShowTagsDropdown(!showTagsDropdown);
                        setTagsSubView("list");
                        setSearchTagQuery("");
                      }} 
                      title="Gestionar etiquetas"
                    >
                      +
                    </button>
                    
                    {showTagsDropdown && (
                      <div className={styles.tagsDropdownMenu}>
                        {tagsSubView === "list" ? (
                          <>
                            <h3 className={styles.tagsDropdownTitle}>Etiquetas</h3>
                            <div className={styles.tagsSearchWrapper}>
                              <svg className={styles.tagsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                              <input 
                                type="text"
                                className={styles.tagsSearchInput}
                                placeholder="Buscar etiqueta"
                                value={searchTagQuery}
                                onChange={(e) => setSearchTagQuery(e.target.value)}
                              />
                            </div>
                            <div className={styles.tagsList}>
                              {availableTags
                                .filter(tag => {
                                  // Filter out already added tags to this appointment
                                  const currentTags = selectedAppointment.tags 
                                    ? selectedAppointment.tags.split(",").filter(Boolean).map(t => t.split(":")[0])
                                    : [];
                                  if (currentTags.includes(tag.name)) return false;
                                  
                                  // Filter by search query
                                  return tag.name.toLowerCase().includes(searchTagQuery.toLowerCase());
                                })
                                .map(tag => (
                                  <div
                                    key={tag.name}
                                    className={styles.tagsListItem}
                                    style={{ backgroundColor: tag.color, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                  >
                                    <span 
                                      style={{ flex: 1, cursor: "pointer", display: "block" }} 
                                      onClick={() => handleAddTagToAppointment(tag)}
                                    >
                                      {tag.name}
                                    </span>
                                    <span 
                                      className={styles.editTagIcon}
                                      title="Eliminar etiqueta"
                                      onClick={() => handleDeleteTagGlobal(tag.name)}
                                      style={{ cursor: "pointer", display: "flex", alignItems: "center", marginLeft: "8px" }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </span>
                                  </div>
                                ))}
                              {availableTags.filter(tag => {
                                const currentTags = selectedAppointment.tags 
                                  ? selectedAppointment.tags.split(",").filter(Boolean).map(t => t.split(":")[0])
                                  : [];
                                if (currentTags.includes(tag.name)) return false;
                                return tag.name.toLowerCase().includes(searchTagQuery.toLowerCase());
                              }).length === 0 && (
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", padding: "8px" }}>Sin etiquetas disponibles</div>
                              )}
                            </div>
                            <button
                              type="button"
                              className={styles.newTagBtn}
                              onClick={() => {
                                setTagsSubView("create");
                                setNewTagName("");
                                setNewTagColor("#add8e6"); // Default first color
                              }}
                            >
                              Nueva etiqueta
                            </button>
                          </>
                        ) : (
                          <>
                            <h3 className={styles.tagsDropdownTitle}>Nueva etiqueta</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div>
                                <label className={styles.newTagLabel}>Nombre</label>
                                <input 
                                  type="text"
                                  className="input"
                                  style={{ width: "100%", fontSize: "12px", padding: "6px 10px", outline: "none", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                                  placeholder="Nombre de la etiqueta"
                                  value={newInfoTagName}
                                  onChange={(e) => setNewInfoTagName(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className={styles.newTagLabel}>ASIGNAR COLOR</label>
                                <div className={styles.colorPickerGrid}>
                                  {TAG_COLORS.map(color => (
                                    <div
                                      key={color}
                                      className={`${styles.colorCircle} ${newTagColor === color ? styles.colorCircleSelected : ""}`}
                                      style={{ backgroundColor: color }}
                                      onClick={() => setNewTagColor(color)}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className={styles.newTagActions}>
                                <button 
                                  type="button"
                                  className={styles.newTagCancelBtn}
                                  onClick={() => setTagsSubView("list")}
                                >
                                  Cancelar
                                </button>
                                <button 
                                  type="button"
                                  className={styles.newTagSaveBtn}
                                  disabled={!newInfoTagName.trim()}
                                  onClick={() => handleCreateNewTagGlobal(newInfoTagName, newTagColor)}
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Display selected tags */}
                  {selectedAppointment.tags && selectedAppointment.tags.split(",").filter(Boolean).map(tagStr => {
                    const [tagName, tagColor] = tagStr.split(":");
                    return (
                      <span 
                        key={tagName} 
                        style={{ 
                          backgroundColor: tagColor || "#ef4444", 
                          color: "#fff", 
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          fontSize: "11px", 
                          fontWeight: 700, 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "6px" 
                        }}
                      >
                        {tagName}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTagFromAppointment(tagName)} 
                          style={{ 
                            background: "none", 
                            border: "none", 
                            color: "#fff", 
                            cursor: "pointer", 
                            padding: 0, 
                            fontSize: "11px", 
                            fontWeight: "bold",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Body (scrollable) */}
                <div className={styles.drawerBody}>
                  {editModalTab === "datos" && (
                    <div className={styles.drawerInfoGrid}>
                      {/* Left: Patient Details */}
                      <div className={styles.infoLeftCol}>
                        <div className={styles.clientInfoBlock}>
                          <div className={styles.clientAvatar}>
                            {selectedAppointment.client.firstName.charAt(0)}
                            {selectedAppointment.client.lastName ? selectedAppointment.client.lastName.charAt(0) : ""}
                          </div>
                          <div className={styles.clientMeta}>
                            <h3 className={styles.clientName}>
                              {selectedAppointment.client.firstName} {selectedAppointment.client.lastName}
                            </h3>
                            <span className={styles.clientIdText}>
                              # {selectedAppointment.client.clientNumber || "N/A"}
                            </span>
                            <span className={styles.clientPhoneText}>
                              {selectedAppointment.client.phone || "Sin teléfono"}
                            </span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleSendWhatsAppReminder(selectedAppointment)} 
                          className={styles.whatsappBtn}
                          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", border: "none", background: "var(--bg-input)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                          Whatsapp
                        </button>


                        {/* Switch Toggle */}
                        <div className={styles.remindersContainer}>
                          <div 
                            className={styles.reminderToggleSwitch}
                            style={{ 
                              backgroundColor: editPatReceivesReminders ? "#008298" : "#cbd5e0"
                            }}
                            onClick={() => handleToggleReminders(!editPatReceivesReminders)}
                          >
                            <div 
                              className={styles.reminderToggleKnob}
                              style={{ 
                                left: editPatReceivesReminders ? "18px" : "2px"
                              }}
                            />
                          </div>
                          <span>Recordatorios</span>
                          <button 
                            type="button" 
                            className={styles.reminderGearBtn}
                            title="Configurar recordatorios"
                          >
                            <Icons.Settings size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Right: Appointment details column */}
                      <div className={styles.drawerRightDetails}>
                        <div className={styles.detailDateTime}>
                          {(() => {
                            const startD = new Date(selectedAppointment.start);
                            const endD = new Date(selectedAppointment.end);
                            const months = ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."];
                            return `${months[startD.getMonth()]} ${startD.getDate()} ${String(startD.getHours()).padStart(2, "0")}:${String(startD.getMinutes()).padStart(2, "0")} - ${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
                          })()}
                        </div>

                        <div className={styles.detailClinicName}>
                          {selectedAppointment.clinic?.name || activeClinic?.name || "Clifav Central"}
                          {selectedAppointment.user && (
                            <div style={{ marginTop: "2px", color: "var(--text-secondary)" }}>
                              {selectedAppointment.user.name} {selectedAppointment.user.lastName || ""}
                            </div>
                          )}
                        </div>

                        <div className={styles.detailServiceName}>
                          {selectedAppointment.service.name}
                        </div>

                        <div className={styles.detailPrice}>
                          {showPrices ? `${selectedAppointment.service.price.toFixed(2).replace(".", ",")} €` : "—"}
                        </div>

                        <div style={{ marginTop: "4px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          {(() => {
                            const matchingSales = agendaSales.filter((sale) => {
                              try {
                                const itemsArr = JSON.parse(sale.itemsJson || "[]");
                                return itemsArr.some((i: any) => i.id === `db-app-${selectedAppointment.id}` || i.id === selectedAppointment.id);
                              } catch (e) {
                                return false;
                              }
                            });

                            const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);
                            const servicePrice = selectedAppointment.service?.price || 0;

                            const getPaymentMethodTextLocal = (method: string) => {
                              const m = method.toUpperCase();
                              if (m === "CASH" || m === "EFECTIVO") return "Efectivo";
                              if (m === "CARD" || m === "TARJETA") return "Tarjeta";
                              if (m === "TRANSFER" || m === "TRANSFERENCIA") return "Transferencia";
                              return method;
                            };

                            if (servicePrice === 0) {
                              return <span className={styles.paymentTagGreen}>GRATUITO</span>;
                            } else if (totalPaid >= servicePrice || selectedAppointment.status === "COMPLETED") {
                              const methods = [...new Set(matchingSales.map(s => getPaymentMethodTextLocal(s.paymentMethod)))];
                              return (
                                <>
                                  <span className={styles.paymentTagGreen}>PAGADO</span>
                                  {methods.map((method, idx) => (
                                    <span key={idx} className={styles.paymentMethodTag}>
                                      {method}
                                    </span>
                                  ))}
                                </>
                              );
                            } else if (totalPaid > 0) {
                              const methods = [...new Set(matchingSales.map(s => getPaymentMethodTextLocal(s.paymentMethod)))];
                              return (
                                <>
                                  <span className={styles.paymentTagYellow}>PAGO PARCIAL</span>
                                  {methods.map((method, idx) => (
                                    <span key={idx} className={styles.paymentMethodTag}>
                                      {method}
                                    </span>
                                  ))}
                                </>
                              );
                            } else {
                              return <span className={styles.paymentTagRed}>NO PAGADO</span>;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {editModalTab === "bonos" && (
                    <div className={styles.bonosPane}>
                      <h4 className={styles.tabSectionTitle}>Bonos del Paciente</h4>

                      {loadingAppointmentVouchers ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Cargando bonos...</p>
                      ) : appointmentClientVouchers.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No hay bonos activos para este paciente.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {appointmentClientVouchers.map((voucher) => {
                            const isExpired = voucher.expirationDate ? new Date(voucher.expirationDate) < new Date() : false;
                            const progress = voucher.sessions > 0 ? (voucher.remainingSessions / voucher.sessions) * 100 : 0;
                            const isShared = !!voucher.isShared;
                            const borderColor = isExpired
                              ? "var(--danger)"
                              : isShared
                              ? "#8b5cf6"
                              : "var(--primary)";

                            return (
                              <div
                                key={voucher.id}
                                style={{
                                  background: "var(--bg-card)",
                                  border: "1px solid var(--border-color)",
                                  borderLeft: `4px solid ${borderColor}`,
                                  borderRadius: "8px",
                                  padding: "14px",
                                  position: "relative",
                                }}
                              >
                                {/* Header row */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>
                                      {voucher.name}
                                    </div>
                                    {isShared && (
                                      <div style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        background: "rgba(139,92,246,0.12)",
                                        color: "#8b5cf6",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                      }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                          <circle cx="9" cy="7" r="4" />
                                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        Compartido por {voucher.ownerClientName}
                                      </div>
                                    )}
                                  </div>
                                  {isExpired ? (
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "rgba(239,68,68,0.12)",
                                      color: "var(--danger)",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                    }}>EXPIRADO</span>
                                  ) : voucher.remainingSessions === 0 ? (
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "rgba(239,68,68,0.12)",
                                      color: "var(--danger)",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                    }}>SIN SESIONES</span>
                                  ) : (
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      background: "rgba(16,185,129,0.12)",
                                      color: "#10b981",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                    }}>ACTIVO</span>
                                  )}
                                </div>

                                {/* Sessions info */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Sesiones restantes</span>
                                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                                    {voucher.remainingSessions} / {voucher.sessions}
                                  </strong>
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                  height: "6px",
                                  borderRadius: "3px",
                                  background: "var(--bg-input)",
                                  overflow: "hidden",
                                  marginBottom: "10px",
                                }}>
                                  <div style={{
                                    height: "100%",
                                    width: `${progress}%`,
                                    borderRadius: "3px",
                                    background: isExpired ? "var(--border-color)" : borderColor,
                                    transition: "width 0.3s ease",
                                  }} />
                                </div>

                                {/* Expiration */}
                                <div style={{ fontSize: "12px", color: isExpired ? "var(--danger)" : "var(--text-secondary)" }}>
                                  {voucher.expirationDate ? (
                                    <>
                                      {isExpired ? "Expirado el " : "Caduca el "}
                                      <strong>{new Date(voucher.expirationDate).toLocaleDateString("es-ES")}</strong>
                                    </>
                                  ) : (
                                    "Sin caducidad"
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}


                  {editModalTab === "citas" && (
                    <div className={styles.pastCitasPane}>
                      {/* Sub-tabs buttons */}
                      <div className={styles.citasSubTabs}>
                        <button
                          type="button"
                          className={`${styles.citasSubTabBtn} ${citasSubTab === 'pasadas' ? styles.citasSubTabBtnActive : ''}`}
                          onClick={() => setCitasSubTab('pasadas')}
                        >
                          Citas pasadas
                        </button>
                        <button
                          type="button"
                          className={`${styles.citasSubTabBtn} ${citasSubTab === 'futuras' ? styles.citasSubTabBtnActive : ''}`}
                          onClick={() => setCitasSubTab('futuras')}
                        >
                          Citas futuras
                        </button>
                      </div>

                      {(() => {
                        const clientApps = appointments.filter(
                          (a) => a.clientId === selectedAppointment.clientId
                        );
                        
                        const now = new Date();
                        const pastApps = clientApps.filter(a => new Date(a.start) < now);
                        const futureApps = clientApps.filter(a => new Date(a.start) >= now);
                        
                        const currentAppsList = citasSubTab === 'pasadas' ? pastApps : futureApps;
                        const totalCountText = citasSubTab === 'pasadas'
                          ? `${pastApps.length} Total citas pasadas`
                          : `${futureApps.length} Total citas futuras`;

                        if (currentAppsList.length === 0) {
                          return (
                            <div>
                              <p className={styles.citasEmptyCount}>{totalCountText}</p>
                              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "10px" }}>
                                No se registran citas {citasSubTab === 'pasadas' ? 'anteriores' : 'programadas'}.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div>
                            <p className={styles.citasCountHeader}>{totalCountText}</p>
                            <div className={styles.citasListContainer}>
                              {currentAppsList.map((a) => {
                                const statusLabel = a.status === "CONFIRMED"
                                  ? "CONFIRMADO"
                                  : a.status === "COMPLETED"
                                  ? "COMPLETADO"
                                  : a.status === "CANCELLED"
                                  ? "CANCELADO"
                                  : a.status === "PENDING"
                                  ? "PENDIENTE"
                                  : "NO ASISTIÓ";

                                const statusColorClass = a.status === "CONFIRMED" || a.status === "COMPLETED"
                                  ? styles.citasBadgeGreen
                                  : a.status === "CANCELLED"
                                  ? styles.citasBadgeRed
                                  : a.status === "PENDING"
                                  ? styles.citasBadgeYellow
                                  : styles.citasBadgeGray;

                                const isPaid = a.status === "COMPLETED";
                                const paymentLabel = isPaid ? "PAGADO" : "SIN PAGAR";
                                const paymentColorClass = isPaid ? styles.citasBadgeGreen : styles.citasBadgeRed;

                                return (
                                  <div key={a.id} className={styles.citasItemBlock}>
                                    <h5 className={styles.citasItemDateHeader}>
                                      {(() => {
                                        const startD = new Date(a.start);
                                        const endD = new Date(a.end);
                                        const monthsSp = [
                                          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                        ];
                                        const monthName = monthsSp[startD.getMonth()];
                                        const date = startD.getDate();
                                        const year = startD.getFullYear();
                                        const startH = String(startD.getHours()).padStart(2, "0");
                                        const startM = String(startD.getMinutes()).padStart(2, "0");
                                        const endH = String(endD.getHours()).padStart(2, "0");
                                        const endM = String(endD.getMinutes()).padStart(2, "0");
                                        return `${monthName} ${date}, ${year} ${startH}:${startM} - ${endH}:${endM}`;
                                      })()}
                                    </h5>
                                    
                                    <div className={styles.citasItemRow}>
                                      <span className={`${styles.citasItemBadge} ${statusColorClass}`}>
                                        {statusLabel}
                                      </span>
                                      <span className={styles.citasItemServiceText}>
                                        {a.service.name}{showPrices ? ` - ${a.service.price.toFixed(2).replace(".", ",")} €` : ""}
                                      </span>
                                    </div>

                                    <div className={styles.citasItemRow}>
                                      <span className={`${styles.citasItemBadge} ${paymentColorClass}`}>
                                        {paymentLabel}
                                      </span>
                                      <span className={styles.citasItemStaffText}>
                                        {a.user.name} {a.user.lastName || ""}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {editModalTab === "seguimientos" && (
                    <div className={styles.seguimientosPane}>
                      <div className={styles.segGeneralBadge}>General</div>
                      
                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Observaciones</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segObservaciones}
                          onChange={(e) => setSegObservaciones(e.target.value)}
                          placeholder="Escribe observaciones aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Diagnóstico</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segDiagnostico}
                          onChange={(e) => setSegDiagnostico(e.target.value)}
                          placeholder="Escribe diagnóstico aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Operación</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segOperacion}
                          onChange={(e) => setSegOperacion(e.target.value)}
                          placeholder="Escribe operación aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Tratamiento</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segTratamiento}
                          onChange={(e) => setSegTratamiento(e.target.value)}
                          placeholder="Escribe tratamiento aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Medicación</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segMedicacion}
                          onChange={(e) => setSegMedicacion(e.target.value)}
                          placeholder="Escribe medicación aquí..."
                        />
                      </div>

                      <div className={styles.segFormGroup}>
                        <label className={styles.segFormLabel}>Material y lotes</label>
                        <textarea
                          className={styles.segTextarea}
                          value={segMaterialLotes}
                          onChange={(e) => setSegMaterialLotes(e.target.value)}
                          placeholder="Escribe material y lotes aquí..."
                        />
                      </div>

                      <div className={styles.segActionsRow}>
                        <button 
                          type="button" 
                          className={styles.segBtnEpisode} 
                          onClick={() => alert("Historial clínico / Episodio abierto.")}
                        >
                          Abrir episodio
                        </button>
                        <button 
                          type="button" 
                          className={styles.segBtnFiles} 
                          onClick={() => alert("Seleccionar archivos para adjuntar.")}
                        >
                          <span style={{ fontSize: "16px", fontWeight: "bold", marginRight: "4px" }}>+</span> Adjuntar archivos
                        </button>
                      </div>
                    </div>
                  )}

                  {/* === HISTORIAL TAB === */}
                  {editModalTab === "historial" && (
                    <div className={styles.historialPane}>
                      {loadingLogs ? (
                        <div className={styles.historialLoading}>
                          <div style={{ width: 24, height: 24, border: "3px solid var(--border-color)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          <span>Cargando historial...</span>
                        </div>
                      ) : appointmentLogs.length === 0 ? (
                        <div className={styles.historialEmpty}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          <p>No hay eventos registrados para esta cita.</p>
                        </div>
                      ) : (
                        <div className={styles.historialTimeline}>
                          {appointmentLogs.map((log, idx) => {
                            const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
                              CREATED:        { icon: "✨", label: "Cita creada",           color: "#10b981" },
                              STATUS_CHANGED: { icon: "🔄", label: "Estado cambiado",       color: "#6366f1" },
                              RESCHEDULED:    { icon: "📅", label: "Reprogramada",          color: "#f59e0b" },
                              STAFF_CHANGED:  { icon: "👤", label: "Profesional cambiado",  color: "#0ea5e9" },
                              SERVICE_CHANGED:{ icon: "🔧", label: "Servicio cambiado",     color: "#8b5cf6" },
                              NOTES_CHANGED:  { icon: "📝", label: "Notas actualizadas",    color: "#64748b" },
                              DELETED:        { icon: "🗑️", label: "Enviada a papelera",    color: "#ef4444" },
                              RESTORED:       { icon: "♻️", label: "Restaurada",             color: "#10b981" },
                            };
                            const cfg = actionConfig[log.action] || { icon: "📋", label: log.action, color: "var(--text-secondary)" };
                            const isLast = idx === appointmentLogs.length - 1;
                            return (
                              <div key={log.id} className={styles.historialItem}>
                                <div className={styles.historialItemLeft}>
                                  <div className={styles.historialDot} style={{ backgroundColor: cfg.color }}>
                                    <span style={{ fontSize: "11px" }}>{cfg.icon}</span>
                                  </div>
                                  {!isLast && <div className={styles.historialLine} />}
                                </div>
                                <div className={styles.historialItemContent}>
                                  <div className={styles.historialAction}>{cfg.label}</div>
                                  {(log.previousValue || log.newValue) && (
                                    <div className={styles.historialChange}>
                                      {log.previousValue && <span className={styles.historialPrev}>{log.previousValue}</span>}
                                      {log.previousValue && log.newValue && <span className={styles.historialArrow}>→</span>}
                                      {log.newValue && <span className={styles.historialNew}>{log.newValue}</span>}
                                    </div>
                                  )}
                                  <div className={styles.historialMeta}>
                                    {log.userName && <span className={styles.historialActor}>{log.userName}</span>}
                                    <span className={styles.historialDate}>
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
                  )}
                </div>

                <div className={styles.drawerFooter}>
                  {editModalTab === "seguimientos" ? (
                    <>
                      <button
                        type="button"
                        className={styles.segCancelBtn}
                        onClick={() => setShowEditModal(false)}
                      >
                        Cancelar
                      </button>
                      
                      <button
                        type="button"
                        className={styles.segSaveBtn}
                        onClick={handleSaveSeguimiento}
                      >
                        Guardar
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Left: Más opciones context button */}
                      <div style={{ position: "relative" }} ref={moreOptionsRef}>
                        <button
                          type="button"
                          className={styles.moreOptionsBtn}
                          onClick={() => setShowMoreOptions(!showMoreOptions)}
                        >
                          Más opciones <span className={styles.dropdownArrow}>▾</span>
                        </button>
                        {showMoreOptions && (
                          <div className={styles.moreOptionsDropdown} style={{ bottom: "100%", top: "auto", marginBottom: "8px" }}>
                            <div
                              className={styles.moreOptionsItem}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `Cita: ${selectedAppointment.client.firstName} ${selectedAppointment.client.lastName} - ${selectedAppointment.service.name} el ${new Date(selectedAppointment.start).toLocaleDateString("es-ES")}`
                                );
                                alert("Cita copiada al portapapeles");
                                setShowMoreOptions(false);
                              }}
                            >
                              Copiar cita
                            </div>
                            <div
                              className={styles.moreOptionsItem}
                              onClick={() => {
                                alert("Función para repetir cita la próxima semana activada.");
                                setShowMoreOptions(false);
                              }}
                            >
                              Repetir cita
                            </div>
                            <div
                              className={styles.moreOptionsItem}
                              onClick={() => {
                                setIsEditingApp(true);
                                setShowMoreOptions(false);
                              }}
                            >
                              Editar cita
                            </div>
                            <div
                              className={`${styles.moreOptionsItem} ${styles.moreOptionsItemDanger}`}
                              onClick={() => {
                                handleDeleteAppointment();
                                setShowMoreOptions(false);
                              }}
                            >
                              Eliminar cita
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Caja button linking to checkout */}
                      <button
                        type="button"
                        className={styles.cajaBtn}
                        onClick={() => {
                          window.location.href = `/dashboard/sales?clientId=${selectedAppointment.clientId}&serviceId=${selectedAppointment.serviceId}&appointmentId=${selectedAppointment.id}`;
                        }}
                      >
                        Caja
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* CHOOSE OPTION MODAL */}
      {showOptionModal && (
        <div className={styles.modalOverlay} onClick={() => setShowOptionModal(false)}>
          <div className={`${styles.optionModalContent} glass fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Seleccionar Acción</h2>
              <button onClick={() => setShowOptionModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>
            
            <div className={styles.optionModalButtons}>
              <button
                type="button"
                className={styles.optionBtn}
                onClick={() => {
                  setShowOptionModal(false);
                  setShowCreateModal(true);
                }}
              >
                <div className={styles.optionBtnIcon}>
                  <Icons.Calendar size={24} />
                </div>
                <div className={styles.optionBtnText}>
                  <strong>Nueva Cita</strong>
                  <span>Agendar una cita para un paciente</span>
                </div>
              </button>

              <button
                type="button"
                className={styles.optionBtn}
                onClick={() => {
                  setShowOptionModal(false);
                  setShowBlockModal(true);
                }}
              >
                <div className={`${styles.optionBtnIcon} ${styles.optionIconBlock}`}>
                  <Icons.Lock size={24} />
                </div>
                <div className={styles.optionBtnText}>
                  <strong>Nueva reserva de tiempo</strong>
                  <span>Bloquear horas en la agenda</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TIME BLOCK MODAL */}
      {showBlockModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBlockModal(false)}>
          <div className={`${styles.blockModalContent} glass fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.blockModalTitle}>Nueva reserva de tiempo</h2>
              <button onClick={() => setShowBlockModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleCreateTimeBlock} className={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre de la reserva</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Introduzca el nombre de la reserva"
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  required
                />
              </div>

              {/* Date Indicator Row with cycle icon & Multi-date select */}
              <div className={styles.blockDateContainer} ref={frequencyPopoverRef}>
                <div
                  className={styles.blockDateRow}
                  onClick={() => setShowFrequencyPopover(!showFrequencyPopover)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Icons.Sync size={16} className={styles.blockDateIcon} />
                  <span className={styles.blockDateText}>
                    {selectedBlockDates.length === 1 ? (
                      (() => {
                        const parts = selectedBlockDates[0].split("-");
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      })()
                    ) : (
                      `Esta se repetirá en ${selectedBlockDates.length} ocasiones`
                    )}
                  </span>
                </div>

                {showFrequencyPopover && (
                  <div className={styles.frequencyPopover} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.popoverFrequencyRow}>
                      <span className={styles.popoverFrequencyLabel}>Frecuencia</span>
                      <select className={styles.popoverFrequencySelect} defaultValue="seleccionar">
                        <option value="seleccionar">Seleccionar días</option>
                      </select>
                    </div>

                    <div className={styles.popoverCalendarHeader}>
                      <button
                        type="button"
                        className={styles.popoverNavBtn}
                        onClick={() => {
                          if (popoverMonth === 0) {
                            setPopoverMonth(11);
                            setPopoverYear(popoverYear - 1);
                          } else {
                            setPopoverMonth(popoverMonth - 1);
                          }
                        }}
                      >
                        &lt;
                      </button>

                      <div className={styles.popoverSelectors}>
                        <select
                          className={styles.popoverMonthSelect}
                          value={popoverMonth}
                          onChange={(e) => setPopoverMonth(parseInt(e.target.value))}
                        >
                          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, idx) => (
                            <option key={idx} value={idx}>{m}</option>
                          ))}
                        </select>
                        <select
                          className={styles.popoverYearSelect}
                          value={popoverYear}
                          onChange={(e) => setPopoverYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className={styles.popoverNavBtn}
                        onClick={() => {
                          if (popoverMonth === 11) {
                            setPopoverMonth(0);
                            setPopoverYear(popoverYear + 1);
                          } else {
                            setPopoverMonth(popoverMonth + 1);
                          }
                        }}
                      >
                        &gt;
                      </button>
                    </div>

                    <div className={styles.popoverCalendarWeekdays}>
                      {["L", "M", "M", "J", "V", "S", "D"].map((w, idx) => (
                        <div key={idx} className={styles.popoverWeekday}>{w}</div>
                      ))}
                    </div>

                    <div className={styles.popoverCalendarGrid}>
                      {(() => {
                        const daysInMonth = new Date(popoverYear, popoverMonth + 1, 0).getDate();
                        const firstDayOffset = (new Date(popoverYear, popoverMonth, 1).getDay() + 6) % 7;
                        const cells = [];
                        for (let i = 0; i < firstDayOffset; i++) {
                          cells.push(<div key={`empty-${i}`} className={styles.popoverEmptyCell} />);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${popoverYear}-${String(popoverMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isSelected = selectedBlockDates.includes(dateStr);
                          cells.push(
                            <div
                              key={d}
                              className={`${styles.popoverDayCell} ${isSelected ? styles.popoverDaySelected : ""}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedBlockDates(selectedBlockDates.filter(x => x !== dateStr));
                                } else {
                                  setSelectedBlockDates([...selectedBlockDates, dateStr]);
                                }
                              }}
                            >
                              <span className={styles.popoverDayNumber}>{d}</span>
                            </div>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </div>
                )}

                {selectedBlockDates.length > 0 && (
                  <div className={styles.selectedDatesBadges}>
                    {selectedBlockDates.map(d => {
                      const parts = d.split("-");
                      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      return (
                        <div key={d} className={styles.dateBadge}>
                          <span>{formatted}</span>
                          <button
                            type="button"
                            className={styles.deleteBadgeBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedBlockDates.length > 1) {
                                  setSelectedBlockDates(selectedBlockDates.filter(x => x !== d));
                              } else {
                                alert("Debe haber al menos un día seleccionado.");
                              }
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dropdowns of start and end hours */}
              <div className={styles.blockTimeDropdowns}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Inicio</label>
                  <select
                    className="input select"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Final</label>
                  <select
                    className="input select"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Añadir nota</label>
                <textarea
                  className="input"
                  style={{ minHeight: "120px", resize: "vertical" }}
                  placeholder=""
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                />
              </div>

              <div className={styles.blockModalActions}>
                <button
                  type="button"
                  className={styles.blockCancelBtn}
                  onClick={() => setShowBlockModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.blockCreateBtn}
                  onClick={handleCreateTimeBlock}
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW/EDIT TIME BLOCK DETAIL MODAL */}
      {showBlockDetailModal && selectedTimeBlock && (
        <div className={styles.modalOverlay} onClick={() => setShowBlockDetailModal(false)}>
          <div className={`${styles.blockModalContent} glass fade-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={styles.blockModalTitle}>Nueva reserva de tiempo</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className={styles.convertBtn}
                  onClick={handleConvertBlockToAppointment}
                >
                  Convertir a cita
                </button>
                <button onClick={() => setShowBlockDetailModal(false)} className={styles.closeBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTimeBlock} className={styles.modalForm}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Nombre de la reserva</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Introduzca el nombre de la reserva"
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  required
                />
              </div>

              {/* Dropdowns of start and end hours (NO DATE SELECTION) */}
              <div className={styles.blockTimeDropdowns} style={{ marginBottom: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Inicio</label>
                  <select
                    className="input select"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Final</label>
                  <select
                    className="input select"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    required
                  >
                    {timeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Añadir nota</label>
                <textarea
                  className="input"
                  style={{ minHeight: "120px", resize: "vertical" }}
                  placeholder=""
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                />
              </div>

              {/* Footer Actions: Eliminar (red border), Cancelar (blue border), Actualizar (solid green) */}
              <div className={styles.blockEditActionsRow}>
                <button
                  type="button"
                  className={styles.blockDeleteBtnBorder}
                  onClick={() => handleDeleteTimeBlock(selectedTimeBlock.id)}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className={styles.blockCancelBtnBorder}
                  onClick={() => setShowBlockDetailModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.blockUpdateBtnSolid}
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPTIONS SIDEBAR DRAWER — rendered via Portal to cover the full viewport */}
      {showOpcionesSidebar && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowOpcionesSidebar(false)}>
          <div className={styles.drawerWrapper} onClick={(e) => e.stopPropagation()}>

            {/* Left panel: Opciones menu list */}
            <div className={styles.drawerContent}>
              <div className={styles.drawerHeader}>
                <h3>Opciones</h3>
                <button onClick={() => setShowOpcionesSidebar(false)} className={styles.drawerCloseBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <div className={styles.optionsList}>
                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "weekends" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempHideWeekends(hideWeekends);
                      setSidebarSubView("weekends");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Fines de semana</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                      <span>Avisos al crear citas</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${sidebarSubView === "zoom" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempZoomLevel(zoomLevel);
                      setSidebarSubView("zoom");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>Zoom</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <span>Etiquetas</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Grupos</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M12 5V22M5 12H19" />
                        <path d="M12 22A7 7 0 0 1 5 15h2a5 5 0 0 0 10 0h2a7 7 0 0 1-7 7z" />
                      </svg>
                      <span>Anclar</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>Imprimir agenda</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>

                  <div className={styles.optionItem}>
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Vista</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel: Submenu (visible when a submenu item is selected) */}
            {sidebarSubView === "weekends" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Fines de semana</h3>
                </div>

                <div className={styles.submenuBody}>
                  <div className={styles.toggleRow}>
                    <label className={styles.switchLabel}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={tempHideWeekends}
                        onChange={(e) => setTempHideWeekends(e.target.checked)}
                      />
                      <span className={styles.switchSlider} />
                      <span className={styles.switchText}>Ocultar Fines De Semana</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px", cursor: "help" }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </label>
                  </div>
                </div>

                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowOpcionesSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setHideWeekends(tempHideWeekends);
                      // Auto-saved by the hideWeekends useEffect

                      if (tempHideWeekends) {
                        const day = currentDate.getDay();
                        if (day === 0) {
                          const newD = new Date(currentDate);
                          newD.setDate(currentDate.getDate() + 1);
                          setCurrentDate(newD);
                        } else if (day === 6) {
                          const newD = new Date(currentDate);
                          newD.setDate(currentDate.getDate() + 2);
                          setCurrentDate(newD);
                        }
                      }

                      setShowOpcionesSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Right panel: Zoom Submenu */}
            {sidebarSubView === "zoom" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Zoom</h3>
                </div>

                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      Altura del calendario
                    </label>
                    <select
                      className="input select"
                      value={tempZoomLevel}
                      onChange={(e) => setTempZoomLevel(e.target.value as "poco" | "normal" | "grande")}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="poco">Pequeño</option>
                      <option value="normal">Mediano</option>
                      <option value="grande">Grande</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      Ancho del calendario
                    </label>
                    <select
                      className="input select"
                      defaultValue="normal"
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="normal">Normal</option>
                      <option value="ancho">Ancho completo</option>
                    </select>
                  </div>
                </div>

                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowOpcionesSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setZoomLevel(tempZoomLevel);
                      setShowOpcionesSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* 1. CONVERT TIMEBLOCK TO APPOINTMENT MODAL (Image 3) */}
      {showConvertModal && selectedTimeBlock && (
        <div className={styles.modalOverlay} onClick={() => setShowConvertModal(false)}>
          <div className={`${styles.blockModalContent} glass fade-in`} style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={styles.blockModalTitle}>Convertir a cita</h2>
              <button onClick={() => setShowConvertModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleExecuteConvertBlock} className={styles.modalForm}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Cliente</label>
                <select
                  className="input select"
                  value={convertClientId}
                  onChange={(e) => setConvertClientId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Servicio</label>
                <select
                  className="input select"
                  value={convertServiceId}
                  onChange={(e) => setConvertServiceId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                >
                  {servicesList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{showPrices ? ` (${s.price} €)` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Ubicación</label>
                <select
                  className="input select"
                  value={convertLocationId}
                  onChange={(e) => setConvertLocationId(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px" }}
                  required
                >
                  <option value={activeClinic?.id}>{activeClinic?.name}</option>
                </select>
              </div>

              <div className={styles.blockEditActionsRow} style={{ justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className={styles.blockCancelBtnBorder}
                  onClick={() => setShowConvertModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.blockUpdateBtnSolid}
                  style={{ background: "#10b981", borderColor: "#10b981" }}
                >
                  Convertir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. FILTERS SIDEBAR DRAWER (Image 4 and Image 5) */}
      {showFiltersSidebar && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowFiltersSidebar(false)}>
          <div className={styles.drawerWrapper} onClick={(e) => e.stopPropagation()}>
            
            {/* Left panel: Filters list */}
            <div className={styles.drawerContent}>
              <div className={styles.drawerHeader}>
                <h3>Filtros</h3>
                <button onClick={() => setShowFiltersSidebar(false)} className={styles.drawerCloseBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>
              
              <div className={styles.drawerBody}>
                <div className={styles.optionsList}>
                  <button
                    type="button"
                    className={`${styles.optionItem} ${filtersSubView === "direcciones" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempFilterClinicId(filterClinicId);
                      setFiltersSubView("direcciones");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon} style={{ marginRight: "8px" }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      <span>Direcciones</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${filtersSubView === "servicios" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempFilterServiceId(selectedServiceId);
                      setFiltersSubView("servicios");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon} style={{ marginRight: "8px" }}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                      <span>Servicios</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>

                  <button
                    type="button"
                    className={`${styles.optionItem} ${filtersSubView === "clientes" ? styles.optionItemActive : ""}`}
                    onClick={() => {
                      setTempFilterClientId(filterClientId);
                      setFiltersSubView("clientes");
                    }}
                  >
                    <div className={styles.optionItemLeft}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.optionIcon} style={{ marginRight: "8px" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span>Clientes</span>
                    </div>
                    <Icons.ChevronRight size={16} className={styles.optionChevron} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right panel: Direcciones Submenu */}
            {filtersSubView === "direcciones" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Direcciones</h3>
                </div>
                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      DIRECCIÓN
                    </label>
                    <select
                      className="input select"
                      value={tempFilterClinicId}
                      onChange={(e) => setTempFilterClinicId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="all">Seleccionar</option>
                      {currentUser?.clinics?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowFiltersSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setFilterClinicId(tempFilterClinicId);
                      setShowFiltersSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Right panel: Servicios Submenu */}
            {filtersSubView === "servicios" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Servicios</h3>
                </div>
                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      SERVICIO
                    </label>
                    <select
                      className="input select"
                      value={tempFilterServiceId}
                      onChange={(e) => setTempFilterServiceId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="all">Seleccionar</option>
                      {servicesList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowFiltersSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setSelectedServiceId(tempFilterServiceId);
                      setShowFiltersSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* Right panel: Clientes Submenu */}
            {filtersSubView === "clientes" && (
              <div className={styles.drawerContent} style={{ borderLeft: "1px solid var(--border-color)" }}>
                <div className={styles.submenuHeader}>
                  <h3>Clientes</h3>
                </div>
                <div className={styles.submenuBody} style={{ padding: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                      CLIENTE
                    </label>
                    <select
                      className="input select"
                      value={tempFilterClientId}
                      onChange={(e) => setTempFilterClientId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    >
                      <option value="all">Seleccionar</option>
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.submenuFooter}>
                  <button
                    type="button"
                    className={styles.submenuCancelBtn}
                    onClick={() => setShowFiltersSidebar(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.submenuApplyBtn}
                    onClick={() => {
                      setFilterClientId(tempFilterClientId);
                      setShowFiltersSidebar(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* 3. WAITLIST SIDEBAR DRAWER */}
      {showWaitlistSidebar && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowWaitlistSidebar(false)}>
          <div className={styles.drawerWrapper} onClick={(e) => e.stopPropagation()}>
            
            {/* Main panel: Waitlist entries */}
            <div className={styles.drawerContent} style={{ width: "380px" }}>
              <div className={styles.drawerHeader}>
                <h3>Lista de espera</h3>
                <button onClick={() => setShowWaitlistSidebar(false)} className={styles.drawerCloseBtn}>
                  <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
                </button>
              </div>

              {waitlistSubView === "list" ? (
                <>
                  <div style={{ padding: "16px 20px 8px 20px" }}>
                    <button
                      type="button"
                      className={styles.addWaitlistButton}
                      onClick={() => {
                        setWaitlistClientId("");
                        setWaitlistUserId("all");
                        setWaitlistServiceId("all");
                        setWaitlistNotes("");
                        setWaitlistPreferredDay("all");
                        setWaitlistPreferredTime("all");
                        setWaitlistSubView("add");
                      }}
                    >
                      + Añadir a lista de espera
                    </button>
                  </div>

                  <div className={styles.drawerBody} style={{ padding: "10px 20px" }}>
                    {waitlist.length === 0 ? (
                      <div className={styles.emptyWaitlistState}>
                        <p>No hay pacientes en la lista de espera.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {waitlist.map((entry) => {
                          const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                          const dayPref = entry.preferredDayOfWeek !== null ? dayNames[entry.preferredDayOfWeek] : "Cualquier día";
                          const timePref = entry.preferredTimeRange || "Cualquier horario";

                          return (
                            <div key={entry.id} className={styles.waitlistCard}>
                              <div className={styles.waitlistCardHeader}>
                                <strong>{entry.client.firstName} {entry.client.lastName}</strong>
                                <span className={styles.waitlistCardDate}>
                                  {new Date(entry.createdAt).toLocaleDateString("es-ES")}
                                </span>
                              </div>

                              <div className={styles.waitlistCardDetail}>
                                <div>
                                  <strong>Servicio:</strong> {entry.service?.name || "Cualquiera"}
                                </div>
                                <div>
                                  <strong>Profesional:</strong> {entry.user?.name || "Cualquiera"}
                                </div>
                                <div>
                                  <strong>Preferencia:</strong> {dayPref} ({timePref})
                                </div>
                                {entry.notes && (
                                  <div className={styles.waitlistCardNotes}>
                                    "{entry.notes}"
                                  </div>
                                )}
                              </div>

                              <div className={styles.waitlistCardActions}>
                                <button
                                  type="button"
                                  className={styles.waitlistAssignBtn}
                                  onClick={() => {
                                    setActiveWaitlistEntryForAppointment(entry);
                                    setFormClientId(entry.clientId);
                                    setFormServiceId(entry.serviceId || servicesList[0]?.id || "");
                                    setFormUserId(entry.userId || staffList[0]?.id || "");
                                    setFormNotes(`Cita asignada desde Lista de Espera.\nPreferencia: ${dayPref} (${timePref}).\nNotas: ${entry.notes || ""}`);
                                    
                                    const todayStr = new Date().toISOString().split("T")[0];
                                    setFormDate(todayStr);
                                    setFormTime("09:00");
                                    
                                    setShowWaitlistSidebar(false);
                                    setShowCreateModal(true);
                                  }}
                                  title="Asignar Cita en Calendario"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  Asignar cita
                                </button>

                                <button
                                  type="button"
                                  className={styles.waitlistDeleteBtn}
                                  onClick={() => handleDeleteWaitlistEntry(entry.id)}
                                  title="Quitar de la lista"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleAddToWaitlist} className={styles.waitlistForm}>
                  <div className={styles.drawerBody} style={{ padding: "20px" }}>
                    <h4 style={{ marginBottom: "16px", marginTop: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                      Añadir paciente en espera
                    </h4>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Paciente *</label>
                      <select
                        className="input select"
                        value={waitlistClientId}
                        onChange={(e) => setWaitlistClientId(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                        required
                      >
                        <option value="">Seleccionar paciente...</option>
                        {clientsList.map((c) => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Profesional preferido</label>
                      <select
                        className="input select"
                        value={waitlistUserId}
                        onChange={(e) => setWaitlistUserId(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier profesional</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} {s.lastName || ""}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Servicio preferido</label>
                      <select
                        className="input select"
                        value={waitlistServiceId}
                        onChange={(e) => setWaitlistServiceId(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier servicio</option>
                        {servicesList.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Día preferido</label>
                      <select
                        className="input select"
                        value={waitlistPreferredDay}
                        onChange={(e) => setWaitlistPreferredDay(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier día</option>
                        <option value="1">Lunes</option>
                        <option value="2">Martes</option>
                        <option value="3">Miércoles</option>
                        <option value="4">Jueves</option>
                        <option value="5">Viernes</option>
                        <option value="6">Sábado</option>
                        <option value="0">Domingo</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Horario preferido</label>
                      <select
                        className="input select"
                        value={waitlistPreferredTime}
                        onChange={(e) => setWaitlistPreferredTime(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px" }}
                      >
                        <option value="all">Cualquier horario</option>
                        <option value="Mañana">Mañana (08:00 - 14:00)</option>
                        <option value="Tarde">Tarde (14:00 - 20:00)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "20px" }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Disponibilidad / Notas</label>
                      <textarea
                        className="input"
                        placeholder="Escribe comentarios sobre disponibilidad u observaciones..."
                        value={waitlistNotes}
                        onChange={(e) => setWaitlistNotes(e.target.value)}
                        style={{ width: "100%", minHeight: "80px", resize: "vertical", padding: "8px 12px" }}
                      />
                    </div>
                  </div>

                  <div className={styles.drawerFooter} style={{ padding: "16px 20px" }}>
                    <button
                      type="button"
                      className={styles.submenuCancelBtn}
                      style={{ flex: 1 }}
                      onClick={() => setWaitlistSubView("list")}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={styles.submenuApplyBtn}
                      style={{ flex: 1, backgroundColor: "#10b981", borderColor: "#10b981" }}
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
