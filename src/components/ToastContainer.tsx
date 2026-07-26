"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  show: (message: string, type: "success" | "error" | "info" | "warning" = "success", title?: string, duration: number = 3500) => {
    const item: ToastItem = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title: title || (type === "success" ? "¡Guardado con éxito!" : type === "error" ? "Error" : type === "warning" ? "Atención" : "Información"),
      message,
      duration,
    };
    listeners.forEach((l) => l(item));
  },
  success: (message: string, title?: string, duration?: number) => {
    toast.show(message, "success", title, duration);
  },
  error: (message: string, title?: string, duration?: number) => {
    toast.show(message, "error", title, duration);
  },
  info: (message: string, title?: string, duration?: number) => {
    toast.show(message, "info", title, duration);
  },
  warning: (message: string, title?: string, duration?: number) => {
    toast.show(message, "warning", title, duration);
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleAdd = (item: ToastItem) => {
      setToasts((prev) => [...prev, item]);
    };
    listeners.add(handleAdd);
    return () => {
      listeners.delete(handleAdd);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!mounted || typeof window === "undefined") return null;

  return createPortal(
    <div className={styles.toastContainer}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>,
    document.body
  );
}

function ToastCard({ toast: tItem, onClose }: { toast: ToastItem; onClose: () => void }) {
  const duration = tItem.duration || 3500;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (tItem.type) {
      case "success":
        return <IconCheck />;
      case "error":
        return <IconX />;
      case "warning":
        return <IconWarn />;
      case "info":
      default:
        return <IconInfo />;
    }
  };

  const cardClass = `${styles.toastCard} ${
    tItem.type === "success"
      ? styles.toastCardSuccess
      : tItem.type === "error"
      ? styles.toastCardError
      : tItem.type === "warning"
      ? styles.toastCardWarning
      : styles.toastCardInfo
  }`;

  const iconClass = `${styles.iconWrapper} ${
    tItem.type === "success"
      ? styles.iconSuccess
      : tItem.type === "error"
      ? styles.iconError
      : tItem.type === "warning"
      ? styles.iconWarning
      : styles.iconInfo
  }`;

  const progressClass = `${styles.progressBar} ${
    tItem.type === "success"
      ? styles.progressBarSuccess
      : tItem.type === "error"
      ? styles.progressBarError
      : tItem.type === "warning"
      ? styles.progressBarWarning
      : styles.progressBarInfo
  }`;

  return (
    <div className={cardClass}>
      <div className={iconClass}>{getIcon()}</div>
      <div className={styles.toastContent}>
        <h4 className={styles.toastTitle}>{tItem.title}</h4>
        <p className={styles.toastMessage}>{tItem.message}</p>
      </div>
      <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
        ✕
      </button>
      <div className={progressClass} style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}
