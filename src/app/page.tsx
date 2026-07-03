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
  const { login, loginWithUser } = useApp();
  
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

  // Google SDK integration
  useEffect(() => {
    // Dynamic load of official Google Identity Services SDK
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeGoogleAuth();
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Re-render Google buttons whenever page view updates
  useEffect(() => {
    const timer = setTimeout(() => {
      renderGoogleButtons();
    }, 150);
    return () => clearTimeout(timer);
  }, [isRegistering, registerStep]);

  const initializeGoogleAuth = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: "619688463085-9abm5uk9e44188qk8co8sn44cqhtf7aa.apps.googleusercontent.com",
        callback: handleGoogleAuthCallback,
      });
      renderGoogleButtons();
    }
  };

  const renderGoogleButtons = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      const loginBtnContainer = document.getElementById("google-login-btn");
      if (loginBtnContainer) {
        (window as any).google.accounts.id.renderButton(loginBtnContainer, {
          theme: "outline",
          size: "large",
          width: "370",
          text: "signin_with",
        });
      }

      const registerBtnContainer = document.getElementById("google-register-btn");
      if (registerBtnContainer) {
        (window as any).google.accounts.id.renderButton(registerBtnContainer, {
          theme: "outline",
          size: "large",
          width: "460",
          text: "signup_with",
        });
      }
    }
  };

  const handleGoogleAuthCallback = async (response: any) => {
    const credentialToken = response.credential;
    if (!credentialToken) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialToken }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (isRegistering) {
          // Pre-populate Step 2 and advance to Step 3
          setIsGoogleUser(true);
          setRegisterEmail(data.user.email);
          setRegisterName(data.user.name);
          setRegisterPassword("google-auth"); // placeholder for DB
          setRegisterStep(3);
        } else {
          // Log in instantly
          loginWithUser(data.user);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Error al autenticar con Google.");
      }
    } catch (err) {
      console.error("Google auth callback error:", err);
      setError("Error de conexión al autenticar con Google.");
    } finally {
      setLoading(false);
    }
  };

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

            <div 
              id="google-login-btn" 
              style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: "8px" }}
            ></div>

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

                    <div 
                      id="google-register-btn" 
                      style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: "8px" }}
                    ></div>
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
    </div>
  );
}
