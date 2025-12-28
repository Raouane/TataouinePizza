import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { adminLog } from "@/lib/admin-helpers";
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

interface CreatePizzaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurants: Restaurant[];
  onSubmit: (data: Partial<Pizza>) => Promise<void>;
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

export function CreatePizzaDialog({ open, onOpenChange, restaurants, onSubmit }: CreatePizzaDialogProps) {
  const [form, setForm] = useState<PizzaFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.restaurantId || !form.name || !form.category || !form.productType) {
      return;
    }

    setIsSubmitting(true);
    try {
      adminLog("Création du produit avec:", form);
      await onSubmit(form);
      setForm(defaultForm);
      onOpenChange(false);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setForm(defaultForm);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Produit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un produit</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau produit (pizza, burger, salade, etc.)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Restaurant *</Label>
            <Select
              value={form.restaurantId}
              onValueChange={(value) => setForm({ ...form, restaurantId: value })}
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
            {form.imageUrl && form.imageUrl.trim() !== "" && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Aperçu:</Label>
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={form.imageUrl}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Image invalide</div>';
                      }
                    }}
                  />
                </div>
              </div>
            )}
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
          <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

