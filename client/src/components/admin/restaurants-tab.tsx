import { RestaurantAdminCard } from "./restaurant-admin-card";
import { CreateRestaurantDialog } from "./create-restaurant-dialog";
import { EditRestaurantDialog } from "./edit-restaurant-dialog";
import type { Restaurant } from "@/lib/api";

interface RestaurantsTabProps {
  restaurants: Restaurant[];
  loading?: boolean;
  showCreateDialog: boolean;
  showEditDialog: boolean;
  editingRestaurant: Restaurant | null;
  onOpenCreateDialog: () => void;
  onCloseCreateDialog: () => void;
  onOpenEditDialog: (restaurant: Restaurant) => void;
  onCloseEditDialog: () => void;
  onCreate: (data: Partial<Restaurant>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Restaurant>) => Promise<void>;
  onDelete: (restaurant: Restaurant) => void;
  onToggleVisibility: (restaurantId: string, currentVisibility: boolean) => Promise<void>;
  // ✅ NOUVEAU : Callback pour voir les produits d'un restaurant
  onViewProducts?: (restaurantId: string) => void;
}

export function RestaurantsTab({
  restaurants,
  loading = false,
  showCreateDialog,
  showEditDialog,
  editingRestaurant,
  onOpenCreateDialog,
  onCloseCreateDialog,
  onOpenEditDialog,
  onCloseEditDialog,
  onCreate,
  onUpdate,
  onDelete,
  onToggleVisibility,
  onViewProducts,
}: RestaurantsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
        <h2 className="text-xl font-bold">Restaurants</h2>
        <CreateRestaurantDialog
          open={showCreateDialog}
          onOpenChange={(open) => open ? onOpenCreateDialog() : onCloseCreateDialog()}
          onSubmit={onCreate}
        />
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement des restaurants...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {restaurants.map((restaurant) => (
            <RestaurantAdminCard
              key={restaurant.id}
              restaurant={restaurant}
              onEdit={onOpenEditDialog}
              onDelete={() => onDelete(restaurant)}
              onToggleVisibility={onToggleVisibility}
              onViewProducts={onViewProducts}
            />
          ))}
          {restaurants.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Aucun restaurant. Créez-en un pour commencer.
            </p>
          )}
        </div>
      )}
      
      <EditRestaurantDialog
        open={showEditDialog}
        onOpenChange={(open) => open ? onOpenEditDialog(editingRestaurant!) : onCloseEditDialog()}
        restaurant={editingRestaurant}
        onSubmit={onUpdate}
        onCancel={onCloseEditDialog}
      />
    </div>
  );
}

