import { useState, useEffect } from "react";
import { PizzaAdminCard } from "./pizza-admin-card";
import { CreatePizzaDialog } from "./create-pizza-dialog";
import { EditPizzaDialog } from "./edit-pizza-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Pizza, Restaurant } from "@/lib/api";

interface PizzasTabProps {
  pizzas: Pizza[];
  restaurants: Restaurant[];
  restaurantsById: Record<string, Restaurant>;
  loading?: boolean;
  showCreateDialog: boolean;
  showEditDialog: boolean;
  editingPizza: Pizza | null;
  onOpenCreateDialog: () => void;
  onCloseCreateDialog: () => void;
  onOpenEditDialog: (pizza: Pizza) => void;
  onCloseEditDialog: () => void;
  onCreate: (data: Partial<Pizza>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Pizza>) => Promise<void>;
  onDelete: (pizza: Pizza) => void;
  // ✅ NOUVEAU : Permettre de filtrer par restaurant depuis l'extérieur
  initialRestaurantFilter?: string | null;
}

export function PizzasTab({
  pizzas,
  restaurants,
  restaurantsById,
  loading = false,
  showCreateDialog,
  showEditDialog,
  editingPizza,
  onOpenCreateDialog,
  onCloseCreateDialog,
  onOpenEditDialog,
  onCloseEditDialog,
  onCreate,
  onUpdate,
  onDelete,
  initialRestaurantFilter = null,
}: PizzasTabProps) {
  // ✅ NOUVEAU : État pour le filtre par restaurant
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(initialRestaurantFilter || null);

  // ✅ NOUVEAU : Mettre à jour le filtre si initialRestaurantFilter change
  useEffect(() => {
    if (initialRestaurantFilter !== null) {
      setSelectedRestaurantId(initialRestaurantFilter);
    }
  }, [initialRestaurantFilter]);

  // ✅ NOUVEAU : Filtrer les produits par restaurant
  const filteredPizzas = selectedRestaurantId
    ? pizzas.filter(pizza => pizza.restaurantId === selectedRestaurantId)
    : pizzas;

  // ✅ NOUVEAU : Compter les produits par restaurant
  const productCounts = restaurants.reduce((acc, restaurant) => {
    acc[restaurant.id] = pizzas.filter(p => p.restaurantId === restaurant.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-bold">Produits</h2>
        <div className="flex gap-2 items-center">
          <CreatePizzaDialog
            open={showCreateDialog}
            onOpenChange={(open) => open ? onOpenCreateDialog() : onCloseCreateDialog()}
            restaurants={restaurants}
            onSubmit={onCreate}
          />
        </div>
      </div>

      {/* ✅ NOUVEAU : Filtre par restaurant */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="restaurant-filter">Filtrer par restaurant</Label>
          <div className="flex gap-2 mt-1">
            <Select
              value={selectedRestaurantId || "all"}
              onValueChange={(value) => setSelectedRestaurantId(value === "all" ? null : value)}
            >
              <SelectTrigger id="restaurant-filter" className="flex-1">
                <SelectValue placeholder="Tous les restaurants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">Tous les restaurants</span>
                  <span className="text-xs text-muted-foreground ml-2">({pizzas.length} produits)</span>
                </SelectItem>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    <span className="font-medium">{restaurant.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({productCounts[restaurant.id] || 0} produit{productCounts[restaurant.id] !== 1 ? 's' : ''})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRestaurantId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRestaurantId(null)}
                className="mt-auto"
              >
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement des produits...</p>
        </div>
      ) : (
        <>
          {selectedRestaurantId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <p className="text-sm text-blue-800">
                <span className="font-medium">
                  {restaurantsById[selectedRestaurantId]?.name || 'Restaurant inconnu'}
                </span>
                {" - "}
                {filteredPizzas.length} produit{filteredPizzas.length !== 1 ? 's' : ''} affiché{filteredPizzas.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredPizzas.map((pizza) => {
              const restaurant = pizza.restaurantId ? restaurantsById[pizza.restaurantId] : undefined;
              return (
                <PizzaAdminCard
                  key={pizza.id}
                  pizza={pizza}
                  restaurant={restaurant}
                  onEdit={onOpenEditDialog}
                  onDelete={() => onDelete(pizza)}
                />
              );
            })}
            {filteredPizzas.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                {selectedRestaurantId 
                  ? `Aucun produit pour ce restaurant. Créez-en un pour commencer.`
                  : "Aucun produit. Créez-en un pour commencer."}
              </p>
            )}
          </div>
        </>
      )}
      
      <EditPizzaDialog
        open={showEditDialog}
        onOpenChange={(open) => open ? onOpenEditDialog(editingPizza!) : onCloseEditDialog()}
        pizza={editingPizza}
        restaurants={restaurants}
        onSubmit={onUpdate}
        onCancel={onCloseEditDialog}
      />
    </div>
  );
}

