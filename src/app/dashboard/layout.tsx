"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import ClinicWizard from "@/components/ClinicWizard";
import Chatbot from "@/components/Chatbot";
import { useApp } from "@/context/AppContext";
import { Icons } from "@/components/Icons";
import styles from "./Layout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, user, activeClinic, mobileSidebarOpen, setMobileSidebarOpen } = useApp();

  // If no user is logged in, layout is simple (children will redirect or render login)
  if (!user) {
    return <div style={{ minHeight: "100vh" }}>{children}</div>;
  }

  // If the user has no clinics yet, force them to complete onboarding clinic creation
  if (!user.clinics || user.clinics.length === 0) {
    return <ClinicWizard />;
  }

  const userInitials = user.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "VL";

  return (
    <div className={styles.layoutContainer}>
      {/* Top mobile header bar */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.menuBtn} 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          aria-label="Abrir menú"
        >
          <Icons.Menu size={20} />
        </button>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>LS</div>
          <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeClinic?.name || "LLUMSYNC"}
          </span>
        </div>
        <div className={styles.userAvatar}>
          {userInitials}
        </div>
      </header>

      <Sidebar />
      <main
        className={styles.mainContent}
        style={{
          marginLeft: sidebarCollapsed ? "78px" : "260px",
          padding: "32px",
        }}
      >
        <div className="fade-in">{children}</div>
      </main>
      <Chatbot />
    </div>
  );
}
