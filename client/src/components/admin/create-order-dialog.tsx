import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Minus, X, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Restaurant, Pizza, OrderItem } from "@/lib/api";
import { createAdminOrder } from "@/lib/api";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurants: Restaurant[];
  pizzas: Pizza[];
  token: string;
  onSuccess: () => void;
}

interface OrderItemForm {
  pizzaId: string;
  size: "small" | "medium" | "large";
  quantity: number;
}

interface OrderFormData {
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails: string;
  paymentMethod: string;
  notes: string;
  items: OrderItemForm[];
}

const defaultForm: OrderFormData = {
  restaurantId: "",
  customerName: "",
  phone: "",
  address: "",
  addressDetails: "",
  paymentMethod: "cash",
  notes: "",
  items: [],
};

export function CreateOrderDialog({
  open,
  onOpenChange,
  restaurants,
  pizzas,
  token,
  onSuccess,
}: CreateOrderDialogProps) {
  const [form, setForm] = useState<OrderFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRestaurantPizzas, setSelectedRestaurantPizzas] = useState<Pizza[]>([]);

  // Filtrer les pizzas par restaurant sélectionné
  useEffect(() => {
    if (form.restaurantId) {
      const filtered = pizzas.filter(p => p.restaurantId === form.restaurantId);
      console.log('[CreateOrder] Pizzas filtrées pour restaurant:', {
        restaurantId: form.restaurantId,
        totalPizzas: pizzas.length,
        filteredCount: filtered.length,
        pizzas: filtered.map(p => p.name)
      });
      setSelectedRestaurantPizzas(filtered);
    } else {
      setSelectedRestaurantPizzas([]);
    }
  }, [form.restaurantId, pizzas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!form.restaurantId || !form.customerName || !form.phone || !form.address) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Si pas d'items, les notes deviennent obligatoires (commande spéciale)
    if (form.items.length === 0 && !form.notes) {
      toast.error("Pour une commande spéciale sans produits, veuillez ajouter une description dans les notes");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = form.items.map(item => ({
        pizzaId: item.pizzaId,
        size: item.size,
        quantity: item.quantity,
      }));

      // Pour les commandes spéciales, ajouter un préfixe aux notes
      let notes = form.notes || undefined;
      if (form.items.length === 0 && notes) {
        notes = `COMMANDE SPÉCIALE: ${notes}`;
      }

      await createAdminOrder(
        {
          restaurantId: form.restaurantId,
          customerName: form.customerName,
          phone: form.phone,
          address: form.address,
          addressDetails: form.addressDetails || undefined,
          items: orderItems,
          paymentMethod: form.paymentMethod,
          notes: notes,
        },
        token
      );

      toast.success("Commande créée avec succès !");
      setForm(defaultForm);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('[CreateOrder] Erreur création commande:', err);
      toast.error(err.message || "Erreur lors de la création de la commande");
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

  const addItem = () => {
    if (!form.restaurantId) {
      toast.error("Veuillez d'abord sélectionner un restaurant");
      return;
    }
    
    if (selectedRestaurantPizzas.length === 0) {
      toast.error("Ce restaurant n'a pas de produits disponibles. Veuillez ajouter des produits au restaurant d'abord.");
      return;
    }
    
    console.log('[CreateOrder] Ajout produit:', {
      restaurantId: form.restaurantId,
      availablePizzas: selectedRestaurantPizzas.length,
      selectedPizza: selectedRestaurantPizzas[0]?.name
    });
    
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          pizzaId: selectedRestaurantPizzas[0].id,
          size: "medium",
          quantity: 1,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: keyof OrderItemForm, value: any) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const getPizzaName = (pizzaId: string) => {
    const pizza = pizzas.find(p => p.id === pizzaId);
    return pizza?.name || "Pizza inconnue";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer une commande (Appel téléphonique)</DialogTitle>
          <DialogDescription>
            Créez une commande manuellement comme si le client avait passé commande via l'app
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Restaurant */}
            <div>
              <Label>Restaurant *</Label>
              <Select
                value={form.restaurantId}
                onValueChange={(value) => {
                  setForm({ ...form, restaurantId: value, items: [] });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Informations client */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du client *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Nom complet"
                  required
                />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, phone: cleaned });
                  }}
                  placeholder="21345678"
                  required
                />
              </div>
            </div>

            {/* Adresse */}
            <div>
              <Label>Adresse *</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Adresse complète"
                required
              />
            </div>

            <div>
              <Label>Détails adresse</Label>
              <Input
                value={form.addressDetails}
                onChange={(e) => setForm({ ...form, addressDetails: e.target.value })}
                placeholder="Appartement, étage, etc. (optionnel)"
              />
            </div>

            {/* Articles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Produits demandés par le client *</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ajoutez les produits que le client souhaite commander
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[CreateOrder] Bouton cliqué:', {
                      restaurantId: form.restaurantId,
                      availablePizzas: selectedRestaurantPizzas.length
                    });
                    addItem();
                  }}
                  disabled={!form.restaurantId || selectedRestaurantPizzas.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un produit
                </Button>
              </div>

              {form.items.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium mb-1">Aucun produit ajouté</p>
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur "Ajouter un produit" pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="border-2 rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          {/* Produit */}
                          <div>
                            <Label className="text-sm font-medium mb-1.5 block">
                              Produit {index + 1}
                            </Label>
                            <Select
                              value={item.pizzaId}
                              onValueChange={(value) => updateItem(index, "pizzaId", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionner un produit" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedRestaurantPizzas.map((pizza) => (
                                  <SelectItem key={pizza.id} value={pizza.id}>
                                    {pizza.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Taille et Quantité */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm font-medium mb-1.5 block">Taille</Label>
                              <Select
                                value={item.size}
                                onValueChange={(value) =>
                                  updateItem(index, "size", value as "small" | "medium" | "large")
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="small">Petite (S)</SelectItem>
                                  <SelectItem value="medium">Moyenne (M)</SelectItem>
                                  <SelectItem value="large">Grande (L)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm font-medium mb-1.5 block">Quantité</Label>
                              <div className="flex items-center gap-2 border rounded-md p-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    updateItem(index, "quantity", Math.max(1, item.quantity - 1))
                                  }
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="flex-1 text-center font-medium">{item.quantity}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateItem(index, "quantity", item.quantity + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bouton supprimer */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(index)}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paiement et notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Méthode de paiement</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) => setForm({ ...form, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="online">En ligne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Instructions spéciales, allergies, etc."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Création..." : "Créer la commande"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

