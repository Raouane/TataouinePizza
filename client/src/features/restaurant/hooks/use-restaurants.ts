/**
 * Hook useRestaurants
 * Gère la logique métier pour les restaurants
 */

import { useState, useEffect, useMemo } from "react";
import { getRestaurants } from "../restaurant.api";
import type { Restaurant } from "../restaurant.types";
import { isRestaurantOpen } from "@/lib/restaurant-status";

/**
 * Hook pour récupérer et gérer la liste des restaurants
 */
export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const data = await getRestaurants();
        setRestaurants(data);
        setError(null);
      } catch (err) {
        console.error("Erreur lors du chargement des restaurants:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Filtrer et trier les restaurants
  const sortedRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      const aIsOpen = isRestaurantOpen(a);
      const bIsOpen = isRestaurantOpen(b);
      if (aIsOpen === bIsOpen) return 0;
      return aIsOpen ? -1 : 1;
    });
  }, [restaurants]);

  const openRestaurants = useMemo(
    () => sortedRestaurants.filter(r => isRestaurantOpen(r) === true),
    [sortedRestaurants]
  );

  const closedRestaurants = useMemo(
    () => sortedRestaurants.filter(r => isRestaurantOpen(r) !== true),
    [sortedRestaurants]
  );

  // Recherche dans les restaurants
  const searchRestaurants = useMemo(() => {
    return (query: string): Restaurant[] => {
      if (!query.trim()) return [];
      const lowerQuery = query.toLowerCase();
      return restaurants.filter(
        r =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.description?.toLowerCase().includes(lowerQuery)
      );
    };
  }, [restaurants]);

  return {
    restaurants,
    sortedRestaurants,
    openRestaurants,
    closedRestaurants,
    loading,
    error,
    searchRestaurants,
  };
}
