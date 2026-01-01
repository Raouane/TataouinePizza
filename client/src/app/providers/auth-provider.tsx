/**
 * Auth Provider V2
 * Gère l'authentification globale de l'application
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    type: "admin" | "driver" | "restaurant" | "customer";
    id?: string;
    token?: string;
  } | null;
  login: (type: "admin" | "driver" | "restaurant" | "customer", token: string, id?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextType["user"]>(null);

  useEffect(() => {
    // Vérifier les tokens existants au démarrage
    const adminToken = localStorage.getItem("adminToken");
    const driverToken = localStorage.getItem("driverToken");
    const restaurantToken = localStorage.getItem("restaurantToken");

    if (adminToken) {
      setUser({ type: "admin", token: adminToken });
    } else if (driverToken) {
      setUser({ type: "driver", token: driverToken });
    } else if (restaurantToken) {
      setUser({ type: "restaurant", token: restaurantToken });
    } else {
      setUser({ type: "customer" });
    }
  }, []);

  const login = (type: "admin" | "driver" | "restaurant" | "customer", token: string, id?: string) => {
    // Sauvegarder le token selon le type
    if (type === "admin") {
      localStorage.setItem("adminToken", token);
    } else if (type === "driver") {
      localStorage.setItem("driverToken", token);
    } else if (type === "restaurant") {
      localStorage.setItem("restaurantToken", token);
    }

    setUser({ type, token, id });
  };

  const logout = () => {
    // Supprimer tous les tokens
    localStorage.removeItem("adminToken");
    localStorage.removeItem("driverToken");
    localStorage.removeItem("restaurantToken");
    setUser({ type: "customer" });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user?.token || user?.type === "customer",
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
