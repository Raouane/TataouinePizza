import { useState, useCallback } from "react";
import { getAdminDrivers, createDriver, updateDriver, deleteDriver } from "@/lib/api";
import type { Driver } from "@/lib/api";
import { toast } from "sonner";
import { adminError } from "@/lib/admin-helpers";

/**
 * Hook pour gérer les drivers (CRUD)
 */
export function useDrivers(token: string | null) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = useCallback(async () => {
    if (!token) return;
    
    try {
      const data = await getAdminDrivers(token);
      setDrivers(data);
      setLoading(false);
    } catch (err) {
      adminError("Erreur lors du chargement des drivers:", err);
      setLoading(false);
    }
  }, [token]);

  const create = useCallback(async (data: { name: string; phone: string; password: string }) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      const newDriver = await createDriver(data, token);
      setDrivers(prev => [...prev, newDriver]);
      toast.success("Livreur créé avec succès!");
      return newDriver;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
      throw err;
    }
  }, [token]);

  const update = useCallback(async (id: string, data: Partial<Driver>) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      const updated = await updateDriver(id, data as { name?: string; phone?: string; password?: string; status?: "available" | "offline" | "on_delivery" }, token);
      setDrivers(prev => prev.map(d => d.id === id ? updated : d));
      toast.success("Livreur modifié avec succès!");
      return updated;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modification");
      throw err;
    }
  }, [token]);

  const remove = useCallback(async (id: string) => {
    if (!token) throw new Error("Non authentifié");
    
    try {
      await deleteDriver(id, token);
      setDrivers(prev => prev.filter(d => d.id !== id));
      toast.success("Livreur supprimé avec succès!");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
      throw err;
    }
  }, [token]);

  return {
    drivers,
    loading,
    fetchDrivers,
    createDriver: create,
    updateDriver: update,
    deleteDriver: remove,
  };
}

