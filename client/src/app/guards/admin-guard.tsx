/**
 * Admin Guard V2
 * Protège les routes admin
 */

import { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGuard({ children, fallback = null }: AdminGuardProps) {
  const { user } = useAuth();

  if (user?.type !== "admin" || !user?.token) {
    return <>{fallback || <div>Accès refusé. Veuillez vous connecter en tant qu'administrateur.</div>}</>;
  }

  return <>{children}</>;
}
