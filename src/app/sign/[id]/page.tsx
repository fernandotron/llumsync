"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function PatientSignaturePage() {
  const { id } = useParams();
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSignedSuccessfully, setIsSignedSuccessfully] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // PIN validation states
  const [pinInput, setPinInput] = useState("");
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc) return;
    if (pinInput.trim() === doc.pin) {
      setIsPinVerified(true);
      setPinError("");
    } else {
      setPinError("El PIN introducido es incorrecto. Por favor, verifícalo.");
    }
  };

  // Drawing Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/documents/signed/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("El documento no existe o ha sido eliminado");
        return res.json();
      })
      .then((data) => {
        setDoc(data);
        if (data.signature) {
          setIsSignedSuccessfully(true);
        }
        // If there's no PIN saved, verify automatically
        if (!data.pin) {
          setIsPinVerified(true);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Canvas drawing handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high resolution display support
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a8a"; // Dark blue signature ink

    // Fill white background so transparent canvas doesn't save black background on some devices
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, [loading, isSignedSuccessfully]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Support touch events
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    // Support mouse events
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;

    if (!acceptedTerms) {
      alert("Por favor, acepta los términos de LOPD y RGPD para poder firmar.");
      return;
    }

    setSubmitting(true);
    const signatureBase64 = canvas.toDataURL("image/png");

    try {
      const res = await fetch(`/api/documents/signed/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signatureBase64 }),
      });

      if (res.ok) {
        setIsSignedSuccessfully(true);
      } else {
        const errData = await res.json();
        alert(errData.error || "Error al registrar la firma");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al registrar la firma");
    } finally {
      setSubmitting(false);
    }
  };

  // Styling rules inline for maximum robustness and aesthetic impact
  const containerStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
    padding: "24px 16px",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)",
    width: "100%",
    maxWidth: "640px",
    padding: "32px 24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 800,
    color: "#1e3a8a",
    margin: 0,
    textAlign: "center",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 8px 0",
  };

  const docContentBoxStyle: React.CSSProperties = {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "20px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#374151",
    maxHeight: "300px",
    overflowY: "auto",
  };

  const canvasContainerStyle: React.CSSProperties = {
    border: "2px dashed #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    overflow: "hidden",
    touchAction: "none",
  };

  const canvasStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    height: "180px",
    cursor: "crosshair",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: "16px", color: "#4b5563" }}>Cargando documento de firma...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>⚠️</div>
          <h2 style={{ fontSize: "18px", color: "#ef4444", margin: "0 0 12px" }}>Error al cargar</h2>
          <p style={{ margin: 0, color: "#6b7280" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (isSignedSuccessfully) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ fontSize: "60px", color: "#10b981", margin: "16px 0 8px" }}>✓</div>
          <h2 style={{ fontSize: "22px", color: "#1e3a8a", margin: "0 0 8px" }}>Documento Firmado</h2>
          <p style={{ color: "#4b5563", fontSize: "14px", margin: "0 0 24px" }}>
            El consentimiento clínico de <strong>{doc?.client?.firstName} {doc?.client?.lastName || ""}</strong> ha sido registrado correctamente bajo la normativa de LOPD/RGPD.
          </p>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Puedes cerrar esta pestaña de forma segura.
          </div>
        </div>
      </div>
    );
  }

  if (doc && !isPinVerified) {
    return (
      <div style={containerStyle}>
        <form onSubmit={handleVerifyPin} style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>🔒</div>
            <h1 style={titleStyle}>Documento Protegido</h1>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
              Por seguridad, introduce el PIN de 4 dígitos recibido para leer y firmar el documento.
            </p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#4b5563" }}>PIN DE SEGURIDAD</label>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Introduce el PIN"
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: pinError ? "2px solid #ef4444" : "1px solid #cbd5e1",
                fontSize: "18px",
                textAlign: "center",
                letterSpacing: "4px",
                fontWeight: "bold",
                outline: "none",
              }}
            />
            {pinError && (
              <span style={{ fontSize: "12px", color: "#ef4444", textAlign: "center", marginTop: "4px" }}>
                {pinError}
              </span>
            )}
          </div>

          <button
            type="submit"
            style={{
              padding: "12px",
              background: "#2563eb",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
              marginTop: "12px"
            }}
          >
            Aceptar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center" }}>
          <h1 style={titleStyle}>Firma Digital de Documento</h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
            Clifav Consentimiento LOPD & RGPD Integrado
          </p>
        </div>

        <div>
          <h3 style={sectionTitleStyle}>1. Contenido del Documento</h3>
          <div 
            style={docContentBoxStyle} 
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </div>

        {/* LOPD/RGPD Notice Box */}
        <div style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "14px 18px",
          fontSize: "12px",
          color: "#1e40af",
          lineHeight: "1.5"
        }}>
          <strong>Información sobre protección de datos (RGPD / LOPDGDD):</strong> Los datos y firmas recogidos en este documento se utilizarán exclusivamente para los fines especificados en el consentimiento informado y el historial médico del paciente.
        </div>

        <div>
          <h3 style={sectionTitleStyle}>2. Dibuja tu firma</h3>
          <div style={canvasContainerStyle}>
            <canvas
              ref={canvasRef}
              style={canvasStyle}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        {/* Accept terms check */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            style={{ marginTop: "3px" }}
          />
          <span style={{ fontSize: "12px", color: "#374151", lineHeight: "1.4" }}>
            He leído detenidamente el documento clínico y acepto expresamente el consentimiento informado y el tratamiento de mis datos de salud bajo la política LOPD/RGPD.
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={clearCanvas}
            style={{
              padding: "10px 20px",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              cursor: "pointer"
            }}
          >
            Limpiar Panel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveSignature}
            style={{
              padding: "10px 24px",
              background: "#2563eb",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#ffffff",
              cursor: submitting ? "not-allowed" : "pointer"
            }}
          >
            {submitting ? "Procesando..." : "Confirmar y Firmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
