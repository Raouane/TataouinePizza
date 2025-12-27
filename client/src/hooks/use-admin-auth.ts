import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Hook pour gérer l'authentification admin
 * Redirige vers /admin/login si pas de token
 */
export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
    }
  }, [token, setLocation]);

  return { token, isAuthenticated: !!token };
}

