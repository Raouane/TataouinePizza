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
import { formatOpeningHours, cleanOpeningHours, adminLog } from "@/lib/admin-helpers";
import type { Restaurant } from "@/lib/api";

interface RestaurantFormData {
  name: string;
  phone: string;
  address: string;
  description: string;
  imageUrl: string;
  categories: string[];
  openingHours: string;
  closedDay: string;
  deliveryTime: number;
  minOrder: string;
  rating: string;
  password: string;
}

interface CreateRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Restaurant>) => Promise<void>;
}

const defaultForm: RestaurantFormData = {
  name: "",
  phone: "",
  address: "",
  description: "",
  imageUrl: "",
  categories: [],
  openingHours: "",
  closedDay: "",
  deliveryTime: 30,
  minOrder: "0",
  rating: "4.5",
  password: "",
};

export function CreateRestaurantDialog({ open, onOpenChange, onSubmit }: CreateRestaurantDialogProps) {
  const [form, setForm] = useState<RestaurantFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!form.name || !form.phone || !form.address) {
      return;
    }
    if (!form.categories || form.categories.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Utiliser les helpers pour formater openingHours
      const cleanedHours = cleanOpeningHours(form.openingHours);
      const [open, close] = cleanedHours ? cleanedHours.split("-") : ["", ""];
      const openingHours = formatOpeningHours(
        open.trim(),
        close.trim(),
        form.closedDay !== "none" ? form.closedDay : null
      );

      const restaurantData: any = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        description: form.description,
        imageUrl: form.imageUrl,
        categories: form.categories,
        deliveryTime: form.deliveryTime,
        minOrder: form.minOrder,
        rating: form.rating,
        openingHours: openingHours || null,
      };
      
      // Ajouter le mot de passe seulement s'il est rempli
      if (form.password && form.password.trim() !== "") {
        restaurantData.password = form.password;
      }

      adminLog("Création du restaurant avec:", restaurantData);
      await onSubmit(restaurantData);
      
      // Reset form
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
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Restaurant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un restaurant</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau restaurant
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom du restaurant"
                required
              />
            </div>
            <div>
              <Label>Téléphone *</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setForm({ ...form, phone: cleaned });
                }}
                placeholder="21345678"
                maxLength={15}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Entrez uniquement les chiffres (ex: 21345678)
              </p>
            </div>
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
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optionnel)"
              />
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
              <Label>Catégories de produits *</Label>
              <div className="space-y-2 mt-2 border rounded-md p-3">
                {["pizza", "burger", "salade", "grill", "drink", "dessert"].map((cat) => (
                  <div key={cat} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`cat-${cat}`}
                      checked={form.categories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({
                            ...form,
                            categories: [...form.categories, cat],
                          });
                        } else {
                          setForm({
                            ...form,
                            categories: form.categories.filter((c) => c !== cat),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label
                      htmlFor={`cat-${cat}`}
                      className="text-sm font-normal cursor-pointer capitalize"
                    >
                      {cat === "drink" ? "Boisson" : cat === "dessert" ? "Dessert" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
              {form.categories.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sélectionnez au moins une catégorie
                </p>
              )}
            </div>
            <div>
              <Label>Horaires d'ouverture</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="time"
                    value={form.openingHours ? form.openingHours.split("|")[0]?.split("-")[0] || "" : ""}
                    onChange={(e) => {
                      const hoursPart = form.openingHours.split("|")[0] || "";
                      const closeTime = hoursPart.split("-")[1] || "23:00";
                      const closedDay = form.openingHours.split("|")[1] || "";
                      const newHours = `${e.target.value}-${closeTime}`;
                      setForm({
                        ...form,
                        openingHours: closedDay ? `${newHours}|${closedDay}` : newHours,
                      });
                    }}
                    placeholder="09:00"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">À</Label>
                  <Input
                    type="time"
                    value={form.openingHours ? form.openingHours.split("|")[0]?.split("-")[1] || "" : ""}
                    onChange={(e) => {
                      const hoursPart = form.openingHours.split("|")[0] || "";
                      const openTime = hoursPart.split("-")[0] || "09:00";
                      const closedDay = form.openingHours.split("|")[1] || "";
                      const newHours = `${openTime}-${e.target.value}`;
                      setForm({
                        ...form,
                        openingHours: closedDay ? `${newHours}|${closedDay}` : newHours,
                      });
                    }}
                    placeholder="23:00"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Format: HH:MM (ex: 09:00-23:00 ou 20:00-06:00 pour ouverture nocturne)
              </p>
            </div>
            <div>
              <Label>Jour de repos</Label>
              <Select
                value={form.closedDay || "none"}
                onValueChange={(value) => setForm({ ...form, closedDay: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun (ouvert tous les jours)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (ouvert tous les jours)</SelectItem>
                  <SelectItem value="Dimanche">Dimanche</SelectItem>
                  <SelectItem value="Lundi">Lundi</SelectItem>
                  <SelectItem value="Mardi">Mardi</SelectItem>
                  <SelectItem value="Mercredi">Mercredi</SelectItem>
                  <SelectItem value="Jeudi">Jeudi</SelectItem>
                  <SelectItem value="Vendredi">Vendredi</SelectItem>
                  <SelectItem value="Samedi">Samedi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Temps de livraison (minutes)</Label>
                <Input
                  type="number"
                  value={form.deliveryTime}
                  onChange={(e) => setForm({ ...form, deliveryTime: parseInt(e.target.value) || 30 })}
                  placeholder="30"
                  min="10"
                  max="120"
                />
              </div>
              <div>
                <Label>Commande minimum (DT)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </div>
            <div>
              <Label>Note (sur 5)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                placeholder="4.5"
                min="0"
                max="5"
              />
            </div>
            <div>
              <Label>Mot de passe (optionnel)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 6 caractères"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 6 caractères. Si non renseigné, le mot de passe devra être défini plus tard.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

