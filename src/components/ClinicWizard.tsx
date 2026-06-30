"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Icons } from "./Icons";
import styles from "./ClinicWizard.module.css";

const MOCK_ADDRESSES = [
  { address: "Calle de Luis Moya Blanco, 21", city: "Madrid", postalCode: "28055" },
  { address: "Calle de Serrano, 45", city: "Madrid", postalCode: "28001" },
  { address: "Gran Vía, 12", city: "Madrid", postalCode: "28013" },
  { address: "Avenida de la Constitución, 8", city: "Sevilla", postalCode: "41004" },
  { address: "Paseo de Gracia, 92", city: "Barcelona", postalCode: "08008" },
  { address: "Avenida de Blasco Ibáñez, 30", city: "Valencia", postalCode: "46021" },
  { address: "Calle de Colón, 15", city: "Valencia", postalCode: "46004" },
  { address: "Gran Vía de Don Diego López de Haro, 10", city: "Bilbao", postalCode: "48001" },
];

const SPECIALTIES = [
  "Médico estético",
  "Cirujano plástico",
  "Cirujano torácico",
  "Dentista",
  "Dentista infantil",
  "Dermatólogo",
  "Dermatólogo infantil",
  "Fisioterapeuta",
  "Osteópata",
  "Nutricionista",
  "Psicólogo",
];

export default function ClinicWizard() {
  const { user, addClinic } = useApp();
  const [step, setStep] = useState<3 | 4>(3); // Starting on step 3 as account creation is already done

  // Step 3 States
  const [clinicType, setClinicType] = useState<"Física" | "Online" | "Domicilio">("Física");
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Address Autocomplete
  const [suggestions, setSuggestions] = useState<typeof MOCK_ADDRESSES>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Step 4 States
  const [selectedSpecialty, setSelectedSpecialty] = useState("Médico estético");
  const [submitting, setSubmitting] = useState(false);

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

  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (val.trim().length > 2) {
      const filtered = MOCK_ADDRESSES.filter((item) =>
        item.address.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (item: typeof MOCK_ADDRESSES[0]) => {
    setAddress(item.address);
    setCity(item.city);
    setPostalCode(item.postalCode);
    setSuggestions([]);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName || !address || !city || !postalCode || !termsAccepted) return;
    setStep(4);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicName.trim(),
          address: `${address.trim()}, ${city.trim()} (${postalCode.trim()})`,
          userId: user.id,
        }),
      });

      if (res.ok) {
        const createdClinic = await res.json();
        // Link to user session context and active clinic state
        addClinic(createdClinic);
      } else {
        alert("Error al registrar el centro clínico");
      }
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error en la conexión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wizardContainer}>
      {/* Left panel steps flow indicator */}
      <div className={styles.leftPanel}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>CF</div>
          <span className={styles.logoText}>clifav</span>
        </div>

        <span className={styles.stepsTitle}>TAN SOLO 4 PASOS PARA COMENZAR.</span>

        <div className={styles.stepsList}>
          <div className={`${styles.stepItem} ${styles.stepItemCompleted}`}>
            <div className={styles.stepBadge}>1</div>
            <span className={styles.stepName}>Seleccione una opción</span>
          </div>

          <div className={`${styles.stepItem} ${styles.stepItemCompleted}`}>
            <div className={styles.stepBadge}>2</div>
            <span className={styles.stepName}>Crear cuenta</span>
          </div>

          <div className={`${styles.stepItem} ${step === 3 ? styles.stepItemActive : styles.stepItemCompleted}`}>
            <div className={styles.stepBadge}>3</div>
            <span className={styles.stepName}>Datos de la consulta</span>
          </div>

          <div className={`${styles.stepItem} ${step === 4 ? styles.stepItemActive : ""}`}>
            <div className={styles.stepBadge}>4</div>
            <span className={styles.stepName}>Personal</span>
          </div>
        </div>
      </div>

      {/* Right panel interactive form card */}
      <div className={styles.rightPanel}>
        {step === 3 ? (
          <form onSubmit={handleNextStep} className={styles.card}>
            <h1 className={styles.title}>Datos de la consulta</h1>
            <p className={styles.subtitle}>Añade los datos de tu clínica para que configuremos tu menú.</p>

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
                placeholder="Ej: Centro Estética Fernando"
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
                      {item.address}, {item.city} ({item.postalCode})
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
          </form>
        ) : (
          <div className={styles.card}>
            <h1 className={styles.title}>Elija especialidad</h1>
            <p className={styles.subtitle}>Selecciona la especialidad principal de tu consulta.</p>

            <div className={styles.specialtyList}>
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  className={`${styles.specialtyItem} ${selectedSpecialty === spec ? styles.specialtyItemActive : ""}`}
                  onClick={() => setSelectedSpecialty(spec)}
                >
                  {spec}
                </button>
              ))}
            </div>

            <div className={styles.footerButtons}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setStep(3)}
                disabled={submitting}
              >
                ← Atrás
              </button>

              <button
                type="button"
                className={styles.continueBtn}
                style={{ width: "200px", marginTop: 0 }}
                onClick={handleFinish}
                disabled={submitting}
              >
                {submitting ? "Creando..." : "Empezar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
