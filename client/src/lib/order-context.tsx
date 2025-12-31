import React, { createContext, useContext, useState, useEffect } from 'react';

// MVP Workflow simplifié: received → accepted → ready → delivery → delivered
type OrderStatus = 'received' | 'accepted' | 'ready' | 'delivery' | 'delivered';

type OrderContextType = {
  activeOrder: boolean;
  orderId: string | null;
  orderData: any | null;
  status: OrderStatus;
  eta: number;
  startOrder: (orderId?: string) => void;
  cancelOrder: () => void;
  stepIndex: number;
  refreshOrderData: () => Promise<string | null>;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// MVP: Workflow simplifié sans prep et bake
const steps: OrderStatus[] = ['received', 'accepted', 'ready', 'delivery', 'delivered'];

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrder, setActiveOrder] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [eta, setEta] = useState(0);

  const refreshOrderData = async (): Promise<string | null> => {
    if (!orderId) return null;
    
    const response = await fetch(`/api/orders/${orderId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Commande introuvable, arrêter le suivi
        console.log('[OrderContext] Commande introuvable (404), arrêt du suivi');
        setActiveOrder(false);
        setOrderId(null);
        setOrderData(null);
        sessionStorage.removeItem('currentOrderId');
        return null;
      }
      // Pour les autres erreurs (500, etc.), throw pour que le useEffect gère
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const realStatus = data.status;
    
    // Si la commande est livrée ou rejetée, arrêter le polling mais garder les données
    // pour que order-success.tsx puisse détecter le changement et gérer la redirection
    if (realStatus === 'delivered' || realStatus === 'rejected') {
      console.log('[OrderContext] Commande livrée/rejetée détectée, arrêt du polling');
      setOrderData(data);
      setEta(0);
      setStepIndex(4); // delivered
      // Masquer la bannière après 2 secondes (mais garder orderData pour order-success.tsx)
      setTimeout(() => {
        console.log('[OrderContext] Masquage de la bannière (orderData conservé pour order-success.tsx)');
        setActiveOrder(false);
        // Ne pas supprimer orderData immédiatement, laisser order-success.tsx gérer la redirection
      }, 2000);
      // Nettoyer complètement après 10 secondes (au cas où order-success.tsx ne redirige pas)
      setTimeout(() => {
        console.log('[OrderContext] Nettoyage complet des données de commande');
        setOrderId(null);
        setOrderData(null);
        setStepIndex(0);
        setEta(0);
        sessionStorage.removeItem('currentOrderId');
      }, 10000);
      return realStatus;
    }
    
    setOrderData(data);
    // Mettre à jour le statut selon les données réelles
    const statusMap: Record<string, number> = {
      'pending': 0,
      'accepted': 1,
      'ready': 2,
      'delivery': 3,
      'delivered': 4,
    };
    const newStepIndex = statusMap[realStatus] ?? 0;
    
    // Ne mettre à jour stepIndex que si différent pour éviter les re-renders inutiles
    if (newStepIndex !== stepIndex) {
      setStepIndex(newStepIndex);
    }
    
    return realStatus;
  };

  const startOrder = (newOrderId?: string) => {
    setActiveOrder(true);
    setStepIndex(0);
    setEta(30); // ETA initial de 30 minutes (MVP simplifié)
    if (newOrderId) {
      setOrderId(newOrderId);
      sessionStorage.setItem('currentOrderId', newOrderId);
    }
  };

  const cancelOrder = () => {
    setActiveOrder(false);
    setOrderId(null);
    setOrderData(null);
    setStepIndex(0);
    setEta(0);
    sessionStorage.removeItem('currentOrderId');
  };

  // Récupérer l'ID de commande depuis sessionStorage au chargement
  useEffect(() => {
    const savedOrderId = sessionStorage.getItem('currentOrderId');
    if (savedOrderId) {
      // Vérifier immédiatement le statut de la commande
      fetch(`/api/orders/${savedOrderId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const realStatus = data.status;
            // Si déjà livrée ou rejetée, ne pas activer le suivi
            if (realStatus === 'delivered' || realStatus === 'rejected') {
              console.log('[OrderContext] Commande déjà livrée/rejetée au chargement, pas de suivi');
              sessionStorage.removeItem('currentOrderId');
              return;
            }
            // Sinon, activer le suivi
            setOrderId(savedOrderId);
            setActiveOrder(true);
          }
        })
        .catch(err => {
          console.error('[OrderContext] Erreur vérification statut au chargement:', err);
          // En cas d'erreur, activer quand même le suivi
          setOrderId(savedOrderId);
          setActiveOrder(true);
        });
    }
  }, []);

  // Rafraîchir les données si orderId est défini
  useEffect(() => {
    if (!orderId) return;
    
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    
    const refreshWithErrorHandling = async () => {
      try {
        const currentStatus = await refreshOrderData();
        consecutiveErrors = 0; // Reset on success
        
        // Si refreshOrderData retourne null, la commande a été supprimée ou livrée
        if (currentStatus === null) {
          return;
        }
        
        // Arrêter le polling si la commande est livrée ou rejetée
        if (currentStatus === 'delivered' || currentStatus === 'rejected') {
          console.log('[OrderContext] Commande livrée/rejetée, arrêt du polling');
          return; // refreshOrderData a déjà géré la mise à jour et le nettoyage
        }
        
        // Continuer le polling pour tous les autres statuts (pending, accepted, ready, delivery)
        // Une commande peut rester en "accepted" ou "ready" pendant plusieurs minutes, c'est normal
      } catch (error) {
        consecutiveErrors++;
        console.error(`[OrderContext] Erreur lors du rafraîchissement (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);
        
        // Si trop d'erreurs consécutives, arrêter le polling
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error('[OrderContext] Trop d\'erreurs consécutives, arrêt du polling');
          setActiveOrder(false);
          setOrderId(null);
          setOrderData(null);
          sessionStorage.removeItem('currentOrderId');
        }
      }
    };
    
    // Rafraîchir immédiatement
    refreshWithErrorHandling();
    
    // Rafraîchir les données toutes les 5 secondes (arrêter si livré/rejeté)
    const interval = setInterval(() => {
      // Vérifier si la commande est déjà livrée/rejetée avant de continuer
      if (orderData?.status === 'delivered' || orderData?.status === 'rejected') {
        console.log('[OrderContext] Commande déjà livrée/rejetée, arrêt du polling');
        clearInterval(interval);
        return;
      }
      
      // Continuer le polling tant qu'il n'y a pas trop d'erreurs
      if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
        refreshWithErrorHandling();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [orderId, orderData?.status]);

  useEffect(() => {
    if (!activeOrder) return;
    
    // Ne pas avancer automatiquement si le statut réel est déjà delivered
    if (orderData?.status === 'delivered' || orderData?.status === 'rejected') {
      return;
    }

    // Durées en millisecondes pour une livraison de ~30 minutes (MVP simplifié)
    const intervals = [
      2 * 60 * 1000,  // received -> accepted: 2 minutes (restaurant accepte)
      8 * 60 * 1000,  // accepted -> ready: 8 minutes (préparation complète)
      5 * 60 * 1000,  // ready -> delivery: 5 minutes (attente livreur)
      15 * 60 * 1000  // delivery -> delivered: 15 minutes (livraison)
    ];

    let timeout: NodeJS.Timeout;

    const advanceStep = () => {
        setStepIndex(current => {
            // Vérifier à nouveau le statut réel avant d'avancer
            if (orderData?.status === 'delivered' || orderData?.status === 'rejected') {
              cancelOrder();
              return current;
            }
            
            if (current < steps.length - 1) {
                const next = current + 1;
                
                // Update ETA based on step (en minutes) - MVP simplifié
                if (next === 1) setEta(28);  // Après acceptation: 28 min restantes
                if (next === 2) setEta(20);  // Après préparation: 20 min restantes
                if (next === 3) setEta(15);  // Livreur en route: 15 min restantes
                if (next === 4) {
                  setEta(0);   // Livré
                  // Masquer la bannière après 3 secondes
                  setTimeout(() => {
                    cancelOrder();
                  }, 3000);
                  return next;
                }

                if (next < intervals.length) {
                    timeout = setTimeout(advanceStep, intervals[next]);
                }
                return next;
            }
            return current;
        });
    };

    timeout = setTimeout(advanceStep, intervals[0]);

    return () => clearTimeout(timeout);
  }, [activeOrder, orderData]);

  const status = steps[stepIndex];

  return (
    <OrderContext.Provider value={{ activeOrder, orderId, orderData, status, eta, startOrder, cancelOrder, stepIndex, refreshOrderData }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
