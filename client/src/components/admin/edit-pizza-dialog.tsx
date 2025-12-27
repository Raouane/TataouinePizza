import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminError } from "@/lib/admin-helpers";
import type { Pizza, Restaurant } from "@/lib/api";

interface PizzaFormData {
  restaurantId: string;
  name: string;
  description: string;
  productType: string;
  category: string;
  imageUrl: string;
  available: boolean;
  prices: Array<{ size: string; price: string }>;
}

interface EditPizzaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pizza: Pizza | null;
  restaurants: Restaurant[];
  onSubmit: (id: string, data: Partial<Pizza>) => Promise<void>;
  onCancel: () => void;
}

const defaultForm: PizzaFormData = {
  restaurantId: "",
  name: "",
  description: "",
  productType: "pizza",
  category: "classic",
  imageUrl: "",
  available: true,
  prices: [{ size: "small", price: "10" }, { size: "medium", price: "15" }, { size: "large", price: "18" }],
};

export function EditPizzaDialog({ open, onOpenChange, pizza, restaurants, onSubmit, onCancel }: EditPizzaDialogProps) {
  const [form, setForm] = useState<PizzaFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pizza && open) {
      setForm({
        restaurantId: pizza.restaurantId || "",
        name: pizza.name,
        description: pizza.description || "",
        productType: pizza.productType || "pizza",
        category: pizza.category,
        imageUrl: pizza.imageUrl || "",
        available: pizza.available !== false,
        prices: pizza.prices && pizza.prices.length > 0 
          ? pizza.prices.map((p: any) => ({ size: p.size, price: String(p.price || "0") }))
          : [{ size: "small", price: "10" }, { size: "medium", price: "15" }, { size: "large", price: "18" }],
      });
    }
  }, [pizza, open]);

  const handleSubmit = async () => {
    if (!pizza) return;
    
    if (!form.name || !form.category || !form.productType) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(pizza.id, form);
      onOpenChange(false);
      onCancel();
    } catch (err) {
      adminError("Erreur lors de la modification du produit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm(defaultForm);
    onOpenChange(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
          <DialogDescription>
            Modifiez les informations du produit
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Restaurant *</Label>
            <Select
              value={form.restaurantId}
              onValueChange={(value) => setForm({ ...form, restaurantId: value })}
              disabled
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Le restaurant ne peut pas être modifié
            </p>
          </div>
          <div>
            <Label>Type de produit *</Label>
            <Select
              value={form.productType}
              onValueChange={(value) => setForm({ ...form, productType: value, category: value === "pizza" ? "classic" : form.category })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pizza">Pizza</SelectItem>
                <SelectItem value="burger">Burger</SelectItem>
                <SelectItem value="salade">Salade</SelectItem>
                <SelectItem value="drink">Boisson</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nom *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom du produit"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optionnel)"
            />
          </div>
          <div>
            <Label>Catégorie *</Label>
            {form.productType === "pizza" ? (
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classique</SelectItem>
                  <SelectItem value="special">Spéciale</SelectItem>
                  <SelectItem value="vegetarian">Végétarienne</SelectItem>
                </SelectContent>
              </Select>
            ) : form.productType === "burger" ? (
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: beef, chicken, vegetarian"
              />
            ) : (
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Catégorie du produit"
              />
            )}
          </div>
          <div>
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Disponibilité</Label>
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="edit-pizza-available"
                checked={form.available !== false}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="edit-pizza-available" className="text-sm font-normal cursor-pointer">
                Produit disponible
              </Label>
            </div>
          </div>
          <div>
            <Label>Prixs</Label>
            <div className="space-y-2">
              {form.prices.map((price, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-20 text-sm">{price.size}:</span>
                  <Input
                    type="number"
                    value={parseFloat(price.price) || 0}
                    onChange={(e) => {
                      const newPrices = [...form.prices];
                      newPrices[idx].price = e.target.value;
                      setForm({ ...form, prices: newPrices });
                    }}
                    placeholder="Prix"
                  />
                  <span className="text-sm">TND</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

