"use client";

import React, { useState } from "react";
import { toast } from "@/components/ToastContainer";
import { Icons } from "@/components/Icons";

interface ReceivedInvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
  onUpdated: () => void;
}

export const ReceivedInvoiceDetailModal: React.FC<ReceivedInvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onUpdated,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleToggleStatus = async () => {
    const newStatus = invoice.status === "PAGADO" ? "PENDIENTE" : "PAGADO";
    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/invoices/received", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Error al actualizar el estado");

      toast.success(`Factura marcada como ${newStatus === "PAGADO" ? "PAGADA" : "PENDIENTE"}`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar estado");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la factura "${invoice.invoiceNumber || invoice.refFac}" de ${invoice.supplierName || invoice.cliente}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const url = invoice.rawInvoice ? `/api/invoices/received?id=${invoice.id}` : `/api/movements?id=${invoice.id}`;
      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast.success("Factura eliminada correctamente");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la factura");
    } finally {
      setIsDeleting(false);
    }
  };

  const invNumber = invoice.invoiceNumber || invoice.refFac || "-";
  const suppName = invoice.supplierName || invoice.cliente || "-";
  const nif = invoice.supplierNif || invoice.nif || "-";
  const dateStr = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("es-ES") : (invoice.fechaCreacion || "-");
  const base = invoice.baseAmount ?? invoice.baseImponible ?? 0;
  const iva = invoice.taxAmount ?? invoice.iva ?? 0;
  const ret = invoice.retentionAmount ?? invoice.retencion ?? 0;
  const tot = invoice.total ?? 0;
  const st = invoice.status || invoice.estadoPago || "PAGADO";
  const fileUrl = invoice.fileUrl;

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
          maxWidth: fileUrl ? "1000px" : "600px",
          maxHeight: "92vh",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(14, 165, 233, 0.12)",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.FileText size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                  Factura {invNumber}
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: st === "PAGADO" ? "#dcfce7" : "#fef9c3",
                    color: st === "PAGADO" ? "#166534" : "#854d0e",
                  }}
                >
                  {st === "PAGADO" ? "PAGADO" : "PENDIENTE"}
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                {suppName} {nif !== "-" ? `• CIF: ${nif}` : ""}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: fileUrl ? "1.1fr 1fr" : "1fr",
              gap: "24px",
            }}
          >
            {/* DOCUMENT VIEWER (IF EXISTS) */}
            {fileUrl && (
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
                    DOCUMENTO ORIGINAL
                  </span>
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
                    <Icons.Download size={14} /> Abrir documento original
                  </a>
                </div>

                <div
                  style={{
                    height: "450px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <iframe
                    src={fileUrl}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    title="Vista previa del documento"
                  />
                </div>
              </div>
            )}

            {/* DETAILS BREAKDOWN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    Proveedor
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {suppName}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    CIF / NIF
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
                    {nif}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    Fecha Emisión
                  </span>
                  <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                    {dateStr}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    Método de Pago
                  </span>
                  <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                    {invoice.paymentMethod || invoice.metodoPago || "Transferencia"}
                  </div>
                </div>

                {invoice.category && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                      Categoría
                    </span>
                    <div style={{ fontSize: "13px", color: "#0284c7", fontWeight: 600, marginTop: "2px" }}>
                      {invoice.category.replace(/_/g, " ")}
                    </div>
                  </div>
                )}

                {invoice.concept && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                      Concepto / Detalle
                    </span>
                    <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                      {invoice.concept}
                    </div>
                  </div>
                )}
              </div>

              {/* FISCAL BREAKDOWN */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                  <span>Base Imponible:</span>
                  <strong style={{ color: "#0f172a" }}>{base.toFixed(2)} €</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748b" }}>
                  <span>Cuota IVA Soportado:</span>
                  <strong style={{ color: "#0f172a" }}>+{iva.toFixed(2)} €</strong>
                </div>

                {ret > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#dc2626" }}>
                    <span>Retención IRPF:</span>
                    <strong>-{ret.toFixed(2)} €</strong>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "#0f172a",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "10px",
                    marginTop: "4px",
                  }}
                >
                  <span>Total Factura:</span>
                  <span style={{ color: "#0ea5e9" }}>{tot.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #fca5a5",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icons.Trash size={14} />
            <span>{isDeleting ? "Eliminando..." : "Eliminar Factura"}</span>
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            {invoice.rawInvoice && (
              <button
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                }}
              >
                {st === "PAGADO" ? "Marcar como Pendiente" : "Marcar como Pagada"}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#0ea5e9",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
