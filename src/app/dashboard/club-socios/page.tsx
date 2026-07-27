"use client";

import React, { useState } from "react";
import LoyaltyMembersView from "@/components/LoyaltyMembersView";
import LoyaltyCardDesigner from "@/components/LoyaltyCardDesigner";
import { Icons } from "@/components/Icons";

export default function ClubSociosPage() {
  const [currentTab, setCurrentTab] = useState<"members" | "designer">("members");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Section Selector Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          background: "var(--bg-card)",
          padding: "6px",
          borderRadius: "14px",
          border: "1px solid var(--border-color)",
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setCurrentTab("members")}
          style={{
            padding: "10px 22px",
            borderRadius: "10px",
            border: "none",
            background: currentTab === "members" ? "var(--primary)" : "transparent",
            color: currentTab === "members" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icons.Users size={18} /> 👥 Gestión y Listado de Socios
        </button>

        <button
          onClick={() => setCurrentTab("designer")}
          style={{
            padding: "10px 22px",
            borderRadius: "10px",
            border: "none",
            background: currentTab === "designer" ? "var(--primary)" : "transparent",
            color: currentTab === "designer" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icons.CreditCard size={18} /> 🎨 Diseñador de Plantillas (Tipo Canva)
        </button>
      </div>

      {/* Render selected view */}
      {currentTab === "members" ? <LoyaltyMembersView /> : <LoyaltyCardDesigner />}
    </div>
  );
}
