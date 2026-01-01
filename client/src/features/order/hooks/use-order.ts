/**
 * Hook useOrder V2
 * Gère la logique métier pour une commande
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder, createOrder, getCustomerOrders } from "../order.api";
import type { CreateOrderInput } from "../order.types";

/**
 * Hook pour récupérer une commande
 */
export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => {
      if (!orderId) throw new Error("Order ID is required");
      return getOrder(orderId);
    },
    enabled: !!orderId,
  });
}

/**
 * Hook pour créer une commande
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (data) => {
      // Invalider les queries liées aux commandes
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Précharger la commande créée
      queryClient.setQueryData(["order", data.orderId], data);
    },
  });
}

/**
 * Hook pour récupérer les commandes d'un client
 */
export function useCustomerOrders(phone: string | null) {
  return useQuery({
    queryKey: ["customer-orders", phone],
    queryFn: () => {
      if (!phone) throw new Error("Phone is required");
      return getCustomerOrders(phone);
    },
    enabled: !!phone,
  });
}
