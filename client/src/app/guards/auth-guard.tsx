/**
 * Auth Guard V2
 * Protège les routes nécessitant une authentification
 */

import { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
