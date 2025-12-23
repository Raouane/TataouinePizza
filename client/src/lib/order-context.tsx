import React, { createContext, useContext, useState, useEffect } from 'react';

type OrderStatus = 'received' | 'prep' | 'bake' | 'ready' | 'delivery' | 'delivered';

type OrderContextType = {
  activeOrder: boolean;
  status: OrderStatus;
  eta: number;
  startOrder: () => void;
  cancelOrder: () => void;
  stepIndex: number;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const steps: OrderStatus[] = ['received', 'prep', 'bake', 'ready', 'delivery', 'delivered'];

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrder, setActiveOrder] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [eta, setEta] = useState(0);

  const startOrder = () => {
    setActiveOrder(true);
    setStepIndex(0);
    setEta(35); // ETA initial de 35 minutes
  };

  const cancelOrder = () => {
    setActiveOrder(false);
    setStepIndex(0);
    setEta(0);
  };

  useEffect(() => {
    if (!activeOrder) return;

    // Durées en millisecondes pour une livraison de ~35 minutes
    const intervals = [
      3 * 60 * 1000,  // received -> prep: 3 minutes (préparation)
      8 * 60 * 1000,  // prep -> bake: 8 minutes (cuisson)
      2 * 60 * 1000,  // bake -> ready: 2 minutes (vérification)
      5 * 60 * 1000,  // ready -> delivery: 5 minutes (attente livreur)
      17 * 60 * 1000  // delivery -> delivered: 17 minutes (livraison)
    ];

    let timeout: NodeJS.Timeout;

    const advanceStep = () => {
        setStepIndex(current => {
            if (current < steps.length - 1) {
                const next = current + 1;
                
                // Update ETA based on step (en minutes)
                if (next === 1) setEta(32);  // Après préparation: 32 min restantes
                if (next === 2) setEta(24);  // Après cuisson: 24 min restantes
                if (next === 3) setEta(22);  // Après vérification: 22 min restantes
                if (next === 4) setEta(17);  // Livreur en route: 17 min restantes
                if (next === 5) setEta(0);   // Livré

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
