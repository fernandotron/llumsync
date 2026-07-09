"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./logo.module.css";
import { Logo } from "@/components/Logo";

// Helper to generate dynamic SVG strings for copy/paste and download
const getSvgString = (
  selectedLogo: "waves" | "pulse" | "filament" | "neuron", 
  framed: boolean, 
  frameBg: "dark" | "blue" | "light",
  orientation: "horizontal" | "vertical",
  thickness: number
) => {
  const isPulse = selectedLogo === "pulse";
  const isFilament = selectedLogo === "filament";
  const isNeuron = selectedLogo === "neuron";
  const isVertical = orientation === "vertical";
  
  // Dynamic thickness/stroke mapping
  const strokeWidth = 2 + thickness;
  const waveScaleY = 0.4 + (thickness * 0.12);
  const transformScaleY = `translate(0, 50) scale(1, ${waveScaleY}) translate(0, -50)`;

  // Generate dynamic logo elements XML
  let logoContent = "";
  if (isPulse) {
    const coreStroke = strokeWidth * 0.35;
    const shadowStroke = strokeWidth + 2;
    const shadowColor = frameBg === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(0, 0, 0, 0.3)";
    
    logoContent = `<!-- 1. Subtle 3D Drop Shadow -->
    <path d="M 15,50 C 30,50 32,50 36,50 C 41,50 43,20 47,20 C 51,20 54,80 58,80 C 62,80 64,42 68,42 C 72,42 75,50 85,50" fill="none" stroke="${shadowColor}" stroke-width="${shadowStroke}" stroke-linecap="round" stroke-linejoin="round" filter="url(#logo-shadow-pulse)" />
    <!-- 2. Outer Glow Layer -->
    <path d="M 15,50 C 30,50 32,50 36,50 C 41,50 43,20 47,20 C 51,20 54,80 58,80 C 62,80 64,42 68,42 C 72,42 75,50 85,50" fill="none" stroke="url(#logo-pulse-grad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#logo-glow-pulse)" opacity="0.75" />
    <!-- 3. Inner White Core (Neon Tube Light Effect) -->
    <path d="M 15,50 C 30,50 32,50 36,50 C 41,50 43,20 47,20 C 51,20 54,80 58,80 C 62,80 64,42 68,42 C 72,42 75,50 85,50" fill="none" stroke="#ffffff" stroke-width="${coreStroke}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <!-- 4. Glowing 4-Point Light Sparkle (Destello) at the highest peak -->
    <path d="M 47,13 Q 47,20 40,20 Q 47,20 47,27 Q 47,20 54,20 Q 47,20 47,13 Z" fill="#ffffff" filter="url(#logo-glow-pulse)" />
    <path d="M 47,15 Q 47,20 42,20 Q 47,20 47,25 Q 47,20 52,20 Q 47,20 47,15 Z" fill="#e0f2fe" />`;
  } else if (isFilament) {
    const coreStroke = strokeWidth * 0.35;
    const shadowStroke = strokeWidth + 2;
    const shadowColor = frameBg === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(0, 0, 0, 0.3)";
    const filamentPath = "M 35,75 L 35,48 C 35,26 42,22 46,34 C 48,42 52,42 54,34 C 58,22 65,26 65,48 L 65,75";

    logoContent = `<!-- 1. Subtle 3D Drop Shadow -->
    <path d="${filamentPath}" fill="none" stroke="${shadowColor}" stroke-width="${shadowStroke}" stroke-linecap="round" stroke-linejoin="round" filter="url(#logo-shadow-pulse)" />
    <!-- 2. Outer Glow Layer -->
    <path d="${filamentPath}" fill="none" stroke="url(#logo-pulse-grad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#logo-glow-pulse)" opacity="0.75" />
    <!-- 3. Inner White Core (Glowing Hot Filament Effect) -->
    <path d="${filamentPath}" fill="none" stroke="#ffffff" stroke-width="${coreStroke}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <!-- 4. Glowing 4-Point Light Sparkle at the center peak -->
    <path d="M 50,27 Q 50,34 43,34 Q 50,34 50,41 Q 50,34 57,34 Q 50,34 50,27 Z" fill="#ffffff" filter="url(#logo-glow-pulse)" />
    <path d="M 50,29 Q 50,34 45,34 Q 50,34 50,39 Q 50,34 55,34 Q 50,34 50,29 Z" fill="#e0f2fe" />`;
  } else if (isNeuron) {
    // Claude Code Asterisk style re-imagined as a Light Destello
    const rayStroke = 2 + (thickness * 0.7);
    const coreRadius = 4 + (thickness * 0.8);
    
    const rays = [
      { x2: 50, y2: 14, grad: "1" },
      { x2: 64, y2: 20, grad: "2" },
      { x2: 79, y2: 26, grad: "1" },
      { x2: 81, y2: 42, grad: "2" },
      { x2: 86, y2: 56, grad: "1" },
      { x2: 78, y2: 69, grad: "2" },
      { x2: 69, y2: 83, grad: "1" },
      { x2: 50, y2: 85, grad: "2" },
      { x2: 31, y2: 83, grad: "1" },
      { x2: 23, y2: 69, grad: "2" },
      { x2: 13, y2: 53, grad: "1" },
      { x2: 19, y2: 36, grad: "2" },
      { x2: 28, y2: 19, grad: "1" },
      { x2: 44, y2: 18, grad: "2" }
    ];
    
    const raysXml = rays.map(ray => `<line x1="50" y1="50" x2="${ray.x2}" y2="${ray.y2}" stroke="url(#logo-wave-grad-${ray.grad})" stroke-width="${rayStroke}" stroke-linecap="round" filter="url(#logo-glow-waves)" />`).join("\n    ");
    
    logoContent = `<!-- Central Glowing Core -->
    <circle cx="50" cy="50" r="${coreRadius}" fill="url(#logo-pulse-grad)" filter="url(#logo-glow-pulse)" />
    <!-- Radiating Light Beams -->
    ${raysXml}`;
  } else {
    // Classic waves
    logoContent = `<g transform="${transformScaleY}">
    <path d="M 15,38 C 32,22 48,22 65,33 C 78,42 90,42 99,35 C 88,48 72,48 60,36 C 48,28 32,28 15,38 Z" fill="url(#logo-wave-grad-1)" filter="url(#logo-glow-waves)" />
    <path d="M 15,64 C 32,48 48,48 65,59 C 78,68 90,68 99,61 C 88,74 72,74 60,62 C 48,54 32,54 15,64 Z" fill="url(#logo-wave-grad-2)" filter="url(#logo-glow-waves)" />
  </g>`;
  }

  const bgGradId = `logo-bg-${frameBg}`;
  
  const backgroundGradDef = frameBg === "dark" 
    ? `<linearGradient id="logo-bg-dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#27272a" />
      <stop offset="30%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>`
    : frameBg === "blue"
      ? `<linearGradient id="logo-bg-blue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0ea5e9" />
      <stop offset="40%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>`
      : `<linearGradient id="logo-bg-light" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>`;

  const strokeColor = frameBg === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const glassReflectOpacity = frameBg === "light" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.02)";

  const coreContent = isVertical 
    ? `<g transform="rotate(90, 50, 50)">
    ${logoContent}
  </g>` 
    : logoContent;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    ${framed ? backgroundGradDef : ""}
    <linearGradient id="logo-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <linearGradient id="logo-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" />
      <stop offset="50%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#2dd4bf" />
    </linearGradient>
    <linearGradient id="logo-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <filter id="logo-glow-waves" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="logo-glow-pulse" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Soft Drop Shadow Filter for 3D depth -->
    <filter id="logo-shadow-pulse" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.05   0 0 0 0 0.09   0 0 0 0 0.16  0 0 0 0.12 0" />
      <feOffset dx="0" dy="2.5" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>${framed ? `
  <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#${bgGradId})" stroke="${strokeColor}" stroke-width="1.2" />
  <rect x="3" y="3" width="94" height="47" rx="20" fill="${glassReflectOpacity}" style="pointer-events: none;" />
  <g transform="translate(13.5, 13.5) scale(0.73)">
    ${coreContent}
  </g>` : `
  ${coreContent}`}
</svg>`;
};

export default function LogoShowcasePage() {
  const [selectedLogo, setSelectedLogo] = useState<"waves" | "pulse" | "filament" | "neuron">("waves");
  const [bgColor, setBgColor] = useState<"light" | "dark" | "blue">("dark");
  
  // Custom states for the logo frame, orientation and thickness
  const [framed, setFramed] = useState(true);
  const [frameBg, setFrameBg] = useState<"dark" | "blue" | "light">("dark");
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [thickness, setThickness] = useState<number>(5); // Default: 5 (range 1-10)
  
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(getSvgString(selectedLogo, framed, frameBg, orientation, thickness));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([getSvgString(selectedLogo, framed, frameBg, orientation, thickness)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llumsync_${selectedLogo}_grosor${thickness}_${orientation}_${framed ? `icon_${frameBg}` : "logo"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getBgStyle = () => {
    switch (bgColor) {
      case "light":
        return { backgroundColor: "#f8fafc" };
      case "blue":
        return { background: "radial-gradient(circle, #0284c7 0%, #0369a1 100%)" };
      case "dark":
      default:
        return { backgroundColor: "#090d16" };
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>LlumSync Brand Assets</h1>
        <p className={styles.subtitle}>
          Visualización y descarga de logotipos SVG con orientación, grosor y marcos personalizables
        </p>
      </header>

      <main className={styles.showcaseCard}>
        {/* Left Side: Preview controls and logo rendering */}
        <section className={styles.previewSection}>
          <div className={styles.selectorTabs}>
            <button
              className={`${styles.tabButton} ${selectedLogo === "waves" ? styles.activeTab : ""}`}
              onClick={() => setSelectedLogo("waves")}
            >
              Propuesta 1: Ondas
            </button>
            <button
              className={`${styles.tabButton} ${selectedLogo === "pulse" ? styles.activeTab : ""}`}
              onClick={() => setSelectedLogo("pulse")}
            >
              Propuesta 2: Pulso
            </button>
            <button
              className={`${styles.tabButton} ${selectedLogo === "filament" ? styles.activeTab : ""}`}
              onClick={() => setSelectedLogo("filament")}
            >
              Propuesta 3: Filamento
            </button>
            <button
              className={`${styles.tabButton} ${selectedLogo === "neuron" ? styles.activeTab : ""}`}
              onClick={() => setSelectedLogo("neuron")}
            >
              Propuesta 4: Destello (Referencia Claude)
            </button>
          </div>

          <div className={styles.logoDisplay} style={getBgStyle()}>
            <Logo 
              type={selectedLogo} 
              size={160} 
              framed={framed} 
              frameBg={frameBg} 
              orientation={orientation}
              thickness={thickness}
            />
          </div>

          {/* Color controls for preview container & frame */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            {/* Viewer Background */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>
                Fondo del Visor Exterior
              </span>
              <div className={styles.bgControls}>
                <button
                  className={`${styles.bgBtn} ${bgColor === "dark" ? styles.bgBtnActive : ""}`}
                  style={{ backgroundColor: "#090d16" }}
                  title="Fondo Oscuro"
                  onClick={() => setBgColor("dark")}
                />
                <button
                  className={`${styles.bgBtn} ${bgColor === "light" ? styles.bgBtnActive : ""}`}
                  style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1" }}
                  title="Fondo Claro"
                  onClick={() => setBgColor("light")}
                />
                <button
                  className={`${styles.bgBtn} ${bgColor === "blue" ? styles.bgBtnActive : ""}`}
                  style={{ background: "radial-gradient(circle, #0284c7 0%, #0369a1 100%)" }}
                  title="Fondo Azul"
                  onClick={() => setBgColor("blue")}
                />
              </div>
            </div>

            {/* Element Orientation Selector */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>
                Orientación del Logo (Giro 90°)
              </span>
              <div className={styles.selectorTabs} style={{ width: "160px", padding: "2px" }}>
                <button
                  className={`${styles.tabButton} ${orientation === "horizontal" ? styles.activeTab : ""}`}
                  style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                  onClick={() => setOrientation("horizontal")}
                >
                  Horizontal
                </button>
                <button
                  className={`${styles.tabButton} ${orientation === "vertical" ? styles.activeTab : ""}`}
                  style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                  onClick={() => setOrientation("vertical")}
                >
                  Vertical
                </button>
              </div>
            </div>

            {/* Dynamic Thickness Slider (Volume Bar style) */}
            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>{selectedLogo === "neuron" ? "Ancho de los Rayos del Destello" : "Grosor del Elemento (Trazo/Volumen)"}</span>
                <span className={styles.sliderValue}>{thickness}</span>
              </div>
              <div className={styles.sliderRow}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={thickness}
                  onChange={(e) => setThickness(Number(e.target.value))}
                  className={styles.slider}
                />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" style={{ color: "var(--text-muted)" }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>

            {/* Framed/Unframed and Frame Color Toggle */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label 
                  style={{ 
                    fontSize: "0.85rem", 
                    fontWeight: "700", 
                    color: "var(--text-secondary)",
                    cursor: "pointer" 
                  }}
                  htmlFor="frame-toggle"
                >
                  Formato Marco Redondeado (Estilo Icono App)
                </label>
                <input
                  id="frame-toggle"
                  type="checkbox"
                  checked={framed}
                  onChange={(e) => setFramed(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "var(--primary)"
                  }}
                />
              </div>

              {framed && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Fondo del Marco Redondeado
                  </span>
                  <div className={styles.bgControls}>
                    <button
                      className={`${styles.bgBtn} ${frameBg === "dark" ? styles.bgBtnActive : ""}`}
                      style={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
                      title="Marco Negro"
                      onClick={() => setFrameBg("dark")}
                    />
                    <button
                      className={`${styles.bgBtn} ${frameBg === "blue" ? styles.bgBtnActive : ""}`}
                      style={{ backgroundColor: "#0284c7" }}
                      title="Marco Azul"
                      onClick={() => setFrameBg("blue")}
                    />
                    <button
                      className={`${styles.bgBtn} ${frameBg === "light" ? styles.bgBtnActive : ""}`}
                      style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }}
                      title="Marco Blanco"
                      onClick={() => setFrameBg("light")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Side: Metadata, description, code copy */}
        <section className={styles.infoSection}>
          <div className={styles.metaInfo}>
            <h3>
              {selectedLogo === "waves" 
                ? "Ondas Sincronizadas" 
                : selectedLogo === "pulse" 
                  ? "Pulso de Luz (ECG)" 
                  : selectedLogo === "filament"
                    ? "Filamento de Luz (Foco/Bombilla)"
                    : "Destello de Luz (Estilo Claude Code)"} 
              {framed ? ` - Marco ${frameBg === "dark" ? "Negro" : frameBg === "blue" ? "Azul" : "Blanco"}` : " - Isotipo Limpio"}
            </h3>
            <p>
              {selectedLogo === "filament"
                ? "Propuesta inspirada en el filamento incandescente de una bombilla clásica (símbolo de las ideas, de la energía y de 'Llum'). Está diseñado como un filamento de tungsteno con soporte doble y una bobina central que emite un destello de luz pura, aplicando sombra proyectada 3D y núcleo brillante de neón."
                : selectedLogo === "pulse"
                  ? `Versión mejorada 3D del pulso cardíaco: cuenta con una sombra proyectada suave para mayor profundidad sobre fondos claros, un núcleo brillante de luz blanca (efecto tubo de neón) y un destello brillante (estrella de 4 puntas) en el pico más alto representando la luz ("Llum").`
                  : selectedLogo === "neuron"
                    ? "Propuesta inspirada en la geometría orgánica y humana del logotipo de Claude (la estructura de asterisco de 14 puntas/rayos). Se rediseñó como un destello de luz digital de alta gama con un núcleo luminoso central y rayos en degradado celestes/turquesas que emiten luz hacia los extremos. Transmite inteligencia artificial, conexiones clínicas y luminosidad."
                    : `Esta versión presenta exactamente la curvatura y geometría del logo de olas original de LlumSync, con grosor interactivo ajustable. Nivel: ${thickness}/10. Orientación: ${orientation}.`}
            </p>

            <div className={styles.codeBlockHeader}>
              <span className={styles.codeTitle}>
                Código SVG ({orientation} - Grosor: {thickness} - {framed ? `Marco ${frameBg}` : "Limpio"})
              </span>
              <button className={styles.copyBtn} onClick={handleCopy}>
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copiado
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copiar
                  </>
                )}
              </button>
            </div>
            <pre className={styles.codeArea}>
              <code>{getSvgString(selectedLogo, framed, frameBg, orientation, thickness)}</code>
            </pre>
          </div>

          <div className={styles.footerActions}>
            <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={handleDownload}>
              Descargar .SVG
            </button>
            <Link href="/" className={`${styles.actionBtn} ${styles.btnSecondary}`}>
              Volver al Login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
