import React, { createContext, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { playAddToCartSound } from '@/lib/sounds';

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

export type RestaurantCart = {
  restaurantId: string;
  restaurantName: string | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
};

type PendingItem = {
  pizza: Pizza;
  size: 'small' | 'medium' | 'large';
  restaurantName?: string;
};

type CartContextType = {
  restaurants: RestaurantCart[];
  addItem: (pizza: Pizza, size?: 'small' | 'medium' | 'large', restaurantName?: string) => boolean;
  removeItem: (restaurantId: string, itemId: string) => void;
  updateQuantity: (restaurantId: string, itemId: string, delta: number) => void;
  clearCart: () => void;
  clearRestaurant: (restaurantId: string) => void;
  total: number;
  count: number;
  getRestaurantCart: (restaurantId: string) => RestaurantCart | undefined;
  // Pour le dialog de confirmation
  pendingItem: PendingItem | null;
  isConfirmDialogOpen: boolean;
  setIsConfirmDialogOpen: (open: boolean) => void;
  confirmAddNewRestaurant: () => void;
};

const DELIVERY_FEE = 2.00; // Prix de livraison fixe en TND

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [restaurants, setRestaurants] = useState<RestaurantCart[]>([]);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { toast } = useToast();

  const calculateSubtotal = (items: CartItem[]): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const addItemToRestaurant = (
    restaurantCart: RestaurantCart,
    pizza: Pizza,
    size: 'small' | 'medium' | 'large'
  ): RestaurantCart => {
    const itemKey = `${pizza.id}-${size}`;
    const existing = restaurantCart.items.find((item) => `${item.id}-${item.size}` === itemKey);
    
    let newItems: CartItem[];
    if (existing) {
      newItems = restaurantCart.items.map((item) =>
        `${item.id}-${item.size}` === itemKey
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newItems = [...restaurantCart.items, { ...pizza, quantity: 1, size }];
    }
    
    return {
      ...restaurantCart,
      items: newItems,
      subtotal: calculateSubtotal(newItems),
    };
  };

  const addItem = (
    pizza: Pizza,
    size: 'small' | 'medium' | 'large' = 'medium',
    restaurantName?: string
  ): boolean => {
    // Vérifier si le restaurant existe déjà dans le panier
    const existingRestaurant = restaurants.find(r => r.restaurantId === pizza.restaurantId);
    
    if (existingRestaurant) {
      // Restaurant déjà dans le panier → ajouter directement
      setRestaurants((current) => {
        const updated = current.map((r) =>
          r.restaurantId === pizza.restaurantId
            ? addItemToRestaurant(r, pizza, size)
            : r
        );
        return updated;
      });

      const existing = existingRestaurant.items.find((item) => `${item.id}-${item.size}` === `${pizza.id}-${size}`);
      const toastMessage = existing
        ? { title: "Quantité mise à jour", description: `Une autre ${pizza.name} (${size}) a été ajoutée.` }
        : { title: "Ajouté au panier", description: `${pizza.name} (${size}) a été ajoutée.` };

      setTimeout(() => {
        toast(toastMessage);
      }, 0);

      playAddToCartSound();
      return true;
    }
    
    // Nouveau restaurant → demander confirmation si panier non vide
    if (restaurants.length > 0) {
      setPendingItem({ pizza, size, restaurantName });
      setIsConfirmDialogOpen(true);
      return false; // Temporaire, sera confirmé via le dialog
    }
    
    // Premier restaurant → ajouter directement
    const newRestaurantCart: RestaurantCart = {
      restaurantId: pizza.restaurantId,
      restaurantName: restaurantName || null,
      items: [{ ...pizza, quantity: 1, size }],
      subtotal: pizza.price,
      deliveryFee: DELIVERY_FEE,
    };

    setRestaurants([newRestaurantCart]);

    setTimeout(() => {
      toast({
        title: "Ajouté au panier",
        description: `${pizza.name} (${size}) a été ajoutée.`,
      });
    }, 0);

    playAddToCartSound();
    return true;
  };

  const confirmAddNewRestaurant = () => {
    if (!pendingItem) return;

    const newRestaurantCart: RestaurantCart = {
      restaurantId: pendingItem.pizza.restaurantId,
      restaurantName: pendingItem.restaurantName || null,
      items: [{ ...pendingItem.pizza, quantity: 1, size: pendingItem.size }],
      subtotal: pendingItem.pizza.price,
      deliveryFee: DELIVERY_FEE,
    };

    setRestaurants((current) => [...current, newRestaurantCart]);
    setIsConfirmDialogOpen(false);
    setPendingItem(null);

    setTimeout(() => {
      toast({
        title: "Restaurant ajouté au panier",
        description: `${pendingItem.pizza.name} (${pendingItem.size}) a été ajoutée.`,
      });
    }, 0);

    playAddToCartSound();
  };

  const removeItem = (restaurantId: string, itemKey: string) => {
    // itemKey peut être soit item.id seul (pour compatibilité) soit `${item.id}-${item.size}`
    setRestaurants((current) => {
      const updated = current.map((r) => {
        if (r.restaurantId === restaurantId) {
          const newItems = r.items.filter((item) => {
            // Supprimer si l'ID correspond ou si la clé complète correspond
            return item.id !== itemKey && `${item.id}-${item.size}` !== itemKey;
          });
          if (newItems.length === 0) {
            return null; // Marquer pour suppression
          }
          return {
            ...r,
            items: newItems,
            subtotal: calculateSubtotal(newItems),
          };
        }
        return r;
      }).filter((r): r is RestaurantCart => r !== null);
      
      return updated;
    });
  };

  const updateQuantity = (restaurantId: string, itemId: string, delta: number) => {
    setRestaurants((current) => {
      const updated = current.map((r) => {
        if (r.restaurantId === restaurantId) {
          const newItems = r.items
            .map((item) => {
              if (item.id === itemId) {
                const newQuantity = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQuantity };
              }
              return item;
            })
            .filter((item) => item.quantity > 0);
          
          if (newItems.length === 0) {
            return null; // Marquer pour suppression
          }
          
          return {
            ...r,
            items: newItems,
            subtotal: calculateSubtotal(newItems),
          };
        }
        return r;
      }).filter((r): r is RestaurantCart => r !== null);
      
      return updated;
    });
  };

  const clearCart = () => {
    setRestaurants([]);
    setPendingItem(null);
    setIsConfirmDialogOpen(false);
  };

  const clearRestaurant = (restaurantId: string) => {
    setRestaurants((current) => current.filter((r) => r.restaurantId !== restaurantId));
  };

  const getRestaurantCart = (restaurantId: string): RestaurantCart | undefined => {
    return restaurants.find((r) => r.restaurantId === restaurantId);
  };

  const total = restaurants.reduce(
    (sum, r) => sum + r.subtotal + r.deliveryFee,
    0
  );
  
  const count = restaurants.reduce(
    (sum, r) => sum + r.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        restaurants,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearRestaurant,
        total,
        count,
        getRestaurantCart,
        pendingItem,
        isConfirmDialogOpen,
        setIsConfirmDialogOpen,
        confirmAddNewRestaurant,
      }}
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
