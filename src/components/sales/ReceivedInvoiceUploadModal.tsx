"use client";

import React, { useState, useRef } from "react";
import { toast } from "@/components/ToastContainer";
import { Icons } from "@/components/Icons";

interface ReceivedInvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}

export const ReceivedInvoiceUploadModal: React.FC<ReceivedInvoiceUploadModalProps> = ({
  isOpen,
  onClose,
  clinicId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanStep, setScanStep] = useState<"upload" | "review">("upload");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);

  // Form Fields
  const [supplierName, setSupplierName] = useState("");
  const [supplierNif, setSupplierNif] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("MATERIAL_CLINICO");
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(21);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [retentionRate, setRetentionRate] = useState<number>(0);
  const [retentionAmount, setRetentionAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [status, setStatus] = useState("PAGADO");
  const [registerInCashRegister, setRegisterInCashRegister] = useState(false);
  const [notes, setNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".pdf")) {
      toast.error("Formato no compatible. Por favor sube un archivo PDF o una imagen (JPG, PNG).");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo permitido de 20 MB.");
      return;
    }

    setFile(selectedFile);
    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("clinicId", clinicId);

      const res = await fetch("/api/invoices/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al procesar la factura");
      }

      const data = await res.json();
      setFileUrl(data.fileUrl);
      setAiEnabled(data.aiEnabled);

      if (data.extractedData) {
        const ext = data.extractedData;
        setSupplierName(ext.supplierName || "");
        setSupplierNif(ext.supplierNif || "");
        setInvoiceNumber(ext.invoiceNumber || "");
        setIssueDate(ext.issueDate || new Date().toISOString().substring(0, 10));
        setDueDate(ext.dueDate || ext.issueDate || new Date().toISOString().substring(0, 10));
        setConcept(ext.concept || "");
        setCategory(ext.category || "MATERIAL_CLINICO");
        setBaseAmount(ext.baseAmount || 0);
        setTaxRate(ext.taxRate || 21);
        setTaxAmount(ext.taxAmount || 0);
        setRetentionRate(ext.retentionRate || 0);
        setRetentionAmount(ext.retentionAmount || 0);
        setTotal(ext.total || 0);
        setPaymentMethod(ext.paymentMethod || "TRANSFER");
        setConfidence(ext.confidence ?? null);

        if (data.aiEnabled) {
          toast.success("Factura analizada con éxito por IA. Revisa los datos extraídos.");
        } else {
          toast.info("Documento subido. Rellena o verifica los datos de la factura.");
        }
      }

      setScanStep("review");
    } catch (err: any) {
      console.error("Scan error:", err);
      toast.error("Error al procesar el archivo: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Recalculate tax and total when baseAmount, taxRate, or retentionRate changes
  const handleBaseChange = (newBase: number) => {
    setBaseAmount(newBase);
    const newTax = parseFloat(((newBase * taxRate) / 100).toFixed(2));
    setTaxAmount(newTax);
    const newRet = parseFloat(((newBase * retentionRate) / 100).toFixed(2));
    setRetentionAmount(newRet);
    setTotal(parseFloat((newBase + newTax - newRet).toFixed(2)));
  };

  const handleTaxRateChange = (newRate: number) => {
    setTaxRate(newRate);
    const newTax = parseFloat(((baseAmount * newRate) / 100).toFixed(2));
    setTaxAmount(newTax);
    setTotal(parseFloat((baseAmount + newTax - retentionAmount).toFixed(2)));
  };

  const handleRetentionRateChange = (newRetRate: number) => {
    setRetentionRate(newRetRate);
    const newRet = parseFloat(((baseAmount * newRetRate) / 100).toFixed(2));
    setRetentionAmount(newRet);
    setTotal(parseFloat((baseAmount + taxAmount - newRet).toFixed(2)));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierName.trim()) {
      toast.error("Por favor, introduce el nombre o razón social del proveedor.");
      return;
    }

    if (!invoiceNumber.trim()) {
      toast.error("Por favor, introduce el número de factura del proveedor.");
      return;
    }

    if (total <= 0 && baseAmount <= 0) {
      toast.error("El importe de la factura debe ser mayor que 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clinicId,
        invoiceNumber,
        supplierName,
        supplierNif,
        concept,
        issueDate,
        dueDate,
        baseAmount,
        taxRate,
        taxAmount,
        retentionRate,
        retentionAmount,
        total,
        paymentMethod,
        status,
        category,
        fileUrl,
        notes,
        registerInCashRegister,
      };

      const res = await fetch("/api/invoices/received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al guardar la factura");
      }

      toast.success("Factura recibida registrada correctamente en el libro contable.");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Error al guardar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(5px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: scanStep === "review" ? "1100px" : "600px",
          maxHeight: "92vh",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "max-width 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(14, 165, 233, 0.12)",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.Upload size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Subir Factura Recibida / Gasto
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Escaneo y extracción automática con Inteligencia Artificial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "22px",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {scanStep === "upload" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
              {isScanning ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      border: "4px solid rgba(14, 165, 233, 0.2)",
                      borderTopColor: "#0ea5e9",
                      borderRadius: "50%",
                      margin: "0 auto 20px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "#0f172a", fontWeight: 700 }}>
                    Analizando factura con Inteligencia Artificial...
                  </h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b", maxWidth: "380px" }}>
                    Detectando proveedor, CIF, número de factura, bases imponibles y desgloses de IVA (4%, 10%, 21%)...
                  </p>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      border: "2px dashed #cbd5e1",
                      borderRadius: "14px",
                      padding: "40px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      backgroundColor: "#f8fafc",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0ea5e9";
                      e.currentTarget.style.backgroundColor = "rgba(14, 165, 233, 0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "#e0f2fe",
                        color: "#0284c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}
                    >
                      <Icons.Upload size={28} />
                    </div>
                    <h4 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a", fontWeight: 600 }}>
                      Arrastra tu factura aquí o haz clic para seleccionarla
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      Archivos soportados: <strong>PDF, JPG, PNG</strong> (Máx. 20 MB)
                    </p>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>✨</span>
                    <div style={{ fontSize: "12px", color: "#166534" }}>
                      <strong>Extracción automática con IA:</strong> Nuestro sistema analiza el documento, localiza los datos del proveedor, número de factura, fechas y desglosa los impuestos automáticamente. Podrás revisar todo antes de guardar.
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* STEP 2: DUAL SPLIT-VIEW (DOCUMENT PREVIEW + REVIEW FORM) */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.25fr",
                gap: "24px",
                height: "100%",
              }}
            >
              {/* LEFT: DOCUMENT VIEWER */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                    DOCUMENTO ADJUNTO
                  </span>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "12px",
                        color: "#0284c7",
                        textDecoration: "none",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Icons.Eye size={14} /> Abrir en pantalla completa
                    </a>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    minHeight: "450px",
                    maxHeight: "550px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {fileUrl && file?.type === "application/pdf" ? (
                    <iframe
                      src={fileUrl}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      title="Vista previa de factura"
                    />
                  ) : fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl}
                      alt="Factura"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "13px" }}>Sin vista previa</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScanStep("upload");
                    setFile(null);
                    setFileUrl(null);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: "#64748b",
                    cursor: "pointer",
                    alignSelf: "center",
                  }}
                >
                  Cambiar archivo
                </button>
              </div>

              {/* RIGHT: REVIEW & EDIT FORM */}
              <form onSubmit={handleSaveInvoice} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {aiEnabled ? (
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#166534",
                    }}
                  >
                    <span>✨ Datos rellenados automáticamente con IA</span>
                    {confidence && (
                      <span style={{ fontWeight: 600 }}>Confianza: {Math.round(confidence * 100)}%</span>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      color: "#92400e",
                    }}
                  >
                    ℹ️ Modo asistido. Verifica y completa los campos fiscales antes de guardar.
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Proveedor / Emisor *
                    </label>
                    <input
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Ej. Depósito Dental SL"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      CIF / NIF Proveedor
                    </label>
                    <input
                      type="text"
                      value={supplierNif}
                      onChange={(e) => setSupplierNif(e.target.value.toUpperCase())}
                      placeholder="Ej. B12345678"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Nº de Factura *
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. F2026-0891"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Fecha Emisión *
                    </label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Vencimiento
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Concepto / Descripción
                    </label>
                    <input
                      type="text"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      placeholder="Ej. Implantes dentales y material desechable"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Categoría del Gasto
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="MATERIAL_CLINICO">Material Clínico / Sanitario</option>
                      <option value="LABORATORIO">Laboratorio / Prótesis</option>
                      <option value="SUMINISTROS">Suministros (Luz, Agua, Internet)</option>
                      <option value="ALQUILER">Alquiler de Instalaciones</option>
                      <option value="SERVICIOS_PROFESIONALES">Servicios Profesionales / Asesoría</option>
                      <option value="OTROS">Otros Gastos Generales</option>
                    </select>
                  </div>
                </div>

                {/* DESGLOSE FISCAL */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Desglose Fiscal (AEAT)
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                        Base Imponible (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={baseAmount || ""}
                        onChange={(e) => handleBaseChange(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                        Tipo IVA (%)
                      </label>
                      <select
                        value={taxRate}
                        onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value={21}>21% (General)</option>
                        <option value={10}>10% (Reducido)</option>
                        <option value={4}>4% (Superreducido)</option>
                        <option value={0}>0% (Exento)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                        Cuota IVA (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={taxAmount || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setTaxAmount(val);
                          setTotal(parseFloat((baseAmount + val - retentionAmount).toFixed(2)));
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                        Retención IRPF (%)
                      </label>
                      <select
                        value={retentionRate}
                        onChange={(e) => handleRetentionRateChange(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value={0}>0% (Sin retención)</option>
                        <option value={7}>7% (Nuevos autónomos)</option>
                        <option value={15}>15% (Profesionales)</option>
                        <option value={19}>19% (Alquileres)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                        Total Factura a Pagar (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={total || ""}
                        onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderRadius: "6px",
                          border: "2px solid #0ea5e9",
                          backgroundColor: "#f0f9ff",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Método de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="TRANSFER">Transferencia Bancaria</option>
                      <option value="CARD">Tarjeta de Débito/Crédito</option>
                      <option value="DIRECT_DEBIT">Domiciliación Bancaria (Recibo)</option>
                      <option value="CASH">Efectivo</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                      Estado del Pago
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="PAGADO">Pagado (Abonada)</option>
                      <option value="PENDIENTE">Pendiente de Pago</option>
                    </select>
                  </div>
                </div>

                {paymentMethod === "CASH" && status === "PAGADO" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={registerInCashRegister}
                      onChange={(e) => setRegisterInCashRegister(e.target.checked)}
                    />
                    <span>Registrar salida de efectivo en el Arqueo / Libro Diario de Caja</span>
                  </label>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: "8px 20px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#0ea5e9",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 4px rgba(14, 165, 233, 0.3)",
                    }}
                  >
                    <Icons.Check size={16} />
                    <span>{isSubmitting ? "Guardando..." : "Guardar Factura Recibida"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
