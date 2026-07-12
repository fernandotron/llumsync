import React, { useEffect, useRef, useState } from "react";
import { Icons } from "./Icons";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [devicesCount, setDevicesCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check how many video inputs are available
  useEffect(() => {
    if (!isOpen) return;
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setDevicesCount(videoDevices.length);
      })
      .catch(err => console.error("Error enumerating devices:", err));
  }, [isOpen]);

  // Start stream when modal opens or camera facingMode changes
  useEffect(() => {
    if (!isOpen || capturedPhotoUrl) return;

    let activeStream: MediaStream | null = null;

    setErrorMsg(null);
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })
      .then(s => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        console.error("Camera access error:", err);
        setErrorMsg(
          "No se pudo acceder a la cámara. Asegúrate de otorgar los permisos necesarios en tu navegador."
        );
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode, capturedPhotoUrl]);

  // Close and clean up stream
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCapturedPhotoUrl(null);
    setPhotoBlob(null);
    setErrorMsg(null);
    onClose();
  };

  // Toggle Camera (Front / Back)
  const toggleCamera = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  // Capture frame
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Trigger visual flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to URL for preview and Blob for uploading
    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPhotoUrl(url);
        
        // Stop camera stream once photo is captured to save battery/resources
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }, "image/jpeg", 0.9);
  };

  // Retry capture
  const handleRetry = () => {
    setCapturedPhotoUrl(null);
    setPhotoBlob(null);
  };

  // Confirm photo and return File object
  const handleConfirm = () => {
    if (!photoBlob) return;
    
    // Create a unique file name
    const fileName = `camera-capture-${Date.now()}.jpg`;
    const file = new File([photoBlob], fileName, { type: "image/jpeg" });
    
    onCapture(file);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "16px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>
            {capturedPhotoUrl ? "Confirmar Foto" : "Tomar Foto desde el Móvil / Web"}
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              borderRadius: "50%",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Icons.Plus size={20} style={{ transform: "rotate(45deg)" }} />
          </button>
        </div>

        {/* Camera Feed / Preview Area */}
        <div
          style={{
            position: "relative",
            width: "100%",
            backgroundColor: "#000000",
            aspectRatio: "4/3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}
        >
          {!capturedPhotoUrl ? (
            <>
              {errorMsg ? (
                <div style={{ color: "#ffffff", padding: "24px", textAlign: "center" }}>
                  <Icons.Warning size={32} style={{ color: "#f59e0b", marginBottom: "12px", display: "inline-block" }} />
                  <p style={{ margin: 0, fontSize: "14px" }}>{errorMsg}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              )}
            </>
          ) : (
            <img
              src={capturedPhotoUrl}
              alt="Previsualización de captura"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
          )}

          {/* Canvas hidden (used for rendering captured image) */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Flash animation layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#ffffff",
              opacity: flashActive ? 0.9 : 0,
              transition: flashActive ? "none" : "opacity 0.2s ease-out",
              pointerEvents: "none",
              zIndex: 5
            }}
          />
        </div>

        {/* Controls / Footer */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "center",
            gap: "16px"
          }}
        >
          {!capturedPhotoUrl ? (
            // Live capture controls
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
              {/* Spacer/Placeholder to center the shutter button */}
              <div style={{ width: "40px" }} />

              {/* Shutter Button */}
              <button
                onClick={capturePhoto}
                disabled={!!errorMsg}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: errorMsg ? "#cbd5e1" : "#006687",
                  border: "4px solid #ffffff",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 2px #006687",
                  cursor: errorMsg ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  transition: "transform 0.1s"
                }}
                onMouseDown={(e) => !errorMsg && (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => !errorMsg && (e.currentTarget.style.transform = "scale(1)")}
              >
                <Icons.Camera size={28} />
              </button>

              {/* Camera Switcher Button (only if multiple video inputs are available, e.g. front/back on mobile) */}
              {devicesCount > 1 && !errorMsg ? (
                <button
                  onClick={toggleCamera}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#475569",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                  }}
                  title="Cambiar cámara"
                >
                  <Icons.RefreshCw size={18} />
                </button>
              ) : (
                <div style={{ width: "40px" }} />
              )}
            </div>
          ) : (
            // Preview / Confirmation controls
            <div style={{ display: "flex", gap: "16px", width: "100%" }}>
              <button
                onClick={handleRetry}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              >
                Repetir
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#006687",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 6px -1px rgba(0, 102, 135, 0.2)"
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#005570")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#006687")}
              >
                Aceptar y Subir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
