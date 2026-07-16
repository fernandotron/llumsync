import React, { useState, useRef, useEffect } from "react";

interface WhiteboardEditorProps {
  clientId: string;
  clinicId?: string;
  dbTemplates?: any[];
  onSaveSuccess?: () => void;
}

// Default SVG anatomical templates
const defaultTemplates = {
  face: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100%" height="100%"><path d="M50,10 C20,10 15,35 15,60 C15,90 25,110 50,110 C75,110 85,90 85,60 C85,35 80,10 50,10 Z" fill="none" stroke="%230284c7" stroke-width="0.8"/><ellipse cx="33" cy="50" rx="6" ry="3" fill="none" stroke="%2338bdf8" stroke-width="0.6"/><ellipse cx="67" cy="50" rx="6" ry="3" fill="none" stroke="%2338bdf8" stroke-width="0.6"/><path d="M30,42 Q33,40 36,43" fill="none" stroke="%230284c7" stroke-width="0.6"/><path d="M64,43 Q67,40 70,42" fill="none" stroke="%230284c7" stroke-width="0.6"/><path d="M50,47 L48,68 L52,68 Z" fill="none" stroke="%230284c7" stroke-width="0.6"/><path d="M38,82 Q50,92 62,82" fill="none" stroke="%230284c7" stroke-width="0.8"/><path d="M42,82 Q50,86 58,82" fill="none" stroke="%2338bdf8" stroke-width="0.5"/><path d="M15,55 C12,55 10,60 10,65 C10,70 12,72 15,70" fill="none" stroke="%230284c7" stroke-width="0.6"/><path d="M85,55 C88,55 90,60 90,65 C90,70 88,72 85,70" fill="none" stroke="%230284c7" stroke-width="0.6"/><path d="M50,10 L50,110" fill="none" stroke="%23cbd5e1" stroke-dasharray="2 2" stroke-width="0.5"/></svg>`,
  body: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140" width="100%" height="100%"><g stroke="%230284c7" stroke-width="0.8" fill="none"><circle cx="45" cy="18" r="8"/><path d="M45,26 L45,65 M30,35 L60,35 M30,35 L25,60 M60,35 L65,60 M45,65 L35,100 M45,65 L55,100"/><circle cx="115" cy="18" r="8"/><path d="M115,26 L115,65 M100,35 L130,35 M100,35 L95,60 M130,35 L135,60 M115,65 L105,100 M115,65 L125,100"/></g><text x="45" y="122" fill="%230284c7" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">FRENTE (FRONT)</text><text x="115" y="122" fill="%230284c7" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">DORSO (BACK)</text></svg>`,
  dental: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 100" width="100%" height="100%"><path d="M20,75 C20,20 120,20 120,75" fill="none" stroke="%230284c7" stroke-width="1"/><g fill="none" stroke="%2338bdf8" stroke-width="0.6"><rect x="20" y="70" width="8" height="8" rx="1"/><rect x="27" y="62" width="8" height="8" rx="1"/><rect x="35" y="52" width="9" height="9" rx="1"/><rect x="45" y="42" width="9" height="9" rx="1"/><rect x="56" y="35" width="11" height="10" rx="1"/><rect x="69" y="35" width="11" height="10" rx="1"/><rect x="82" y="42" width="9" height="9" rx="1"/><rect x="92" y="52" width="9" height="9" rx="1"/><rect x="101" y="62" width="8" height="8" rx="1"/><rect x="108" y="70" width="8" height="8" rx="1"/></g><text x="70" y="20" fill="%230284c7" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">ARCADA DENTAL</text></svg>`
};

const colors = [
  { name: "Rojo", hex: "#ef4444" },
  { name: "Azul", hex: "#3b82f6" },
  { name: "Verde", hex: "#10b981" },
  { name: "Negro", hex: "#0f172a" },
  { name: "Amarillo", hex: "#eab308" },
  { name: "Naranja", hex: "#f97316" }
];

const brushSizes = [2, 4, 8, 12];

export const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({ 
  clientId, 
  clinicId,
  dbTemplates = [], 
  onSaveSuccess 
}) => {
  const [currentTemplateUrl, setCurrentTemplateUrl] = useState<string>(defaultTemplates.face);
  const [templateName, setTemplateName] = useState<string>("Rostro");
  const [color, setColor] = useState<string>("#ef4444");
  const [brushSize, setBrushSize] = useState<number>(4);
  const [tool, setTool] = useState<"draw" | "erase" | "pin">("draw");
  const [pins, setPins] = useState<{ id: number; number: number; x: number; y: number; text: string }[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Initialize canvas and load background template image
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 600;
    canvas.height = 600;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 600);

    // Draw background template image
    const img = new Image();
    img.src = currentTemplateUrl;
    // Allow loading external domain images from dbTemplates safely without throwing CORS errors
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(600 / img.width, 600 / img.height) * 0.95;
      const x = (600 - img.width * scale) / 2;
      const y = (600 - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Save canvas state to history
      saveHistory();
    };
    img.onerror = () => {
      // In case of CORS block on external database images, draw empty canvas with template name text
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(40, 40, 520, 520);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(40, 40, 520, 520);
      
      ctx.fillStyle = "#64748b";
      ctx.font = "italic 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Plantilla: ${templateName}`, 300, 280);
      ctx.fillText("(Carga de imagen protegida)", 300, 310);
      saveHistory();
    };
  };

  useEffect(() => {
    initCanvas();
  }, [currentTemplateUrl]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL();
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      }
      historyRef.current.push(dataUrl);
      historyIndexRef.current = historyRef.current.length - 1;
    } catch (e) {
      console.warn("Canvas is tainted, history skipped:", e);
    }
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
    setPins([]);
    initCanvas();
  };

  // Get coordinates for mouse/touch events
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e.nativeEvent) {
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
    if (tool === "pin") return; // Handled by wrapper click
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

  // Add a numbered pin annotation on click/tap
  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== "pin") return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    const rect = wrapper.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const nextNumber = pins.length + 1;
    setPins([
      ...pins,
      { id: Date.now(), number: nextNumber, x, y, text: "" }
    ]);
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setCustomImageUrl(dataUrl);
          setCurrentTemplateUrl(dataUrl);
          setTemplateName(`Subida: ${file.name.split(".")[0]}`);
          setTool("draw"); // Reset tool to draw
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setSaveMessage("Subiendo anotación al historial del paciente...");

    // Create temporary canvas to burn pins directly into the saved image
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);

      // Draw all pins directly on tempCtx
      pins.forEach((pin) => {
        const x = (pin.x / 100) * tempCanvas.width;
        const y = (pin.y / 100) * tempCanvas.height;

        // Shadow circle
        tempCtx.beginPath();
        tempCtx.arc(x, y, 15, 0, 2 * Math.PI);
        tempCtx.fillStyle = "rgba(15, 23, 42, 0.3)";
        tempCtx.fill();

        // Pin border/background
        tempCtx.beginPath();
        tempCtx.arc(x, y, 12, 0, 2 * Math.PI);
        tempCtx.fillStyle = "#ef4444"; // red circle
        tempCtx.fill();
        tempCtx.lineWidth = 2.5;
        tempCtx.strokeStyle = "#ffffff";
        tempCtx.stroke();

        // Text inside pin
        tempCtx.fillStyle = "#ffffff";
        tempCtx.font = "bold 13px sans-serif";
        tempCtx.textAlign = "center";
        tempCtx.textBaseline = "middle";
        tempCtx.fillText(pin.number.toString(), x, y);
      });
    }

    tempCanvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSaving(false);
        setSaveMessage("❌ Error: No se pudo generar la imagen del lienzo.");
        return;
      }

      // Compile annotations into description text
      let annotationsDesc = "";
      if (pins.length > 0) {
        annotationsDesc = " [Anotaciones: " + pins.map(p => `(${p.number}) ${p.text || "sin nota"}`).join(", ") + "]";
      }

      const formData = new FormData();
      formData.append("file", blob, `whiteboard-annotated-${Date.now()}.png`);
      formData.append("type", "BEFORE");
      formData.append("description", `Pizarra: ${templateName}${annotationsDesc}`);

      try {
        const res = await fetch(`/api/clients/${clientId}/photos`, {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          setSaveMessage("✅ ¡Anotación guardada con éxito en el historial de fotos del paciente!");
          setPins([]);
          initCanvas();
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

  const handleUpdatePinText = (id: number, text: string) => {
    setPins(pins.map(p => p.id === id ? { ...p, text } : p));
  };

  const handleDeletePin = (id: number) => {
    const filtered = pins.filter(p => p.id !== id);
    // Reindex pins sequentially
    const reindexed = filtered.map((p, idx) => ({
      ...p,
      number: idx + 1
    }));
    setPins(reindexed);
  };

  return (
    <div style={{ display: "flex", gap: "24px", flexDirection: "row", flexWrap: "wrap", width: "100%" }}>
      {/* Sidebar Controls */}
      <div 
        style={{ 
          flex: "1", 
          minWidth: "290px", 
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
        <div>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>1. Seleccionar Plantilla</h3>
          
          {/* List of templates: DB + default SVGs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
            {/* Defaults */}
            <button
              type="button"
              onClick={() => {
                setCurrentTemplateUrl(defaultTemplates.face);
                setTemplateName("Rostro");
              }}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: templateName === "Rostro" ? "#0284c7" : "#cbd5e1",
                backgroundColor: templateName === "Rostro" ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                color: templateName === "Rostro" ? "#0284c7" : "#475569",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s"
              }}
            >
              👤 Rostro (Estándar)
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTemplateUrl(defaultTemplates.body);
                setTemplateName("Cuerpo Completo");
              }}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: templateName === "Cuerpo Completo" ? "#0284c7" : "#cbd5e1",
                backgroundColor: templateName === "Cuerpo Completo" ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                color: templateName === "Cuerpo Completo" ? "#0284c7" : "#475569",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s"
              }}
            >
              🧍 Cuerpo Completo (Estándar)
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTemplateUrl(defaultTemplates.dental);
                setTemplateName("Arcada Dental");
              }}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: templateName === "Arcada Dental" ? "#0284c7" : "#cbd5e1",
                backgroundColor: templateName === "Arcada Dental" ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                color: templateName === "Arcada Dental" ? "#0284c7" : "#475569",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s"
              }}
            >
              🦷 Arcada Dental (Estándar)
            </button>

            {/* Clinic DB Templates */}
            {dbTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setCurrentTemplateUrl(t.imageUrl);
                  setTemplateName(t.name);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: templateName === t.name ? "#0284c7" : "#cbd5e1",
                  backgroundColor: templateName === t.name ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                  color: templateName === t.name ? "#0284c7" : "#475569",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <img src={t.imageUrl} alt={t.name} style={{ width: "20px", height: "20px", borderRadius: "3px", objectFit: "cover" }} />
                <span>📂 {t.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Upload */}
          <div style={{ marginTop: "10px" }}>
            <label 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                border: "1px dashed #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#475569",
                cursor: "pointer",
                width: "100%",
                boxSizing: "border-box",
                justifyContent: "center"
              }}
            >
              📤 Subir imagen personalizada
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCustomImageUpload} 
                style={{ display: "none" }} 
              />
            </label>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />

        {/* Tools modes */}
        <div>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>2. Modo de Trabajo</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setTool("draw")}
              style={{
                padding: "10px 6px",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: tool === "draw" ? "#0284c7" : "#cbd5e1",
                backgroundColor: tool === "draw" ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                color: tool === "draw" ? "#0284c7" : "#475569",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>✏️</span> Lápiz
            </button>
            <button
              type="button"
              onClick={() => setTool("erase")}
              style={{
                padding: "10px 6px",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: tool === "erase" ? "#0284c7" : "#cbd5e1",
                backgroundColor: tool === "erase" ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                color: tool === "erase" ? "#0284c7" : "#475569",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>🧽</span> Borrador
            </button>
            <button
              type="button"
              onClick={() => setTool("pin")}
              style={{
                padding: "10px 6px",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "6px",
                border: "1px solid",
                borderColor: tool === "pin" ? "#0284c7" : "#cbd5e1",
                backgroundColor: tool === "pin" ? "rgba(2, 132, 199, 0.08)" : "#ffffff",
                color: tool === "pin" ? "#0284c7" : "#475569",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>📍</span> Pines
            </button>
          </div>
        </div>

        {/* Brush Size / Color Palette (Visible when not pin tool) */}
        {tool !== "pin" && (
          <>
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 700, color: "#475569" }}>Grosor del Lápiz</h4>
              <div style={{ display: "flex", gap: "6px" }}>
                {brushSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBrushSize(size)}
                    style={{
                      flex: 1,
                      padding: "4px 0",
                      fontSize: "11px",
                      fontWeight: 600,
                      borderRadius: "4px",
                      border: brushSize === size ? "2px solid #0284c7" : "1px solid #cbd5e1",
                      backgroundColor: brushSize === size ? "rgba(2, 132, 199, 0.05)" : "#ffffff",
                      color: brushSize === size ? "#0284c7" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 700, color: "#475569" }}>Paleta de Colores</h4>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setColor(c.hex);
                      setTool("draw");
                    }}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: c.hex,
                      border: color === c.hex && tool === "draw" ? "3px solid #0f172a" : "1px solid rgba(0,0,0,0.15)",
                      cursor: "pointer",
                      padding: 0
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Pin Annotations Input list (Visible only when tool is pin or we have pins) */}
        {pins.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "180px", overflowY: "auto", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
            <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Notas de los Pines</h4>
            {pins.map((pin) => (
              <div key={pin.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: "bold",
                    flexShrink: 0
                  }}
                >
                  {pin.number}
                </span>
                <input
                  type="text"
                  value={pin.text}
                  placeholder={`Nota del punto ${pin.number}...`}
                  onChange={(e) => handleUpdatePinText(pin.id, e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    outline: "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleDeletePin(pin.id)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "0 4px"
                  }}
                  title="Eliminar pin"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "auto 0 0 0" }} />

        {/* Clear & Save Action Controls */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "12px",
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
              fontSize: "12px",
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
            boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.3)"
          }}
        >
          {isSaving ? "Guardando..." : "💾 Guardar en Ficha"}
        </button>

        {saveMessage && (
          <div 
            style={{ 
              fontSize: "11px", 
              fontWeight: 600, 
              color: saveMessage.includes("❌") ? "#dc2626" : "#16a34a", 
              textAlign: "center",
              marginTop: "4px"
            }}
          >
            {saveMessage}
          </div>
        )}
      </div>

      {/* Interactive Drawing Canvas Wrapper */}
      <div 
        style={{ 
          flex: "2", 
          minWidth: "320px", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          backgroundColor: "#f8fafc",
          borderRadius: "12px",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          padding: "20px",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
          position: "relative"
        }}
      >
        <div 
          ref={wrapperRef}
          onClick={handleWrapperClick}
          style={{
            position: "relative",
            maxWidth: "100%",
            maxHeight: "550px",
            aspectRatio: "1/1",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
            overflow: "hidden"
          }}
        >
          {/* Canvas */}
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
              width: "100%",
              height: "100%",
              display: "block",
              touchAction: "none",
              cursor: tool === "erase" ? "cell" : tool === "pin" ? "pointer" : "crosshair"
            }}
          />

          {/* Absolute HTML pins overlay */}
          {pins.map((pin) => (
            <div
              key={pin.id}
              style={{
                position: "absolute",
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: "translate(-50%, -50%)",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "2px solid #ffffff",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                pointerEvents: "none", // Prevent overlay blocking click
                userSelect: "none"
              }}
            >
              {pin.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
