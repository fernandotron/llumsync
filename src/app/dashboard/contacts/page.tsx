"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Contacts.module.css";
import { translate } from "@/lib/translations";
import { getCountryConfig } from "@/lib/countries";
import { toast } from "@/components/ToastContainer";

interface Client {
  id: string;
  clientNumber: number;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dniNif?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  municipality?: string;
  postalCode?: string;
  country?: string;
  iban?: string;
  bic?: string;
  tags?: string;
  createdAt: string;
  
  // History fields
  aestheticTreatments?: string;
  allergies?: string;
  medication?: string;
  medicalHistory?: string;
  otherNotes?: string;
  
  // Tutor fields
  tutorName?: string;
  tutorLastName?: string;
  tutorDniNif?: string;
  tutorPhone?: string;
  tutorEmail?: string;
  tutorAddress?: string;
  tutorPostalCode?: string;
  tutorMunicipality?: string;
  
  allowedUsers?: { id: string }[];
}

const TAG_COLORS = ["#f56565", "#ed8936", "#ecc94b", "#48bb78", "#38b2ac", "#4299e1", "#667eea", "#9f7aec", "#ed64a6", "#a0aec0"];

interface ColumnConfig {
  key: keyof Client | "lastAppointment";
  label: string;
  visible: boolean;
}

export default function ContactsPage() {
  const { activeClinic, user: currentUser, language } = useApp();
  const t = (key: string) => translate(key, language);
  const cConfig = getCountryConfig(activeClinic?.country || "ES");
  const identityLabel = cConfig.idName;
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "clientes", "Ver clientes")) {
      router.push("/dashboard/agenda");
    }
  }, [currentUser, router]);

  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Bulk Selection & Permissions
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showBulkOptions, setShowBulkOptions] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [clinicUsers, setClinicUsers] = useState<any[]>([]);
  const [selectedUsersForPermissions, setSelectedUsersForPermissions] = useState<string[]>([]);

  // Client Tags Modal States
  const [clientAvailableTags, setClientAvailableTags] = useState<{ name: string; color: string }[]>([]);
  const [showAddTagsModal, setShowAddTagsModal] = useState(false);
  const [modalClientTags, setModalClientTags] = useState<string[]>([]);
  const [showCreateTagsDropdown, setShowCreateTagsDropdown] = useState(false);
  const [createTagsSubView, setCreateTagsSubView] = useState<"list" | "create">("list");
  const [searchCreateTagQuery, setSearchCreateTagQuery] = useState("");
  const [newCreateTagName, setNewCreateTagName] = useState("");
  const [newCreateTagColor, setNewCreateTagColor] = useState("#f56565");
  const createTagsDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sorting
  const [sortField, setSortField] = useState<keyof Client | "lastAppointment" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof Client | "lastAppointment") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Column Visibility Config
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "clientNumber", label: t("colClientNum"), visible: true },
    { key: "firstName", label: `${t("colFirstName")} y ${t("lastName").toLowerCase()}`, visible: true },
    { key: "phone", label: t("colPhone"), visible: true },
    { key: "email", label: t("colEmail"), visible: true },
    { key: "dniNif", label: identityLabel, visible: true },
    { key: "birthDate", label: t("colBirthDate"), visible: false },
    { key: "gender", label: t("colGender"), visible: false },
    { key: "createdAt", label: t("colCreationDate"), visible: true },
    { key: "lastAppointment", label: t("colLastAppt"), visible: true },
    { key: "tags", label: t("colTags"), visible: true },
    { key: "address", label: t("colAddress"), visible: false },
    { key: "municipality", label: t("colMunicipality"), visible: false },
    { key: "postalCode", label: t("colPostalCode"), visible: false },
    { key: "country", label: t("country"), visible: false },
    { key: "iban", label: "IBAN", visible: false },
    { key: "aestheticTreatments", label: t("colAestheticTreatments"), visible: false },
    { key: "allergies", label: t("colAllergies"), visible: false },
    { key: "medication", label: t("colMedication"), visible: false },
    { key: "medicalHistory", label: t("colMedicalHistory"), visible: false },
  ]);

  // Dropdown states
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationTab, setCreationTab] = useState<"general" | "otros">("general");

  // Refs for click-outside detection
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const bulkOptionsRef = useRef<HTMLDivElement>(null);

  // Filter conditions
  const [filterGender, setFilterGender] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [filterUserId, setFilterUserId] = useState("all");

  // Advanced Filtering layout and custom preset states
  const [filterActiveTab, setFilterActiveTab] = useState<"menu" | "tags" | "gender" | "age" | "createdAt" | "lastAppointment" | "field" | "permissions">("menu");
  const [customFilters, setCustomFilters] = useState<{ name: string; values: any }[]>([]);
  const [selectedCustomFilter, setSelectedCustomFilter] = useState("");
  const [filterAgeMin, setFilterAgeMin] = useState("");
  const [filterAgeMax, setFilterAgeMax] = useState("");
  const [filterCreatedStart, setFilterCreatedStart] = useState("");
  const [filterCreatedEnd, setFilterCreatedEnd] = useState("");
  const [filterLastApptStart, setFilterLastApptStart] = useState("");
  const [filterLastApptEnd, setFilterLastApptEnd] = useState("");
  const [filterFieldName, setFilterFieldName] = useState("firstName");
  const [filterFieldValue, setFilterFieldValue] = useState("");

  // Create Client Form Fields
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDniNif, setFormDniNif] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formGender, setFormGender] = useState("Femenino");
  const [formAddress, setFormAddress] = useState("");
  const [formMunicipality, setFormMunicipality] = useState("");
  const [formPostalCode, setFormPostalCode] = useState("");
  const [formCountry, setFormCountry] = useState("España");
  
  // Address autocomplete states
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const addressAutocompleteRef = useRef<HTMLDivElement>(null);

  const handleAddressChange = async (val: string) => {
    setFormAddress(val);
    if (val.trim().length > 3) {
      try {
        const countryCode = activeClinic?.country || "ES";
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val
          )}&countrycodes=${countryCode.toLowerCase()}&limit=5&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((item: any) => {
            const road = item.address.road || item.address.pedestrian || "";
            const houseNumber = item.address.house_number || "";
            const cityVal = item.address.city || item.address.town || item.address.village || item.address.suburb || "";
            const postcode = item.address.postcode || "";
            const countryName = item.address.country || "";
            return {
              address: [road, houseNumber].filter(Boolean).join(", "),
              city: cityVal,
              postalCode: postcode,
              country: countryName,
              displayName: item.display_name,
            };
          });
          setAddressSuggestions(formatted);
          setShowAddressDropdown(true);
        }
      } catch (e) {
        console.error("Error fetching autocompleted address:", e);
      }
    } else {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
    }
  };

  const handleSelectAddressSuggestion = (item: any) => {
    setFormAddress(item.address || item.displayName.split(",")[0]);
    if (item.city) setFormMunicipality(item.city);
    if (item.postalCode) setFormPostalCode(item.postalCode);
    if (item.country) setFormCountry(item.country);
    setAddressSuggestions([]);
    setShowAddressDropdown(false);
  };
  const [formIban, setFormIban] = useState("");
  const [formBic, setFormBic] = useState("");
  const [formTags, setFormTags] = useState("");
  
  // Otros datos
  const [formAestheticTreatments, setFormAestheticTreatments] = useState("");
  const [formAllergies, setFormAllergies] = useState("");
  const [formMedication, setFormMedication] = useState("");
  const [formMedicalHistory, setFormMedicalHistory] = useState("");
  const [formOtherNotes, setFormOtherNotes] = useState("");

  // Tutor details
  const [formTutorName, setFormTutorName] = useState("");
  const [formTutorLastName, setFormTutorLastName] = useState("");
  const [formTutorDniNif, setFormTutorDniNif] = useState("");
  const [formTutorPhone, setFormTutorPhone] = useState("");
  const [formTutorEmail, setFormTutorEmail] = useState("");
  const [formTutorAddress, setFormTutorAddress] = useState("");
  const [formTutorPostalCode, setFormTutorPostalCode] = useState("");
  const [formTutorMunicipality, setFormTutorMunicipality] = useState("");

  // Switches for new client
  const [formIsSelfEmployed, setFormIsSelfEmployed] = useState(false);
  const [formIsCompany, setFormIsCompany] = useState(false);
  const [formReceivesReminders, setFormReceivesReminders] = useState(true);

  // Phone country picker
  const COUNTRIES = [
    { code: "ES", flag: "🇪🇸", name: "España", dial: "+34" },
    { code: "AD", flag: "🇦🇩", name: "Andorra", dial: "+376" },
    { code: "AR", flag: "🇦🇷", name: "Argentina", dial: "+54" },
    { code: "AU", flag: "🇦🇺", name: "Australia", dial: "+61" },
    { code: "AT", flag: "🇦🇹", name: "Austria", dial: "+43" },
    { code: "BE", flag: "🇧🇪", name: "Bélgica", dial: "+32" },
    { code: "BO", flag: "🇧🇴", name: "Bolivia", dial: "+591" },
    { code: "BR", flag: "🇧🇷", name: "Brasil", dial: "+55" },
    { code: "CA", flag: "🇨🇦", name: "Canadá", dial: "+1" },
    { code: "CL", flag: "🇨🇱", name: "Chile", dial: "+56" },
    { code: "CN", flag: "🇨🇳", name: "China", dial: "+86" },
    { code: "CO", flag: "🇨🇴", name: "Colombia", dial: "+57" },
    { code: "CR", flag: "🇨🇷", name: "Costa Rica", dial: "+506" },
    { code: "CU", flag: "🇨🇺", name: "Cuba", dial: "+53" },
    { code: "CZ", flag: "🇨🇿", name: "República Checa", dial: "+420" },
    { code: "DK", flag: "🇩🇰", name: "Dinamarca", dial: "+45" },
    { code: "DO", flag: "🇩🇴", name: "Rep. Dominicana", dial: "+1" },
    { code: "EC", flag: "🇪🇨", name: "Ecuador", dial: "+593" },
    { code: "EG", flag: "🇪🇬", name: "Egipto", dial: "+20" },
    { code: "SV", flag: "🇸🇻", name: "El Salvador", dial: "+503" },
    { code: "FI", flag: "🇫🇮", name: "Finlandia", dial: "+358" },
    { code: "FR", flag: "🇫🇷", name: "Francia", dial: "+33" },
    { code: "DE", flag: "🇩🇪", name: "Alemania", dial: "+49" },
    { code: "GR", flag: "🇬🇷", name: "Grecia", dial: "+30" },
    { code: "GT", flag: "🇬🇹", name: "Guatemala", dial: "+502" },
    { code: "HN", flag: "🇭🇳", name: "Honduras", dial: "+504" },
    { code: "HU", flag: "🇭🇺", name: "Hungría", dial: "+36" },
    { code: "IN", flag: "🇮🇳", name: "India", dial: "+91" },
    { code: "ID", flag: "🇮🇩", name: "Indonesia", dial: "+62" },
    { code: "IE", flag: "🇮🇪", name: "Irlanda", dial: "+353" },
    { code: "IL", flag: "🇮🇱", name: "Israel", dial: "+972" },
    { code: "IT", flag: "🇮🇹", name: "Italia", dial: "+39" },
    { code: "JP", flag: "🇯🇵", name: "Japón", dial: "+81" },
    { code: "MX", flag: "🇲🇽", name: "México", dial: "+52" },
    { code: "MA", flag: "🇲🇦", name: "Marruecos", dial: "+212" },
    { code: "NL", flag: "🇳🇱", name: "Países Bajos", dial: "+31" },
    { code: "NI", flag: "🇳🇮", name: "Nicaragua", dial: "+505" },
    { code: "NO", flag: "🇳🇴", name: "Noruega", dial: "+47" },
    { code: "PA", flag: "🇵🇦", name: "Panamá", dial: "+507" },
    { code: "PY", flag: "🇵🇾", name: "Paraguay", dial: "+595" },
    { code: "PE", flag: "🇵🇪", name: "Perú", dial: "+51" },
    { code: "PL", flag: "🇵🇱", name: "Polonia", dial: "+48" },
    { code: "PT", flag: "🇵🇹", name: "Portugal", dial: "+351" },
    { code: "PR", flag: "🇵🇷", name: "Puerto Rico", dial: "+1" },
    { code: "RO", flag: "🇷🇴", name: "Rumanía", dial: "+40" },
    { code: "RU", flag: "🇷🇺", name: "Rusia", dial: "+7" },
    { code: "SA", flag: "🇸🇦", name: "Arabia Saudí", dial: "+966" },
    { code: "SE", flag: "🇸🇪", name: "Suecia", dial: "+46" },
    { code: "CH", flag: "🇨🇭", name: "Suiza", dial: "+41" },
    { code: "TH", flag: "🇹🇭", name: "Tailandia", dial: "+66" },
    { code: "TR", flag: "🇹🇷", name: "Turquía", dial: "+90" },
    { code: "UA", flag: "🇺🇦", name: "Ucrania", dial: "+380" },
    { code: "AE", flag: "🇦🇪", name: "Emiratos Árabes", dial: "+971" },
    { code: "GB", flag: "🇬🇧", name: "Reino Unido", dial: "+44" },
    { code: "US", flag: "🇺🇸", name: "Estados Unidos", dial: "+1" },
    { code: "UY", flag: "🇺🇾", name: "Uruguay", dial: "+598" },
    { code: "VE", flag: "🇻🇪", name: "Venezuela", dial: "+58" },
  ];

  const [phoneCountry, setPhoneCountry] = useState(COUNTRIES[0]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const phoneDropdownRef = useRef<HTMLDivElement>(null);

  const [countryDropdownCountry, setCountryDropdownCountry] = useState(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Birth date calendar
  const [showBirthCalendar, setShowBirthCalendar] = useState(false);
  const [birthCalYear, setBirthCalYear] = useState(new Date().getFullYear() - 30);
  const [birthCalMonth, setBirthCalMonth] = useState(new Date().getMonth());
  const birthCalRef = useRef<HTMLDivElement>(null);

  // DNI country picker
  const [dniCountry, setDniCountry] = useState(COUNTRIES[0]);
  const [showDniDropdown, setShowDniDropdown] = useState(false);
  const [dniSearch, setDniSearch] = useState("");
  const dniDropdownRef = useRef<HTMLDivElement>(null);

  const fetchClients = () => {
    if (!activeClinic) return;
    setLoading(true);
    fetch(`/api/clients?clinicId=${activeClinic.id}&search=${searchQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClients(data);
        } else {
          setClients([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching clients:", err);
        setClients([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (activeClinic) {
      const code = activeClinic.country || "ES";
      const config = getCountryConfig(code);
      setFormCountry(config.name);
      const matched = COUNTRIES.find((c) => c.code === config.code);
      if (matched) {
        setPhoneCountry(matched);
        setDniCountry(matched);
        setCountryDropdownCountry(matched);
      }
    }
  }, [activeClinic]);

  useEffect(() => {
    fetchClients();
    if (activeClinic) {
      fetch(`/api/users?clinicId=${activeClinic.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setClinicUsers(data);
        })
        .catch(console.error);
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clifav_client_available_tags");
      if (saved) {
        try {
          setClientAvailableTags(JSON.parse(saved));
        } catch (e) {
          setClientAvailableTags([
            { name: "FRECUENTE", color: "#4299e1" },
            { name: "NUEVO", color: "#48bb78" },
            { name: "RECOMENDADO", color: "#ed8936" }
          ]);
        }
      } else {
        const initial = [
          { name: "FRECUENTE", color: "#4299e1" },
          { name: "NUEVO", color: "#48bb78" },
          { name: "RECOMENDADO", color: "#ed8936" }
        ];
        setClientAvailableTags(initial);
        localStorage.setItem("clifav_client_available_tags", JSON.stringify(initial));
        const savedCustom = localStorage.getItem("clifav_custom_client_filters");
        if (savedCustom) {
          try {
            setCustomFilters(JSON.parse(savedCustom));
          } catch (e) {}
        }
      }
    }
  }, [activeClinic, searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setShowColumnDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (bulkOptionsRef.current && !bulkOptionsRef.current.contains(e.target as Node)) {
        setShowBulkOptions(false);
      }
      if (addressAutocompleteRef.current && !addressAutocompleteRef.current.contains(e.target as Node)) {
        setShowAddressDropdown(false);
      }
      if (createTagsDropdownRef.current && !createTagsDropdownRef.current.contains(e.target as Node)) {
        setShowCreateTagsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleColumn = (key: string) => {
    setColumns(
      columns.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const getAge = (birthDateStr: string | Date) => {
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Filter application
  const filteredClients = clients.filter((client) => {
    if (filterGender !== "all" && client.gender !== filterGender) return false;
    if (filterTag && (!client.tags || !client.tags.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    if (filterUserId !== "all") {
      const allowedIds = client.allowedUsers?.map((u) => u.id) || [];
      if (!allowedIds.includes(filterUserId)) return false;
    }
    if (filterAgeMin || filterAgeMax) {
      if (!client.birthDate) return false;
      const age = getAge(client.birthDate);
      if (filterAgeMin && age < parseInt(filterAgeMin)) return false;
      if (filterAgeMax && age > parseInt(filterAgeMax)) return false;
    }
    if (filterCreatedStart || filterCreatedEnd) {
      const createdTime = new Date(client.createdAt).getTime();
      if (filterCreatedStart && createdTime < new Date(filterCreatedStart + "T00:00:00").getTime()) return false;
      if (filterCreatedEnd && createdTime > new Date(filterCreatedEnd + "T23:59:59").getTime()) return false;
    }
    if (filterLastApptStart || filterLastApptEnd) {
      const apps = (client as any).appointments || [];
      if (apps.length === 0) return false;
      const latestTime = Math.max(...apps.map((a: any) => new Date(a.start).getTime()));
      if (filterLastApptStart && latestTime < new Date(filterLastApptStart + "T00:00:00").getTime()) return false;
      if (filterLastApptEnd && latestTime > new Date(filterLastApptEnd + "T23:59:59").getTime()) return false;
    }
    if (filterFieldValue.trim()) {
      const fieldVal = String((client as any)[filterFieldName] || "").toLowerCase();
      if (!fieldVal.includes(filterFieldValue.toLowerCase().trim())) return false;
    }
    return true;
  });

  // Sort logic
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal: any = "";
    let bVal: any = "";
    
    if (sortField === "lastAppointment") {
      const aApps = (a as any).appointments;
      const bApps = (b as any).appointments;
      aVal = aApps && aApps.length > 0 ? new Date(aApps[0].start).getTime() : 0;
      bVal = bApps && bApps.length > 0 ? new Date(bApps[0].start).getTime() : 0;
    } else {
      aVal = a[sortField];
      bVal = b[sortField];
    }
    
    if (aVal === undefined || aVal === null) aVal = "";
    if (bVal === undefined || bVal === null) bVal = "";
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    if (sortField === "createdAt" || sortField === "birthDate") {
      const aTime = aVal ? new Date(aVal).getTime() : 0;
      const bTime = bVal ? new Date(bVal).getTime() : 0;
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    }
    
    const aStr = String(aVal).toLowerCase().trim();
    const bStr = String(bVal).toLowerCase().trim();
    
    if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
    if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = sortedClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedClients(filteredClients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (id: string) => {
    setSelectedClients(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };
  
  const handleBulkDelete = () => {
    setShowBulkOptions(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirmModal(false);
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: selectedClients }),
      });
      if (res.ok) {
        setSelectedClients([]);
        fetchClients();
      } else {
        toast.success("Error al eliminar clientes");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red");
    }
  };

  const handleSavePermissions = async () => {
    try {
      const res = await fetch("/api/clients/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: selectedClients, userIds: selectedUsersForPermissions }),
      });
      if (res.ok) {
        setShowPermissionsModal(false);
        setSelectedClients([]);
        fetchClients();
      } else {
        toast.error("Error al actualizar permisos");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red");
    }
  };

  const handleOpenAddTagsModal = () => {
    setShowBulkOptions(false);
    if (selectedClients.length === 1) {
      const client = clients.find(c => c.id === selectedClients[0]);
      if (client?.tags) {
        setModalClientTags(client.tags.split(",").map(t => t.trim()).filter(Boolean));
      } else {
        setModalClientTags([]);
      }
    } else {
      setModalClientTags([]);
    }
    setShowAddTagsModal(true);
  };

  const handleSaveClientTags = async () => {
    try {
      const res = await fetch("/api/clients/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: selectedClients, tags: modalClientTags }),
      });
      if (res.ok) {
        setShowAddTagsModal(false);
        setSelectedClients([]);
        fetchClients();
      } else {
        toast.error("Error al actualizar etiquetas");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red");
    }
  };

  const handleDeleteTagGlobal = (tagName: string) => {
    const updated = clientAvailableTags.filter(t => t.name !== tagName);
    setClientAvailableTags(updated);
    localStorage.setItem("clifav_client_available_tags", JSON.stringify(updated));
    setModalClientTags(prev => prev.filter(t => t !== tagName));
  };

  const handleCreateCustomFilter = () => {
    const name = prompt("Introduce el nombre para tu filtro personalizado:");
    if (!name || !name.trim()) return;
    
    const filterValue = {
      gender: filterGender,
      tag: filterTag,
      userId: filterUserId,
      ageMin: filterAgeMin,
      ageMax: filterAgeMax,
      createdStart: filterCreatedStart,
      createdEnd: filterCreatedEnd,
      lastApptStart: filterLastApptStart,
      lastApptEnd: filterLastApptEnd,
      fieldName: filterFieldName,
      fieldValue: filterFieldValue
    };
    
    const updated = [...customFilters, { name: name.trim(), values: filterValue }];
    setCustomFilters(updated);
    localStorage.setItem("clifav_custom_client_filters", JSON.stringify(updated));
    setSelectedCustomFilter(name.trim());
  };

  const handleApplyCustomFilter = (name: string) => {
    setSelectedCustomFilter(name);
    if (!name) {
      setFilterGender("all");
      setFilterTag("");
      setFilterUserId("all");
      setFilterAgeMin("");
      setFilterAgeMax("");
      setFilterCreatedStart("");
      setFilterCreatedEnd("");
      setFilterLastApptStart("");
      setFilterLastApptEnd("");
      setFilterFieldName("firstName");
      setFilterFieldValue("");
      return;
    }
    const matched = customFilters.find(f => f.name === name);
    if (matched) {
      const v = matched.values;
      setFilterGender(v.gender || "all");
      setFilterTag(v.tag || "");
      setFilterUserId(v.userId || "all");
      setFilterAgeMin(v.ageMin || "");
      setFilterAgeMax(v.ageMax || "");
      setFilterCreatedStart(v.createdStart || "");
      setFilterCreatedEnd(v.createdEnd || "");
      setFilterLastApptStart(v.lastApptStart || "");
      setFilterLastApptEnd(v.lastApptEnd || "");
      setFilterFieldName(v.fieldName || "firstName");
      setFilterFieldValue(v.fieldValue || "");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;
    
    // Header row based on visible columns
    const visibleCols = columns.filter((col) => col.visible);
    const headers = visibleCols.map((col) => col.label).join(",");
    
    const rows = filteredClients.map((client) => {
      return visibleCols.map((col) => {
        let val = "";
        if (col.key === "birthDate" && client.birthDate) {
          val = new Date(client.birthDate).toLocaleDateString("es-ES");
        } else if (col.key === "createdAt" && client.createdAt) {
          val = new Date(client.createdAt).toLocaleDateString("es-ES");
        } else {
          val = String(client[col.key as keyof Client] || "");
        }
        // Escape commas and quotes
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Clientes_${activeClinic?.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit client creation
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic || !formFirstName || !formLastName) return;

    const payload = {
      firstName: formFirstName,
      lastName: formLastName,
      phone: formPhone,
      email: formEmail,
      dniNif: formDniNif,
      birthDate: formBirthDate || null,
      gender: formGender,
      address: formAddress,
      municipality: formMunicipality,
      postalCode: formPostalCode,
      country: formCountry,
      iban: formIban,
      bic: formBic,
      tags: formTags,
      clinicId: activeClinic.id,
      isSelfEmployed: formIsSelfEmployed,
      isCompany: formIsCompany,
      receivesReminders: formReceivesReminders,
      
      // Medical notes
      aestheticTreatments: formAestheticTreatments,
      allergies: formAllergies,
      medication: formMedication,
      medicalHistory: formMedicalHistory,
      otherNotes: formOtherNotes,
      
      // Tutor details
      tutorName: formTutorName,
      tutorLastName: formTutorLastName,
      tutorDniNif: formTutorDniNif,
      tutorPhone: formTutorPhone,
      tutorEmail: formTutorEmail,
      tutorAddress: formTutorAddress,
      tutorPostalCode: formTutorPostalCode,
      tutorMunicipality: formTutorMunicipality,
    };

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowCreateModal(false);
      setCreationTab("general");
      // Reset fields
      setFormFirstName("");
      setFormLastName("");
      setFormPhone("");
      setFormEmail("");
      setFormDniNif("");
      setFormBirthDate("");
      setFormAddress("");
      setFormMunicipality("");
      setFormPostalCode("");
      setFormCountry(cConfig.name);
      setFormIban("");
      setFormBic("");
      setFormTags("");
      setFormGender("Femenino");
      setFormIsSelfEmployed(false);
      setFormIsCompany(false);
      setFormReceivesReminders(true);
      setFormAestheticTreatments("");
      setFormAllergies("");
      setFormMedication("");
      setFormMedicalHistory("");
      setFormOtherNotes("");
      setFormTutorName("");
      setFormTutorLastName("");
      setFormTutorDniNif("");
      setFormTutorPhone("");
      setFormTutorEmail("");
      setFormTutorAddress("");
      setFormTutorPostalCode("");
      setFormTutorMunicipality("");
      fetchClients();
    } else {
      const errData = await res.json().catch(() => null);
      toast.error(errData?.error || "Error al crear cliente");
    }
  };

  // --- PREMIUM HELPERS ---
  const getRelativeDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    const isPast = diffMs > 0;
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return isPast ? "Ayer" : "Mañana";
    if (diffDays < 7) return isPast ? `Hace ${diffDays} días` : `En ${diffDays} días`;
    if (diffDays < 30) return isPast ? `Hace ${Math.floor(diffDays / 7)} sem.` : `En ${Math.floor(diffDays / 7)} sem.`;
    if (diffDays < 365) return isPast ? `Hace ${Math.floor(diffDays / 30)} mes.` : `En ${Math.floor(diffDays / 30)} mes.`;
    return isPast ? `Hace ${Math.floor(diffDays / 365)} año` : `En ${Math.floor(diffDays / 365)} año`;
  };

  const AVATAR_PALETTES = [
    { bg: "#e0f2fe", color: "#0369a1" },
    { bg: "#d1fae5", color: "#065f46" },
    { bg: "#fce7f3", color: "#9d174d" },
    { bg: "#ede9fe", color: "#5b21b6" },
    { bg: "#fef3c7", color: "#92400e" },
    { bg: "#ffedd5", color: "#9a3412" },
    { bg: "#e0f7f6", color: "#0e7490" },
  ];

  const getAvatarPalette = (name: string) => {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
  };

  // Quick filter state (pills)
  const [quickFilter, setQuickFilter] = useState<"all" | "no_next" | "new">("all");

  const getRenderedValue = (client: Client, key: string) => {
    if (key === "birthDate" && client.birthDate) {
      return new Date(client.birthDate).toLocaleDateString("es-ES");
    }
    if (key === "createdAt" && client.createdAt) {
      return new Date(client.createdAt).toLocaleDateString("es-ES");
    }
    if (key === "lastAppointment") {
      const appointments = (client as any).appointments;
      if (appointments && appointments.length > 0) {
        return getRelativeDate(appointments[0].start);
      }
      return "-";
    }
    return String(client[key as keyof Client] || "-");
  };

  if (!currentUser || (currentUser.role !== "ADMIN" && !hasPermission(currentUser, "clientes", "Ver clientes"))) {
    return <div style={{ padding: "32px", color: "var(--text-secondary)" }}>Acceso Denegado. No tienes permisos para ver contactos.</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header Panel */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.title}>{translate("contactsTitle", language)}</h1>
          <span className={styles.clinicSubtitle}>{activeClinic?.name}</span>
        </div>

        <div className={styles.toolbarActions}>
          {/* Column Customize Button */}
          <div className={styles.dropdownWrapper} ref={columnDropdownRef}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setShowColumnDropdown(!showColumnDropdown);
                setShowFilterDropdown(false);
              }}
            >
              <Icons.Settings size={18} />
              <span>{t("columns")}</span>
            </button>
            
            {showColumnDropdown && (
              <div className={`${styles.dropdownMenu} glass`}>
                <div className={styles.dropdownHeader}>{t("visibleColumns")}</div>
                <div className={styles.dropdownList}>
                  {columns.map((col) => (
                    <label key={col.key} className={styles.dropdownItemLabel}>
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => handleToggleColumn(col.key)}
                      />
                      <span className={styles.dropdownCheckbox}></span>
                      <span className={styles.dropdownItemText}>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Modal Trigger */}
          <div className={styles.dropdownWrapper} ref={filterDropdownRef}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowColumnDropdown(false);
              }}
            >
              <Icons.Filter size={18} />
              <span>{t("filters")}</span>
            </button>

            {showFilterDropdown && (
              <div 
                className={`${styles.filterDropdownMenu} glass`} 
                style={{ 
                  width: "280px", 
                  padding: "12px", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "8px",
                  borderRadius: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                }}
              >
                {filterActiveTab === "menu" ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {/* Etiquetas */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("tags")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                          </svg>
                          <span>Etiquetas</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>

                      {/* Género */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("gender")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          <span>Género</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>

                      {/* Edad */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("age")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                          </svg>
                          <span>Edad</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>

                      {/* Fecha de creación */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("createdAt")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span>Fecha de creación</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>

                      {/* Fecha de última cita */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("lastAppointment")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span>Fecha de última cita</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>

                      {/* Campo */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("field")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          <span>Campo</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>

                      {/* Permisos */}
                      <button 
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 8px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: "500",
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setFilterActiveTab("permissions")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          <span>Permisos</span>
                        </div>
                        <Icons.ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                      </button>
                    </div>

                    <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "4px 0" }}></div>

                    {/* Personalizados Section */}
                    <div>
                      <h4 style={{ margin: "4px 8px 8px 8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
                        Personalizados
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "0 8px" }}>
                        <select 
                          className="input select"
                          style={{ width: "100%", padding: "6px 10px", fontSize: "13px" }}
                          value={selectedCustomFilter}
                          onChange={(e) => handleApplyCustomFilter(e.target.value)}
                        >
                          <option value="">Seleccionar</option>
                          {customFilters.map(f => (
                            <option key={f.name} value={f.name}>{f.name}</option>
                          ))}
                        </select>
                        
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ 
                              flex: 1, 
                              padding: "6px", 
                              fontSize: "12px", 
                              background: "#fff", 
                              border: "1px solid var(--border-color)", 
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "600"
                            }}
                            onClick={handleCreateCustomFilter}
                          >
                            Crear filtro
                          </button>
                          {selectedCustomFilter && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ 
                                padding: "6px 10px", 
                                fontSize: "12px", 
                                background: "#fff", 
                                border: "1px solid var(--danger)", 
                                color: "var(--danger)",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600"
                              }}
                              onClick={() => {
                                const updated = customFilters.filter(f => f.name !== selectedCustomFilter);
                                setCustomFilters(updated);
                                localStorage.setItem("clifav_custom_client_filters", JSON.stringify(updated));
                                handleApplyCustomFilter("");
                              }}
                              title="Eliminar filtro guardado"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Subview Filter Panel */}
                    <button 
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--primary)",
                        fontWeight: "600",
                        fontSize: "14px",
                        padding: "4px 8px 8px 4px",
                        textAlign: "left"
                      }}
                      onClick={() => setFilterActiveTab("menu")}
                    >
                      <Icons.ChevronLeft size={16} />
                      <span>Volver</span>
                    </button>

                    <div style={{ padding: "0 8px 8px 8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Subview: ETIQUETAS */}
                      {filterActiveTab === "tags" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Etiquetas</label>
                          <input 
                            type="text" 
                            className="input" 
                            style={{ width: "100%", padding: "6px 10px", fontSize: "13px" }}
                            placeholder="Buscar por etiqueta..."
                            value={filterTag}
                            onChange={(e) => setFilterTag(e.target.value)}
                            autoFocus
                          />
                          {filterTag && (
                            <button 
                              type="button" 
                              style={{ border: "none", background: "none", color: "var(--danger)", fontSize: "11px", cursor: "pointer", marginTop: "4px", padding: 0 }}
                              onClick={() => setFilterTag("")}
                            >
                              Limpiar filtro
                            </button>
                          )}
                        </div>
                      )}

                      {/* Subview: GÉNERO */}
                      {filterActiveTab === "gender" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Género</label>
                          <select 
                            className="input select" 
                            style={{ width: "100%", padding: "6px 10px", fontSize: "13px" }}
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                          >
                            <option value="all">Todos</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      )}

                      {/* Subview: EDAD */}
                      {filterActiveTab === "age" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Rango de Edad</label>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input 
                              type="number" 
                              className="input" 
                              placeholder="Mín" 
                              style={{ width: "70px", padding: "6px", fontSize: "13px" }}
                              value={filterAgeMin}
                              onChange={(e) => setFilterAgeMin(e.target.value)}
                            />
                            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>a</span>
                            <input 
                              type="number" 
                              className="input" 
                              placeholder="Máx" 
                              style={{ width: "70px", padding: "6px", fontSize: "13px" }}
                              value={filterAgeMax}
                              onChange={(e) => setFilterAgeMax(e.target.value)}
                            />
                          </div>
                          {(filterAgeMin || filterAgeMax) && (
                            <button 
                              type="button" 
                              style={{ border: "none", background: "none", color: "var(--danger)", fontSize: "11px", cursor: "pointer", marginTop: "4px", padding: 0 }}
                              onClick={() => { setFilterAgeMin(""); setFilterAgeMax(""); }}
                            >
                              Limpiar filtro
                            </button>
                          )}
                        </div>
                      )}

                      {/* Subview: FECHA CREACIÓN */}
                      {filterActiveTab === "createdAt" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Fecha de creación</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <input 
                              type="date" 
                              className="input" 
                              style={{ padding: "6px", fontSize: "13px", width: "100%" }}
                              value={filterCreatedStart}
                              onChange={(e) => setFilterCreatedStart(e.target.value)}
                            />
                            <span style={{ fontSize: "11px", alignSelf: "center", color: "var(--text-muted)" }}>hasta</span>
                            <input 
                              type="date" 
                              className="input" 
                              style={{ padding: "6px", fontSize: "13px", width: "100%" }}
                              value={filterCreatedEnd}
                              onChange={(e) => setFilterCreatedEnd(e.target.value)}
                            />
                          </div>
                          {(filterCreatedStart || filterCreatedEnd) && (
                            <button 
                              type="button" 
                              style={{ border: "none", background: "none", color: "var(--danger)", fontSize: "11px", cursor: "pointer", marginTop: "4px", padding: 0 }}
                              onClick={() => { setFilterCreatedStart(""); setFilterCreatedEnd(""); }}
                            >
                              Limpiar filtro
                            </button>
                          )}
                        </div>
                      )}

                      {/* Subview: FECHA ÚLTIMA CITA */}
                      {filterActiveTab === "lastAppointment" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Última cita</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <input 
                              type="date" 
                              className="input" 
                              style={{ padding: "6px", fontSize: "13px", width: "100%" }}
                              value={filterLastApptStart}
                              onChange={(e) => setFilterLastApptStart(e.target.value)}
                            />
                            <span style={{ fontSize: "11px", alignSelf: "center", color: "var(--text-muted)" }}>hasta</span>
                            <input 
                              type="date" 
                              className="input" 
                              style={{ padding: "6px", fontSize: "13px", width: "100%" }}
                              value={filterLastApptEnd}
                              onChange={(e) => setFilterLastApptEnd(e.target.value)}
                            />
                          </div>
                          {(filterLastApptStart || filterLastApptEnd) && (
                            <button 
                              type="button" 
                              style={{ border: "none", background: "none", color: "var(--danger)", fontSize: "11px", cursor: "pointer", marginTop: "4px", padding: 0 }}
                              onClick={() => { setFilterLastApptStart(""); setFilterLastApptEnd(""); }}
                            >
                              Limpiar filtro
                            </button>
                          )}
                        </div>
                      )}

                      {/* Subview: CAMPO */}
                      {filterActiveTab === "field" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Buscar en Campo</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <select 
                              className="input select"
                              style={{ padding: "6px", fontSize: "13px" }}
                              value={filterFieldName}
                              onChange={(e) => setFilterFieldName(e.target.value)}
                            >
                              <option value="phone">Teléfono</option>
                              <option value="email">Email</option>
                              <option value="dniNif">DNI/NIF</option>
                              <option value="address">Dirección</option>
                              <option value="occupation">Ocupación</option>
                            </select>
                            <input 
                              type="text" 
                              className="input" 
                              placeholder="Valor a buscar..." 
                              style={{ padding: "6px", fontSize: "13px" }}
                              value={filterFieldValue}
                              onChange={(e) => setFilterFieldValue(e.target.value)}
                            />
                          </div>
                          {filterFieldValue && (
                            <button 
                              type="button" 
                              style={{ border: "none", background: "none", color: "var(--danger)", fontSize: "11px", cursor: "pointer", marginTop: "4px", padding: 0 }}
                              onClick={() => setFilterFieldValue("")}
                            >
                              Limpiar filtro
                            </button>
                          )}
                        </div>
                      )}

                      {/* Subview: PERMISOS */}
                      {filterActiveTab === "permissions" && (
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Acceso de Profesionales</label>
                          <select 
                            className="input select" 
                            style={{ width: "100%", padding: "6px 10px", fontSize: "13px" }}
                            value={filterUserId}
                            onChange={(e) => setFilterUserId(e.target.value)}
                          >
                            <option value="all">Todos los empleados</option>
                            {clinicUsers.map((u) => (
                              <option key={u.id} value={u.id}>{u.name} {u.lastName || ""}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button 
                        type="button"
                        className="btn btn-primary"
                        style={{ width: "100%", padding: "6px", marginTop: "8px", fontSize: "12px" }}
                        onClick={() => setShowFilterDropdown(false)}
                      >
                        Aplicar Filtros
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Export to Excel */}
          {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Permitir descargar clientes")) && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Icons.Download size={18} />
              <span>{t("exportCSV")}</span>
            </button>
          )}

          {/* Bulk Options Dropdown */}
          {selectedClients.length > 0 && (
            <div className={styles.dropdownWrapper} ref={bulkOptionsRef}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowBulkOptions(!showBulkOptions)}
                style={{ borderColor: "var(--primary)", color: "var(--primary)", position: "relative" }}
              >
                <span>{t("moreOptions")}</span>
                <Icons.ChevronDown size={16} />
              </button>
              
              {showBulkOptions && (
                <div className={`${styles.dropdownMenu} glass`}>
                  <div className={styles.dropdownList}>
                    <button className={styles.dropdownItemBtn} onClick={handleOpenAddTagsModal}>
                      {t("addTags")}
                    </button>
                    <button className={styles.dropdownItemBtn} onClick={() => {
                      setShowBulkOptions(false);
                      if (selectedClients.length === 1) {
                        const cl = clients.find(c => c.id === selectedClients[0]);
                        if (cl?.allowedUsers) {
                          setSelectedUsersForPermissions(cl.allowedUsers.map(u => u.id));
                        } else {
                          setSelectedUsersForPermissions([]);
                        }
                      } else {
                        setSelectedUsersForPermissions([]);
                      }
                      setShowPermissionsModal(true);
                    }}>
                      {t("modifyPermissions")}
                    </button>
                    <button className={styles.dropdownItemBtn} style={{ color: "var(--danger)" }} onClick={() => {
                      setShowBulkOptions(false);
                      handleBulkDelete();
                    }}>
                      {t("deleteClients")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create contact button */}
          {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Editar clientes")) && (
            <button className="btn btn-primary" onClick={() => {
              setCreationTab("general");
              setShowCreateModal(true);
            }}>
              <Icons.Plus size={18} />
              <span>{t("createContact")}</span>
            </button>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <Icons.Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Filter Pills - DoctorCliq inspired */}
      <div className={styles.quickFilterBar}>
        {([
          { key: "all", label: "Todos", icon: "👥" },
          { key: "new", label: "Nuevos (7 días)", icon: "✨" },
          { key: "no_next", label: "Sin próxima cita", icon: "📅" },
        ] as const).map(pill => (
          <button
            key={pill.key}
            type="button"
            className={`${styles.quickFilterPill} ${quickFilter === pill.key ? styles.quickFilterPillActive : ""}`}
            onClick={() => setQuickFilter(pill.key)}
          >
            <span>{pill.icon}</span>
            <span>{pill.label}</span>
            {pill.key === "all" && <span className={styles.quickFilterCount}>{filteredClients.length}</span>}
          </button>
        ))}
      </div>

      {/* Contact Table Grid */}
      <div className={`${styles.tableWrapper} glass`}>
        {loading ? (
          <div className={styles.skeletonTableContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonTableRow}>
                <div className="shimmer" style={{ width: "32px", height: "20px", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "150px", height: "20px", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "200px", height: "20px", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "100px", height: "20px", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "120px", height: "20px", borderRadius: "4px" }}></div>
                <div className="shimmer" style={{ width: "80px", height: "20px", borderRadius: "4px" }}></div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className={styles.emptyState}>{t("noContactsFound")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input 
                    type="checkbox" 
                    className={styles.rowCheckbox}
                    checked={filteredClients.length > 0 && selectedClients.length === filteredClients.length}
                    onChange={handleSelectAll}
                  />
                </th>
                {columns.filter((c) => c.visible).map((c) => {
                  const sortableKeys = ["clientNumber", "firstName", "lastName", "createdAt", "lastAppointment"];
                  const isSortable = sortableKeys.includes(c.key);
                  return (
                    <th 
                      key={c.key}
                      onClick={isSortable ? () => handleSort(c.key) : undefined}
                      style={{ cursor: isSortable ? "pointer" : "default", userSelect: "none" }}
                    >
                      <div className={styles.headerCellContent}>
                        <span>{c.label}</span>
                        {isSortable && (
                          <span className={styles.sortIconContainer}>
                            {sortField === c.key ? (
                              sortDirection === "asc" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                              )
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="m15 4-3-3-3 3M9 20l3 3 3-3M12 2v20"/></svg>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th>{t("action")}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients
                .filter(client => {
                  if (quickFilter === "new") {
                    const created = new Date(client.createdAt);
                    return (Date.now() - created.getTime()) < 7 * 24 * 60 * 60 * 1000;
                  }
                  if (quickFilter === "no_next") {
                    const appts: any[] = (client as any).appointments || [];
                    const futureAppts = appts.filter((a: any) => new Date(a.start) > new Date());
                    return futureAppts.length === 0;
                  }
                  return true;
                })
                .map((client) => {
                  const initials = `${client.firstName?.[0] || ""}${client.lastName?.[0] || ""}`.toUpperCase();
                  const palette = getAvatarPalette(client.firstName + client.lastName);
                  const appts: any[] = (client as any).appointments || [];
                  const pastAppts = appts.filter((a: any) => new Date(a.start) <= new Date()).sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());
                  const futureAppts = appts.filter((a: any) => new Date(a.start) > new Date()).sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
                  const lastAppt = pastAppts[0];
                  const nextAppt = futureAppts[0];
                  const whatsappNumber = (client.phone || "").replace(/\D/g, "");
                  return (
                    <tr key={client.id} className={selectedClients.includes(client.id) ? styles.selectedRow : ""}>
                      <td style={{ textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          className={styles.rowCheckbox}
                          checked={selectedClients.includes(client.id)}
                          onChange={() => handleSelectClient(client.id)}
                        />
                      </td>
                      {columns.filter((c) => c.visible).map((c) => (
                        <td key={c.key}>
                          {c.key === "firstName" ? (
                            <div className={styles.clientAvatarCell}>
                              <div className={styles.clientAvatar} style={{ background: palette.bg, color: palette.color }}>
                                {initials || "?"}
                              </div>
                              <div className={styles.clientAvatarInfo}>
                                <Link href={`/dashboard/contacts/${client.id}`} className={styles.clientNameLink}>
                                  {client.firstName} {client.lastName}
                                </Link>
                                {client.phone && (
                                  <a
                                    href={`https://wa.me/${whatsappNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.whatsappQuickBtn}
                                    onClick={e => e.stopPropagation()}
                                    title="Abrir WhatsApp"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : c.key === "lastName" ? null
                          : c.key === "tags" && client.tags ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {client.tags.split(",").map((tag) => {
                                const trimmed = tag.trim();
                                const matchedTag = clientAvailableTags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
                                const color = matchedTag?.color || "#a0aec0";
                                return (
                                  <span 
                                    key={tag} 
                                    style={{ 
                                      backgroundColor: color + "22", 
                                      color: color, 
                                      border: `1px solid ${color}44`,
                                      padding: "2px 8px", 
                                      borderRadius: "12px", 
                                      fontSize: "11px", 
                                      fontWeight: "700" 
                                    }}
                                  >
                                    {trimmed}
                                  </span>
                                );
                              })}
                            </div>
                          ) : c.key === "lastAppointment" ? (
                            <div className={styles.appointmentCell}>
                              <span className={lastAppt ? styles.dateRelative : styles.dateMissing}>
                                {lastAppt ? getRelativeDate(lastAppt.start) : (nextAppt && getRelativeDate(nextAppt.start) === "Hoy" ? "" : "—")}
                              </span>
                              {nextAppt && (
                                <span className={styles.nextApptBadge}>
                                  📅 {getRelativeDate(nextAppt.start)}
                                </span>
                              )}
                            </div>
                          ) : (
                            getRenderedValue(client, c.key)
                          )}
                        </td>
                      ))}
                      <td>
                        <Link href={`/dashboard/contacts/${client.id}`} className={styles.actionLink}>
                          <Icons.Eye size={16} />
                          <span>{t("profile")}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!loading && filteredClients.length > 0 && (
          <div className={styles.paginationContainer}>
            <div className={styles.paginationLeft}>
              <span className={styles.paginationLabel}>{t("show")}</span>
              <select 
                className={styles.paginationSelect}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className={styles.paginationRight}>
              <button 
                className={styles.pageBtnText}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <Icons.ChevronLeft size={14} /> {t("previous")}
              </button>
              
              <button className={`${styles.pageNum} ${styles.pageNumActive}`}>
                {currentPage}
              </button>
              {currentPage < totalPages && (
                <button className={styles.pageNum} onClick={() => setCurrentPage(currentPage + 1)}>
                  {currentPage + 1}
                </button>
              )}
              {currentPage < totalPages - 1 && <span className={styles.pageDots}>...</span>}
              {currentPage < totalPages - 1 && (
                <button className={styles.pageNum} onClick={() => setCurrentPage(totalPages)}>
                  {totalPages}
                </button>
              )}
              
              <button 
                className={styles.pageBtnText}
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Siguiente <Icons.ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirmModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirmModal(false)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteConfirmAccent} />
            <div className={styles.deleteConfirmBody}>
              <div className={styles.deleteConfirmHeader}>
                <div className={styles.deleteConfirmIconWrap}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h3 className={styles.deleteConfirmTitle}>{t("deleteClientsConfirm")}</h3>
                <button className={styles.deleteConfirmClose} onClick={() => setShowDeleteConfirmModal(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <p className={styles.deleteConfirmText}>
                {selectedClients.length === 1
                  ? "El cliente seleccionado será eliminado de forma permanente."
                  : `Los ${selectedClients.length} clientes seleccionados serán eliminados de forma permanente.`}
              </p>
              <div className={styles.deleteConfirmActions}>
                <button className={styles.deleteConfirmCancelBtn} onClick={() => setShowDeleteConfirmModal(false)}>
                  Cancelar
                </button>
                <button className={styles.deleteConfirmDeleteBtn} onClick={confirmBulkDelete}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSIONS MODAL */}
      {showPermissionsModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.permissionsModalContent} glass fade-in`}>
            <div className={styles.modalHeader} style={{ borderBottom: "none", paddingBottom: 0 }}>
              <h2 style={{ color: "var(--primary)" }}>{t("permissions")}</h2>
            </div>
            <div className={styles.permissionsBody}>
              <p className={styles.permissionsText}>
                {t("selectEmployeesWithAccess")}
              </p>
              
              <div className={styles.permissionsList}>
                <label className={styles.permissionsItemLabel}>
                  <input 
                    type="checkbox"
                    className={styles.permissionsCheckbox}
                    checked={clinicUsers.length > 0 && selectedUsersForPermissions.length === clinicUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUsersForPermissions(clinicUsers.map(u => u.id));
                      else setSelectedUsersForPermissions([]);
                    }}
                  />
                  <span className={styles.permissionsCheckboxCustom}>
                    {clinicUsers.length > 0 && selectedUsersForPermissions.length === clinicUsers.length ? (
                      <Icons.Check size={14} color="#fff" />
                    ) : selectedUsersForPermissions.length > 0 ? (
                      <div style={{ width: "10px", height: "2px", backgroundColor: "#fff" }}></div>
                    ) : null}
                  </span>
                  <span className={styles.permissionsItemText}>{t("selectAll")}</span>
                </label>
                
                {clinicUsers.map(user => (
                  <label key={user.id} className={styles.permissionsItemLabel} style={{ marginLeft: "20px" }}>
                    <input 
                      type="checkbox"
                      className={styles.permissionsCheckbox}
                      checked={selectedUsersForPermissions.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUsersForPermissions(prev => [...prev, user.id]);
                        else setSelectedUsersForPermissions(prev => prev.filter(id => id !== user.id));
                      }}
                    />
                    <span className={styles.permissionsCheckboxCustom}>
                      {selectedUsersForPermissions.includes(user.id) && <Icons.Check size={14} color="#fff" />}
                    </span>
                    <span className={styles.permissionsItemText}>{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className={styles.modalActions} style={{ paddingTop: "20px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPermissionsModal(false)}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSavePermissions}>
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TAGS BULK MODAL */}
      {showAddTagsModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px", overflow: "visible" }}>
            <div className={styles.modalHeader} style={{ borderBottom: "none", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "var(--primary)", fontSize: "18px", margin: 0 }}>
                Añadir Etiquetas ({selectedClients.length} cliente{selectedClients.length > 1 ? "s" : ""})
              </h2>
              <button 
                type="button" 
                onClick={() => setShowAddTagsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 0 }}
              >
                <Icons.Close size={20} />
              </button>
            </div>
            
            <div style={{ padding: "8px 0 20px 0" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px", marginTop: 0 }}>
                Selecciona o crea etiquetas para asignar a los clientes seleccionados.
              </p>
              
              {/* Tags row */}
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  flexWrap: "wrap", 
                  minHeight: "40px", 
                  padding: "8px", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "8px",
                  position: "relative"
                }} 
                ref={createTagsDropdownRef}
              >
                {modalClientTags.map((tag, idx) => {
                  const color = clientAvailableTags.find(t => t.name === tag)?.color || "#4299e1";
                  return (
                    <span 
                      key={idx} 
                      style={{ 
                        backgroundColor: color, 
                        color: "#fff", 
                        padding: "4px 10px", 
                        borderRadius: "16px", 
                        fontSize: "12px", 
                        fontWeight: "600",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        style={{ 
                          background: "rgba(255,255,255,0.25)", 
                          border: "none", 
                          borderRadius: "50%", 
                          width: "14px", 
                          height: "14px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          color: "#fff", 
                          cursor: "pointer",
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: 0
                        }}
                        onClick={() => setModalClientTags(prev => prev.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                
                <button
                  type="button"
                  style={{ 
                    width: "28px", 
                    height: "28px", 
                    borderRadius: "50%", 
                    border: "1px dashed var(--border-color)", 
                    background: "transparent", 
                    color: "var(--text-secondary)", 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "16px",
                    fontWeight: "500",
                    transition: "all 0.2s"
                  }}
                  onClick={() => {
                    setShowCreateTagsDropdown(!showCreateTagsDropdown);
                    setCreateTagsSubView("list");
                    setSearchCreateTagQuery("");
                  }}
                  title="Agregar etiqueta"
                >
                  +
                </button>

                {showCreateTagsDropdown && (
                  <div 
                    style={{ 
                      position: "absolute", 
                      top: "100%", 
                      left: "8px", 
                      marginTop: "6px",
                      background: "#ffffff", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "8px", 
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      zIndex: 1000, 
                      width: "250px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    {createTagsSubView === "list" ? (
                      <>
                        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Etiquetas</h3>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <Icons.Search size={14} style={{ position: "absolute", left: "8px", color: "var(--text-muted)", pointerEvents: "none" }} />
                          <input 
                            type="text"
                            style={{ 
                              width: "100%", 
                              fontSize: "12px", 
                              padding: "6px 8px 6px 28px", 
                              border: "1px solid var(--border-color)", 
                              borderRadius: "4px",
                              outline: "none"
                            }}
                            placeholder="Buscar etiqueta"
                            value={searchCreateTagQuery}
                            onChange={(e) => setSearchCreateTagQuery(e.target.value)}
                          />
                        </div>
                        <div 
                          style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "4px", 
                            maxHeight: "150px", 
                            overflowY: "auto",
                            paddingRight: "2px"
                          }}
                        >
                          {clientAvailableTags
                            .filter(tag => {
                              if (modalClientTags.includes(tag.name)) return false;
                              return tag.name.toLowerCase().includes(searchCreateTagQuery.toLowerCase());
                            })
                            .map(tag => (
                              <div
                                key={tag.name}
                                style={{ 
                                  backgroundColor: tag.color, 
                                  color: "#ffffff",
                                  padding: "6px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  width: "100%"
                                }}
                              >
                                <span 
                                  style={{ flex: 1, cursor: "pointer", display: "block" }} 
                                  onClick={() => {
                                    setModalClientTags(prev => [...prev, tag.name]);
                                    setShowCreateTagsDropdown(false);
                                  }}
                                >
                                  {tag.name}
                                </span>
                                <span 
                                  title="Eliminar etiqueta"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTagGlobal(tag.name);
                                  }}
                                  style={{ 
                                    cursor: "pointer", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    marginLeft: "8px",
                                    color: "rgba(255, 255, 255, 0.8)",
                                    background: "rgba(255, 255, 255, 0.15)",
                                    borderRadius: "4px",
                                    padding: "2px"
                                  }}
                                >
                                  <Icons.Close size={12} />
                                </span>
                              </div>
                            ))}
                          {clientAvailableTags.filter(tag => {
                            if (modalClientTags.includes(tag.name)) return false;
                            return tag.name.toLowerCase().includes(searchCreateTagQuery.toLowerCase());
                          }).length === 0 && (
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", padding: "8px" }}>Sin etiquetas disponibles</div>
                          )}
                        </div>
                        <button
                          type="button"
                          style={{ 
                            alignSelf: "flex-end",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "var(--text-secondary)",
                            background: "#ffffff",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onClick={() => {
                            setCreateTagsSubView("create");
                            setNewCreateTagName("");
                            setNewCreateTagColor("#f56565");
                          }}
                        >
                          Nueva etiqueta
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Nueva etiqueta</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Nombre</label>
                            <input 
                              type="text"
                              style={{ 
                                width: "100%", 
                                fontSize: "12px", 
                                padding: "6px 10px", 
                                border: "1px solid var(--border-color)", 
                                borderRadius: "4px",
                                outline: "none"
                              }}
                              placeholder="Nombre de la etiqueta"
                              value={newCreateTagName}
                              onChange={(e) => setNewCreateTagName(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Asignar Color</label>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                              {TAG_COLORS.map(color => (
                                <div
                                  key={color}
                                  style={{ 
                                    backgroundColor: color, 
                                    width: "22px", 
                                    height: "22px", 
                                    borderRadius: "50%", 
                                    cursor: "pointer",
                                    border: newCreateTagColor === color ? "2px solid #2d3748" : "none",
                                    boxShadow: newCreateTagColor === color ? "0 0 0 1px #fff" : "none"
                                  }}
                                  onClick={() => setNewCreateTagColor(color)}
                                />
                              ))}
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "8px" }}>
                            <button 
                              type="button"
                              style={{ 
                                padding: "4px 8px", 
                                fontSize: "11px", 
                                border: "1px solid var(--border-color)", 
                                background: "#fff", 
                                borderRadius: "4px", 
                                cursor: "pointer", 
                                color: "var(--text-secondary)" 
                              }}
                              onClick={() => setCreateTagsSubView("list")}
                            >
                              Cancelar
                            </button>
                            <button 
                              type="button"
                              style={{ 
                                padding: "4px 8px", 
                                fontSize: "11px", 
                                border: "none", 
                                background: "var(--primary)", 
                                borderRadius: "4px", 
                                cursor: "pointer", 
                                color: "#fff" 
                              }}
                              disabled={!newCreateTagName.trim()}
                              onClick={() => {
                                const name = newCreateTagName.trim().toUpperCase();
                                if (clientAvailableTags.some(t => t.name === name)) {
                                  toast.success("Esta etiqueta ya existe.");
                                  return;
                                }
                                const updated = [...clientAvailableTags, { name, color: newCreateTagColor }];
                                setClientAvailableTags(updated);
                                localStorage.setItem("clifav_client_available_tags", JSON.stringify(updated));
                                setModalClientTags(prev => [...prev, name]);
                                setShowCreateTagsDropdown(false);
                              }}
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
            </div>

            <div className={styles.modalActions} style={{ borderTop: "none", paddingTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddTagsModal(false)}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveClientTags}>
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CLIENT DRAWER — portal so it covers full viewport */}
      {showCreateModal && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>{t("createClient")}</h2>
              <button className={styles.drawerCloseBtn} onClick={() => setShowCreateModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.drawerTabs}>
              <button
                type="button"
                className={`${styles.drawerTab} ${creationTab === "general" ? styles.drawerTabActive : ""}`}
                onClick={() => setCreationTab("general")}
              >
                {t("generalInfo")}
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${creationTab === "otros" ? styles.drawerTabActive : ""}`}
                onClick={() => setCreationTab("otros")}
              >
                {t("otherData")}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateClient} className={styles.drawerForm}>
              <div className={styles.drawerScrollBody}>

                {/* ── TAB: Información general ── */}
                {creationTab === "general" && (
                  <>
                    <p className={styles.drawerSectionTitle}>{t("generalData")}</p>

                    {/* Nombre / Apellidos */}
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>{t("name")}</label>
                        <input type="text" className={styles.drawerInput} placeholder={t("addNamePlaceholder")}
                          value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} required />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>{t("lastName")}</label>
                        <input type="text" className={styles.drawerInput} placeholder={t("addLastNamePlaceholder")}
                          value={formLastName} onChange={(e) => setFormLastName(e.target.value)} required />
                      </div>
                    </div>

                    {/* Fecha nacimiento / DNI */}
                    <div className={styles.drawerGrid2}>
                      {/* Birth date with calendar popup */}
                      <div className={styles.drawerField} style={{ position: "relative" }}>
                        <label className={styles.drawerLabel}>{t("colBirthDate")}</label>
                        <button
                          type="button"
                          className={styles.drawerInputBtn}
                          onClick={() => {
                            setShowBirthCalendar((v) => !v);
                            setShowPhoneDropdown(false);
                            setShowCountryDropdown(false);
                            setShowDniDropdown(false);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span style={{ color: formBirthDate ? "var(--text-primary)" : "var(--text-muted)" }}>
                            {formBirthDate || "dd/mm/aaaa"}
                          </span>
                        </button>

                        {showBirthCalendar && (
                          <div ref={birthCalRef} className={styles.birthCalendar}>
                            {/* Calendar nav */}
                            <div className={styles.birthCalHeader}>
                              <button type="button" className={styles.birthCalNav}
                                onClick={() => {
                                  if (birthCalMonth === 0) { setBirthCalMonth(11); setBirthCalYear(y => y - 1); }
                                  else setBirthCalMonth(m => m - 1);
                                }}>‹</button>
                              <div className={styles.birthCalTitle}>
                                <select className={styles.birthCalSelect} value={birthCalMonth}
                                  onChange={(e) => setBirthCalMonth(Number(e.target.value))}>
                                  {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
                                    .map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <select className={styles.birthCalSelect} value={birthCalYear}
                                  onChange={(e) => setBirthCalYear(Number(e.target.value))}>
                                  {Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i)
                                    .map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                              <button type="button" className={styles.birthCalNav}
                                onClick={() => {
                                  const maxY = new Date().getFullYear();
                                  const maxM = new Date().getMonth();
                                  if (birthCalYear < maxY || (birthCalYear === maxY && birthCalMonth < maxM)) {
                                    if (birthCalMonth === 11) { setBirthCalMonth(0); setBirthCalYear(y => y + 1); }
                                    else setBirthCalMonth(m => m + 1);
                                  }
                                }}>›</button>
                            </div>

                            {/* Day headers */}
                            <div className={styles.birthCalGrid}>
                              {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map(d => (
                                <div key={d} className={styles.birthCalDayLabel}>{d}</div>
                              ))}
                              {(() => {
                                const today = new Date();
                                const firstDay = new Date(birthCalYear, birthCalMonth, 1).getDay();
                                const offset = firstDay === 0 ? 6 : firstDay - 1;
                                const daysInMonth = new Date(birthCalYear, birthCalMonth + 1, 0).getDate();
                                const cells = [];
                                for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
                                for (let d = 1; d <= daysInMonth; d++) {
                                  const dateObj = new Date(birthCalYear, birthCalMonth, d);
                                  const isFuture = dateObj > today;
                                  const formatted = `${String(d).padStart(2,"0")}/${String(birthCalMonth+1).padStart(2,"0")}/${birthCalYear}`;
                                  const isSelected = formBirthDate === formatted;
                                  cells.push(
                                    <button key={d} type="button"
                                      disabled={isFuture}
                                      className={`${styles.birthCalDay} ${isSelected ? styles.birthCalDaySelected : ""} ${isFuture ? styles.birthCalDayDisabled : ""}`}
                                      onClick={() => { setFormBirthDate(formatted); setShowBirthCalendar(false); }}
                                    >{d}</button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* DNI/NIF */}
                      <div className={styles.drawerField} style={{ position: "relative" }}>
                        <label className={styles.drawerLabel}>{identityLabel}</label>
                        <div className={styles.drawerInputFlag}>
                          <button type="button" className={styles.flagPickerBtn}
                            onClick={() => { setShowDniDropdown(v => !v); setShowPhoneDropdown(false); setShowCountryDropdown(false); setShowBirthCalendar(false); }}>
                            <span>{dniCountry.flag}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          <input type="text" className={styles.drawerInputFlagInput} placeholder={`Añadir ${identityLabel} / Pasaporte`}
                            value={formDniNif} onChange={(e) => setFormDniNif(e.target.value)} />
                        </div>

                        {showDniDropdown && (
                          <div ref={dniDropdownRef} className={styles.countryDropdown}>
                            <div className={styles.countrySearch}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </svg>
                              <input autoFocus type="text" placeholder="Buscar país..."
                                className={styles.countrySearchInput}
                                value={dniSearch} onChange={(e) => setDniSearch(e.target.value)} />
                            </div>
                            <div className={styles.countryList}>
                              {COUNTRIES.filter(c =>
                                c.name.toLowerCase().includes(dniSearch.toLowerCase())
                              ).map(c => (
                                <button key={c.code} type="button" className={styles.countryOption}
                                  onClick={() => { setDniCountry(c); setShowDniDropdown(false); setDniSearch(""); }}>
                                  <span>{c.flag}</span>
                                  <span className={styles.countryName}>{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Teléfono / Email */}
                    <div className={styles.drawerGrid2}>
                      {/* Phone with country picker */}
                      <div className={styles.drawerField} style={{ position: "relative" }}>
                        <label className={styles.drawerLabel}>Número de teléfono</label>
                        <div className={styles.drawerInputFlag}>
                          <button type="button" className={styles.flagPickerBtn}
                            onClick={() => { setShowPhoneDropdown(v => !v); setShowCountryDropdown(false); setShowBirthCalendar(false); setShowDniDropdown(false); }}>
                            <span>{phoneCountry.flag}</span>
                            <span className={styles.flagDial}>{phoneCountry.dial}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          <input type="tel" className={styles.drawerInputFlagInput} placeholder=""
                            value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                        </div>

                        {showPhoneDropdown && (
                          <div ref={phoneDropdownRef} className={styles.countryDropdown}>
                            <div className={styles.countrySearch}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </svg>
                              <input autoFocus type="text" placeholder="Buscar país..."
                                className={styles.countrySearchInput}
                                value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} />
                            </div>
                            <div className={styles.countryList}>
                              {COUNTRIES.filter(c =>
                                c.name.toLowerCase().includes(phoneSearch.toLowerCase()) ||
                                c.dial.includes(phoneSearch)
                              ).map(c => (
                                <button key={c.code} type="button" className={styles.countryOption}
                                  onClick={() => { setPhoneCountry(c); setShowPhoneDropdown(false); setPhoneSearch(""); }}>
                                  <span>{c.flag}</span>
                                  <span className={styles.countryName}>{c.name}</span>
                                  <span className={styles.countryDial}>{c.dial}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Email</label>
                        <input type="email" className={styles.drawerInput} placeholder="Añadir email"
                          value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                      </div>
                    </div>

                    {/* País / Dirección */}
                    <div className={styles.drawerGrid2}>
                      {/* Country picker */}
                      <div className={styles.drawerField} style={{ position: "relative" }}>
                        <label className={styles.drawerLabel}>País</label>
                        <div className={styles.drawerInputFlag}>
                          <button type="button" className={styles.flagPickerBtn}
                            onClick={() => { setShowCountryDropdown(v => !v); setShowPhoneDropdown(false); setShowBirthCalendar(false); setShowDniDropdown(false); }}>
                            <span>{countryDropdownCountry.flag}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          <input type="text" className={styles.drawerInputFlagInput}
                            placeholder="Añadir País"
                            value={formCountry}
                            onChange={(e) => setFormCountry(e.target.value)} />
                        </div>

                        {showCountryDropdown && (
                          <div ref={countryDropdownRef} className={styles.countryDropdown}>
                            <div className={styles.countrySearch}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </svg>
                              <input autoFocus type="text" placeholder="Buscar país..."
                                className={styles.countrySearchInput}
                                value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} />
                            </div>
                            <div className={styles.countryList}>
                              {COUNTRIES.filter(c =>
                                c.name.toLowerCase().includes(countrySearch.toLowerCase())
                              ).map(c => (
                                <button key={c.code} type="button" className={styles.countryOption}
                                  onClick={() => {
                                    setCountryDropdownCountry(c);
                                    setFormCountry(c.name);
                                    setShowCountryDropdown(false);
                                    setCountrySearch("");
                                  }}>
                                  <span>{c.flag}</span>
                                  <span className={styles.countryName}>{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.drawerField} style={{ position: "relative" }} ref={addressAutocompleteRef}>
                        <label className={styles.drawerLabel}>Dirección</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir dirección"
                          value={formAddress} onChange={(e) => handleAddressChange(e.target.value)} />
                        
                        {showAddressDropdown && addressSuggestions.length > 0 && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            backgroundColor: "var(--bg-panel-solid, #ffffff)",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                            zIndex: 100,
                            maxHeight: "200px",
                            overflowY: "auto",
                            marginTop: "4px"
                          }}>
                            {addressSuggestions.map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleSelectAddressSuggestion(item)}
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  borderBottom: idx === addressSuggestions.length - 1 ? "none" : "1px solid var(--border-color)",
                                  color: "var(--text-primary)",
                                  textAlign: "left"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-input, #f7fafc)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                {item.displayName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ciudad / Código Postal */}
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Ciudad / Municipio</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir ciudad / municipio"
                          value={formMunicipality} onChange={(e) => setFormMunicipality(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Código Postal</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir código postal"
                          value={formPostalCode} onChange={(e) => setFormPostalCode(e.target.value)} />
                      </div>
                    </div>

                    {/* Switches */}
                    <div className={styles.drawerSwitchGroup}>
                      <label className={styles.drawerSwitchRow}>
                        <span className={`${styles.drawerToggle} ${formIsSelfEmployed ? styles.drawerToggleOn : ""}`}
                          onClick={() => setFormIsSelfEmployed(!formIsSelfEmployed)}>
                          <span className={styles.drawerToggleThumb} />
                        </span>
                        <span className={styles.drawerSwitchLabel}>Es Autónomo</span>
                      </label>
                      <label className={styles.drawerSwitchRow}>
                        <span className={`${styles.drawerToggle} ${formIsCompany ? styles.drawerToggleOn : ""}`}
                          onClick={() => setFormIsCompany(!formIsCompany)}>
                          <span className={styles.drawerToggleThumb} />
                        </span>
                        <span className={styles.drawerSwitchLabel}>Es Empresa</span>
                      </label>
                      <label className={styles.drawerSwitchRow}>
                        <span className={`${styles.drawerToggle} ${formReceivesReminders ? styles.drawerToggleOn : ""}`}
                          onClick={() => setFormReceivesReminders(!formReceivesReminders)}>
                          <span className={styles.drawerToggleThumb} />
                        </span>
                        <span className={styles.drawerSwitchLabel}>Recibirá Recordatorios</span>
                      </label>
                    </div>
                  </>
                )}

                {/* ── TAB: Otros datos ── */}
                {creationTab === "otros" && (
                  <>
                    <p className={styles.drawerSectionTitle}>Género y etiquetas</p>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Género</label>
                        <select className={styles.drawerSelect} value={formGender} onChange={(e) => setFormGender(e.target.value)}>
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Etiquetas (separadas por coma)</label>
                        <input type="text" className={styles.drawerInput} placeholder="Ej: Frecuente, Espalda"
                          value={formTags} onChange={(e) => setFormTags(e.target.value)} />
                      </div>
                    </div>

                    <p className={styles.drawerSectionTitle}>Facturación</p>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>IBAN</label>
                        <input type="text" className={styles.drawerInput} placeholder="ES21 0000..."
                          value={formIban} onChange={(e) => setFormIban(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>BIC / SWIFT</label>
                        <input type="text" className={styles.drawerInput} placeholder="BARCES..."
                          value={formBic} onChange={(e) => setFormBic(e.target.value)} />
                      </div>
                    </div>

                    <p className={styles.drawerSectionTitle}>Salud</p>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Tratamientos estéticos previos</label>
                      <textarea className={styles.drawerTextarea} placeholder="Describe tratamientos previos..."
                        value={formAestheticTreatments} onChange={(e) => setFormAestheticTreatments(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Alergias</label>
                      <textarea className={styles.drawerTextarea} placeholder="Alergias conocidas..."
                        value={formAllergies} onChange={(e) => setFormAllergies(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Medicación actual</label>
                      <textarea className={styles.drawerTextarea} placeholder="Medicamentos que toma..."
                        value={formMedication} onChange={(e) => setFormMedication(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Antecedentes médicos</label>
                      <textarea className={styles.drawerTextarea} placeholder="Antecedentes relevantes..."
                        value={formMedicalHistory} onChange={(e) => setFormMedicalHistory(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Otras notas</label>
                      <textarea className={styles.drawerTextarea} placeholder="Observaciones adicionales..."
                        value={formOtherNotes} onChange={(e) => setFormOtherNotes(e.target.value)} rows={2} />
                    </div>

                    <p className={styles.drawerSectionTitle}>Tutor / Representante</p>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Nombre tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Nombre"
                          value={formTutorName} onChange={(e) => setFormTutorName(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Apellidos tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Apellidos"
                          value={formTutorLastName} onChange={(e) => setFormTutorLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>DNI tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="DNI tutor"
                          value={formTutorDniNif} onChange={(e) => setFormTutorDniNif(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Teléfono tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Teléfono tutor"
                          value={formTutorPhone} onChange={(e) => setFormTutorPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Email tutor</label>
                      <input type="email" className={styles.drawerInput} placeholder="tutor@correo.com"
                        value={formTutorEmail} onChange={(e) => setFormTutorEmail(e.target.value)} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Dirección tutor</label>
                      <input type="text" className={styles.drawerInput} placeholder="Dirección tutor"
                        value={formTutorAddress} onChange={(e) => setFormTutorAddress(e.target.value)} />
                    </div>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Municipio tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Municipio tutor"
                          value={formTutorMunicipality} onChange={(e) => setFormTutorMunicipality(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>C.P. tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Código postal"
                          value={formTutorPostalCode} onChange={(e) => setFormTutorPostalCode(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer actions */}
              <div className={styles.drawerFooter}>
                <button type="button" className={styles.drawerCancelBtn} onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.drawerSaveBtn}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

