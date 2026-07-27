"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ToastContainer";
import { Icons } from "./Icons";
import styles from "./LoyaltyCardDesigner.module.css";

export interface CardElement {
  id: string;
  type: "text" | "image" | "qr";
  content?: string; // Text content or image DataURL/URL
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textTransform?: "none" | "uppercase";
  textAlign?: "left" | "center" | "right";
  opacity?: number;
  borderRadius?: number;
  zIndex: number;
  qrFgColor?: string;
  qrBgColor?: string;
  locked?: boolean;
}

export interface CardTemplate {
  id: string;
  name: string;
  tag?: string;
  bgType: "solid" | "gradient" | "image";
  bgColor1?: string;
  bgColor2?: string;
  gradientAngle?: number;
  bgImage?: string;
  borderRadius?: number;
  elements: CardElement[];
}

export const PRESET_TEMPLATES: CardTemplate[] = [
  {
    id: "preset-gold",
    name: "VIP Gold Privilege",
    tag: "Exclusivo Gold",
    bgType: "gradient",
    bgColor1: "#0f172a",
    bgColor2: "#1e293b",
    gradientAngle: 135,
    borderRadius: 18,
    elements: [
      {
        id: "el-logo-text",
        type: "text",
        content: "{{Nombre Clinica}}",
        x: 24,
        y: 22,
        fontSize: 16,
        fontFamily: "Outfit",
        color: "#f59e0b",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 1,
      },
      {
        id: "el-badge",
        type: "text",
        content: "CLUB SOCIO VIP GOLD",
        x: 350,
        y: 22,
        fontSize: 10,
        fontFamily: "Inter",
        color: "#fbbf24",
        fontWeight: "700",
        textAlign: "right",
        zIndex: 1,
      },
      {
        id: "el-name",
        type: "text",
        content: "{{Nombre de Cliente}}",
        x: 24,
        y: 195,
        fontSize: 22,
        fontFamily: "Outfit",
        color: "#ffffff",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 2,
      },
      {
        id: "el-dni",
        type: "text",
        content: "DNI / NIF: {{DNI}}",
        x: 24,
        y: 232,
        fontSize: 12,
        fontFamily: "Inter",
        color: "#94a3b8",
        fontWeight: "500",
        textAlign: "left",
        zIndex: 2,
      },
      {
        id: "el-num",
        type: "text",
        content: "SOCIO Nº {{Numero de socio}}",
        x: 24,
        y: 285,
        fontSize: 15,
        fontFamily: "Courier New",
        color: "#fbbf24",
        fontWeight: "700",
        textAlign: "left",
        zIndex: 3,
      },
      {
        id: "el-date",
        type: "text",
        content: "ALTA: {{Fecha Alta}}",
        x: 350,
        y: 288,
        fontSize: 10,
        fontFamily: "Inter",
        color: "#94a3b8",
        fontWeight: "600",
        textAlign: "right",
        zIndex: 3,
      },
      {
        id: "el-qr",
        type: "qr",
        content: "https://llumsync.com/verify/card?member={{Numero de socio}}",
        x: 420,
        y: 180,
        width: 85,
        height: 85,
        qrFgColor: "#ffffff",
        qrBgColor: "transparent",
        zIndex: 4,
      },
    ],
  },
  {
    id: "preset-platinum",
    name: "Platinum Diamond",
    tag: "Platinum VIP",
    bgType: "gradient",
    bgColor1: "#334155",
    bgColor2: "#090d16",
    gradientAngle: 180,
    borderRadius: 18,
    elements: [
      {
        id: "el-logo-text-2",
        type: "text",
        content: "{{Nombre Clinica}}",
        x: 24,
        y: 24,
        fontSize: 18,
        fontFamily: "Montserrat",
        color: "#38bdf8",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 1,
      },
      {
        id: "el-badge-2",
        type: "text",
        content: "PLATINUM MEMBER",
        x: 360,
        y: 26,
        fontSize: 10,
        fontFamily: "Montserrat",
        color: "#e2e8f0",
        fontWeight: "700",
        textAlign: "right",
        zIndex: 1,
      },
      {
        id: "el-name-2",
        type: "text",
        content: "{{Nombre de Cliente}}",
        x: 24,
        y: 190,
        fontSize: 22,
        fontFamily: "Montserrat",
        color: "#f8fafc",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 2,
      },
      {
        id: "el-num-2",
        type: "text",
        content: "{{Numero de socio}}",
        x: 24,
        y: 280,
        fontSize: 16,
        fontFamily: "Courier New",
        color: "#38bdf8",
        fontWeight: "700",
        textAlign: "left",
        zIndex: 3,
      },
      {
        id: "el-qr-2",
        type: "qr",
        content: "https://llumsync.com/verify/card?member={{Numero de socio}}",
        x: 420,
        y: 180,
        width: 85,
        height: 85,
        qrFgColor: "#38bdf8",
        qrBgColor: "transparent",
        zIndex: 4,
      },
    ],
  },
  {
    id: "preset-emerald",
    name: "Emerald Health",
    tag: "Salud & Bienestar",
    bgType: "gradient",
    bgColor1: "#064e3b",
    bgColor2: "#022c22",
    gradientAngle: 135,
    borderRadius: 18,
    elements: [
      {
        id: "el-logo-3",
        type: "text",
        content: "🌿 {{Nombre Clinica}}",
        x: 24,
        y: 24,
        fontSize: 17,
        fontFamily: "Outfit",
        color: "#a7f3d0",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 1,
      },
      {
        id: "el-name-3",
        type: "text",
        content: "{{Nombre de Cliente}}",
        x: 24,
        y: 185,
        fontSize: 21,
        fontFamily: "Outfit",
        color: "#ffffff",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 2,
      },
      {
        id: "el-num-3",
        type: "text",
        content: "TARJETA SALUD Nº {{Numero de socio}}",
        x: 24,
        y: 280,
        fontSize: 13,
        fontFamily: "Inter",
        color: "#6ee7b7",
        fontWeight: "700",
        textAlign: "left",
        zIndex: 3,
      },
      {
        id: "el-qr-3",
        type: "qr",
        content: "https://llumsync.com/verify/card?member={{Numero de socio}}",
        x: 415,
        y: 175,
        width: 90,
        height: 90,
        qrFgColor: "#a7f3d0",
        qrBgColor: "transparent",
        zIndex: 4,
      },
    ],
  },
  {
    id: "preset-minimal",
    name: "Clean White Minimal",
    tag: "Estilo Elegante",
    bgType: "gradient",
    bgColor1: "#ffffff",
    bgColor2: "#f1f5f9",
    gradientAngle: 180,
    borderRadius: 18,
    elements: [
      {
        id: "el-logo-4",
        type: "text",
        content: "{{Nombre Clinica}}",
        x: 24,
        y: 24,
        fontSize: 18,
        fontFamily: "Inter",
        color: "#0f172a",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 1,
      },
      {
        id: "el-badge-4",
        type: "text",
        content: "MIEMBRO OFICIAL",
        x: 350,
        y: 26,
        fontSize: 10,
        fontFamily: "Inter",
        color: "#64748b",
        fontWeight: "700",
        textAlign: "right",
        zIndex: 1,
      },
      {
        id: "el-name-4",
        type: "text",
        content: "{{Nombre de Cliente}}",
        x: 24,
        y: 190,
        fontSize: 22,
        fontFamily: "Inter",
        color: "#0f172a",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 2,
      },
      {
        id: "el-num-4",
        type: "text",
        content: "Nº SOCIO: {{Numero de socio}}",
        x: 24,
        y: 280,
        fontSize: 14,
        fontFamily: "Courier New",
        color: "#2563eb",
        fontWeight: "700",
        textAlign: "left",
        zIndex: 3,
      },
      {
        id: "el-qr-4",
        type: "qr",
        content: "https://llumsync.com/verify/card?member={{Numero de socio}}",
        x: 420,
        y: 180,
        width: 85,
        height: 85,
        qrFgColor: "#0f172a",
        qrBgColor: "transparent",
        zIndex: 4,
      },
    ],
  },
  {
    id: "preset-cyber",
    name: "Cyber Neon Glow",
    tag: "Modern & Bold",
    bgType: "gradient",
    bgColor1: "#2e1065",
    bgColor2: "#0f172a",
    gradientAngle: 135,
    borderRadius: 18,
    elements: [
      {
        id: "el-logo-5",
        type: "text",
        content: "⚡ {{Nombre Clinica}}",
        x: 24,
        y: 24,
        fontSize: 18,
        fontFamily: "Outfit",
        color: "#22d3ee",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 1,
      },
      {
        id: "el-name-5",
        type: "text",
        content: "{{Nombre de Cliente}}",
        x: 24,
        y: 190,
        fontSize: 22,
        fontFamily: "Outfit",
        color: "#f472b6",
        fontWeight: "800",
        textAlign: "left",
        zIndex: 2,
      },
      {
        id: "el-num-5",
        type: "text",
        content: "ID: {{Numero de socio}}",
        x: 24,
        y: 280,
        fontSize: 15,
        fontFamily: "Courier New",
        color: "#22d3ee",
        fontWeight: "700",
        textAlign: "left",
        zIndex: 3,
      },
      {
        id: "el-qr-5",
        type: "qr",
        content: "https://llumsync.com/verify/card?member={{Numero de socio}}",
        x: 420,
        y: 180,
        width: 85,
        height: 85,
        qrFgColor: "#22d3ee",
        qrBgColor: "transparent",
        zIndex: 4,
      },
    ],
  },
];

export function SvgQrCode({
  value,
  size = 80,
  fgColor = "#ffffff",
  bgColor = "transparent",
}: {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    const darkColor = fgColor || "#000000";
    const lightColor = !bgColor || bgColor === "transparent" ? "#00000000" : bgColor;

    QRCode.toDataURL(
      value,
      {
        width: size * 3,
        margin: 1,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: "M",
      },
      (err, url) => {
        if (!err && url) {
          setDataUrl(url);
        }
      }
    );
  }, [value, size, fgColor, bgColor]);

  if (!dataUrl) {
    return <div style={{ width: `${size}px`, height: `${size}px` }} />;
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "block",
        objectFit: "contain",
      }}
    />
  );
}

export default function LoyaltyCardDesigner() {
  const { activeClinic } = useApp();

  const [templates, setTemplates] = useState<CardTemplate[]>(PRESET_TEMPLATES);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("preset-gold");
  const [currentTemplate, setCurrentTemplate] = useState<CardTemplate>(PRESET_TEMPLATES[0]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [useSampleData, setUseSampleData] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Studio Left Sidebar Active Tab
  const [activeNavTab, setActiveNavTab] = useState<
    "plantillas" | "texto" | "subidos" | "qr" | "fondo" | "posicion"
  >("plantillas");

  // Posicion Panel Internal Tabs
  const [posicionTab, setPosicionTab] = useState<"organizar" | "capas">("organizar");
  const [showOpacityPopover, setShowOpacityPopover] = useState<boolean>(false);

  // Uploaded Files Gallery Store
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number }>({
    mouseX: 0,
    mouseY: 0,
    elemX: 0,
    elemY: 0,
  });

  // Undo / Redo History Stack
  const historyRef = useRef<CardTemplate[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  // Auto-push currentTemplate changes to history
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const jsonStr = JSON.stringify(currentTemplate);
    if (
      historyIndexRef.current >= 0 &&
      JSON.stringify(historyRef.current[historyIndexRef.current]) === jsonStr
    ) {
      return;
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(jsonStr));
    historyIndexRef.current = historyRef.current.length - 1;
  }, [currentTemplate]);

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      isUndoRedoRef.current = true;
      const prevTpl = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
      setCurrentTemplate(prevTpl);
      toast.success("Deshecho (Ctrl+Z) ↩️");
    } else {
      toast.error("No hay más cambios para deshacer");
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      isUndoRedoRef.current = true;
      const nextTpl = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
      setCurrentTemplate(nextTpl);
      toast.success("Rehecho (Ctrl+Y) ↪️");
    } else {
      toast.error("No hay cambios para rehacer");
    }
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load clinic logo into uploadedImages if available
  useEffect(() => {
    const cLogo = (activeClinic as any)?.logo;
    if (cLogo && !uploadedImages.includes(cLogo)) {
      setUploadedImages((prev) => [cLogo, ...prev]);
    }
  }, [(activeClinic as any)?.logo]);

  // Load saved templates from API
  useEffect(() => {
    if (!activeClinic?.id) return;
    fetch(`/api/loyalty/templates?clinicId=${activeClinic.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.templates) && data.templates.length > 0) {
          const combined = [...PRESET_TEMPLATES, ...data.templates];
          setTemplates(combined);
          if (data.activeTemplateId) {
            setActiveTemplateId(data.activeTemplateId);
            const found = combined.find((t) => t.id === data.activeTemplateId);
            if (found) setCurrentTemplate(found);
          }
        }
      })
      .catch((err) => console.error("Error loading templates:", err));
  }, [activeClinic?.id]);

  // Select Preset/Template
  const handleSelectTemplate = (tpl: CardTemplate) => {
    setCurrentTemplate(JSON.parse(JSON.stringify(tpl)));
    setSelectedElementId(null);
  };

  // Add Text Element
  const handleAddText = (defaultContent = "Nuevo Texto", size = 16, weight = "700") => {
    const newZ = Math.max(0, ...currentTemplate.elements.map((e) => e.zIndex)) + 1;
    const newEl: CardElement = {
      id: `el-${Date.now()}`,
      type: "text",
      content: defaultContent,
      x: 50,
      y: 50,
      fontSize: size,
      fontFamily: "Outfit",
      color: "#ffffff",
      fontWeight: weight,
      textAlign: "left",
      zIndex: newZ,
    };
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setSelectedElementId(newEl.id);
  };

  // Add QR Element
  const handleAddQR = () => {
    const newZ = Math.max(0, ...currentTemplate.elements.map((e) => e.zIndex)) + 1;
    const newEl: CardElement = {
      id: `el-qr-${Date.now()}`,
      type: "qr",
      content: "https://llumsync.com/verify/card?member={{Numero de socio}}",
      x: 400,
      y: 180,
      width: 85,
      height: 85,
      qrFgColor: "#ffffff",
      qrBgColor: "transparent",
      zIndex: newZ,
    };
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setSelectedElementId(newEl.id);
  };

  // Add Uploaded Image to Canvas
  const handleAddImageToCanvas = (imgUrl: string) => {
    const newZ = Math.max(0, ...currentTemplate.elements.map((e) => e.zIndex)) + 1;
    const newEl: CardElement = {
      id: `el-img-${Date.now()}`,
      type: "image",
      content: imgUrl,
      x: 180,
      y: 100,
      width: 120,
      height: 120,
      opacity: 1,
      borderRadius: 0,
      zIndex: newZ,
    };
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setSelectedElementId(newEl.id);
    toast.success("Imagen agregada a la tarjeta 🖼️");
  };

  // Handle Multi-file Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const dataUrl = evt.target.result as string;
          setUploadedImages((prev) => [dataUrl, ...prev]);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`${files.length} archivo(s) subido(s) correctamente ✨`);
  };

  // Insert Variable Pill into currently selected text element
  const handleInsertVar = (varName: string) => {
    if (!selectedElementId) {
      // If no text element selected, create a new one with variable
      handleAddText(`{{${varName}}}`, 18, "800");
      return;
    }
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id === selectedElementId && el.type === "text") {
          return {
            ...el,
            content: `${el.content || ""} {{${varName}}}`.trim(),
          };
        }
        return el;
      }),
    }));
  };

  // Update selected element property
  const handleUpdateSelected = (key: keyof CardElement, value: any) => {
    if (!selectedElementId) return;
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id === selectedElementId) {
          return { ...el, [key]: value };
        }
        return el;
      }),
    }));
  };

  // Duplicate Element
  const handleDuplicateElement = () => {
    if (!selectedElementId) return;
    const target = currentTemplate.elements.find((e) => e.id === selectedElementId);
    if (!target) return;

    const newZ = Math.max(0, ...currentTemplate.elements.map((e) => e.zIndex)) + 1;
    const dup: CardElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: `el-dup-${Date.now()}`,
      x: Math.min(450, target.x + 20),
      y: Math.min(280, target.y + 20),
      zIndex: newZ,
    };
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, dup],
    }));
    setSelectedElementId(dup.id);
    toast.success("Elemento duplicado 📄");
  };

  // Lock Toggle
  const handleToggleLock = () => {
    if (!selectedElementId) return;
    const target = currentTemplate.elements.find((e) => e.id === selectedElementId);
    if (!target) return;
    handleUpdateSelected("locked", !target.locked);
  };

  // Z-Index Layer Ordering
  const handleLayerOrder = (action: "front" | "back" | "up" | "down") => {
    if (!selectedElementId) return;
    const sorted = [...currentTemplate.elements].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((e) => e.id === selectedElementId);
    if (idx === -1) return;

    if (action === "front") {
      const maxZ = Math.max(...sorted.map((e) => e.zIndex));
      handleUpdateSelected("zIndex", maxZ + 1);
    } else if (action === "back") {
      const minZ = Math.min(...sorted.map((e) => e.zIndex));
      handleUpdateSelected("zIndex", Math.max(1, minZ - 1));
    } else if (action === "up" && idx < sorted.length - 1) {
      const targetZ = sorted[idx + 1].zIndex;
      const currentZ = sorted[idx].zIndex;
      setCurrentTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((e) => {
          if (e.id === selectedElementId) return { ...e, zIndex: targetZ };
          if (e.id === sorted[idx + 1].id) return { ...e, zIndex: currentZ };
          return e;
        }),
      }));
    } else if (action === "down" && idx > 0) {
      const targetZ = sorted[idx - 1].zIndex;
      const currentZ = sorted[idx].zIndex;
      setCurrentTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((e) => {
          if (e.id === selectedElementId) return { ...e, zIndex: targetZ };
          if (e.id === sorted[idx - 1].id) return { ...e, zIndex: currentZ };
          return e;
        }),
      }));
    }
  };

  // Align to Stage Page (Top, Middle, Bottom, Left, Center, Right)
  const handleAlignPage = (pos: "top" | "middle" | "bottom" | "left" | "center" | "right") => {
    if (!selectedElementId) return;
    const target = currentTemplate.elements.find((e) => e.id === selectedElementId);
    if (!target) return;

    const cardW = 537;
    const cardH = 338;
    const elemW = target.width || 120;
    const elemH = target.height || (target.fontSize ? target.fontSize + 10 : 30);

    if (pos === "top") handleUpdateSelected("y", 15);
    if (pos === "middle") handleUpdateSelected("y", Math.round((cardH - elemH) / 2));
    if (pos === "bottom") handleUpdateSelected("y", cardH - elemH - 15);
    if (pos === "left") handleUpdateSelected("x", 15);
    if (pos === "center") handleUpdateSelected("x", Math.round((cardW - elemW) / 2));
    if (pos === "right") handleUpdateSelected("x", cardW - elemW - 15);
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      elements: prev.elements.filter((e) => e.id !== id),
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent, elem: CardElement) => {
    e.stopPropagation();
    setSelectedElementId(elem.id);
    if (elem.locked) return; // Locked elements cannot be dragged

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectedElementId) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const newX = Math.max(0, Math.min(480, dragStartRef.current.elemX + dx));
      const newY = Math.max(0, Math.min(300, dragStartRef.current.elemY + dy));

      setCurrentTemplate((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => {
          if (el.id === selectedElementId) {
            return { ...el, x: Math.round(newX), y: Math.round(newY) };
          }
          return el;
        }),
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, selectedElementId]);

  // Save Template API
  const handleSaveTemplate = async (setActive = false) => {
    if (!activeClinic?.id) {
      toast.error("Selecciona una clínica");
      return;
    }
    setIsSaving(true);
    try {
      let updatedList = [...templates];
      const existingIdx = updatedList.findIndex((t) => t.id === currentTemplate.id);
      if (existingIdx >= 0) {
        updatedList[existingIdx] = currentTemplate;
      } else {
        updatedList.push(currentTemplate);
      }

      const targetActiveId = setActive ? currentTemplate.id : activeTemplateId;

      const res = await fetch("/api/loyalty/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: activeClinic.id,
          activeTemplateId: targetActiveId,
          templates: updatedList.filter((t) => !t.id.startsWith("preset-")),
        }),
      });

      if (res.ok) {
        setTemplates(updatedList);
        if (setActive) setActiveTemplateId(currentTemplate.id);
        toast.success(
          setActive
            ? "✨ Plantilla guardada y marcada como ACTIVA para la clínica"
            : "💾 Plantilla guardada correctamente"
        );
      } else {
        toast.error("Error al guardar la plantilla");
      }
    } catch (err) {
      toast.error("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  // Replacement helper for text elements
  const formatText = (rawText?: string) => {
    if (!rawText) return "";
    const clinicName = activeClinic?.name || "Clínica Centro";
    const cleanText = rawText.replace(/https?:\/\/clifav\.app\/verify\//g, "");
    if (useSampleData) {
      return cleanText
        .replace(/\{\{Nombre de Cliente\}\}/g, "María García López")
        .replace(/\{\{Numero de socio\}\}/g, "M00042")
        .replace(/\{\{DNI\}\}/g, "12345678X")
        .replace(/\{\{Fecha Alta\}\}/g, "27/07/2026")
        .replace(/\{\{Nombre Clinica\}\}/g, clinicName);
    }
    return cleanText;
  };

  const selectedElement = currentTemplate.elements.find((e) => e.id === selectedElementId);

  // Background style computation
  const getStageBg = () => {
    if (currentTemplate.bgType === "solid") return currentTemplate.bgColor1 || "#0f172a";
    if (currentTemplate.bgType === "image") {
      if (currentTemplate.bgImage) return `url("${currentTemplate.bgImage}") center/cover no-repeat`;
      return "#1e293b";
    }
    return `linear-gradient(${currentTemplate.gradientAngle || 135}deg, ${
      currentTemplate.bgColor1 || "#0f172a"
    } 0%, ${currentTemplate.bgColor2 || "#1e293b"} 100%)`;
  };

  return (
    <div className={styles.designerContainer}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div>
          <h2 className={styles.headerTitle}>
            <Icons.CreditCard size={22} color="var(--primary)" />
            Estudio de Diseño de Tarjetas de Fidelización
          </h2>
          <p className={styles.headerSub}>
            Diseña la tarjeta de socios de tu clínica con herramientas interactivas, capas y variables dinámicas
          </p>
        </div>

        <div className={styles.actionGroup}>
          <button
            className={`btn ${useSampleData ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 14px", fontSize: "13px" }}
            onClick={() => setUseSampleData(!useSampleData)}
          >
            {useSampleData ? "👁️ Datos de Ejemplo" : "🔤 Ver Placeholders"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleSaveTemplate(false)}
            disabled={isSaving}
          >
            💾 Guardar Plantilla
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSaveTemplate(true)}
            disabled={isSaving}
          >
            ⭐ Definir como Plantilla Activa
          </button>
        </div>
      </div>

      {/* TOP FORMATTING TOOLBAR */}
      <div className={styles.canvaTopBar}>
        {/* Undo / Redo Buttons */}
        <div style={{ display: "flex", gap: "4px", paddingRight: "8px", borderRight: "1px solid var(--border-color)" }}>
          <button
            className={styles.canvaBtn}
            title="Deshacer (Ctrl+Z)"
            onClick={handleUndo}
          >
            ↩️
          </button>
          <button
            className={styles.canvaBtn}
            title="Rehacer (Ctrl+Y)"
            onClick={handleRedo}
          >
            ↪️
          </button>
        </div>

        {selectedElement ? (
          <>
            {/* Font Family Selector */}
            {selectedElement.type === "text" && (
              <select
                className={styles.fontSelect}
                value={selectedElement.fontFamily || "Inter"}
                onChange={(e) => handleUpdateSelected("fontFamily", e.target.value)}
              >
                <option value="Inter">Inter</option>
                <option value="Outfit">Outfit</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Courier New">Courier New</option>
              </select>
            )}

            {/* Font Size Selector */}
            {selectedElement.type === "text" && (
              <div className={styles.sizeBox}>
                <button
                  className={styles.sizeBtn}
                  onClick={() =>
                    handleUpdateSelected("fontSize", Math.max(8, (selectedElement.fontSize || 16) - 1))
                  }
                >
                  −
                </button>
                <input
                  type="text"
                  className={styles.sizeInput}
                  value={selectedElement.fontSize || 16}
                  onChange={(e) =>
                    handleUpdateSelected("fontSize", parseInt(e.target.value, 10) || 16)
                  }
                />
                <button
                  className={styles.sizeBtn}
                  onClick={() =>
                    handleUpdateSelected("fontSize", (selectedElement.fontSize || 16) + 1)
                  }
                >
                  +
                </button>
              </div>
            )}

            {/* Text Color Picker `A` */}
            {selectedElement.type === "text" && (
              <label
                className={styles.canvaBtn}
                title="Color de Texto"
                style={{ position: "relative", cursor: "pointer" }}
              >
                <span style={{ fontSize: "15px", fontWeight: 900, textDecoration: "underline", textDecorationColor: selectedElement.color || "#ffffff" }}>
                  A
                </span>
                <input
                  type="color"
                  style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", top: 0, left: 0 }}
                  value={selectedElement.color || "#ffffff"}
                  onChange={(e) => handleUpdateSelected("color", e.target.value)}
                />
              </label>
            )}

            {/* Bold B */}
            {selectedElement.type === "text" && (
              <button
                className={`${styles.canvaBtn} ${selectedElement.fontWeight === "800" ? styles.canvaBtnActive : ""}`}
                title="Negrita (B)"
                onClick={() =>
                  handleUpdateSelected("fontWeight", selectedElement.fontWeight === "800" ? "400" : "800")
                }
              >
                <strong>B</strong>
              </button>
            )}

            {/* Italic I */}
            {selectedElement.type === "text" && (
              <button
                className={`${styles.canvaBtn} ${selectedElement.fontStyle === "italic" ? styles.canvaBtnActive : ""}`}
                title="Cursiva (I)"
                onClick={() =>
                  handleUpdateSelected("fontStyle", selectedElement.fontStyle === "italic" ? "normal" : "italic")
                }
              >
                <em>I</em>
              </button>
            )}

            {/* Underline U */}
            {selectedElement.type === "text" && (
              <button
                className={`${styles.canvaBtn} ${selectedElement.textDecoration === "underline" ? styles.canvaBtnActive : ""}`}
                title="Subrayado (U)"
                onClick={() =>
                  handleUpdateSelected("textDecoration", selectedElement.textDecoration === "underline" ? "none" : "underline")
                }
              >
                <span style={{ textDecoration: "underline" }}>U</span>
              </button>
            )}

            {/* Uppercase aA */}
            {selectedElement.type === "text" && (
              <button
                className={`${styles.canvaBtn} ${selectedElement.textTransform === "uppercase" ? styles.canvaBtnActive : ""}`}
                title="Mayúsculas / Minúsculas (aA)"
                onClick={() =>
                  handleUpdateSelected("textTransform", selectedElement.textTransform === "uppercase" ? "none" : "uppercase")
                }
              >
                aA
              </button>
            )}

            {/* Alignment Button */}
            {selectedElement.type === "text" && (
              <button
                className={styles.canvaBtn}
                title="Alineación"
                onClick={() => {
                  const current = selectedElement.textAlign || "left";
                  const next = current === "left" ? "center" : current === "center" ? "right" : "left";
                  handleUpdateSelected("textAlign", next);
                }}
              >
                {selectedElement.textAlign === "center" ? "≡ (Centro)" : selectedElement.textAlign === "right" ? "≡ (Derecha)" : "≡ (Izquierda)"}
              </button>
            )}

            {/* Image Resize Controls */}
            {selectedElement.type === "image" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Ancho:</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: "65px", padding: "4px 8px", fontSize: "12px" }}
                  value={selectedElement.width || 120}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 40;
                    handleUpdateSelected("width", val);
                  }}
                />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Alto:</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: "65px", padding: "4px 8px", fontSize: "12px" }}
                  value={selectedElement.height || 120}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 40;
                    handleUpdateSelected("height", val);
                  }}
                />
              </div>
            )}

            {/* Opacity / Transparency button */}
            <div style={{ position: "relative" }}>
              <button
                className={`${styles.canvaBtn} ${showOpacityPopover ? styles.canvaBtnActive : ""}`}
                title="Transparencia / Opacidad"
                onClick={() => setShowOpacityPopover(!showOpacityPopover)}
              >
                🏁 Opacidad ({Math.round((selectedElement.opacity ?? 1) * 100)}%)
              </button>

              {showOpacityPopover && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    left: 0,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                    zIndex: 200,
                    width: "200px",
                  }}
                >
                  <label className="form-label" style={{ fontSize: "11px" }}>Transparencia</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedElement.opacity ?? 1}
                    onChange={(e) => handleUpdateSelected("opacity", parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Posición Drawer Button */}
            <button
              className={`${styles.canvaBtn} ${activeNavTab === "posicion" ? styles.canvaBtnActive : ""}`}
              onClick={() => setActiveNavTab(activeNavTab === "posicion" ? "plantillas" : "posicion")}
            >
              📍 Posición
            </button>
          </>
        ) : (
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", padding: "4px" }}>
            💡 Haz clic en cualquier texto, logotipo o código QR de la tarjeta para editar sus propiedades
          </span>
        )}
      </div>

      {/* STUDIO WORKSPACE LAYOUT */}
      <div className={styles.workspaceLayout}>
        {/* 1. VERTICAL ICON NAVIGATION SIDEBAR */}
        <div className={styles.verticalNav}>
          <button
            className={`${styles.navTabBtn} ${activeNavTab === "plantillas" ? styles.navTabActive : ""}`}
            onClick={() => setActiveNavTab("plantillas")}
          >
            <div className={styles.navIconBadge}>🎨</div>
            Plantillas
          </button>

          <button
            className={`${styles.navTabBtn} ${activeNavTab === "texto" ? styles.navTabActive : ""}`}
            onClick={() => setActiveNavTab("texto")}
          >
            <div className={styles.navIconBadge}>🔤</div>
            Texto
          </button>

          <button
            className={`${styles.navTabBtn} ${activeNavTab === "subidos" ? styles.navTabActive : ""}`}
            onClick={() => setActiveNavTab("subidos")}
          >
            <div className={styles.navIconBadge}>☁️</div>
            Subidos
          </button>

          <button
            className={`${styles.navTabBtn} ${activeNavTab === "qr" ? styles.navTabActive : ""}`}
            onClick={() => setActiveNavTab("qr")}
          >
            <div className={styles.navIconBadge}>📱</div>
            Código QR
          </button>

          <button
            className={`${styles.navTabBtn} ${activeNavTab === "fondo" ? styles.navTabActive : ""}`}
            onClick={() => setActiveNavTab("fondo")}
          >
            <div className={styles.navIconBadge}>🖼️</div>
            Fondo
          </button>

          <button
            className={`${styles.navTabBtn} ${activeNavTab === "posicion" ? styles.navTabActive : ""}`}
            onClick={() => setActiveNavTab("posicion")}
          >
            <div className={styles.navIconBadge}>📍</div>
            Posición
          </button>
        </div>

        {/* 2. COLLAPSIBLE ACTIVE DRAWER PANEL */}
        <div className={styles.drawerPanel}>
          {/* TAB 1: PLANTILLAS */}
          {activeNavTab === "plantillas" && (
            <>
              <div className={styles.drawerHeader}>
                <span>🎨 Plantillas Recomendadas</span>
              </div>
              <div className={styles.presetGrid}>
                {templates.map((tpl) => {
                  const isCurrent = currentTemplate.id === tpl.id;
                  const isActiveOfficial = activeTemplateId === tpl.id;

                  const bg =
                    tpl.bgType === "solid"
                      ? tpl.bgColor1
                      : `linear-gradient(${tpl.gradientAngle || 135}deg, ${tpl.bgColor1} 0%, ${tpl.bgColor2} 100%)`;

                  return (
                    <div
                      key={tpl.id}
                      className={`${styles.presetCard} ${isCurrent ? styles.presetCardActive : ""}`}
                      style={{ background: bg }}
                      onClick={() => handleSelectTemplate(tpl)}
                    >
                      {isActiveOfficial && (
                        <span
                          style={{
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            background: "#eab308",
                            color: "#000",
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          ⭐ ACTIVA
                        </span>
                      )}
                      <span className={styles.presetName}>{tpl.name}</span>
                      <span className={styles.presetTag}>{tpl.tag || "Personalizada"}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 2: TEXTO */}
          {activeNavTab === "texto" && (
            <>
              <div className={styles.drawerHeader}>
                <span>🔤 Agregar Texto & Variables</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "flex-start", fontSize: "16px", fontWeight: 800 }}
                  onClick={() => handleAddText("Añadir un título", 22, "800")}
                >
                  ➕ Añadir un título
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "flex-start", fontSize: "14px", fontWeight: 600 }}
                  onClick={() => handleAddText("Añadir subtítulo", 16, "600")}
                >
                  ➕ Añadir subtítulo
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "flex-start", fontSize: "12px", fontWeight: 400 }}
                  onClick={() => handleAddText("Añadir texto de cuerpo", 13, "400")}
                >
                  ➕ Añadir texto de cuerpo
                </button>
              </div>

              <div style={{ marginTop: "14px" }}>
                <span className={styles.toolSectionTitle}>Variables Dinámicas</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0 10px" }}>
                  Inserta etiquetas que se autocompletan con la información real de cada socio:
                </p>
                <div className={styles.varPills}>
                  {[
                    "Nombre de Cliente",
                    "Numero de socio",
                    "DNI",
                    "Fecha Alta",
                    "Nombre Clinica",
                  ].map((v) => (
                    <button key={v} className={styles.varPill} onClick={() => handleInsertVar(v)}>
                      + {v}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: SUBIDOS */}
          {activeNavTab === "subidos" && (
            <>
              <div className={styles.drawerHeader}>
                <span>☁️ Archivos Subidos</span>
              </div>

              {/* Subir archivo button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              <button
                className={styles.uploadBtnMain}
                onClick={() => fileInputRef.current?.click()}
              >
                📤 Subir archivos desde tu dispositivo
              </button>

              <div style={{ marginTop: "10px" }}>
                <span className={styles.toolSectionTitle}>Imágenes & Logotipos (Haz clic para usar)</span>
                {uploadedImages.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", padding: "30px 0" }}>
                    No hay imágenes subidas. Sube logotipos o imágenes para usarlas en la tarjeta.
                  </p>
                ) : (
                  <div className={styles.mediaGrid} style={{ marginTop: "10px" }}>
                    {uploadedImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={styles.mediaCard}
                        onClick={() => handleAddImageToCanvas(imgUrl)}
                        title="Haz clic para agregar a la tarjeta"
                      >
                        <img src={imgUrl} alt={`Subido ${idx}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 4: CODIGO QR */}
          {activeNavTab === "qr" && (
            <>
              <div className={styles.drawerHeader}>
                <span>📱 Código QR de Validación</span>
              </div>

              <button className={styles.uploadBtnMain} onClick={handleAddQR}>
                📱 Insertar Código QR de Socio
              </button>

              {selectedElement && selectedElement.type === "qr" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "12px" }}>Tamaño QR ({selectedElement.width}px)</label>
                    <input
                      type="range"
                      min="50"
                      max="140"
                      value={selectedElement.width || 85}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleUpdateSelected("width", val);
                        handleUpdateSelected("height", val);
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "12px" }}>Color de Módulos</label>
                    <input
                      type="color"
                      className="input"
                      style={{ height: "36px", padding: "2px", width: "100%" }}
                      value={selectedElement.qrFgColor || "#ffffff"}
                      onChange={(e) => handleUpdateSelected("qrFgColor", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 5: FONDO */}
          {activeNavTab === "fondo" && (
            <>
              <div className={styles.drawerHeader}>
                <span>🖼️ Fondo de la Tarjeta</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: "12px" }}>Tipo de Fondo</label>
                <select
                  className="input select"
                  value={currentTemplate.bgType}
                  onChange={(e) =>
                    setCurrentTemplate({
                      ...currentTemplate,
                      bgType: e.target.value as any,
                    })
                  }
                >
                  <option value="gradient">Gradiente Elegante</option>
                  <option value="solid">Color Sólido</option>
                  <option value="image">Imagen Personalizada</option>
                </select>
              </div>

              {currentTemplate.bgType === "gradient" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "11px" }}>Color 1</label>
                    <input
                      type="color"
                      className="input"
                      style={{ height: "36px", padding: "2px" }}
                      value={currentTemplate.bgColor1 || "#0f172a"}
                      onChange={(e) =>
                        setCurrentTemplate({ ...currentTemplate, bgColor1: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "11px" }}>Color 2</label>
                    <input
                      type="color"
                      className="input"
                      style={{ height: "36px", padding: "2px" }}
                      value={currentTemplate.bgColor2 || "#1e293b"}
                      onChange={(e) =>
                        setCurrentTemplate({ ...currentTemplate, bgColor2: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              {currentTemplate.bgType === "solid" && (
                <div>
                  <label className="form-label" style={{ fontSize: "11px" }}>Color</label>
                  <input
                    type="color"
                    className="input"
                    style={{ height: "36px", padding: "2px", width: "100%" }}
                    value={currentTemplate.bgColor1 || "#0f172a"}
                    onChange={(e) =>
                      setCurrentTemplate({ ...currentTemplate, bgColor1: e.target.value })
                    }
                  />
                </div>
              )}

              {currentTemplate.bgType === "image" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "11px" }}>Subir Imagen de Fondo</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="input"
                      style={{ fontSize: "11px", padding: "6px" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            if (evt.target?.result) {
                              setCurrentTemplate({
                                ...currentTemplate,
                                bgImage: evt.target.result as string,
                              });
                              toast.success("Imagen de fondo cargada correctamente 🖼️");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  {currentTemplate.bgImage && (
                    <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", height: "70px" }}>
                      <img
                        src={currentTemplate.bgImage}
                        alt="Fondo Vista Previa"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          background: "rgba(239, 68, 68, 0.9)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "10px",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                        onClick={() => setCurrentTemplate({ ...currentTemplate, bgImage: "" })}
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 6: POSICION */}
          {activeNavTab === "posicion" && (
            <>
              <div className={styles.drawerHeader}>
                <span>📍 Posición de Elementos</span>
              </div>

              <div className={styles.posicionTabs}>
                <button
                  className={`${styles.posicionTabBtn} ${posicionTab === "organizar" ? styles.posicionTabActive : ""}`}
                  onClick={() => setPosicionTab("organizar")}
                >
                  Organizar
                </button>
                <button
                  className={`${styles.posicionTabBtn} ${posicionTab === "capas" ? styles.posicionTabActive : ""}`}
                  onClick={() => setPosicionTab("capas")}
                >
                  Capas
                </button>
              </div>

              {posicionTab === "organizar" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span className={styles.toolSectionTitle}>Mover Capa</span>
                  <div className={styles.posGrid2}>
                    <button className={styles.posBtn} onClick={() => handleLayerOrder("up")}>
                      ⬆️ Adelante
                    </button>
                    <button className={styles.posBtn} onClick={() => handleLayerOrder("down")}>
                      ⬇️ Atrás
                    </button>
                    <button className={styles.posBtn} onClick={() => handleLayerOrder("front")}>
                      ⏫ Al frente
                    </button>
                    <button className={styles.posBtn} onClick={() => handleLayerOrder("back")}>
                      ⏬ Al fondo
                    </button>
                  </div>

                  <span className={styles.toolSectionTitle} style={{ marginTop: "10px" }}>Alinear a la página</span>
                  <div className={styles.posGrid2}>
                    <button className={styles.posBtn} onClick={() => handleAlignPage("top")}>
                      ⬆️ Arriba
                    </button>
                    <button className={styles.posBtn} onClick={() => handleAlignPage("left")}>
                      ⬅️ Izquierda
                    </button>
                    <button className={styles.posBtn} onClick={() => handleAlignPage("middle")}>
                      ↕️ En medio
                    </button>
                    <button className={styles.posBtn} onClick={() => handleAlignPage("center")}>
                      ↔️ Centro
                    </button>
                    <button className={styles.posBtn} onClick={() => handleAlignPage("bottom")}>
                      ⬇️ Abajo
                    </button>
                    <button className={styles.posBtn} onClick={() => handleAlignPage("right")}>
                      ➡️ Derecha
                    </button>
                  </div>

                  {selectedElement && (
                    <>
                      <span className={styles.toolSectionTitle} style={{ marginTop: "10px" }}>Coordenadas (px)</span>
                      <div className={styles.posGrid2}>
                        <div>
                          <label className="form-label" style={{ fontSize: "11px" }}>X (px)</label>
                          <input
                            type="number"
                            className="input"
                            value={selectedElement.x}
                            onChange={(e) => handleUpdateSelected("x", parseInt(e.target.value, 10) || 0)}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: "11px" }}>Y (px)</label>
                          <input
                            type="number"
                            className="input"
                            value={selectedElement.y}
                            onChange={(e) => handleUpdateSelected("y", parseInt(e.target.value, 10) || 0)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.layerList}>
                  {[...currentTemplate.elements]
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((el) => {
                      const isSel = el.id === selectedElementId;
                      return (
                        <div
                          key={el.id}
                          className={`${styles.layerItem} ${isSel ? styles.layerItemActive : ""}`}
                          onClick={() => setSelectedElementId(el.id)}
                        >
                          <span>
                            {el.type === "qr"
                              ? "📱 Código QR"
                              : el.type === "image"
                              ? "🖼️ Imagen / Logo"
                              : `🔤 ${el.content?.substring(0, 18)}`}
                          </span>
                          <button
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(el.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. CENTER: INTERACTIVE CANVAS STUDIO STAGE */}
        <div className={styles.canvasViewport}>
          {/* Card Stage */}
          <div
            ref={stageRef}
            className={styles.cardStage}
            style={{ background: getStageBg() }}
            onClick={(e) => {
              // Only deselect if clicked on empty stage background
              if (
                e.target === stageRef.current ||
                (e.target as HTMLElement)?.classList?.contains(styles.cardGlassGlow)
              ) {
                setSelectedElementId(null);
              }
            }}
          >
            <div className={styles.cardGlassGlow} />

            {currentTemplate.elements.map((el) => {
              const isSel = el.id === selectedElementId;

              return (
                <div
                  key={el.id}
                  className={`${styles.elementWrapper} ${isSel ? styles.elementSelected : ""}`}
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    zIndex: el.zIndex,
                    opacity: el.opacity ?? 1,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el)}
                >
                  {/* Floating Context Toolbar above element when selected */}
                  {isSel && (
                    <div className={styles.contextFloatingBar} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.contextBtn}
                        title={el.locked ? "Desbloquear" : "Bloquear"}
                        onClick={handleToggleLock}
                      >
                        {el.locked ? "🔒" : "🔓"}
                      </button>
                      <button
                        className={styles.contextBtn}
                        title="Duplicar"
                        onClick={handleDuplicateElement}
                      >
                        📄+
                      </button>
                      <button
                        className={styles.contextBtn}
                        title="Posición"
                        onClick={() => setActiveNavTab("posicion")}
                      >
                        📍
                      </button>
                      <button
                        className={styles.contextBtn}
                        title="Eliminar"
                        style={{ color: "#ef4444" }}
                        onClick={() => handleDeleteElement(el.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  )}

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
                      {formatText(el.content)}
                    </div>
                  ) : el.type === "qr" ? (
                    <SvgQrCode
                      value={formatText(el.content)}
                      size={el.width || 85}
                      fgColor={el.qrFgColor || "#ffffff"}
                      bgColor={el.qrBgColor || "transparent"}
                    />
                  ) : el.type === "image" ? (
                    <img
                      src={formatText(el.content)}
                      alt="Elemento Imagen"
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
