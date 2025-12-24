import React, { createContext, useContext, useState, useEffect } from 'react';

// MVP Workflow simplifié: received → accepted → ready → delivery → delivered
type OrderStatus = 'received' | 'accepted' | 'ready' | 'delivery' | 'delivered';

type OrderContextType = {
  activeOrder: boolean;
  status: OrderStatus;
  eta: number;
  startOrder: () => void;
  cancelOrder: () => void;
  stepIndex: number;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// MVP: Workflow simplifié sans prep et bake
const steps: OrderStatus[] = ['received', 'accepted', 'ready', 'delivery', 'delivered'];

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrder, setActiveOrder] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [eta, setEta] = useState(0);

  const startOrder = () => {
    setActiveOrder(true);
    setStepIndex(0);
    setEta(30); // ETA initial de 30 minutes (MVP simplifié)
  };

  const cancelOrder = () => {
    setActiveOrder(false);
    setStepIndex(0);
    setEta(0);
  };

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
    <OrderContext.Provider value={{ activeOrder, status, eta, startOrder, cancelOrder, stepIndex }}>
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
