import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Pizza, Restaurant } from "@/lib/api";

interface PizzaAdminCardProps {
  pizza: Pizza;
  restaurant: Restaurant | undefined;
  onEdit: (pizza: Pizza) => void;
  onDelete: () => void;
}

export function PizzaAdminCard({ pizza, restaurant, onEdit, onDelete }: PizzaAdminCardProps) {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg break-words">{pizza.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {restaurant?.name || "Restaurant inconnu"}
          </p>
        </div>
        <div className="flex gap-1 sm:gap-2 items-start flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded ${
            pizza.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {pizza.available ? 'Disponible' : 'Indisponible'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(pizza)}
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
      {pizza.description && (
        <p className="text-sm text-gray-600 mb-2">{pizza.description}</p>
      )}
      <div className="flex gap-2 mb-2">
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 capitalize">
          {pizza.productType === "drink" ? "Boisson" : 
           pizza.productType === "dessert" ? "Dessert" : 
           pizza.productType}
        </span>
        <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 capitalize">
          {pizza.category}
        </span>
      </div>
      {pizza.prices && pizza.prices.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold mb-1">Prix:</p>
          <div className="flex flex-wrap gap-2">
            {pizza.prices.map((price: any, idx: number) => (
              <span key={idx} className="text-xs">
                {price.size}: <strong>{price.price} TND</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

