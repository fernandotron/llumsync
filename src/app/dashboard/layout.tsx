"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import ClinicWizard from "@/components/ClinicWizard";
import Chatbot from "@/components/Chatbot";
import { useApp } from "@/context/AppContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, user } = useApp();

  // If no user is logged in, layout is simple (children will redirect or render login)
  if (!user) {
    return <div style={{ minHeight: "100vh" }}>{children}</div>;
  }

  // If the user has no clinics yet, force them to complete onboarding clinic creation
  if (!user.clinics || user.clinics.length === 0) {
    return <ClinicWizard />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          flexGrow: 1,
          marginLeft: sidebarCollapsed ? "78px" : "260px",
          padding: "32px",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          backgroundColor: "var(--bg-app)",
          minWidth: 0, // prevents flex item overflow
        }}
      >
        <div className="fade-in">{children}</div>
      </main>
      <Chatbot />
    </div>
  );
}
