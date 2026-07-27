"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface VerificationData {
  valid: boolean;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string;
    dniNif?: string;
    membershipDate: string;
  };
  clinic?: {
    id: string;
    name: string;
    logo?: string;
    address?: string;
    phone?: string;
  };
  template?: any;
  error?: string;
}

function CardVerifierContent() {
  const searchParams = useSearchParams();
  const memberCode = searchParams?.get("member") || searchParams?.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    if (!memberCode) {
      setLoading(false);
      return;
    }

    fetch(`/api/verify/card?member=${encodeURIComponent(memberCode)}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error("Error fetching verification:", err);
        setData({ valid: false, error: "Error de conexión" });
      })
      .finally(() => setLoading(false));
  }, [memberCode]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
          Verificando autenticidad de la tarjeta...
        </h2>
      </div>
    );
  }

  if (!memberCode || !data || !data.valid || !data.member) {
    return (
      <div style={{ maxWidth: "500px", margin: "60px auto", padding: "30px 24px", background: "#0f172a", borderRadius: "24px", border: "1px solid #1e293b", textAlign: "center", color: "#ffffff" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#f87171", margin: "0 0 10px 0" }}>
          Tarjeta No Encontrada o Inválida
        </h2>
        <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 20px 0" }}>
          El código de socio especificado ({memberCode || "No indicado"}) no corresponde a un socio activo registrado en la plataforma oficial Llumsync.
        </p>
        <a
          href="https://llumsync.com"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#3b82f6",
            color: "#ffffff",
            borderRadius: "12px",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Volver a Llumsync
        </a>
      </div>
    );
  }

  const { member, clinic, template } = data;
  const activeTpl = template || {
    bgType: "gradient",
    bgColor1: "#0f172a",
    bgColor2: "#1e293b",
    gradientAngle: 135,
    borderRadius: 18,
    elements: [],
  };

  const formattedDate = member.membershipDate
    ? new Date(member.membershipDate).toLocaleDateString("es-ES")
    : "2026";

  const replaceText = (rawText?: string) => {
    if (!rawText) return "";
    const cName = clinic?.name || "Clínica Centro";
    const fullName = `${member.firstName} ${member.lastName}`.trim();
    const mNum = member.memberNumber || "M00001";
    const dni = member.dniNif || "-";

    return rawText
      .replace(/https?:\/\/[^\/]+\/verify\/card\?member=/g, "")
      .replace(/\{\{Nombre de Cliente\}\}/g, fullName)
      .replace(/\{\{Numero de socio\}\}/g, mNum)
      .replace(/\{\{DNI\}\}/g, dni)
      .replace(/\{\{Fecha Alta\}\}/g, formattedDate)
      .replace(/\{\{Nombre Clinica\}\}/g, cName);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 20px 60px 20px", color: "#ffffff", fontFamily: "'Inter', sans-serif" }}>
      {/* Official Security Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "16px" }}>
          L
        </div>
        <span style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.5px" }}>llumsync.com</span>
      </div>

      {/* Official Verified Badge */}
      <div
        style={{
          background: "rgba(34, 197, 94, 0.12)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "16px",
          padding: "16px 20px",
          textAlign: "center",
          marginBottom: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "24px" }}>🛡️</span>
        <div>
          <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#4ade80" }}>
            TARJETA DE SOCIO OFICIAL VERIFICADA
          </h1>
          <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
            Documento digital auténtico expedido por {clinic?.name || "Clínica Oficial"}
          </span>
        </div>
      </div>

      {/* Render Canva Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "537px",
          height: "338px",
          margin: "0 auto 30px auto",
          position: "relative",
          borderRadius: `${activeTpl.borderRadius || 18}px`,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
          userSelect: "none",
          background:
            activeTpl.bgType === "solid"
              ? activeTpl.bgColor1 || "#0f172a"
              : activeTpl.bgType === "image" && activeTpl.bgImage
              ? `url("${activeTpl.bgImage}") center/cover no-repeat`
              : `linear-gradient(${activeTpl.gradientAngle || 135}deg, ${
                  activeTpl.bgColor1 || "#0f172a"
                } 0%, ${activeTpl.bgColor2 || "#1e293b"} 100%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {activeTpl.elements.map((el: any) => (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              zIndex: el.zIndex,
              opacity: el.opacity ?? 1,
            }}
          >
            {el.type === "text" ? (
              <div
                style={{
                  fontSize: `${el.fontSize || 16}px`,
                  fontFamily: el.fontFamily || "Inter",
                  color: el.color || "#ffffff",
                  fontWeight: el.fontWeight || "normal",
                  fontStyle: el.fontStyle || "normal",
                  textDecoration: el.textDecoration || "none",
                  textTransform: el.textTransform || "none",
                  textAlign: el.textAlign || "left",
                  whiteSpace: "nowrap",
                }}
              >
                {replaceText(el.content)}
              </div>
            ) : el.type === "image" ? (
              <img
                src={replaceText(el.content)}
                alt="Logo"
                style={{
                  width: `${el.width || 120}px`,
                  height: `${el.height || 120}px`,
                  objectFit: "contain",
                  borderRadius: `${el.borderRadius || 0}px`,
                  display: "block",
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Member Details Summary Box */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "20px", padding: "20px 24px", marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Detalles del Socio</span>
          <span style={{ fontSize: "12px", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>
            🟢 ESTADO: ACTIVO
          </span>
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "2px" }}>NOMBRE DEL SOCIO</span>
            <span style={{ fontWeight: 800, color: "#f8fafc" }}>{member.firstName} {member.lastName}</span>
          </div>

          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "2px" }}>Nº DE SOCIO</span>
            <span style={{ fontWeight: 800, color: "#38bdf8", fontFamily: "monospace" }}>{member.memberNumber}</span>
          </div>

          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "2px" }}>DNI / NIF</span>
            <span style={{ fontWeight: 700, color: "#cbd5e1" }}>{member.dniNif || "No registrado"}</span>
          </div>

          <div>
            <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "2px" }}>FECHA DE ALTA</span>
            <span style={{ fontWeight: 700, color: "#cbd5e1" }}>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Member Club Area Preview (Actividades y Eventos Exclusivos) */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          borderRadius: "20px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <span style={{ fontSize: "22px" }}>⭐</span>
          <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#c084fc" }}>
            Área Exclusiva del Club de Socios
          </h4>
        </div>
        <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
          Como miembro oficial de <strong>{clinic?.name || "nuestra clínica"}</strong>, tendrás acceso a actividades especiales, eventos VIP, promociones privadas y experiencias personalizadas.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "12px", padding: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "16px" }}>📅</span>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>Eventos & Talleres VIP</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Reserva prioritaria para socios</div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "12px", padding: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: "16px" }}>🎁</span>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>Beneficios Exclusivos</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Descuentos y atenciones especiales</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardVerifierPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "80px", color: "#ffffff" }}>Cargando...</div>}>
      <CardVerifierContent />
    </Suspense>
  );
}
