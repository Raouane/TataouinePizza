import { useState, useCallback } from "react";
import { updateOrderStatus, assignOrderToDriver } from "@/lib/api";
import type { Order } from "@/lib/api";
import { toast } from "sonner";
import { adminError } from "@/lib/admin-helpers";

/**
 * Hook pour gérer les commandes admin (actions uniquement)
 * Le polling est géré par useOrdersPolling
 */
export function useOrders(token: string | null) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const updateStatus = useCallback(async (orderId: string, newStatus: string, onSuccess?: () => void) => {
    if (!token) {
      toast.error("Non authentifié");
      return;
    }

    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, token);
      toast.success("Statut mis à jour");
      onSuccess?.();
    } catch (err: any) {
      adminError("Erreur lors de la mise à jour:", err);
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setUpdating(null);
    }
  }, [token]);

  const assignDriver = useCallback(async (orderId: string, driverId: string, onSuccess?: () => void) => {
    if (!token) {
      toast.error("Non authentifié");
      return;
    }

    setAssigning(orderId);
    try {
      await assignOrderToDriver(orderId, driverId, token);
      toast.success("Livreur assigné");
      onSuccess?.();
    } catch (err: any) {
      adminError("Erreur lors de l'assignation:", err);
      toast.error(err.message || "Erreur lors de l'assignation");
    } finally {
      setAssigning(null);
    }
  }, [token]);

  return {
    updating,
    assigning,
    updateStatus,
    assignDriver,
  };
}

