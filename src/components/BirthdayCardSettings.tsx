"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ToastContainer";

interface BirthdayCardSettingsProps {
  clinic: any;
  onSaveSuccess?: (updatedClinic: any) => void;
  onTestCron?: () => void;
  runningCronSimulation?: boolean;
}

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawSparkleStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const BirthdayCardSettings: React.FC<BirthdayCardSettingsProps> = ({
  clinic,
  onSaveSuccess,
  onTestCron,
  runningCronSimulation = false,
}) => {
  const [enabled, setEnabled] = useState<boolean>(clinic?.birthdayEnabled ?? true);
  const [discount, setDiscount] = useState<number>(clinic?.birthdayDiscount ?? 15);
  const [customDiscount, setCustomDiscount] = useState<string>("");
  const [message, setMessage] = useState<string>(
    clinic?.birthdayMessage ||
      "🎉 ¡Feliz Cumpleaños, {{Cliente:Nombre}}! 🎂 De parte de todo el equipo de {{Nombre_Consulta}}, te deseamos un excelente día. ¡Queremos regalarte un {{Descuento}} de descuento en tu próximo tratamiento! 🎁"
  );
  const [cardTheme, setCardTheme] = useState<string>(clinic?.birthdayCardTheme || "GOLD");
  const [useCustomImage, setUseCustomImage] = useState<boolean>(
    Boolean(clinic?.birthdayImageUrl && !clinic.birthdayImageUrl.startsWith("data:image/png;base64,bday_generated"))
  );
  const [customImageUrl, setCustomImageUrl] = useState<string>(clinic?.birthdayImageUrl || "");
  const [previewClientName, setPreviewClientName] = useState<string>("Fernando Montilla");
  const [saving, setSaving] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string>("");

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when active clinic changes
  useEffect(() => {
    if (clinic) {
      setEnabled(clinic.birthdayEnabled ?? true);
      setDiscount(clinic.birthdayDiscount ?? 15);
      setMessage(
        clinic.birthdayMessage ||
          "🎉 ¡Feliz Cumpleaños, {{Cliente:Nombre}}! 🎂 De parte de todo el equipo de {{Nombre_Consulta}}, te deseamos un excelente día. ¡Queremos regalarte un {{Descuento}} de descuento en tu próximo tratamiento! 🎁"
      );
      setCardTheme(clinic.birthdayCardTheme || "GOLD");
      const isCustom = Boolean(clinic.birthdayImageUrl && !clinic.birthdayImageUrl.includes("bday_card_gen"));
      setUseCustomImage(isCustom);
      setCustomImageUrl(clinic.birthdayImageUrl || "");
    }
  }, [clinic]);

  const activeDiscountValue = discount === -1 ? parseInt(customDiscount || "15", 10) : discount;

  // High-End Luxury Canvas Card Generator Engine (No stars over logo or header badge!)
  const generateCardDataUrl = (
    theme: string,
    discVal: number,
    clinicName: string,
    clientName: string
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675; // 16:9 ratio
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const w = canvas.width;
    const h = canvas.height;

    // Premium Color Schemes
    let bgStart = "#090d16";
    let bgEnd = "#141c2e";
    let radialCenter = "#1c2b48";
    let goldPrimary = "#d4af37";
    let goldLight = "#fef08a";
    let goldDark = "#996515";
    let textColor = "#ffffff";
    let subTextColor = "#94a3b8";
    let cardPillBg = "rgba(15, 23, 42, 0.65)";

    if (theme === "ROSE") {
      bgStart = "#1a0515";
      bgEnd = "#380d2c";
      radialCenter = "#541443";
      goldPrimary = "#f472b6";
      goldLight = "#fbcfe8";
      goldDark = "#9d174d";
      cardPillBg = "rgba(45, 10, 36, 0.65)";
    } else if (theme === "DIAMOND") {
      bgStart = "#050b14";
      bgEnd = "#0c192e";
      radialCenter = "#162e52";
      goldPrimary = "#38bdf8";
      goldLight = "#e0f2fe";
      goldDark = "#0369a1";
      cardPillBg = "rgba(8, 24, 48, 0.65)";
    } else if (theme === "EMERALD") {
      bgStart = "#021711";
      bgEnd = "#083327";
      radialCenter = "#0e523f";
      goldPrimary = "#10b981";
      goldLight = "#a7f3d0";
      goldDark = "#047857";
      cardPillBg = "rgba(6, 44, 34, 0.65)";
    }

    // 1. Base Dark Background
    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, bgStart);
    baseGrad.addColorStop(1, bgEnd);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Soft Ambient Radial Spotlight at Center-Top
    const spotlight = ctx.createRadialGradient(w / 2, h * 0.35, 30, w / 2, h * 0.4, w * 0.75);
    spotlight.addColorStop(0, radialCenter);
    spotlight.addColorStop(1, "transparent");
    ctx.fillStyle = spotlight;
    ctx.fillRect(0, 0, w, h);

    // 3. Floating Sparkle Stars (Placing stars ONLY in open background areas - NO OVERLAP ON HEADER LOGO OR BADGE!)
    drawSparkleStar(ctx, 80, 240, 11, goldPrimary);
    drawSparkleStar(ctx, w - 80, 240, 11, goldPrimary);
    drawSparkleStar(ctx, 160, h - 130, 13, goldLight);
    drawSparkleStar(ctx, w - 160, h - 130, 13, goldLight);

    // 4. Double Outer Luxury Border Frame with Soft Metallic Glow
    ctx.save();
    ctx.shadowColor = goldPrimary;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = goldPrimary;
    drawRoundRect(ctx, 36, 36, w - 72, h - 72, 22);
    ctx.stroke();
    ctx.restore();

    // Inner fine border line
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    drawRoundRect(ctx, 48, 48, w - 96, h - 96, 16);
    ctx.stroke();

    // 5. Header Section (Clinic Name & VIP Pill Badge) - NO STARS OVERLAP
    // Left: Clinic Name Text
    ctx.fillStyle = goldLight;
    ctx.font = "600 24px sans-serif";
    ctx.textAlign = "left";
    const formattedClinicName = (clinicName || "CLIFAV").toUpperCase();
    ctx.fillText(formattedClinicName, 84, 95);

    // Right: VIP Badge Pill (No stars inside or over!)
    const pillW = 210;
    const pillH = 36;
    const pillX = w - 84 - pillW;
    const pillY = 70;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 18);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = goldPrimary;
    ctx.stroke();

    ctx.fillStyle = goldLight;
    ctx.font = "600 12.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PASES & REGALOS VIP", pillX + pillW / 2, pillY + 23);

    // Divider Line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(84, 122);
    ctx.lineTo(w - 84, 122);
    ctx.stroke();

    // 6. Main Greeting Section
    ctx.textAlign = "center";
    
    // Main Headline: ¡FELIZ CUMPLEAÑOS!
    ctx.save();
    ctx.shadowColor = goldPrimary;
    ctx.shadowBlur = 10;
    ctx.fillStyle = textColor;
    ctx.font = "700 44px sans-serif";
    ctx.fillText("¡ FELIZ CUMPLEAÑOS !", w / 2, 195);
    ctx.restore();

    // Client Name
    ctx.fillStyle = goldLight;
    ctx.font = "italic 32px Georgia, serif, sans-serif";
    ctx.fillText(clientName || "Estimado/a Paciente", w / 2, 246);

    // 7. Glassmorphic Hero Discount Badge (Container width 860px, height 170px, rounded radius 24px)
    const cardW = 860;
    const cardH = 170;
    const cardX = (w - cardW) / 2;
    const cardY = 295;

    // Glass Background Fill
    ctx.fillStyle = cardPillBg;
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();

    // Subtle Metallic Gradient Border around Badge
    const badgeBorderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    badgeBorderGrad.addColorStop(0, goldPrimary);
    badgeBorderGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
    badgeBorderGrad.addColorStop(1, goldDark);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = badgeBorderGrad;
    ctx.stroke();

    // Content inside Badge:
    // Top Badge Label: REGALO EXCLUSIVO CUMPLEAÑOS
    ctx.fillStyle = goldLight;
    ctx.font = "600 14px sans-serif";
    ctx.fillText("REGALO EXCLUSIVO CUMPLEAÑOS", w / 2, cardY + 40);

    // Main Value: e.g. 15% DE DESCUENTO (Dynamic font scaling so it NEVER overflows!)
    const discountText = `${discVal}% DE DESCUENTO`;
    let fontSize = 52;
    ctx.font = `800 ${fontSize}px sans-serif`;
    let textWidth = ctx.measureText(discountText).width;
    
    // Scale font size down if width exceeds 760px
    while (textWidth > 760 && fontSize > 28) {
      fontSize -= 2;
      ctx.font = `800 ${fontSize}px sans-serif`;
      textWidth = ctx.measureText(discountText).width;
    }

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = goldPrimary;
    ctx.fillText(discountText, w / 2, cardY + 102);
    ctx.restore();

    // Sub-label inside Badge
    ctx.fillStyle = textColor;
    ctx.font = "500 18px sans-serif";
    ctx.fillText("En tu próximo servicio o tratamiento", w / 2, cardY + 142);

    // 8. Footer Section
    ctx.fillStyle = subTextColor;
    ctx.font = "16px sans-serif";
    ctx.fillText("Presenta este pase digital en recepción al solicitar tu cita.", w / 2, 530);

    ctx.fillStyle = goldLight;
    ctx.font = "600 14.5px sans-serif";
    ctx.fillText("VÁLIDO EN TU MES DE CUMPLEAÑOS  •  CÓDIGO: VIP-BDAY-2026", w / 2, 566);

    return canvas.toDataURL("image/png");
  };

  // Re-generate live preview image whenever options change
  useEffect(() => {
    if (!useCustomImage) {
      const cName = clinic?.name || "Clifav Centro Médico";
      const generatedUrl = generateCardDataUrl(cardTheme, activeDiscountValue, cName, previewClientName);
      setCardPreviewUrl(generatedUrl);
    } else {
      setCardPreviewUrl(customImageUrl);
    }
  }, [cardTheme, activeDiscountValue, clinic?.name, previewClientName, useCustomImage, customImageUrl]);

  const handleInsertVariable = (v: string) => {
    setMessage((prev) => `${prev} ${v}`);
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setCustomImageUrl(dataUrl);
        setUseCustomImage(true);
        toast.success("Imagen de tarjeta personalizada cargada.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    if (!clinic?.id) {
      toast.error("No se ha seleccionado ninguna clínica activa.");
      return;
    }

    setSaving(true);

    try {
      let finalImageUrl = customImageUrl;
      if (!useCustomImage) {
        const cName = clinic?.name || "Clifav Centro Médico";
        finalImageUrl = generateCardDataUrl(cardTheme, activeDiscountValue, cName, "Paciente");
      }

      const payload = {
        birthdayEnabled: enabled,
        birthdayMessage: message,
        birthdayDiscount: activeDiscountValue,
        birthdayImageUrl: finalImageUrl,
        birthdayCardTheme: cardTheme,
      };

      const res = await fetch(`/api/clinics/${clinic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedClinic = await res.json();
        toast.success("Configuración y Tarjeta de Cumpleaños guardadas con éxito.");
        if (onSaveSuccess) onSaveSuccess(updatedClinic);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Error al guardar los ajustes de cumpleaños.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // Direct Test WhatsApp message dispatch to Fernando Montilla
  const handleSendTestToFernando = async () => {
    if (!clinic?.id) return;
    setSendingTest(true);
    try {
      const cName = clinic?.name || "Oliva";
      let cardImg = customImageUrl;
      if (!useCustomImage || !cardImg) {
        cardImg = generateCardDataUrl(cardTheme, activeDiscountValue, cName, "Fernando Montilla");
      }

      const formattedMsg = message
        .replaceAll("{{Cliente:Nombre}}", "Fernando")
        .replaceAll("{{Cliente:Apellidos}}", "Montilla")
        .replaceAll("{{Nombre_Consulta}}", cName)
        .replaceAll("{{Descuento}}%", `${activeDiscountValue}%`)
        .replaceAll("{{Descuento}}", `${activeDiscountValue}%`)
        .replaceAll("{{Dirección_Consulta}}", clinic?.address || "");

      const res = await fetch("/api/notifications/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: clinic.id,
          testPhone: "634021915",
          testClientName: "Fernando Montilla",
          testMessage: formattedMsg,
          testImage: cardImg
        }),
      });

      if (res.ok) {
        toast.success("📱 ¡Prueba de felicitación enviada por WhatsApp a Fernando Montilla (634021915)!");
      } else {
        toast.error("Error al enviar la prueba por WhatsApp.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de conexión al enviar la prueba.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner - Refined Subtle Typography */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 22px",
          background: "var(--bg-panel-solid)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              🎉 Felicitaciones de Cumpleaños y Tarjeta de Socio
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "10px",
                background: "rgba(190, 24, 93, 0.12)",
                color: "#be185d",
              }}
            >
              AUTOMÁTICO 24/7
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            Configura la plantilla de mensaje y la Tarjeta Digital con descuento enviada por WhatsApp/Email el día de su cumpleaños.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 500, fontSize: "13px" }}>
            <span>Avisos Activos</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "#be185d", cursor: "pointer" }}
            />
          </label>

          <button
            type="button"
            onClick={handleSendTestToFernando}
            disabled={sendingTest}
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "7px 14px", whiteSpace: "nowrap", fontWeight: 500 }}
          >
            📱 {sendingTest ? "Enviando..." : "Enviar Prueba a Fernando Montilla"}
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn btn-primary"
            style={{
              fontSize: "12.5px",
              padding: "7px 18px",
              background: "linear-gradient(135deg, #be185d 0%, #8b5cf6 100%)",
              border: "none",
              fontWeight: 600,
            }}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* Main Grid Editor */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "24px" }}>
        {/* Left Column: Form Controls (Refined Subtle Fonts & Buttons) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Descuento ofrecido */}
          <div style={{ background: "var(--bg-panel-solid)", padding: "18px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "13.5px", marginBottom: "10px", color: "var(--text-primary)" }}>
              🎁 Porcentaje de Descuento Regalo:
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              {[10, 15, 20, 25, 30, 50].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDiscount(d);
                    setCustomDiscount("");
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px solid " + (discount === d ? "#be185d" : "var(--border-color)"),
                    background: discount === d ? "rgba(190, 24, 93, 0.08)" : "var(--bg-input)",
                    color: discount === d ? "#be185d" : "var(--text-primary)",
                    fontWeight: discount === d ? 600 : 500,
                    fontSize: "12.5px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {d}% DESCUENTO
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDiscount(-1)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid " + (discount === -1 ? "#be185d" : "var(--border-color)"),
                  background: discount === -1 ? "rgba(190, 24, 93, 0.08)" : "var(--bg-input)",
                  color: discount === -1 ? "#be185d" : "var(--text-primary)",
                  fontWeight: discount === -1 ? 600 : 500,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                Otro %
              </button>
            </div>

            {discount === -1 && (
              <div style={{ marginTop: "8px" }}>
                <input
                  type="number"
                  className="input"
                  placeholder="Introduce el % personalizado (ej: 40)"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                  style={{ width: "100%", fontSize: "12.5px" }}
                />
              </div>
            )}
          </div>

          {/* Mensaje de Felicitación con Variables */}
          <div style={{ background: "var(--bg-panel-solid)", padding: "18px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-primary)" }}>
                💬 Mensaje de Felicitación (WhatsApp / Email):
              </label>
            </div>

            {/* Chips de Variables */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", alignSelf: "center", marginRight: "2px" }}>
                Insertar:
              </span>
              {[
                { tag: "{{Cliente:Nombre}}", label: "Nombre" },
                { tag: "{{Cliente:Apellidos}}", label: "Apellidos" },
                { tag: "{{Nombre_Consulta}}", label: "Clínica" },
                { tag: "{{Descuento}}", label: "Descuento" },
                { tag: "{{Dirección_Consulta}}", label: "Dirección" },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleInsertVariable(item.tag)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-color)",
                    fontSize: "11.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    color: "var(--primary)",
                  }}
                >
                  + {item.label}
                </button>
              ))}
            </div>

            <textarea
              rows={5}
              className="input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe aquí la plantilla de felicitación..."
              style={{ width: "100%", fontSize: "13px", resize: "vertical", lineHeight: "1.5" }}
            />
          </div>

          {/* Selector de Diseño de Tarjeta de Socio */}
          <div style={{ background: "var(--bg-panel-solid)", padding: "18px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "13.5px", marginBottom: "10px", color: "var(--text-primary)" }}>
              🎨 Tema Visual de la Tarjeta Digital:
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              {[
                { id: "GOLD", name: "🏆 Oro Deluxe", desc: "Obsidiana & Oro Líquido" },
                { id: "ROSE", name: "🌸 Rosa VIP", desc: "Borgoña Elegante & Rosa Gold" },
                { id: "DIAMOND", name: "💎 Diamante", desc: "Platino & Zafiro Oscuro" },
                { id: "EMERALD", name: "🌿 Esmeralda", desc: "Verde Esmeralda & Dorado" },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setCardTheme(t.id);
                    setUseCustomImage(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid " + (!useCustomImage && cardTheme === t.id ? "#be185d" : "var(--border-color)"),
                    background: !useCustomImage && cardTheme === t.id ? "rgba(190, 24, 93, 0.05)" : "var(--bg-input)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "12.5px", color: "var(--text-primary)" }}>{t.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{t.desc}</div>
                </div>
              ))}
            </div>

            {/* Upload Custom Card Image Option */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={useCustomImage}
                  onChange={(e) => setUseCustomImage(e.target.checked)}
                />
                Subir diseño propio de tarjeta / flyer promocional
              </label>

              {useCustomImage && (
                <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ fontSize: "11.5px", padding: "5px 12px", fontWeight: 500 }}
                  >
                    📁 Seleccionar Archivo de Imagen
                  </button>
                  {customImageUrl && (
                    <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 500 }}>
                      ✓ Imagen propia cargada
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Vista Previa Tarjeta de Socio VIP */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "var(--bg-panel-solid)",
              padding: "18px",
              borderRadius: "14px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👁️</span> Vista Previa Tarjeta de Socio Digital
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Ver con paciente:</span>
                <input
                  type="text"
                  className="input"
                  value={previewClientName}
                  onChange={(e) => setPreviewClientName(e.target.value)}
                  placeholder="Nombre de prueba"
                  style={{ width: "130px", fontSize: "11.5px", padding: "4px 8px" }}
                />
              </div>
            </div>

            {/* Realtime Live Image Card Rendering */}
            <div
              style={{
                width: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                border: "1px solid var(--border-color)",
                background: "#000000",
              }}
            >
              {cardPreviewUrl ? (
                <img
                  src={cardPreviewUrl}
                  alt="Tarjeta de Socio Cumpleaños"
                  style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
                />
              ) : (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                  Generando tarjeta de regalo...
                </div>
              )}
            </div>

            {/* Message simulation box */}
            <div
              style={{
                marginTop: "14px",
                padding: "12px 14px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                fontSize: "12.5px",
                color: "var(--text-primary)",
                lineHeight: "1.5",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                📱 TEXTO ADJUNTO EN WHATSAPP:
              </div>
              {message
                .replaceAll("{{Cliente:Nombre}}", previewClientName.split(" ")[0] || "Fernando")
                .replaceAll("{{Cliente:Apellidos}}", previewClientName.split(" ").slice(1).join(" ") || "Montilla")
                .replaceAll("{{Nombre_Consulta}}", clinic?.name || "Clifav Centro Médico")
                .replaceAll("{{Descuento}}%", `${activeDiscountValue}%`)
                .replaceAll("{{Descuento}}", `${activeDiscountValue}%`)
                .replaceAll("{{Dirección_Consulta}}", clinic?.address || "Calle Mayor 10")
                .split("\n")
                .map((line, idx) => (
                  <p key={idx} style={{ margin: "0 0 4px" }}>
                    {line}
                  </p>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
