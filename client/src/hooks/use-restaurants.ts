import { useState, useCallback } from "react";
import { getAdminRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/api";
import type { Restaurant } from "@/lib/api";
import { toast } from "sonner";
import { adminError } from "@/lib/admin-helpers";

/**
 * Hook pour gérer les restaurants (CRUD)
 */
export function useRestaurants(token: string | null) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await getAdminRestaurants(token);
      setRestaurants(data);
      setLoading(false);
    } catch (err) {
      adminError("Erreur lors du chargement des restaurants:", err);
      setLoading(false);
    }
  }, [token]);

  const create = useCallback(async (data: Partial<Restaurant>) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      const newRestaurant = await createRestaurant(data, token);
      setRestaurants(prev => [...prev, newRestaurant]);
      toast.success("Restaurant créé avec succès!");
      return newRestaurant;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
      throw err;
    }
  }, [token]);

  const update = useCallback(async (id: string, data: Partial<Restaurant>) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      const updated = await updateRestaurant(id, data, token);
      setRestaurants(prev => prev.map(r => r.id === id ? updated : r));
      toast.success("Restaurant modifié avec succès!");
      return updated;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modification");
      throw err;
    }
  }, [token]);

  const remove = useCallback(async (id: string) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      await deleteRestaurant(id, token);
      setRestaurants(prev => prev.filter(r => r.id !== id));
      toast.success("Restaurant supprimé avec succès!");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
      throw err;
    }
  }, [token]);

  return {
    restaurants,
    loading,
    fetchRestaurants,
    createRestaurant: create,
    updateRestaurant: update,
    deleteRestaurant: remove,
  };
}

