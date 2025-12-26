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
        setOrderData(data);
        // Mettre à jour le statut selon les données réelles
        const realStatus = data.status;
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
      setOrderId(savedOrderId);
      setActiveOrder(true);
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
            if (current < steps.length - 1) {
                const next = current + 1;
                
                // Update ETA based on step (en minutes) - MVP simplifié
                if (next === 1) setEta(28);  // Après acceptation: 28 min restantes
                if (next === 2) setEta(20);  // Après préparation: 20 min restantes
                if (next === 3) setEta(15);  // Livreur en route: 15 min restantes
                if (next === 4) setEta(0);   // Livré

                if (next < intervals.length) {
                    timeout = setTimeout(advanceStep, intervals[next]);
                } else if (next === steps.length - 1) {
                    // Auto clear after delivery after 2 minutes
                    setTimeout(cancelOrder, 2 * 60 * 1000);
                }
                return next;
            }
            return current;
        });
    };

    timeout = setTimeout(advanceStep, intervals[0]);

    return () => clearTimeout(timeout);
  }, [activeOrder]);

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
