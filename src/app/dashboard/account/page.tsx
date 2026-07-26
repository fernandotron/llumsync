"use client";

import React, { useState, useEffect } from "react";
import { toast } from "@/components/ToastContainer";
import { useApp } from "@/context/AppContext";
import { translate } from "@/lib/translations";
import styles from "./Account.module.css";

const TIMEZONES = [
  "Europa/Madrid (UTC+02:00)",
  "Europa/Londres (UTC+00:00)",
  "America/Bogota (UTC-05:00)",
  "America/Mexico_City (UTC-06:00)",
  "America/New_York (UTC-05:00)",
  "America/Caracas (UTC-04:00)",
  "America/Lima (UTC-05:00)",
  "America/Santiago (UTC-04:00)",
  "America/Buenos_Aires (UTC-03:00)"
];

export default function AccountPage() {
  const { user, activeClinic, loginWithUser, language, setLanguage } = useApp();
  const [activeTab, setActiveTab] = useState<"cuenta" | "facturacion">("cuenta");
  
  // Sub-tabs states
  const [activeSubTabCuenta, setActiveSubTabCuenta] = useState<"prefs" | "security">("prefs");
  const [activeSubTabFacturacion, setActiveSubTabFacturacion] = useState<"subscription" | "billing_details" | "invoices">("subscription");

  // Form states for Personal Preferences
  const [formName, setFormName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTimezone, setFormTimezone] = useState("Europa/Madrid (UTC+02:00)");
  const [formLanguage, setFormLanguage] = useState("Español");

  // Form states for Password & Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);

  // Clinic Fiscal Profile states
  const [fiscalProfile, setFiscalProfile] = useState<any>(null);
  const [fiscalEntityType, setFiscalEntityType] = useState("Empresa");
  const [fiscalComercialName, setFiscalComercialName] = useState("");
  const [fiscalNif, setFiscalNif] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [fiscalMunicipality, setFiscalMunicipality] = useState("");
  const [fiscalPostalCode, setFiscalPostalCode] = useState("");

  // Subscription users count
  const [activeUsersCount, setActiveUsersCount] = useState(6);

  // Subscription Invoices list (issued by llumsync to this account)
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initialize form fields with user data
  useEffect(() => {
    if (user) {
      setFormName(user.name || "");
      // Fetch fresh profile info to get additional fields like lastName, phone
      fetch(`/api/users/${user.id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load user details");
        })
        .then((data) => {
          setFormLastName(data.lastName || "");
          setFormPhone(data.phone || "");
          setFormEmail(data.email || "");
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [user]);

  // Load active clinic's users count, fiscal profile and invoices/sales
  useEffect(() => {
    if (activeClinic) {
      // 1. Fetch users count for subscription
      fetch(`/api/users?clinicId=${activeClinic.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setActiveUsersCount(data.length);
          }
        })
        .catch((err) => console.error(err));

      // 2. Fetch fiscal profile
      fetch(`/api/fiscal-profiles?clinicId=${activeClinic.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const profile = data[0];
            setFiscalProfile(profile);
            setFiscalEntityType(profile.entityType || "Empresa");
            setFiscalComercialName(profile.comercialName || "");
            setFiscalNif(profile.nif || "");
            setFiscalAddress(profile.address || "");
            setFiscalMunicipality(profile.municipality || "");
            setFiscalPostalCode(profile.postalCode || "");
          } else {
            setFiscalProfile(null);
            setFiscalEntityType("Empresa");
            setFiscalComercialName("");
            setFiscalNif("");
            setFiscalAddress("");
            setFiscalMunicipality("");
            setFiscalPostalCode("");
          }
        })
        .catch((err) => console.error(err));

      // 3. Fetch subscription invoices (currently empty since no charges have been made)
      setLoadingInvoices(true);
      setTimeout(() => {
        setSubscriptionInvoices([]);
        setLoadingInvoices(false);
      }, 100);
    }
  }, [activeClinic]);

  // Sync language dropdown with global language context
  useEffect(() => {
    setFormLanguage(language || "Español");
  }, [language]);

  if (!user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        <div style={{ width: 24, height: 24, border: "3px solid var(--border-color)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const showBilling = user.role === "ADMIN";

  // Handle saving Personal Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          lastName: formLastName,
          phone: formPhone,
          email: formEmail,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        // Update AppContext
        loginWithUser({
          ...user,
          name: updatedUser.name,
          email: updatedUser.email,
        });

        // Set Language
        setLanguage(formLanguage);

        setNotification({
          type: "success",
          message: translate("saveSuccess", formLanguage),
        });
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: translate("saveError", formLanguage),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle saving Password & Security
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!newPassword.trim()) {
      setNotification({
        type: "error",
        message: translate("passEmpty", language),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotification({
        type: "error",
        message: translate("passMismatch", language),
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: translate("saveSuccess", language),
        });
        setNewPassword("");
        setConfirmPassword("");
        setLogoutAllDevices(false);
      } else {
        throw new Error("Failed to update password");
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: translate("saveError", language),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle saving Fiscal Profile (Datos de Facturación)
  const handleSaveFiscalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
      const isUpdate = !!fiscalProfile;
      const url = isUpdate ? `/api/fiscal-profiles/${fiscalProfile.id}` : `/api/fiscal-profiles`;
      const method = isUpdate ? "PUT" : "POST";

      const payload: any = {
        entityType: fiscalEntityType,
        comercialName: fiscalComercialName,
        nif: fiscalNif,
        address: fiscalAddress,
        municipality: fiscalMunicipality,
        postalCode: fiscalPostalCode,
      };

      if (!isUpdate) {
        payload.clinicId = activeClinic?.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setFiscalProfile(data);
        setNotification({
          type: "success",
          message: translate("saveSuccess", language),
        });
      } else {
        throw new Error("Failed to save fiscal profile");
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        message: translate("saveError", language),
      });
    } finally {
      setLoading(false);
    }
  };

  const t = (key: string) => translate(key, language);

  // Subscription Calculations: €50 base (includes up to 5 users), extra users = €3 each
  const extraUsersCount = Math.max(0, activeUsersCount - 5);
  const calculatedTotalRate = 50.00 + extraUsersCount * 3.00;

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumb}>
        <span>{t("myAccount")}</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>{t("personalData")}</span>
      </div>

      {/* Title */}
      <h1 className={styles.title}>{t("personalData")}</h1>

      {/* Main Tabs */}
      <div className={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab("cuenta")}
          className={`${styles.tabBtn} ${activeTab === "cuenta" ? styles.tabBtnActive : ""}`}
        >
          {t("tabAccount")}
        </button>
        {showBilling && (
          <button
            onClick={() => setActiveTab("facturacion")}
            className={`${styles.tabBtn} ${activeTab === "facturacion" ? styles.tabBtnActive : ""}`}
          >
            {t("tabBilling")}
          </button>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div 
          className={`${styles.notification} ${notification.type === "success" ? styles.successNotification : styles.errorNotification}`}
          style={{ maxWidth: "480px" }}
        >
          {notification.message}
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === "cuenta" ? (
        <div>
          {/* Sub Tabs for CUENTA */}
          <div className={styles.subTabsContainer}>
            <button
              onClick={() => setActiveSubTabCuenta("prefs")}
              className={`${styles.subTabBtn} ${activeSubTabCuenta === "prefs" ? styles.subTabBtnActive : ""}`}
            >
              {t("subTabPrefs")}
            </button>
            <button
              onClick={() => setActiveSubTabCuenta("security")}
              className={`${styles.subTabBtn} ${activeSubTabCuenta === "security" ? styles.subTabBtnActive : ""}`}
            >
              {t("subTabSecurity")}
            </button>
          </div>

          {/* Sub Tab Panes */}
          {activeSubTabCuenta === "prefs" ? (
            <div className={styles.pane}>
              <form onSubmit={handleSavePreferences}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("name")}</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("lastName")}</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("phone")}</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("email")}</label>
                  <input
                    type="email"
                    required
                    className={styles.input}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("timezone")}</label>
                  <select
                    className={styles.select}
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("language")}</label>
                  <select
                    className={styles.select}
                    value={formLanguage}
                    onChange={(e) => {
                      setFormLanguage(e.target.value);
                      setLanguage(e.target.value);
                    }}
                  >
                    <option value="Español">Español</option>
                    <option value="Català">Català</option>
                    <option value="English">English</option>
                    <option value="Euskera">Euskera</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className={styles.saveBtn}>
                  {loading ? "..." : t("save")}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className={styles.pane}>
                <form onSubmit={handleSaveSecurity}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("newPassword")} *</label>
                    <input
                      type="password"
                      required
                      className={styles.input}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("confirmPassword")} *</label>
                    <input
                      type="password"
                      required
                      className={styles.input}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div 
                    className={styles.checkboxContainer}
                    onClick={() => setLogoutAllDevices(!logoutAllDevices)}
                  >
                    <input
                      type="checkbox"
                      checked={logoutAllDevices}
                      onChange={() => {}}
                      style={{ cursor: "pointer" }}
                    />
                    <span className={styles.checkboxLabel}>{t("logoutDevices")}</span>
                  </div>
                  <button type="submit" disabled={loading} className={styles.primaryActionBtn}>
                    {loading ? "..." : t("save")}
                  </button>
                </form>
              </div>

              {/* 2FA Card */}
              <div className={styles.securityCard}>
                <p className={styles.securityText}>
                  {t("doubleFactorTitle")}
                </p>
                <button
                  type="button"
                  onClick={() => toast.success("MFA Activation flow simulation")}
                  className={styles.primaryActionBtn}
                  style={{ background: "#0ea5e9" }}
                >
                  {t("activate2FA")}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* FACTURACIÓN Tab (Only visible to Admin) */
        <div className={styles.billingLayout}>
          {/* Sub Tabs for FACTURACIÓN */}
          <div className={styles.subTabsContainer}>
            <button
              onClick={() => setActiveSubTabFacturacion("subscription")}
              className={`${styles.subTabBtn} ${activeSubTabFacturacion === "subscription" ? styles.subTabBtnActive : ""}`}
            >
              {t("subTabSubscription")}
            </button>
            <button
              onClick={() => setActiveSubTabFacturacion("billing_details")}
              className={`${styles.subTabBtn} ${activeSubTabFacturacion === "billing_details" ? styles.subTabBtnActive : ""}`}
            >
              {t("subTabBillingDetails")}
            </button>
            <button
              onClick={() => setActiveSubTabFacturacion("invoices")}
              className={`${styles.subTabBtn} ${activeSubTabFacturacion === "invoices" ? styles.subTabBtnActive : ""}`}
            >
              {t("subTabInvoices")}
            </button>
          </div>

          {/* Sub Tab Panes under FACTURACIÓN */}
          {activeSubTabFacturacion === "subscription" ? (
            /* SUSCRIPCIÓN tab content */
            <div className={styles.pane}>
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#008fa3", marginBottom: "4px" }}>{t("subscriptionLabel")}</h3>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>{t("subscriptionActive")}</span>
              </div>
              
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase" }}>{t("manageSubscription")}</h3>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("activeUsers")}</label>
                  <input type="text" disabled className={styles.input} value={activeUsersCount} style={{ opacity: 0.85 }} />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{t("extraUserCost")}</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("totalLabel")}</label>
                  <input 
                    type="text" 
                    disabled 
                    className={styles.input} 
                    value={`${calculatedTotalRate.toFixed(2)}€ ${t("perMonth")}`} 
                    style={{ opacity: 0.85 }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{t("priceExcludesTax")}</span>
                </div>
              </div>
            </div>
          ) : activeSubTabFacturacion === "billing_details" ? (
            /* DATOS DE FACTURACIÓN tab content */
            <div className={styles.pane}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase" }}>{t("billingDataTitle")}</h3>
              <form onSubmit={handleSaveFiscalProfile}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("accountType")}</label>
                  <select
                    className={styles.select}
                    value={fiscalEntityType}
                    onChange={(e) => setFiscalEntityType(e.target.value)}
                  >
                    <option value="Empresa">{t("company")}</option>
                    <option value="Particular">{t("individual")}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("businessName")} *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={fiscalComercialName}
                    onChange={(e) => setFiscalComercialName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("nif")} *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={fiscalNif}
                    onChange={(e) => setFiscalNif(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("country")}</label>
                  <select className={styles.select} disabled style={{ opacity: 0.8 }}>
                    <option value="ES">Spain (España)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("street")} *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={fiscalAddress}
                    onChange={(e) => setFiscalAddress(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("city")} *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={fiscalMunicipality}
                    onChange={(e) => setFiscalMunicipality(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t("postalCode")} *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={fiscalPostalCode}
                    onChange={(e) => setFiscalPostalCode(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className={styles.primaryActionBtn} style={{ marginTop: "8px" }}>
                  {loading ? "..." : t("save")}
                </button>
              </form>
            </div>
          ) : (
            /* HISTÓRICO DE FACTURAS tab content */
            <div className={styles.tableCard} style={{ maxWidth: "800px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>{t("invoiceHistoryTitle")}</h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {t("invoiceHistoryDesc")}
                </p>
              </div>
              {loadingInvoices ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>{t("loadingInvoices")}</div>
              ) : subscriptionInvoices.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                  {t("noInvoices")}
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>{t("invoiceNumber")}</th>
                      <th className={styles.th}>{t("invoiceDate")}</th>
                      <th className={styles.th}>{t("invoiceConcept")}</th>
                      <th className={styles.th}>{t("invoiceTotal")}</th>
                      <th className={styles.th}>{t("invoiceStatus")}</th>
                      <th className={styles.th}>{t("invoiceActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionInvoices.map((sale) => {
                      let concept = t("invoiceDefaultConcept");
                      try {
                        const items = JSON.parse(sale.itemsJson);
                        if (Array.isArray(items) && items.length > 0) {
                          concept = items.map((it: any) => it.name).join(", ");
                        }
                      } catch (e) {
                        console.error("Failed to parse itemsJson", e);
                      }

                      return (
                        <tr key={sale.id}>
                          <td className={styles.td} style={{ fontWeight: "600" }}>{sale.invoiceNumber}</td>
                          <td className={styles.td}>{new Date(sale.createdAt).toLocaleDateString("es-ES")}</td>
                          <td className={styles.td} style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                            {concept}
                          </td>
                          <td className={styles.td} style={{ fontWeight: "600" }}>{sale.total.toFixed(2)} €</td>
                          <td className={styles.td}><span className={styles.badge}>{t("invoicePaid")}</span></td>
                          <td className={styles.td}>
                            <button 
                              onClick={() => toast.success(`${t("invoiceDownload")} ${sale.invoiceNumber}.pdf...`)} 
                              className={styles.primaryActionBtn} 
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              {t("invoiceDownload")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
