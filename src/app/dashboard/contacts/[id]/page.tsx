"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import { hasPermission } from "@/lib/permissions";
import styles from "./ClientDetail.module.css";

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
  clinic: { name: string; address: string; defaultWhatsappMode?: string };
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
  const { activeClinic, user: currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && !hasPermission(currentUser, "clientes", "Ver clientes")) {
      router.push("/dashboard/agenda");
    }
  }, [currentUser, router]);

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
  const [activeTab, setActiveTab] = useState<"general" | "documents" | "forms" | "medical" | "permissions" | "billing" | "budgets">("general");

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

  // Options Dropdown State
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  // Inline Editing fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  // Full Edit Modal State
  const [showFullEditModal, setShowFullEditModal] = useState(false);

  // Permissions state
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Create Client Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  // Catalog services autocompletion
  const [services, setServices] = useState<any[]>([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);


  const [formTutorMunicipality, setFormTutorMunicipality] = useState("");


  // Associated Vouchers, files and billing sub-tabs
  const [billingSubTab, setBillingSubTab] = useState<"citas" | "productos" | "bonos" | "suscripciones" | "presupuestos">("bonos");
  const [clinicVouchers, setClinicVouchers] = useState<any[]>([]);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState("");
  const [showAssociateDocModal, setShowAssociateDocModal] = useState(false);
  const [docWizardStep, setDocWizardStep] = useState<"select_and_edit" | "preview_and_sign">("select_and_edit");
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
  const [activeSignee, setActiveSignee] = useState<"patient" | "doctor" | "">("");
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
          setFormBirthDate(data.birthDate.split("T")[0]);
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

  // Click outside options dropdown menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptionsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/clients/${id}/files`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir archivo");
      
      // Reload client details to get updated files list
      fetchClientDetails();
      alert("Archivo subido con éxito");
    } catch (err) {
      console.error(err);
      alert("Error al subir el archivo.");
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
    const discount = parseFloat(newItemDiscount) || 0;
    
    const subtotal = price * qty;
    const discountAmount = (subtotal * discount) / 100;
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
        discount,
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
        alert("Presupuesto guardado correctamente.");
      } else {
        const err = await res.json();
        alert(err.error || "Error al guardar presupuesto.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!budgetTitleInput.trim()) {
      alert("Introduce un nombre para la plantilla.");
      return;
    }
    if (budgetItems.length === 0) {
      alert("La plantilla debe contener al menos un artículo.");
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
        alert("Plantilla de presupuesto creada con éxito.");
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear plantilla.");
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
        alert("Presupuesto aceptado. Saldo monedero habilitado.");
      } else {
        alert("Error al aceptar presupuesto.");
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
        alert("Presupuesto enviado a la papelera.");
      } else {
        alert("Error al eliminar presupuesto.");
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
              <div><strong>DNI/NIF:</strong> ${client?.dniNif || "-"}</div>
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

          <div class="signatures">
            <div class="signature-box">Firma del Profesional</div>
            <div class="signature-box">Firma de Conformidad del Paciente</div>
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
      isSelfEmployed: client.isSelfEmployed,
      isCompany: client.isCompany,
      receivesReminders: client.receivesReminders,
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
    } else {
      alert("Error al actualizar los datos");
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
      alert("Permisos actualizados correctamente");
      fetchClientDetails();
    } else {
      alert("Error al actualizar permisos");
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClinic || !createFirstName || !createLastName) return;

    const payload = {
      firstName: createFirstName,
      lastName: createLastName,
      phone: createPhone,
      email: createEmail,
      dniNif: createDniNif,
      birthDate: createBirthDate || null,
      gender: createGender,
      address: createAddress,
      municipality: createMunicipality,
      postalCode: createPostalCode,
      country: createCountry,
      clinicId: activeClinic.id
    };

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const newClient = await res.json();
      setShowCreateModal(false);
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePhone("");
      setCreateEmail("");
      setCreateDniNif("");
      setCreateBirthDate("");
      setCreateAddress("");
      setCreateMunicipality("");
      setCreatePostalCode("");
      
      // Update lists and navigate to details
      fetchSidebarClientsList();
      router.push(`/dashboard/contacts/${newClient.id}`);
    } else {
      alert("Error al crear cliente");
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
        alert("Error al eliminar cliente");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
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
    
    // Detección ultra robusta de firma digital usando expresiones regulares
    const hasDigitalAttr = /data-type=["']?digital["']?/i.test(content);
    const hasDigitalText = /\[Campo_firma_digital\]/i.test(content) || /firma.*digital/i.test(content);
    const hasDigitalVar = /signature\.digital/i.test(content);
    
    const isDigitalSignature = hasDigitalAttr || hasDigitalText || hasDigitalVar;
                               
    if (isDigitalSignature) {
      handleCreateRemoteSignatureRequest();
    } else {
      // Go to Step 2 for ordinary tablet signature
      setDocWizardStep("preview_and_sign");
    }
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
      html = '<span class="var-badge var-signature" data-type="ordinary" style="background:#eab308; color:black; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_ordinaria]</span>';
    } else if (variable === "{{signature.certified}}") {
      html = '<span class="var-badge var-signature" data-type="certified" style="background:#ca8a04; color:white; padding:4px 10px; border-radius:4px; font-size:12px; margin:0 2px; font-weight:600; display:inline-block;" contenteditable="false">[Campo_firma_certificada]</span>';
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

    // Replace patient signature placeholder or badges with final images if signed
    if (patientSignature) {
      const patientSigHTML = `
        <div style="text-align: center; display: inline-block;">
          <img src="${patientSignature}" style="max-height: 90px; max-width: 180px; display: block;" alt="Firma Paciente" />
          <span style="font-size: 10px; color: #64748b; display: block; margin-top: 4px; font-family: sans-serif;">
            Firmado por el Paciente el ${new Date().toLocaleDateString("es-ES")}
          </span>
        </div>
      `;
      finalContent = finalContent.replaceAll("[Campo_firma_ordinaria]", patientSigHTML);
      finalContent = finalContent.replaceAll("[Campo_firma_certificada]", patientSigHTML); // ordinaria / certificada
      finalContent = finalContent.replace("<em>[Espacio de Firma Digital]</em>", patientSigHTML);
    }

    if (doctorSignature) {
      const doctorSigHTML = `
        <div style="text-align: center; display: inline-block;">
          <img src="${doctorSignature}" style="max-height: 90px; max-width: 180px; display: block;" alt="Firma Médico" />
          <span style="font-size: 10px; color: #64748b; display: block; margin-top: 4px; font-family: sans-serif;">
            Firmado por el Médico el ${new Date().toLocaleDateString("es-ES")}
          </span>
        </div>
      `;
      finalContent = finalContent.replaceAll("[Campo_firma_certificada]", doctorSigHTML);
    }

    const payload = {
      clientId: client.id,
      name: generatedDocName,
      content: finalContent,
      signature: patientSignature || doctorSignature || null,
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
      setDocWizardStep("select_and_edit");
      fetchClientDetails(true);
    } else {
      alert("Error al guardar el documento firmado");
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
    return `(${age} años)`;
  };

  const filteredSidebarClients = sidebarClients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(sidebarSearch)) ||
    (c.dniNif && c.dniNif.toLowerCase().includes(sidebarSearch.toLowerCase()))
  );

  if (loading) {
    return <div className={styles.loadingState}>Cargando ficha del paciente...</div>;
  }

  if (!client) return null;

  const hasDigitalSignature = /data-type=["']?digital["']?/i.test(generatedDocContent) ||
                              /\[Campo_firma_digital\]/i.test(generatedDocContent) ||
                              generatedDocContent.toLowerCase().includes('firma_digital') ||
                              generatedDocContent.toLowerCase().includes('signature.digital');

  return (
    <div className={styles.container}>
      {/* LEFT COLUMN: SIDEBAR */}
      <div className={styles.sidebarCol}>
        <div className={styles.sidebarSearchWrapper}>
          <Icons.Search size={16} className={styles.sidebarSearchIcon} />
          <input 
            type="text" 
            placeholder="Buscar cliente" 
            className={styles.sidebarSearchInput}
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>
        
        <div className={styles.sidebarClientList}>
          {filteredSidebarClients.map((c) => {
            const isActive = c.id === id;
            return (
              <div 
                key={c.id} 
                className={`${styles.sidebarClientItem} ${isActive ? styles.sidebarClientItemActive : ""}`}
                onClick={() => router.push(`/dashboard/contacts/${c.id}`)}
              >
                <div className={styles.sidebarAvatar}>
                  {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                </div>
                <div className={styles.sidebarInfo}>
                  <span className={styles.sidebarClientName}>{c.firstName} {c.lastName}</span>
                  <span className={styles.sidebarClientPhone}>{c.phone || "Sin teléfono"}</span>
                </div>
                <div className={styles.sidebarInitialLetter}>
                  {c.lastName.charAt(0).toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.sidebarFooterButtons}>
          <button className={styles.orangeBtn} onClick={() => setShowCreateModal(true)}>
            Crear contacto
          </button>
          <button className={styles.whiteBtn} onClick={() => router.push("/dashboard/contacts")}>
            Explorar clientes
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: MAIN CONTENT */}
      <div className={styles.mainCol}>
        {/* Breadcrumb nav */}
        <div className={styles.backNav}>
          <Link href="/dashboard/contacts" className={styles.backLink}>
            <Icons.ChevronLeft size={16} />
            <span>Volver a Contactos</span>
          </Link>
        </div>

        {/* Patient Main Card */}
        <header className={styles.patientHeaderCard}>
          <div className={styles.avatar}>
            {client.firstName.charAt(0)}{client.lastName.charAt(0)}
          </div>
          
          <div className={styles.patientMeta}>
            <div className={styles.nameRow}>
              <h1>{client.firstName} {client.lastName}</h1>
              <span className={styles.clientNumberBadge}>Cliente #{client.clientNumber}</span>
            </div>
            <div className={styles.contactChips}>
              {client.phone && (
                <span className={styles.chip}>
                  <Icons.Phone size={14} />
                  {showPersonalData ? client.phone : "******"}
                </span>
              )}
              {client.email && (
                <span className={styles.chip}>
                  <Icons.Mail size={14} />
                  {showPersonalData ? client.email : "******"}
                </span>
              )}
              {client.dniNif && (
                <span className={styles.chip}>
                  <Icons.Award size={14} />
                  NIF: {showPersonalData ? client.dniNif : "******"}
                </span>
              )}
            </div>
            <div className={styles.tagChips}>
              {client.tags?.split(",").map((tag) => (
                <span key={tag} className={styles.tagBadge}>{tag.trim()}</span>
              ))}
            </div>
          </div>

          {/* Opciones Dropdown */}
          <div className={styles.optionsWrapper} ref={optionsRef}>
            <button 
              className={styles.optionsBtn}
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
            >
              <span>Opciones</span>
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
                  <span>Nueva cita</span>
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
                  <span>Nuevo tutor legal</span>
                </button>
                <button 
                  className={styles.optionItem}
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    setShowFullEditModal(true);
                  }}
                >
                  <Icons.Award size={14} />
                  <span>Etiquetas</span>
                </button>
                <button 
                  className={styles.optionItem}
                  onClick={() => {
                    setShowOptionsDropdown(false);
                    setActiveTab("medical");
                  }}
                >
                  <Icons.FileText size={14} />
                  <span>Notas</span>
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
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Profile Section Tabs */}
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabBtn} ${activeTab === "general" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("general")}
          >
            Datos personales
          </button>
          {showDocumentsTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "documents" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("documents")}
            >
              Documentos
            </button>
          )}
          {showFormsTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "forms" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("forms")}
            >
              Formularios
            </button>
          )}
          {showMedicalTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "medical" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("medical")}
            >
              Seguimientos
            </button>
          )}
          {currentUser?.role === "ADMIN" && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "permissions" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("permissions")}
            >
              Permisos
            </button>
          )}
          {showBillingTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "billing" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("billing")}
            >
              Artículos
            </button>
          )}
          {showBudgetsTab && (
            <button 
              className={`${styles.tabBtn} ${activeTab === "budgets" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("budgets")}
            >
              Presupuestos
            </button>
          )}
        </div>


        {/* Tab Panels */}
        <div className={styles.tabContentCanvas}>
          {/* TAB 1: Datos personales */}
          {activeTab === "general" && (
            <div className={styles.personalDataCard}>
              <div className={styles.personalDataHeader}>
                <span className={styles.personalDataTitle}>Datos Personales</span>
                {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Editar clientes")) && (
                  <button 
                    className={styles.cardEditBtn}
                    onClick={() => setShowFullEditModal(true)}
                  >
                    Editar
                  </button>
                )}
              </div>

              <div className={styles.personalFieldsList}>
                {/* Field Row: Nombre */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Nombre</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("firstName")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                        title="Editar nombre"
                      >
                        <Icons.Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Field Row: Apellido */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Apellido</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("lastName")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                        title="Editar apellidos"
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("email")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Editar email"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Telefono */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Teléfono</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("phone")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Enviar WhatsApp"
                        >
                          <WhatsAppIcon size={16} />
                        </a>
                      )}
                      {showPersonalData && (
                        <button 
                          className={styles.inlineEditTriggerBtn}
                          onClick={() => startInlineEdit("phone", client.phone || "")}
                          title="Editar teléfono"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Fecha Nacimiento */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Fecha de nacimiento</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("birthDate")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Editar fecha de nacimiento"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: DNI / NIF */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>DNI/NIF</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("dniNif")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Editar DNI/NIF"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Pais */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>País</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("country")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                        title="Editar país"
                      >
                        <Icons.Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Field Row: Direccion */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Dirección</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("address")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Editar dirección"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Ciudad/Municipio */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Ciudad/Municipio</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("municipality")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Editar ciudad/municipio"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Codigo postal */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Código postal</span>
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
                        <button className={styles.inlineSaveBtn} onClick={() => saveInlineEdit("postalCode")} title="Guardar">
                          <Icons.Check size={14} />
                        </button>
                        <button className={styles.inlineCancelBtn} onClick={cancelInlineEdit} title="Cancelar">
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
                          title="Editar código postal"
                        >
                          <Icons.Edit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Field Row: Alta */}
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Alta</span>
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
                  <span className={styles.switchText}>Es Autónomo</span>
                </label>

                <label className={styles.switchRow}>
                  <input 
                    type="checkbox" 
                    className={styles.switchCheckbox}
                    checked={client.isCompany} 
                    onChange={() => handleToggleSwitch("isCompany", client.isCompany)} 
                  />
                  <div className={styles.switchToggle} />
                  <span className={styles.switchText}>Es Empresa</span>
                </label>

                <label className={styles.switchRow}>
                  <input 
                    type="checkbox" 
                    className={styles.switchCheckbox}
                    checked={client.receivesReminders} 
                    onChange={() => handleToggleSwitch("receivesReminders", client.receivesReminders)} 
                  />
                  <div className={styles.switchToggle} />
                  <span className={styles.switchText}>Recibirá Recordatorios</span>
                </label>
              </div>

              {/* Tutor legal scroll target */}
              <div id="tutor-section" style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px" }}>Tutor Legal / Representante</h3>
                <div className={styles.personalFieldsList}>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>Nombre Tutor</span>
                    <span className={styles.fieldValue}>
                      {showPersonalData ? `${client.tutorName || "-"} ${client.tutorLastName || ""}` : "******"}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>Teléfono Tutor</span>
                    <span className={styles.fieldValue}>
                      {showPersonalData ? (client.tutorPhone || "-") : "******"}
                    </span>
                  </div>
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>Email Tutor</span>
                    <span className={styles.fieldValue}>
                      {showPersonalData ? (client.tutorEmail || "-") : "******"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Documentos */}
          {activeTab === "documents" && (
            <div className={styles.documentsPanel} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "32px", alignItems: "start" }}>
                
                {/* COLUMNA IZQUIERDA: BOTONES DE ACCIÓN + ARCHIVOS SUBIDOS */}
                <div>
                  {/* Action Buttons Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <button 
                      type="button" 
                      onClick={() => { setShowAssociateDocModal(true); setDocTemplateSearch(""); setSelectedTemplateId(""); }}
                      style={{
                        height: "120px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        background: "#ffffff",
                        border: "1.5px solid #006687",
                        borderRadius: "8px",
                        color: "#006687",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>Asociar documento</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        height: "120px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        background: "#ffffff",
                        border: "1.5px solid #006687",
                        borderRadius: "8px",
                        color: "#006687",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.5 19A5.5 5.5 0 0 0 18 8h-1.26A8 8 0 1 0 4 15.25" />
                        <path d="m10 13 2-2 2 2" />
                        <path d="M12 11v9" />
                      </svg>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>Adjuntar archivos</span>
                    </button>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      style={{ display: "none" }} 
                    />
                  </div>

                  {/* Section: Archivos subidos */}
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "#006687" }}>
                      Archivos subidos
                    </h3>
                    {(!client.files || client.files.length === 0) ? (
                      <div className={styles.emptyState}>No hay archivos subidos.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {client.files.map((file: any) => (
                          <div 
                            key={file.id} 
                            style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}
                          >
                            {/* File Name Display */}
                            <input
                              type="text"
                              readOnly
                              value={file.name}
                              style={{
                                flexGrow: 1,
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                color: "#334155",
                                background: "#ffffff",
                                outline: "none"
                              }}
                            />

                            {/* File Badge */}
                            <span style={{
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              color: "#475569",
                              borderRadius: "4px",
                              padding: "4px 10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              textAlign: "center",
                              width: "60px",
                              display: "inline-block"
                            }}>
                              FILE
                            </span>

                            {/* File Date */}
                            <span style={{
                              fontSize: "12px",
                              color: "#64748b",
                              whiteSpace: "nowrap",
                              width: "80px",
                              textAlign: "center"
                            }}>
                              {new Date(file.createdAt).toLocaleDateString("es-ES").replace(/\//g, ".")}
                            </span>

                            {/* File Actions */}
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                              <a 
                                href={file.fileUrl} 
                                download={file.name}
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Descargar archivo"
                                style={{ color: "#006687", display: "flex", alignItems: "center" }}
                              >
                                <Icons.Download size={18} style={{ color: "#4f46e5" }} />
                              </a>
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileDelete(file.id);
                                }}
                                title="Eliminar archivo"
                                style={{ 
                                  background: "none", 
                                  border: "none", 
                                  color: "#ef4444", 
                                  cursor: "pointer", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  padding: 0 
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ background: "#fecaca", borderRadius: "50%", padding: "2px", color: "#ef4444" }}>
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: DOCUMENTOS ASOCIADOS */}
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "#006687" }}>
                    Documentos asociados
                  </h3>
                  {client.documents.length === 0 ? (
                    <div className={styles.emptyState}>No hay documentos asociados.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {client.documents.map((doc) => {
                         const isSigned = !!doc.signature;
                         return (
                           <div 
                             key={doc.id} 
                             style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}
                           >
                             {/* Document Name Display */}
                             <input
                               type="text"
                               readOnly
                               value={doc.name}
                               style={{
                                 flexGrow: 1,
                                 padding: "8px 12px",
                                 borderRadius: "6px",
                                 border: "1px solid #cbd5e1",
                                 fontSize: "13px",
                                 color: "#334155",
                                 background: "#ffffff",
                                 outline: "none"
                               }}
                             />
                             
                             {/* Status Badge */}
                             {isSigned ? (
                               <span style={{
                                 background: "rgba(16, 185, 129, 0.08)",
                                 border: "1px solid rgba(16, 185, 129, 0.3)",
                                 color: "#065f46",
                                 borderRadius: "4px",
                                 padding: "4px 10px",
                                 fontSize: "11px",
                                 fontWeight: 600,
                                 whiteSpace: "nowrap",
                                 textAlign: "center",
                                 width: "80px",
                                 display: "inline-block"
                               }}>
                                 ✓ Firmado
                               </span>
                             ) : (
                               <span style={{
                                 background: "#f1f5f9",
                                 border: "1px solid #e2e8f0",
                                 color: "#475569",
                                 borderRadius: "4px",
                                 padding: "4px 10px",
                                 fontSize: "11px",
                                 fontWeight: 600,
                                 whiteSpace: "nowrap",
                                 textAlign: "center",
                                 width: "80px",
                                 display: "inline-block"
                               }}>
                                 Sin firma
                               </span>
                             )}

                             {/* Date */}
                             <span style={{
                               fontSize: "12px",
                               color: "#64748b",
                               whiteSpace: "nowrap",
                               width: "80px",
                               textAlign: "center"
                             }}>
                               {new Date(doc.createdAt).toLocaleDateString("es-ES").replace(/\//g, ".")}
                             </span>

                             {/* Actions Menu */}
                             <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                               {/* Eye Button */}
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
                                 style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                               >
                                 <Icons.Eye size={18} />
                               </button>

                               {/* Download/Print Button */}
                               <button
                                 type="button"
                                 onClick={() => handleDownloadDoc(doc)}
                                 title="Descargar documento (Imprimir/PDF)"
                                 style={{ background: "none", border: "none", color: "#4f46e5", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                               >
                                 <Icons.Download size={18} style={{ color: "#4f46e5" }} />
                               </button>

                               {/* Delete Button */}
                               {(currentUser?.role === "ADMIN" || hasPermission(currentUser, "clientes", "Eliminar clientes")) && (
                                 <button
                                   type="button"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     setDocToDelete(doc.id);
                                   }}
                                   title="Eliminar documento"
                                   style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                                 >
                                   <Icons.Trash size={18} />
                                 </button>
                               )}
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

              {/* ── NUEVO DOCUMENTO MODAL ── */}
              {/* ── NUEVO DOCUMENTO MODAL (WIZARD) ── */}
              {showAssociateDocModal && (
                <div className={styles.modalOverlay}>
                  <div 
                    className={`${styles.modalContent} glass fade-in`} 
                    style={{ 
                      maxWidth: docWizardStep === "preview_and_sign" ? "750px" : "850px", 
                      padding: "24px", 
                      width: "90%",
                      maxHeight: "90vh",
                      overflowY: "auto",
                      boxSizing: "border-box"
                    }}
                  >
                    {/* Header Controls */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>
                        {docWizardStep === "preview_and_sign" ? "VISTA PREVIA DE CONSENTIMIENTO" : "NUEVO DOCUMENTO"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {docWizardStep === "select_and_edit" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAssociateDocModal(false);
                                setDocWizardStep("select_and_edit");
                              }}
                              style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={!selectedTemplateId}
                              onClick={handleDocWizardContinue}
                              style={{ background: "var(--primary)", color: "white" }}
                            >
                              Continuar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setDocWizardStep("select_and_edit")}
                              style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                            >
                              Atrás
                            </button>
                            
                            {/* Opciones Dropdown */}
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
                                <div style={{ position: "absolute", top: "100%", right: 0, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", borderRadius: "6px", width: "160px", zIndex: 10, display: "flex", flexDirection: "column", padding: "4px 0", marginTop: "4px" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowDocOptionsDropdown(false);
                                      setShowAssociateDocModal(false);
                                      handleCreateRemoteSignatureRequest("whatsapp");
                                    }}
                                    style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", display: "flex", gap: "8px" }}
                                  >
                                    <span>💬</span> Via whatsapp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowDocOptionsDropdown(false);
                                      setShowAssociateDocModal(false);
                                      handleCreateRemoteSignatureRequest("email");
                                    }}
                                    style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", display: "flex", gap: "8px" }}
                                  >
                                    <span>✉️</span> Via Email
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowDocOptionsDropdown(false);
                                      handlePrintDocument();
                                    }}
                                    style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%", display: "flex", gap: "8px" }}
                                  >
                                    <span>🖨️</span> Imprimir
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleSaveAssociatedDocument}
                              style={{ background: "#10b981", borderColor: "#10b981", color: "white" }}
                            >
                              Guardar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Step 1: Select Template and Edit Content */}
                    {docWizardStep === "select_and_edit" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600, fontSize: "12px" }}>Selecciona un modelo de documento</label>
                          <select
                            className="input"
                            value={selectedTemplateId}
                            onChange={(e) => handleSelectTemplate(e.target.value)}
                            style={{ width: "100%", background: "var(--bg-input)" }}
                          >
                            <option value="">-- Selecciona una plantilla --</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        {selectedTemplateId && (
                          <>
                            {/* Editor Toolbar */}
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px", borderRadius: "6px" }}>
                              <button type="button" onClick={() => handleDocCommand('bold')} style={{ padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>B</button>
                              <button type="button" onClick={() => handleDocCommand('italic')} style={{ padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", fontStyle: "italic", cursor: "pointer" }}>i</button>
                              <button type="button" onClick={() => handleDocCommand('underline')} style={{ padding: "6px 10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", textDecoration: "underline", cursor: "pointer" }}>U</button>
                              <button type="button" onClick={() => {
                                const color = prompt("Color hexadecimal (ej: #ef4444):");
                                if (color) handleDocCommand('foreColor', color);
                              }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>A🎨</button>
                              
                              <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                              <button type="button" onClick={() => handleDocCommand('justifyLeft')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>Align L</button>
                              <button type="button" onClick={() => handleDocCommand('justifyCenter')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>Align C</button>
                              <button type="button" onClick={() => handleDocCommand('justifyRight')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>Align R</button>
                              
                              <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                              <button type="button" onClick={() => {
                                const url = prompt("Introduce la URL del enlace:");
                                if (url) handleDocCommand('createLink', url);
                              }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>🔗 Enlace</button>
                              
                              <button type="button" onClick={() => {
                                const url = prompt("Introduce la URL de la imagen:");
                                if (url) handleDocCommand('insertImage', url);
                              }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>🖼️ Imagen</button>
                              
                              <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                              <button type="button" onClick={() => handleDocCommand('undo')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>↩️</button>
                              <button type="button" onClick={() => handleDocCommand('redo')} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}>↪️</button>
                              
                              <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                              <button type="button" onClick={() => {
                                setDocHtmlModalContent(generatedDocContent);
                                setShowDocHtmlModal(true);
                              }} style={{ padding: "6px 8px", background: "white", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                <span>&lt;/&gt;</span>
                                <span>HTML</span>
                              </button>
                              
                              <span style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

                              {/* Variables Dropdown */}
                              <div style={{ position: "relative" }}>
                                <button
                                  type="button"
                                  onClick={() => setShowDocVariablesDropdown(!showDocVariablesDropdown)}
                                  style={{ padding: "6px 12px", background: "var(--primary)", color: "white", border: "none", borderRadius: "4px", fontWeight: 600, cursor: "pointer" }}
                                >
                                  Variables ▾
                                </button>
                                {showDocVariablesDropdown && (
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
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{client.firstName}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Paciente</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{client.lastName}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Apellidos Paciente</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Cliente:Dirección_Cliente}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Dirección Paciente</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{client.dniNif}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>NIF Paciente</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{client.birthDate}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>F. Nacimiento</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{client.allergies}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Alergias</button>

                                    <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>CLÍNICA / CONSULTA</div>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{clinic.name}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Clínica</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Dirección_Consulta}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Dirección Clínica</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{clinic.municipality}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Municipio Clínica</button>

                                    <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>CITA</div>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Fecha_Hora_Cita}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Fecha/Hora Cita</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Fecha_larga}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Fecha Larga Cita</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Hora_Cita}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Hora Cita</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Nombre_Servicio}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Servicio</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Recurso}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Recurso/Cabina</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Zona_horaria}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Zona Horaria</button>

                                    <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>LINKS</div>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Link_VideoConsulta}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Videoconsulta</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Link_Cancelar_Cita}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Cancelar Cita</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Link_Mover_Cita}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Mover Cita</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Link_Confirmar_Cita}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Confirmar Cita</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Link_Pago_Online}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Link Pago Online</button>

                                    <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>EMPLEADO / TUTOR</div>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Empleado_Nombre_Completo}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Completo</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Empleado_Nombre}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Nombre Empleado</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Empleado_Apellidos}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Apellidos Empleado</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Empleado_Correo}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Correo Empleado</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Empleado_Teléfono}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Teléfono Empleado</button>

                                    <div style={{ padding: "4px 12px", fontSize: "10px", fontWeight: "bold", color: "var(--text-secondary)", background: "#f1f5f9", letterSpacing: "0.5px" }}>OTRO</div>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{Deuda}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Deuda Pendiente</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{document.date}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", width: "100%" }}>Fecha Documento</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{signature.client}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", color: "var(--accent)", width: "100%" }}>Firma Paciente (Ordinary)</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{signature.certified}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", color: "var(--accent)", width: "100%" }}>Firma Médico (Certified)</button>
                                    <button type="button" onClick={() => { handleInsertDocVariable("{{signature.digital}}"); setShowDocVariablesDropdown(false); }} style={{ padding: "6px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: "12px", color: "var(--accent)", width: "100%" }}>Firma Digital (Remote Link)</button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Workspace */}
                            <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                              <label className="form-label" style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>Contenido del documento (Editable)</label>
                              <div
                                ref={associateEditorRef}
                                contentEditable={true}
                                onInput={handleDocEditorInput}
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
                                  boxSizing: "border-box",
                                  width: "100%"
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 2: Final Preview and Interactive Signatures */}
                    {docWizardStep === "preview_and_sign" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        {/* Paper Sheet Preview Container */}
                        <div 
                          style={{ 
                            background: "#ffffff", 
                            border: "1px solid #cbd5e1", 
                            borderRadius: "8px", 
                            padding: "32px 40px", 
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                            minHeight: "400px"
                          }}
                        >


                          {/* Raw HTML Content */}
                          <div 
                            dangerouslySetInnerHTML={{ __html: generatedDocContent }} 
                            style={{ fontSize: "14px", lineHeight: "1.6", color: "#1e293b", fontFamily: "sans-serif" }}
                          />

                          {/* Interactive Signatures Box Grid */}
                          {!hasDigitalSignature && (
                            <div 
                              style={{ 
                                display: "grid", 
                                gridTemplateColumns: "1fr 1fr", 
                                gap: "32px", 
                                marginTop: "48px", 
                                borderTop: "1px solid #e2e8f0", 
                                paddingTop: "24px" 
                              }}
                            >
                              {/* Patient Sign block */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>FIRMA DEL PACIENTE</span>
                                <div 
                                  onClick={() => {
                                    setActiveSignee("patient");
                                    setShowSignModal(true);
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    width: "220px",
                                    height: "120px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    background: "#f8fafc",
                                    transition: "all 0.2s",
                                    overflow: "hidden"
                                  }}
                                >
                                  {patientSignature ? (
                                    <img src={patientSignature} style={{ maxHeight: "100px", maxWidth: "200px", display: "block" }} alt="Firma Paciente" />
                                  ) : (
                                    <div style={{ textAlign: "center", color: "#94a3b8" }}>
                                      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ display: "block", margin: "0 auto 4px" }}>
                                        <path d="M12 20h9"/>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                      </svg>
                                      <span style={{ fontSize: "10px", fontWeight: 600 }}>Haga clic para firmar</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Doctor Sign block */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>FIRMA MÉDICO</span>
                                <div 
                                  onClick={() => {
                                    setActiveSignee("doctor");
                                    setShowSignModal(true);
                                  }}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    width: "220px",
                                    height: "120px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    background: "#f8fafc",
                                    transition: "all 0.2s",
                                    overflow: "hidden"
                                  }}
                                >
                                  {doctorSignature ? (
                                    <img src={doctorSignature} style={{ maxHeight: "100px", maxWidth: "200px", display: "block" }} alt="Firma Médico" />
                                  ) : (
                                    <div style={{ textAlign: "center", color: "#94a3b8" }}>
                                      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ display: "block", margin: "0 auto 4px" }}>
                                        <path d="M12 20h9"/>
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                      </svg>
                                      <span style={{ fontSize: "10px", fontWeight: 600 }}>Haga clic para firmar</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Document Date Bottom */}
                          <div style={{ textAlign: "center", marginTop: "32px", fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
                            FECHA: {new Date().toLocaleDateString("es-ES")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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

                <button
                  type="button"
                  className={styles.btnAddArticle}
                  onClick={() => {
                    if (billingSubTab === "bonos") {
                      setShowAddVoucherModal(true);
                    } else {
                      alert(`Añadir ${billingSubTab} no está implementado de forma personalizada.`);
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span>Añadir artículo</span>
                </button>
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
                                    style={{ color: "#8b5cf6" }}
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
                                  <div style={{ marginBottom: "10px", padding: "8px", background: "rgba(139,92,246,0.06)", borderRadius: "6px", border: "1px solid rgba(139,92,246,0.2)" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#8b5cf6", marginBottom: "4px" }}>Compartido con:</div>
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
                                  <Link
                                    href={`/dashboard/sales?clientId=${id}&clientVoucherId=${voucher.id}`}
                                    className="btn btn-secondary"
                                    style={{ width: "100%", padding: "8px 12px", fontSize: "13px", display: "inline-flex", justifyContent: "center", alignItems: "center" }}
                                  >
                                    Finalizar compra
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {billingSubTab === "citas" && (
                  <div>
                    <h4 className={styles.sectionSubtitle}>Citas del cliente</h4>
                    {(!client.appointments || client.appointments.length === 0) ? (
                      <div className={styles.emptyState}>No hay citas registradas para este paciente.</div>
                    ) : (
                      <div className="table-container">
                        <table className="table" style={{ fontSize: "13px" }}>
                          <thead>
                            <tr>
                              <th>Servicio</th>
                              <th>Profesional</th>
                              <th>Fecha / Hora</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.appointments.map((app) => (
                              <tr key={app.id}>
                                <td><strong>{app.service.name}</strong></td>
                                <td>{app.user.name}</td>
                                <td>{new Date(app.start).toLocaleString("es-ES")}</td>
                                <td>
                                  <span className={`badge badge-${app.status.toLowerCase()}`}>
                                    {app.status === "CONFIRMED" ? "Confirmada" : app.status === "COMPLETED" ? "Completada" : app.status === "PENDING" ? "Pendiente" : "Cancelada"}
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

                {billingSubTab === "productos" && (
                  <div>
                    <h4 className={styles.sectionSubtitle}>Productos adquiridos</h4>
                    {client.sales.length === 0 ? (
                      <div className={styles.emptyState}>No hay compras de productos registradas para este paciente.</div>
                    ) : (
                      <div className="table-container">
                        <table className="table" style={{ fontSize: "13px" }}>
                          <thead>
                            <tr>
                              <th>Factura</th>
                              <th>Fecha</th>
                              <th>Pago</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.sales.map((sale) => (
                              <tr key={sale.id}>
                                <td><strong>{sale.invoiceNumber}</strong></td>
                                <td>{new Date(sale.createdAt).toLocaleDateString("es-ES")}</td>
                                <td>{sale.paymentMethod === "CARD" ? "Tarjeta" : "Efectivo"}</td>
                                <td><strong>{sale.total.toFixed(2)}€</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                                style={{ padding: "3px 8px", fontSize: "11px", background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "4px", cursor: "pointer" }}
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
        </div>
      </div>

      {/* BUDGET CREATION/EDITION MODAL */}
      {showBudgetModal && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
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
                    <th style={{ padding: "8px", textAlign: "left" }}>Dcto %</th>
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
                      <td style={{ padding: "8px" }}>{item.discount}%</td>
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
                    <td style={{ padding: "8px", width: "70px" }}>
                      <input
                        type="number"
                        className="input"
                        value={newItemDiscount}
                        onChange={(e) => setNewItemDiscount(e.target.value)}
                        style={{ padding: "6px", fontSize: "12px", width: "100%" }}
                      />
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
        </div>
      )}


      {/* FULL EDIT DATA MODAL */}
      {showFullEditModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "700px" }}>
            <div className={styles.modalHeader}>
              <h2>Editar Ficha de Cliente</h2>
              <button onClick={() => setShowFullEditModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className={styles.modalForm}>
              <div className={styles.columnsGrid}>
                {/* General contact data */}
                <div className={styles.detailsGroup}>
                  <h3>Datos Generales</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="input"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input
                      type="text"
                      className="input"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="input"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">DNI / NIF</label>
                    <input
                      type="text"
                      className="input"
                      value={formDniNif}
                      onChange={(e) => setFormDniNif(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      className="input"
                      value={formBirthDate}
                      onChange={(e) => setFormBirthDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Additional / Location details */}
                <div className={styles.detailsGroup}>
                  <h3>Localización y Representante</h3>

                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="input"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ciudad / Municipio</label>
                    <input
                      type="text"
                      className="input"
                      value={formMunicipality}
                      onChange={(e) => setFormMunicipality(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Código Postal</label>
                    <input
                      type="text"
                      className="input"
                      value={formPostalCode}
                      onChange={(e) => setFormPostalCode(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">País</label>
                    <input
                      type="text"
                      className="input"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Etiquetas (separadas por comas)</label>
                    <input
                      type="text"
                      className="input"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFullEditModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
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

      {/* CREATE NEW CLIENT SIDEBAR MODAL */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass fade-in`} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h2>Crear Nuevo Contacto</h2>
              <button onClick={() => setShowCreateModal(false)} className={styles.closeBtn}>
                <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input 
                  type="text" 
                  className="input"
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apellidos *</label>
                <input 
                  type="text" 
                  className="input"
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input 
                  type="text" 
                  className="input"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="input"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">DNI / NIF</label>
                <input 
                  type="text" 
                  className="input"
                  value={createDniNif}
                  onChange={(e) => setCreateDniNif(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  className="input"
                  value={createBirthDate}
                  onChange={(e) => setCreateBirthDate(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
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
    </div>
  );
}
