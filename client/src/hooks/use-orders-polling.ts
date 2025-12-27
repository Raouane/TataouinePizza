import { useState, useEffect, useRef, useCallback } from "react";
import { getAdminOrders } from "@/lib/api";
import type { Order } from "@/lib/api";
import { adminError } from "@/lib/admin-helpers";

/**
 * Hook pour le polling des commandes admin
 * Utilise AbortController pour éviter les fuites mémoire
 */
export function useOrdersPolling(token: string | null, intervalMs: number = 5000) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const data = await getAdminOrders(token);
      if (!abortController.signal.aborted) {
        setOrders(data);
        setLoading(false);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      adminError("Erreur lors du chargement des commandes:", err);
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    fetchOrders();
    const interval = setInterval(fetchOrders, intervalMs);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [token, fetchOrders, intervalMs]);

  return { orders, loading, refetch: fetchOrders, setOrders };
}

