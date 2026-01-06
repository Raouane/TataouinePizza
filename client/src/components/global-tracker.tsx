/**
 * ============================================================================
 * COMPOSANT GLOBAL TRACKER WIDGET - NAVIGATION VERS SUIVI DE COMMANDE
 * ============================================================================
 * 
 * Widget flottant qui affiche le suivi de commande en cours et permet
 * la navigation vers la page de détails.
 * 
 * UTILISATION DE LA NAVIGATION:
 * - Utilise useLocation() de wouter pour navigation programmatique
 * - setLocation('/success') au clic sur le widget
 * - Navigation vers la page de succès qui contient le suivi détaillé
 * 
 * FONCTIONNEMENT:
 * 1. Affiche un widget compact avec ETA et statut
 * 2. Au clic → navigation vers /success via setLocation()
 * 3. La page /success affiche le suivi complet de la commande
 * 
 * INTÉGRATION:
 * - Utilisé dans Layout.tsx, visible sur toutes les pages (sauf /success)
 * - Position fixe en bas à droite (mobile et desktop)
 * - Masqué automatiquement quand pas de commande active
 * 
 * ============================================================================
 */

import { useOrder } from "@/lib/order-context";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Bike, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export function GlobalTrackerWidget() {
  const { activeOrder, status, eta, orderData } = useOrder();
  const { t } = useLanguage();
  const [, setLocation] = useLocation(); // Hook wouter pour navigation programmatique

  // Debug logs pour production
  if (activeOrder) {
    console.log('[GlobalTracker] Debug:', {
      activeOrder,
      status,
      eta,
      realStatus: orderData?.status,
      orderData: orderData ? 'exists' : 'null'
    });
  }

  // Ne pas afficher si pas d'ordre actif
  if (!activeOrder) {
    console.log('[GlobalTracker] Masquage car activeOrder=false');
    return null;
  }
  
  // Ne pas afficher si la commande est livrée ou rejetée (vérifier le statut réel ET le statut calculé)
  const realStatus = orderData?.status;
  if (realStatus === 'delivered' || realStatus === 'rejected') {
    console.log('[GlobalTracker] Masquage car statut réel:', realStatus);
    return null;
  }
  // Ne pas afficher si la commande est livrée (vérifier le statut réel)
  // Le statut calculé peut être 'received' | 'accepted' | 'ready' | 'delivery' | 'delivered'
  // mais TypeScript ne le voit pas toujours, donc on vérifie aussi le statut réel
  const calculatedStatus = status as string;
  if (calculatedStatus === 'delivered' || calculatedStatus === 'delivery') {
    console.log('[GlobalTracker] Masquage car status calculé:', calculatedStatus);
    return null;
  }
  
  // Ne pas afficher si ETA est 0 (livraison terminée)
  if (eta === 0 && (calculatedStatus === 'delivered' || calculatedStatus === 'delivery')) {
    console.log('[GlobalTracker] Masquage car ETA=0 et delivered');
    return null;
  }
  
  console.log('[GlobalTracker] Affichage de la bannière');

  return (
    <motion.div
      className="fixed bottom-[4.5rem] md:bottom-6 right-4 z-50"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-orange-600 text-white rounded-full shadow-lg px-3 py-1.5 cursor-pointer flex items-center gap-2 hover:bg-orange-700 transition-colors w-auto max-w-[200px]"
        onClick={() => setLocation('/success')} // Navigation programmatique vers la page de succès via wouter
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
      >
        <div className="bg-white/20 p-1 rounded-full flex-shrink-0">
          <Bike className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[11px] leading-tight whitespace-nowrap">
            {t('tracker.title')}
          </p>
          <p className="text-[9px] opacity-90 flex items-center gap-1 leading-tight whitespace-nowrap">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" /> 
            {eta} {t('tracker.min')}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
      </motion.div>
    </motion.div>
  );
}
