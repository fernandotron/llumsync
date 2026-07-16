import React, { useState, useRef, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  height?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = "Antes",
  afterLabel = "Después",
  height = "450px"
}) => {
  const [viewMode, setViewMode] = useState<"slider" | "side-by-side" | "opacity">("slider");
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [opacityValue, setOpacityValue] = useState<number>(50);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {/* Mode Control Toolbar */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "8px", 
          padding: "6px", 
          backgroundColor: "rgba(241, 245, 249, 0.8)", 
          borderRadius: "30px", 
          border: "1px solid rgba(226, 232, 240, 0.8)",
          backdropFilter: "blur(8px)",
          alignSelf: "center"
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("slider")}
          style={{
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: viewMode === "slider" ? "#3b82f6" : "transparent",
            color: viewMode === "slider" ? "#ffffff" : "#475569",
            boxShadow: viewMode === "slider" ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)" : "none"
          }}
        >
          ↕️ Deslizador
        </button>
        <button
          type="button"
          onClick={() => setViewMode("side-by-side")}
          style={{
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: viewMode === "side-by-side" ? "#3b82f6" : "transparent",
            color: viewMode === "side-by-side" ? "#ffffff" : "#475569",
            boxShadow: viewMode === "side-by-side" ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)" : "none"
          }}
        >
          ↔️ Lado a Lado
        </button>
        <button
          type="button"
          onClick={() => setViewMode("opacity")}
          style={{
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: viewMode === "opacity" ? "#3b82f6" : "transparent",
            color: viewMode === "opacity" ? "#ffffff" : "#475569",
            boxShadow: viewMode === "opacity" ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)" : "none"
          }}
        >
          👻 Transparencia
        </button>
      </div>

      {/* Main Container */}
      <div 
        className="relative overflow-hidden rounded-xl shadow-lg border border-slate-200/80 bg-slate-50"
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: height,
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          backgroundColor: "#f8fafc"
        }}
      >
        {/* SLIDER VIEW MODE */}
        {viewMode === "slider" && (
          <>
            {/* After Image (Background) */}
            <img
              src={afterUrl}
              alt="Después"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none"
              }}
            />

            {/* Before Image (Foreground, clipped) */}
            <img
              src={beforeUrl}
              alt="Antes"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
              }}
            />

            {/* Labels */}
            <span
              style={{
                position: "absolute",
                bottom: "16px",
                left: "16px",
                backgroundColor: "rgba(15, 23, 42, 0.65)",
                color: "#ffffff",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                pointerEvents: "none",
                zIndex: 4,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transition: "opacity 0.2s",
                opacity: sliderPosition < 10 ? 0 : 1
              }}
            >
              {beforeLabel}
            </span>
            <span
              style={{
                position: "absolute",
                bottom: "16px",
                right: "16px",
                backgroundColor: "rgba(0, 102, 135, 0.75)",
                color: "#ffffff",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                pointerEvents: "none",
                zIndex: 4,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transition: "opacity 0.2s",
                opacity: sliderPosition > 90 ? 0 : 1
              }}
            >
              {afterLabel}
            </span>

            {/* Divider Line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${sliderPosition}%`,
                width: "2px",
                backgroundColor: "#ffffff",
                cursor: "ew-resize",
                zIndex: 5,
                pointerEvents: "none",
                boxShadow: "0 0 10px rgba(0,0,0,0.3)"
              }}
            >
              {/* Handle Button */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 4px rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f172a",
                  cursor: "ew-resize",
                  pointerEvents: "none"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 17 3 12 8 7" />
                  <polyline points="16 17 21 12 16 7" />
                </svg>
              </div>
            </div>

            {/* Range Input Control */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "ew-resize",
                margin: 0,
                padding: 0,
                zIndex: 10,
                WebkitAppearance: "none",
                appearance: "none"
              }}
            />
          </>
        )}

        {/* SIDE-BY-SIDE MODE */}
        {viewMode === "side-by-side" && (
          <div style={{ display: "flex", width: "100%", height: "100%", gap: "4px" }}>
            <div style={{ position: "relative", flex: 1, height: "100%", overflow: "hidden" }}>
              <img
                src={beforeUrl}
                alt="Antes"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "12px",
                  backgroundColor: "rgba(15, 23, 42, 0.65)",
                  color: "#ffffff",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  backdropFilter: "blur(6px)"
                }}
              >
                {beforeLabel}
              </span>
            </div>
            <div style={{ position: "relative", flex: 1, height: "100%", overflow: "hidden" }}>
              <img
                src={afterUrl}
                alt="Después"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "12px",
                  backgroundColor: "rgba(0, 102, 135, 0.75)",
                  color: "#ffffff",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  backdropFilter: "blur(6px)"
                }}
              >
                {afterLabel}
              </span>
            </div>
          </div>
        )}

        {/* OPACITY VIEW MODE */}
        {viewMode === "opacity" && (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            {/* After Image (Bottom) */}
            <img
              src={afterUrl}
              alt="Después"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none"
              }}
            />

            {/* Before Image (Top with dynamic opacity) */}
            <img
              src={beforeUrl}
              alt="Antes"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                opacity: opacityValue / 100
              }}
            />

            {/* Labels */}
            <span
              style={{
                position: "absolute",
                bottom: "16px",
                left: "16px",
                backgroundColor: "rgba(15, 23, 42, 0.65)",
                color: "#ffffff",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                backdropFilter: "blur(8px)",
                pointerEvents: "none"
              }}
            >
              {beforeLabel} ({opacityValue}%)
            </span>
            <span
              style={{
                position: "absolute",
                bottom: "16px",
                right: "16px",
                backgroundColor: "rgba(0, 102, 135, 0.75)",
                color: "#ffffff",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "6px",
                backdropFilter: "blur(8px)",
                pointerEvents: "none"
              }}
            >
              {afterLabel} ({100 - opacityValue}%)
            </span>
          </div>
        )}
      </div>

      {/* Opacity Control Range Slider (only shown in opacity mode) */}
      {viewMode === "opacity" && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Después</span>
          <input
            type="range"
            min="0"
            max="100"
            value={opacityValue}
            onChange={(e) => setOpacityValue(Number(e.target.value))}
            style={{
              flexGrow: 1,
              cursor: "pointer",
              height: "6px",
              borderRadius: "3px",
              backgroundColor: "#cbd5e1"
            }}
          />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Antes</span>
        </div>
      )}
    </div>
  );
};
