import React, { useState, useRef, useEffect } from "react";

interface WhiteboardEditorProps {
  clientId: string;
  onSaveSuccess?: () => void;
}

// Inline SVGs for clinical templates
const templates = {
  face: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100%" height="100%"><path d="M50,10 C20,10 15,35 15,60 C15,90 25,110 50,110 C75,110 85,90 85,60 C85,35 80,10 50,10 Z" fill="none" stroke="%2394a3b8" stroke-width="0.8"/><ellipse cx="33" cy="50" rx="6" ry="3" fill="none" stroke="%23cbd5e1" stroke-width="0.6"/><ellipse cx="67" cy="50" rx="6" ry="3" fill="none" stroke="%23cbd5e1" stroke-width="0.6"/><path d="M30,42 Q33,40 36,43" fill="none" stroke="%2394a3b8" stroke-width="0.6"/><path d="M64,43 Q67,40 70,42" fill="none" stroke="%2394a3b8" stroke-width="0.6"/><path d="M50,47 L48,68 L52,68 Z" fill="none" stroke="%2394a3b8" stroke-width="0.6"/><path d="M38,82 Q50,92 62,82" fill="none" stroke="%2394a3b8" stroke-width="0.8"/><path d="M42,82 Q50,86 58,82" fill="none" stroke="%23cbd5e1" stroke-width="0.5"/><path d="M15,55 C12,55 10,60 10,65 C10,70 12,72 15,70" fill="none" stroke="%2394a3b8" stroke-width="0.6"/><path d="M85,55 C88,55 90,60 90,65 C90,70 88,72 85,70" fill="none" stroke="%2394a3b8" stroke-width="0.6"/><path d="M50,10 L50,110" fill="none" stroke="%23e2e8f0" stroke-dasharray="2 2" stroke-width="0.5"/></svg>`,
  body: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140" width="100%" height="100%"><g stroke="%2394a3b8" stroke-width="0.8" fill="none"><circle cx="45" cy="18" r="8"/><path d="M45,26 L45,65 M30,35 L60,35 M30,35 L25,60 M60,35 L65,60 M45,65 L35,100 M45,65 L55,100"/><circle cx="115" cy="18" r="8"/><path d="M115,26 L115,65 M100,35 L130,35 M100,35 L95,60 M130,35 L135,60 M115,65 L105,100 M115,65 L125,100"/></g><text x="45" y="115" fill="%2364748b" font-size="7" font-weight="bold" text-anchor="middle" font-family="sans-serif">FRENTE (FRONT)</text><text x="115" y="115" fill="%2364748b" font-size="7" font-weight="bold" text-anchor="middle" font-family="sans-serif">DORSO (BACK)</text></svg>`,
  dental: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 100" width="100%" height="100%"><path d="M20,75 C20,20 120,20 120,75" fill="none" stroke="%2394a3b8" stroke-width="1"/><g fill="none" stroke="%23cbd5e1" stroke-width="0.6"><rect x="20" y="70" width="8" height="8" rx="1"/><rect x="27" y="62" width="8" height="8" rx="1"/><rect x="35" y="52" width="9" height="9" rx="1"/><rect x="45" y="42" width="9" height="9" rx="1"/><rect x="56" y="35" width="11" height="10" rx="1"/><rect x="69" y="35" width="11" height="10" rx="1"/><rect x="82" y="42" width="9" height="9" rx="1"/><rect x="92" y="52" width="9" height="9" rx="1"/><rect x="101" y="62" width="8" height="8" rx="1"/><rect x="108" y="70" width="8" height="8" rx="1"/></g><text x="70" y="20" fill="%2364748b" font-size="7" font-weight="bold" text-anchor="middle" font-family="sans-serif">ARCADA DENTAL</text></svg>`
};

const colors = [
  { name: "Rojo", hex: "#ef4444" },
  { name: "Azul", hex: "#3b82f6" },
  { name: "Verde", hex: "#10b981" },
  { name: "Negro", hex: "#0f172a" },
  { name: "Amarillo", hex: "#eab308" }
];

const brushSizes = [2, 4, 8, 12];

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({ clientId, onSaveSuccess }) => {
  const [templateKey, setTemplateKey] = useState<"face" | "body" | "dental">("face");
  const [color, setColor] = useState<string>("#ef4444");
  const [brushSize, setBrushSize] = useState<number>(4);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Initialize canvas and load background SVG template
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset size
    canvas.width = 600;
    canvas.height = 600;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 600);

    // Draw SVG template as image
    const img = new Image();
    img.src = templates[templateKey];
    img.onload = () => {
      // Draw template centered and fitted
      const scale = Math.min(600 / img.width, 600 / img.height) * 0.9;
      const x = (600 - img.width * scale) / 2;
      const y = (600 - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Save initial state to history
      saveHistory();
    };
  };

  useEffect(() => {
    initCanvas();
  }, [templateKey]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    
    // Truncate history if we had undone states
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    historyRef.current.push(dataUrl);
    historyIndexRef.current = historyRef.current.length - 1;
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = historyRef.current[historyIndexRef.current];
    img.onload = () => {
      ctx.clearRect(0, 0, 600, 600);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleClear = () => {
    initCanvas();
  };

  // Coordinates helper
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if (e.nativeEvent instanceof TouchEvent) {
      if (e.nativeEvent.touches.length === 0) return null;
      clientX = e.nativeEvent.touches[0].clientX;
      clientY = e.nativeEvent.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "erase" ? "#ffffff" : color;

    isDrawingRef.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    saveHistory();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setSaveMessage("Subiendo anotación al historial del paciente...");

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSaving(false);
        setSaveMessage("Error: No se pudo generar la imagen del lienzo.");
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, `annotated-template-${Date.now()}.png`);
      formData.append("type", "BEFORE");
      formData.append("description", `Anotación sobre plantilla: ${templateKey.toUpperCase()}`);

      try {
        const res = await fetch(`/api/clients/${clientId}/photos`, {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          setSaveMessage("✅ ¡Anotación guardada con éxito en la ficha del paciente!");
          if (onSaveSuccess) {
            onSaveSuccess();
          }
        } else {
          const err = await res.json();
          setSaveMessage(`❌ Error al subir: ${err.error || "Error desconocido"}`);
        }
      } catch (error) {
        console.error("Save error:", error);
        setSaveMessage("❌ Error de red al intentar guardar la anotación.");
      } finally {
        setIsSaving(false);
        setTimeout(() => setSaveMessage(""), 5000);
      }
    }, "image/png");
  };

  return (
    <div style={{ display: "flex", gap: "24px", flexDirection: "row", flexWrap: "wrap", width: "100%" }}>
      {/* Sidebar Controls */}
      <div 
        style={{ 
          flex: "1", 
          minWidth: "260px", 
          display: "flex", 
          flexDirection: "column", 
          gap: "20px", 
          padding: "20px", 
          backgroundColor: "#ffffff", 
          borderRadius: "12px",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Plantilla Anatómica</h3>
        
        {/* Template Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {(["face", "body", "dental"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTemplateKey(key)}
              style={{
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: templateKey === key ? "#3b82f6" : "#cbd5e1",
                backgroundColor: templateKey === key ? "rgba(59, 130, 246, 0.08)" : "#ffffff",
                color: templateKey === key ? "#3b82f6" : "#475569",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s"
              }}
            >
              {key === "face" && "👤 Rostro (Estética/Odonto)"}
              {key === "body" && "🧍 Cuerpo Completo (Fisioterapia)"}
              {key === "dental" && "🦷 Arcada Dental"}
            </button>
          ))}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />

        {/* Color Palette */}
        <div>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#475569" }}>Color de Marcado</h4>
          <div style={{ display: "flex", gap: "8px" }}>
            {colors.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setColor(c.hex);
                  setTool("draw");
                }}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: c.hex,
                  border: color === c.hex && tool === "draw" ? "3px solid #0f172a" : "1px solid rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  transition: "all 0.15s"
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#475569" }}>Tamaño del Pincel</h4>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {brushSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: brushSize === size ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                  backgroundColor: brushSize === size ? "rgba(59, 130, 246, 0.05)" : "#ffffff",
                  color: brushSize === size ? "#3b82f6" : "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* Tools (Draw / Erase) */}
        <div>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 700, color: "#475569" }}>Herramientas</h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setTool("draw")}
              style={{
                flex: 1,
                padding: "8px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: tool === "draw" ? "#3b82f6" : "#cbd5e1",
                backgroundColor: tool === "draw" ? "rgba(59, 130, 246, 0.05)" : "#ffffff",
                color: tool === "draw" ? "#3b82f6" : "#475569",
                cursor: "pointer"
              }}
            >
              ✏️ Lápiz
            </button>
            <button
              type="button"
              onClick={() => setTool("erase")}
              style={{
                flex: 1,
                padding: "8px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: tool === "erase" ? "#3b82f6" : "#cbd5e1",
                backgroundColor: tool === "erase" ? "rgba(59, 130, 246, 0.05)" : "#ffffff",
                color: tool === "erase" ? "#3b82f6" : "#475569",
                cursor: "pointer"
              }}
            >
              🧽 Borrador
            </button>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              cursor: "pointer"
            }}
          >
            ↩️ Deshacer
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid #fca5a5",
              backgroundColor: "#ffffff",
              color: "#dc2626",
              cursor: "pointer"
            }}
          >
            🗑️ Limpiar
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "14px",
            fontWeight: 700,
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#10b981",
            color: "#ffffff",
            cursor: isSaving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.3)",
            marginTop: "auto"
          }}
        >
          {isSaving ? "Guardando..." : "💾 Guardar en Historial"}
        </button>

        {saveMessage && (
          <div 
            style={{ 
              fontSize: "12px", 
              fontWeight: 600, 
              color: saveMessage.includes("❌") ? "#dc2626" : "#16a34a", 
              textAlign: "center",
              marginTop: "8px"
            }}
          >
            {saveMessage}
          </div>
        )}
      </div>

      {/* Interactive Drawing Canvas */}
      <div 
        style={{ 
          flex: "2", 
          minWidth: "300px", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          backgroundColor: "#f8fafc",
          borderRadius: "12px",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          padding: "20px",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            maxWidth: "100%",
            maxHeight: "550px",
            aspectRatio: "1/1",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            touchAction: "none",
            cursor: tool === "erase" ? "cell" : "crosshair"
          }}
        />
      </div>
    </div>
  );
};
