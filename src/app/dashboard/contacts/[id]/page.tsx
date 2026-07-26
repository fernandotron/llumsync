"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./ClientDetail.module.css";
import { getCountryConfig } from "@/lib/countries";
import { translate } from "@/lib/translations";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import { WhiteboardEditor } from "@/components/WhiteboardEditor";
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
  province?: string;
  landline?: string;
  formResponses?: string;
  followUps?: string;
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

  // Switches
  isSelfEmployed: boolean;
  isCompany: boolean;
  receivesReminders: boolean;
  occupation?: string;
  maritalStatus?: string;

  appointments: Appointment[];
  sales: Sale[];
  documents: SignedDocument[];
  vouchers: ClientVoucher[];
  files: ClientFile[];
  allowedUsers?: { id: string }[];
  clinic: { name: string; address: string; logo?: string; defaultWhatsappMode?: string };
  photos: any[];
}

interface ClientVoucher {
  id: string;
  clientId: string;
  voucherId: string;
  name: string;
  sessions: number;
  remainingSessions: number;
  price: number;
  expirationDate?: string;
  sharedClientIds?: string;
  createdAt: string;
}

interface ClientFile {
  id: string;
  clientId: string;
  name: string;
  fileUrl: string;
  fileSize?: number;
  createdAt: string;
}

interface Appointment {
  id: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  tags?: string;
  user: { name: string; firstName?: string; lastName?: string; email?: string; phone?: string; dniNif?: string };
  service: { name: string; price: number };
  room?: string;
  videoLink?: string;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  itemsJson?: string;
}

interface SignedDocument {
  id: string;
  name: string;
  content: string;
  signature?: string;
  pin?: string | null;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25D366" }}>
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.233-1.371a9.948 9.948 0 0 0 4.779 1.218h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.038-5.176-2.927-7.067C17.191 2.903 14.683 2 12.012 2zm5.727 14.072c-.315.89-1.547 1.626-2.124 1.706-.576.081-1.129.3-3.69-.747-3.266-1.333-5.362-4.66-5.526-4.88-.163-.22-1.303-1.737-1.303-3.313 0-1.576.822-2.35 1.115-2.673.292-.323.639-.404.852-.404.213 0 .426.002.612.01.196.01.458-.073.717.55.263.632.898 2.19.977 2.353.078.163.131.353.023.57-.109.218-.163.353-.327.545-.163.19-.343.426-.49.57-.163.163-.332.34-.143.666.19.327.844 1.393 1.815 2.257.185.163.342.277.522.378.18.101.408.204.629.136.223-.068.956-.375 1.21-.74.254-.366.508-.3.856-.176.347.125 2.193 1.033 2.57 1.22.377.189.627.28.72.441.093.161.093.931-.222 1.821z"/>
  </svg>
);

export default function ClientDetailPage() {
  const { id } = useParams() as { id: string };
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

  useEffect(() => {
    if (activeClinic) {
      const code = activeClinic.country || "ES";
      const config = getCountryConfig(code);
      setCreateCountry(config.name);
      const matched = COUNTRIES.find((c) => c.code === config.code);
      if (matched) {
        setPhoneCountry(matched);
        setDniCountry(matched);
        setCountryDropdownCountry(matched);
      }
    }
  }, [activeClinic]);

  const showPersonalData = currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Ver datos personales");
  const showDocumentsTab = currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Ver documentos");
  const showFormsTab = currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Formularios");
  const showMedicalTab = currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Seguimientos");
  const showBillingTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Artículos - Todo") ||
    hasPermission(currentUser, "contabilidad", "Artículos - Solo artículos relacionados") ||
    hasPermission(currentUser, "contabilidad", "Solo cobrar");
  const showBudgetsTab = currentUser?.role === "ADMIN" || 
    hasPermission(currentUser, "contabilidad", "Facturas - Todo") ||
    hasPermission(currentUser, "contabilidad", "Facturas - " + (activeClinic?.name || ""));
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Design active tabs: "general" | "documents" | "forms" | "medical" | "permissions" | "billing"
  const [activeTab, setActiveTab] = useState<"general" | "documents" | "forms" | "medical" | "permissions" | "billing" | "budgets" | "photos" | "timeline" | "whiteboard">("general");

  // Redirect forbidden tabs back to general
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "ADMIN") return;
    
    if (activeTab === "documents" && !showDocumentsTab) {
      setActiveTab("general");
    }
    if (activeTab === "forms" && !showFormsTab) {
      setActiveTab("general");
    }
    if (activeTab === "medical" && !showMedicalTab) {
      setActiveTab("general");
    }
    if (activeTab === "permissions") {
      setActiveTab("general");
    }
    if (activeTab === "billing" && !showBillingTab) {
      setActiveTab("general");
    }
    if (activeTab === "budgets" && !showBudgetsTab) {
      setActiveTab("general");
    }
  }, [currentUser, activeTab, showDocumentsTab, showFormsTab, showMedicalTab, showBillingTab, showBudgetsTab]);
  
  // Left Sidebar Clients list
  const [sidebarClients, setSidebarClients] = useState<Client[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Photos State Declarations
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [photoType, setPhotoType] = useState<"BEFORE" | "AFTER">("BEFORE");
  const [photoAngle, setPhotoAngle] = useState("Frente");
  const [customAngleInput, setCustomAngleInput] = useState("");
  const [photoAppointmentId, setPhotoAppointmentId] = useState("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [compareBeforePhoto, setCompareBeforePhoto] = useState<string | null>(null);
  const [compareAfterPhoto, setCompareAfterPhoto] = useState<string | null>(null);
  const [isComparingOpen, setIsComparingOpen] = useState(false);
  const [expandedAppointments, setExpandedAppointments] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Options Dropdown State
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  // Inline Editing fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  // Full Edit Modal State
  const [showFullEditModal, setShowFullEditModal] = useState(false);
  const [editTab, setEditTab] = useState<"general" | "otros">("general");
  const [formIsSelfEmployed, setFormIsSelfEmployed] = useState(false);
  const [formIsCompany, setFormIsCompany] = useState(false);
  const [formReceivesReminders, setFormReceivesReminders] = useState(true);

  // Tags Drawer State
  const TAG_COLORS = ["#f56565", "#ed8936", "#ecc94b", "#48bb78", "#38b2ac", "#4299e1", "#667eea", "#9f7aec", "#ed64a6", "#a0aec0"];
  const [showTagsDrawer, setShowTagsDrawer] = useState(false);
  const [modalClientTags, setModalClientTags] = useState<string[]>([]);
  const [clientAvailableTags, setClientAvailableTags] = useState<{ name: string; color: string }[]>([]);
  const [searchTagQuery, setSearchTagQuery] = useState("");
  const [tagsSubView, setTagsSubView] = useState<"list" | "create">("list");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#f56565");

  const loadAvailableTags = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clifav_client_available_tags");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
      const initial = [
        { name: "FRECUENTE", color: "#4299e1" },
        { name: "NUEVO", color: "#48bb78" },
        { name: "RECOMENDADO", color: "#ed8936" }
      ];
      localStorage.setItem("clifav_client_available_tags", JSON.stringify(initial));
      return initial;
    }
    return [];
  };

  const handleOpenTagsDrawer = () => {
    setClientAvailableTags(loadAvailableTags());
    const currentTags = client?.tags
      ? client.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    setModalClientTags(currentTags);
    setSearchTagQuery("");
    setTagsSubView("list");
    setShowTagsDrawer(true);
  };

  const handleSaveClientTags = async () => {
    if (!client) return;
    const newTagsString = modalClientTags.join(", ");
    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: client.firstName,
        lastName: client.lastName,
        tags: newTagsString,
      }),
    });

    if (res.ok) {
      setShowTagsDrawer(false);
      fetchClientDetails();
    } else {
      alert("Error al actualizar las etiquetas");
    }
  };

  const handleCreateNewTag = () => {
    const name = newTagName.trim().toUpperCase();
    if (!name) return;
    if (clientAvailableTags.some((t) => t.name === name)) {
      alert("Esta etiqueta ya existe.");
      return;
    }
    const updated = [...clientAvailableTags, { name, color: newTagColor }];
    setClientAvailableTags(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("clifav_client_available_tags", JSON.stringify(updated));
    }
    if (!modalClientTags.includes(name)) {
      setModalClientTags((prev) => [...prev, name]);
    }
    setNewTagName("");
    setTagsSubView("list");
  };

  const handleDeleteTagGlobal = (tagName: string) => {
    const updated = clientAvailableTags.filter((t) => t.name !== tagName);
    setClientAvailableTags(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("clifav_client_available_tags", JSON.stringify(updated));
    }
    setModalClientTags((prev) => prev.filter((t) => t !== tagName));
  };

  // Permissions state
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Create Client Modal State
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
    { code: "HU", flag: "🇬🇺", name: "Hungría", dial: "+36" },
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
    { code: "VE", flag: "🇻🇪", name: "Venezuela", dial: "+58" }
  ];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationTab, setCreationTab] = useState<"general" | "otros">("general");

  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createDniNif, setCreateDniNif] = useState("");
  const [createBirthDate, setCreateBirthDate] = useState("");
  const [createGender, setCreateGender] = useState("Femenino");
  const [createAddress, setCreateAddress] = useState("");
  const [createMunicipality, setCreateMunicipality] = useState("");
  const [createPostalCode, setCreatePostalCode] = useState("");
  const [createCountry, setCreateCountry] = useState("España");
  const [createIban, setCreateIban] = useState("");
  const [createBic, setCreateBic] = useState("");
  const [createTags, setCreateTags] = useState("");

  const [createAestheticTreatments, setCreateAestheticTreatments] = useState("");
  const [createAllergies, setCreateAllergies] = useState("");
  const [createMedication, setCreateMedication] = useState("");
  const [createMedicalHistory, setCreateMedicalHistory] = useState("");
  const [createOtherNotes, setCreateOtherNotes] = useState("");

  const [createTutorName, setCreateTutorName] = useState("");
  const [createTutorLastName, setCreateTutorLastName] = useState("");
  const [createTutorDniNif, setCreateTutorDniNif] = useState("");
  const [createTutorPhone, setCreateTutorPhone] = useState("");
  const [createTutorEmail, setCreateTutorEmail] = useState("");
  const [createTutorAddress, setCreateTutorAddress] = useState("");
  const [createTutorPostalCode, setCreateTutorPostalCode] = useState("");
  const [createTutorMunicipality, setCreateTutorMunicipality] = useState("");

  const [createIsSelfEmployed, setCreateIsSelfEmployed] = useState(false);
  const [createIsCompany, setCreateIsCompany] = useState(false);
  const [createReceivesReminders, setCreateReceivesReminders] = useState(true);

  // Picker dropdown states for creation form
  const [phoneCountry, setPhoneCountry] = useState(COUNTRIES[0]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const phoneDropdownRef = useRef<HTMLDivElement>(null);

  const [countryDropdownCountry, setCountryDropdownCountry] = useState(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [showBirthCalendar, setShowBirthCalendar] = useState(false);
  const [birthCalYear, setBirthCalYear] = useState(new Date().getFullYear() - 30);
  const [birthCalMonth, setBirthCalMonth] = useState(new Date().getMonth());
  const birthCalRef = useRef<HTMLDivElement>(null);

  const [dniCountry, setDniCountry] = useState(COUNTRIES[0]);
  const [showDniDropdown, setShowDniDropdown] = useState(false);
  const [dniSearch, setDniSearch] = useState("");
  const dniDropdownRef = useRef<HTMLDivElement>(null);

  // Address autocomplete states for client creation form
  const [showCreateAddressDropdown, setShowCreateAddressDropdown] = useState(false);
  const createAddressAutocompleteRef = useRef<HTMLDivElement>(null);

  const handleCreateAddressChange = async (val: string) => {
    setCreateAddress(val);
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
          setShowCreateAddressDropdown(true);
        }
      } catch (e) {
        console.error("Error fetching autocompleted address:", e);
      }
    } else {
      setAddressSuggestions([]);
      setShowCreateAddressDropdown(false);
    }
  };

  const handleSelectCreateAddressSuggestion = (item: any) => {
    setCreateAddress(item.address || item.displayName.split(",")[0]);
    if (item.city) setCreateMunicipality(item.city);
    if (item.postalCode) setCreatePostalCode(item.postalCode);
    if (item.country) setCreateCountry(item.country);
    setAddressSuggestions([]);
    setShowCreateAddressDropdown(false);
  };

  // Edit fields for full edit modal
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
  
  // Health fields
  const [formAestheticTreatments, setFormAestheticTreatments] = useState("");
  const [formAllergies, setFormAllergies] = useState("");
  const [formMedication, setFormMedication] = useState("");
  const [formMedicalHistory, setFormMedicalHistory] = useState("");
  const [formOtherNotes, setFormOtherNotes] = useState("");
  
  // Tutor edit fields
  const [formTutorName, setFormTutorName] = useState("");
  const [formTutorLastName, setFormTutorLastName] = useState("");
  const [formTutorDniNif, setFormTutorDniNif] = useState("");
  const [formTutorPhone, setFormTutorPhone] = useState("");
  const [formTutorEmail, setFormTutorEmail] = useState("");
  const [formTutorAddress, setFormTutorAddress] = useState("");
  const [formTutorPostalCode, setFormTutorPostalCode] = useState("");

  // Budgets states
  const [clientBudgets, setClientBudgets] = useState<any[]>([]);
  const [budgetTemplates, setBudgetTemplates] = useState<any[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetModalTitle, setBudgetModalTitle] = useState("");
  const [budgetTitleInput, setBudgetTitleInput] = useState("");
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [budgetStatusSelect, setBudgetStatusSelect] = useState("PENDING");
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  
  // Item inputs inside modal
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemTax, setNewItemTax] = useState("21");
  const [newItemDiscount, setNewItemDiscount] = useState("0");
  const [newItemDiscountType, setNewItemDiscountType] = useState<"%" | "€">("%");
  // Catalog services autocompletion
  const [services, setServices] = useState<any[]>([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);


  const [formTutorMunicipality, setFormTutorMunicipality] = useState("");


  // Associated Vouchers, files and billing sub-tabs
  const [billingSubTab, setBillingSubTab] = useState<"citas" | "productos" | "bonos" | "suscripciones" | "presupuestos">("citas");
  const [citasTimeFilter, setCitasTimeFilter] = useState<"pasado" | "futuro">("pasado");
  const [citasStatusMenuOpen, setCitasStatusMenuOpen] = useState<string | null>(null);
  const [clinicVouchers, setClinicVouchers] = useState<any[]>([]);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState("");

  // Client Products & Add Article Menu states
  const [clientProductsList, setClientProductsList] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [addArticleMenuOpen, setAddArticleMenuOpen] = useState(false);
  const [showAssignProductModal, setShowAssignProductModal] = useState(false);
  const [editingClientProduct, setEditingClientProduct] = useState<any | null>(null);
  const [clientProductMenuOpen, setClientProductMenuOpen] = useState<string | null>(null);
  const [assignProductDate, setAssignProductDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [assignProductId, setAssignProductId] = useState("");
  const [assignProductName, setAssignProductName] = useState("");
  const [assignProductPrice, setAssignProductPrice] = useState("0");
  const [assignProductVat, setAssignProductVat] = useState("21");
  const [assignProductTotal, setAssignProductTotal] = useState("0");
  const [assignProductProfessionalId, setAssignProductProfessionalId] = useState("");
  const [assignProductProfessionalName, setAssignProductProfessionalName] = useState("");
  const [assignProductSaving, setAssignProductSaving] = useState(false);
  const [showAssociateDocModal, setShowAssociateDocModal] = useState(false);
  const [docWizardStep, setDocWizardStep] = useState<"select_and_edit" | "preview_and_sign">("select_and_edit");
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
  const [activeSignee, setActiveSignee] = useState<"patient" | "doctor" | "">("patient");
  const [inlineSignatures, setInlineSignatures] = useState<Record<string, string | null>>({});
  const [activeInlineField, setActiveInlineField] = useState<string | null>(null);
  const [inlineIsDrawing, setInlineIsDrawing] = useState(false);
  const inlineCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [docSignatureFields, setDocSignatureFields] = useState<Array<{id: string; type: "ordinary" | "certified"}>>([]);
  const [showDocVariablesDropdown, setShowDocVariablesDropdown] = useState(false);
  const [showDocOptionsDropdown, setShowDocOptionsDropdown] = useState(false);
  const [showDocHtmlModal, setShowDocHtmlModal] = useState(false);
  const [docHtmlModalContent, setDocHtmlModalContent] = useState("");
  const [showSignedDocOptionsDropdown, setShowSignedDocOptionsDropdown] = useState(false);
  const associateEditorRef = useRef<HTMLDivElement | null>(null);

  // Edit Client Voucher states
  const [showEditVoucherModal, setShowEditVoucherModal] = useState(false);
  const [editingClientVoucher, setEditingClientVoucher] = useState<any>(null);
  const [editVoucherName, setEditVoucherName] = useState("");
  const [editVoucherSessions, setEditVoucherSessions] = useState(0);
  const [editVoucherRemaining, setEditVoucherRemaining] = useState(0);
  const [editVoucherPrice, setEditVoucherPrice] = useState(0);
  const [editVoucherExpiration, setEditVoucherExpiration] = useState("");
  const [docTemplateSearch, setDocTemplateSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDropFile = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      setUploadingFile(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);

          const res = await fetch(`/api/clients/${id}/files`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            alert(err.error || `Error al subir el archivo ${files[i].name}`);
          }
        }
        fetchClientDetails(true);
      } catch (err) {
        console.error(err);
        alert("Error al subir archivo.");
      } finally {
        setUploadingFile(false);
      }
    }
  };

  // Share Client Voucher states
  const [showShareVoucherModal, setShowShareVoucherModal] = useState(false);
  const [sharingClientVoucher, setSharingClientVoucher] = useState<any>(null);
  const [shareVoucherClientSearch, setShareVoucherClientSearch] = useState("");
  const [allClientsForShare, setAllClientsForShare] = useState<any[]>([]);


  // Document Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [generatedDocName, setGeneratedDocName] = useState("");
  const [generatedDocContent, setGeneratedDocContent] = useState("");
  const [showSignModal, setShowSignModal] = useState(false);
  const [viewingSignedDoc, setViewingSignedDoc] = useState<SignedDocument | null>(null);

  useEffect(() => {
    if (selectedTemplateId && associateEditorRef.current) {
      if (associateEditorRef.current.innerHTML !== generatedDocContent) {
        associateEditorRef.current.innerHTML = generatedDocContent;
      }
    }
  }, [selectedTemplateId, generatedDocContent]);
  
  // Remote Signature states
  const [showSignatureMethodModal, setShowSignatureMethodModal] = useState(false);
  const [showRemoteSignModal, setShowRemoteSignModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [remoteSignLink, setRemoteSignLink] = useState("");
  const [remoteSignPin, setRemoteSignPin] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalAddress, setEmailModalAddress] = useState("");
  const [emailModalSubject, setEmailModalSubject] = useState("");
  const [emailModalBody, setEmailModalBody] = useState("");

  // Canvas Signature state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Custom Forms states
  const [clientFormTemplates, setClientFormTemplates] = useState<any[]>([]);
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<any | null>(null);
  const [formResponses, setFormResponses] = useState<any>({});
  const [editingFormField, setEditingFormField] = useState<string | null>(null);
  const [editingFormValue, setEditingFormValue] = useState<string>("");
  const [showFormOptions, setShowFormOptions] = useState(false);

  // Whiteboard / Follow-ups (Seguimientos) states
  const [medicalTabSubView, setMedicalTabSubView] = useState<"list" | "seguimiento_create" | "seguimiento_edit" | "pizarra_create" | "pizarra_edit">("list");
  const [episodeTemplates, setEpisodeTemplates] = useState<any[]>([]);
  const [whiteboardTemplates, setWhiteboardTemplates] = useState<any[]>([]);
  const [showCreateSeguimientoMenu, setShowCreateSeguimientoMenu] = useState(false);
  const [showPizarraTemplateDropdown, setShowPizarraTemplateDropdown] = useState(false);
  const [showImageSourceSelector, setShowImageSourceSelector] = useState(false);

  // Whiteboard creation states
  const [pizarraDate, setPizarraDate] = useState(() => new Date().toLocaleDateString("en-CA")); // yyyy-mm-dd
  const [pizarraTemplateId, setPizarraTemplateId] = useState("");
  const [pizarraTemplateName, setPizarraTemplateName] = useState("");
  const [pizarraImage, setPizarraImage] = useState("");
  const [pizarraSaveAsTemplate, setPizarraSaveAsTemplate] = useState(false);
  const [pizarraPoints, setPizarraPoints] = useState<any[]>([]);
  const [pizarraEditingId, setPizarraEditingId] = useState<string | null>(null);

  // Camera WebRTC states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Follow-up form creation states
  const [seguimientoTemplateId, setSeguimientoTemplateId] = useState("");
  const [seguimientoTemplateName, setSeguimientoTemplateName] = useState("");
  const [seguimientoFields, setSeguimientoFields] = useState<any[]>([]);
  const [seguimientoDate, setSeguimientoDate] = useState(() => new Date().toLocaleDateString("en-CA")); // yyyy-mm-dd
  const [seguimientoEditingId, setSeguimientoEditingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [activatePizarra, setActivatePizarra] = useState(false);
  const [seguimientoNotes, setSeguimientoNotes] = useState("");
  const [seguimientoAttachments, setSeguimientoAttachments] = useState<any[]>([]);

  const fetchClientDetails = (silent: boolean = false) => {
    if (!silent) setLoading(true);
    fetch(`/api/clients/${id}?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("No encontrado");
        return res.json();
      })
      .then((data) => {
        setClient(data);
        
        // Populate edit fields
        setFormFirstName(data.firstName);
        setFormLastName(data.lastName);
        setFormPhone(data.phone || "");
        setFormEmail(data.email || "");
        setFormDniNif(data.dniNif || "");
        if (data.birthDate) {
          const clean = data.birthDate.split("T")[0];
          if (clean.includes("-")) {
            const [y, m, d] = clean.split("-");
            setFormBirthDate(`${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`);
          } else {
            setFormBirthDate(clean);
          }
        } else {
          setFormBirthDate("");
        }
        setFormGender(data.gender || "Femenino");
        setFormAddress(data.address || "");
        setFormMunicipality(data.municipality || "");
        setFormPostalCode(data.postalCode || "");
        setFormCountry(data.country || "España");
        setFormIban(data.iban || "");
        setFormBic(data.bic || "");
        setFormTags(data.tags || "");
        
        setFormAestheticTreatments(data.aestheticTreatments || "");
        setFormAllergies(data.allergies || "");
        setFormMedication(data.medication || "");
        setFormMedicalHistory(data.medicalHistory || "");
        setFormOtherNotes(data.otherNotes || "");
        
        setFormTutorName(data.tutorName || "");
        setFormTutorLastName(data.tutorLastName || "");
        setFormTutorDniNif(data.tutorDniNif || "");
        setFormTutorPhone(data.tutorPhone || "");
        setFormTutorEmail(data.tutorEmail || "");
        setFormTutorAddress(data.tutorAddress || "");
        setFormTutorPostalCode(data.tutorPostalCode || "");
        setFormTutorMunicipality(data.tutorMunicipality || "");

        setFormIsSelfEmployed(data.isSelfEmployed ?? false);
        setFormIsCompany(data.isCompany ?? false);
        setFormReceivesReminders(data.receivesReminders ?? true);

        // Set allowed user permissions
        if (data.allowedUsers) {
          setSelectedPermissions(data.allowedUsers.map((u: any) => u.id));
        } else {
          setSelectedPermissions([]);
        }

        try {
          setFormResponses(data.formResponses ? JSON.parse(data.formResponses) : {});
        } catch {
          setFormResponses({});
        }
        
        if (!silent) setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching client details:", err);
        router.push("/dashboard/contacts");
      });
  };

  const fetchClientProducts = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/client-products?clientId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setClientProductsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching client products:", err);
    }
  }, [id]);

  const fetchAvailableProducts = useCallback(async () => {
    if (!activeClinic?.id) return;
    try {
      const res = await fetch(`/api/products?clinicId=${activeClinic.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching clinic products:", err);
    }
  }, [activeClinic?.id]);

  useEffect(() => {
    if (activeTab === "billing" && id) {
      fetchClientProducts();
      fetchAvailableProducts();
    }
  }, [activeTab, id, fetchClientProducts, fetchAvailableProducts]);

  const handleSelectProductToAssign = (productId: string) => {
    setAssignProductId(productId);
    if (!productId) {
      setAssignProductName("");
      setAssignProductPrice("0");
      setAssignProductVat("21");
      setAssignProductTotal("0");
      return;
    }
    const found = availableProducts.find((p) => p.id === productId);
    if (found) {
      setAssignProductName(found.name);
      const pPrice = found.price || 0;
      const pVat = found.vat !== undefined ? found.vat : 21;
      const pTotal = pPrice * (1 + pVat / 100);
      setAssignProductPrice(pPrice.toString());
      setAssignProductVat(pVat.toString());
      setAssignProductTotal(pTotal.toFixed(2));
    }
  };

  const handleResetAssignProductForm = () => {
    setEditingClientProduct(null);
    setAssignProductDate(new Date().toISOString().split("T")[0]);
    setAssignProductId("");
    setAssignProductName("");
    setAssignProductPrice("0");
    setAssignProductVat("21");
    setAssignProductTotal("0");
    setAssignProductProfessionalId("");
    setAssignProductProfessionalName("");
  };

  const handleOpenEditClientProduct = (cp: any) => {
    setEditingClientProduct(cp);
    setAssignProductDate(cp.date ? new Date(cp.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setAssignProductId(cp.productId || "");
    setAssignProductName(cp.productName || "");
    setAssignProductPrice(cp.price?.toString() || "0");
    setAssignProductVat(cp.vat?.toString() || "21");
    setAssignProductTotal(cp.total?.toString() || "0");
    setAssignProductProfessionalId(cp.professionalId || "");
    setAssignProductProfessionalName(cp.professionalName || "");
    setShowAssignProductModal(true);
  };

  const handleSaveAssignProduct = async () => {
    if (!client || !activeClinic?.id) return;
    if (!assignProductName.trim() && !assignProductId) {
      toast.error("Selecciona un producto.");
      return;
    }
    setAssignProductSaving(true);
    try {
      const payload = {
        clientId: client.id,
        productId: assignProductId || null,
        productName: assignProductName || "Producto",
        date: assignProductDate ? new Date(assignProductDate) : new Date(),
        price: parseFloat(assignProductPrice || "0"),
        vat: parseFloat(assignProductVat || "21"),
        total: parseFloat(assignProductTotal || "0"),
        professionalId: assignProductProfessionalId || null,
        professionalName: assignProductProfessionalName || null,
        clinicId: activeClinic.id,
      };

      let res;
      if (editingClientProduct) {
        res = await fetch(`/api/client-products/${editingClientProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/client-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(editingClientProduct ? "Producto actualizado." : "Producto asignado al paciente.");
        setShowAssignProductModal(false);
        handleResetAssignProductForm();
        fetchClientProducts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar producto.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar producto.");
    } finally {
      setAssignProductSaving(false);
    }
  };

  const handleDeleteClientProduct = async (prodId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto asociado?")) return;
    try {
      const res = await fetch(`/api/client-products/${prodId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Producto eliminado.");
        fetchClientProducts();
      } else {
        toast.error("Error al eliminar.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error en el servidor.");
    }
  };

  useEffect(() => {
    if (showFullEditModal && client) {
      setFormFirstName(client.firstName || "");
      setFormLastName(client.lastName || "");
      setFormPhone(client.phone || "");
      setFormEmail(client.email || "");
      setFormDniNif(client.dniNif || "");
      if (client.birthDate) {
        const clean = client.birthDate.split("T")[0];
        if (clean.includes("-")) {
          const [y, m, d] = clean.split("-");
          setFormBirthDate(`${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`);
        } else {
          setFormBirthDate(clean);
        }
      } else {
        setFormBirthDate("");
      }
      setFormGender(client.gender || "Femenino");
      setFormAddress(client.address || "");
      setFormMunicipality(client.municipality || "");
      setFormPostalCode(client.postalCode || "");
      setFormCountry(client.country || "España");
      setFormIban(client.iban || "");
      setFormBic(client.bic || "");
      setFormTags(client.tags || "");
      setFormAestheticTreatments(client.aestheticTreatments || "");
      setFormAllergies(client.allergies || "");
      setFormMedication(client.medication || "");
      setFormMedicalHistory(client.medicalHistory || "");
      setFormOtherNotes(client.otherNotes || "");
      setFormTutorName(client.tutorName || "");
      setFormTutorLastName(client.tutorLastName || "");
      setFormTutorDniNif(client.tutorDniNif || "");
      setFormTutorPhone(client.tutorPhone || "");
      setFormTutorEmail(client.tutorEmail || "");
      setFormTutorAddress(client.tutorAddress || "");
      setFormTutorPostalCode(client.tutorPostalCode || "");
      setFormTutorMunicipality(client.tutorMunicipality || "");
      setFormIsSelfEmployed(client.isSelfEmployed ?? false);
      setFormIsCompany(client.isCompany ?? false);
      setFormReceivesReminders(client.receivesReminders ?? true);
      setEditTab("general");
    }
  }, [showFullEditModal, client]);

  const handleSaveFormField = async (fieldName: string) => {
    if (!client || !selectedFormTemplate) return;

    const updatedResponses = {
      ...formResponses,
      [selectedFormTemplate.id]: {
        ...(formResponses[selectedFormTemplate.id] || {}),
        [fieldName]: editingFormValue
      }
    };
    
    const payload: any = {
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone || "",
      email: client.email || "",
      dniNif: client.dniNif || "",
      birthDate: client.birthDate ? client.birthDate.split("T")[0] : null,
      gender: client.gender || "Femenino",
      address: client.address || "",
      municipality: client.municipality || "",
      postalCode: client.postalCode || "",
      country: client.country || "España",
      iban: client.iban || "",
      bic: client.bic || "",
      tags: client.tags || "",
      
      aestheticTreatments: client.aestheticTreatments || "",
      allergies: client.allergies || "",
      medication: client.medication || "",
      medicalHistory: client.medicalHistory || "",
      otherNotes: client.otherNotes || "",
      
      tutorName: client.tutorName || "",
      tutorLastName: client.tutorLastName || "",
      tutorDniNif: client.tutorDniNif || "",
      tutorPhone: client.tutorPhone || "",
      tutorEmail: client.tutorEmail || "",
      tutorAddress: client.tutorAddress || "",
      tutorPostalCode: client.tutorPostalCode || "",
      tutorMunicipality: client.tutorMunicipality || "",
      
      isSelfEmployed: client.isSelfEmployed,
      isCompany: client.isCompany,
      receivesReminders: client.receivesReminders,
      occupation: client.occupation || "",
      maritalStatus: client.maritalStatus || "Soltero/a",
      
      formResponses: JSON.stringify(updatedResponses)
    };

    if (selectedFormTemplate.name === "Historia Clínica" || selectedFormTemplate.isMain) {
      if (fieldName === "Antecedentes médicos") payload.medicalHistory = editingFormValue;
      if (fieldName === "Alergias") payload.allergies = editingFormValue;
      if (fieldName === "Medicación") payload.medication = editingFormValue;
      if (fieldName === "Otros") payload.otherNotes = editingFormValue;
      if (fieldName === "Tratamientos estéticos previos") payload.aestheticTreatments = editingFormValue;
    }

    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setFormResponses(updatedResponses);
      fetchClientDetails();
      setEditingFormField(null);
    } else {
      alert("Error al guardar la respuesta");
    }
  };

  const fetchSidebarClientsList = () => {
    if (!activeClinic) return;
    fetch(`/api/clients?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSidebarClients(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchClientDetails();
    fetchSidebarClientsList();
    
    // Fetch Templates
    fetch("/api/documents/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data));
  }, [id]);

  const fetchBudgets = () => {
    if (!activeClinic) return;
    fetch(`/api/budgets?clinicId=${activeClinic.id}&clientId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClientBudgets(data);
      })
      .catch(console.error);
  };

  const fetchBudgetTemplates = () => {
    if (!activeClinic) return;
    fetch(`/api/budgets/templates?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBudgetTemplates(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (activeClinic) {
      fetchSidebarClientsList();
      fetchBudgets();
      fetchBudgetTemplates();

      // Fetch clinic services for budgets autocompletion
      fetch(`/api/services?clinicId=${activeClinic.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setServices(data);
          } else {
            setServices([]);
          }
        })
        .catch(console.error);


      
      // Fetch staff members for permissions
      fetch(`/api/users?clinicId=${activeClinic.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllStaff(data);
        })
        .catch(console.error);

      // Fetch clinic vouchers
      fetch(`/api/vouchers?clinicId=${activeClinic.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setClinicVouchers(data);
        })
        .catch(console.error);

      // Fetch custom client form templates
      fetch(`/api/client-forms?clinicId=${activeClinic.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setClientFormTemplates(data);
            const main = data.find((t: any) => t.isMain) || data[0];
            if (main) setSelectedFormTemplate(main);
          }
        })
        .catch(console.error);

      // Fetch follow-up (episode) form templates
      fetch(`/api/episode-forms?clinicId=${activeClinic.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setEpisodeTemplates(data);
        })
        .catch(console.error);

      // Fetch whiteboard templates
      fetchWhiteboardTemplates();
    }
  }, [activeClinic]);

  const fetchWhiteboardTemplates = () => {
    if (!activeClinic) return;
    fetch(`/api/whiteboard-templates?clinicId=${activeClinic.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setWhiteboardTemplates(data);
      })
      .catch(console.error);
  };

  // WebRTC Camera snap functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 150);
    } catch (err) {
      alert("No se pudo acceder a la cámara. Por favor asegúrate de dar permisos de cámara: " + err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPizarraImage(dataUrl);
        stopCamera();
      }
    }
  };

  // Timeline save logic
  const handleSaveFollowUpsList = async (updatedList: any[]) => {
    if (!client) return;
    const payload: any = {
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      dniNif: client.dniNif,
      birthDate: client.birthDate ? client.birthDate.split("T")[0] : null,
      gender: client.gender,
      address: client.address,
      municipality: client.municipality,
      postalCode: client.postalCode,
      country: client.country,
      province: client.province,
      landline: client.landline,
      iban: client.iban,
      bic: client.bic,
      tags: client.tags,
      aestheticTreatments: client.aestheticTreatments,
      allergies: client.allergies,
      medication: client.medication,
      medicalHistory: client.medicalHistory,
      otherNotes: client.otherNotes,
      tutorName: client.tutorName,
      tutorLastName: client.tutorLastName,
      tutorDniNif: client.tutorDniNif,
      tutorPhone: client.tutorPhone,
      tutorEmail: client.tutorEmail,
      tutorAddress: client.tutorAddress,
      tutorPostalCode: client.tutorPostalCode,
      tutorMunicipality: client.tutorMunicipality,
      isSelfEmployed: client.isSelfEmployed,
      isCompany: client.isCompany,
      receivesReminders: client.receivesReminders,
      occupation: client.occupation,
      maritalStatus: client.maritalStatus,
      formResponses: client.formResponses,
      followUps: JSON.stringify(updatedList)
    };

    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fetchClientDetails();
    } else {
      alert("Error al guardar los datos en el servidor.");
    }
  };

  const handleSavePizarra = async () => {
    if (!pizarraImage) {
      alert("Por favor selecciona o toma una imagen.");
      return;
    }

    if (pizarraSaveAsTemplate && activeClinic) {
      const name = prompt("Nombre de la plantilla para guardar:", pizarraTemplateName || "Plantilla Pizarra");
      if (name?.trim()) {
        try {
          await fetch("/api/whiteboard-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              imageUrl: pizarraImage,
              clinicId: activeClinic.id
            })
          });
          fetchWhiteboardTemplates();
        } catch (e) {
          console.error("Error al guardar la plantilla:", e);
        }
      }
    }

    let existingFollowUps: any[] = [];
    if (client?.followUps) {
      try {
        existingFollowUps = JSON.parse(client.followUps);
      } catch {
        existingFollowUps = [];
      }
    }

    const pizarraObj = {
      id: pizarraEditingId || Math.random().toString(36).substring(2, 9),
      type: "pizarra",
      createdAt: new Date().toISOString(),
      date: pizarraDate,
      templateName: pizarraTemplateName || "Imagen personalizada",
      image: pizarraImage,
      points: pizarraPoints
    };

    let updatedList;
    if (pizarraEditingId) {
      updatedList = existingFollowUps.map(f => f.id === pizarraEditingId ? pizarraObj : f);
    } else {
      updatedList = [pizarraObj, ...existingFollowUps];
    }

    await handleSaveFollowUpsList(updatedList);
    
    // Reset states
    setPizarraTemplateId("");
    setPizarraTemplateName("");
    setPizarraImage("");
    setPizarraPoints([]);
    setPizarraSaveAsTemplate(false);
    setPizarraEditingId(null);
    setMedicalTabSubView("list");
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setSeguimientoAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: reader.result,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const applyTextFormatting = (format: string) => {
    const textarea = document.getElementById("seguimientoNotesArea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let formatted = "";
    switch (format) {
      case "bold":
        formatted = `<b>${selectedText}</b>`;
        break;
      case "italic":
        formatted = `<i>${selectedText}</i>`;
        break;
      case "underline":
        formatted = `<u>${selectedText}</u>`;
        break;
      case "strike":
        formatted = `<s>${selectedText}</s>`;
        break;
      case "hr":
        formatted = `<hr />${selectedText}`;
        break;
      case "list-ul":
        formatted = `\n• ${selectedText}`;
        break;
      case "list-ol":
        formatted = `\n1. ${selectedText}`;
        break;
      case "align-left":
        formatted = `<div style="text-align: left">${selectedText}</div>`;
        break;
      case "align-center":
        formatted = `<div style="text-align: center">${selectedText}</div>`;
        break;
      case "align-right":
        formatted = `<div style="text-align: right">${selectedText}</div>`;
        break;
      case "align-justify":
        formatted = `<div style="text-align: justify">${selectedText}</div>`;
        break;
      default:
        formatted = selectedText;
    }
    
    const newValue = text.substring(0, start) + formatted + text.substring(end);
    setSeguimientoNotes(newValue);
    
    // Keep focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
    }, 0);
  };

  const handleSaveEpisodeFollowUp = async () => {
    if (activatePizarra && !pizarraImage) {
      alert("Por favor selecciona o toma una imagen para la pizarra.");
      return;
    }

    if (activatePizarra && pizarraSaveAsTemplate && activeClinic) {
      const name = prompt("Nombre de la plantilla para guardar:", pizarraTemplateName || "Plantilla Pizarra");
      if (name?.trim()) {
        try {
          await fetch("/api/whiteboard-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              imageUrl: pizarraImage,
              clinicId: activeClinic.id
            })
          });
          fetchWhiteboardTemplates();
        } catch (e) {
          console.error("Error al guardar la plantilla:", e);
        }
      }
    }

    let existingFollowUps: any[] = [];
    if (client?.followUps) {
      try {
        existingFollowUps = JSON.parse(client.followUps);
      } catch {
        existingFollowUps = [];
      }
    }

    const seguimientoObj: any = {
      id: seguimientoEditingId || Math.random().toString(36).substring(2, 9),
      type: "seguimiento",
      createdAt: new Date().toISOString(),
      date: seguimientoDate,
      templateId: seguimientoTemplateId,
      templateName: seguimientoTemplateName,
      values: seguimientoFields.reduce((acc, f) => ({ ...acc, [f.name]: f.value }), {}),
      notes: seguimientoNotes,
      attachments: seguimientoAttachments
    };

    if (activatePizarra) {
      seguimientoObj.hasPizarra = true;
      seguimientoObj.pizarraImage = pizarraImage;
      seguimientoObj.pizarraPoints = pizarraPoints;
      seguimientoObj.pizarraTemplateName = pizarraTemplateName || "Imagen personalizada";
      seguimientoObj.pizarraTemplateId = pizarraTemplateId;
    }

    let updatedList;
    if (seguimientoEditingId) {
      updatedList = existingFollowUps.map(f => f.id === seguimientoEditingId ? seguimientoObj : f);
    } else {
      updatedList = [seguimientoObj, ...existingFollowUps];
    }

    await handleSaveFollowUpsList(updatedList);

    // Reset follow-up states
    setSeguimientoTemplateId("");
    setSeguimientoTemplateName("");
    setSeguimientoFields([]);
    setSeguimientoEditingId(null);
    setSeguimientoNotes("");
    setSeguimientoAttachments([]);
    setActivatePizarra(false);

    // Reset pizarra states
    setPizarraTemplateId("");
    setPizarraTemplateName("");
    setPizarraImage("");
    setPizarraPoints([]);
    setPizarraSaveAsTemplate(false);
    setPizarraEditingId(null);

    setMedicalTabSubView("list");
  };

  const handleDeleteFollowUpItem = async (itemId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro clínico?")) return;
    
    let existingFollowUps: any[] = [];
    if (client?.followUps) {
      try {
        existingFollowUps = JSON.parse(client.followUps);
      } catch {
        existingFollowUps = [];
      }
    }

    const updatedList = existingFollowUps.filter(f => f.id !== itemId);
    await handleSaveFollowUpsList(updatedList);
  };

  const handleStartEditFollowUpItem = (item: any) => {
    if (item.type === "pizarra") {
      setPizarraEditingId(item.id);
      setPizarraDate(item.date);
      setPizarraTemplateName(item.templateName);
      setPizarraImage(item.image);
      setPizarraPoints(item.points || []);
      setMedicalTabSubView("pizarra_edit");
    } else if (item.type === "seguimiento") {
      setSeguimientoEditingId(item.id);
      setSeguimientoDate(item.date);
      setSeguimientoTemplateId(item.templateId);
      setSeguimientoTemplateName(item.templateName);
      setSeguimientoNotes(item.notes || "");
      setSeguimientoAttachments(item.attachments || []);
      
      if (item.hasPizarra || item.pizarraImage) {
        setActivatePizarra(true);
        setPizarraTemplateId(item.pizarraTemplateId || "");
        setPizarraTemplateName(item.pizarraTemplateName || "");
        setPizarraImage(item.pizarraImage || "");
        setPizarraPoints(item.pizarraPoints || []);
      } else {
        setActivatePizarra(false);
        setPizarraTemplateId("");
        setPizarraTemplateName("");
        setPizarraImage("");
        setPizarraPoints([]);
      }
      
      const template = episodeTemplates.find(t => t.id === item.templateId);
      let tFields: any[] = [];
      if (template) {
        try {
          const parsed = JSON.parse(template.fields);
          tFields = Array.isArray(parsed)
            ? parsed.map((f: any) => typeof f === "string" ? { name: f, type: "Texto" } : f)
            : [];
        } catch {
          tFields = [];
        }
      }
      
      const mergedFields = tFields.map(tf => ({
        name: tf.name,
        type: tf.type,
        value: item.values[tf.name] !== undefined ? item.values[tf.name] : ""
      }));
      
      setSeguimientoFields(mergedFields);
      setMedicalTabSubView("seguimiento_edit");
    }
  };

  const handleStartCreateFollowUp = (template: any) => {
    setSeguimientoEditingId(null);
    setSeguimientoTemplateId(template.id);
    setSeguimientoTemplateName(template.name);
    setSeguimientoDate(new Date().toLocaleDateString("en-CA"));
    
    let tFields: any[] = [];
    try {
      const parsed = JSON.parse(template.fields);
      tFields = Array.isArray(parsed)
        ? parsed.map((f: any) => typeof f === "string" ? { name: f, type: "Texto" } : f)
        : [];
    } catch {
      tFields = [];
    }
    
    setSeguimientoFields(tFields.map(f => ({ ...f, value: "" })));
    setMedicalTabSubView("seguimiento_create");
    setShowCreateSeguimientoMenu(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptionsDropdown(false);
      }
      if (addressAutocompleteRef.current && !addressAutocompleteRef.current.contains(event.target as Node)) {
        setShowAddressDropdown(false);
      }
      if (createAddressAutocompleteRef.current && !createAddressAutocompleteRef.current.contains(event.target as Node)) {
        setShowCreateAddressDropdown(false);
      }
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setShowPhoneDropdown(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (birthCalRef.current && !birthCalRef.current.contains(event.target as Node)) {
        setShowBirthCalendar(false);
      }
      if (dniDropdownRef.current && !dniDropdownRef.current.contains(event.target as Node)) {
        setShowDniDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ESC key handler to close Associate Document modal
  useEffect(() => {
    if (!showAssociateDocModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAssociateDocModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAssociateDocModal]);

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !client) return;

    setUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        const res = await fetch(`/api/clients/${id}/files`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || `Error al subir el archivo ${files[i].name}`);
        }
      }
      fetchClientDetails(true);
    } catch (err) {
      console.error(err);
      alert("Error al subir el archivo.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este archivo?")) return;
    try {
      const res = await fetch(`/api/clients/${id}/files?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchClientDetails(true);
      } else {
        alert("Error al eliminar el archivo");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Photo Upload & Capture Handlers
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", photoType);
    const selectedAngle = photoAngle === "Otro" ? customAngleInput : photoAngle;
    formData.append("angle", selectedAngle || "Frente");
    if (photoAppointmentId) {
      formData.append("appointmentId", photoAppointmentId);
    }
    if (photoDescription) {
      formData.append("description", photoDescription);
    }

    try {
      const res = await fetch(`/api/clients/${id}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al subir la foto");
      }
      
      // Reset inputs
      setPhotoDescription("");
      setPhotoAppointmentId("");
      setCustomAngleInput("");
      setPhotoAngle("Frente");
      
      // Reload client details to get updated photos list
      fetchClientDetails();
      alert("Foto guardada con éxito");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al subir la foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta foto?")) return;
    try {
      const res = await fetch(`/api/clients/${id}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchClientDetails();
      } else {
        alert("Error al eliminar la foto");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintCollage = (app: any, appPhotos: any[], angles: string[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const dateStr = new Date(app.start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const clientName = `${client?.firstName} ${client?.lastName}`;
    const clientDni = client?.dniNif ? `DNI: ${client.dniNif}` : "";
    const clientNum = client?.clientNumber ? `Nº Paciente: ${client.clientNumber}` : "";

    // Generate comparison pages HTML
    let comparisonPagesHtml = "";
    
    angles.forEach((angle, index) => {
      const anglePhotos = appPhotos.filter((p: any) => (p.angle || "Frente") === angle);
      const beforePhoto = anglePhotos.find((p: any) => p.type === "BEFORE");
      const afterPhoto = anglePhotos.find((p: any) => p.type === "AFTER");

      if (!beforePhoto && !afterPhoto) return;

      comparisonPagesHtml += `
        <div class="page">
          <!-- Header Area -->
          <div class="pdf-header">
            <div class="header-left">
              ${client?.clinic?.logo ? `<img class="clinic-logo" src="${client.clinic.logo}" alt="Logo" />` : `<div class="logo-fallback">${(client?.clinic?.name || 'C').charAt(0).toUpperCase()}</div>`}
              <div class="clinic-details">
                <span class="clinic-name">${client?.clinic?.name || "Clínica"}</span>
                <span class="clinic-address">${client?.clinic?.address || ""}</span>
              </div>
            </div>
            <div class="header-right">
              <span class="report-title">Reporte Fotográfico</span>
              <span class="report-meta">Fecha de Sesión: ${dateStr}</span>
            </div>
          </div>

          <!-- Divider -->
          <div class="header-divider"></div>

          <!-- Patient Information -->
          <div class="patient-card">
            <h4 class="patient-card-title">Datos del Paciente</h4>
            <div class="patient-grid">
              <div><strong>Paciente:</strong> ${clientName}</div>
              <div><strong>${clientNum}</strong></div>
              <div><strong>${clientDni}</strong></div>
              <div><strong>Tratamiento:</strong> ${app.service?.name || "Tratamiento"}</div>
            </div>
          </div>

          <!-- Section title for Angle -->
          <h2 class="angle-title">Comparación de Ángulo: ${angle}</h2>

          <!-- Photos Side by Side -->
          <div class="collage-grid">
            <!-- Antes Container -->
            <div class="photo-container">
              <div class="photo-label before-label">Antes (Before)</div>
              ${beforePhoto ? `
                <div class="img-wrapper">
                  <img src="${beforePhoto.photoUrl}" alt="Antes" />
                </div>
                <div class="photo-caption">${beforePhoto.description || "Sin descripción"}</div>
              ` : `
                <div class="empty-photo">
                  <span>Sin foto registrada</span>
                </div>
              `}
            </div>

            <!-- Después Container -->
            <div class="photo-container">
              <div class="photo-label after-label">Después (After)</div>
              ${afterPhoto ? `
                <div class="img-wrapper">
                  <img src="${afterPhoto.photoUrl}" alt="Después" />
                </div>
                <div class="photo-caption">${afterPhoto.description || "Sin descripción"}</div>
              ` : `
                <div class="empty-photo">
                  <span>Sin foto registrada</span>
                </div>
              `}
            </div>
          </div>

          <!-- Footer Area -->
          <div class="pdf-footer">
            <span>Clifav - Gestión y Seguimiento de Pacientes</span>
            <span>Ángulo ${index + 1} de ${angles.length}</span>
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Collage Antes y Después - ${clientName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background-color: #f8fafc;
            }

            .page {
              background-color: #ffffff;
              width: 210mm;
              height: 297mm;
              box-sizing: border-box;
              padding: 20mm;
              margin: 0 auto 10mm;
              position: relative;
              display: flex;
              flex-direction: column;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
              page-break-after: always;
            }

            @media print {
              body {
                background-color: transparent;
              }
              .page {
                box-shadow: none;
                margin: 0;
                width: 100%;
                height: 100%;
                page-break-after: always;
                page-break-inside: avoid;
              }
              .no-print {
                display: none;
              }
            }

            /* Header styling */
            .pdf-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }

            .clinic-logo {
              max-height: 48px;
              max-width: 100px;
              object-fit: contain;
            }

            .logo-fallback {
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: #006687;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 20px;
            }

            .clinic-details {
              display: flex;
              flex-direction: column;
            }

            .clinic-name {
              font-weight: 800;
              font-size: 16px;
              color: #0f172a;
            }

            .clinic-address {
              font-size: 11px;
              color: #64748b;
            }

            .header-right {
              text-align: right;
              display: flex;
              flex-direction: column;
            }

            .report-title {
              font-weight: 800;
              font-size: 15px;
              color: #006687;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .report-meta {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }

            .header-divider {
              height: 2px;
              background: linear-gradient(90deg, #006687, #38bdf8);
              border-radius: 2px;
              margin-bottom: 16px;
            }

            /* Patient Card styling */
            .patient-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 20px;
            }

            .patient-card-title {
              margin: 0 0 6px 0;
              font-size: 11px;
              font-weight: 800;
              color: #006687;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .patient-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px 16px;
              font-size: 12px;
            }

            .angle-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 16px 0;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }

            /* Collage grid side by side */
            .collage-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              flex: 1;
              min-height: 0; /* Important for flex child */
              margin-bottom: 20px;
            }

            .photo-container {
              display: flex;
              flex-direction: column;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              overflow: hidden;
              padding: 12px;
            }

            .photo-label {
              font-size: 11px;
              font-weight: 800;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 4px 8px;
              border-radius: 6px;
              margin-bottom: 12px;
            }

            .before-label {
              background-color: #fee2e2;
              color: #991b1b;
            }

            .after-label {
              background-color: #dcfce7;
              color: #166534;
            }

            .img-wrapper {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              border-radius: 8px;
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              max-height: 380px;
            }

            .img-wrapper img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .empty-photo {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1.5px dashed #cbd5e1;
              border-radius: 8px;
              background-color: #ffffff;
              color: #94a3b8;
              font-size: 13px;
              font-weight: 600;
            }

            .photo-caption {
              font-size: 11px;
              color: #64748b;
              text-align: center;
              margin-top: 8px;
              font-style: italic;
            }

            /* Footer styling */
            .pdf-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
              margin-top: auto;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: sticky; top: 0; background: #ffffff; border-bottom: 1px solid #cbd5e1; padding: 12px 24px; display: flex; justify-content: flex-end; z-index: 9999;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #006687; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px rgba(0, 102, 135, 0.2);">
              <span>🖨️ Imprimir / Guardar como PDF</span>
            </button>
          </div>
          ${comparisonPagesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadDoc = (doc: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${doc.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 24px; text-align: center; }
            img { max-height: 100px; max-width: 200px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #006687; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
              Imprimir / Guardar PDF
            </button>
          </div>
          <h1>${doc.name}</h1>
          <div>${doc.content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSignedDocDelete = async (docId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este documento?")) return;
    try {
      const res = await fetch(`/api/documents/signed/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchClientDetails(true);
      } else {
        alert("Error al eliminar el documento firmado.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al intentar eliminar el documento.");
    }
  };

  const handleSendWhatsAppSignature = (link: string, pin: string, docName: string) => {
    if (!client?.phone) {
      alert("El paciente no tiene un teléfono registrado.");
      return;
    }
    const cleanPhone = client.phone.replace(/\+/g, "").replace(/\s/g, "");
    const mode = client.clinic?.defaultWhatsappMode || "Web";
    const baseUrl = mode === "App" 
      ? `https://api.whatsapp.com/send`
      : `https://web.whatsapp.com/send`;

    const pinText = pin ? `El PIN para ver el documento es: ${pin}` : "";
    const message = `Hola, para leer y firmar el documento ${docName} haga click aquí: ${link} ${pinText}`.trim();
    const encodedText = encodeURIComponent(message);
    
    const url = `${baseUrl}?phone=${cleanPhone}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleOpenEmailModal = (link: string, pin: string, docName: string) => {
    setEmailModalAddress(client?.email || "");
    setEmailModalSubject(`Firma digital pendiente: ${docName}`);
    setEmailModalBody(`Hola, para leer y firmar el documento ${docName} haga click aquí: ${link} El PIN para ver el documento es: ${pin}`);
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async () => {
    if (!emailModalAddress.trim()) {
      alert("Por favor, introduce un correo electrónico válido.");
      return;
    }
    
    try {
      const res = await fetch("/api/notifications/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic?.id,
          clientId: client?.id,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Paciente",
          to: emailModalAddress,
          subject: emailModalSubject,
          body: emailModalBody,
        }),
      });

      if (res.ok) {
        alert(`Enlace de firma enviado por correo electrónico a: ${emailModalAddress}`);
        setShowEmailModal(false);
      } else {
        const errorData = await res.json();
        alert(`Error al enviar correo: ${errorData.error || "Error desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al intentar enviar el correo.");
    }
  };

  const getVoucherPaymentInfo = (voucherId: string) => {
    if (!client || !client.sales) return { isPaid: false, isPartial: false, nuV: null, saleId: null };

    const matchingSales = client.sales.filter((sale) => {
      try {
        const items = JSON.parse(sale.itemsJson || "[]");
        return items.some((i: any) => 
          i.id === `db-voucher-${voucherId}` || 
          i.id === `voucher-${voucherId}` || 
          i.id === voucherId
        );
      } catch {
        return false;
      }
    });

    const totalPaid = matchingSales.reduce((sum, s) => sum + s.total, 0);
    const voucherPrice = client.vouchers.find(v => v.id === voucherId)?.price || 0;

    const isPaid = voucherPrice > 0 && totalPaid >= voucherPrice;
    const isPartial = totalPaid > 0 && totalPaid < voucherPrice;

    const latestSale = matchingSales.length > 0
      ? matchingSales.reduce((latest, s) => new Date(s.createdAt) > new Date(latest.createdAt) ? s : latest, matchingSales[0])
      : null;

    return {
      isPaid,
      isPartial,
      nuV: latestSale?.invoiceNumber || null,
      saleId: latestSale?.id || null
    };
  };

  // Client Voucher Association Handlers
  const handleAssociateVoucher = async () => {
    if (!selectedVoucherId) {
      alert("Por favor, selecciona un bono");
      return;
    }

    try {
      const res = await fetch(`/api/clients/${id}/vouchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: selectedVoucherId }),
      });

      if (!res.ok) throw new Error("Error al asociar el bono");

      setShowAddVoucherModal(false);
      setSelectedVoucherId("");
      fetchClientDetails();
      alert("Bono asociado con éxito");
    } catch (err) {
      console.error(err);
      alert("Error al asociar el bono.");
    }
  };

  const handleConsumeVoucherSession = async (clientVoucherId: string) => {
    try {
      const res = await fetch(`/api/clients/${id}/vouchers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientVoucherId, action: "consume" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al consumir sesión");
      }

      fetchClientDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al consumir sesión del bono");
    }
  };

  const handleDeleteClientVoucher = async (clientVoucherId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este bono asociado?")) return;
    try {
      const res = await fetch(`/api/clients/${id}/vouchers?clientVoucherId=${clientVoucherId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar el bono");

      fetchClientDetails();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el bono del cliente.");
    }
  };

  const handleStartEditClientVoucher = (voucher: any) => {
    setEditingClientVoucher(voucher);
    setEditVoucherName(voucher.name);
    setEditVoucherSessions(voucher.sessions);
    setEditVoucherRemaining(voucher.remainingSessions);
    setEditVoucherPrice(voucher.price);
    if (voucher.expirationDate) {
      setEditVoucherExpiration(voucher.expirationDate.split("T")[0]);
    } else {
      setEditVoucherExpiration("");
    }
    setShowEditVoucherModal(true);
  };

  const handleSaveClientVoucherEdit = async () => {
    if (!editingClientVoucher || !client) return;
    try {
      const res = await fetch(`/api/clients/${id}/vouchers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientVoucherId: editingClientVoucher.id,
          name: editVoucherName,
          sessions: editVoucherSessions,
          remainingSessions: editVoucherRemaining,
          price: editVoucherPrice,
          expirationDate: editVoucherExpiration ? new Date(editVoucherExpiration).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar el bono");
      }

      setShowEditVoucherModal(false);
      setEditingClientVoucher(null);
      fetchClientDetails();
      alert("Bono actualizado con éxito");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al actualizar el bono.");
    }
  };

  const handleOpenShareVoucherModal = async (voucher: any) => {
    setSharingClientVoucher(voucher);
    setShareVoucherClientSearch("");
    setShowShareVoucherModal(true);
    // Load all clients for the clinic so user can select who to share with
    if (activeClinic?.id) {
      try {
        const res = await fetch(`/api/clients?clinicId=${activeClinic.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // Exclude current client
          setAllClientsForShare(data.filter((c: any) => c.id !== id));
        }
      } catch (err) {
        console.error("Error loading clients for share:", err);
      }
    }
  };

  const handleShareVoucherToggleClient = async (clientVoucherId: string, shareClientId: string, isCurrentlyShared: boolean) => {
    try {
      const res = await fetch(`/api/clients/${id}/vouchers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientVoucherId,
          action: "share",
          shareClientId,
          shareAction: isCurrentlyShared ? "remove" : "add",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar el bono");
      }
      // Refresh client data so sharedClientIds is updated
      await fetchClientDetails();
      // Update the modal's sharingClientVoucher state to reflect the change
      const updatedData = await fetch(`/api/clients/${id}/vouchers`).then(r => r.json()).catch(() => []);
      if (Array.isArray(updatedData)) {
        const updatedVoucher = updatedData.find((v: any) => v.id === clientVoucherId);
        if (updatedVoucher) {
          setSharingClientVoucher(updatedVoucher);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al compartir el bono.");
    }
  };

  // Budget Handlers
  const handleOpenBudgetModal = (budget: any = null) => {
    if (budget) {
      setEditingBudget(budget);
      setBudgetModalTitle("Editar Presupuesto");
      setBudgetTitleInput(budget.title);
      setBudgetStatusSelect(budget.status);
      try {
        setBudgetItems(JSON.parse(budget.itemsJson));
      } catch (e) {
        setBudgetItems([]);
      }
    } else {
      setEditingBudget(null);
      setBudgetModalTitle("Nuevo Presupuesto");
      setBudgetTitleInput("");
      setBudgetStatusSelect("PENDING");
      setBudgetItems([]);
    }
    setShowBudgetModal(true);
  };

  const handleAddBudgetItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    const qty = parseInt(newItemQty) || 1;
    const tax = parseFloat(newItemTax) || 0;
    const discountVal = parseFloat(newItemDiscount) || 0;
    
    const subtotal = price * qty;
    // Discount: if type is %, compute percentage; if €, use fixed amount directly
    const discountAmount = newItemDiscountType === "%"
      ? (subtotal * discountVal) / 100
      : Math.min(discountVal, subtotal);
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    const total = subtotal - discountAmount + taxAmount;

    setBudgetItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: newItemName.trim(),
        price,
        qty,
        tax,
        discount: discountVal,
        discountType: newItemDiscountType,
        total
      }
    ]);

    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
    setNewItemDiscount("0");
  };

  const handleRemoveBudgetItem = (itemId: string) => {
    setBudgetItems(prev => prev.filter(item => item.id !== itemId));
  };

  const getBudgetTotal = () => {
    return budgetItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSaveBudget = async () => {
    if (!budgetTitleInput.trim()) {
      alert("Por favor, introduce un concepto o título para el presupuesto.");
      return;
    }
    if (budgetItems.length === 0) {
      alert("El presupuesto debe contener al menos un artículo.");
      return;
    }
    if (!activeClinic) return;

    const total = getBudgetTotal();
    const payload = {
      title: budgetTitleInput.trim(),
      clientId: id,
      clinicId: activeClinic.id,
      total,
      itemsJson: JSON.stringify(budgetItems),
      status: budgetStatusSelect,
    };

    try {
      let res;
      if (editingBudget) {
        res = await fetch(`/api/budgets/${editingBudget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowBudgetModal(false);
        fetchBudgets();
        toast.success("Presupuesto guardado correctamente.");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar presupuesto.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de red.");
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!budgetTitleInput.trim()) {
      toast.warning("Introduce un nombre para la plantilla.");
      return;
    }
    if (budgetItems.length === 0) {
      toast.warning("La plantilla debe contener al menos un artículo.");
      return;
    }
    if (!activeClinic) return;

    const total = getBudgetTotal();
    const payload = {
      name: budgetTitleInput.trim(),
      clinicId: activeClinic.id,
      total,
      itemsJson: JSON.stringify(budgetItems)
    };

    try {
      const res = await fetch("/api/budgets/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchBudgetTemplates();
        toast.success("Plantilla de presupuesto creada con éxito.");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al crear plantilla.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadTemplate = (template: any) => {
    if (!template) return;
    try {
      const items = JSON.parse(template.itemsJson);
      setBudgetItems(items);
      setBudgetTitleInput(template.name);
    } catch (e) {
      console.error("Error loading template items", e);
    }
  };

  const handleAcceptBudgetDirectly = async (budgetId: string, total: number) => {
    try {
      const res = await fetch(`/api/budgets/${budgetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED", total }),
      });
      if (res.ok) {
        fetchBudgets();
        toast.success("Presupuesto aceptado. Saldo monedero habilitado.");
      } else {
        toast.error("Error al aceptar presupuesto.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este presupuesto? Se enviará a la papelera.")) return;
    try {
      const res = await fetch(`/api/budgets/${budgetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchBudgets();
        toast.info("Presupuesto enviado a la papelera.");
      } else {
        toast.error("Error al eliminar presupuesto.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintBudget = (budget: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let items: any[] = [];
    try {
      items = JSON.parse(budget.itemsJson);
    } catch (e) {}

    const itemsHtml = items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.name}</td>
        <td>${item.price.toFixed(2)}€</td>
        <td>${item.qty}</td>
        <td>${item.discount}%</td>
        <td>${item.tax}%</td>
        <td><strong>${item.total.toFixed(2)}€</strong></td>
      </tr>
    `).join("");

    const clientName = `${client?.firstName} ${client?.lastName || ""}`.trim();

    printWindow.document.write(`
      <html>
        <head>
          <title>Presupuesto #${budget.budgetNumber} - ${clientName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
            .header { border-bottom: 2px solid #334bfa; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
            .logo-section h1 { font-size: 28px; color: #334bfa; margin: 0 0 6px 0; font-weight: 800; letter-spacing: -1px; }
            .budget-info { font-size: 13px; text-align: right; line-height: 1.6; }
            .budget-info h2 { font-size: 20px; margin: 0 0 8px 0; color: #111; }
            .parties { display: flex; justify-content: space-between; gap: 40px; margin-bottom: 40px; }
            .party-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.6; }
            .party-box h3 { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 11px; }
            .total-row { background: #f8fafc; font-size: 16px; }
            .footer-notes { margin-top: 60px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; line-height: 1.6; }
            .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
            .signature-box { border-top: 1px dashed #94a3b8; width: 250px; text-align: center; padding-top: 8px; font-size: 12px; color: #475569; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <h1>${client?.clinic.name || "CLIFAV"}</h1>
              <div style="font-size: 12px; color: #64748b;">${client?.clinic.address || ""}</div>
            </div>
            <div class="budget-info">
              <h2>PRESUPUESTO</h2>
              <div><strong>Nº Presupuesto:</strong> PRE-${budget.budgetNumber}</div>
              <div><strong>Fecha Emisión:</strong> ${new Date(budget.createdAt).toLocaleDateString("es-ES")}</div>
              <div><strong>Estado:</strong> ${budget.status === "ACCEPTED" ? "Aceptado" : budget.status === "REJECTED" ? "Rechazado" : "Pendiente"}</div>
            </div>
          </div>

          <div class="parties">
            <div class="party-box">
              <h3>Datos del Paciente</h3>
              <div><strong>Nombre:</strong> ${clientName}</div>
              <div><strong>Teléfono:</strong> ${client?.phone || "-"}</div>
              <div><strong>Email:</strong> ${client?.email || "-"}</div>
              <div><strong>${identityLabel}:</strong> ${client?.dniNif || "-"}</div>
            </div>
            <div class="party-box">
              <h3>Concepto General</h3>
              <div style="font-size: 15px; font-weight: 600; color: #334bfa; margin-bottom: 6px;">${budget.title}</div>
              <div style="color: #64748b;">Presupuesto de tratamiento clínico personalizado. Válido por 30 días naturales a partir de la fecha de emisión.</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Concepto / Tratamiento</th>
                <th>Precio Unit.</th>
                <th>Cant.</th>
                <th>Dcto.</th>
                <th>IVA</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="5"></td>
                <td style="text-align: right; font-weight: bold; color: #475569;">TOTAL PRESUPUESTO:</td>
                <td style="color: #334bfa; font-weight: 800; font-size: 18px;">${budget.total.toFixed(2)}€</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-notes">
            <strong>Condiciones de Aceptación:</strong> Los precios indicados incluyen los impuestos aplicables. En caso de aprobación del presente presupuesto, se habilitará como saldo monedero CLIFAV para el consumo y cobro directo de sus citas agendadas de forma automática.
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

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    let birthDateParsed = null;
    if (formBirthDate) {
      if (formBirthDate.includes("/")) {
        const parts = formBirthDate.split("/");
        birthDateParsed = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        birthDateParsed = formBirthDate;
      }
    }

    const payload = {
      firstName: formFirstName,
      lastName: formLastName,
      phone: formPhone,
      email: formEmail,
      dniNif: formDniNif,
      birthDate: birthDateParsed,
      gender: formGender,
      address: formAddress,
      municipality: formMunicipality,
      postalCode: formPostalCode,
      country: formCountry,
      iban: formIban,
      bic: formBic,
      tags: formTags,
      
      // Medical details
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

      // switches
      isSelfEmployed: formIsSelfEmployed,
      isCompany: formIsCompany,
      receivesReminders: formReceivesReminders,
      occupation: client.occupation,
      maritalStatus: client.maritalStatus,
    };

    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowFullEditModal(false);
      fetchClientDetails();
      fetchSidebarClientsList();
      toast.success("Datos del cliente actualizados con éxito.");
    } else {
      toast.error("Error al actualizar los datos.");
    }
  };

  const handleToggleSwitch = async (field: "isSelfEmployed" | "isCompany" | "receivesReminders", currentValue: boolean) => {
    if (!client) return;
    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        dniNif: client.dniNif,
        birthDate: client.birthDate ? client.birthDate.split("T")[0] : null,
        gender: client.gender,
        address: client.address,
        municipality: client.municipality,
        postalCode: client.postalCode,
        country: client.country,
        iban: client.iban,
        bic: client.bic,
        tags: client.tags,
        aestheticTreatments: client.aestheticTreatments,
        allergies: client.allergies,
        medication: client.medication,
        medicalHistory: client.medicalHistory,
        otherNotes: client.otherNotes,
        tutorName: client.tutorName,
        tutorLastName: client.tutorLastName,
        tutorDniNif: client.tutorDniNif,
        tutorPhone: client.tutorPhone,
        tutorEmail: client.tutorEmail,
        tutorAddress: client.tutorAddress,
        tutorPostalCode: client.tutorPostalCode,
        tutorMunicipality: client.tutorMunicipality,
        
        isSelfEmployed: client.isSelfEmployed,
        isCompany: client.isCompany,
        receivesReminders: client.receivesReminders,
        occupation: client.occupation,
        maritalStatus: client.maritalStatus,
        [field]: !currentValue
      })
    });
    if (res.ok) {
      fetchClientDetails();
    }
  };

  const startInlineEdit = (fieldKey: string, currentValue: string) => {
    setEditingField(fieldKey);
    setInlineEditValue(currentValue);
  };

  const cancelInlineEdit = () => {
    setEditingField(null);
    setInlineEditValue("");
  };

  const saveInlineEdit = async (fieldKey: string) => {
    if (!client) return;
    
    let updatedPayload: any = {
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      dniNif: client.dniNif,
      birthDate: client.birthDate ? client.birthDate.split("T")[0] : null,
      gender: client.gender,
      address: client.address,
      municipality: client.municipality,
      postalCode: client.postalCode,
      country: client.country,
      iban: client.iban,
      bic: client.bic,
      tags: client.tags,
      aestheticTreatments: client.aestheticTreatments,
      allergies: client.allergies,
      medication: client.medication,
      medicalHistory: client.medicalHistory,
      otherNotes: client.otherNotes,
      tutorName: client.tutorName,
      tutorLastName: client.tutorLastName,
      tutorDniNif: client.tutorDniNif,
      tutorPhone: client.tutorPhone,
      tutorEmail: client.tutorEmail,
      tutorAddress: client.tutorAddress,
      tutorPostalCode: client.tutorPostalCode,
      tutorMunicipality: client.tutorMunicipality,
      
      isSelfEmployed: client.isSelfEmployed,
      isCompany: client.isCompany,
      receivesReminders: client.receivesReminders,
      occupation: client.occupation,
      maritalStatus: client.maritalStatus,
    };
    
    updatedPayload[fieldKey] = inlineEditValue;
    
    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPayload),
    });
    
    if (res.ok) {
      setEditingField(null);
      fetchClientDetails();
      fetchSidebarClientsList();
    } else {
      alert("Error al actualizar campo");
    }
  };

  const handleTogglePermission = (userId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSavePermissions = async () => {
    if (!client) return;
    const res = await fetch("/api/clients/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientIds: [client.id],
        userIds: selectedPermissions
      })
    });
    if (res.ok) {
      toast.success("Permisos actualizados correctamente.");
      fetchClientDetails();
    } else {
      toast.error("Error al actualizar permisos.");
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic || !createFirstName || !createLastName) return;

    // Convert birth date from DD/MM/YYYY to YYYY-MM-DD if needed
    let birthDateParsed = null;
    if (createBirthDate) {
      if (createBirthDate.includes("/")) {
        const parts = createBirthDate.split("/");
        if (parts.length === 3) {
          birthDateParsed = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      } else {
        birthDateParsed = createBirthDate;
      }
    }

    const payload = {
      firstName: createFirstName,
      lastName: createLastName,
      phone: createPhone,
      email: createEmail,
      dniNif: createDniNif,
      birthDate: birthDateParsed,
      gender: createGender,
      address: createAddress,
      municipality: createMunicipality,
      postalCode: createPostalCode,
      country: createCountry,
      iban: createIban,
      bic: createBic,
      tags: createTags,
      clinicId: activeClinic.id,
      isSelfEmployed: createIsSelfEmployed,
      isCompany: createIsCompany,
      receivesReminders: createReceivesReminders,
      
      // Medical notes
      aestheticTreatments: createAestheticTreatments,
      allergies: createAllergies,
      medication: createMedication,
      medicalHistory: createMedicalHistory,
      otherNotes: createOtherNotes,
      
      // Tutor details
      tutorName: createTutorName,
      tutorLastName: createTutorLastName,
      tutorDniNif: createTutorDniNif,
      tutorPhone: createTutorPhone,
      tutorEmail: createTutorEmail,
      tutorAddress: createTutorAddress,
      tutorPostalCode: createTutorPostalCode,
      tutorMunicipality: createTutorMunicipality,
    };

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const newClient = await res.json();
      setShowCreateModal(false);
      setCreationTab("general");
      
      // Reset states
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePhone("");
      setCreateEmail("");
      setCreateDniNif("");
      setCreateBirthDate("");
      setCreateAddress("");
      setCreateMunicipality("");
      setCreatePostalCode("");
      setCreateCountry("España");
      setCreateIban("");
      setCreateBic("");
      setCreateTags("");
      setCreateGender("Femenino");
      setCreateAestheticTreatments("");
      setCreateAllergies("");
      setCreateMedication("");
      setCreateMedicalHistory("");
      setCreateOtherNotes("");
      setCreateTutorName("");
      setCreateTutorLastName("");
      setCreateTutorDniNif("");
      setCreateTutorPhone("");
      setCreateTutorEmail("");
      setCreateTutorAddress("");
      setCreateTutorPostalCode("");
      setCreateTutorMunicipality("");
      setCreateIsSelfEmployed(false);
      setCreateIsCompany(false);
      setCreateReceivesReminders(true);
      
      // Update lists and navigate to details
      fetchSidebarClientsList();
      toast.success("Cliente creado correctamente.");
      router.push(`/dashboard/contacts/${newClient.id}`);
    } else {
      toast.error("Error al crear cliente.");
    }
  };

  const handleSingleDelete = async () => {
    if (!client) return;
    if (typeof window !== "undefined" && !window.confirm(`¿Estás seguro de que quieres eliminar a ${client.firstName} ${client.lastName}? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Force full reload so the contacts list re-fetches and excludes the deleted client
        window.location.href = "/dashboard/contacts";
      } else {
        toast.error("Error al eliminar cliente.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red.");
    }
  };

  // Variable replacement helper for templates
  const resolveTemplateVariables = (rawContent: string) => {
    if (!client) return rawContent;
    const today = new Date().toLocaleDateString("es-ES");

    // Fetch next appointment to resolve cita/empleado fields
    const sortedApps = client.appointments ? [...client.appointments].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [];
    const now = new Date();
    const nextApp = sortedApps.find(a => new Date(a.start) >= now) || sortedApps[sortedApps.length - 1];

    // Fetch unpaid sales to calculate debt
    const unpaidSales = client.sales ? client.sales.filter((s: any) => s.status !== "PAID") : [];
    const debt = unpaidSales.reduce((acc: number, s: any) => acc + s.total, 0);

    let resolved = rawContent;

    // 1. Reemplazar variables clásicas
    const replacements: Record<string, string> = {
      "{{client.firstName}}": `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.firstName}</span>`,
      "{{client.lastName}}": `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.lastName}</span>`,
      "{{client.dniNif}}": `<span class="var-badge" style="border:1px solid #db2777; color:#db2777; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.dniNif || "[Falta DNI]"}</span>`,
      "{{client.birthDate}}": `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.birthDate ? new Date(client.birthDate).toLocaleDateString("es-ES") : "[Falta F. Nac.]"}</span>`,
      "{{client.allergies}}": `<span class="var-badge" style="background:#ef4444; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.allergies || "Ninguna"}</span>`,
      "{{clinic.name}}": `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.name}</span>`,
      "{{clinic.municipality}}": `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.address.split(",").slice(-1)[0]?.trim() || "Madrid"}</span>`,
      "{{document.date}}": `<span class="var-badge" style="background:#2563eb; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${today}</span>`,
      "{{signature.client}}": `<span class="var-badge var-signature" data-type="ordinary" style="background:#eab308; color:black; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_ordinaria]</span>`,
      "{{signature.certified}}": `<span class="var-badge var-signature" data-type="certified" style="background:#ca8a04; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_certificada]</span>`,
      "{{signature.digital}}": `<span class="var-badge var-signature" data-type="digital" style="background:#06b6d4; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_digital]</span>`,
      
      // Mappings for notification template variables
      "{{Cliente:Nombre}}": `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.firstName}</span>`,
      "{{Cliente:Apellidos}}": `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.lastName}</span>`,
      "{{Cliente:Dirección_Cliente}}": `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.address || "No registrada"}</span>`,
      "{{Nombre_Consulta}}": `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.name}</span>`,
      "{{Dirección_Consulta}}": `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.address}</span>`,
      
      "{{Fecha_Hora_Cita}}": `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp ? new Date(nextApp.start).toLocaleString("es-ES") : today + " --:--"}</span>`,
      "{{Fecha_larga}}": `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp ? new Date(nextApp.start).toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : today}</span>`,
      "{{Hora_Cita}}": `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp ? new Date(nextApp.start).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>`,
      "{{Nombre_Servicio}}": `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.service?.name || "Servicio"}</span>`,
      "{{Recurso}}": `<span class="var-badge" style="background:#8b5cf6; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.room || "Cabina"}</span>`,
      "{{Zona_horaria}}": `<span class="var-badge" style="background:#8b5cf6; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">Europe/Madrid</span>`,
      
      "{{Link_VideoConsulta}}": `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.videoLink || "http://localhost:3000/videoconsulta"}</span>`,
      "{{Link_Cancelar_Cita}}": `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/cancel-appointment</span>`,
      "{{Link_Mover_Cita}}": `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/move-appointment</span>`,
      "{{Link_Confirmar_Cita}}": `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/confirm-appointment</span>`,
      "{{Link_Pago_Online}}": `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/pay</span>`,
      
      "{{Empleado_Nombre_Completo}}": `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user ? nextApp.user.firstName + " " + (nextApp.user.lastName || "") : "Terapeuta"}</span>`,
      "{{Empleado_Nombre}}": `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.firstName || "Terapeuta"}</span>`,
      "{{Empleado_Apellidos}}": `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.lastName || ""}</span>`,
      "{{Empleado_Correo}}": `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.email || ""}</span>`,
      "{{Empleado_DNI}}": `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.dniNif || ""}</span>`,
      "{{Empleado_Teléfono}}": `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.phone || ""}</span>`,
      
      "{{Deuda}}": `<span class="var-badge" style="background:#f43f5e; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${debt.toFixed(2)} €</span>`,
    };

    Object.entries(replacements).forEach(([variable, value]) => {
      resolved = resolved.replaceAll(variable, value);
    });

    // 2. Reemplazar badges de texto sin resolver
    resolved = resolved.replaceAll("[Nombre]", client.firstName);
    resolved = resolved.replaceAll("[Apellidos]", client.lastName);
    resolved = resolved.replaceAll("[Direccion_cliente]", client.address || "No registrada");
    resolved = resolved.replaceAll("[NIF]", client.dniNif || "[Falta DNI]");
    resolved = resolved.replaceAll("[Fecha_nacimiento]", client.birthDate ? new Date(client.birthDate).toLocaleDateString("es-ES") : "[Falta F. Nac.]");
    resolved = resolved.replaceAll("[Alergias]", client.allergies || "Ninguna");
    resolved = resolved.replaceAll("[Nombre_clinica]", client.clinic.name);
    resolved = resolved.replaceAll("[Direccion_consulta]", client.clinic.address);
    resolved = resolved.replaceAll("[Municipio_clinica]", client.clinic.address.split(",").slice(-1)[0]?.trim() || "Madrid");
    resolved = resolved.replaceAll("[Fecha_documento]", today);
    
    resolved = resolved.replaceAll("[Fecha_hora_cita]", nextApp ? new Date(nextApp.start).toLocaleString("es-ES") : today + " --:--");
    resolved = resolved.replaceAll("[Fecha_larga]", nextApp ? new Date(nextApp.start).toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : today);
    resolved = resolved.replaceAll("[Hora_cita]", nextApp ? new Date(nextApp.start).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' }) : "--:--");
    resolved = resolved.replaceAll("[Nombre_servicio]", nextApp?.service?.name || "Servicio");
    resolved = resolved.replaceAll("[Recurso]", nextApp?.room || "Cabina");
    resolved = resolved.replaceAll("[Zona_horaria]", "Europe/Madrid");
    
    resolved = resolved.replaceAll("[Link_videoconsulta]", nextApp?.videoLink || "http://localhost:3000/videoconsulta");
    resolved = resolved.replaceAll("[Link_cancelar_cita]", "http://localhost:3000/cancel-appointment");
    resolved = resolved.replaceAll("[Link_mover_cita]", "http://localhost:3000/move-appointment");
    resolved = resolved.replaceAll("[Link_confirmar_cita]", "http://localhost:3000/confirm-appointment");
    resolved = resolved.replaceAll("[Link_pago_online]", "http://localhost:3000/pay");
    
    resolved = resolved.replaceAll("[Empleado_nombre_completo]", nextApp?.user ? nextApp.user.firstName + " " + (nextApp.user.lastName || "") : "Terapeuta");
    resolved = resolved.replaceAll("[Empleado_nombre]", nextApp?.user?.firstName || "Terapeuta");
    resolved = resolved.replaceAll("[Empleado_apellidos]", nextApp?.user?.lastName || "");
    resolved = resolved.replaceAll("[Empleado_correo]", nextApp?.user?.email || "");
    resolved = resolved.replaceAll("[Empleado_dni]", nextApp?.user?.dniNif || "");
    resolved = resolved.replaceAll("[Empleado_telefono]", nextApp?.user?.phone || "");
    
    resolved = resolved.replaceAll("[Deuda]", debt.toFixed(2) + " €");

    return resolved;
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!client) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      setGeneratedDocContent("");
      setGeneratedDocName("");
      return;
    }

    setGeneratedDocName(template.name);
    setShowDocHtmlModal(false);
    const resolved = resolveTemplateVariables(template.content);
    setGeneratedDocContent(resolved);

    // Initial contentEditable sync
    if (associateEditorRef.current) {
      associateEditorRef.current.innerHTML = resolved;
    }
  };

  const handleDocWizardContinue = () => {
    const content = associateEditorRef.current ? associateEditorRef.current.innerHTML : generatedDocContent;

    // Extract all signature fields from the content
    const fields: Array<{id: string; type: "ordinary" | "doctor_ordinary" | "certified"}> = [];
    
    // Find ordinary patient signature badges
    const ordinaryMatches = content.match(/data-type=["']?ordinary["']?(?!_)/gi) || [];
    ordinaryMatches.forEach((_, idx) => {
      fields.push({ id: `ordinary_${idx}`, type: "ordinary" });
    });
    // Also detect text-based [Firma Paciente] or [Campo_firma_ordinaria]
    if (ordinaryMatches.length === 0 && (/\[Campo_firma_ordinaria\]/i.test(content) || /\[Firma Paciente\]/i.test(content))) {
      fields.push({ id: "ordinary_0", type: "ordinary" });
    }

    // Find doctor ordinary signature badges
    const doctorMatches = content.match(/data-type=["']?doctor_ordinary["']?/gi) || [];
    doctorMatches.forEach((_, idx) => {
      fields.push({ id: `doctor_ordinary_${idx}`, type: "doctor_ordinary" });
    });
    // Also detect text-based [Firma Médico]
    if (doctorMatches.length === 0 && /\[Firma M[eé]dico\]/i.test(content)) {
      fields.push({ id: "doctor_ordinary_0", type: "doctor_ordinary" });
    }

    // Find certified signature badges
    const certifiedMatches = content.match(/data-type=["']?certified["']?/gi) || [];
    certifiedMatches.forEach((_, idx) => {
      fields.push({ id: `certified_${idx}`, type: "certified" });
    });
    // Also detect text-based [Campo_firma_certificada] or [Firma Certificada]
    if (certifiedMatches.length === 0 && (/\[Campo_firma_certificada\]/i.test(content) || /\[Firma Certificada\]/i.test(content))) {
      fields.push({ id: "certified_0", type: "certified" });
    }

    // Reset inline signatures for the new step
    setDocSignatureFields(fields as any);
    setInlineSignatures({});
    inlineCanvasRefs.current = {};

    // Always go to Step 2 for both types — step 2 handles the distinction
    setDocWizardStep("preview_and_sign");
  };


  const handleDocCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (associateEditorRef.current) {
      setGeneratedDocContent(associateEditorRef.current.innerHTML);
    }
  };

  const handleDocEditorInput = () => {
    if (associateEditorRef.current) {
      setGeneratedDocContent(associateEditorRef.current.innerHTML);
    }
  };

  const handleInsertDocVariable = (variable: string) => {
    let html = "";
    if (!client) return;
    const today = new Date().toLocaleDateString("es-ES");

    // Fetch next appointment for dynamic values in case needed
    const sortedApps = client.appointments ? [...client.appointments].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) : [];
    const now = new Date();
    const nextApp = sortedApps.find(a => new Date(a.start) >= now) || sortedApps[sortedApps.length - 1];

    // Fetch debt
    const unpaidSales = client.sales ? client.sales.filter((s: any) => s.status !== "PAID") : [];
    const debt = unpaidSales.reduce((acc: number, s: any) => acc + s.total, 0);

    if (variable === "{{client.firstName}}" || variable === "{{Cliente:Nombre}}") {
      html = `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.firstName}</span>`;
    } else if (variable === "{{client.lastName}}" || variable === "{{Cliente:Apellidos}}") {
      html = `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.lastName}</span>`;
    } else if (variable === "{{Cliente:Dirección_Cliente}}") {
      html = `<span class="var-badge" style="background:#0d9488; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.address || "No registrada"}</span>`;
    } else if (variable === "{{client.dniNif}}" || variable === "{{Empleado_DNI}}") {
      html = `<span class="var-badge" style="border:1px solid #db2777; color:#db2777; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.dniNif || "[Falta DNI]"}</span>`;
    } else if (variable === "{{document.date}}") {
      html = `<span class="var-badge" style="background:#2563eb; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${today}</span>`;
    } else if (variable === "{{signature.client}}") {
      html = '<span class="var-badge var-signature" data-type="ordinary" style="background:#eab308; color:black; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">✍️ [Firma Paciente]</span>';
    } else if (variable === "{{signature.doctor}}") {
      html = '<span class="var-badge var-signature" data-type="doctor_ordinary" style="background:#3b82f6; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">✍️ [Firma Médico]</span>';
    } else if (variable === "{{signature.certified}}") {
      html = '<span class="var-badge var-signature" data-type="certified" style="background:#ca8a04; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">🔏 [Firma Certificada]</span>';
    } else if (variable === "{{signature.digital}}") {
      html = '<span class="var-badge var-signature" data-type="digital" style="background:#06b6d4; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_digital]</span>';
    } else if (variable === "{{clinic.name}}" || variable === "{{Nombre_Consulta}}") {
      html = `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.name}</span>`;
    } else if (variable === "{{Dirección_Consulta}}") {
      html = `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.address}</span>`;
    } else if (variable === "{{clinic.municipality}}") {
      html = `<span class="var-badge" style="background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${client.clinic.address.split(",").slice(-1)[0]?.trim() || "Madrid"}</span>`;
    } else if (variable === "{{Fecha_Hora_Cita}}") {
      html = `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp ? new Date(nextApp.start).toLocaleString("es-ES") : today + " --:--"}</span>`;
    } else if (variable === "{{Fecha_larga}}") {
      html = `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp ? new Date(nextApp.start).toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : today}</span>`;
    } else if (variable === "{{Hora_Cita}}") {
      html = `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp ? new Date(nextApp.start).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>`;
    } else if (variable === "{{Nombre_Servicio}}") {
      html = `<span class="var-badge" style="background:#6366f1; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.service?.name || "Servicio"}</span>`;
    } else if (variable === "{{Recurso}}") {
      html = `<span class="var-badge" style="background:#8b5cf6; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.room || "Cabina"}</span>`;
    } else if (variable === "{{Zona_horaria}}") {
      html = `<span class="var-badge" style="background:#8b5cf6; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">Europe/Madrid</span>`;
    } else if (variable === "{{Link_VideoConsulta}}") {
      html = `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.videoLink || "http://localhost:3000/videoconsulta"}</span>`;
    } else if (variable === "{{Link_Cancelar_Cita}}") {
      html = `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/cancel-appointment</span>`;
    } else if (variable === "{{Link_Mover_Cita}}") {
      html = `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/move-appointment</span>`;
    } else if (variable === "{{Link_Confirmar_Cita}}") {
      html = `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/confirm-appointment</span>`;
    } else if (variable === "{{Link_Pago_Online}}") {
      html = `<span class="var-badge" style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">http://localhost:3000/pay</span>`;
    } else if (variable === "{{Empleado_Nombre_Completo}}") {
      html = `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user ? nextApp.user.firstName + " " + (nextApp.user.lastName || "") : "Terapeuta"}</span>`;
    } else if (variable === "{{Empleado_Nombre}}") {
      html = `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.firstName || "Terapeuta"}</span>`;
    } else if (variable === "{{Empleado_Apellidos}}") {
      html = `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.lastName || ""}</span>`;
    } else if (variable === "{{Empleado_Correo}}") {
      html = `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.email || ""}</span>`;
    } else if (variable === "{{Empleado_Teléfono}}") {
      html = `<span class="var-badge" style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${nextApp?.user?.phone || ""}</span>`;
    } else if (variable === "{{Deuda}}") {
      html = `<span class="var-badge" style="background:#f43f5e; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">${debt.toFixed(2)} €</span>`;
    } else {
      html = variable;
    }

    const selection = window.getSelection();
    if (!selection) return;

    const container = associateEditorRef.current;
    if (!container) return;

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

    const insertedNode = fragment.lastChild;
    range.insertNode(fragment);
    
    if (insertedNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(insertedNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    setGeneratedDocContent(container.innerHTML);
  };

  // Canvas Signature pad functions
  useEffect(() => {
    if (!showSignModal || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [showSignModal]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignedDocument = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !client) return;

    const signatureBase64 = canvas.toDataURL("image/png");

    if (activeSignee === "patient") {
      setPatientSignature(signatureBase64);
    } else if (activeSignee === "doctor") {
      setDoctorSignature(signatureBase64);
    }

    setShowSignModal(false);
  };

  const handlePrintDocument = () => {
    const printContent = associateEditorRef.current ? associateEditorRef.current.innerHTML : generatedDocContent;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${generatedDocName}</title>
          <style>
            @page { size: legal; margin: 15mm; }
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #334155; }
            img { max-height: 90px; }
          </style>
        </head>
        <body>
          <div>${printContent}</div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handlePrintSignedDocument = (doc: SignedDocument) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${doc.name}</title>
          <style>
            @page { size: legal; margin: 15mm; }
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #334155; }
            img { max-height: 90px; }
          </style>
        </head>
        <body>
          <div>${doc.content}</div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSaveAssociatedDocument = async () => {
    if (!client) return;

    let finalContent = generatedDocContent;

    // Replace ordinary signature fields with their inline-signed images
    let ordinaryIdx = 0;
    let certifiedIdx = 0;
    
    // Replace each signature badge with corresponding inline signature image
    finalContent = finalContent.replace(
      /(<span[^>]*data-type=["']?ordinary["']?[^>]*>)(.*?)(<\/span>)/gi,
      (_match, _open, _inner, _close) => {
        const fieldId = `ordinary_${ordinaryIdx++}`;
        const sig = inlineSignatures[fieldId] || patientSignature;
        if (sig) {
          return `<div style="display:inline-block; text-align:center; vertical-align:middle; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; min-width:160px; min-height:60px;">
            <img src="${sig}" style="max-height:80px; max-width:180px; display:block; margin:0 auto;" alt="Firma Paciente" />
            <span style="font-size:10px; color:#64748b; display:block; margin-top:4px;">Firmado el ${new Date().toLocaleDateString("es-ES")}</span>
          </div>`;
        }
        return `<div style="display:inline-block; border:1px dashed #cbd5e1; border-radius:6px; padding:8px 12px; min-width:160px; min-height:60px; text-align:center; color:#94a3b8; font-size:12px; vertical-align:middle;">Sin firmar</div>`;
      }
    );

    // Replace doctor ordinary signature fields
    let doctorOrdinaryIdx = 0;
    finalContent = finalContent.replace(
      /(<span[^>]*data-type=["']?doctor_ordinary["']?[^>]*>)(.*?)(<\/span>)/gi,
      (_match, _open, _inner, _close) => {
        const fieldId = `doctor_ordinary_${doctorOrdinaryIdx++}`;
        const sig = inlineSignatures[fieldId] || doctorSignature;
        if (sig) {
          return `<div style="display:inline-block; text-align:center; vertical-align:middle; border:1px solid #dbeafe; border-radius:6px; padding:8px 12px; min-width:160px; min-height:60px;">
            <img src="${sig}" style="max-height:80px; max-width:180px; display:block; margin:0 auto;" alt="Firma Médico" />
            <span style="font-size:10px; color:#2563eb; display:block; margin-top:4px;">Firmado por el Médico el ${new Date().toLocaleDateString("es-ES")}</span>
          </div>`;
        }
        return `<div style="display:inline-block; border:1px dashed #dbeafe; border-radius:6px; padding:8px 12px; min-width:160px; min-height:60px; text-align:center; color:#93c5fd; font-size:12px; vertical-align:middle;">Sin firmar (Médico)</div>`;
      }
    );

    // Replace certified signature fields — these require remote, save as "pendiente"
    finalContent = finalContent.replace(
      /(<span[^>]*data-type=["']?certified["']?[^>]*>)(.*?)(<\/span>)/gi,
      () => {
        certifiedIdx++;
        return `<div style="display:inline-block; border:1px dashed #f59e0b; border-radius:6px; padding:8px 12px; min-width:160px; min-height:60px; text-align:center; color:#d97706; font-size:12px; vertical-align:middle; background:rgba(251,191,36,0.08);">⏳ Firma Certificada Pendiente</div>`;
      }
    );

    // Fallback: handle text-based badges not in span tags
    if (patientSignature) {
      const patientSigHTML = `<div style="display:inline-block; text-align:center;">
        <img src="${patientSignature}" style="max-height:80px; max-width:180px; display:block; margin:0 auto;" alt="Firma Paciente" />
        <span style="font-size:10px; color:#64748b; display:block; margin-top:4px;">Firmado el ${new Date().toLocaleDateString("es-ES")}</span>
      </div>`;
      finalContent = finalContent.replaceAll("[Campo_firma_ordinaria]", patientSigHTML);
    }

    const firstInlineSig = Object.values(inlineSignatures).find(Boolean);

    const payload = {
      clientId: client.id,
      name: generatedDocName,
      content: finalContent,
      signature: firstInlineSig || patientSignature || doctorSignature || null,
    };

    const res = await fetch("/api/documents/signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowAssociateDocModal(false);
      setSelectedTemplateId("");
      setGeneratedDocContent("");
      setGeneratedDocName("");
      setPatientSignature(null);
      setDoctorSignature(null);
      setInlineSignatures({});
      setDocSignatureFields([]);
      setDocWizardStep("select_and_edit");
      fetchClientDetails(true);
      toast.success("Documento guardado y asociado correctamente.");
    } else {
      toast.error("Error al guardar el documento firmado.");
    }
  };

  const handleCreateRemoteSignatureRequest = async (autoShareChannel?: "whatsapp" | "email" | null) => {
    if (!client) return;

    const latestContent = associateEditorRef.current ? associateEditorRef.current.innerHTML : generatedDocContent;
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();

    const payload = {
      clientId: client.id,
      name: generatedDocName,
      content: latestContent,
      signature: null,
      pin: pinCode,
    };

    try {
      const res = await fetch("/api/documents/signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const signedDoc = await res.json();
        const link = `${window.location.origin}/sign/${signedDoc.id}`;
        setRemoteSignLink(link);
        setRemoteSignPin(pinCode);
        setShowSignatureMethodModal(false);
        setShowRemoteSignModal(true);
        setShowAssociateDocModal(false);
        
        setSelectedTemplateId("");
        setGeneratedDocContent("");
        setGeneratedDocName("");
        fetchClientDetails(true);

        // Auto-share triggers
        if (autoShareChannel === "whatsapp") {
          handleSendWhatsAppSignature(link, pinCode, generatedDocName || signedDoc.name);
        } else if (autoShareChannel === "email") {
          handleOpenEmailModal(link, pinCode, generatedDocName || signedDoc.name);
        }
      } else {
        alert("Error al generar la solicitud de firma remota");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al conectar con el servidor");
    }
  };

  const getAge = (birthDateString?: string) => {
    if (!birthDateString) return "";
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return t("timezone") === "Time Zone" ? `(${age} years old)` : t("timezone") === "Zona horària" ? `(${age} anys)` : t("timezone") === "Ordu-eremua" ? `(${age} urte)` : `(${age} años)`;
  };

  const filteredSidebarClients = sidebarClients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(sidebarSearch)) ||
    (c.dniNif && c.dniNif.toLowerCase().includes(sidebarSearch.toLowerCase()))
  );

  if (loading) {
    return <div className={styles.loadingState}>{t("timezone") === "Time Zone" ? "Loading patient profile..." : t("timezone") === "Zona horària" ? "Carregant fitxa del pacient..." : t("timezone") === "Ordu-eremua" ? "Pazientearen fitxa kargatzen..." : "Cargando ficha del paciente..."}</div>;
  }

  if (!client) return null;

  const hasDigitalSignature = /data-type=["']?digital["']?/i.test(generatedDocContent) ||
                              /\[Campo_firma_digital\]/i.test(generatedDocContent) ||
                              generatedDocContent.toLowerCase().includes('firma_digital') ||
                              generatedDocContent.toLowerCase().includes('signature.digital');

  const showPatientSignatureBox = !hasDigitalSignature && (
    /\[Campo_firma_ordinaria\]/i.test(generatedDocContent) ||
    generatedDocContent.toLowerCase().includes('firma_ordinaria') ||
    generatedDocContent.toLowerCase().includes('signature.client') ||
    /data-type=["']?ordinary["']?/i.test(generatedDocContent)
  );

  const showDoctorSignatureBox = !hasDigitalSignature && (
    /\[Campo_firma_certificada\]/i.test(generatedDocContent) ||
    generatedDocContent.toLowerCase().includes('firma_certificada') ||
    generatedDocContent.toLowerCase().includes('signature.certified') ||
    /data-type=["']?certified["']?/i.test(generatedDocContent)
  );

  return (
    <div className={styles.container}>
      {/* LEFT COLUMN: CLIENT PROFILE CARD */}
      <aside className={styles.profileSidebar}>
        {/* Back Nav Link */}
        <div className={styles.backNav}>
          <Link href="/dashboard/contacts" className={styles.backLink}>
            <Icons.ChevronLeft size={16} />
            <span>{t("backToContacts")}</span>
          </Link>
        </div>

        <div className={styles.patientProfileCard}>
          <div className={styles.avatar}>
            {client.firstName.charAt(0)}{client.lastName.charAt(0)}
          </div>
          
          <div className={styles.profileHeaderInfo}>
            <h1 className={styles.clientName}>{client.firstName} {client.lastName}</h1>
            <span className={styles.clientNumberBadge}>{t("clientCol")} #{client.clientNumber}</span>
          </div>

          {/* Warnings */}
          {(client.allergies || client.medication) && (
            <div className={styles.warningPills}>
              {client.allergies && (
                <span className={styles.allergyPill}>⚠️ Alergias</span>
              )}
              {client.medication && (
                <span className={styles.medicationPill}>💊 Medicación</span>
              )}
            </div>
          )}

          {/* Contact Details */}
          <div className={styles.contactSection}>
            {client.phone && (
              <div className={styles.contactItem}>
                <Icons.Phone size={14} className={styles.contactIcon} />
                <span>{showPersonalData ? client.phone : "******"}</span>
                <a 
                  href={`https://web.whatsapp.com/send?phone=${client.phone.replace(/\+/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsAppIconLink}
                  title="WhatsApp"
                  style={{ marginLeft: "auto" }}
                >
                  <WhatsAppIcon size={15} />
                </a>
              </div>
            )}
            {client.email && (
              <div className={styles.contactItem}>
                <Icons.Mail size={14} className={styles.contactIcon} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {showPersonalData ? client.email : "******"}
                </span>
              </div>
            )}
            {client.dniNif && (
              <div className={styles.contactItem}>
                <Icons.Award size={14} className={styles.contactIcon} />
                <span>{identityLabel}: {showPersonalData ? client.dniNif : "******"}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {client.tags && (
            <div className={styles.tagChips}>
              {client.tags.split(",").map((tag) => (
                <span key={tag} className={styles.tagBadge}>{tag.trim()}</span>
              ))}
            </div>
          )}

          {/* KPI Metrics Grid */}
          <div className={styles.kpiSection}>
            <div className={styles.kpiTile}>
              <span className={styles.kpiLabel}>Gastado</span>
              <span className={styles.kpiValue}>
                {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                  client.sales?.reduce((s: number, sale: Sale) => s + sale.total, 0) || 0
                )}
              </span>
            </div>
            <div className={styles.kpiTile}>
              <span className={styles.kpiLabel}>Citas</span>
              <span className={styles.kpiValue} style={{ color: "var(--text-primary)" }}>
                {(client.appointments || []).filter((a: any) => !a.deletedAt).length}
              </span>
            </div>
            <div className={styles.kpiTile}>
              <span className={styles.kpiLabel}>Última</span>
              <span className={styles.kpiValueSmall}>
                {(() => {
                  const past = (client.appointments || []).filter((a: any) => !a.deletedAt && new Date(a.start) <= new Date()).sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());
                  if (!past.length) return "—";
                  const diff = Math.floor((Date.now() - new Date(past[0].start).getTime()) / (1000 * 60 * 60 * 24));
                  if (diff === 0) return "Hoy";
                  if (diff === 1) return "Ayer";
                  if (diff < 7) return `Hace ${diff}d`;
                  if (diff < 30) return `Hace ${Math.floor(diff/7)}sem`;
                  return `Hace ${Math.floor(diff/30)}m`;
                })()}
              </span>
            </div>
          </div>

          {/* Próxima cita mini-widget / Agendar Cita */}
          <div className={styles.appointmentActionArea}>
            {(() => {
              const next = (client.appointments || []).filter((a: any) => !a.deletedAt && new Date(a.start) > new Date()).sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
              return next ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "rgba(0,143,163,0.08)", border: "1px solid rgba(0,143,163,0.2)",
                  borderRadius: "10px", padding: "8px 12px", width: "100%"
                }}>
                  <Icons.Calendar size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--primary)", textTransform: "uppercase" }}>Próxima cita</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {new Date(next.start).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} · {new Date(next.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href={`/dashboard/agenda?createAppointmentForClientId=${client.id}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    background: "var(--primary)", color: "#fff",
                    padding: "9px 14px", borderRadius: "8px",
                    fontSize: "13px", fontWeight: 700, textDecoration: "none",
                    width: "100%", transition: "opacity 0.15s"
                  }}
                >
                  <Icons.Calendar size={14} />
                  Agendar cita
                </Link>
              );
            })()}
          </div>

          {/* Action Buttons: Full Edit / Options */}
          <div className={styles.profileActionsArea}>
            <button className={styles.editProfileBtn} onClick={() => setShowFullEditModal(true)}>
              <Icons.Edit size={14} />
              <span>Editar</span>
            </button>
            <div className={styles.optionsWrapper} ref={optionsRef}>
              <button 
                className={styles.optionsBtn}
                onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              >
                <span>{t("options")}</span>
                <Icons.ChevronDown size={14} />
              </button>

              {showOptionsDropdown && (
                <div className={`${styles.optionsDropdown} glass`}>
                  <Link 
                    href={`/dashboard/agenda?createAppointmentForClientId=${client.id}`}
                    className={styles.optionItem}
                    onClick={() => setShowOptionsDropdown(false)}
                  >
                    <Icons.Calendar size={14} />
                    <span>{t("timezone") === "Time Zone" ? "New appointment" : t("timezone") === "Zona horària" ? "Nova cita" : t("timezone") === "Ordu-eremua" ? "Hitzordu berria" : "Nueva cita"}</span>
                  </Link>
                  <button 
                    className={styles.optionItem}
                    onClick={() => {
                      setShowOptionsDropdown(false);
                      setActiveTab("general");
                      setTimeout(() => {
                        const tutorSection = document.getElementById("tutor-section");
                        if (tutorSection) tutorSection.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                  >
                    <Icons.Users size={14} />
                    <span>{t("timezone") === "Time Zone" ? "New legal guardian" : t("timezone") === "Zona horària" ? "Nou tutor legal" : t("timezone") === "Ordu-eremua" ? "Tutor legal berria" : "Nuevo tutor legal"}</span>
                  </button>
                  <button 
                    className={styles.optionItem}
                    onClick={() => {
                      setShowOptionsDropdown(false);
                      handleOpenTagsDrawer();
                    }}
                  >
                    <Icons.Award size={14} />
                    <span>{t("colTags")}</span>
                  </button>
                  <button 
                    className={styles.optionItem}
                    onClick={() => {
                      setShowOptionsDropdown(false);
                      setActiveTab("medical");
                    }}
                  >
                    <Icons.FileText size={14} />
                    <span>{t("timezone") === "Time Zone" ? "Notes" : t("timezone") === "Zona horària" ? "Notes" : t("timezone") === "Ordu-eremua" ? "Oharrak" : "Notas"}</span>
                  </button>
                  {client.phone && (
                    <a 
                      href={`https://web.whatsapp.com/send?phone=${client.phone.replace(/\+/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.optionItem}
                      onClick={() => setShowOptionsDropdown(false)}
                    >
                      <WhatsAppIcon size={14} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Eliminar clientes")) && (
                    <button 
                      className={`${styles.optionItem} ${styles.optionItemDelete}`}
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        handleSingleDelete();
                      }}
                    >
                      <Icons.Trash size={14} />
                      <span>{t("timezone") === "Time Zone" ? "Delete" : t("timezone") === "Zona horària" ? "Eliminar" : t("timezone") === "Ordu-eremua" ? "Ezabatu" : "Eliminar"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: MAIN WORK AREA */}
      <main className={styles.mainCol}>
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabBtn} ${activeTab === "general" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("general")}
          >
            {t("tabPersonalData")}
          </button>
          {showDocumentsTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "documents" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("documents")}
            >
              {t("tabDocuments")}
            </button>
          )}
          {showFormsTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "forms" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("forms")}
            >
              {t("tabForms")}
            </button>
          )}
          {showMedicalTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "medical" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("medical")}
            >
              {t("tabFollowUps")}
            </button>
          )}
          {currentUser?.role === "ADMIN" && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "permissions" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("permissions")}
            >
              {t("tabPermissions")}
            </button>
          )}
          {showBillingTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "billing" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("billing")}
            >
              {t("tabArticlesClient")}
            </button>
          )}
          {showBudgetsTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "budgets" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("budgets")}
            >
              {t("tabBudgetsClient")}
            </button>
          )}
          <button 
            className={`${styles.tabBtn} ${activeTab === "photos" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("photos")}
          >
            {t("Antes y Después")}
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === "timeline" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            ⏱️ Línea de Tiempo
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === "whiteboard" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("whiteboard")}
          >
            ✏️ Pizarra Clínica
          </button>
        </div>


        {/* Tab Panels */}
        <div className={styles.tabContentCanvas}>
          {/* TAB 1: Datos personales */}
          {activeTab === "general" && (
            <div className={styles.personalDataCard}>
              <div className={styles.personalDataHeader}>
                <span className={styles.personalDataTitle}>{t("personalDataTitle")}</span>
                {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Editar clientes")) && (
                  <button 
                    className={styles.cardEditBtn}
                    onClick={() => setShowFullEditModal(true)}
                  >
                    {t("edit")}
                  </button>
                )}
              </div>

              <div className={styles.personalFieldsList}>
                {/* Field Row: Nombre */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("fieldName")}</span>
                  {editingField === "firstName" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("firstName")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{client.firstName}</span>
                      <button 
                        className={styles.inlineEditTriggerBtn}
                        onClick={() => startInlineEdit("firstName", client.firstName)}
                        title={t("timezone") === "Time Zone" ? "Edit name" : "Editar nombre"}
                      >
                        <Icons.Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Field Row: Apellido */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("fieldLastName")}</span>
                  {editingField === "lastName" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("lastName")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{client.lastName}</span>
                      <button 
                        className={styles.inlineEditTriggerBtn}
                        onClick={() => startInlineEdit("lastName", client.lastName)}
                        title={t("timezone") === "Time Zone" ? "Edit last name" : "Editar apellidos"}
                      >
                        <Icons.Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Field Row: Email */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Email</span>
                  {editingField === "email" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="email" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("email")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue} style={{ color: "var(--primary)" }}>{showPersonalData ? (client.email || "-") : "******"}</span>
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("email", client.email || "")}
                          title={t("timezone") === "Time Zone" ? "Edit email" : "Editar email"}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Telefono */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("fieldPhone")}</span>
                  {editingField === "phone" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("phone")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{showPersonalData ? (client.phone || "-") : "******"}</span>
                      {showPersonalData && client.phone && (
                        <a 
                          href={`https://web.whatsapp.com/send?phone=${client.phone.replace(/\+/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.whatsAppIconLink}
                          title={t("timezone") === "Time Zone" ? "Send WhatsApp" : "Enviar WhatsApp"}
                        >
                          <WhatsAppIcon size={16} />
                        </a>
                      )}
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("phone", client.phone || "")}
                          title={t("timezone") === "Time Zone" ? "Edit phone" : "Editar teléfono"}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Fecha Nacimiento */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("fieldBirthDate")}</span>
                  {editingField === "birthDate" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="date" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("birthDate")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>
                        {showPersonalData ? (
                          <>
                            {client.birthDate ? new Date(client.birthDate).toLocaleDateString("es-ES") : "-"}
                            {client.birthDate && ` ${getAge(client.birthDate)}`}
                          </>
                        ) : "******"}
                      </span>
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("birthDate", client.birthDate ? client.birthDate.split("T")[0] : "")}
                          title={t("timezone") === "Time Zone" ? "Edit date of birth" : "Editar fecha de nacimiento"}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: DNI / NIF */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{identityLabel}</span>
                  {editingField === "dniNif" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("dniNif")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{showPersonalData ? (client.dniNif || "-") : "******"}</span>
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("dniNif", client.dniNif || "")}
                          title={(t("timezone") === "Time Zone" ? "Edit " : "Editar ") + identityLabel}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Pais */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("fieldCountry")}</span>
                  {editingField === "country" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("country")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{client.country || "España"}</span>
                      <button 
                        className={styles.inlineEditTriggerBtn}
                        onClick={() => startInlineEdit("country", client.country || "España")}
                        title={t("timezone") === "Time Zone" ? "Edit country" : "Editar país"}
                      >
                        <Icons.Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Field Row: Direccion */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("fieldAddress")}</span>
                  {editingField === "address" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("address")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{showPersonalData ? (client.address || "-") : "******"}</span>
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("address", client.address || "")}
                          title={t("timezone") === "Time Zone" ? "Edit address" : "Editar dirección"}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Ciudad/Municipio */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("colMunicipality")}</span>
                  {editingField === "municipality" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("municipality")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{showPersonalData ? (client.municipality || "-") : "******"}</span>
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("municipality", client.municipality || "")}
                          title={t("timezone") === "Time Zone" ? "Edit city" : "Editar ciudad/municipio"}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Codigo postal */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("colPostalCode")}</span>
                  {editingField === "postalCode" ? (
                    <div className={styles.inlineEditForm}>
                      <input 
                        type="text" 
                        className={styles.inlineEditInput}
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.inlineEditActions}>
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("postalCode")} title={t("save")}>
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title={t("cancel")}>
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.fieldValueContainer}>
                      <span className={styles.fieldValue}>{showPersonalData ? (client.postalCode || "-") : "******"}</span>
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("postalCode", client.postalCode || "")}
                          title={t("timezone") === "Time Zone" ? "Edit postal code" : "Editar código postal"}
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Alta */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t("timezone") === "Time Zone" ? "Registered" : t("timezone") === "Zona horària" ? "Alta" : t("timezone") === "Ordu-eremua" ? "Izena emanda" : "Alta"}</span>
                  <div className={styles.fieldValueContainer}>
                    <span className={styles.fieldValue}>
                      {new Date(client.createdAt).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Switches Area */}
              <div className={styles.switchesContainer}>
                <label className={styles.switchRow}>
                  <input 
                    type="checkbox" 
                    className={styles.switchCheckbox}
                    checked={client.isSelfEmployed} 
                    onChange={() => handleToggleSwitch("isSelfEmployed", client.isSelfEmployed)} 
                  />
                  <div className={styles.switchToggle} />
                  <span className={styles.switchText}>{t("timezone") === "Time Zone" ? "Is Self-Employed" : t("timezone") === "Zona horària" ? "És Autònom" : t("timezone") === "Ordu-eremua" ? "Autonomoa da" : "Es Autónomo"}</span>
                </label>

                <label className={styles.switchRow}>
                  <input 
                    type="checkbox" 
                    className={styles.switchCheckbox}
                    checked={client.isCompany} 
                    onChange={() => handleToggleSwitch("isCompany", client.isCompany)} 
                  />
                  <div className={styles.switchToggle} />
                  <span className={styles.switchText}>{t("timezone") === "Time Zone" ? "Is Company" : t("timezone") === "Zona horària" ? "És Empresa" : t("timezone") === "Ordu-eremua" ? "Enpresa da" : "Es Empresa"}</span>
                </label>

                <label className={styles.switchRow}>
                  <input 
                    type="checkbox" 
                    className={styles.switchCheckbox}
                    checked={client.receivesReminders} 
                    onChange={() => handleToggleSwitch("receivesReminders", client.receivesReminders)} 
                  />
                  <div className={styles.switchToggle} />
                  <span className={styles.switchText}>{t("timezone") === "Time Zone" ? "Receives Reminders" : t("timezone") === "Zona horària" ? "Rep Recordatoris" : t("timezone") === "Ordu-eremua" ? "Oroigarriak jasotzen ditu" : "Recibirá Recordatorios"}</span>
                </label>
              </div>

              {/* Tutor legal scroll target */}
              <div id="tutor-section" style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px" }}>{t("timezone") === "Time Zone" ? "Legal Guardian / Representative" : t("timezone") === "Zona horària" ? "Tutor Legal / Representant" : t("timezone") === "Ordu-eremua" ? "Tutor Legal / Ordezkaria" : "Tutor Legal / Representante"}</h3>
                <div className={styles.personalFieldsList}>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{t("timezone") === "Time Zone" ? "Guardian Name" : t("timezone") === "Zona horària" ? "Nom del Tutor" : t("timezone") === "Ordu-eremua" ? "Tutorearen Izena" : "Nombre Tutor"}</span>
                    <span className={styles.fieldValue}>
                      {showPersonalData ? `${client.tutorName || "-"} ${client.tutorLastName || ""}` : "******"}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{t("timezone") === "Time Zone" ? "Guardian Phone" : t("timezone") === "Zona horària" ? "Telèfon del Tutor" : t("timezone") === "Ordu-eremua" ? "Tutorearen Telefonoa" : "Teléfono Tutor"}</span>
                    <span className={styles.fieldValue}>
                      {showPersonalData ? (client.tutorPhone || "-") : "******"}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{t("timezone") === "Time Zone" ? "Guardian Email" : t("timezone") === "Zona horària" ? "Email del Tutor" : t("timezone") === "Ordu-eremua" ? "Tutorearen Emaila" : "Email Tutor"}</span>
                    <span className={styles.fieldValue}>
                      {showPersonalData ? (client.tutorEmail || "-") : "******"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Documentos y Consentimientos */}
          {activeTab === "documents" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Action Cards Header Section */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                
                {/* Card 1: Asociar Documento / Consentimiento Informado */}
                <div 
                  onClick={() => { setShowAssociateDocModal(true); setDocTemplateSearch(""); setSelectedTemplateId(""); }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                  }}
                  className={styles.docActionCardHover}
                >
                  <div style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(0,143,163,0.18), rgba(0,143,163,0.06))",
                    border: "1px solid rgba(0,143,163,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                    flexShrink: 0
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <path d="m10 13 2 2 4-4"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                        Asociar Documento / Consentimiento
                      </h4>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", background: "rgba(0,143,163,0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                        + Generar
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      Selecciona una plantilla de la clínica (consentimientos, RGPD, instrucciones) para rellenar y enviar a firma.
                    </p>
                  </div>
                </div>

                {/* Card 2: Adjuntar Archivos / Informes (With Drag & Drop) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropFile}
                  style={{
                    background: isDraggingFile ? "rgba(0,143,163,0.08)" : "var(--bg-card)",
                    border: `2px ${isDraggingFile ? "dashed var(--primary)" : "solid var(--border-color)"}`,
                    borderRadius: "14px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                  }}
                  className={styles.docActionCardHover}
                >
                  <div style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))",
                    border: "1px solid rgba(59,130,246,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0
                  }}>
                    {uploadingFile ? (
                      <div className="spinner" style={{ width: "22px", height: "22px", border: "2px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.5 19A5.5 5.5 0 0 0 18 8h-1.26A8 8 0 1 0 4 15.25" />
                        <path d="m10 13 2-2 2 2" />
                        <path d="M12 11v9" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {uploadingFile ? "Subiendo archivo..." : "Adjuntar Archivos / Informes"}
                      </h4>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", background: "rgba(59,130,246,0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                        📁 Subir
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      Arrastra y suelta aquí cualquier archivo (PDF, radiografías, imágenes) o haz clic para examinar tu equipo.
                    </p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple
                    onChange={handleFileUpload} 
                    style={{ display: "none" }} 
                  />
                </div>

              </div>

              {/* Main Content Grid: 2 Clean Sections */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>

                {/* Left Section: Documentos asociados / Consentimientos */}
                <div style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "340px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                        Documentos asociados
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: "10px" }}>
                      {client.documents ? client.documents.length : 0}
                    </span>
                  </div>

                  {(!client.documents || client.documents.length === 0) ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px", textAlign: "center" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", marginBottom: "12px" }}>
                        <Icons.FileText size={24} />
                      </div>
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>No hay documentos asociados</h5>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", maxWidth: "240px" }}>
                        Genera consentimientos informados o documentos firmados desde el botón superior.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {client.documents.map((doc: any) => {
                        const isSigned = !!doc.signature;
                        return (
                          <div
                            key={doc.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-panel-solid)",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: isSigned ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                                color: isSigned ? "#10b981" : "#f59e0b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}>
                                {isSigned ? <Icons.Check size={18} /> : <Icons.Clock size={18} />}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {doc.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                                  <span style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: isSigned ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                                    color: isSigned ? "#065f46" : "#b45309"
                                  }}>
                                    {isSigned ? "✓ Firmado" : "Sin firma"}
                                  </span>
                                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {new Date(doc.createdAt).toLocaleDateString("es-ES")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions toolbar */}
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSigned) {
                                    setViewingSignedDoc(doc);
                                  } else {
                                    setRemoteSignLink(`${window.location.origin}/sign/${doc.id}`);
                                    setRemoteSignPin(doc.pin || "");
                                    setShowRemoteSignModal(true);
                                  }
                                }}
                                title={isSigned ? "Ver documento" : "Ver enlace de firma"}
                                style={{
                                  background: "var(--bg-input)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  color: "var(--primary)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                              >
                                <Icons.Eye size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc)}
                                title="Descargar / Imprimir"
                                style={{
                                  background: "var(--bg-input)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  color: "var(--text-secondary)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                              >
                                <Icons.Download size={15} />
                              </button>

                              {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Eliminar clientes")) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDocToDelete(doc.id);
                                  }}
                                  title="Eliminar"
                                  style={{
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: "6px",
                                    padding: "6px 8px",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center"
                                  }}
                                >
                                  <Icons.Trash size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Section: Archivos subidos */}
                <div style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "340px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                        Archivos subidos
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-input)", padding: "2px 8px", borderRadius: "10px" }}>
                      {client.files ? client.files.length : 0}
                    </span>
                  </div>

                  {(!client.files || client.files.length === 0) ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px", textAlign: "center" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", marginBottom: "12px" }}>
                        <Icons.Download size={24} />
                      </div>
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>No hay archivos subidos</h5>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", maxWidth: "240px" }}>
                        Arrastra o adjunta informes, analíticas o documentos externos en formato PDF o imagen.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {client.files.map((file: any) => {
                        const isPdf = file.name.toLowerCase().endsWith(".pdf");
                        const isImg = /\.(png|jpe?g|webp|gif)$/i.test(file.name);
                        return (
                          <div
                            key={file.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-panel-solid)",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: isPdf ? "rgba(239,68,68,0.12)" : isImg ? "rgba(168,85,247,0.12)" : "rgba(59,130,246,0.12)",
                                color: isPdf ? "#ef4444" : isImg ? "#a855f7" : "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}>
                                {isPdf ? <Icons.FileText size={18} /> : isImg ? <Icons.Camera size={18} /> : <Icons.FileText size={18} />}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {file.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {new Date(file.createdAt).toLocaleDateString("es-ES")}
                                  </span>
                                  {file.fileSize && (
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                      · {Math.round(file.fileSize / 1024)} KB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* File Actions */}
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
                              <a
                                href={file.fileUrl}
                                download={file.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Descargar archivo"
                                style={{
                                  background: "var(--bg-input)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  color: "#2563eb",
                                  display: "flex",
                                  alignItems: "center",
                                  textDecoration: "none"
                                }}
                              >
                                <Icons.Download size={15} />
                              </a>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileDelete(file.id);
                                }}
                                title="Eliminar archivo"
                                style={{
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  color: "#ef4444",
                                  cursor: "pointer"
                                }}
                              >
                                <Icons.Trash size={15} />
                              </button>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

              {/* ── ASOCIAR DOCUMENTO MODAL (WIZARD REDESIGNED) ── */}
              {showAssociateDocModal && typeof window !== "undefined" && createPortal(
                <div className={styles.associateDocOverlay}>
                  <div 
                    className={styles.associateDocModal} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      maxWidth: docWizardStep === "preview_and_sign" ? "820px" : "900px" 
                    }}
                  >
                    {/* Modal Header */}
                    <div className={styles.associateDocHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, rgba(0,143,163,0.18), rgba(0,143,163,0.06))",
                          border: "1px solid rgba(0,143,163,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--primary)",
                          flexShrink: 0
                        }}>
                          <Icons.FileText size={20} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>
                            {docWizardStep === "preview_and_sign" ? "Vista Previa y Firma de Documento" : "Asociar Documento / Consentimiento"}
                          </h3>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Cliente: <strong>{client?.firstName} {client?.lastName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Steps Indicator Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: docWizardStep === "select_and_edit" ? "var(--primary)" : "var(--bg-input)",
                          color: docWizardStep === "select_and_edit" ? "#ffffff" : "var(--text-muted)",
                          border: docWizardStep === "select_and_edit" ? "none" : "1px solid var(--border-color)"
                        }}>
                          1. Plantilla y Contenido
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>→</span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: docWizardStep === "preview_and_sign" ? "var(--primary)" : "var(--bg-input)",
                          color: docWizardStep === "preview_and_sign" ? "#ffffff" : "var(--text-muted)",
                          border: docWizardStep === "preview_and_sign" ? "none" : "1px solid var(--border-color)"
                        }}>
                          2. Firma y Finalizar
                        </span>

                        <button
                          type="button"
                          onClick={() => setShowAssociateDocModal(false)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            fontSize: "22px",
                            cursor: "pointer",
                            padding: "0 4px",
                            marginLeft: "8px",
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Modal Body */}
                    <div className={styles.associateDocBody}>
                      {docWizardStep === "select_and_edit" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          
                          {/* Template Selector Card */}
                          <div style={{
                            background: "var(--bg-panel-solid)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "12px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                              <label style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>📄 Modelo de Plantilla</span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>(RGPD, Consentimientos, Indicaciones)</span>
                              </label>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAssociateDocModal(false);
                                  router.push('/dashboard/settings?tab=documents');
                                }}
                                style={{
                                  background: "rgba(0,143,163,0.08)",
                                  border: "1px solid rgba(0,143,163,0.25)",
                                  color: "var(--primary)",
                                  padding: "5px 12px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <Icons.Plus size={14} /> + Crear Plantilla
                              </button>
                            </div>

                            {templates.length === 0 ? (
                              <div style={{
                                padding: "24px 16px",
                                textAlign: "center",
                                background: "var(--bg-card)",
                                border: "1.5px dashed var(--border-color)",
                                borderRadius: "10px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "10px"
                              }}>
                                <div style={{
                                  width: "44px",
                                  height: "44px",
                                  borderRadius: "50%",
                                  background: "var(--bg-input)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--text-muted)"
                                }}>
                                  <Icons.FileText size={22} />
                                </div>
                                <div>
                                  <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                                    No hay plantillas de documentos creadas
                                  </h5>
                                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                                    Crea modelos reutilizables de consentimientos informados desde la configuración de la clínica.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAssociateDocModal(false);
                                    router.push('/dashboard/settings?tab=documents');
                                  }}
                                  className="btn btn-primary"
                                  style={{ fontSize: "12px", padding: "8px 16px", marginTop: "4px" }}
                                >
                                  + Crear Plantilla en Configuración
                                </button>
                              </div>
                            ) : (
                              <select
                                className="input"
                                value={selectedTemplateId}
                                onChange={(e) => handleSelectTemplate(e.target.value)}
                                style={{
                                  width: "100%",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "8px",
                                  padding: "10px 14px",
                                  fontSize: "14px",
                                  fontWeight: 500
                                }}
                              >
                                <option value="">-- Selecciona una plantilla de la clínica --</option>
                                {templates.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Rich Text Editor when template is selected */}
                          {selectedTemplateId && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              {/* Editor Toolbar */}
                              <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                                background: "var(--bg-panel-solid)",
                                border: "1px solid var(--border-color)",
                                padding: "10px 14px",
                                borderRadius: "10px"
                              }}>
                                {/* Formatting controls */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <button type="button" onClick={() => handleDocCommand('bold')} title="Negrita" style={{ padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", color: "var(--text-primary)" }}>B</button>
                                  <button type="button" onClick={() => handleDocCommand('italic')} title="Cursiva" style={{ padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", fontStyle: "italic", cursor: "pointer", color: "var(--text-primary)" }}>I</button>
                                  <button type="button" onClick={() => handleDocCommand('underline')} title="Subrayado" style={{ padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", textDecoration: "underline", cursor: "pointer", color: "var(--text-primary)" }}>U</button>
                                  <button type="button" onClick={() => {
                                    const color = prompt("Color hexadecimal (ej: #ef4444):");
                                    if (color) handleDocCommand('foreColor', color);
                                  }} title="Color del texto" style={{ padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", color: "var(--text-primary)" }}>🎨 Color</button>
                                </div>

                                {/* Variables Inserter Dropdown */}
                                <div style={{ position: "relative" }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowDocVariablesDropdown(!showDocVariablesDropdown)}
                                    style={{
                                      padding: "6px 12px",
                                      background: "rgba(0,143,163,0.1)",
                                      border: "1px solid rgba(0,143,163,0.25)",
                                      color: "var(--primary)",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px"
                                    }}
                                  >
                                    <span>🏷️ Insertar campo autocompletable</span> ▾
                                  </button>

                                  {showDocVariablesDropdown && (
                                    <div style={{
                                      position: "absolute",
                                      top: "100%",
                                      right: 0,
                                      background: "var(--bg-card)",
                                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "10px",
                                      width: "240px",
                                      maxHeight: "320px",
                                      overflowY: "auto",
                                      padding: "6px 0",
                                      marginTop: "6px",
                                      zIndex: 100
                                    }}>
                                      <div style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-muted)", background: "var(--bg-input)", letterSpacing: "0.5px" }}>PACIENTE</div>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{client.firstName}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>Nombre Paciente</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{client.lastName}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>Apellidos Paciente</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{Cliente:Dirección_Cliente}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>Dirección Paciente</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{client.dniNif}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>NIF Paciente</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{client.birthDate}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>F. Nacimiento</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{client.allergies}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>Alergias</button>

                                      <div style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-muted)", background: "var(--bg-input)", letterSpacing: "0.5px" }}>CLÍNICA / CONSULTA</div>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{clinic.name}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>Nombre Clínica</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{Dirección_Consulta}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)" }}>Dirección Clínica</button>

                                      <div style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-muted)", background: "var(--bg-input)", letterSpacing: "0.5px" }}>FIRMAS REQUERIDAS</div>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{signature.client}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "10px", background: "#eab308", color: "black", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>✍️</span> Firma Paciente (Ordinaria)</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{signature.doctor}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "10px", background: "#3b82f6", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>✍️</span> Firma Médico (Ordinaria)</button>
                                      <button type="button" onClick={() => { handleInsertDocVariable("{{signature.certified}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "10px", background: "#ca8a04", color: "white", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>🔏</span> Firma Certificada (Remota)</button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Content Workspace */}
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <label style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px", color: "var(--text-muted)" }}>Contenido del documento (Editable)</label>
                                <div
                                  ref={associateEditorRef}
                                  contentEditable={true}
                                  onInput={handleDocEditorInput}
                                  style={{
                                    minHeight: "320px",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "10px",
                                    padding: "20px",
                                    fontFamily: "var(--font-sans, sans-serif)",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    color: "var(--text-primary)",
                                    outline: "none",
                                    background: "var(--bg-panel-solid)",
                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                                    overflowY: "auto",
                                    boxSizing: "border-box",
                                    width: "100%"
                                  }}
                                />
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* Step 2: Final Preview and Interactive Signatures */}
                      {docWizardStep === "preview_and_sign" && (() => {
                        const ordinaryFields = (docSignatureFields as any[]).filter((f: any) => f.type === "ordinary");
                        const doctorOrdinaryFields = (docSignatureFields as any[]).filter((f: any) => f.type === "doctor_ordinary");
                        const certifiedFields = (docSignatureFields as any[]).filter((f: any) => f.type === "certified");
                        const allInlineFields = [...ordinaryFields, ...doctorOrdinaryFields];
                        const allInlineSigned = allInlineFields.every((f: any) => inlineSignatures[f.id]);


                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Document preview (read-only) */}
                            <div style={{
                              background: "#ffffff",
                              border: "1px solid var(--border-color)",
                              borderRadius: "12px",
                              padding: "28px 32px",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                              minHeight: "260px"
                            }}>
                              <div
                                dangerouslySetInnerHTML={{ __html: generatedDocContent }}
                                style={{ fontSize: "14px", lineHeight: "1.6", color: "#1e293b", fontFamily: "sans-serif" }}
                              />
                              <div style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
                                FECHA: {new Date().toLocaleDateString("es-ES")}
                              </div>
                            </div>

                            {/* Signature Fields Section */}
                            {docSignatureFields.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                                {/* Ordinary (inline) signature fields */}
                                {ordinaryFields.map((field, idx) => (
                                  <div key={field.id} style={{
                                    background: "var(--bg-panel-solid)",
                                    border: inlineSignatures[field.id] ? "1.5px solid #10b981" : "1.5px solid rgba(0,143,163,0.3)",
                                    borderRadius: "14px",
                                    padding: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "14px"
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{
                                          width: "36px", height: "36px", borderRadius: "50%",
                                          background: inlineSignatures[field.id] ? "rgba(16,185,129,0.12)" : "rgba(0,143,163,0.12)",
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          fontSize: "18px"
                                        }}>
                                          {inlineSignatures[field.id] ? "✅" : "✍️"}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                                            Firma Ordinaria {ordinaryFields.length > 1 ? `#${idx + 1}` : ""}
                                          </div>
                                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            {inlineSignatures[field.id] ? "✓ Firmado correctamente" : "El paciente firma aquí mismo en pantalla"}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        {inlineSignatures[field.id] && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setInlineSignatures(prev => ({ ...prev, [field.id]: null }));
                                            }}
                                            style={{
                                              padding: "6px 12px", background: "none",
                                              border: "1px solid var(--border-color)", borderRadius: "8px",
                                              fontSize: "12px", cursor: "pointer", color: "var(--text-muted)"
                                            }}
                                          >
                                            🔄 Re-firmar
                                          </button>
                                        )}
                                        {!inlineSignatures[field.id] && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveInlineField(field.id);
                                              // Initialize canvas after render
                                              setTimeout(() => {
                                                const canvas = inlineCanvasRefs.current[field.id];
                                                if (canvas) {
                                                  const rect = canvas.getBoundingClientRect();
                                                  canvas.width = rect.width || 400;
                                                  canvas.height = rect.height || 160;
                                                  const ctx = canvas.getContext("2d");
                                                  if (ctx) {
                                                    ctx.strokeStyle = "#1e293b";
                                                    ctx.lineWidth = 2.5;
                                                    ctx.lineCap = "round";
                                                    ctx.lineJoin = "round";
                                                  }
                                                }
                                              }, 50);
                                            }}
                                            style={{
                                              padding: "8px 16px",
                                              background: "var(--primary)",
                                              color: "white",
                                              border: "none",
                                              borderRadius: "8px",
                                              fontSize: "13px",
                                              fontWeight: 700,
                                              cursor: "pointer",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "6px"
                                            }}
                                          >
                                            ✍️ Firmar Ahora
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Canvas pad - shows when this field is active */}
                                    {activeInlineField === field.id && (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div style={{
                                          fontSize: "12px", color: "var(--text-muted)",
                                          display: "flex", alignItems: "center", gap: "6px"
                                        }}>
                                          <span>👆</span> Dibuja tu firma en el área de abajo (con ratón, dedo o stylus)
                                        </div>
                                        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1.5px solid var(--primary)", background: "#f8fafc" }}>
                                          <canvas
                                            ref={(el) => { inlineCanvasRefs.current[field.id] = el; }}
                                            style={{ width: "100%", height: "160px", display: "block", touchAction: "none", cursor: "crosshair" }}
                                            onMouseDown={(e) => {
                                              setInlineIsDrawing(true);
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width;
                                              const scaleY = canvas.height / rect.height;
                                              ctx.beginPath();
                                              ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                                            }}
                                            onMouseMove={(e) => {
                                              if (!inlineIsDrawing) return;
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width;
                                              const scaleY = canvas.height / rect.height;
                                              ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                                              ctx.stroke();
                                            }}
                                            onMouseUp={() => setInlineIsDrawing(false)}
                                            onMouseLeave={() => setInlineIsDrawing(false)}
                                            onTouchStart={(e) => {
                                              e.preventDefault();
                                              setInlineIsDrawing(true);
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width;
                                              const scaleY = canvas.height / rect.height;
                                              const t = e.touches[0];
                                              ctx.beginPath();
                                              ctx.moveTo((t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY);
                                            }}
                                            onTouchMove={(e) => {
                                              e.preventDefault();
                                              if (!inlineIsDrawing) return;
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width;
                                              const scaleY = canvas.height / rect.height;
                                              const t = e.touches[0];
                                              ctx.lineTo((t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY);
                                              ctx.stroke();
                                            }}
                                            onTouchEnd={() => setInlineIsDrawing(false)}
                                          />
                                          <div style={{
                                            position: "absolute", bottom: "8px", left: "50%",
                                            transform: "translateX(-50%)",
                                            fontSize: "11px", color: "#94a3b8", pointerEvents: "none",
                                            fontStyle: "italic"
                                          }}>
                                            Firme aquí
                                          </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              if (canvas) {
                                                const ctx = canvas.getContext("2d");
                                                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                                              }
                                            }}
                                            style={{
                                              padding: "7px 14px", background: "none",
                                              border: "1px solid var(--border-color)", borderRadius: "8px",
                                              fontSize: "12px", cursor: "pointer", color: "var(--text-muted)"
                                            }}
                                          >
                                            🗑 Borrar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              if (!canvas) return;
                                              const dataUrl = canvas.toDataURL("image/png");
                                              setInlineSignatures(prev => ({ ...prev, [field.id]: dataUrl }));
                                              setPatientSignature(dataUrl); // also set legacy state
                                              setActiveInlineField(null);
                                            }}
                                            style={{
                                              padding: "7px 16px",
                                              background: "#10b981",
                                              color: "white",
                                              border: "none",
                                              borderRadius: "8px",
                                              fontSize: "13px",
                                              fontWeight: 700,
                                              cursor: "pointer"
                                            }}
                                          >
                                            ✓ Confirmar Firma
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setActiveInlineField(null)}
                                            style={{
                                              padding: "7px 14px", background: "none",
                                              border: "1px solid var(--border-color)", borderRadius: "8px",
                                              fontSize: "12px", cursor: "pointer", color: "var(--text-muted)"
                                            }}
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Show completed signature preview */}
                                    {inlineSignatures[field.id] && (
                                      <div style={{
                                        border: "1px solid #d1fae5", borderRadius: "10px",
                                        padding: "12px 16px", background: "rgba(16,185,129,0.04)",
                                        display: "flex", alignItems: "center", gap: "16px"
                                      }}>
                                        <img
                                          src={inlineSignatures[field.id]!}
                                          alt="Firma capturada"
                                          style={{ maxHeight: "70px", maxWidth: "200px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "white", padding: "4px" }}
                                        />
                                        <div style={{ fontSize: "12px", color: "#059669" }}>
                                          <strong>✓ Firma capturada</strong><br/>
                                          <span style={{ color: "var(--text-muted)" }}>{new Date().toLocaleString("es-ES")}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Doctor Ordinary (inline) signature fields */}
                                {doctorOrdinaryFields.map((field: any, idx: number) => (
                                  <div key={field.id} style={{
                                    background: "var(--bg-panel-solid)",
                                    border: inlineSignatures[field.id] ? "1.5px solid #10b981" : "1.5px solid rgba(59,130,246,0.4)",
                                    borderRadius: "14px",
                                    padding: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "14px"
                                  }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{
                                          width: "36px", height: "36px", borderRadius: "50%",
                                          background: inlineSignatures[field.id] ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)",
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          fontSize: "18px"
                                        }}>
                                          {inlineSignatures[field.id] ? "✅" : "🩺"}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                                            Firma Médico {doctorOrdinaryFields.length > 1 ? `#${idx + 1}` : ""}
                                          </div>
                                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            {inlineSignatures[field.id] ? "✓ Firmado correctamente" : "El médico/terapeuta firma aquí mismo"}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: "8px" }}>
                                        {inlineSignatures[field.id] && (
                                          <button
                                            type="button"
                                            onClick={() => setInlineSignatures(prev => ({ ...prev, [field.id]: null }))}
                                            style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px", cursor: "pointer", color: "var(--text-muted)" }}
                                          >
                                            🔄 Re-firmar
                                          </button>
                                        )}
                                        {!inlineSignatures[field.id] && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveInlineField(field.id);
                                              setTimeout(() => {
                                                const canvas = inlineCanvasRefs.current[field.id];
                                                if (canvas) {
                                                  const rect = canvas.getBoundingClientRect();
                                                  canvas.width = rect.width || 400;
                                                  canvas.height = rect.height || 160;
                                                  const ctx = canvas.getContext("2d");
                                                  if (ctx) { ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; }
                                                }
                                              }, 50);
                                            }}
                                            style={{ padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                                          >
                                            🩺 Firmar como Médico
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {activeInlineField === field.id && (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                                          <span>👆</span> Dibuja la firma del médico (con ratón, dedo o stylus)
                                        </div>
                                        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #3b82f6", background: "#f0f9ff" }}>
                                          <canvas
                                            ref={(el) => { inlineCanvasRefs.current[field.id] = el; }}
                                            style={{ width: "100%", height: "160px", display: "block", touchAction: "none", cursor: "crosshair" }}
                                            onMouseDown={(e) => {
                                              setInlineIsDrawing(true);
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
                                              ctx.beginPath(); ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
                                            }}
                                            onMouseMove={(e) => {
                                              if (!inlineIsDrawing) return;
                                              const canvas = inlineCanvasRefs.current[field.id];
                                              const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
                                              ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY); ctx.stroke();
                                            }}
                                            onMouseUp={() => setInlineIsDrawing(false)}
                                            onMouseLeave={() => setInlineIsDrawing(false)}
                                            onTouchStart={(e) => {
                                              e.preventDefault(); setInlineIsDrawing(true);
                                              const canvas = inlineCanvasRefs.current[field.id]; const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
                                              const t = e.touches[0]; ctx.beginPath(); ctx.moveTo((t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY);
                                            }}
                                            onTouchMove={(e) => {
                                              e.preventDefault(); if (!inlineIsDrawing) return;
                                              const canvas = inlineCanvasRefs.current[field.id]; const ctx = canvas?.getContext("2d");
                                              if (!canvas || !ctx) return;
                                              const rect = canvas.getBoundingClientRect();
                                              const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
                                              const t = e.touches[0]; ctx.lineTo((t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY); ctx.stroke();
                                            }}
                                            onTouchEnd={() => setInlineIsDrawing(false)}
                                          />
                                          <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", fontSize: "11px", color: "#93c5fd", pointerEvents: "none", fontStyle: "italic" }}>
                                            Firme aquí (Médico)
                                          </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                          <button type="button" onClick={() => { const c = inlineCanvasRefs.current[field.id]; if (c) { const ctx = c.getContext("2d"); if (ctx) ctx.clearRect(0, 0, c.width, c.height); } }} style={{ padding: "7px 14px", background: "none", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px", cursor: "pointer", color: "var(--text-muted)" }}>🗑 Borrar</button>
                                          <button type="button" onClick={() => { const canvas = inlineCanvasRefs.current[field.id]; if (!canvas) return; const dataUrl = canvas.toDataURL("image/png"); setInlineSignatures(prev => ({ ...prev, [field.id]: dataUrl })); setDoctorSignature(dataUrl); setActiveInlineField(null); }} style={{ padding: "7px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>✓ Confirmar Firma Médico</button>
                                          <button type="button" onClick={() => setActiveInlineField(null)} style={{ padding: "7px 14px", background: "none", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "12px", cursor: "pointer", color: "var(--text-muted)" }}>Cancelar</button>
                                        </div>
                                      </div>
                                    )}

                                    {inlineSignatures[field.id] && (
                                      <div style={{ border: "1px solid #dbeafe", borderRadius: "10px", padding: "12px 16px", background: "rgba(59,130,246,0.04)", display: "flex", alignItems: "center", gap: "16px" }}>
                                        <img src={inlineSignatures[field.id]!} alt="Firma médico" style={{ maxHeight: "70px", maxWidth: "200px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "white", padding: "4px" }} />
                                        <div style={{ fontSize: "12px", color: "#2563eb" }}>
                                          <strong>✓ Firma médico capturada</strong><br/>
                                          <span style={{ color: "var(--text-muted)" }}>{new Date().toLocaleString("es-ES")}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {/* Certified signature fields (remote only) */}
                                {certifiedFields.map((field: any, idx: number) => (
                                  <div key={field.id} style={{
                                    background: "rgba(251,191,36,0.06)",
                                    border: "1.5px solid rgba(234,179,8,0.4)",
                                    borderRadius: "14px",
                                    padding: "20px",
                                    display: "flex",
                                    gap: "16px",
                                    alignItems: "flex-start"
                                  }}>
                                    <div style={{ fontSize: "28px", flexShrink: 0 }}>🔏</div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#92400e", marginBottom: "4px" }}>
                                        Firma Certificada {certifiedFields.length > 1 ? `#${idx + 1}` : ""} — Requiere Envío Remoto
                                      </div>
                                      <div style={{ fontSize: "13px", color: "#78350f", lineHeight: "1.5", marginBottom: "12px" }}>
                                        Este campo de firma tiene validez legal certificada. El paciente debe firmar a través del enlace seguro que se enviará por <strong>WhatsApp</strong> o <strong>Email</strong>. No es posible firmar este tipo de campo directamente en pantalla.
                                      </div>
                                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowDocOptionsDropdown(false);
                                            setShowAssociateDocModal(false);
                                            handleCreateRemoteSignatureRequest("whatsapp");
                                          }}
                                          style={{
                                            padding: "8px 16px",
                                            background: "#25d366",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                          }}
                                        >
                                          💬 Enviar por WhatsApp
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowDocOptionsDropdown(false);
                                            setShowAssociateDocModal(false);
                                            handleCreateRemoteSignatureRequest("email");
                                          }}
                                          style={{
                                            padding: "8px 16px",
                                            background: "#2563eb",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                          }}
                                        >
                                          ✉️ Enviar por Email
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* No signature fields detected */}
                                {docSignatureFields.length === 0 && (
                                  <div style={{
                                    background: "rgba(148,163,184,0.06)",
                                    border: "1px dashed var(--border-color)",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    textAlign: "center",
                                    color: "var(--text-muted)",
                                    fontSize: "13px"
                                  }}>
                                    📄 Este documento no contiene campos de firma. Puedes guardarlo directamente.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Modal Footer */}
                    <div className={styles.associateDocFooter}>
                      {docWizardStep === "select_and_edit" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAssociateDocModal(false);
                              setDocWizardStep("select_and_edit");
                            }}
                            className="btn btn-secondary"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!selectedTemplateId}
                            onClick={handleDocWizardContinue}
                            style={{ opacity: !selectedTemplateId ? 0.5 : 1 }}
                          >
                            Continuar a Firma →
                          </button>
                        </>
                      ) : (() => {
                          const hasCertifiedOnly = docSignatureFields.length > 0 &&
                            (docSignatureFields as any[]).every((f: any) => f.type === "certified");
                          const allInlineFields = (docSignatureFields as any[]).filter((f: any) => f.type === "ordinary" || f.type === "doctor_ordinary");
                          const allInlineSigned = allInlineFields.length === 0 ||
                            allInlineFields.every((f: any) => inlineSignatures[f.id]);

                          return (
                            <>
                              <button
                                type="button"
                                onClick={() => setDocWizardStep("select_and_edit")}
                                className="btn btn-secondary"
                              >
                                ← Volver a Editar
                              </button>

                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ position: "relative" }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDocOptionsDropdown(!showDocOptionsDropdown)}
                                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                                  >
                                    ⚙️ Opciones ▾
                                  </button>
                                  {showDocOptionsDropdown && (
                                    <div style={{
                                      position: "absolute",
                                      bottom: "100%",
                                      right: 0,
                                      background: "var(--bg-card)",
                                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "8px",
                                      width: "170px",
                                      zIndex: 100,
                                      display: "flex",
                                      flexDirection: "column",
                                      padding: "6px 0",
                                      marginBottom: "6px"
                                    }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowDocOptionsDropdown(false);
                                          setShowAssociateDocModal(false);
                                          handleCreateRemoteSignatureRequest("whatsapp");
                                        }}
                                        style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)", display: "flex", gap: "8px" }}
                                      >
                                        <span>💬</span> Vía WhatsApp
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowDocOptionsDropdown(false);
                                          setShowAssociateDocModal(false);
                                          handleCreateRemoteSignatureRequest("email");
                                        }}
                                        style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)", display: "flex", gap: "8px" }}
                                      >
                                        <span>✉️</span> Vía Email
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowDocOptionsDropdown(false);
                                          handlePrintDocument();
                                        }}
                                        style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", color: "var(--text-primary)", display: "flex", gap: "8px" }}
                                      >
                                        <span>🖨️</span> Imprimir
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Hide Guardar if ONLY certified fields exist (remote only) */}
                                {!hasCertifiedOnly && (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveAssociatedDocument}
                                    disabled={!allInlineSigned && allInlineFields.length > 0}
                                    title={!allInlineSigned && allInlineFields.length > 0 ? "Completa todos los campos de firma antes de guardar" : ""}
                                    style={{
                                      background: allInlineSigned ? "#10b981" : "#94a3b8",
                                      borderColor: allInlineSigned ? "#10b981" : "#94a3b8",
                                      color: "white",
                                      opacity: !allInlineSigned && allInlineFields.length > 0 ? 0.7 : 1,
                                      cursor: !allInlineSigned && allInlineFields.length > 0 ? "not-allowed" : "pointer"
                                    }}
                                  >
                                    {allInlineSigned || allInlineFields.length === 0 ? "✓ Guardar Documento" : "✍️ Pendiente de Firma"}
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </>
          )}

          {/* TAB 3: Formularios */}
          {activeTab === "forms" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Form templates sub-tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", flexWrap: "wrap" }}>
                {clientFormTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setSelectedFormTemplate(template);
                      setEditingFormField(null);
                    }}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "20px",
                      border: selectedFormTemplate?.id === template.id ? "1.5px solid var(--primary-color)" : "1px solid var(--border-color)",
                      background: selectedFormTemplate?.id === template.id ? "var(--primary-light)" : "#fff",
                      color: selectedFormTemplate?.id === template.id ? "var(--primary-color)" : "var(--text-secondary)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    {template.name}
                  </button>
                ))}
                {clientFormTemplates.length === 0 && (
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No hay formularios configurados.
                  </span>
                )}
              </div>

              {selectedFormTemplate && (() => {
                // Parse fields
                let fields: any[] = [];
                try {
                  const parsed = JSON.parse(selectedFormTemplate.fields);
                  fields = Array.isArray(parsed)
                    ? parsed.map((f: any) => typeof f === "string" ? { name: f, type: "Texto" } : f)
                    : [];
                } catch {
                  fields = [];
                }

                return (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      padding: "20px",
                      position: "relative",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                  >
                    {/* Header toolbar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {selectedFormTemplate.name}
                      </h4>
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => setShowFormOptions(!showFormOptions)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-color)",
                            background: "#fff",
                            color: "var(--text-secondary)",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit"
                          }}
                        >
                          Opciones
                          <span style={{ fontSize: "10px" }}>▼</span>
                        </button>
                        {showFormOptions && (
                          <div style={{ position: "absolute", right: 0, top: "32px", zIndex: 10, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "150px" }}>
                            <button
                              type="button"
                              onClick={async () => {
                                // Clear all responses for this template
                                if (client && confirm("¿Estás seguro de que deseas limpiar todas las respuestas de este formulario?")) {
                                  const updated = { ...formResponses };
                                  delete updated[selectedFormTemplate.id];
                                  
                                  const payload = {
                                    firstName: client.firstName,
                                    lastName: client.lastName,
                                    phone: client.phone || "",
                                    email: client.email || "",
                                    dniNif: client.dniNif || "",
                                    birthDate: client.birthDate ? client.birthDate.split("T")[0] : null,
                                    gender: client.gender || "Femenino",
                                    address: client.address || "",
                                    municipality: client.municipality || "",
                                    postalCode: client.postalCode || "",
                                    country: client.country || "España",
                                    iban: client.iban || "",
                                    bic: client.bic || "",
                                    tags: client.tags || "",
                                    aestheticTreatments: client.aestheticTreatments || "",
                                    allergies: client.allergies || "",
                                    medication: client.medication || "",
                                    medicalHistory: client.medicalHistory || "",
                                    otherNotes: client.otherNotes || "",
                                    tutorName: client.tutorName || "",
                                    tutorLastName: client.tutorLastName || "",
                                    tutorDniNif: client.tutorDniNif || "",
                                    tutorPhone: client.tutorPhone || "",
                                    tutorEmail: client.tutorEmail || "",
                                    tutorAddress: client.tutorAddress || "",
                                    tutorPostalCode: client.tutorPostalCode || "",
                                    tutorMunicipality: client.tutorMunicipality || "",
                                    isSelfEmployed: client.isSelfEmployed,
                                    isCompany: client.isCompany,
                                    receivesReminders: client.receivesReminders,
                                    occupation: client.occupation || "",
                                    maritalStatus: client.maritalStatus || "Soltero/a",
                                    formResponses: JSON.stringify(updated)
                                  };
                                  // Also clear direct columns if it's the main template
                                  if (selectedFormTemplate.name === "Historia Clínica" || selectedFormTemplate.isMain) {
                                    payload.medicalHistory = "";
                                    payload.allergies = "";
                                    payload.medication = "";
                                    payload.otherNotes = "";
                                    payload.aestheticTreatments = "";
                                  }

                                  const res = await fetch(`/api/clients/${id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(payload)
                                  });
                                  if (res.ok) {
                                    setFormResponses(updated);
                                    fetchClientDetails();
                                  }
                                }
                                setShowFormOptions(false);
                              }}
                              style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", textAlign: "left", color: "#f56565" }}
                            >
                              Limpiar formulario
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fields List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {fields.map((field: any, index: number) => {
                        const templateResponses = formResponses[selectedFormTemplate.id] || {};
                        
                        // Resolve value (check direct columns if main template, else use responses object)
                        let val = templateResponses[field.name] || "";
                        if (!val && client && (selectedFormTemplate.name === "Historia Clínica" || selectedFormTemplate.isMain)) {
                          if (field.name === "Antecedentes médicos") val = client.medicalHistory || "";
                          else if (field.name === "Alergias") val = client.allergies || "";
                          else if (field.name === "Medicación") val = client.medication || "";
                          else if (field.name === "Otros") val = client.otherNotes || "";
                          else if (field.name === "Tratamientos estéticos previos") val = client.aestheticTreatments || "";
                        }

                        const isEditing = editingFormField === field.name;

                        return (
                          <div
                            key={index}
                            className={styles.formFieldRow}
                            style={{
                              display: "flex",
                              alignItems: field.type === "Texto largo" && isEditing ? "flex-start" : "center",
                              borderBottom: "1px solid #f7fafc",
                              minHeight: "44px"
                            }}
                          >
                            {/* Label */}
                            <div style={{ width: "240px", flexShrink: 0, fontSize: "14px", fontWeight: field.type === "Título" ? 700 : 500, color: field.type === "Título" ? "var(--text-primary)" : "var(--text-secondary)" }}>
                              {field.name}
                            </div>

                            {/* Value / Editor */}
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                                  {field.type === "Texto largo" ? (
                                    <textarea
                                      value={editingFormValue}
                                      onChange={(e) => setEditingFormValue(e.target.value)}
                                      style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        border: "1.5px solid var(--primary)",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        minHeight: "80px",
                                        outline: "none",
                                        background: "var(--bg-panel-solid)",
                                        color: "var(--text-primary)"
                                      }}
                                      autoFocus
                                    />
                                  ) : field.type === "Opción única" || field.type === "Opción múltiple" ? (
                                    <select
                                      value={editingFormValue}
                                      onChange={(e) => setEditingFormValue(e.target.value)}
                                      style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        border: "1.5px solid var(--primary)",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        outline: "none",
                                        background: "var(--bg-panel-solid)",
                                        color: "var(--text-primary)"
                                      }}
                                      autoFocus
                                    >
                                      <option value="">Seleccionar...</option>
                                      <option value="Sí">Sí</option>
                                      <option value="No">No</option>
                                      <option value="No aplica">No aplica</option>
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={editingFormValue}
                                      onChange={(e) => setEditingFormValue(e.target.value)}
                                      style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        border: "1.5px solid var(--primary)",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        outline: "none",
                                        background: "var(--bg-panel-solid)",
                                        color: "var(--text-primary)"
                                      }}
                                      autoFocus
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleSaveFormField(field.name)}
                                    style={{
                                      border: "none",
                                      background: "#48bb78",
                                      color: "white",
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingFormField(null)}
                                    style={{
                                      border: "none",
                                      background: "#a0aec0",
                                      color: "white",
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0
                                    }}
                                  >
                                    ✗
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    if (field.type !== "Título") {
                                      setEditingFormField(field.name);
                                      setEditingFormValue(val);
                                    }
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    cursor: field.type === "Título" ? "default" : "pointer",
                                    width: "100%",
                                    height: "100%"
                                  }}
                                >
                                  {field.type === "Título" ? (
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}></span>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: "14px", color: val ? "var(--text-primary)" : "var(--text-muted)" }}>
                                        {val || "-"}
                                      </span>
                                      <span
                                        className={styles.editPencilIcon}
                                        style={{
                                          fontSize: "12px",
                                          color: "var(--primary)"
                                        }}
                                      >
                                        📝
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {fields.length === 0 && (
                        <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "20px" }}>
                          Este formulario no tiene campos configurados.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: Seguimientos / Historial Clinico */}
          {activeTab === "medical" && (
            <div>
              {/* 1. TIMELINE & LIST VIEW */}
              {medicalTabSubView === "list" && (
                <>
                  <div className={styles.followUpHeaderActions}>
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        className={styles.followUpBtnSecondary}
                        onClick={() => setShowCreateSeguimientoMenu(!showCreateSeguimientoMenu)}
                      >
                        Crear seguimiento <span>▾</span>
                      </button>
                      {showCreateSeguimientoMenu && (
                        <div className={styles.followUpDropdownMenu}>
                          {episodeTemplates.length === 0 ? (
                            <span style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                              Sin plantillas configuradas
                            </span>
                          ) : (
                            episodeTemplates.map((temp) => (
                              <button
                                key={temp.id}
                                type="button"
                                className={styles.followUpDropdownItem}
                                onClick={() => handleStartCreateFollowUp(temp)}
                              >
                                {temp.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.followUpBtnSecondary}
                      onClick={() => {
                        setPizarraEditingId(null);
                        setPizarraDate(new Date().toLocaleDateString("en-CA"));
                        setPizarraTemplateId("");
                        setPizarraTemplateName("");
                        setPizarraImage("");
                        setPizarraPoints([]);
                        setPizarraSaveAsTemplate(false);
                        setMedicalTabSubView("pizarra_create");
                      }}
                    >
                      Crear pizarra
                    </button>
                  </div>

                  {/* Episodes list */}
                  {(() => {
                    let items: any[] = [];
                    if (client?.followUps) {
                      try {
                        items = JSON.parse(client.followUps);
                      } catch {
                        items = [];
                      }
                    }

                    if (items.length === 0) {
                      return (
                        <div className={styles.followUpEmptyState}>
                          <p style={{ margin: 0, fontWeight: 600 }}>No hay ningún episodio clínico.</p>
                        </div>
                      );
                    }

                    return (
                      <div className={styles.timelineContainer}>
                        {items.map((item) => {
                          const isExpanded = expandedItems[item.id] !== false;
                          const titleText = item.type === "pizarra" ? "Pizarra" : (item.templateName || "Seguimiento");
                          
                          // 1. COLLAPSED VIEW
                          if (!isExpanded) {
                            return (
                              <div key={item.id} className={styles.timelineRow}>
                                <div className={styles.timelineTimeLabel}>
                                  <span className={styles.timelineDateLabel}>{item.date}</span>
                                  <span className={styles.timelineSubText}>
                                    {item.type === "pizarra" ? "Pizarra" : (item.hasPizarra ? "General / Pizarra" : "General")}
                                  </span>
                                </div>
                                <div className={styles.timelineNodeWrapper}>
                                  <div className={styles.timelineDot} />
                                  <div className={`${styles.timelineItem} ${styles.timelineItemCollapsed}`}>
                                    <div className={styles.timelineHeader} style={{ marginBottom: 0 }}>
                                      <button
                                        type="button"
                                        className={styles.verMasLink}
                                        onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: true }))}
                                      >
                                        Ver más
                                      </button>
                                      <div className={styles.timelineActions}>
                                        <button
                                          type="button"
                                          className={styles.timelineActionBtn}
                                          onClick={() => handleStartEditFollowUpItem(item)}
                                          title="Editar"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          type="button"
                                          className={`${styles.timelineActionBtn} ${styles.timelineActionDelete}`}
                                          onClick={() => handleDeleteFollowUpItem(item.id)}
                                          title="Eliminar"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // 2. EXPANDED VIEW
                          return (
                            <div key={item.id} className={styles.timelineRow}>
                              <div className={styles.timelineTimeLabel}>
                                <span className={styles.timelineDateLabel}>{item.date}</span>
                                <span className={styles.timelineSubText}>
                                  {item.type === "pizarra" ? "Pizarra" : (item.hasPizarra ? "General / Pizarra" : "General")}
                                </span>
                              </div>
                              <div className={styles.timelineNodeWrapper}>
                                <div className={styles.timelineDot} />
                                
                                {item.type === "seguimiento" && item.hasPizarra ? (
                                  /* Combined / Simultaneous View (Image 4) */
                                  <div className={styles.timelineSplitRow}>
                                    {/* Left Column: Follow-up details */}
                                    <div className={styles.timelineSplitLeft}>
                                      <div className={styles.timelineHeader}>
                                        <h4 className={styles.timelineTitle} style={{ margin: 0 }}>
                                          {item.templateName || "General"}
                                        </h4>
                                        <div className={styles.timelineActions}>
                                          <button
                                            type="button"
                                            className={styles.timelineActionBtn}
                                            onClick={() => handleStartEditFollowUpItem(item)}
                                            title="Editar"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            type="button"
                                            className={`${styles.timelineActionBtn} ${styles.timelineActionDelete}`}
                                            onClick={() => handleDeleteFollowUpItem(item.id)}
                                            title="Eliminar"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      </div>

                                      <div className={styles.followUpVerticalList}>
                                        {Object.entries(item.values || {}).map(([key, val]: any) => (
                                          <div key={key} className={styles.followUpVerticalField}>
                                            <strong className={styles.verticalLabel}>{key}</strong>
                                            <div className={styles.verticalText}>
                                              {val || <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Sin respuesta</span>}
                                            </div>
                                          </div>
                                        ))}

                                        {item.notes && (
                                          <div className={styles.followUpVerticalField}>
                                            <strong className={styles.verticalLabel}>Notas</strong>
                                            <div
                                              className={styles.verticalText}
                                              dangerouslySetInnerHTML={{ __html: item.notes }}
                                            />
                                          </div>
                                        )}

                                        {item.attachments && item.attachments.length > 0 && (
                                          <div className={styles.followUpVerticalField}>
                                            <strong className={styles.verticalLabel}>Archivos adjuntos</strong>
                                            <div className={styles.attachmentsListInline}>
                                              {item.attachments.map((file: any, i: number) => (
                                                <a key={i} href={file.dataUrl} download={file.name} className={styles.attachmentLinkInline}>
                                                  📎 {file.name} ({Math.round(file.size / 1024)} KB)
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        className={styles.verMasLink}
                                        style={{ marginTop: "16px" }}
                                        onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: false }))}
                                      >
                                        Ver menos
                                      </button>
                                    </div>

                                    {/* Right Column: Pizarra */}
                                    <div className={styles.timelineSplitRight}>
                                      <div className={styles.timelineHeader}>
                                        <h4 className={styles.timelineTitle} style={{ margin: 0 }}>
                                          Pizarra
                                        </h4>
                                      </div>

                                      <div
                                        className={styles.pizarraImageWrapper}
                                        style={{
                                          cursor: "default",
                                          position: "relative",
                                          border: "1px solid var(--border-color)",
                                          borderRadius: "12px",
                                          overflow: "hidden",
                                          marginTop: "8px",
                                          maxWidth: "100%"
                                        }}
                                      >
                                        <img
                                          src={item.pizarraImage}
                                          alt="Pizarra"
                                          className={styles.pizarraImage}
                                          style={{ width: "100%", height: "auto", display: "block" }}
                                        />
                                        {(item.pizarraPoints || []).map((pt: any) => (
                                          <div
                                            key={pt.id}
                                            className={styles.pizarraPin}
                                            style={{ left: `${pt.x}%`, top: `${pt.y}%`, position: "absolute" }}
                                          >
                                            {pt.number}
                                          </div>
                                        ))}
                                      </div>

                                      {item.pizarraPoints && item.pizarraPoints.length > 0 && (
                                        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                          {item.pizarraPoints.map((pt: any) => (
                                            <div key={pt.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                              <div
                                                style={{
                                                  width: "22px",
                                                  height: "22px",
                                                  borderRadius: "50%",
                                                  backgroundColor: "#06b6d4",
                                                  color: "#ffffff",
                                                  fontSize: "12px",
                                                  fontWeight: "bold",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  flexShrink: 0
                                                }}
                                              >
                                                {pt.number}
                                              </div>
                                              <span style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                                                {pt.text || <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Vacío</span>}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  /* Single Card (Pizarra-only or Seguimiento-only) */
                                  <div className={styles.timelineItem}>
                                    <div className={styles.timelineHeader}>
                                      <div>
                                        <h4 className={styles.timelineTitle} style={{ margin: 0 }}>
                                          {titleText}
                                          <span className={`${styles.timelineTypeBadge} ${item.type === "pizarra" ? styles.badgePizarra : styles.badgeFollowUp}`}>
                                            {item.type === "pizarra" ? "Pizarra" : "Seguimiento"}
                                          </span>
                                        </h4>
                                      </div>
                                      <div className={styles.timelineActions}>
                                        <button
                                          type="button"
                                          className={styles.timelineActionBtn}
                                          onClick={() => handleStartEditFollowUpItem(item)}
                                          title="Editar"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          type="button"
                                          className={`${styles.timelineActionBtn} ${styles.timelineActionDelete}`}
                                          onClick={() => handleDeleteFollowUpItem(item.id)}
                                          title="Eliminar"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>

                                    <div className={styles.timelineContent}>
                                      {item.type === "pizarra" && (
                                        <div style={{ marginTop: "8px" }}>
                                          <div
                                            className={styles.pizarraImageWrapper}
                                            style={{
                                              cursor: "default",
                                              position: "relative",
                                              border: "1px solid var(--border-color)",
                                              borderRadius: "12px",
                                              overflow: "hidden",
                                              maxWidth: "500px",
                                              marginBottom: "16px"
                                            }}
                                          >
                                            <img
                                              src={item.image}
                                              alt="Pizarra"
                                              className={styles.pizarraImage}
                                              style={{ width: "100%", height: "auto", display: "block" }}
                                            />
                                            {(item.points || []).map((pt: any) => (
                                              <div
                                                key={pt.id}
                                                className={styles.pizarraPin}
                                                style={{ left: `${pt.x}%`, top: `${pt.y}%`, position: "absolute" }}
                                              >
                                                {pt.number}
                                              </div>
                                            ))}
                                          </div>

                                          <strong style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Anotaciones:</strong>
                                          {(!item.points || item.points.length === 0) ? (
                                            <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", margin: "4px 0 0 0" }}>Sin anotaciones</p>
                                          ) : (
                                            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                              {item.points.map((pt: any) => (
                                                <div key={pt.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                  <div
                                                    style={{
                                                      width: "22px",
                                                      height: "22px",
                                                      borderRadius: "50%",
                                                      backgroundColor: "#06b6d4",
                                                      color: "#ffffff",
                                                      fontSize: "12px",
                                                      fontWeight: "bold",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      justifyContent: "center",
                                                      flexShrink: 0
                                                    }}
                                                  >
                                                    {pt.number}
                                                  </div>
                                                  <span style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                                                    {pt.text || <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Vacío</span>}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {item.type === "seguimiento" && (
                                        <div className={styles.followUpVerticalList} style={{ marginTop: "8px" }}>
                                          {Object.entries(item.values || {}).map(([key, val]: any) => (
                                            <div key={key} className={styles.followUpVerticalField}>
                                              <strong className={styles.verticalLabel}>{key}</strong>
                                              <div className={styles.verticalText}>
                                                {val || <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Sin respuesta</span>}
                                              </div>
                                            </div>
                                          ))}

                                          {item.notes && (
                                            <div className={styles.followUpVerticalField}>
                                              <strong className={styles.verticalLabel}>Notas</strong>
                                              <div
                                                className={styles.verticalText}
                                                dangerouslySetInnerHTML={{ __html: item.notes }}
                                              />
                                            </div>
                                          )}

                                          {item.attachments && item.attachments.length > 0 && (
                                            <div className={styles.followUpVerticalField}>
                                              <strong className={styles.verticalLabel}>Archivos adjuntos</strong>
                                              <div className={styles.attachmentsListInline}>
                                                {item.attachments.map((file: any, i: number) => (
                                                  <a key={i} href={file.dataUrl} download={file.name} className={styles.attachmentLinkInline}>
                                                    📎 {file.name} ({Math.round(file.size / 1024)} KB)
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        className={styles.verMasLink}
                                        style={{ marginTop: "16px" }}
                                        onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: false }))}
                                      >
                                        Ver menos
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* 2. WHITEBOARD CREATION / EDITING VIEW */}
              {(medicalTabSubView === "pizarra_create" || medicalTabSubView === "pizarra_edit") && (
                <div className={styles.pizarraContainer}>
                  <div className={styles.pizarraHeaderRow}>
                    <div className={styles.pizarraHeaderInputs}>
                      <div className={styles.pizarraInputGroup}>
                        <label>Fecha</label>
                        <input
                          type="date"
                          className="input"
                          value={pizarraDate}
                          onChange={(e) => setPizarraDate(e.target.value)}
                        />
                      </div>

                      <div className={styles.pizarraInputGroup}>
                        <label>Selecciona una plantilla</label>
                        <div className={styles.pizarraSelectWrapper}>
                          <button
                            type="button"
                            className={styles.pizarraSelectBtn}
                            onClick={() => setShowPizarraTemplateDropdown(!showPizarraTemplateDropdown)}
                          >
                            <span>{pizarraTemplateName || "Selecciona..."}</span>
                            <span>▾</span>
                          </button>
                          {showPizarraTemplateDropdown && (
                            <div className={styles.pizarraSelectDropdown}>
                              {whiteboardTemplates.map((t) => (
                                <div
                                  key={t.id}
                                  className={styles.pizarraSelectOption}
                                  onClick={() => {
                                    setPizarraTemplateId(t.id);
                                    setPizarraTemplateName(t.name);
                                    setPizarraImage(t.imageUrl);
                                    setShowPizarraTemplateDropdown(false);
                                  }}
                                >
                                  <img src={t.imageUrl} alt={t.name} className={styles.optionThumbnail} />
                                  <span>{t.name}</span>
                                </div>
                              ))}
                              {whiteboardTemplates.length === 0 && (
                                <div style={{ padding: "8px 12px", fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                  Sin resultados
                                </div>
                              )}
                              <button
                                type="button"
                                className={styles.addOptionBtn}
                                onClick={() => {
                                  setShowImageSourceSelector(true);
                                  setShowPizarraTemplateDropdown(false);
                                }}
                              >
                                <span>➕ Añadir nueva imagen</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setMedicalTabSubView("list")}
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSavePizarra}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  {pizarraImage ? (
                    <div className={styles.pizarraWorkspace}>
                      <div className={styles.pizarraLeftCol}>
                        <div
                          className={styles.pizarraImageWrapper}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            const nextNumber = pizarraPoints.length + 1;
                            setPizarraPoints([
                              ...pizarraPoints,
                              { id: Date.now(), number: nextNumber, text: "", x, y }
                            ]);
                          }}
                        >
                          <img src={pizarraImage} alt="Pizarra" className={styles.pizarraImage} />
                          {pizarraPoints.map((pt) => (
                            <div
                              key={pt.id}
                              className={styles.pizarraPin}
                              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                            >
                              {pt.number}
                            </div>
                          ))}
                        </div>

                        {medicalTabSubView === "pizarra_create" && (
                          <div className={styles.toggleContainer}>
                            <label className={styles.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={pizarraSaveAsTemplate}
                                onChange={(e) => setPizarraSaveAsTemplate(e.target.checked)}
                              />
                              <span className={styles.toggleSlider}></span>
                            </label>
                            <span className={styles.toggleLabel}>Guardar como plantilla</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.pizarraRightCol}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                          Click para anotaciones
                        </h4>
                        <div className={styles.annotationsList}>
                          {pizarraPoints.map((pt, idx) => (
                            <div key={pt.id} className={styles.annotationRow}>
                              <div className={styles.annotationNumberBadge}>{pt.number}</div>
                              <input
                                type="text"
                                className={styles.annotationInput}
                                value={pt.text}
                                placeholder="Empieza a escribir..."
                                onChange={(e) => {
                                  const updated = [...pizarraPoints];
                                  updated[idx] = { ...updated[idx], text: e.target.value };
                                  setPizarraPoints(updated);
                                }}
                              />
                              <button
                                type="button"
                                className={styles.annotationDeleteBtn}
                                onClick={() => {
                                  const filtered = pizarraPoints.filter(p => p.id !== pt.id);
                                  const renumbered = filtered.map((p, i) => ({ ...p, number: i + 1 }));
                                  setPizarraPoints(renumbered);
                                }}
                              >
                                ➖
                              </button>
                            </div>
                          ))}
                          {pizarraPoints.length === 0 && (
                            <div style={{ padding: "20px 0", color: "var(--text-secondary)", fontSize: "13px", fontStyle: "italic" }}>
                              Clica sobre la imagen para añadir anotaciones
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ border: "2px dashed var(--border-color)", padding: "80px 20px", textAlign: "center", borderRadius: "12px", background: "var(--bg-input)" }}>
                      <p style={{ margin: "0 0 16px 0", color: "var(--text-secondary)" }}>Por favor selecciona una plantilla de pizarra o añade una nueva imagen para comenzar</p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowImageSourceSelector(true)}
                      >
                        Añadir nueva imagen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. FOLLOW-UP FILLING / EDITING VIEW */}
              {(medicalTabSubView === "seguimiento_create" || medicalTabSubView === "seguimiento_edit") && (
                <div className={styles.pizarraContainer}>
                  {/* Title and Date Subheader */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--primary)" }}>Detalles</h3>
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {seguimientoDate}
                    </span>
                  </div>

                  <div className={styles.seguimientoWorkspace}>
                    {/* LEFT COLUMN: Follow-up Form Fields, Notes, Attachments */}
                    <div className={styles.seguimientoLeftCol}>
                      <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--primary)", borderBottom: "2px solid var(--primary)", paddingBottom: "6px", display: "inline-block", minWidth: "120px", fontWeight: 700 }}>
                        General
                      </h4>

                      <div className={styles.pizarraInputGroup} style={{ maxWidth: "200px", marginBottom: "16px" }}>
                        <label>Fecha</label>
                        <input
                          type="date"
                          className="input"
                          value={seguimientoDate}
                          onChange={(e) => setSeguimientoDate(e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {seguimientoFields.map((field, idx) => (
                          <div key={idx} className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>{field.name}</label>
                            {field.type === "Texto largo" ? (
                              <textarea
                                className="input"
                                style={{ minHeight: "100px", width: "100%" }}
                                value={field.value}
                                onChange={(e) => {
                                  const arr = [...seguimientoFields];
                                  arr[idx] = { ...arr[idx], value: e.target.value };
                                  setSeguimientoFields(arr);
                                }}
                                placeholder="Escribe aquí..."
                              />
                            ) : field.type === "Opción única" || field.type === "Opción múltiple" ? (
                              <input
                                type="text"
                                className="input"
                                style={{ width: "100%" }}
                                value={field.value}
                                onChange={(e) => {
                                  const arr = [...seguimientoFields];
                                  arr[idx] = { ...arr[idx], value: e.target.value };
                                  setSeguimientoFields(arr);
                                }}
                                placeholder="Escribe el valor aquí..."
                              />
                            ) : field.type === "Título" ? (
                              <h4 style={{ margin: "10px 0 4px 0", color: "var(--primary)" }}>{field.name}</h4>
                            ) : (
                              <input
                                type="text"
                                className="input"
                                style={{ width: "100%" }}
                                value={field.value}
                                onChange={(e) => {
                                  const arr = [...seguimientoFields];
                                  arr[idx] = { ...arr[idx], value: e.target.value };
                                  setSeguimientoFields(arr);
                                }}
                                placeholder="Escribe aquí..."
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* File Attachments */}
                      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                        <input
                          type="file"
                          multiple
                          id="followUpFileInput"
                          style={{ display: "none" }}
                          onChange={handleFileAttach}
                        />
                        <button
                          type="button"
                          className={styles.attachFilesBtn}
                          onClick={() => document.getElementById("followUpFileInput")?.click()}
                        >
                          ☁️ Adjuntar archivos
                        </button>
                        {seguimientoAttachments.length > 0 && (
                          <div className={styles.attachedFilesList}>
                            {seguimientoAttachments.map((file, i) => (
                              <div key={i} className={styles.attachedFileItem}>
                                <span>📎 {file.name} ({Math.round(file.size / 1024)} KB)</span>
                                <button
                                  type="button"
                                  className={styles.removeAttachedFileBtn}
                                  onClick={() => setSeguimientoAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rich Text Mock Notes Area */}
                      <div className={styles.notesSection}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Notas</label>
                        <div className={styles.notesEditorContainer}>
                          <div className={styles.richTextToolbar}>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("undo")} title="Deshacer">↺</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("redo")} title="Rehacer">↻</button>
                            <span className={styles.toolbarSeparator} />
                            <button type="button" className={styles.richTextButton} style={{ fontWeight: "bold" }} onClick={() => applyTextFormatting("bold")} title="Negrita">B</button>
                            <button type="button" className={styles.richTextButton} style={{ fontStyle: "italic" }} onClick={() => applyTextFormatting("italic")} title="Cursiva">I</button>
                            <button type="button" className={styles.richTextButton} style={{ textDecoration: "underline" }} onClick={() => applyTextFormatting("underline")} title="Subrayado">U</button>
                            <button type="button" className={styles.richTextButton} style={{ textDecoration: "line-through" }} onClick={() => applyTextFormatting("strike")} title="Tachado">S</button>
                            <span className={styles.toolbarSeparator} />
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("align-left")} title="Alinear izquierda">⫷</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("align-center")} title="Centrar">≡</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("align-right")} title="Alinear derecha">⫸</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("align-justify")} title="Justificar">≣</button>
                            <span className={styles.toolbarSeparator} />
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("list-ul")} title="Lista viñetas">•</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("list-ol")} title="Lista numerada">1.</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("hr")} title="Línea horizontal">—</button>
                            <button type="button" className={styles.richTextButton} onClick={() => applyTextFormatting("clear")} title="Borrar formato">✕</button>
                          </div>
                          <textarea
                            id="seguimientoNotesArea"
                            className={styles.notesTextarea}
                            value={seguimientoNotes}
                            onChange={(e) => setSeguimientoNotes(e.target.value)}
                            placeholder="Escribe tus notas aquí..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Pizarra Toggle & Editor */}
                    <div className={styles.seguimientoRightCol}>
                      <div className={styles.activatePizarraCard}>
                        <div className={styles.toggleContainer} style={{ margin: 0 }}>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              checked={activatePizarra}
                              onChange={(e) => setActivatePizarra(e.target.checked)}
                            />
                            <span className={styles.toggleSlider}></span>
                          </label>
                          <span className={styles.toggleLabel}>Activar pizarra</span>
                        </div>
                      </div>

                      {activatePizarra && (
                        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                          {/* Pizarra Template Selector */}
                          <div className={styles.pizarraInputGroup}>
                            <label>Selecciona una plantilla</label>
                            <div className={styles.pizarraSelectWrapper}>
                              <button
                                type="button"
                                className={styles.pizarraSelectBtn}
                                onClick={() => setShowPizarraTemplateDropdown(!showPizarraTemplateDropdown)}
                              >
                                <span>{pizarraTemplateName || "Selecciona..."}</span>
                                <span>▾</span>
                              </button>
                              {showPizarraTemplateDropdown && (
                                <div className={styles.pizarraSelectDropdown}>
                                  {whiteboardTemplates.map((t) => (
                                    <div
                                      key={t.id}
                                      className={styles.pizarraSelectOption}
                                      onClick={() => {
                                        setPizarraTemplateId(t.id);
                                        setPizarraTemplateName(t.name);
                                        setPizarraImage(t.imageUrl);
                                        setShowPizarraTemplateDropdown(false);
                                      }}
                                    >
                                      <img src={t.imageUrl} alt={t.name} className={styles.optionThumbnail} />
                                      <span>{t.name}</span>
                                    </div>
                                  ))}
                                  {whiteboardTemplates.length === 0 && (
                                    <div style={{ padding: "8px 12px", fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                      Sin resultados
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className={styles.addOptionBtn}
                                    onClick={() => {
                                      setShowImageSourceSelector(true);
                                      setShowPizarraTemplateDropdown(false);
                                    }}
                                  >
                                    <span>➕ Añadir nueva imagen</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Whiteboard workspace */}
                          {pizarraImage ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              <div
                                className={styles.pizarraImageWrapper}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                                  const nextNumber = pizarraPoints.length + 1;
                                  setPizarraPoints([
                                    ...pizarraPoints,
                                    { id: Date.now(), number: nextNumber, text: "", x, y }
                                  ]);
                                }}
                              >
                                <img src={pizarraImage} alt="Pizarra" className={styles.pizarraImage} />
                                {pizarraPoints.map((pt) => (
                                  <div
                                    key={pt.id}
                                    className={styles.pizarraPin}
                                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                                  >
                                    {pt.number}
                                  </div>
                                ))}
                              </div>

                              {/* Template check */}
                              <div className={styles.toggleContainer}>
                                <label className={styles.toggleSwitch}>
                                  <input
                                    type="checkbox"
                                    checked={pizarraSaveAsTemplate}
                                    onChange={(e) => setPizarraSaveAsTemplate(e.target.checked)}
                                  />
                                  <span className={styles.toggleSlider}></span>
                                </label>
                                <span className={styles.toggleLabel}>Guardar como plantilla</span>
                              </div>

                              {/* Annotation entries */}
                              <div>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                                  Click para anotaciones
                                </h4>
                                <div className={styles.annotationsList}>
                                  {pizarraPoints.map((pt, idx) => (
                                    <div key={pt.id} className={styles.annotationRow}>
                                      <div className={styles.annotationNumberBadge}>{pt.number}</div>
                                      <input
                                        type="text"
                                        className={styles.annotationInput}
                                        value={pt.text}
                                        placeholder="Empieza a escribir..."
                                        onChange={(e) => {
                                          const updated = [...pizarraPoints];
                                          updated[idx] = { ...updated[idx], text: e.target.value };
                                          setPizarraPoints(updated);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className={styles.annotationDeleteBtn}
                                        onClick={() => {
                                          const filtered = pizarraPoints.filter(p => p.id !== pt.id);
                                          const renumbered = filtered.map((p, i) => ({ ...p, number: i + 1 }));
                                          setPizarraPoints(renumbered);
                                        }}
                                      >
                                        ➖
                                      </button>
                                    </div>
                                  ))}
                                  {pizarraPoints.length === 0 && (
                                    <div style={{ padding: "20px 0", color: "var(--text-secondary)", fontSize: "13px", fontStyle: "italic" }}>
                                      Clica sobre la imagen para añadir anotaciones
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ border: "2px dashed var(--border-color)", padding: "40px 10px", textAlign: "center", borderRadius: "12px", background: "var(--bg-input)" }}>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                                Selecciona una plantilla o añade una nueva imagen para comenzar con la pizarra
                              </p>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "8px 12px", fontSize: "13px" }}
                                onClick={() => setShowImageSourceSelector(true)}
                              >
                                Añadir nueva imagen
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM ROW: Footer Action Buttons */}
                  <div className={styles.seguimientoFormFooter}>
                    <button
                      type="button"
                      className={styles.deleteEpisodeBtn}
                      onClick={async () => {
                        if (seguimientoEditingId) {
                          await handleDeleteFollowUpItem(seguimientoEditingId);
                          // reset follow up states
                          setSeguimientoTemplateId("");
                          setSeguimientoTemplateName("");
                          setSeguimientoFields([]);
                          setSeguimientoEditingId(null);
                          setSeguimientoNotes("");
                          setSeguimientoAttachments([]);
                          setActivatePizarra(false);
                          
                          // reset pizarra states
                          setPizarraTemplateId("");
                          setPizarraTemplateName("");
                          setPizarraImage("");
                          setPizarraPoints([]);
                          setPizarraSaveAsTemplate(false);
                          
                          setMedicalTabSubView("list");
                        } else {
                          // just clear form inputs
                          setSeguimientoFields(prev => prev.map(f => ({ ...f, value: "" })));
                          setSeguimientoNotes("");
                          setSeguimientoAttachments([]);
                          setPizarraPoints([]);
                          setPizarraImage("");
                        }
                      }}
                    >
                      Borrar episodio
                    </button>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        className={styles.formCancelBtn}
                        onClick={() => setMedicalTabSubView("list")}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={styles.formPrintBtn}
                        onClick={() => window.print()}
                      >
                        Imprimir
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSaveEpisodeFollowUp}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Permisos */}
          {activeTab === "permissions" && (
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "12px" }}>Permisos de Acceso a Ficha</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                Selecciona qué profesionales de la clínica tienen permisos específicos para ver y gestionar la ficha de este paciente:
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                {allStaff.map((staff) => (
                  <label key={staff.id} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedPermissions.includes(staff.id)}
                      onChange={() => handleTogglePermission(staff.id)}
                      style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{staff.name}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
                      ({staff.role === "ADMIN" ? "Administrador" : staff.role === "DOCTOR" ? "Fisioterapeuta" : "Personal"})
                    </span>
                  </label>
                ))}
              </div>
              
              <button className="btn btn-primary" onClick={handleSavePermissions}>
                Guardar Cambios de Permisos
              </button>
            </div>
          )}

          {/* TAB 6: Artículos / Ventas */}
          {activeTab === "billing" && (
            <div className={styles.billingPanel}>
              {/* Horizontal sub-tabs and add article button (Image 4) */}
              <div className={styles.subTabsHeaderRow}>
                <div className={styles.billingSubTabsList}>
                  {(["citas", "productos", "bonos", "suscripciones", "presupuestos"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`${styles.billingSubTabBtn} ${billingSubTab === tab ? styles.billingSubTabActive : ""}`}
                      onClick={() => setBillingSubTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={styles.btnAddArticle}
                    onClick={() => setAddArticleMenuOpen(!addArticleMenuOpen)}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>Añadir artículo</span>
                  </button>

                  {addArticleMenuOpen && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "6px",
                      background: "var(--bg-panel-solid)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                      zIndex: 100,
                      minWidth: "180px",
                      padding: "6px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAddArticleMenuOpen(false);
                          router.push(`/dashboard/agenda?clientId=${id}`);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          width: "100%",
                          textAlign: "left"
                        }}
                      >
                        <span>📅</span> Cita
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddArticleMenuOpen(false);
                          setBillingSubTab("productos");
                          setShowAssignProductModal(true);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          width: "100%",
                          textAlign: "left"
                        }}
                      >
                        <span>🛍️</span> Producto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddArticleMenuOpen(false);
                          setBillingSubTab("bonos");
                          setShowAddVoucherModal(true);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          width: "100%",
                          textAlign: "left"
                        }}
                      >
                        <span>📄</span> Bono
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddArticleMenuOpen(false);
                          setBillingSubTab("suscripciones");
                          toast.info("Módulo de suscripciones");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          width: "100%",
                          textAlign: "left"
                        }}
                      >
                        <span>💲</span> Suscripción
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddArticleMenuOpen(false);
                          setBillingSubTab("presupuestos");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          width: "100%",
                          textAlign: "left"
                        }}
                      >
                        <span>📝</span> Presupuesto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-tab content */}
              <div className={styles.billingSubTabContent} style={{ marginTop: "20px" }}>
                {billingSubTab === "bonos" && (
                  <div className={styles.associatedVouchersSection}>
                    <h4 className={styles.sectionSubtitle}>Bonos asociados</h4>
                    
                    {(!client.vouchers || client.vouchers.length === 0) ? (
                      <div className={styles.emptyState}>No hay bonos asociados para este paciente.</div>
                    ) : (
                      <div className={styles.vouchersGrid}>
                        {client.vouchers.map((voucher) => {
                          const isExpired = voucher.expirationDate ? new Date(voucher.expirationDate) < new Date() : false;
                          return (
                            <div key={voucher.id} className={styles.clientVoucherCard} style={{ borderLeft: isExpired ? "4px solid var(--danger)" : "4px solid var(--primary)" }}>
                              <div className={styles.voucherCardHeader}>
                                <h5 className={styles.voucherCardTitle}>{voucher.name}</h5>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    className={styles.voucherEditBtn}
                                    onClick={() => handleOpenShareVoucherModal(voucher)}
                                    title="Compartir bono"
                                    style={{ color: "var(--primary)" }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                      <circle cx="9" cy="7" r="4" />
                                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.voucherEditBtn}
                                    onClick={() => handleStartEditClientVoucher(voucher)}
                                    title="Editar bono"
                                  >
                                    <Icons.Edit size={16} />
                                  </button>
                                  {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Eliminar clientes")) && (
                                    <button
                                      type="button"
                                      className={styles.voucherDeleteBtn}
                                      onClick={() => handleDeleteClientVoucher(voucher.id)}
                                      title="Eliminar bono"
                                    >
                                      <Icons.Trash size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className={styles.voucherCardBody}>
                                {(() => {
                                  const paymentInfo = getVoucherPaymentInfo(voucher.id);
                                  return (
                                    <>
                                      <div className={styles.voucherSessionsInfo}>
                                        <span className={styles.sessionsLabel}>Sesiones restantes:</span>
                                        <strong className={styles.sessionsValue}>{voucher.remainingSessions} / {voucher.sessions}</strong>
                                      </div>

                                      <div className={styles.voucherExpirationInfo}>
                                        <span>Caducidad:</span>
                                        {voucher.expirationDate ? (
                                          <span style={{ color: isExpired ? "var(--danger)" : "inherit", fontWeight: isExpired ? "bold" : "normal" }}>
                                            {isExpired ? "Expirado el " : "Caduca el "}{new Date(voucher.expirationDate).toLocaleDateString("es-ES")}
                                          </span>
                                        ) : (
                                          <span>Sin caducidad</span>
                                        )}
                                      </div>

                                      <div className={styles.voucherExpirationInfo} style={{ marginTop: "4px" }}>
                                        <span>Estado de pago:</span>
                                        <span style={{ 
                                          fontWeight: "bold",
                                          color: paymentInfo.isPaid ? "#10b981" : paymentInfo.isPartial ? "#f59e0b" : "var(--danger)"
                                        }}>
                                          {paymentInfo.isPaid ? " Pagado" : paymentInfo.isPartial ? " Pago parcial" : " No pagado"}
                                        </span>
                                      </div>

                                      {/* Progress bar */}
                                      <div className={styles.voucherProgressBarBg} style={{ backgroundColor: "var(--bg-input)", height: "8px", borderRadius: "4px", margin: "12px 0", overflow: "hidden" }}>
                                        <div 
                                          className={styles.voucherProgressBarFill} 
                                          style={{ 
                                            backgroundColor: isExpired ? "var(--border-color)" : "var(--primary)", 
                                            width: `${(voucher.remainingSessions / voucher.sessions) * 100}%`,
                                            height: "100%",
                                            transition: "width 0.3s ease"
                                          }} 
                                        />
                                      </div>

                                      {/* Shared clients list */}
                                      {voucher.sharedClientIds && voucher.sharedClientIds.split(",").filter(Boolean).length > 0 && (
                                        <div style={{ marginBottom: "10px", padding: "8px", background: "var(--primary-light)", borderRadius: "6px", border: "1px solid var(--primary)" }}>
                                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)", marginBottom: "4px" }}>Compartido con:</div>
                                          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                            {voucher.sharedClientIds.split(",").filter(Boolean).length} persona(s)
                                          </div>
                                        </div>
                                      )}

                                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          style={{ width: "100%", padding: "8px 12px", fontSize: "13px" }}
                                          disabled={voucher.remainingSessions <= 0 || isExpired}
                                          onClick={() => handleConsumeVoucherSession(voucher.id)}
                                        >
                                          Consumir sesión
                                        </button>
                                        {paymentInfo.isPaid ? (
                                          <Link
                                            href={`/dashboard/sales?saleId=${paymentInfo.saleId}`}
                                            className="btn btn-secondary"
                                            style={{ 
                                              width: "100%", 
                                              padding: "8px 12px", 
                                              fontSize: "13px", 
                                              display: "inline-flex", 
                                              justifyContent: "center", 
                                              alignItems: "center",
                                              backgroundColor: "var(--primary)",
                                              borderColor: "var(--primary)",
                                              color: "#ffffff"
                                            }}
                                          >
                                            Ver Venta
                                          </Link>
                                        ) : (
                                          <Link
                                            href={`/dashboard/sales?clientId=${id}&clientVoucherId=${voucher.id}`}
                                            className="btn btn-secondary"
                                            style={{ width: "100%", padding: "8px 12px", fontSize: "13px", display: "inline-flex", justifyContent: "center", alignItems: "center" }}
                                          >
                                            Finalizar compra
                                          </Link>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {billingSubTab === "citas" && (() => {
                  const now = new Date();
                  const allApps = (client.appointments || []).filter((a: any) => !a.deletedAt);
                  const pastApps = allApps.filter((a: any) => new Date(a.start) < now).sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime());
                  const futureApps = allApps.filter((a: any) => new Date(a.start) >= now).sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
                  const displayApps = citasTimeFilter === "pasado" ? pastApps : futureApps;

                  const getStatusLabel = (status: string) => {
                    switch (status) {
                      case "CONFIRMED": return "Confirmado";
                      case "COMPLETED": return "Completado";
                      case "PENDING": return "Sin confirmar";
                      case "CANCELLED": return "Cancelado";
                      case "NOSHOW": return "No presentado";
                      default: return status;
                    }
                  };

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case "CONFIRMED": return { bg: "#10b981", text: "#fff" };
                      case "COMPLETED": return { bg: "#10b981", text: "#fff" };
                      case "PENDING": return { bg: "#6b7280", text: "#fff" };
                      case "CANCELLED": return { bg: "#ef4444", text: "#fff" };
                      case "NOSHOW": return { bg: "#f59e0b", text: "#fff" };
                      default: return { bg: "#6b7280", text: "#fff" };
                    }
                  };

                  const handleChangeAppStatus = async (appId: string, newStatus: string) => {
                    setCitasStatusMenuOpen(null);
                    try {
                      const res = await fetch(`/api/appointments/${appId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: newStatus }),
                      });
                      if (res.ok) {
                        fetchClientDetails();
                      }
                    } catch (err) {
                      console.error("Error updating appointment status", err);
                    }
                  };

                  // Helper: find registered sale for appointment
                  const getAppointmentSale = (appId: string) => {
                    if (!client.sales || client.sales.length === 0) return null;
                    return client.sales.find((s: any) => {
                      if (s.paymentMethod === "OTHER") return false;
                      try {
                        const items = typeof s.itemsJson === "string" ? JSON.parse(s.itemsJson) : (s.itemsJson || []);
                        return Array.isArray(items) && items.some((i: any) => 
                          i.id === `db-app-${appId}` || 
                          i.id === appId || 
                          i.appointmentId === appId
                        );
                      } catch {
                        return false;
                      }
                    }) || null;
                  };

                  return (
                    <div>
                      <h4 className={styles.sectionSubtitle}>Citas</h4>

                      {/* Pasado / Futuro toggle */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div style={{ display: "flex", gap: 0, background: "var(--bg-input)", borderRadius: "8px", padding: "3px" }}>
                          {(["pasado", "futuro"] as const).map(filter => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setCitasTimeFilter(filter)}
                              style={{
                                padding: "5px 18px",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: citasTimeFilter === filter ? 700 : 400,
                                fontSize: "13px",
                                background: citasTimeFilter === filter ? "var(--bg-panel-solid)" : "transparent",
                                color: citasTimeFilter === filter ? "var(--text-primary)" : "var(--text-secondary)",
                                boxShadow: citasTimeFilter === filter ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                                transition: "all 0.18s"
                              }}
                            >
                              {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {displayApps.length === 0 ? (
                        <div className={styles.emptyState}>No hay citas {citasTimeFilter === "pasado" ? "pasadas" : "futuras"} registradas.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {displayApps.map((app: any) => {
                            const matchedSale = getAppointmentSale(app.id);
                            const paid = !!matchedSale;
                            const statusColors = getStatusColor(app.status);
                            const isMenuOpen = citasStatusMenuOpen === app.id;

                            return (
                              <div
                                key={app.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "10px 4px",
                                  borderBottom: "1px solid var(--border-color)",
                                  flexWrap: "wrap"
                                }}
                              >
                                {/* Date + time */}
                                <span style={{ fontSize: "13px", color: "var(--text-secondary)", minWidth: "160px", flexShrink: 0 }}>
                                  {new Date(app.start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })},
                                  {" "}{new Date(app.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}-{new Date(app.end).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                </span>

                                {/* Service */}
                                <span style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 600, minWidth: "120px" }}>
                                  {app.service?.name || "Servicio"}
                                </span>

                                {/* User */}
                                <span style={{ fontSize: "13px", color: "var(--text-primary)", minWidth: "100px" }}>
                                  {app.user?.name || ""}
                                </span>

                                {/* Payment badge */}
                                <span style={{
                                  padding: "3px 10px",
                                  borderRadius: "16px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: paid ? "#10b981" : "#ef4444",
                                  color: "#fff",
                                  flexShrink: 0
                                }}>
                                  {paid ? "PAGADO" : "NO PAGADO"}
                                </span>

                                {/* Status dropdown */}
                                <div style={{ position: "relative", flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => setCitasStatusMenuOpen(isMenuOpen ? null : app.id)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      padding: "4px 12px",
                                      borderRadius: "16px",
                                      border: "none",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      background: statusColors.bg,
                                      color: statusColors.text
                                    }}
                                  >
                                    {getStatusLabel(app.status)}
                                    <span style={{ fontSize: "10px" }}>▾</span>
                                  </button>
                                  {isMenuOpen && (
                                    <div style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: 0,
                                      background: "var(--bg-panel-solid)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "8px",
                                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                                      zIndex: 999,
                                      minWidth: "160px",
                                      marginTop: "4px",
                                      overflow: "hidden"
                                    }}>
                                      {(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NOSHOW"] as const).map(st => {
                                        const sc = getStatusColor(st);
                                        return (
                                          <button
                                            key={st}
                                            type="button"
                                            onClick={() => handleChangeAppStatus(app.id, st)}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              width: "100%",
                                              padding: "8px 14px",
                                              border: "none",
                                              background: app.status === st ? "var(--bg-input)" : "transparent",
                                              cursor: "pointer",
                                              fontSize: "13px",
                                              textAlign: "left",
                                              fontWeight: app.status === st ? 700 : 400
                                            }}
                                          >
                                            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: sc.bg, flexShrink: 0 }} />
                                            {getStatusLabel(st)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Ver venta / Mostrar en Caja */}
                                {paid ? (
                                  <Link
                                    href={`/dashboard/sales?clientId=${id}&saleId=${matchedSale.id}`}
                                    style={{
                                      padding: "4px 14px",
                                      borderRadius: "6px",
                                      border: "1px solid var(--border-color)",
                                      background: "var(--bg-panel-solid)",
                                      fontSize: "12px",
                                      color: "var(--text-primary)",
                                      textDecoration: "none",
                                      fontWeight: 500,
                                      flexShrink: 0
                                    }}
                                  >
                                    Ver venta
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/dashboard/sales?clientId=${id}&appointmentId=${app.id}`}
                                    style={{
                                      padding: "4px 14px",
                                      borderRadius: "6px",
                                      border: "1px solid var(--border-color)",
                                      background: "var(--bg-panel-solid)",
                                      fontSize: "12px",
                                      color: "var(--text-secondary)",
                                      textDecoration: "none",
                                      fontWeight: 500,
                                      flexShrink: 0
                                    }}
                                  >
                                    Mostrar en Caja
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {billingSubTab === "productos" && (
                  <div>
                    <h4 className={styles.sectionSubtitle} style={{ color: "var(--primary)", fontWeight: 700, fontSize: "15px", marginBottom: "20px" }}>
                      Productos asociados
                    </h4>
                    {clientProductsList.length === 0 ? (
                      <div className={styles.emptyState} style={{ padding: "30px 0", color: "var(--text-muted)", fontSize: "14px", textAlign: "left" }}>
                        No hay productos asociados
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {clientProductsList.map((cp) => {
                          const cpDateStr = new Date(cp.date || cp.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
                          const isPaid = cp.isPaid || false;

                          return (
                            <div
                              key={cp.id}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                padding: "16px 20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "16px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                              }}
                            >
                              {/* Left side: Date & Product Name */}
                              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                                  {cpDateStr}
                                </span>
                                <span style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>
                                  {cp.productName}
                                </span>
                              </div>

                              {/* Right side: Badge, Action button, and ooo menu */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "4px 12px",
                                    borderRadius: "16px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    letterSpacing: "0.3px",
                                    background: isPaid ? "#10b981" : "#ef4444",
                                    color: "#ffffff"
                                  }}
                                >
                                  {isPaid ? "PAGADO" : "NO PAGADO"}
                                </span>

                                {!isPaid ? (
                                  <Link
                                    href={`/dashboard/sales?clientId=${id}&clientProductId=${cp.id}`}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "8px",
                                      border: "1px solid #cbd5e1",
                                      background: "#ffffff",
                                      fontSize: "13px",
                                      color: "#334155",
                                      textDecoration: "none",
                                      fontWeight: 500,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    Finalizar compra
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/dashboard/sales?clientId=${id}`}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "8px",
                                      border: "1px solid var(--primary)",
                                      background: "var(--primary)",
                                      fontSize: "13px",
                                      color: "#ffffff",
                                      textDecoration: "none",
                                      fontWeight: 500,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}
                                  >
                                    Ver Venta
                                  </Link>
                                )}

                                {/* Menu 3 dots ooo */}
                                <div style={{ position: "relative" }}>
                                  <button
                                    type="button"
                                    onClick={() => setClientProductMenuOpen(clientProductMenuOpen === cp.id ? null : cp.id)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      fontSize: "16px",
                                      color: "#94a3b8",
                                      cursor: "pointer",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      letterSpacing: "1px"
                                    }}
                                    title="Opciones"
                                  >
                                    ooo
                                  </button>

                                  {clientProductMenuOpen === cp.id && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "100%",
                                        right: 0,
                                        marginTop: "4px",
                                        background: "#ffffff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                        zIndex: 100,
                                        minWidth: "130px",
                                        padding: "4px 0",
                                        overflow: "hidden"
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setClientProductMenuOpen(null);
                                          handleOpenEditClientProduct(cp);
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "8px 14px",
                                          background: "none",
                                          border: "none",
                                          textAlign: "left",
                                          fontSize: "13px",
                                          color: "#1e293b",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          fontWeight: 500
                                        }}
                                      >
                                        <span>✏️</span> Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setClientProductMenuOpen(null);
                                          handleDeleteClientProduct(cp.id);
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "8px 14px",
                                          background: "none",
                                          border: "none",
                                          textAlign: "left",
                                          fontSize: "13px",
                                          color: "#ef4444",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          fontWeight: 500
                                        }}
                                      >
                                        <span>🗑️</span> Eliminar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {billingSubTab === "suscripciones" && (
                  <div>
                    <h4 className={styles.sectionSubtitle}>Suscripciones activas</h4>
                    <div className={styles.emptyState}>No hay suscripciones activas para este paciente.</div>
                  </div>
                )}

                {billingSubTab === "presupuestos" && (
                  <div>
                    <h4 className={styles.sectionSubtitle}>Presupuestos emitidos</h4>
                    <div className={styles.emptyState}>No hay presupuestos emitidos para este paciente.</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "budgets" && (

            <div className={styles.billingPanel}>
              <div className={styles.subTabsHeaderRow} style={{ borderBottom: "none", marginBottom: "16px" }}>
                <h3 className={styles.sectionSubtitle} style={{ margin: 0 }}>Presupuestos del Paciente</h3>
                <button
                  type="button"
                  className={styles.btnAddArticle}
                  onClick={() => handleOpenBudgetModal()}
                >
                  <Icons.Plus size={16} style={{ marginRight: "6px" }} />
                  <span>Crear Presupuesto</span>
                </button>
              </div>

              {clientBudgets.length === 0 ? (
                <div className={styles.emptyState}>No hay presupuestos registrados para este paciente.</div>
              ) : (
                <div className="table-container">
                  <table className="table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-input)", color: "var(--text-secondary)", fontWeight: 600 }}>
                        <th style={{ padding: "10px", textAlign: "left" }}>Nº Presupuesto</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Concepto</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Fecha Emisión</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Total</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Saldo Restante</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Estado</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientBudgets.map((b) => (
                        <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "10px" }}><strong>PRE-{b.budgetNumber}</strong></td>
                          <td style={{ padding: "10px" }}>{b.title}</td>
                          <td style={{ padding: "10px" }}>{new Date(b.createdAt).toLocaleDateString("es-ES")}</td>
                          <td style={{ padding: "10px", fontWeight: "bold" }}>{b.total.toFixed(2)}€</td>
                          <td style={{ padding: "10px", color: b.remainingAmount > 0 ? "#10b981" : "var(--text-secondary)" }}>
                            {b.status === "ACCEPTED" ? `${b.remainingAmount.toFixed(2)}€` : "-"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                              background: b.status === "ACCEPTED" ? "rgba(16,185,129,0.12)" : b.status === "REJECTED" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                              color: b.status === "ACCEPTED" ? "#10b981" : b.status === "REJECTED" ? "#ef4444" : "#f59e0b"
                            }}>
                              {b.status === "ACCEPTED" ? "Aceptado" : b.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                            </span>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenBudgetModal(b)}
                                style={{ padding: "3px 8px", fontSize: "11px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "4px", cursor: "pointer" }}
                              >
                                ✏️ Editar
                              </button>
                              {b.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => handleAcceptBudgetDirectly(b.id, b.total)}
                                  style={{ padding: "3px 8px", fontSize: "11px", background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  ✔️ Aceptar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePrintBudget(b)}
                                style={{ padding: "3px 8px", fontSize: "11px", background: "var(--primary-light)", color: "var(--primary)", border: "1px solid rgba(2,132,199,0.3)", borderRadius: "4px", cursor: "pointer" }}
                              >
                                🖨️ PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBudget(b.id)}
                                style={{ padding: "3px 8px", fontSize: "11px", background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "4px", cursor: "pointer" }}
                              >
                                🗑️ Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* TAB 8: Fotos Antes/Después */}
          {activeTab === "photos" && (
            <div className={styles.documentsPanel} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 2fr", gap: "32px", alignItems: "start" }}>
                
                {/* COLUMNA IZQUIERDA: CONTROLES DE SUBIDA Y SELECTORES */}
                <div style={{ display: "flex", flexDirection: "column", gap: isMobile && !isFormExpanded ? "0px" : "20px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div
                    onClick={() => isMobile && setIsFormExpanded(!isFormExpanded)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: isMobile ? "pointer" : "default",
                      userSelect: "none"
                    }}
                  >
                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#006687", margin: 0 }}>
                      Añadir Nueva Foto
                    </h3>
                    {isMobile && (
                      <span style={{ fontSize: "12px", color: "#006687", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                        {isFormExpanded ? "Contraer" : "Configurar y Añadir"}
                        {isFormExpanded ? <Icons.ChevronDown size={16} /> : <Icons.ChevronRight size={16} />}
                      </span>
                    )}
                  </div>

                  {(!isMobile || isFormExpanded) && (
                    <>
                      {/* Selector Antes/Después */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Tipo de Foto</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            type="button"
                            onClick={() => setPhotoType("BEFORE")}
                            style={{
                              flex: 1,
                              padding: "10px",
                              borderRadius: "8px",
                              border: photoType === "BEFORE" ? "2px solid #006687" : "1px solid #cbd5e1",
                              background: photoType === "BEFORE" ? "rgba(0, 102, 135, 0.08)" : "#ffffff",
                              color: photoType === "BEFORE" ? "#006687" : "#475569",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            Antes (Before)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoType("AFTER")}
                            style={{
                              flex: 1,
                              padding: "10px",
                              borderRadius: "8px",
                              border: photoType === "AFTER" ? "2px solid #006687" : "1px solid #cbd5e1",
                              background: photoType === "AFTER" ? "rgba(0, 102, 135, 0.08)" : "#ffffff",
                              color: photoType === "AFTER" ? "#006687" : "#475569",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            Después (After)
                          </button>
                        </div>
                      </div>

                      {/* Selector de Ángulo */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Ángulo / Perspectiva</label>
                        <select
                          value={photoAngle}
                          onChange={(e) => setPhotoAngle(e.target.value)}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            background: "#ffffff",
                            outline: "none"
                          }}
                        >
                          <option value="Frente">Frente</option>
                          <option value="Perfil Izquierdo">Perfil Izquierdo</option>
                          <option value="Perfil Derecho">Perfil Derecho</option>
                          <option value="Otro">Otro ángulo...</option>
                        </select>
                        {photoAngle === "Otro" && (
                          <input
                            type="text"
                            placeholder="Especifica el ángulo (ej: 45 grados)"
                            value={customAngleInput}
                            onChange={(e) => setCustomAngleInput(e.target.value)}
                            style={{
                              padding: "10px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                              outline: "none",
                              marginTop: "6px"
                            }}
                          />
                        )}
                      </div>

                      {/* Relación con Cita */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Vincular a Cita (Opcional)</label>
                        <select
                          value={photoAppointmentId}
                          onChange={(e) => setPhotoAppointmentId(e.target.value)}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            background: "#ffffff",
                            outline: "none"
                          }}
                        >
                          <option value="">-- No vincular a ninguna cita --</option>
                          {client.appointments?.map((app: any) => {
                            const dateStr = new Date(app.start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
                            return (
                              <option key={app.id} value={app.id}>
                                {dateStr} - {app.service?.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Descripción */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Descripción / Nota</label>
                        <input
                          type="text"
                          placeholder="Ej. Vista lateral izquierda, sesión 1..."
                          value={photoDescription}
                          onChange={(e) => setPhotoDescription(e.target.value)}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            outline: "none"
                          }}
                        />
                      </div>

                      {/* Acciones de Subida */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "10px" }}>
                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => setIsCameraModalOpen(true)}
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#006687",
                            color: "#ffffff",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 102, 135, 0.2)"
                          }}
                        >
                          <Icons.Camera size={16} />
                          <span>Hacer Foto</span>
                        </button>

                        <button
                          type="button"
                          disabled={uploadingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #006687",
                            background: "#ffffff",
                            color: "#006687",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                          }}
                        >
                          <Icons.Image size={16} />
                          <span>Subir Foto</span>
                        </button>
                        
                        <input
                          type="file"
                          ref={photoInputRef}
                          onChange={handlePhotoFileChange}
                          accept="image/*"
                          style={{ display: "none" }}
                        />
                      </div>
                      {uploadingPhoto && <span style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>Subiendo imagen...</span>}

                      {/* PANEL COMPARADOR MANUAL */}
                      <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px", marginTop: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                          Comparación Manual
                        </h4>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                          Selecciona una foto de Antes y otra de Después para compararlas en el slider deslizante.
                        </p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                          <div style={{ flex: 1, height: "60px", border: "1.5px dashed #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", background: "#ffffff" }}>
                            {compareBeforePhoto ? (
                              <>
                                <img src={compareBeforePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <button onClick={() => setCompareBeforePhoto(null)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(15,23,42,0.6)", border: "none", color: "#ffffff", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", cursor: "pointer" }}>✕</button>
                              </>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Antes</span>
                            )}
                          </div>
                          <div style={{ flex: 1, height: "60px", border: "1.5px dashed #cbd5e1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", background: "#ffffff" }}>
                            {compareAfterPhoto ? (
                              <>
                                <img src={compareAfterPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <button onClick={() => setCompareAfterPhoto(null)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(15,23,42,0.6)", border: "none", color: "#ffffff", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", cursor: "pointer" }}>✕</button>
                              </>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Después</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!compareBeforePhoto || !compareAfterPhoto}
                          onClick={() => setIsComparingOpen(true)}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            border: "none",
                            background: (!compareBeforePhoto || !compareAfterPhoto) ? "#cbd5e1" : "#0f172a",
                            color: "#ffffff",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: (!compareBeforePhoto || !compareAfterPhoto) ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px"
                          }}
                        >
                          <Icons.Columns size={16} />
                          <span>Comparar Fotos</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* COLUMNA DERECHA: HISTORIAL DE FOTOS POR SESIÓN */}
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#006687", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    Historial de Sesiones y Fotos
                  </h3>

                  {(!client.photos || client.photos.length === 0) ? (
                    <div style={{ padding: "40px", border: "2px dashed #cbd5e1", borderRadius: "12px", textAlign: "center", color: "#64748b" }}>
                      <Icons.Image size={40} style={{ color: "#94a3b8", marginBottom: "12px", display: "inline-block" }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No hay fotos registradas para este paciente.</p>
                      <p style={{ margin: "4px 0 0", fontSize: "13px" }}>Usa la columna izquierda para tomar o adjuntar fotos de antes y después.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      
                      {/* Agrupación por Cita/Sesión (Ordenadas de más recientes a antiguas, colapsables) */}
                      {(() => {
                        const sortedApps = [...(client.appointments || [])].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
                        return sortedApps.map((app: any) => {
                          const appPhotos = client.photos.filter((p: any) => p.appointmentId === app.id);
                          if (appPhotos.length === 0) return null;

                          const angles = Array.from(new Set(appPhotos.map((p: any) => p.angle || "Frente")));
                          const dateStr = new Date(app.start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
                          const isExpanded = !!expandedAppointments[app.id];

                          return (
                            <div
                              key={app.id}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                padding: "16px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                display: "flex",
                                flexDirection: "column",
                                gap: isExpanded ? "16px" : "0px",
                                transition: "all 0.2s"
                              }}
                            >
                              {/* Session Header (Clickable to Collapse/Expand) */}
                              <div
                                onClick={() => setExpandedAppointments(prev => ({ ...prev, [app.id]: !prev[app.id] }))}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderBottom: isExpanded ? "1px solid #f1f5f9" : "none",
                                  paddingBottom: isExpanded ? "10px" : "0px",
                                  cursor: "pointer",
                                  userSelect: "none"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {isExpanded ? <Icons.ChevronDown size={18} style={{ color: "#006687" }} /> : <Icons.ChevronRight size={18} style={{ color: "#94a3b8" }} />}
                                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                                    {app.service?.name}
                                  </span>
                                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    {dateStr}
                                  </span>
                                </div>
                                <span style={{ fontSize: "11px", color: "#006687", fontWeight: 600 }}>
                                  {isExpanded ? "Contraer" : `Ver fotos (${appPhotos.length})`}
                                </span>
                              </div>

                              {/* Loop through unique angles only if expanded */}
                              {isExpanded && angles.map((angle) => {
                                const anglePhotos = appPhotos.filter((p: any) => (p.angle || "Frente") === angle);
                                const beforePhoto = anglePhotos.find((p: any) => p.type === "BEFORE");
                                const afterPhoto = anglePhotos.find((p: any) => p.type === "AFTER");

                                return (
                                  <div key={angle} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#006687" }}>
                                        Ángulo: {angle}
                                      </span>
                                      {beforePhoto && afterPhoto && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation(); // Avoid collapsing the card
                                            setCompareBeforePhoto(beforePhoto.photoUrl);
                                            setCompareAfterPhoto(afterPhoto.photoUrl);
                                            setIsComparingOpen(true);
                                          }}
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: "6px",
                                            border: "none",
                                            background: "rgba(0, 102, 135, 0.1)",
                                            color: "#006687",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                          }}
                                        >
                                          <Icons.Columns size={12} />
                                          <span>Deslizar Comparador</span>
                                        </button>
                                      )}
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                      {/* Antes */}
                                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Antes</span>
                                        {beforePhoto ? (
                                          <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "1px solid #cbd5e1" }}>
                                            <img src={beforePhoto.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,23,42,0.6)", color: "#ffffff", padding: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                              <span style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                                                {beforePhoto.description || "Sin descripción"}
                                              </span>
                                              <div style={{ display: "flex", gap: "4px" }}>
                                                <button onClick={(e) => { e.stopPropagation(); setCompareBeforePhoto(beforePhoto.photoUrl); }} title="Seleccionar para comparar" style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: "2px" }}><Icons.Plus size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handlePhotoDelete(beforePhoto.id); }} title="Eliminar foto" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}><Icons.Trash size={14} /></button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div style={{ height: "80px", border: "1.5px dashed #cbd5e1", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", background: "#ffffff" }} onClick={(e) => { e.stopPropagation(); setPhotoType("BEFORE"); setPhotoAngle(angle); setPhotoAppointmentId(app.id); photoInputRef.current?.click(); }}>
                                            <Icons.Plus size={14} style={{ color: "#94a3b8" }} />
                                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>Añadir Antes</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Después */}
                                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Después</span>
                                        {afterPhoto ? (
                                          <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "1px solid #cbd5e1" }}>
                                            <img src={afterPhoto.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,23,42,0.6)", color: "#ffffff", padding: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                              <span style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                                                {afterPhoto.description || "Sin descripción"}
                                              </span>
                                              <div style={{ display: "flex", gap: "4px" }}>
                                                <button onClick={(e) => { e.stopPropagation(); setCompareAfterPhoto(afterPhoto.photoUrl); }} title="Seleccionar para comparar" style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: "2px" }}><Icons.Plus size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handlePhotoDelete(afterPhoto.id); }} title="Eliminar foto" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}><Icons.Trash size={14} /></button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div style={{ height: "80px", border: "1.5px dashed #cbd5e1", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", background: "#ffffff" }} onClick={(e) => { e.stopPropagation(); setPhotoType("AFTER"); setPhotoAngle(angle); setPhotoAppointmentId(app.id); photoInputRef.current?.click(); }}>
                                            <Icons.Plus size={14} style={{ color: "#94a3b8" }} />
                                            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>Añadir Después</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {isExpanded && (
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintCollage(app, appPhotos, angles);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "#006687",
                                      color: "#ffffff",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px"
                                    }}
                                  >
                                    <Icons.Columns size={14} />
                                    <span>Generar Reporte / Collage PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}

                      {/* Fotos sueltas (sin vincular a cita) */}
                      {(() => {
                        const loosePhotos = client.photos.filter((p: any) => !p.appointmentId);
                        if (loosePhotos.length === 0) return null;

                        return (
                          <div
                            style={{
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              padding: "16px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                            }}
                          >
                            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#475569", margin: "0 0 12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                              Otras Fotos (Sin Cita Vinculada)
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px" }}>
                              {loosePhotos.map((photo: any) => (
                                <div key={photo.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "1px solid #cbd5e1" }}>
                                    <img src={photo.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <span style={{ position: "absolute", top: 4, left: 4, background: photo.type === "BEFORE" ? "#0f172a" : "#006687", color: "#ffffff", fontSize: "9px", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                      {photo.type === "BEFORE" ? "ANTES" : "DESPUÉS"}
                                    </span>
                                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,23,42,0.6)", color: "#ffffff", padding: "4px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }} title={`${photo.angle || "Frente"}: ${photo.description || ""}`}>
                                        {photo.angle || "Frente"}: {photo.description || "Foto"}
                                      </span>
                                      <div style={{ display: "flex", gap: "4px" }}>
                                        <button onClick={() => photo.type === "BEFORE" ? setCompareBeforePhoto(photo.photoUrl) : setCompareAfterPhoto(photo.photoUrl)} title="Seleccionar para comparar" style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: "1px" }}><Icons.Plus size={12} /></button>
                                        <button onClick={() => handlePhotoDelete(photo.id)} title="Eliminar foto" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "1px" }}><Icons.Trash size={12} /></button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 9: Línea de Tiempo */}
          {activeTab === "timeline" && client && (() => {
            const timelineItems: any[] = [];
            
            if (client.appointments) {
              client.appointments.forEach((app: any) => {
                timelineItems.push({
                  id: app.id,
                  date: new Date(app.start),
                  type: "appointment",
                  title: `Cita: ${app.service?.name || "Consulta"}`,
                  subtitle: `Atendido por: ${app.user?.name || "Especialista"}`,
                  badge: app.status,
                  color: app.service?.color || "#3b82f6",
                  notes: app.notes
                });
              });
            }

            if (client.documents) {
              client.documents.forEach((doc: any) => {
                timelineItems.push({
                  id: doc.id,
                  date: new Date(doc.createdAt),
                  type: "document",
                  title: `Documento Firmado: ${doc.name}`,
                  subtitle: doc.pin ? `PIN de firma: ${doc.pin}` : "Consentimiento informado firmado",
                  badge: doc.signature ? "FIRMADO" : "PENDIENTE"
                });
              });
            }

            if (client.photos) {
              client.photos.forEach((ph: any) => {
                timelineItems.push({
                  id: ph.id,
                  date: new Date(ph.takenAt || ph.createdAt),
                  type: "photo",
                  title: `Foto de Evolución: ${ph.type === "BEFORE" ? "Antes" : "Después"}`,
                  subtitle: ph.description || `Ángulo: ${ph.angle || "Frente"}`,
                  image: ph.photoUrl
                });
              });
            }

            if (client.files) {
              client.files.forEach((file: any) => {
                timelineItems.push({
                  id: file.id,
                  date: new Date(file.createdAt),
                  type: "file",
                  title: `Archivo Adjunto: ${file.name}`,
                  subtitle: file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : "Documento adjunto",
                  url: file.fileUrl
                });
              });
            }

            if (clientBudgets) {
              clientBudgets.forEach((b: any) => {
                timelineItems.push({
                  id: b.id,
                  date: new Date(b.createdAt),
                  type: "budget",
                  title: `Presupuesto Nº ${b.budgetNumber}: ${b.title}`,
                  subtitle: `Total: ${b.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
                  badge: b.status,
                  notes: b.remainingAmount > 0 ? `Saldo pendiente: ${b.remainingAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}` : "Totalmente pagado"
                });
              });
            }

            timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: 700, color: "#006687" }}>Línea de Tiempo del Historial Clínico</h3>
                {timelineItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No hay eventos registrados en el historial de este paciente.</div>
                ) : (
                  <div style={{ position: "relative", paddingLeft: "32px", borderLeft: "2px solid #e2e8f0" }}>
                    {timelineItems.map((item, index) => (
                      <div key={item.id + "-" + index} style={{ position: "relative", marginBottom: "32px" }}>
                        {/* Circle dot on vertical line */}
                        <div 
                          style={{ 
                            position: "absolute", 
                            left: "-41px", 
                            top: "2px", 
                            width: "16px", 
                            height: "16px", 
                            borderRadius: "50%", 
                            border: "3px solid #ffffff",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            backgroundColor: item.type === "appointment" ? (item.color || "#3b82f6") :
                                             item.type === "document" ? "#10b981" :
                                             item.type === "photo" ? "#8b5cf6" :
                                             item.type === "file" ? "#06b6d4" : "#f59e0b"
                          }} 
                        />
                        
                        {/* Timeline Item Card */}
                        <div 
                          style={{ 
                            padding: "16px", 
                            backgroundColor: "#f8fafc", 
                            borderRadius: "10px", 
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                              {item.type === "appointment" && "📅 Cita Médica"}
                              {item.type === "document" && "✍️ Consentimiento"}
                              {item.type === "photo" && "📷 Foto Evolución"}
                              {item.type === "file" && "📁 Archivo"}
                              {item.type === "budget" && "💰 Presupuesto"}
                              {" — "}
                              {item.date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {item.badge && (
                              <span 
                                style={{ 
                                  fontSize: "10px", 
                                  fontWeight: 700, 
                                  padding: "2px 8px", 
                                  borderRadius: "12px",
                                  backgroundColor: item.badge === "COMPLETED" || item.badge === "FIRMADO" || item.badge === "ACCEPTED" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                  color: item.badge === "COMPLETED" || item.badge === "FIRMADO" || item.badge === "ACCEPTED" ? "#10b981" : "#f59e0b"
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{item.title}</h4>
                          <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#475569" }}>{item.subtitle}</p>
                          
                          {item.notes && (
                            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", marginTop: "6px", paddingLeft: "8px", borderLeft: "2px solid #cbd5e1" }}>
                              "{item.notes}"
                            </div>
                          )}

                          {/* Display image thumbnail if photo type */}
                          {item.image && (
                            <div style={{ marginTop: "12px" }}>
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                style={{ maxHeight: "100px", borderRadius: "6px", border: "1px solid #cbd5e1", cursor: "pointer" }}
                                onClick={() => window.open(item.image, "_blank")}
                              />
                            </div>
                          )}

                          {/* Download link for files */}
                          {item.url && (
                            <a 
                              href={item.url} 
                              download 
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#3b82f6", textDecoration: "none", fontWeight: 600, marginTop: "8px" }}
                            >
                              📥 Descargar Archivo
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 10: Pizarra Clínica */}
          {activeTab === "whiteboard" && client && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "16px", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#006687" }}>Pizarra Clínica de Anotaciones</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                  Dibuja libremente sobre una plantilla anatómica seleccionada para marcar zonas de tratamiento o inyecciones, y guárdalo directo en la ficha del paciente.
                </p>
              </div>
              <WhiteboardEditor 
                clientId={client.id} 
                clinicId={activeClinic?.id}
                dbTemplates={whiteboardTemplates}
                onSaveSuccess={() => {
                  fetchClientDetails(true);
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* BUDGET CREATION/EDITION MODAL */}
      {showBudgetModal && typeof window !== "undefined" && createPortal(
        <div className={styles.modalOverlay} style={{ zIndex: 10000 }}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "800px", width: "90%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            <div className={styles.modalHeader} style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h2>{budgetModalTitle}</h2>
              <button onClick={() => setShowBudgetModal(false)} className={styles.closeBtn}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {/* Load template selector */}
              {!editingBudget && budgetTemplates.length > 0 && (
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Cargar Plantilla Reutilizable</label>
                  <select
                    className="input select"
                    onChange={(e) => {
                      const t = budgetTemplates.find(x => x.id === e.target.value);
                      if (t) handleLoadTemplate(t);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Selecciona una plantilla predefinida --</option>
                    {budgetTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.total.toFixed(2)}€)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title & Status */}
              <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Concepto / Título del Presupuesto *</label>
                  <input
                    type="text"
                    className="input"
                    value={budgetTitleInput}
                    onChange={(e) => setBudgetTitleInput(e.target.value)}
                    placeholder="Ej. Tratamiento de Fisioterapia Deportiva"
                  />
                </div>
                <div className="form-group" style={{ width: "180px" }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Estado</label>
                  <select
                    className="input select"
                    value={budgetStatusSelect}
                    onChange={(e) => setBudgetStatusSelect(e.target.value)}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="ACCEPTED">Aceptado</option>
                    <option value="REJECTED">Rechazado</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 12px" }}>Artículos y Servicios Añadidos</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "24px" }}>
                <thead>
                  <tr style={{ background: "var(--bg-input)", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "8px", textAlign: "left" }}>Concepto</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Precio</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Cant.</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>IVA</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Dcto</th>
                    <th style={{ padding: "8px", textAlign: "left" }}>Total</th>
                    <th style={{ padding: "8px", textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "8px" }}>{item.name}</td>
                      <td style={{ padding: "8px" }}>{item.price.toFixed(2)}€</td>
                      <td style={{ padding: "8px" }}>{item.qty}</td>
                      <td style={{ padding: "8px" }}>{item.tax}%</td>
                      <td style={{ padding: "8px" }}>{item.discount}{item.discountType || "%"}</td>
                      <td style={{ padding: "8px", fontWeight: "bold" }}>{item.total.toFixed(2)}€</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveBudgetItem(item.id)}
                          style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px" }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Item Adder Row */}
                  <tr style={{ background: "var(--bg-app)" }}>
                    <td style={{ padding: "8px", position: "relative" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nombre del tratamiento..."
                        value={newItemName}
                        onChange={(e) => {
                          setNewItemName(e.target.value);
                          setShowServiceSuggestions(true);
                        }}
                        onFocus={() => setShowServiceSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 200)}
                        style={{ padding: "6px", fontSize: "12px", width: "100%" }}
                      />
                      
                      {showServiceSuggestions && newItemName.trim().length > 0 && (() => {
                        const matchedServices = services.filter(s =>
                          s.name.toLowerCase().includes(newItemName.toLowerCase())
                        );
                        if (matchedServices.length === 0) return null;
                        return (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: "8px",
                            right: "8px",
                            background: "var(--bg-panel-solid)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                            zIndex: 9999,
                            maxHeight: "150px",
                            overflowY: "auto",
                            marginTop: "4px"
                          }}>
                            {matchedServices.map(srv => (
                              <div
                                key={srv.id}
                                onClick={() => {
                                  setNewItemName(srv.name);
                                  setNewItemPrice(String(srv.price));
                                  setShowServiceSuggestions(false);
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  borderBottom: "1px solid var(--border-color)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-input)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                              >
                                <span>{srv.name}</span>
                                <span style={{ fontWeight: "bold", color: "var(--primary)" }}>{srv.price.toFixed(2)}€</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>

                    <td style={{ padding: "8px", width: "90px" }}>
                      <input
                        type="number"
                        className="input"
                        placeholder="Precio"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        style={{ padding: "6px", fontSize: "12px", width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: "8px", width: "70px" }}>
                      <input
                        type="number"
                        className="input"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        style={{ padding: "6px", fontSize: "12px", width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: "8px", width: "80px" }}>
                      <select
                        className="input select"
                        value={newItemTax}
                        onChange={(e) => setNewItemTax(e.target.value)}
                        style={{ padding: "6px", fontSize: "12px", width: "100%" }}
                      >
                        <option value="0">0%</option>
                        <option value="4">4%</option>
                        <option value="10">10%</option>
                        <option value="21">21%</option>
                      </select>
                    </td>
                    <td style={{ padding: "8px", width: "110px" }}>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <input
                          type="number"
                          className="input"
                          value={newItemDiscount}
                          onChange={(e) => setNewItemDiscount(e.target.value)}
                          style={{ padding: "6px", fontSize: "12px", flex: 1, minWidth: 0 }}
                        />
                        <button
                          type="button"
                          onClick={() => setNewItemDiscountType(newItemDiscountType === "%" ? "€" : "%")}
                          style={{
                            padding: "4px 7px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: "var(--primary)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            flexShrink: 0,
                            minWidth: "28px"
                          }}
                          title="Alternar entre porcentaje y monto fijo"
                        >
                          {newItemDiscountType}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "8px" }}>-</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={handleAddBudgetItem}
                        style={{ padding: "4px 10px", fontSize: "12px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                      >
                        ＋
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px", fontSize: "14px", fontWeight: "bold", borderTop: "2px solid var(--border-color)", paddingTop: "16px" }}>
                <span>Total Presupuestado:</span>
                <span style={{ color: "var(--primary)", fontSize: "18px" }}>{getBudgetTotal().toFixed(2)}€</span>
              </div>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBudgetModal(false)}
              >
                Cancelar
              </button>
              {!editingBudget && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleSaveAsTemplate}
                  style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)" }}
                >
                  💾 Guardar como Plantilla
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveBudget}
              >
                Guardar Presupuesto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* FULL EDIT DATA DRAWER */}
      {showFullEditModal && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowFullEditModal(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Editar cliente</h2>
              <button className={styles.drawerCloseBtn} onClick={() => setShowFullEditModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.drawerTabs}>
              <button
                type="button"
                className={`${styles.drawerTab} ${editTab === "general" ? styles.drawerTabActive : ""}`}
                onClick={() => setEditTab("general")}
              >
                Información general
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${editTab === "otros" ? styles.drawerTabActive : ""}`}
                onClick={() => setEditTab("otros")}
              >
                Otros datos
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className={styles.drawerForm}>
              <div className={styles.drawerScrollBody}>

                {/* ── TAB: Información general ── */}
                {editTab === "general" && (
                  <>
                    <p className={styles.drawerSectionTitle}>Datos generales</p>

                    {/* Nombre / Apellidos */}
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Nombre *</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir nombre"
                          value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} required />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Apellidos *</label>
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
                {editTab === "otros" && (
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
                <button type="button" className={styles.drawerCancelBtn} onClick={() => setShowFullEditModal(false)}>
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

      {/* ETIQUETAS SIDE DRAWER */}
      {showTagsDrawer && typeof window !== "undefined" && createPortal(
        <div className={styles.drawerOverlay} onClick={() => setShowTagsDrawer(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Etiquetas</h2>
              <button className={styles.drawerCloseBtn} onClick={() => setShowTagsDrawer(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className={styles.drawerForm}>
              <div className={styles.drawerScrollBody}>
                <p className={styles.drawerSectionTitle}>Etiquetas</p>

                {tagsSubView === "list" ? (
                  <>
                    {/* Search & Nueva etiqueta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                        <Icons.Search size={15} style={{ position: "absolute", left: "12px", color: "var(--text-muted)", pointerEvents: "none" }} />
                        <input
                          type="text"
                          className={styles.drawerInput}
                          style={{ paddingLeft: "34px" }}
                          placeholder="Buscar etiqueta"
                          value={searchTagQuery}
                          onChange={(e) => setSearchTagQuery(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.drawerCancelBtn}
                        style={{ padding: "8px 14px", fontSize: "13px", whiteSpace: "nowrap" }}
                        onClick={() => {
                          setTagsSubView("create");
                          setNewTagName("");
                          setNewTagColor("#f56565");
                        }}
                      >
                        Nueva etiqueta
                      </button>
                    </div>

                    {/* Currently assigned tags */}
                    {modalClientTags.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                          Asignadas a este cliente ({modalClientTags.length})
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {modalClientTags.map((tagName) => {
                            const color = clientAvailableTags.find((t) => t.name === tagName)?.color || "#008fa3";
                            return (
                              <span
                                key={tagName}
                                style={{
                                  backgroundColor: color,
                                  color: "#fff",
                                  padding: "4px 10px",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                {tagName}
                                <button
                                  type="button"
                                  style={{
                                    background: "rgba(255,255,255,0.25)",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "16px",
                                    height: "16px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    lineHeight: 1,
                                    padding: 0
                                  }}
                                  onClick={() => setModalClientTags((prev) => prev.filter((t) => t !== tagName))}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Available Tags list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block" }}>
                        Todas las etiquetas disponibles
                      </label>
                      {clientAvailableTags
                        .filter((tag) => tag.name.toLowerCase().includes(searchTagQuery.toLowerCase()))
                        .map((tag) => {
                          const isChecked = modalClientTags.includes(tag.name);
                          return (
                            <div
                              key={tag.name}
                              onClick={() => {
                                if (isChecked) {
                                  setModalClientTags((prev) => prev.filter((t) => t !== tag.name));
                                } else {
                                  setModalClientTags((prev) => [...prev, tag.name]);
                                }
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: `1.5px solid ${isChecked ? "var(--primary)" : "var(--border-color)"}`,
                                background: isChecked ? "rgba(0,143,163,0.06)" : "var(--bg-panel-solid)",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{ width: "16px", height: "16px", accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                                <span
                                  style={{
                                    backgroundColor: tag.color,
                                    color: "#fff",
                                    padding: "3px 10px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: 700
                                  }}
                                >
                                  {tag.name}
                                </span>
                              </div>

                              <button
                                type="button"
                                title="Eliminar etiqueta global"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`¿Eliminar la etiqueta "${tag.name}"?`)) {
                                    handleDeleteTagGlobal(tag.name);
                                  }
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                              >
                                <Icons.Trash size={14} />
                              </button>
                            </div>
                          );
                        })}

                      {clientAvailableTags.filter((tag) => tag.name.toLowerCase().includes(searchTagQuery.toLowerCase())).length === 0 && (
                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                          No se encontraron etiquetas
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Create Tag View */
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Nueva etiqueta</h3>
                      <button
                        type="button"
                        className={styles.drawerCancelBtn}
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                        onClick={() => setTagsSubView("list")}
                      >
                        Volver a la lista
                      </button>
                    </div>

                    <div className={styles.drawerField}>
                      <label className={styles.drawerLabel}>Nombre de la etiqueta *</label>
                      <input
                        type="text"
                        className={styles.drawerInput}
                        placeholder="Ej: VIP, ALÉRGICO, URGENTE"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className={styles.drawerField}>
                      <label className={styles.drawerLabel}>Color de la etiqueta</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "4px" }}>
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            style={{
                              backgroundColor: color,
                              height: "32px",
                              borderRadius: "8px",
                              border: newTagColor === color ? "2.5px solid var(--text-primary)" : "none",
                              cursor: "pointer",
                              transition: "transform 0.1s",
                              transform: newTagColor === color ? "scale(1.05)" : "scale(1)"
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                      <button
                        type="button"
                        className={styles.drawerCancelBtn}
                        onClick={() => setTagsSubView("list")}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={styles.drawerSaveBtn}
                        disabled={!newTagName.trim()}
                        onClick={handleCreateNewTag}
                      >
                        Crear Etiqueta
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className={styles.drawerFooter}>
                <button type="button" className={styles.drawerCancelBtn} onClick={() => setShowTagsDrawer(false)}>
                  Cancelar
                </button>
                <button type="button" className={styles.drawerSaveBtn} onClick={handleSaveClientTags}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ASSOCIATE VOUCHER MODAL */}
      {showAddVoucherModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h2>Asociar Bono a Paciente</h2>
              <button onClick={() => { setShowAddVoucherModal(false); setSelectedVoucherId(""); }} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div className={styles.modalForm} style={{ padding: "16px 20px" }}>
              <div className="form-group">
                <label className="form-label">Selecciona el Bono *</label>
                <select
                  className="input select"
                  value={selectedVoucherId}
                  onChange={(e) => setSelectedVoucherId(e.target.value)}
                >
                  <option value="">-- Seleccionar Bono template --</option>
                  {clinicVouchers.map((voucher) => (
                    <option key={voucher.id} value={voucher.id}>
                      {voucher.name} ({voucher.sessions} ses. - {voucher.price.toFixed(2)}€)
                    </option>
                  ))}
                </select>
              </div>

              {selectedVoucherId && (() => {
                const selected = clinicVouchers.find(v => v.id === selectedVoucherId);
                if (!selected) return null;
                return (
                  <div style={{ marginTop: "12px", padding: "12px", borderRadius: "6px", backgroundColor: "var(--bg-input)", fontSize: "12px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <strong>Detalles del Bono:</strong>
                    <div>Sesiones: {selected.sessions}</div>
                    <div>Precio: {selected.price.toFixed(2)}€ {selected.tax ? `+ ${selected.tax}% IVA` : ""}</div>
                    <div>Caducidad: {selected.expirationMonths ? `${selected.expirationMonths} meses` : "Sin caducidad"}</div>
                  </div>
                );
              })()}

              <div className={styles.modalActions} style={{ marginTop: "24px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowAddVoucherModal(false); setSelectedVoucherId(""); }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleAssociateVoucher}
                  disabled={!selectedVoucherId}
                >
                  Asociar Bono
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CLIENT VOUCHER MODAL */}
      {showEditVoucherModal && editingClientVoucher && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h2>Editar Bono de Paciente</h2>
              <button onClick={() => { setShowEditVoucherModal(false); setEditingClientVoucher(null); }} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div className={styles.modalForm} style={{ padding: "16px 20px" }}>
              <div className="form-group">
                <label className="form-label">Nombre del Bono *</label>
                <input
                  type="text"
                  className="input"
                  value={editVoucherName}
                  onChange={(e) => setEditVoucherName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Sesiones Totales *</label>
                  <input
                    type="number"
                    className="input"
                    value={editVoucherSessions}
                    onChange={(e) => setEditVoucherSessions(parseInt(e.target.value, 10) || 0)}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sesiones Restantes *</label>
                  <input
                    type="number"
                    className="input"
                    value={editVoucherRemaining}
                    onChange={(e) => setEditVoucherRemaining(parseInt(e.target.value, 10) || 0)}
                    min="0"
                    max={editVoucherSessions}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Precio (€) *</label>
                  <input
                    type="number"
                    className="input"
                    value={editVoucherPrice}
                    onChange={(e) => setEditVoucherPrice(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Caducidad</label>
                  <input
                    type="date"
                    className="input"
                    value={editVoucherExpiration}
                    onChange={(e) => setEditVoucherExpiration(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalActions} style={{ marginTop: "24px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setShowEditVoucherModal(false); setEditingClientVoucher(null); }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveClientVoucherEdit}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARE CLIENT VOUCHER MODAL */}
      {showShareVoucherModal && sharingClientVoucher && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "480px" }}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Compartir Bono</h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {sharingClientVoucher.name} — {sharingClientVoucher.remainingSessions}/{sharingClientVoucher.sessions} sesiones
                </p>
              </div>
              <button
                onClick={() => { setShowShareVoucherModal(false); setSharingClientVoucher(null); }}
                className={styles.closeBtn}
              >
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                Las sesiones de este bono se compartirán entre este paciente y los seleccionados. El consumo descuenta de las sesiones restantes del bono.
              </p>

              {/* Search */}
              <div style={{ position: "relative", marginBottom: "12px" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar paciente por nombre..."
                  value={shareVoucherClientSearch}
                  onChange={(e) => setShareVoucherClientSearch(e.target.value)}
                />
              </div>

              {/* Client list */}
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {allClientsForShare
                  .filter((c) => {
                    if (!shareVoucherClientSearch) return true;
                    const q = shareVoucherClientSearch.toLowerCase();
                    return (
                      c.firstName?.toLowerCase().includes(q) ||
                      c.lastName?.toLowerCase().includes(q) ||
                      String(c.clientNumber).includes(q)
                    );
                  })
                  .map((c) => {
                    const currentShared = (sharingClientVoucher.sharedClientIds || "").split(",").filter(Boolean);
                    const isShared = currentShared.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: `1px solid ${isShared ? "rgba(139,92,246,0.4)" : "var(--border-color)"}`,
                          background: isShared ? "rgba(139,92,246,0.06)" : "var(--bg-card)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onClick={() => handleShareVoucherToggleClient(sharingClientVoucher.id, c.id, isShared)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: isShared ? "rgba(139,92,246,0.2)" : "var(--bg-input)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: isShared ? "#8b5cf6" : "var(--text-secondary)",
                          }}>
                            {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                              {c.firstName} {c.lastName}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>#{c.clientNumber}</div>
                          </div>
                        </div>
                        <div style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: `2px solid ${isShared ? "#8b5cf6" : "var(--border-color)"}`,
                          background: isShared ? "#8b5cf6" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {isShared && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {allClientsForShare.filter((c) => {
                  if (!shareVoucherClientSearch) return true;
                  const q = shareVoucherClientSearch.toLowerCase();
                  return c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || String(c.clientNumber).includes(q);
                }).length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                    No se encontraron pacientes.
                  </p>
                )}
              </div>

              <div className={styles.modalActions} style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => { setShowShareVoucherModal(false); setSharingClientVoucher(null); }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW CLIENT SIDEBAR DRAWER - portal so it covers full viewport */}
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

            <form onSubmit={handleCreateContact} className={styles.drawerForm}>
              <div className={styles.drawerScrollBody}>

                {/* ── TAB: Información general ── */}
                {creationTab === "general" && (
                  <>
                    <p className={styles.drawerSectionTitle}>Datos generales</p>

                    {/* Nombre / Apellidos */}
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Nombre *</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir nombre"
                          value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)} required />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Apellidos *</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir apellidos"
                          value={createLastName} onChange={(e) => setCreateLastName(e.target.value)} required />
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
                          <span style={{ color: createBirthDate ? "var(--text-primary)" : "var(--text-muted)" }}>
                            {createBirthDate || "dd/mm/aaaa"}
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
                                  const isSelected = createBirthDate === formatted;
                                  cells.push(
                                    <button key={d} type="button"
                                      disabled={isFuture}
                                      className={`${styles.birthCalDay} ${isSelected ? styles.birthCalDaySelected : ""} ${isFuture ? styles.birthCalDayDisabled : ""}`}
                                      onClick={() => { setCreateBirthDate(formatted); setShowBirthCalendar(false); }}
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
                            value={createDniNif} onChange={(e) => setCreateDniNif(e.target.value)} />
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
                            value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} />
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
                          value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
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
                            value={createCountry}
                            onChange={(e) => setCreateCountry(e.target.value)} />
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
                                    setCreateCountry(c.name);
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

                      <div className={styles.drawerField} style={{ position: "relative" }} ref={createAddressAutocompleteRef}>
                        <label className={styles.drawerLabel}>Dirección</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir dirección"
                          value={createAddress} onChange={(e) => handleCreateAddressChange(e.target.value)} />
                        
                        {showCreateAddressDropdown && addressSuggestions.length > 0 && (
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
                                onClick={() => handleSelectCreateAddressSuggestion(item)}
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
                          value={createMunicipality} onChange={(e) => setCreateMunicipality(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Código Postal</label>
                        <input type="text" className={styles.drawerInput} placeholder="Añadir código postal"
                          value={createPostalCode} onChange={(e) => setCreatePostalCode(e.target.value)} />
                      </div>
                    </div>

                    {/* Switches */}
                    <div className={styles.drawerSwitchGroup}>
                      <label className={styles.drawerSwitchRow}>
                        <span className={`${styles.drawerToggle} ${createIsSelfEmployed ? styles.drawerToggleOn : ""}`}
                          onClick={() => setCreateIsSelfEmployed(!createIsSelfEmployed)}>
                          <span className={styles.drawerToggleThumb} />
                        </span>
                        <span className={styles.drawerSwitchLabel}>Es Autónomo</span>
                      </label>
                      <label className={styles.drawerSwitchRow}>
                        <span className={`${styles.drawerToggle} ${createIsCompany ? styles.drawerToggleOn : ""}`}
                          onClick={() => setCreateIsCompany(!createIsCompany)}>
                          <span className={styles.drawerToggleThumb} />
                        </span>
                        <span className={styles.drawerSwitchLabel}>Es Empresa</span>
                      </label>
                      <label className={styles.drawerSwitchRow}>
                        <span className={`${styles.drawerToggle} ${createReceivesReminders ? styles.drawerToggleOn : ""}`}
                          onClick={() => setCreateReceivesReminders(!createReceivesReminders)}>
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
                        <select className={styles.drawerSelect} value={createGender} onChange={(e) => setCreateGender(e.target.value)}>
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Etiquetas (separadas por coma)</label>
                        <input type="text" className={styles.drawerInput} placeholder="Ej: Frecuente, Espalda"
                          value={createTags} onChange={(e) => setCreateTags(e.target.value)} />
                      </div>
                    </div>

                    <p className={styles.drawerSectionTitle}>Facturación</p>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>IBAN</label>
                        <input type="text" className={styles.drawerInput} placeholder="ES21 0000..."
                          value={createIban} onChange={(e) => setCreateIban(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>BIC / SWIFT</label>
                        <input type="text" className={styles.drawerInput} placeholder="BARCES..."
                          value={createBic} onChange={(e) => setCreateBic(e.target.value)} />
                      </div>
                    </div>

                    <p className={styles.drawerSectionTitle}>Salud</p>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Tratamientos estéticos previos</label>
                      <textarea className={styles.drawerTextarea} placeholder="Describe tratamientos previos..."
                        value={createAestheticTreatments} onChange={(e) => setCreateAestheticTreatments(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Alergias</label>
                      <textarea className={styles.drawerTextarea} placeholder="Alergias conocidas..."
                        value={createAllergies} onChange={(e) => setCreateAllergies(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Medicación actual</label>
                      <textarea className={styles.drawerTextarea} placeholder="Medicamentos que toma..."
                        value={createMedication} onChange={(e) => setCreateMedication(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Antecedentes médicos</label>
                      <textarea className={styles.drawerTextarea} placeholder="Antecedentes relevantes..."
                        value={createMedicalHistory} onChange={(e) => setCreateMedicalHistory(e.target.value)} rows={2} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Otras notas</label>
                      <textarea className={styles.drawerTextarea} placeholder="Observaciones adicionales..."
                        value={createOtherNotes} onChange={(e) => setCreateOtherNotes(e.target.value)} rows={2} />
                    </div>

                    <p className={styles.drawerSectionTitle}>Tutor / Representante</p>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Nombre tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Nombre"
                          value={createTutorName} onChange={(e) => setCreateTutorName(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Apellidos tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Apellidos"
                          value={createTutorLastName} onChange={(e) => setCreateTutorLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>DNI tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="DNI tutor"
                          value={createTutorDniNif} onChange={(e) => setCreateTutorDniNif(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Teléfono tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Teléfono tutor"
                          value={createTutorPhone} onChange={(e) => setCreateTutorPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Email tutor</label>
                      <input type="email" className={styles.drawerInput} placeholder="tutor@correo.com"
                        value={createTutorEmail} onChange={(e) => setCreateTutorEmail(e.target.value)} />
                    </div>
                    <div className={styles.drawerField} style={{ marginBottom: 12 }}>
                      <label className={styles.drawerLabel}>Dirección tutor</label>
                      <input type="text" className={styles.drawerInput} placeholder="Dirección tutor"
                        value={createTutorAddress} onChange={(e) => setCreateTutorAddress(e.target.value)} />
                    </div>
                    <div className={styles.drawerGrid2}>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>Municipio tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Municipio tutor"
                          value={createTutorMunicipality} onChange={(e) => setCreateTutorMunicipality(e.target.value)} />
                      </div>
                      <div className={styles.drawerField}>
                        <label className={styles.drawerLabel}>C.P. tutor</label>
                        <input type="text" className={styles.drawerInput} placeholder="Código postal"
                          value={createTutorPostalCode} onChange={(e) => setCreateTutorPostalCode(e.target.value)} />
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

      {/* SIGNATURE METHOD SELECTION MODAL */}
      {showSignatureMethodModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "500px", padding: "24px" }}>
            <div className={styles.modalHeader} style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>Seleccionar Método de Firma</h2>
              <button 
                onClick={() => setShowSignatureMethodModal(false)} 
                className={styles.closeBtn}
              >
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              ¿Cómo deseas que el paciente firme el documento <strong>{generatedDocName}</strong>?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowSignatureMethodModal(false);
                  setShowSignModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "12px",
                  padding: "16px",
                  borderRadius: "8px",
                  background: "var(--primary-light)",
                  color: "var(--primary)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%"
                }}
              >
                <span style={{ fontSize: "24px" }}>📱</span>
                <div>
                  <strong style={{ display: "block", fontSize: "14px" }}>Firmar en este dispositivo (Tablet/Dedo)</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 400 }}>El paciente firma directamente en tu pantalla ahora mismo.</span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleCreateRemoteSignatureRequest()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "12px",
                  padding: "16px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.05)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%"
                }}
              >
                <span style={{ fontSize: "24px" }}>🔗</span>
                <div>
                  <strong style={{ display: "block", fontSize: "14px" }}>Enviar enlace de firma remota</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 400 }}>Genera un enlace seguro para enviar por Email, WhatsApp o SMS.</span>
                </div>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSignatureMethodModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOTE SIGNATURE LINK MODAL */}
      {showRemoteSignModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "550px", padding: "24px" }}>
            <div className={styles.modalHeader} style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>🔗 Enlace de Firma Remota Creado</h2>
              <button 
                onClick={() => setShowRemoteSignModal(false)} 
                className={styles.closeBtn}
              >
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div style={{
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "12px",
              color: "#065f46",
              lineHeight: "1.5",
              marginBottom: "20px"
            }}>
              Se ha creado el documento y está a la espera de la firma del paciente. Comparte el siguiente enlace seguro para que el paciente firme desde su dispositivo móvil o tablet.
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: "11px" }}>ENLACE DE FIRMA SEGURO</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  className="input"
                  value={remoteSignLink}
                  style={{ flexGrow: 1, background: "var(--bg-input)" }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(remoteSignLink);
                    alert("Enlace copiado al portapapeles.");
                  }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Copiar Enlace
                </button>
              </div>
            </div>

             {/* Send notifications triggers */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>ENVIAR ENLACE AL PACIENTE</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    handleSendWhatsAppSignature(remoteSignLink, remoteSignPin, generatedDocName);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                >
                  <span>💬</span> WhatsApp
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    handleOpenEmailModal(remoteSignLink, remoteSignPin, generatedDocName);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                >
                  <span>✉️</span> Correo Electrónico
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowRemoteSignModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SIGNED DOCUMENT CONFIRMATION MODAL */}
      {docToDelete && (
        <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "420px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--danger)", margin: "0 0 8px" }}>¿Eliminar documento firmado?</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: "1.5" }}>
              Esta acción eliminará de forma permanente este documento firmado de la ficha del paciente. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDocToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  const idToDelete = docToDelete;
                  setDocToDelete(null);
                  try {
                    const res = await fetch(`/api/documents/signed/${idToDelete}`, {
                      method: "DELETE",
                    });
                    if (res.ok) {
                      fetchClientDetails(true);
                    } else {
                      alert("Error al eliminar el documento.");
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                style={{ background: "var(--danger)", color: "white", border: "none" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPARTIR POR CORREO ELECTRÓNICO MODAL */}
      {showEmailModal && (
        <div className={styles.modalOverlay}>
          <div 
            className={`${styles.modalContent} glass fade-in`} 
            style={{ 
              maxWidth: "420px", 
              padding: "24px", 
              borderRadius: "12px", 
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.95)"
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <label 
                htmlFor="emailModalAddress"
                style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: "#1e293b", 
                  marginBottom: "8px" 
                }}
              >
                Email *
              </label>
              <input
                id="emailModalAddress"
                type="email"
                className="input"
                value={emailModalAddress}
                onChange={(e) => setEmailModalAddress(e.target.value)}
                placeholder="ejemplo@correo.com"
                style={{ 
                  width: "100%", 
                  padding: "10px 14px", 
                  borderRadius: "8px", 
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#334155"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEmailModal(false)}
                style={{ 
                  padding: "8px 20px", 
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  color: "#334155",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendEmailSubmit}
                style={{ 
                  padding: "8px 20px", 
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "1px solid var(--primary)",
                  background: "var(--primary)",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURE CAPTURE MODAL */}
      {showSignModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h2>Firma del Documento Clínico</h2>
              <button 
                onClick={() => setShowSignModal(false)} 
                className={styles.closeBtn}
              >
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div className={styles.signWarning}>
              Por favor, pide al paciente que dibuje su firma en el panel inferior utilizando un lápiz digital o el dedo.
            </div>

            <div className={styles.canvasContainer}>
              <canvas
                ref={canvasRef}
                className={styles.signatureCanvas}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className={styles.canvasActions}>
              <button className="btn btn-secondary" onClick={clearCanvas}>
                Limpiar Panel
              </button>
              <button className="btn btn-primary" onClick={saveSignedDocument}>
                <Icons.Check size={16} />
                <span>Confirmar y Firmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SIGNED DOCUMENT DIALOG */}
      {viewingSignedDoc && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => {
            setViewingSignedDoc(null);
            setShowSignedDocOptionsDropdown(false);
          }}
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(15, 23, 42, 0.6)", 
            backdropFilter: "blur(4px)",
            display: "flex", 
            flexDirection: "column",
            alignItems: "center", 
            justifyContent: "start",
            overflowY: "auto",
            padding: "40px 20px",
            zIndex: 9999
          }}
        >
          {/* Main Document sheet container */}
          <div 
            className="glass fade-in" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: "#ffffff", 
              borderRadius: "12px", 
              width: "100%",
              maxWidth: "800px", 
              padding: "48px 56px", 
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", 
              boxSizing: "border-box",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "24px"
            }}
          >
            {/* Header controls inside the sheet, top right */}
            <div style={{ display: "flex", justifyContent: "end", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setViewingSignedDoc(null);
                  setShowSignedDocOptionsDropdown(false);
                }}
                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                Cancelar
              </button>
              
              {/* Opciones Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSignedDocOptionsDropdown(!showSignedDocOptionsDropdown)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "6px 12px" }}
                >
                  Opciones ▾
                </button>
                {showSignedDocOptionsDropdown && (
                  <div style={{ position: "absolute", top: "100%", right: 0, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", borderRadius: "6px", width: "160px", zIndex: 10, display: "flex", flexDirection: "column", padding: "4px 0", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignedDocOptionsDropdown(false);
                        const link = `${window.location.origin}/sign/${viewingSignedDoc.id}`;
                        handleSendWhatsAppSignature(link, viewingSignedDoc.pin || "", viewingSignedDoc.name);
                      }}
                      style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", display: "flex", gap: "8px" }}
                    >
                      <span>💬</span> Via whatsapp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignedDocOptionsDropdown(false);
                        const link = `${window.location.origin}/sign/${viewingSignedDoc.id}`;
                        handleOpenEmailModal(link, viewingSignedDoc.pin || "", viewingSignedDoc.name);
                      }}
                      style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", display: "flex", gap: "8px" }}
                    >
                      <span>✉️</span> Via Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignedDocOptionsDropdown(false);
                        handlePrintSignedDocument(viewingSignedDoc);
                      }}
                      style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", display: "flex", gap: "8px" }}
                    >
                      <span>🖨️</span> Imprimir / PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document page body simulating sheet of paper */}
            <div style={{ padding: "20px 0" }}>
              <div 
                className={styles.docRawHtml} 
                dangerouslySetInnerHTML={{ __html: viewingSignedDoc.content }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Root Portal-like HTML Editor Modal */}
      {showDocHtmlModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div style={{ background: "white", borderRadius: "12px", width: "90%", maxWidth: "680px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, border: "none", padding: 0 }}>Editar Código HTML</h3>
              <button type="button" onClick={() => setShowDocHtmlModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-secondary)" }}>✕</button>
            </div>
            <textarea
              style={{ width: "100%", height: "380px", fontFamily: "monospace", fontSize: "13px", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", resize: "vertical", boxSizing: "border-box" }}
              value={docHtmlModalContent}
              onChange={(e) => setDocHtmlModalContent(e.target.value)}
              placeholder="Escribe o pega aquí tu código HTML..."
            />
            <div style={{ display: "flex", justifyContent: "end", gap: "10px" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDocHtmlModal(false)} style={{ fontSize: "13px" }}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={() => {
                setGeneratedDocContent(docHtmlModalContent);
                if (associateEditorRef.current) {
                  associateEditorRef.current.innerHTML = docHtmlModalContent;
                }
                setShowDocHtmlModal(false);
              }} style={{ fontSize: "13px" }}>Insertar</button>
            </div>
          </div>
        </div>
      )}
      {showImageSourceSelector && (
        <div className={styles.imageSelectorOverlay} onClick={() => setShowImageSourceSelector(false)}>
          <div className={styles.imageSelectorModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Añadir nueva imagen</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowImageSourceSelector(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div
                className={styles.modalOptionCard}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setPizarraImage(event.target.result as string);
                          const nameInput = prompt("Nombre de la plantilla / imagen:", file.name.split(".")[0]);
                          setPizarraTemplateName(nameInput || file.name.split(".")[0]);
                          setShowImageSourceSelector(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                <div className={styles.modalOptionIcon}>📂</div>
                <div className={styles.modalOptionText}>
                  <span className={styles.modalOptionTitle}>Explorar archivo</span>
                  <span className={styles.modalOptionDesc}>Subir desde tu dispositivo</span>
                </div>
              </div>

              <div
                className={styles.modalOptionCard}
                onClick={() => {
                  setShowImageSourceSelector(false);
                  startCamera();
                }}
              >
                <div className={styles.modalOptionIcon}>📷</div>
                <div className={styles.modalOptionText}>
                  <span className={styles.modalOptionTitle}>Tomar foto</span>
                  <span className={styles.modalOptionDesc}>Usar la cámara de tu dispositivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCameraActive && (
        <div className={styles.cameraCaptureModal}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={styles.cameraVideo}
          />
          <div className={styles.cameraControls}>
            <button
              type="button"
              className={styles.cameraBtnCancel}
              onClick={stopCamera}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.cameraBtnCapture}
              onClick={capturePhoto}
              title="Tomar Foto"
            />
          </div>
        </div>
      )}

      {/* COMPARADOR SLIDER MODAL */}
      {isComparingOpen && compareBeforePhoto && compareAfterPhoto && typeof window !== "undefined" && createPortal(
        <div
          onClick={() => setIsComparingOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "24px"
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "800px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Comparación de Antes y Después</h3>
              <button 
                onClick={() => setIsComparingOpen(false)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "24px", backgroundColor: "#f8fafc" }}>
              <BeforeAfterSlider
                beforeUrl={compareBeforePhoto}
                afterUrl={compareAfterPhoto}
                height="450px"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CÁMARA MODAL */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handlePhotoUpload}
      />

      {/* MODAL / DRAWER: Asignar producto (Image 5) */}
      {showAssignProductModal && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "460px",
            height: "100%",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
            animation: "slideInRight 0.2s ease-out forwards"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid #e2e8f0"
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                {editingClientProduct ? "Editar producto" : "Asignar producto"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignProductModal(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* FECHA */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  FECHA
                </label>
                <input
                  type="date"
                  value={assignProductDate}
                  onChange={(e) => setAssignProductDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    color: "#1e293b",
                    outline: "none"
                  }}
                />
              </div>

              {/* PRODUCTO */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  PRODUCTO
                </label>
                <select
                  value={assignProductId}
                  onChange={(e) => handleSelectProductToAssign(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    color: "#1e293b",
                    outline: "none",
                    background: "#ffffff"
                  }}
                >
                  <option value="">Sin asignar</option>
                  {availableProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.price}€)
                    </option>
                  ))}
                </select>
              </div>

              {/* PRECIO *, IVA *, TOTAL * */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                    PRECIO *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={assignProductPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssignProductPrice(val);
                        const pPrice = parseFloat(val || "0");
                        const pVat = parseFloat(assignProductVat || "21");
                        setAssignProductTotal((pPrice * (1 + pVat / 100)).toFixed(2));
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 22px 10px 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        color: "#1e293b",
                        outline: "none"
                      }}
                    />
                    <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#64748b" }}>€</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                    IVA *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      value={assignProductVat}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssignProductVat(val);
                        const pPrice = parseFloat(assignProductPrice || "0");
                        const pVat = parseFloat(val || "21");
                        setAssignProductTotal((pPrice * (1 + pVat / 100)).toFixed(2));
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 22px 10px 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        color: "#1e293b",
                        outline: "none"
                      }}
                    />
                    <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#64748b" }}>%</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                    TOTAL *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={assignProductTotal}
                      onChange={(e) => setAssignProductTotal(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 22px 10px 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        color: "#1e293b",
                        outline: "none",
                        fontWeight: 700
                      }}
                    />
                    <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#64748b" }}>€</span>
                  </div>
                </div>
              </div>

              {/* PROFESIONAL */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  PROFESIONAL
                </label>
                <select
                  value={assignProductProfessionalId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignProductProfessionalId(val);
                    const found = (allStaff || []).find((s: any) => s.id === val);
                    setAssignProductProfessionalName(found ? `${found.name} ${found.lastName || ""}`.trim() : "");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    color: "#1e293b",
                    outline: "none",
                    background: "#ffffff"
                  }}
                >
                  <option value="">Sin asignar</option>
                  {(allStaff || []).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.lastName || ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc"
            }}>
              <button
                type="button"
                onClick={() => setShowAssignProductModal(false)}
                className="btn btn-secondary"
                style={{ padding: "8px 18px", fontSize: "13px" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={assignProductSaving}
                onClick={handleSaveAssignProduct}
                className="btn btn-primary"
                style={{ padding: "8px 22px", fontSize: "13px", background: "var(--primary)", borderColor: "var(--primary)" }}
              >
                {assignProductSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
