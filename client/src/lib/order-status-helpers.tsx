/**
 * Helpers centralisés pour l'affichage des statuts de commande
 * Évite la duplication de getStatusColor, getStatusLabel, etc. dans chaque dashboard
 */

// Type pour la fonction de traduction (compatible avec useLanguage)
type TranslationFn = (key: string, params?: { [key: string]: string | number }) => string;

export type OrderStatus = 
  | "pending" 
  | "accepted" 
  | "ready" 
  | "delivery" 
  | "delivered" 
  | "rejected"
  | "preparing"  // Ancien statut (compatibilité)
  | "baking";    // Ancien statut (compatibilité)

/**
 * Retourne la classe CSS pour la couleur d'un statut
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    delivery: "bg-indigo-100 text-indigo-800",
    delivered: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    // Anciens statuts pour compatibilité (ne plus utilisés dans le workflow MVP)
    preparing: "bg-purple-100 text-purple-800",
    baking: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * Retourne la classe CSS pour le header de carte avec gradient
 */
export function getCardHeaderColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-gradient-to-r from-yellow-400 to-yellow-500",
    accepted: "bg-gradient-to-r from-blue-400 to-blue-500",
    ready: "bg-gradient-to-r from-green-400 to-green-500",
    delivery: "bg-gradient-to-r from-indigo-400 to-indigo-500",
    delivered: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    rejected: "bg-gradient-to-r from-red-400 to-red-500",
    // Anciens statuts pour compatibilité
    preparing: "bg-gradient-to-r from-purple-400 to-purple-500",
    baking: "bg-gradient-to-r from-orange-400 to-orange-500",
  };
  return colors[status] || "bg-gradient-to-r from-gray-400 to-gray-500";
}

/**
 * Retourne le label d'un statut (avec support i18n optionnel)
 */
export function getStatusLabel(status: string, t?: TranslationFn): string {
  // Si une fonction de traduction est fournie, l'utiliser
  if (t) {
    const translationKeys: Record<string, string> = {
      pending: "history.statusPending",
      accepted: "history.statusAccepted",
      ready: "history.statusReady",
      delivery: "history.statusDelivery",
      delivered: "history.statusDelivered",
      rejected: "history.statusRejected",
      preparing: "history.statusPreparing",
      baking: "history.statusBaking",
    };
    
    const key = translationKeys[status];
    if (key) {
      return t(key);
    }
  }

  // Labels par défaut en français
  const labels: Record<string, string> = {
    pending: "En attente",
    accepted: "Acceptée",
    ready: "Prête",
    delivery: "En livraison",
    delivered: "Livrée",
    rejected: "Refusée",
    // Anciens statuts pour compatibilité
    preparing: "En préparation",
    baking: "Au four",
  };
  
  return labels[status] || status;
}

/**
 * Retourne le label spécifique pour le dashboard driver
 */
export function getDriverStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: "Reçue",
    accepted: "Acceptée",
    ready: "Prête à récupérer",
    delivery: "En livraison",
    delivered: "Livrée",
    // Anciens statuts pour compatibilité
    preparing: "En préparation",
    baking: "Au four",
  };
  return labels[status] || status;
}

