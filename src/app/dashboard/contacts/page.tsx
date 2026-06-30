"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./Contacts.module.css";

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

interface ColumnConfig {
  key: keyof Client | "lastAppointment";
  label: string;
  visible: boolean;
}

export default function ContactsPage() {
  const { activeClinic, user: currentUser } = useApp();
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
    { key: "clientNumber", label: "Nº Cliente", visible: true },
    { key: "firstName", label: "Nombre", visible: true },
    { key: "lastName", label: "Apellidos", visible: true },
    { key: "phone", label: "Teléfono", visible: true },
    { key: "email", label: "Email", visible: true },
    { key: "dniNif", label: "DNI/NIF", visible: true },
    { key: "birthDate", label: "Fecha Nacimiento", visible: false },
    { key: "gender", label: "Género", visible: false },
    { key: "createdAt", label: "Fecha Creación", visible: true },
    { key: "lastAppointment", label: "Última Cita", visible: true },
    { key: "tags", label: "Etiquetas", visible: true },
    { key: "address", label: "Dirección", visible: false },
    { key: "municipality", label: "Municipio", visible: false },
    { key: "postalCode", label: "Código Postal", visible: false },
    { key: "country", label: "País", visible: false },
    { key: "iban", label: "IBAN", visible: false },
    { key: "aestheticTreatments", label: "Trat. Estéticos Previos", visible: false },
    { key: "allergies", label: "Alergias", visible: false },
    { key: "medication", label: "Medicación", visible: false },
    { key: "medicalHistory", label: "Antecedentes Médicos", visible: false },
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
    fetchClients();
    if (activeClinic) {
      fetch(`/api/users?clinicId=${activeClinic.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setClinicUsers(data);
        })
        .catch(console.error);
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleColumn = (key: string) => {
    setColumns(
      columns.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  // Filter application
  const filteredClients = clients.filter((client) => {
    if (filterGender !== "all" && client.gender !== filterGender) return false;
    if (filterTag && (!client.tags || !client.tags.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    if (filterUserId !== "all") {
      const allowedIds = client.allowedUsers?.map((u) => u.id) || [];
      if (!allowedIds.includes(filterUserId)) return false;
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
        alert("Error al eliminar clientes");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
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
        alert("Error al actualizar permisos");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
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
      setFormCountry("España");
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
      alert("Error al crear cliente");
    }
  };

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
        return new Date(appointments[0].start).toLocaleDateString("es-ES");
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
          <h1 className={styles.title}>Contactos</h1>
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
              <span>Columnas</span>
            </button>
            
            {showColumnDropdown && (
              <div className={`${styles.dropdownMenu} glass`}>
                <div className={styles.dropdownHeader}>Columnas Visibles</div>
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
              <span>Filtros</span>
            </button>

            {showFilterDropdown && (
              <div className={`${styles.filterDropdownMenu} glass`}>
                <div className={styles.dropdownHeader}>Filtros Avanzados</div>
                <div className={styles.filterForm}>
                  <div className="form-group">
                    <label className="form-label">Género</label>
                    <select
                      className="input select"
                      style={{ padding: "8px 12px" }}
                      value={filterGender}
                      onChange={(e) => setFilterGender(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Profesional asignado</label>
                    <select
                      className="input select"
                      style={{ padding: "8px 12px" }}
                      value={filterUserId}
                      onChange={(e) => setFilterUserId(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      {clinicUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} {u.lastName || ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Etiqueta</label>
                    <input
                      type="text"
                      className="input"
                      style={{ padding: "8px 12px" }}
                      placeholder="Ej: Deporte"
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ width: "100%", padding: "8px" }}
                    onClick={() => setShowFilterDropdown(false)}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export to Excel */}
          {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Permitir descargar clientes")) && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Icons.Download size={18} />
              <span>Exportar CSV</span>
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
                <span>Más Opciones</span>
                <Icons.ChevronDown size={16} />
              </button>
              
              {showBulkOptions && (
                <div className={`${styles.dropdownMenu} glass`}>
                  <div className={styles.dropdownList}>
                    <button className={styles.dropdownItemBtn} onClick={() => alert("Añadir etiquetas en desarrollo...")}>
                      Añadir Etiquetas
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
                      Modificar Permisos
                    </button>
                    <button className={styles.dropdownItemBtn} style={{ color: "var(--danger)" }} onClick={() => {
                      setShowBulkOptions(false);
                      handleBulkDelete();
                    }}>
                      Eliminar Clientes
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
              <span>Crear Contacto</span>
            </button>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <Icons.Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI, Teléfono o email..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contact Table Grid */}
      <div className={`${styles.tableWrapper} glass`}>
        {loading ? (
          <div className={styles.loadingState}>Cargando pacientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className={styles.emptyState}>No se han encontrado contactos en esta clínica.</div>
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
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client) => (
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
                      {c.key === "tags" && client.tags ? (
                        <div className={styles.tagList}>
                          {client.tags.split(",").map((tag) => (
                            <span key={tag} className={styles.tagBadge}>{tag.trim()}</span>
                          ))}
                        </div>
                      ) : (c.key === "firstName" || c.key === "lastName") ? (
                        <Link href={`/dashboard/contacts/${client.id}`} className={styles.clientNameLink}>
                          {getRenderedValue(client, c.key)}
                        </Link>
                      ) : (
                        getRenderedValue(client, c.key)
                      )}
                    </td>
                  ))}
                  <td>
                    <Link href={`/dashboard/contacts/${client.id}`} className={styles.actionLink}>
                      <Icons.Eye size={16} />
                      <span>Ficha</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!loading && filteredClients.length > 0 && (
          <div className={styles.paginationContainer}>
            <div className={styles.paginationLeft}>
              <span className={styles.paginationLabel}>MOSTRAR</span>
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
                <Icons.ChevronLeft size={14} /> Anterior
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
                <h3 className={styles.deleteConfirmTitle}>¿Deseas eliminar los clientes?</h3>
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
              <h2 style={{ color: "var(--primary)" }}>Permisos</h2>
            </div>
            <div className={styles.permissionsBody}>
              <p className={styles.permissionsText}>
                Seleccione los empleados que tienen acceso a la Información de estos clientes
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
                  <span className={styles.permissionsItemText}>Seleccionar todos</span>
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
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSavePermissions}>
                Guardar
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
              <h2 className={styles.drawerTitle}>Crear cliente</h2>
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
                Información general
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${creationTab === "otros" ? styles.drawerTabActive : ""}`}
                onClick={() => setCreationTab("otros")}
              >
                Otros datos
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateClient} className={styles.drawerForm}>
              <div className={styles.drawerScrollBody}>

                {/* ── TAB: Información general ── */}
                {creationTab === "general" && (
                  <>
                    <p className={styles.drawerSectionTitle}>Datos generales</p>

                    {/* Nombre / Apellidos */}
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Nombre</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir nombre"
                          value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} required />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Apellidos</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir apellidos"
                          value={formLastName} onChange={(e) => setFormLastName(e.target.value)} required />
                      </div>
                    </div>

                    {/* Fecha nacimiento / DNI */}
                    <div className={styles.drawerGrid2}>
                      {/* Birth date with calendar popup */}
                      <div className={styles.drawerField} style={{ position: "relative" }}>
                        <label className={styles.drawerLabel}>Fecha de nacimiento</label>
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
                        <label className={styles.drawerLabel}>DNI/NIF</label>
                        <div className={styles.drawerInputFlag}>
                          <button type="button" className={styles.flagPickerBtn}
                            onClick={() => { setShowDniDropdown(v => !v); setShowPhoneDropdown(false); setShowCountryDropdown(false); setShowBirthCalendar(false); }}>
                            <span>{dniCountry.flag}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          <input type="text" className={styles.drawerInputFlagInput} placeholder="Añadir DNI / Pasaporte"
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

                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Dirección</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir dirección"
                          value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
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

