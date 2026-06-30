"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import styles from "./page.module.css";

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        setError("Credenciales incorrectas o usuario no encontrado. Utiliza una de las cuentas de demostración abajo.");
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

  const handleGoogleLogin = () => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      // Simulate Google Login selecting admin@clifav.com
      handleDemoLogin("admin@clifav.com");
    }, 1000);
  };

  return (
    <div className={styles.container}>
      {/* Background blobs */}
      <div className={styles.blob1}></div>
      <div className={styles.blob2}></div>

      <div className={`${styles.loginCard} glass`}>
        <div className={styles.header}>
          <div className={styles.logo}>CF</div>
          <h1 className={styles.title}>Clifav</h1>
          <p className={styles.subtitle}>Gestión Integral de Centros Clínicos</p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="ejemplo@clifav.com"
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
          onClick={handleGoogleLogin} 
          className="btn btn-secondary" 
          style={{ width: "100%", display: "flex", gap: "10px", alignItems: "center" }}
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

        <div className={styles.demoAccounts}>
          <h3>Cuentas de demostración (clic para entrar)</h3>
          <div className={styles.demoList}>
            <button className={styles.demoBtn} onClick={() => handleDemoLogin("admin@clifav.com")}>
              <strong>Directora:</strong> admin@clifav.com <span className={styles.roleBadge}>Admin</span>
            </button>
            <button className={styles.demoBtn} onClick={() => handleDemoLogin("dr.sanz@clifav.com")}>
              <strong>Fisioterapeuta:</strong> dr.sanz@clifav.com <span className={styles.roleBadge}>Doctor</span>
            </button>
            <button className={styles.demoBtn} onClick={() => handleDemoLogin("laura.gomez@clifav.com")}>
              <strong>Osteópata:</strong> laura.gomez@clifav.com <span className={styles.roleBadge}>Personal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
