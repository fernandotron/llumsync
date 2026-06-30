"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import styles from "./page.module.css";

export default function LoginPage() {
  const { login } = useApp();
  
  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Registration flow state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState("Fisioterapia");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Simulated Google Auth state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showGoogleCustomInput, setShowGoogleCustomInput] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, introduce tu correo electrónico");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const success = await login(email, password);
      if (!success) {
        setError("Credenciales incorrectas o usuario no encontrado. Si no tienes cuenta, haz clic en Registrarse.");
      }
    } catch {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    setError("");
    setEmail(demoEmail);
    
    let demoPass = "admin";
    if (demoEmail === "dr.sanz@clifav.com") demoPass = "doctor";
    else if (demoEmail === "laura.gomez@clifav.com") demoPass = "therapist";
    
    setPassword(demoPass);
    
    try {
      const success = await login(demoEmail, demoPass);
      if (!success) {
        setError("Error al iniciar sesión con cuenta demo.");
      }
    } catch {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelectAccount = async (selectedEmail: string) => {
    setShowGoogleModal(false);
    await handleDemoLogin(selectedEmail);
  };

  const handleGoogleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCustomEmail || !googleCustomEmail.includes("@")) {
      alert("Por favor, introduce un correo de Google válido.");
      return;
    }

    setLoading(true);
    setShowGoogleModal(false);
    setError("");

    try {
      // 1. Try to login
      const success = await login(googleCustomEmail.trim().toLowerCase(), "google-auth");
      if (success) {
        setLoading(false);
        return;
      }

      // 2. If login fails (user not found), register them automatically
      const nameFromEmail = googleCustomEmail.split("@")[0];
      const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          email: googleCustomEmail.trim().toLowerCase(),
          password: "google-auth"
        })
      });

      if (regRes.ok) {
        const loggedIn = await login(googleCustomEmail.trim().toLowerCase(), "google-auth");
        if (!loggedIn) {
          setError("Error al iniciar sesión después del registro con Google.");
        }
      } else {
        const regData = await regRes.json();
        setError(regData.error || "Error al auto-registrar cuenta de Google.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red durante el inicio con Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) {
      setError("Por favor, rellena todos los campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim().toLowerCase(),
          password: registerPassword
        })
      });

      if (regRes.ok) {
        // Auto-login after registration
        const loggedIn = await login(registerEmail.trim().toLowerCase(), registerPassword);
        if (!loggedIn) {
          setError("Error al iniciar sesión automáticamente tras crear la cuenta.");
        }
      } else {
        const regData = await regRes.json();
        setError(regData.error || "Error al crear la cuenta.");
      }
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    setError("");
    setIsRegistering(true);
    setRegisterStep(1);
  };

  const handleSwitchToLogin = () => {
    setError("");
    setIsRegistering(false);
  };

  return (
    <div className={styles.container}>
      {/* Background blobs */}
      <div className={styles.blob1}></div>
      <div className={styles.blob2}></div>

      <div className={`${styles.loginCard} glass`}>
        <div className={styles.header}>
          <div className={styles.logo}>LS</div>
          <h1 className={styles.title}>LlumSync</h1>
          <p className={styles.subtitle}>Gestión Integral de Centros Clínicos</p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {!isRegistering ? (
          /* LOGIN FORM */
          <>
            <form onSubmit={handleLogin} className={styles.form}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@llumsync.com"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </form>

            <div className={styles.divider}>
              <span>o continúa con</span>
            </div>

            <button 
              onClick={() => setShowGoogleModal(true)} 
              className="btn btn-secondary" 
              style={{ width: "100%", display: "flex", gap: "10px", alignItems: "center", justifyContent: "center" }}
              disabled={loading}
            >
              {/* Mock Google Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Google
            </button>

            <div className={styles.registerLinkContainer}>
              ¿No tienes una cuenta? 
              <button onClick={handleSwitchToRegister} className={styles.registerLink}>
                Regístrate aquí
              </button>
            </div>
          </>
        ) : (
          /* REGISTRATION WIZARD (STEPS 1 & 2) */
          <>
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepDot} ${registerStep >= 1 ? styles.stepDotActive : ""}`}>1</div>
              <div className={`${styles.stepDot} ${registerStep >= 2 ? styles.stepDotActive : ""}`}>2</div>
              <div className={styles.stepDot}>3</div>
              <div className={styles.stepDot}>4</div>
            </div>

            {registerStep === 1 ? (
              /* STEP 1: SELECT SPECIALTY */
              <div className="fade-in">
                <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", textAlign: "center" }}>
                  Paso 1: Seleccione su Especialidad
                </h2>
                
                <div className={styles.specialtyGrid}>
                  {[
                    { name: "Fisioterapia", icon: "🩹" },
                    { name: "Estética", icon: "✨" },
                    { name: "Dental", icon: "🦷" },
                    { name: "Dermatología", icon: "🩺" },
                    { name: "Nutrición", icon: "🍏" },
                    { name: "Psicología", icon: "🧠" },
                  ].map((spec) => (
                    <button
                      key={spec.name}
                      type="button"
                      className={`${styles.specialtyBtn} ${selectedSpecialty === spec.name ? styles.specialtyBtnActive : ""}`}
                      onClick={() => setSelectedSpecialty(spec.name)}
                    >
                      <span className={styles.specialtyIcon}>{spec.icon}</span>
                      <span>{spec.name}</span>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setRegisterStep(2)} 
                  className="btn btn-primary" 
                  style={{ width: "100%" }}
                >
                  Continuar
                </button>

                <div className={styles.registerLinkContainer}>
                  ¿Ya tienes cuenta? 
                  <button onClick={handleSwitchToLogin} className={styles.registerLink}>
                    Inicia sesión
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: CREATE ACCOUNT FORM */
              <form onSubmit={handleRegisterSubmit} className={`${styles.form} fade-in`}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", textAlign: "center" }}>
                  Paso 2: Crear Cuenta de Administrador
                </h2>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-name">Nombre Completo</label>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Ej: Fernando López"
                    className="input"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-email">Correo Electrónico</label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="ejemplo@llumsync.com"
                    className="input"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-password">Contraseña</label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="Elige una contraseña"
                    className="input"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={loading}>
                  {loading ? "Creando cuenta..." : "Crear Cuenta y Continuar"}
                </button>

                <button 
                  type="button" 
                  onClick={() => setRegisterStep(1)} 
                  className="btn btn-secondary" 
                  style={{ width: "100%", marginTop: "8px" }}
                  disabled={loading}
                >
                  ← Atrás
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* SIMULATED GOOGLE LOGIN MODAL */}
      {showGoogleModal && (
        <div className={styles.googleModalOverlay}>
          <div className={styles.googleModal}>
            <div className={styles.googleLogo}>
              <span style={{ color: "#4285F4" }}>G</span>
              <span style={{ color: "#EA4335" }}>o</span>
              <span style={{ color: "#FBBC05" }}>o</span>
              <span style={{ color: "#4285F4" }}>g</span>
              <span style={{ color: "#34A853" }}>l</span>
              <span style={{ color: "#EA4335" }}>e</span>
            </div>
            
            <h2 className={styles.googleTitle}>Elige una cuenta</h2>
            <p className={styles.googleSubtitle}>para continuar en LlumSync</p>

            {!showGoogleCustomInput ? (
              <>
                <div className={styles.googleAccountList}>
                  <button className={styles.googleAccountItem} onClick={() => handleGoogleSelectAccount("admin@clifav.com")}>
                    <div className={styles.googleAvatar}>A</div>
                    <div className={styles.googleAccountMeta}>
                      <span className={styles.googleAccountName}>LlumSync Administrador</span>
                      <span className={styles.googleAccountEmail}>admin@clifav.com</span>
                    </div>
                  </button>
                  
                  <button className={styles.googleAccountItem} onClick={() => handleGoogleSelectAccount("dr.sanz@clifav.com")}>
                    <div className={styles.googleAvatar}>S</div>
                    <div className={styles.googleAccountMeta}>
                      <span className={styles.googleAccountName}>Dr. Sanz (Fisioterapeuta)</span>
                      <span className={styles.googleAccountEmail}>dr.sanz@clifav.com</span>
                    </div>
                  </button>

                  <button className={styles.googleAccountItem} onClick={() => handleGoogleSelectAccount("laura.gomez@clifav.com")}>
                    <div className={styles.googleAvatar}>L</div>
                    <div className={styles.googleAccountMeta}>
                      <span className={styles.googleAccountName}>Laura Gómez (Osteópata)</span>
                      <span className={styles.googleAccountEmail}>laura.gomez@clifav.com</span>
                    </div>
                  </button>
                  
                  <button 
                    className={styles.googleAccountItem} 
                    style={{ background: "transparent", borderStyle: "dashed" }}
                    onClick={() => setShowGoogleCustomInput(true)}
                  >
                    <div className={styles.googleAvatar} style={{ background: "var(--border-color)", color: "var(--text-secondary)" }}>+</div>
                    <div className={styles.googleAccountMeta}>
                      <span className={styles.googleAccountName}>Utilizar otra cuenta</span>
                      <span className={styles.googleAccountEmail}>Iniciar con cualquier cuenta de Google</span>
                    </div>
                  </button>
                </div>

                <div className={styles.googleBtnGroup}>
                  <button onClick={() => setShowGoogleModal(false)} className={styles.googleCancelBtn}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleGoogleCustomSubmit}>
                <input
                  type="email"
                  placeholder="Introduce tu correo de Google (Gmail)"
                  className={styles.googleCustomInput}
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  required
                  autoFocus
                />
                
                <div className={styles.googleBtnGroup}>
                  <button 
                    type="button" 
                    onClick={() => { setShowGoogleCustomInput(false); setGoogleCustomEmail(""); }} 
                    className={styles.googleCancelBtn}
                  >
                    Atrás
                  </button>
                  <button type="submit" className={styles.googleSubmitBtn}>
                    Continuar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
