import { useState, useMemo, useCallback } from "react";
import { getAdminPizzas, createPizza, updatePizza, deletePizza } from "@/lib/api";
import type { Pizza } from "@/lib/api";
import { toast } from "sonner";
import { adminError } from "@/lib/admin-helpers";

/**
 * Hook pour gérer les pizzas/produits (CRUD)
 * Optimisé avec restaurantsById pour O(1) lookup
 */
export function usePizzas(token: string | null, restaurants: any[] = []) {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);

  // OPTIMISATION: Map des restaurants pour O(1) lookup
  const restaurantsById = useMemo(
    () => Object.fromEntries(restaurants.map(r => [r.id, r])),
    [restaurants]
  );

  const fetchPizzas = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await getAdminPizzas(token);
      setPizzas(data);
      setLoading(false);
    } catch (err) {
      adminError("Erreur lors du chargement des pizzas:", err);
      setLoading(false);
    }
  }, [token]);

  const create = useCallback(async (data: {
    restaurantId: string;
    name: string;
    description?: string;
    productType?: string;
    category: string;
    imageUrl?: string;
    available?: boolean;
    prices: Array<{ size: string; price: number }>;
  }) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      const newPizza = await createPizza(data, token);
      setPizzas(prev => [...prev, newPizza]);
      toast.success("Produit créé avec succès!");
      return newPizza;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
      throw err;
    }
  }, [token]);

  const update = useCallback(async (id: string, data: {
    name?: string;
    description?: string;
    productType?: string;
    category?: string;
    imageUrl?: string;
    available?: boolean;
    prices?: Array<{ size: string; price: number }>;
  }) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      const updated = await updatePizza(id, data, token);
      setPizzas(prev => prev.map(p => p.id === id ? updated : p));
      toast.success("Produit modifié avec succès!");
      return updated;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modification");
      throw err;
    }
  }, [token]);

  const remove = useCallback(async (id: string) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      await deletePizza(id, token);
      setPizzas(prev => prev.filter(p => p.id !== id));
      toast.success("Produit supprimé avec succès!");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
      throw err;
    }
  }, [token]);

  return {
    pizzas,
    loading,
    restaurantsById,
    fetchPizzas,
    createPizza: create,
    updatePizza: update,
    deletePizza: remove,
  };
}

