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

  const create = useCallback(async (data: {
    name: string;
    phone: string;
    address: string;
    description?: string;
    imageUrl?: string;
    categories?: string[];
    openingHours?: string;
    deliveryTime?: number;
    minOrder?: string;
    rating?: string;
  }) => {
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

  const update = useCallback(async (id: string, data: {
    name?: string;
    phone?: string;
    address?: string;
    description?: string;
    imageUrl?: string;
    categories?: string[];
    isOpen?: boolean;
    openingHours?: string;
    deliveryTime?: number;
    minOrder?: string;
    rating?: string;
  }) => {
    if (!token) throw new Error("Non authentifié");
    
    console.log(`[useRestaurants] 🔄 Mise à jour restaurant ${id}`);
    console.log(`[useRestaurants]    Données envoyées:`, JSON.stringify(data, null, 2));
    
    try {
      const updated = await updateRestaurant(id, data, token);
      
      console.log(`[useRestaurants] ✅ Restaurant mis à jour reçu du serveur`);
      console.log(`[useRestaurants]    ImageUrl dans la réponse: ${updated.imageUrl || 'NULL'}`);
      
      // Mettre à jour l'état local avec les données du serveur
      setRestaurants(prev => {
        const newRestaurants = prev.map(r => r.id === id ? updated : r);
        console.log(`[useRestaurants] ✅ État local mis à jour`);
        const updatedRestaurant = newRestaurants.find(r => r.id === id);
        console.log(`[useRestaurants]    ImageUrl dans l'état local: ${updatedRestaurant?.imageUrl || 'NULL'}`);
        return newRestaurants;
      });
      
      toast.success("Restaurant modifié avec succès!");
      return updated;
    } catch (err: any) {
      console.error(`[useRestaurants] ❌ Erreur:`, err);
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

