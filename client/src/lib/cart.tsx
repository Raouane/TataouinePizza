import React, { createContext, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export type Pizza = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'classic' | 'special' | 'vegetarian';
  restaurantId: string;
};

type CartItem = Pizza & {
  quantity: number;
  size: 'small' | 'medium' | 'large';
};

type CartContextType = {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  addItem: (pizza: Pizza, size?: 'small' | 'medium' | 'large') => boolean;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const { toast } = useToast();

  const addItem = (pizza: Pizza, size: 'small' | 'medium' | 'large' = 'medium'): boolean => {
    // Check if cart is from a different restaurant
    if (restaurantId && restaurantId !== pizza.restaurantId) {
      // Delay toast to avoid render issue
      setTimeout(() => {
        toast({
          title: "Panier d'un autre restaurant",
          description: "Videz votre panier pour commander dans un autre restaurant.",
          variant: "destructive"
        });
      }, 0);
      return false;
    }

    // Set restaurant if first item
    if (!restaurantId) {
      setRestaurantId(pizza.restaurantId);
    }

    const itemKey = `${pizza.id}-${size}`;
    let toastMessage: { title: string; description: string } | null = null;

    setItems((current) => {
      const existing = current.find((item) => `${item.id}-${item.size}` === itemKey);
      if (existing) {
        toastMessage = {
          title: "Quantité mise à jour",
          description: `Une autre ${pizza.name} (${size}) a été ajoutée.`,
        };
        return current.map((item) =>
          `${item.id}-${item.size}` === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toastMessage = {
        title: "Ajouté au panier",
        description: `${pizza.name} (${size}) a été ajoutée.`,
      };
      return [...current, { ...pizza, quantity: 1, size }];
    });

    // Show toast after state update
    if (toastMessage) {
      setTimeout(() => {
        toast(toastMessage!);
      }, 0);
    }

    return true;
  };

  const removeItem = (id: string) => {
    setItems((current) => {
      const newItems = current.filter((item) => item.id !== id);
      if (newItems.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return newItems;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((current) => {
      const newItems = current.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item) => item.quantity > 0);
      
      if (newItems.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, restaurantId, restaurantName, addItem, removeItem, updateQuantity, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
