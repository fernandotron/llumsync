"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "THERAPIST" | "RECEPTIONIST";
  clinics: Clinic[];
  permissionsJson?: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  controlHorarioActivo?: boolean;
  notifyAssignedUser?: boolean;
  adminNotificationUserIds?: string;
  senderEmail?: string;
  defaultWhatsappMode?: string;
}


interface AppContextType {
  user: User | null;
  activeClinic: Clinic | null;
  setActiveClinic: (clinic: Clinic) => void;
  addClinic: (clinic: Clinic) => void;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithUser: (userData: User) => void;
  logout: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeClinic, setActiveClinicState] = useState<Clinic | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const pathname = usePathname();

  // Load theme and apply it to document element
  useEffect(() => {
    const savedTheme = localStorage.getItem("clifav_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("clifav_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Load session on startup and fetch fresh user/clinic data
  useEffect(() => {
    const savedUser = localStorage.getItem("clifav_user");
    const savedClinic = localStorage.getItem("clifav_active_clinic");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (savedClinic) {
        setActiveClinicState(JSON.parse(savedClinic));
      } else if (parsedUser.clinics && parsedUser.clinics.length > 0) {
        setActiveClinicState(parsedUser.clinics[0]);
      }

      // Fetch fresh data from the server to keep session synced
      fetch(`/api/users/${parsedUser.id}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to sync user data");
        })
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem("clifav_user", JSON.stringify(freshUser));
          
          // Also sync active clinic if present
          if (savedClinic) {
            const parsedClinic = JSON.parse(savedClinic);
            const freshClinic = freshUser.clinics?.find((c: any) => c.id === parsedClinic.id);
            if (freshClinic) {
              setActiveClinicState(freshClinic);
              localStorage.setItem("clifav_active_clinic", JSON.stringify(freshClinic));
            }
          } else if (freshUser.clinics && freshUser.clinics.length > 0) {
            setActiveClinicState(freshUser.clinics[0]);
            localStorage.setItem("clifav_active_clinic", JSON.stringify(freshUser.clinics[0]));
          }
        })
        .catch((err) => {
          console.error("Session sync error:", err);
        });
    } else {
      if (pathname !== "/") {
        router.push("/");
      }
    }
  }, [pathname, router]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Standard mock API call for credentials
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("clifav_user", JSON.stringify(data.user));
        if (data.user.clinics && data.user.clinics.length > 0) {
          setActiveClinicState(data.user.clinics[0]);
          localStorage.setItem("clifav_active_clinic", JSON.stringify(data.user.clinics[0]));
        }
        router.push("/dashboard/agenda");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginWithUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem("clifav_user", JSON.stringify(userData));
    if (userData.clinics && userData.clinics.length > 0) {
      setActiveClinicState(userData.clinics[0]);
      localStorage.setItem("clifav_active_clinic", JSON.stringify(userData.clinics[0]));
    }
    router.push("/dashboard/agenda");
  };

  const logout = () => {
    setUser(null);
    setActiveClinicState(null);
    localStorage.removeItem("clifav_user");
    localStorage.removeItem("clifav_active_clinic");
    router.push("/");
  };

  const setActiveClinic = (clinic: Clinic) => {
    setActiveClinicState(clinic);
    localStorage.setItem("clifav_active_clinic", JSON.stringify(clinic));
  };

  const addClinic = (clinic: Clinic) => {
    if (user) {
      const updatedUser = {
        ...user,
        clinics: [...(user.clinics || []), clinic],
      };
      setUser(updatedUser);
      localStorage.setItem("clifav_user", JSON.stringify(updatedUser));
      setActiveClinicState(clinic);
      localStorage.setItem("clifav_active_clinic", JSON.stringify(clinic));
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        activeClinic,
        setActiveClinic,
        addClinic,
        login,
        loginWithUser,
        logout,
        sidebarCollapsed,
        setSidebarCollapsed,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
