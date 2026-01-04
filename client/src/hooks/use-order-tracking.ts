/**
 * Hook pour gérer le tracking d'une commande
 * Extrait la logique complexe de order-success.tsx pour améliorer la maintenabilité
 * 
 * Gère :
 * - Les phases de recherche (searching -> found -> success)
 * - Les timeouts (5 min alerte, 10 min annulation forcée)
 * - La détection de livraison
 */

import { useState, useEffect } from 'react';
import { useOrder } from '@/lib/order-context';

type TrackingPhase = 'searching' | 'found' | 'success' | 'delivered';

interface UseOrderTrackingResult {
  phase: TrackingPhase;
  isDelivered: boolean;
  orderData: any | null;
  refreshOrderData: () => Promise<string | null>;
  driverName: string;
  orderCreatedAt: Date | null;
  showTimeoutAlert: boolean; // Alerte à 5 minutes
  showTimeoutDialog: boolean; // Dialog d'annulation à 10 minutes
  dismissTimeoutAlert: () => void; // Fermer l'alerte
  dismissTimeoutDialog: () => void; // Fermer le dialog
}

/**
 * Hook pour tracker une commande avec phases visuelles
 * 
 * Phases :
 * - 'searching' : Recherche de livreur (en attente d'acceptation par un livreur)
 * - 'found' : Livreur trouvé (transition de 2 secondes)
 * - 'success' : Suivi en temps réel (livreur assigné)
 * - 'delivered' : Commande livrée
 */
export function useOrderTracking(orderId: string | null): UseOrderTrackingResult {
  const { orderData, refreshOrderData } = useOrder();
  const [phase, setPhase] = useState<TrackingPhase>('searching');
  const [isDelivered, setIsDelivered] = useState(false);
  const [driverName, setDriverName] = useState<string>('');
  const [orderCreatedAt, setOrderCreatedAt] = useState<Date | null>(null);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);

  const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes
  const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes

  // Initialiser la date de création de la commande
  useEffect(() => {
    if (orderData?.createdAt && !orderCreatedAt) {
      const createdAt = orderData.createdAt instanceof Date 
        ? orderData.createdAt 
        : new Date(orderData.createdAt);
      setOrderCreatedAt(createdAt);
      console.log('[useOrderTracking] 📅 Date de création de la commande:', createdAt);
    }
  }, [orderData?.createdAt, orderCreatedAt]);

  // Système de timeout global : 5 min (alerte) et 10 min (annulation forcée)
  useEffect(() => {
    if (!orderId || !orderCreatedAt || orderData?.driverId) {
      return; // Pas de timeout si livreur déjà assigné
    }

    // Vérifier toutes les secondes
    const interval = setInterval(() => {
      const currentElapsed = Date.now() - orderCreatedAt.getTime();
      
      if (currentElapsed >= TEN_MINUTES) {
        // 10 minutes : Forcer la proposition d'annulation
        console.log('[useOrderTracking] ⏰ Timeout global atteint (10 min)');
        setShowTimeoutDialog(true);
        clearInterval(interval);
      } else if (currentElapsed >= FIVE_MINUTES && !showTimeoutAlert) {
        // 5 minutes : Afficher l'alerte
        console.log('[useOrderTracking] ⚠️ Alerte timeout (5 min)');
        setShowTimeoutAlert(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderId, orderCreatedAt, orderData?.driverId, showTimeoutAlert, FIVE_MINUTES, TEN_MINUTES]);

  // Mettre à jour le nom du livreur quand orderData change
  useEffect(() => {
    if (orderData?.driverName) {
      setDriverName(orderData.driverName);
    }
  }, [orderData?.driverName]);

  // ✅ CORRECTION : Vérifier réellement si un livreur a accepté (driverId présent)
  useEffect(() => {
    if (!orderId) {
      setPhase('searching');
      return;
    }

    // Vérifier si un livreur a vraiment accepté (driverId présent ET non vide)
    const hasDriver = orderData?.driverId && 
                      orderData.driverId !== null && 
                      orderData.driverId !== undefined && 
                      String(orderData.driverId).trim() !== '';
    
    if (hasDriver) {
      // Un livreur a vraiment accepté
      const foundShown = sessionStorage.getItem(`orderFoundShown_${orderId}`);
      if (foundShown !== 'true') {
        // Première fois qu'on détecte l'acceptation
        console.log('[useOrderTracking] ✅ Livreur accepté détecté (driverId présent):', orderData.driverId);
        setPhase('found');
        sessionStorage.setItem(`orderFoundShown_${orderId}`, 'true');
        setTimeout(() => {
          setPhase('success');
        }, 2000);
      } else {
        // Déjà affiché, passer directement au succès
        setPhase('success');
      }
    } else {
      // Pas encore de livreur, rester en "searching"
      setPhase('searching');
    }
  }, [orderId, orderData?.driverId]);

  // Détecter quand la commande est livrée
  useEffect(() => {
    const realStatus = orderData?.status;
    
    if (realStatus === 'delivered' && !isDelivered) {
      console.log('[useOrderTracking] ✅ Commande livrée détectée');
      setIsDelivered(true);
      setPhase('delivered');
    }
  }, [orderData?.status, isDelivered]);

  return {
    phase,
    isDelivered,
    orderData,
    refreshOrderData,
    driverName,
    orderCreatedAt,
    showTimeoutAlert,
    showTimeoutDialog,
    dismissTimeoutAlert: () => setShowTimeoutAlert(false),
    dismissTimeoutDialog: () => setShowTimeoutDialog(false),
  };
}
