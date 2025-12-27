/**
 * Statuts de commande centralisés - Version MVP simplifiée
 * Utilisé pour éviter les duplications et assurer la cohérence
 * 
 * MVP Workflow simplifié: PENDING → ACCEPTED → READY → DELIVERY → DELIVERED
 * Les statuts PREPARING et BAKING ont été supprimés pour simplifier le workflow
 */

export enum OrderStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  READY = "ready",
  DELIVERY = "delivery",
  DELIVERED = "delivered",
  REJECTED = "rejected",
}

/**
 * Règles de transition de statut par rôle - Version MVP
 * Chaque rôle ne peut passer qu'à certains statuts
 * 
 * Workflow MVP:
 * - Restaurant: ACCEPTED → READY (ou REJECTED)
 * - Driver: READY → DELIVERY → DELIVERED
 * - Admin/Webhook: Tous les statuts (pour flexibilité)
 */
export const ORDER_STATUS_RULES = {
  restaurant: [
    OrderStatus.ACCEPTED,
    OrderStatus.READY,
    OrderStatus.REJECTED,
  ],
  driver: [OrderStatus.DELIVERY, OrderStatus.DELIVERED],
  admin: Object.values(OrderStatus),
  webhook: Object.values(OrderStatus),
} as const;

/**
 * Vérifie si une transition de statut est autorisée pour un rôle donné
 */
export function canTransitionTo(
  currentStatus: OrderStatus | string,
  newStatus: OrderStatus | string,
  actorType: keyof typeof ORDER_STATUS_RULES
): boolean {
  const allowedStatuses: readonly OrderStatus[] = ORDER_STATUS_RULES[actorType];
  return allowedStatuses.includes(newStatus as OrderStatus);
}


