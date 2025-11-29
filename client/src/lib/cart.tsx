import React, { createContext, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export type Pizza = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'classic' | 'special' | 'vegetarian';
};

type CartItem = Pizza & {
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (pizza: Pizza) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addItem = (pizza: Pizza) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === pizza.id);
      if (existing) {
        toast({
          title: "Quantité mise à jour",
          description: `Une autre ${pizza.name} a été ajoutée au panier.`,
        });
        return current.map((item) =>
          item.id === pizza.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast({
        title: "Ajouté au panier",
        description: `${pizza.name} a été ajoutée.`,
      });
      return [...current, { ...pizza, quantity: 1 }];
    });
  };

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}
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
