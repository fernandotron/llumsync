"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import styles from "./page.module.css";

// Alphabetized and correctly spelled specialties list (43 items)
const SPECIALTIES = [
  "Acupuntor",
  "Alergólogo",
  "Analista Clínico",
  "Anestesista",
  "Angiólogo y Cirujano Vascular",
  "Bioquímico",
  "Cardiólogo",
  "Cirujano Cardiovascular",
  "Cirujano General",
  "Cirujano Oral y Maxilofacial",
  "Cirujano Pediátrico",
  "Cirujano Plástico",
  "Cirujano Torácico",
  "Dentista",
  "Dentista Infantil",
  "Dietista Nutricionista",
  "Digestólogo",
  "Enfermero",
  "Farmacólogo",
  "Fisioterapeuta",
  "Forense",
  "Geriatra",
  "Ginecólogo",
  "Hematólogo",
  "Internista",
  "Medicina Integrativa",
  "Médico de Familia",
  "Médico Estético",
  "Médico General",
  "Microbiólogo",
  "Nefrólogo",
  "Neumólogo",
  "Neurocirujano",
  "Neurólogo",
  "Oftalmólogo",
  "Oncólogo",
  "Óptico",
  "Patólogo",
  "Psicólogo",
  "Psicólogo Infantil",
  "Radiólogo",
  "Traumatólogo",
  "Urólogo"
];

export default function LoginPage() {
  const { login } = useApp();
  
  // Auth Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Registration flow state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Step 1: Selected Option
  const [usageOption, setUsageOption] = useState<"software" | "visibility" | "both">("both");

  // Step 2: Account details
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  // Step 3: Clinic details
  const [clinicType, setClinicType] = useState<"Física" | "Online" | "Domicilio">("Física");
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Address Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Step 4: Personal / Specialty
  const [selectedSpecialty, setSelectedSpecialty] = useState("Médico Estético");

  // Simulated Google Auth state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showGoogleCustomInput, setShowGoogleCustomInput] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");
  const [googleTriggerSource, setGoogleTriggerSource] = useState<"login" | "register">("login");

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real addresses in Spain using OpenStreetMap Nominatim (Free, no keys needed)
  const handleAddressChange = async (val: string) => {
    setAddress(val);
    if (val.trim().length > 3) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val
          )}&countrycodes=es&limit=5&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((item: any) => {
            const road = item.address.road || item.address.pedestrian || "";
            const houseNumber = item.address.house_number || "";
            const cityVal = item.address.city || item.address.town || item.address.village || item.address.suburb || "";
            const postcode = item.address.postcode || "";
            return {
              address: [road, houseNumber].filter(Boolean).join(", "),
              city: cityVal,
              postalCode: postcode,
              displayName: item.display_name,
            };
          });
          setSuggestions(formatted);
        }
      } catch (e) {
        console.error("Error fetching autocompleted address:", e);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    setAddress(item.address || item.displayName.split(",")[0]);
    if (item.city) setCity(item.city);
    if (item.postalCode) setPostalCode(item.postalCode);
    setSuggestions([]);
  };

  // Submit standard login form
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
        setError("Credenciales incorrectas o usuario no encontrado. Si no tienes cuenta, regístrate abajo.");
      }
    } catch {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Google Login / Setup triggers
  const handleGoogleBtnClick = (source: "login" | "register") => {
    setGoogleTriggerSource(source);
    setShowGoogleModal(true);
  };

  // Handles choosing predefined demo account in Google Sign In
  const handleGoogleSelectAccount = async (selectedEmail: string) => {
    setShowGoogleModal(false);
    if (googleTriggerSource === "login") {
      setLoading(true);
      setError("");
      
      let demoPass = "admin";
      if (selectedEmail === "dr.sanz@clifav.com") demoPass = "doctor";
      else if (selectedEmail === "laura.gomez@clifav.com") demoPass = "therapist";
      
      try {
        const success = await login(selectedEmail, demoPass);
        if (!success) {
          setError("Error al iniciar sesión con cuenta Google.");
        }
      } catch {
        setError("Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    } else {
      // In register flow, selecting a demo account pre-populates details and goes to Step 3
      const nameFromEmail = selectedEmail.split("@")[0];
      const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      
      setRegisterName(displayName);
      setRegisterEmail(selectedEmail);
      setRegisterPassword("google-auth");
      setIsGoogleUser(true);
      setRegisterStep(3);
    }
  };

  // Handles custom Google login email submission
  const handleGoogleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCustomEmail || !googleCustomEmail.includes("@")) {
      alert("Por favor, introduce un correo de Google válido.");
      return;
    }

    const cleanEmail = googleCustomEmail.trim().toLowerCase();
    setShowGoogleModal(false);
    
    if (googleTriggerSource === "login") {
      setLoading(true);
      setError("");
      try {
        // Try logging in (Google users have "google-auth" as password)
        const success = await login(cleanEmail, "google-auth");
        if (success) {
          setLoading(false);
          return;
        }

        // If not found in login, automatically sign them up and redirect
        const nameFromEmail = cleanEmail.split("@")[0];
        const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
        
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: displayName,
            email: cleanEmail,
            password: "google-auth",
          }),
        });

        if (regRes.ok) {
          await login(cleanEmail, "google-auth");
        } else {
          const regData = await regRes.json();
          setError(regData.error || "Error al auto-registrar la cuenta de Google.");
        }
      } catch {
        setError("Error de red durante el inicio con Google.");
      } finally {
        setLoading(false);
      }
    } else {
      // In register, pre-populate Google email and go to Step 3
      const nameFromEmail = cleanEmail.split("@")[0];
      const displayName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      
      setRegisterName(displayName);
      setRegisterEmail(cleanEmail);
      setRegisterPassword("google-auth");
      setIsGoogleUser(true);
      setRegisterStep(3);
    }
  };

  // Final submit handler for step 4 (registers the user and creates clinic in one transaction)
  const handleRegisterFinish = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Call Register user endpoint
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim().toLowerCase(),
          password: registerPassword,
          phone: registerPhone.trim(),
        }),
      });

      let regUserResult: any;
      try {
        regUserResult = await regRes.json();
      } catch {
        setError("Error: respuesta inesperada del servidor al crear la cuenta.");
        setLoading(false);
        return;
      }

      if (!regRes.ok) {
        // Stay on step 4 so user doesn't lose their data
        setError(`Error al crear tu cuenta: ${regUserResult?.error || "Error desconocido (código " + regRes.status + ")"}`);
        setLoading(false);
        return;
      }

      const userId = regUserResult?.user?.id;
      if (!userId) {
        setError("Error: el servidor no devolvió un ID de usuario válido.");
        setLoading(false);
        return;
      }

      // 2. Call Create clinic endpoint
      const clinicAddress = `${address.trim()}, ${city.trim()} (${postalCode.trim()})`;
      const clinicRes = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicName.trim(),
          address: clinicAddress,
          userId: userId,
        }),
      });

      if (!clinicRes.ok) {
        let clinicErr = "Error al crear la clínica.";
        try { const d = await clinicRes.json(); clinicErr = d?.error || clinicErr; } catch {}
        setError(`Cuenta creada, pero ${clinicErr}`);
        setLoading(false);
        return;
      }

      // 3. Log in with the registered credentials
      const loggedIn = await login(registerEmail.trim().toLowerCase(), registerPassword);
      if (!loggedIn) {
        setError("Error al iniciar sesión tras registrar la consulta.");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Error inesperado: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    setError("");
    setIsRegistering(true);
    setRegisterStep(1);
    setIsGoogleUser(false);
    setRegisterName("");
    setRegisterPhone("");
    setRegisterEmail("");
    setRegisterPassword("");
    setClinicName("");
    setAddress("");
    setCity("");
    setPostalCode("");
  };

  const handleSwitchToLogin = () => {
    setError("");
    setIsRegistering(false);
  };

  return (
    <div className={styles.container}>
      {!isRegistering ? (
        /* STANDARD LOGIN FORM VIEW */
        <>
          <div className={styles.blob1}></div>
          <div className={styles.blob2}></div>

          <div className={`${styles.loginCard} glass`}>
            <div className={styles.header}>
              <div className={styles.logo}>LS</div>
              <h1 className={styles.title}>LlumSync</h1>
              <p className={styles.subtitle}>Gestión Integral de Centros Clínicos</p>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

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
              onClick={() => handleGoogleBtnClick("login")} 
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
          </div>
        </>
      ) : (
        /* FULL SCREEN SPLIT ONBOARDING FLOW (DOCFAV STYLE) */
        <div className={styles.wizardContainer}>
          {/* Left panel step tracker */}
          <div className={styles.leftPanel}>
            <div className={styles.logoArea}>
              <div className={styles.logoIcon}>LS</div>
              <span className={styles.logoText}>llumsync</span>
            </div>

            <span className={styles.stepsTitle}>TAN SOLO 4 PASOS PARA COMENZAR.</span>

            <div className={styles.stepsList}>
              <div className={`${styles.stepItem} ${registerStep === 1 ? styles.stepItemActive : registerStep > 1 ? styles.stepItemCompleted : ""}`}>
                <div className={styles.stepBadge}>1</div>
                <span className={styles.stepName}>Seleccione una opción</span>
              </div>

              <div className={`${styles.stepItem} ${registerStep === 2 ? styles.stepItemActive : registerStep > 2 ? styles.stepItemCompleted : ""}`}>
                <div className={styles.stepBadge}>2</div>
                <span className={styles.stepName}>Crear cuenta</span>
              </div>

              <div className={`${styles.stepItem} ${registerStep === 3 ? styles.stepItemActive : registerStep > 3 ? styles.stepItemCompleted : ""}`}>
                <div className={styles.stepBadge}>3</div>
                <span className={styles.stepName}>Datos de la consulta</span>
              </div>

              <div className={`${styles.stepItem} ${registerStep === 4 ? styles.stepItemActive : ""}`}>
                <div className={styles.stepBadge}>4</div>
                <span className={styles.stepName}>Personal</span>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepBadge} style={{ background: "transparent" }}>
                  <Icons.Plus size={14} style={{ color: "#557a6c" }} />
                </div>
                <span className={styles.stepName}>Empezar</span>
              </div>
            </div>
          </div>

          {/* Right panel step form */}
          <div className={styles.rightPanel}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            {registerStep === 1 && (
              /* STEP 1: CHOOSE HOW TO USE WIZARD */
              <div className={`${styles.card} fade-in`}>
                <h1 className={styles.cardTitle}>Cómo quiere utilizar LlumSync</h1>
                <p className={styles.cardSubtitle}>Seleccione la opción que está buscando</p>

                <div className={styles.usageGrid}>
                  <div 
                    className={`${styles.usageCard} ${usageOption === "software" ? styles.usageCardActive : ""}`}
                    onClick={() => setUsageOption("software")}
                  >
                    <span className={styles.usageIcon}>💙</span>
                    <h3 className={styles.usageTitle}>Software para clínica</h3>
                    <p className={styles.usageDesc}>Quiero gestionar las citas y mis pacientes con el software de gestión de LlumSync</p>
                  </div>

                  <div 
                    className={`${styles.usageCard} ${usageOption === "visibility" ? styles.usageCardActive : ""}`}
                    onClick={() => setUsageOption("visibility")}
                  >
                    <span className={styles.usageIcon}>⚡</span>
                    <h3 className={styles.usageTitle}>Quiero visibilidad</h3>
                    <p className={styles.usageDesc}>Quiero aparecer en el buscador cuando los pacientes busquen por profesionales</p>
                  </div>

                  <div 
                    className={`${styles.usageCard} ${usageOption === "both" ? styles.usageCardActive : ""}`}
                    onClick={() => setUsageOption("both")}
                  >
                    <span className={styles.usageIcon}>💪</span>
                    <h3 className={styles.usageTitle}>Visibilidad y software</h3>
                    <p className={styles.usageDesc}>Quiero utilizar todo el potencial de LlumSync para ganar visibilidad y utilizar el software</p>
                  </div>
                </div>

                <button 
                  onClick={() => setRegisterStep(2)} 
                  className={styles.continueBtn}
                >
                  <span>Continuar</span>
                  <Icons.Plus size={16} />
                </button>

                <div style={{ textAlign: "center", marginTop: "24px" }}>
                  <button onClick={handleSwitchToLogin} className={styles.backBtn}>
                    ¿Ya tienes cuenta? Inicia sesión
                  </button>
                </div>
              </div>
            )}

            {registerStep === 2 && (
              /* STEP 2: CREATE USER ACCOUNT */
              <form 
                onSubmit={(e) => { e.preventDefault(); setRegisterStep(3); }} 
                className={`${styles.card} fade-in`}
              >
                <h1 className={styles.cardTitle}>Acerca de ti</h1>
                <p className={styles.cardSubtitle}>Rellene la siguiente información</p>

                {isGoogleUser ? (
                  <div style={{ background: "rgba(46, 125, 50, 0.08)", padding: "12px 16px", borderRadius: "8px", border: "1px solid #2e7d32", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#1b5e20", fontWeight: 600 }}>
                    <span>✓ Iniciado sesión con Google como: {registerEmail}</span>
                  </div>
                ) : null}

                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Fernando López"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="Ej: 600000000"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="ejemplo@llumsync.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={isGoogleUser}
                    required
                  />
                </div>

                {!isGoogleUser && (
                  <div className="form-group">
                    <label className="form-label">Contraseña *</label>
                    <div className={styles.passwordContainer}>
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`input ${styles.passwordInput}`}
                        placeholder="Crea una contraseña segura"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Icons.Settings size={18} /> : <Icons.Plus size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className={styles.continueBtn}
                >
                  <span>Continuar</span>
                  <Icons.Plus size={16} />
                </button>

                {!isGoogleUser && (
                  <>
                    <div className={styles.divider}>
                      <span>o</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoogleBtnClick("register")}
                      className={styles.googleRegisterCard}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                      </svg>
                      Continuar con Google
                    </button>
                  </>
                )}

                <div className={styles.footerButtons}>
                  <button 
                    type="button" 
                    onClick={() => setRegisterStep(1)} 
                    className={styles.backBtn}
                  >
                    ← Atrás
                  </button>
                </div>
              </form>
            )}

            {registerStep === 3 && (
              /* STEP 3: CLINIC INFORMATION (DATOS DE LA CONSULTA) */
              <form 
                onSubmit={(e) => { e.preventDefault(); setRegisterStep(4); }} 
                className={`${styles.card} fade-in`}
              >
                <h1 className={styles.cardTitle}>Datos de la consulta</h1>
                <p className={styles.cardSubtitle}>Añade los datos de tu clínica para que configuremos tu menú.</p>

                <div className="form-group">
                  <label className="form-label">Tipo de consulta</label>
                  <div className={styles.typeContainer}>
                    {(["Física", "Online", "Domicilio"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`${styles.typeBtn} ${clinicType === type ? styles.typeBtnActive : ""}`}
                        onClick={() => setClinicType(type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre de la clínica (*)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Centro de Estética LlumSync"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group autocompleteContainer" ref={autocompleteRef}>
                  <label className="form-label">Dirección (*)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Empieza a escribir la dirección..."
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    required
                  />
                  {suggestions.length > 0 && (
                    <ul className={styles.autocompleteList}>
                      {suggestions.map((item, idx) => (
                        <li
                          key={idx}
                          className={styles.autocompleteItem}
                          onClick={() => handleSelectSuggestion(item)}
                        >
                          {item.address || item.displayName.split(",")[0]}, {item.city} ({item.postalCode})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ display: "flex", gap: "16px" }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Ciudad / Municipio (*)</label>
                    <input
                      type="text"
                      className="input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Código postal (*)</label>
                    <input
                      type="text"
                      className="input"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  <span>Acepto los términos y condiciones y la política de privacidad.</span>
                </label>

                <button 
                  type="submit" 
                  className={styles.continueBtn}
                  disabled={!clinicName || !address || !city || !postalCode || !termsAccepted}
                >
                  <span>Continuar</span>
                  <Icons.Plus size={16} />
                </button>

                <div className={styles.footerButtons}>
                  <button 
                    type="button" 
                    onClick={() => setRegisterStep(2)} 
                    className={styles.backBtn}
                  >
                    ← Atrás
                  </button>
                </div>
              </form>
            )}

            {registerStep === 4 && (
              /* STEP 4: SELECTION OF MEDICAL SPECIALTY (PERSONAL) */
              <div className={`${styles.card} fade-in`}>
                <h1 className={styles.cardTitle}>Personal</h1>
                <p className={styles.cardSubtitle}>Selecciona tu especialidad principal para comenzar.</p>

                <div className="form-group" style={{ marginTop: "24px" }}>
                  <label className="form-label">Especialidad (*)</label>
                  <select
                    className={styles.specialtySelect}
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                  >
                    {SPECIALTIES.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleRegisterFinish} 
                  className={styles.continueBtn}
                  disabled={loading}
                >
                  <span>{loading ? "Creando..." : "Empezar"}</span>
                  <Icons.Plus size={16} />
                </button>

                <div className={styles.footerButtons}>
                  <button 
                    type="button" 
                    onClick={() => setRegisterStep(3)} 
                    className={styles.backBtn}
                    disabled={loading}
                  >
                    ← Atrás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIMULATED GOOGLE LOGIN / REGISTER MODAL */}
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
