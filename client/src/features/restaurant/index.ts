/**
 * Feature Restaurant - Exports publics
 * 
 * Point d'entrée unique pour importer les éléments de la feature restaurant
 */

// Types
export type { Restaurant } from "./restaurant.types";

// API
export { getRestaurants, getRestaurantById } from "./restaurant.api";

// Hooks
export { useRestaurants } from "./hooks/use-restaurants";

// Components
export { RestaurantCard } from "./components/restaurant-card";
export { RestaurantsSection } from "./components/restaurants-section";
