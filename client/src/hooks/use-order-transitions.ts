/**
 * Hook pour récupérer les transitions de statut autorisées pour une commande
 * Utilise la source de vérité unique côté backend
 */

import { useQuery } from "@tanstack/react-query";

/**
 * Récupère les transitions de statut autorisées pour une commande
 * @param orderId ID de la commande (null si pas encore créée)
 * @returns Liste des statuts vers lesquels la commande peut transitionner
 */
export function useOrderTransitions(orderId: string | null): {
  transitions: string[];
  isLoading: boolean;
  error: Error | null;
  canTransition: (newStatus: string) => boolean;
} {
  const { data, isLoading, error } = useQuery<{ transitions: string[] }>({
    queryKey: ["order-transitions", orderId],
    queryFn: async () => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const res = await fetch(`/api/orders/${orderId}/transitions`);
      if (!res.ok) {
        throw new Error(`Failed to fetch transitions: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!orderId,
    staleTime: 30000, // Cache 30 secondes
  });

  const transitions = data?.transitions || [];
  
  const canTransition = (newStatus: string): boolean => {
    return transitions.includes(newStatus);
  };

  return {
    transitions,
    isLoading,
    error: error as Error | null,
    canTransition,
  };
}
