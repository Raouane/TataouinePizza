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
    setEta(45);
  };

  const cancelOrder = () => {
    setActiveOrder(false);
    setStepIndex(0);
    setEta(0);
  };

  useEffect(() => {
    if (!activeOrder) return;

    const intervals = [
      5000, // received -> prep
      8000, // prep -> bake
      10000, // bake -> ready
      8000, // ready -> delivery
      15000 // delivery -> delivered
    ];

    let timeout: NodeJS.Timeout;

    const advanceStep = () => {
        setStepIndex(current => {
            if (current < steps.length - 1) {
                const next = current + 1;
                
                // Update ETA based on step
                if (next === 1) setEta(40);
                if (next === 2) setEta(30);
                if (next === 3) setEta(15);
                if (next === 4) setEta(10);
                if (next === 5) setEta(0);

                if (next < intervals.length) {
                    timeout = setTimeout(advanceStep, intervals[next]);
                } else if (next === steps.length - 1) {
                    // Auto clear after delivery for demo purposes after a delay
                    setTimeout(cancelOrder, 30000);
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
