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
import { Plus, Minus, X } from "lucide-react";
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

    if (form.items.length === 0) {
      toast.error("Veuillez ajouter au moins un article à la commande");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = form.items.map(item => ({
        pizzaId: item.pizzaId,
        size: item.size,
        quantity: item.quantity,
      }));

      await createAdminOrder(
        {
          restaurantId: form.restaurantId,
          customerName: form.customerName,
          phone: form.phone,
          address: form.address,
          addressDetails: form.addressDetails || undefined,
          items: orderItems,
          paymentMethod: form.paymentMethod,
          notes: form.notes || undefined,
        },
        token
      );

      toast.success("Commande créée avec succès !");
      setForm(defaultForm);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
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
    if (selectedRestaurantPizzas.length === 0) {
      toast.error("Veuillez d'abord sélectionner un restaurant");
      return;
    }
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Articles *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={!form.restaurantId}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {form.items.length === 0 ? (
                <div className="border rounded-md p-4 text-center text-muted-foreground">
                  Aucun article. Cliquez sur "Ajouter" pour commencer.
                </div>
              ) : (
                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded-md p-3 flex items-center gap-2"
                    >
                      <Select
                        value={item.pizzaId}
                        onValueChange={(value) => updateItem(index, "pizzaId", value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedRestaurantPizzas.map((pizza) => (
                            <SelectItem key={pizza.id} value={pizza.id}>
                              {pizza.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={item.size}
                        onValueChange={(value) =>
                          updateItem(index, "size", value as "small" | "medium" | "large")
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">S</SelectItem>
                          <SelectItem value="medium">M</SelectItem>
                          <SelectItem value="large">L</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateItem(index, "quantity", Math.max(1, item.quantity - 1))
                          }
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItem(index, "quantity", item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
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

