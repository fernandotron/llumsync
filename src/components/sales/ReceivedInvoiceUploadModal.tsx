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

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
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
          toast.info("Documento subido. Verifica y completa los datos antes de guardar.");
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
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
          maxWidth: scanStep === "review" ? "1060px" : "560px",
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "max-width 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                backgroundColor: "rgba(15, 118, 110, 0.1)",
                color: "#0f766e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.Upload size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                {scanStep === "upload" ? "Subir Factura de Proveedor / Gasto" : "Revisión y Registro de Factura"}
              </h3>
              <p style={{ margin: "1px 0 0", fontSize: "12px", color: "#64748b" }}>
                {scanStep === "upload"
                  ? "Escaneo automático con Inteligencia Artificial"
                  : "Verifica los datos fiscales antes de guardar en el libro contable"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              border: "1px solid #e2e8f0",
              background: "transparent",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
              e.currentTarget.style.color = "#0f172a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <Icons.Plus size={16} style={{ transform: "rotate(45deg)" }} />
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {scanStep === "upload" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {isScanning ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      border: "3px solid rgba(15, 118, 110, 0.2)",
                      borderTopColor: "#0f766e",
                      borderRadius: "50%",
                      margin: "0 auto 18px",
                      animation: "spin 0.9s linear infinite",
                    }}
                  />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <h4 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a", fontWeight: 700 }}>
                    Analizando factura con Inteligencia Artificial...
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", maxWidth: "360px", marginLeft: "auto", marginRight: "auto" }}>
                    Extrayendo proveedor, CIF, número de factura, fechas y desglosando bases imponibles e impuestos...
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
                      border: "2px dashed #94a3b8",
                      borderRadius: "12px",
                      padding: "36px 16px",
                      textAlign: "center",
                      cursor: "pointer",
                      backgroundColor: "#f8fafc",
                      transition: "all 0.2s ease",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0f766e";
                      e.currentTarget.style.backgroundColor = "rgba(15, 118, 110, 0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#94a3b8";
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
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(15, 118, 110, 0.1)",
                        color: "#0f766e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      <Icons.Upload size={22} />
                    </div>

                    <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>
                      Arrastra tu factura aquí o
                    </p>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        height: "32px",
                        padding: "0 14px",
                        fontSize: "12px",
                        fontWeight: 600,
                        margin: "4px 0 10px",
                        borderRadius: "8px",
                      }}
                    >
                      Seleccionar archivo
                    </button>

                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                      Formatos compatibles: <strong>PDF, JPG, PNG</strong> • Máx. 20 MB
                    </p>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(15, 118, 110, 0.05)",
                      border: "1px solid rgba(15, 118, 110, 0.16)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>⚡</span>
                    <span style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                      <strong>Extracción automática con IA:</strong> Se extraerán automáticamente el proveedor, CIF/NIF, número de factura, fechas y desgloses de IVA (4%, 10%, 21%) para tu confirmación.
                    </span>
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
                gap: "20px",
                height: "100%",
              }}
            >
              {/* LEFT: DOCUMENT VIEWER */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    DOCUMENTO ADJUNTO
                  </span>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "11px",
                        color: "#0f766e",
                        textDecoration: "none",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Icons.Eye size={13} /> Pantalla completa
                    </a>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    minHeight: "440px",
                    maxHeight: "520px",
                    borderRadius: "6px",
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
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>Sin vista previa</div>
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
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontSize: "11px",
                    color: "#64748b",
                    cursor: "pointer",
                    alignSelf: "center",
                  }}
                >
                  Cambiar archivo
                </button>
              </div>

              {/* RIGHT: REVIEW & EDIT FORM */}
              <form onSubmit={handleSaveInvoice} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {aiEnabled ? (
                  <div
                    style={{
                      backgroundColor: "rgba(15, 118, 110, 0.06)",
                      border: "1px solid rgba(15, 118, 110, 0.2)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "#0f766e",
                      fontWeight: 600,
                    }}
                  >
                    <span>✓ Datos extraídos automáticamente con IA</span>
                    {confidence && (
                      <span style={{ fontWeight: 700 }}>Precisión: {Math.round(confidence * 100)}%</span>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      color: "#92400e",
                    }}
                  >
                    ℹ️ Modo asistido. Verifica los datos fiscales antes de guardar.
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
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
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      CIF / NIF Proveedor
                    </label>
                    <input
                      type="text"
                      value={supplierNif}
                      onChange={(e) => setSupplierNif(e.target.value.toUpperCase())}
                      placeholder="Ej. B12345678"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Nº Factura *
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. F2026-0891"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Fecha Emisión *
                    </label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Vencimiento
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Concepto / Detalle
                    </label>
                    <input
                      type="text"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      placeholder="Ej. Material sanitario fungible"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="MATERIAL_CLINICO">Material Clínico / Sanitario</option>
                      <option value="LABORATORIO">Laboratorio / Prótesis</option>
                      <option value="SUMINISTROS">Suministros (Luz, Agua, Red)</option>
                      <option value="ALQUILER">Alquiler de Instalaciones</option>
                      <option value="SERVICIOS_PROFESIONALES">Servicios Profesionales / Asesoría</option>
                      <option value="OTROS">Otros Gastos</option>
                    </select>
                  </div>
                </div>

                {/* DESGLOSE FISCAL */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Desglose Fiscal (AEAT)
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>
                        Base Imponible (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={baseAmount || ""}
                        onChange={(e) => handleBaseChange(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          fontSize: "12px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>
                        Tipo IVA (%)
                      </label>
                      <select
                        value={taxRate}
                        onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          fontSize: "12px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value={21}>21%</option>
                        <option value={10}>10%</option>
                        <option value={4}>4%</option>
                        <option value={0}>0%</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>
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
                          padding: "5px 8px",
                          fontSize: "12px",
                          borderRadius: "5px",
                          border: "1px solid #cbd5e1",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>
                        Retención IRPF (%)
                      </label>
                      <select
                        value={retentionRate}
                        onChange={(e) => handleRetentionRateChange(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          fontSize: "12px",
                          borderRadius: "5px",
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
                      <label style={{ display: "block", fontSize: "10px", color: "#64748b", marginBottom: "2px", fontWeight: 700 }}>
                        Total a Pagar (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={total || ""}
                        onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderRadius: "5px",
                          border: "1.5px solid #0f766e",
                          backgroundColor: "rgba(15, 118, 110, 0.05)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Método de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="TRANSFER">Transferencia Bancaria</option>
                      <option value="CARD">Tarjeta de Débito/Crédito</option>
                      <option value="DIRECT_DEBIT">Domiciliación SEPA</option>
                      <option value="CASH">Efectivo</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "3px" }}>
                      Estado del Pago
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
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
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={registerInCashRegister}
                      onChange={(e) => setRegisterInCashRegister(e.target.checked)}
                      style={{ accentColor: "#0f766e" }}
                    />
                    <span>Registrar salida de efectivo en el Arqueo / Libro Diario de Caja</span>
                  </label>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    style={{
                      height: "34px",
                      padding: "0 18px",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icons.Check size={14} />
                    <span>{isSubmitting ? "Guardando..." : "Guardar Factura Recibida"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* FOOTER (ONLY IN UPLOAD STEP) */}
        {scanStep === "upload" && !isScanning && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              backgroundColor: "#f8fafc",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ height: "32px", padding: "0 14px", fontSize: "12px" }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
