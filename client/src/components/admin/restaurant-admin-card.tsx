import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, EyeOff, Package } from "lucide-react";
import { parseRestaurantCategories } from "@/lib/admin-helpers";
import { isRestaurantOpen } from "@/lib/restaurant-status";
import type { Restaurant } from "@/lib/api";

interface RestaurantAdminCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: () => void;
  onToggleVisibility: (restaurantId: string, currentVisibility: boolean) => Promise<void>;
  // ✅ NOUVEAU : Callback pour voir les produits du restaurant
  onViewProducts?: (restaurantId: string) => void;
}

export function RestaurantAdminCard({
  restaurant,
  onEdit,
  onDelete,
  onToggleVisibility,
  onViewProducts,
}: RestaurantAdminCardProps) {
  const categoriesArray = parseRestaurantCategories(restaurant.categories);
  const actuallyOpen = isRestaurantOpen(restaurant);

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="font-bold text-base sm:text-lg break-words flex-1">{restaurant.name}</h3>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(restaurant.id, restaurant.isOpen || false)}
            className={`h-8 w-8 p-0 ${
              restaurant.isOpen 
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title={restaurant.isOpen ? "Masquer le restaurant" : "Afficher le restaurant"}
          >
            {restaurant.isOpen ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(restaurant)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{restaurant.phone}</p>
      <p className="text-sm mt-2">{restaurant.address}</p>
      {categoriesArray.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {categoriesArray.map((cat) => (
            <span key={cat} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 capitalize">
              {cat === "drink" ? "Boisson" : cat === "dessert" ? "Dessert" : cat}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded ${restaurant.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Toggle: {restaurant.isOpen ? 'Activé' : 'Désactivé'}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${actuallyOpen ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
          Statut réel: {actuallyOpen ? 'Ouvert' : 'Fermé'}
        </span>
        {restaurant.openingHours && (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
            Horaires: {restaurant.openingHours.split('|')[0]}
          </span>
        )}
      </div>
      {/* ✅ NOUVEAU : Bouton pour voir les produits du restaurant */}
      {onViewProducts && (
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProducts(restaurant.id)}
            className="w-full"
          >
            <Package className="w-4 h-4 mr-2" />
            Voir les produits
          </Button>
        </div>
      )}
    </Card>
  );
}

