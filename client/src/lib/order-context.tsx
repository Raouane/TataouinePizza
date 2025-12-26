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
  refreshOrderData: () => Promise<void>;
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

  const refreshOrderData = async () => {
    if (!orderId) return;
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        const realStatus = data.status;
        
        // Si la commande est livrée ou rejetée, annuler immédiatement
        if (realStatus === 'delivered' || realStatus === 'rejected') {
          console.log('[OrderContext] Commande livrée/rejetée, masquage immédiat de la bannière');
          setOrderData(data);
          setEta(0);
          setStepIndex(4); // delivered
          // Masquer après 2 secondes pour laisser voir le statut final
          setTimeout(() => {
            setActiveOrder(false);
            setOrderId(null);
            setOrderData(null);
            setStepIndex(0);
            setEta(0);
            sessionStorage.removeItem('currentOrderId');
          }, 2000);
          return;
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
        setStepIndex(newStepIndex);
      }
    } catch (error) {
      console.error('[OrderContext] Erreur lors de la récupération des données:', error);
    }
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
    if (orderId) {
      refreshOrderData();
      // Rafraîchir les données toutes les 5 secondes
      const interval = setInterval(() => {
        refreshOrderData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

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
