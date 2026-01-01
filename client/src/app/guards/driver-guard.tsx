/**
 * Driver Guard V2
 * Protège les routes livreur
 */

import { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";

interface DriverGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function DriverGuard({ children, fallback = null }: DriverGuardProps) {
  const { user } = useAuth();

  if (user?.type !== "driver" || !user?.token) {
    return <>{fallback || <div>Accès refusé. Veuillez vous connecter en tant que livreur.</div>}</>;
  }

  return <>{children}</>;
}
