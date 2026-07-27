"use client";

import React, { useState } from "react";
import CashRegisterView from "@/components/CashRegisterView";
import DailyRegisterView from "@/components/DailyRegisterView";
import LoyaltyMembersView from "@/components/LoyaltyMembersView";

export default function CashRegisterPage() {
  const [currentTab, setCurrentTab] = useState<"cash" | "daily" | "loyalty">("cash");

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
          onClick={() => setCurrentTab("cash")}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: currentTab === "cash" ? "var(--primary)" : "transparent",
            color: currentTab === "cash" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          💰 Control y Arqueo de Caja
        </button>

        <button
          onClick={() => setCurrentTab("daily")}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: currentTab === "daily" ? "var(--primary)" : "transparent",
            color: currentTab === "daily" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          📖 Libro Diario de Consultas
        </button>

        <button
          onClick={() => setCurrentTab("loyalty")}
          style={{
            padding: "10px 20px",
            borderRadius: "10px",
            border: "none",
            background: currentTab === "loyalty" ? "var(--primary)" : "transparent",
            color: currentTab === "loyalty" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          💳 Club de Socios y Fidelización
        </button>
      </div>

      {/* Render selected view */}
      {currentTab === "cash" ? (
        <CashRegisterView />
      ) : currentTab === "daily" ? (
        <DailyRegisterView />
      ) : (
        <LoyaltyMembersView />
      )}
    </div>
  );
}
