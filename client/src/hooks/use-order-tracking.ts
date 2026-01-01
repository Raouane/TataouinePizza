/**
 * Hook pour gérer le tracking d'une commande
 * Extrait la logique complexe de order-success.tsx pour améliorer la maintenabilité
 */

import { useState, useEffect } from 'react';
import { useOrder } from '@/lib/order-context';

type TrackingPhase = 'searching' | 'found' | 'tracking' | 'delivered' | 'timeout';

interface UseOrderTrackingResult {
  phase: TrackingPhase;
  isDelivered: boolean;
  orderData: any | null;
  refreshOrderData: () => Promise<string | null>;
  driverName: string;
  searchTimeElapsed: number; // Temps écoulé en secondes depuis le début de la recherche
  isSearchTimeout: boolean; // True si 2 minutes se sont écoulées sans livreur
}

/**
 * Hook pour tracker une commande avec phases visuelles
 * 
 * Phases :
 * - 'searching' : Recherche de livreur (en attente d'acceptation par un livreur)
 * - 'found' : Livreur trouvé (quand un livreur a accepté - driverId présent)
 * - 'tracking' : Suivi en temps réel
 * - 'delivered' : Commande livrée
 */
export function useOrderTracking(orderId: string | null): UseOrderTrackingResult {
  const { orderData, refreshOrderData } = useOrder();
  const [phase, setPhase] = useState<TrackingPhase>('searching');
  const [isDelivered, setIsDelivered] = useState(false);
  const [driverName, setDriverName] = useState<string>('');
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [searchTimeElapsed, setSearchTimeElapsed] = useState<number>(0);
  const [isSearchTimeout, setIsSearchTimeout] = useState<boolean>(false);

  // Timer Round Robin : 2 minutes (120 secondes)
  const SEARCH_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

  // Initialiser le timer de recherche quand la commande est créée
  useEffect(() => {
    if (orderId && !orderData?.driverId) {
      if (searchStartTime === null) {
        const startTime = Date.now();
        setSearchStartTime(startTime);
        console.log('[useOrderTracking] ⏱️ Timer de recherche démarré pour commande', orderId);
      }
    } else if (orderData?.driverId) {
      // Livreur trouvé, réinitialiser le timer
      setSearchStartTime(null);
      setSearchTimeElapsed(0);
      setIsSearchTimeout(false);
      if (phase === 'timeout') {
        setPhase('found'); // Passer à 'found' puis 'tracking'
      }
    }
  }, [orderId, orderData?.driverId, phase, searchStartTime]);

  // Mettre à jour le temps écoulé et vérifier le timeout
  useEffect(() => {
    if (searchStartTime === null || orderData?.driverId) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - searchStartTime) / 1000);
      setSearchTimeElapsed(elapsed);

      if (Date.now() - searchStartTime >= SEARCH_TIMEOUT_MS) {
        setIsSearchTimeout(true);
        if (phase === 'searching') {
          console.log('[useOrderTracking] ⏱️ Timeout de recherche (2 minutes) atteint');
          setPhase('timeout');
        }
      }
    }, 1000); // Mise à jour chaque seconde

    return () => clearInterval(interval);
  }, [searchStartTime, orderData?.driverId, phase, SEARCH_TIMEOUT_MS]);

  // Mettre à jour le nom du livreur quand orderData change
  useEffect(() => {
    if (orderData?.driverName) {
      setDriverName(orderData.driverName);
    }
  }, [orderData?.driverName]);

  // Phase 1: Recherche de livreur - RESTER en "searching" jusqu'à ce qu'un livreur accepte
  useEffect(() => {
    if (!orderId) {
      setPhase('searching');
      return;
    }

    // Debug: Log pour comprendre pourquoi driverId est présent
    if (orderData?.driverId) {
      console.log(`[useOrderTracking] 🔍 DEBUG - driverId présent pour commande ${orderId}:`, {
        orderId,
        orderDataOrderId: orderData?.id,
        driverId: orderData.driverId,
        orderDataKeys: Object.keys(orderData || {}),
        orderDataStatus: orderData?.status,
      });
    }

    // Si un livreur a déjà accepté (driverId présent ET non vide)
    // Vérifier que driverId est vraiment présent (pas null, pas undefined, pas chaîne vide)
    const hasDriver = orderData?.driverId && 
                      orderData.driverId !== null && 
                      orderData.driverId !== undefined && 
                      String(orderData.driverId).trim() !== '';
    
    if (hasDriver) {
      // Vérifier si on a déjà affiché "found" pour cette commande
      const foundShown = sessionStorage.getItem(`orderFoundShown_${orderId}`);
      if (foundShown !== 'true') {
        // Première fois qu'on détecte l'acceptation - afficher "found" puis "tracking"
        console.log('[useOrderTracking] ✅ Livreur accepté détecté (driverId présent):', orderData.driverId);
        setPhase('found');
        sessionStorage.setItem(`orderFoundShown_${orderId}`, 'true');
        const timer = setTimeout(() => {
          setPhase('tracking');
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        // Déjà affiché, passer directement au tracking
        setPhase('tracking');
      }
      return;
    }

    // Pas encore de livreur assigné
    // Si on est déjà en timeout, rester en timeout
    // Sinon, rester en searching
    if (phase !== 'timeout') {
      setPhase('searching');
    }
  }, [orderId, orderData?.driverId, phase]);

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
    searchTimeElapsed,
    isSearchTimeout,
  };
}
