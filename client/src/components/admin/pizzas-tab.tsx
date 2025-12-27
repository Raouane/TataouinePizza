import { PizzaAdminCard } from "./pizza-admin-card";
import { CreatePizzaDialog } from "./create-pizza-dialog";
import { EditPizzaDialog } from "./edit-pizza-dialog";
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
}: PizzasTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Produits</h2>
        <CreatePizzaDialog
          open={showCreateDialog}
          onOpenChange={(open) => open ? onOpenCreateDialog() : onCloseCreateDialog()}
          restaurants={restaurants}
          onSubmit={onCreate}
        />
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement des produits...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {pizzas.map((pizza) => {
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
          {pizzas.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Aucun produit. Créez-en un pour commencer.
            </p>
          )}
        </div>
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

