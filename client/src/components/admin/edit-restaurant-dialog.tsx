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
import { parseOpeningHours, formatOpeningHours, cleanOpeningHours, parseRestaurantCategories, adminLog } from "@/lib/admin-helpers";
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

interface EditRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
  onSubmit: (id: string, data: Partial<Restaurant>) => Promise<void>;
  onCancel: () => void;
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

// Fonction utilitaire pour normaliser les chemins d'image
const normalizeImagePath = (path: string) => {
  if (!path) return "";
  // Convertir les chemins Windows en chemins Unix
  let normalized = path.replace(/\\/g, '/');
  // Supprimer le préfixe client/public si présent
  normalized = normalized.replace(/^.*client\/public\//, '/');
  // S'assurer qu'il commence par /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
};

export function EditRestaurantDialog({ open, onOpenChange, restaurant, onSubmit, onCancel }: EditRestaurantDialogProps) {
  const [form, setForm] = useState<RestaurantFormData>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (restaurant && open) {
      const { open: openTime, close: closeTime, closedDay } = parseOpeningHours(restaurant.openingHours);
      const openingHours = openTime && closeTime ? `${openTime}-${closeTime}` : "";
      const categoriesArray = parseRestaurantCategories(restaurant.categories);
      
      adminLog("handleEditRestaurant - Restaurant:", restaurant.name);
      
      setForm({
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        description: restaurant.description || "",
        imageUrl: restaurant.imageUrl || "",
        categories: categoriesArray,
        openingHours,
        closedDay: closedDay || "none",
        deliveryTime: restaurant.deliveryTime || 30,
        minOrder: restaurant.minOrder?.toString() || "0",
        rating: restaurant.rating?.toString() || "4.5",
        password: "", // Le mot de passe n'est jamais affiché pour des raisons de sécurité
      });
    }
  }, [restaurant, open]);

  const handleSubmit = async () => {
    if (!restaurant) return;
    
    if (!form.name || !form.phone || !form.address) {
      return;
    }
    if (!form.categories || form.categories.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanedHours = cleanOpeningHours(form.openingHours);
      const [open, close] = cleanedHours ? cleanedHours.split("-") : ["", ""];
      const openingHours = formatOpeningHours(
        open.trim(),
        close.trim(),
        form.closedDay !== "none" ? form.closedDay : null
      );

      // ✅ Normaliser l'imageUrl : convertir les chemins Windows en URLs relatives
      let normalizedImageUrl = form.imageUrl.trim();
      
      console.log(`[EditRestaurant] 🔄 Normalisation imageUrl: ${normalizedImageUrl}`);
      
      // Si c'est un chemin Windows (contient \ ou C:\), le convertir en URL relative
      if (normalizedImageUrl.includes('\\') || normalizedImageUrl.match(/^[A-Z]:\\/i)) {
        console.log(`[EditRestaurant] 🔄 Détection chemin Windows, conversion en URL relative...`);
        
        // Extraire le nom du fichier
        const fileName = normalizedImageUrl.split('\\').pop() || normalizedImageUrl.split('/').pop() || '';
        
        // Si le chemin contient "images", extraire la partie relative
        const imagesIndex = normalizedImageUrl.toLowerCase().indexOf('images');
        if (imagesIndex !== -1) {
          const relativePath = normalizedImageUrl.substring(imagesIndex);
          normalizedImageUrl = '/' + relativePath.replace(/\\/g, '/');
        } else if (fileName) {
          // Sinon, utiliser juste le nom du fichier à la racine
          normalizedImageUrl = `/${fileName}`;
        } else {
          normalizedImageUrl = '';
        }
        
        console.log(`[EditRestaurant] ✅ URL normalisée: ${normalizedImageUrl}`);
      }
      
      // S'assurer que l'URL commence par / pour les chemins relatifs
      if (normalizedImageUrl && !normalizedImageUrl.startsWith('/') && !normalizedImageUrl.startsWith('http://') && !normalizedImageUrl.startsWith('https://')) {
        normalizedImageUrl = '/' + normalizedImageUrl;
      }

      const restaurantData: any = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        description: form.description,
        imageUrl: normalizedImageUrl || undefined,
        categories: form.categories,
        deliveryTime: form.deliveryTime,
        minOrder: form.minOrder,
        rating: form.rating,
        openingHours: openingHours || null,
      };
      
      // Ajouter le mot de passe seulement s'il est rempli (pour le modifier)
      if (form.password && form.password.trim() !== "") {
        restaurantData.password = form.password;
      }

      await onSubmit(restaurant.id, restaurantData);
      onOpenChange(false);
      onCancel();
    } catch (err) {
      // Error handled by parent
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le restaurant</DialogTitle>
          <DialogDescription>
            Modifiez les informations du restaurant
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nom *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom du restaurant"
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
              placeholder="/logo.jpeg, /images/restaurants/... ou /images/products/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 Vous pouvez utiliser :
              <br />
              ✅ Les images de produits (/images/products/...) sont autorisées pour les restaurants
              <br />
              ✅ Les chemins Windows seront automatiquement convertis
            </p>
            <ul className="text-xs text-muted-foreground mt-1 ml-4 list-disc space-y-1">
              <li>Coller un chemin Windows (ex: C:\Users\...\logo.png) - sera automatiquement converti</li>
              <li>Utiliser un chemin relatif (ex: /logo.jpeg, /images/restaurants/nom.jpg ou /images/products/nom.png)</li>
              <li>✅ <strong>Les images de produits sont autorisées</strong> (ex: /images/products/4fromage.png)</li>
              <li>Utiliser une URL externe (ex: https://images.unsplash.com/...)</li>
            </ul>
            {/* Aperçu de l'image */}
            {form.imageUrl && form.imageUrl.trim() !== "" && (() => {
              // Utiliser la même fonction de normalisation que pour la sauvegarde
              const previewUrl = normalizeImagePath(form.imageUrl);
              
              return (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">Aperçu:</Label>
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={previewUrl}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(`[EditRestaurant] ❌ Erreur chargement image: ${previewUrl}`);
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                            <div class="text-center">
                              <p>Image invalide</p>
                              <p class="text-xs mt-1">URL: ${previewUrl}</p>
                            </div>
                          </div>`;
                        }
                      }}
                      onLoad={() => {
                        console.log(`[EditRestaurant] ✅ Image chargée avec succès: ${previewUrl}`);
                      }}
                    />
                  </div>
                  {previewUrl !== form.imageUrl && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 URL normalisée pour l'aperçu: {previewUrl}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
          <div>
            <Label>Catégories de produits *</Label>
            <div className="space-y-2 mt-2 border rounded-md p-3">
              {["pizza", "burger", "salade", "grill", "drink", "dessert"].map((cat) => (
                <div key={cat} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`edit-cat-${cat}`}
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
                    htmlFor={`edit-cat-${cat}`}
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
                  value={(() => {
                    if (!form.openingHours) return "";
                    const hoursPart = form.openingHours.split("|")[0] || "";
                    const openTime = hoursPart.split("-")[0] || "";
                    adminLog("[ADMIN] Modal Edit - Champ 'De' - openingHours:", form.openingHours, "hoursPart:", hoursPart, "openTime:", openTime);
                    return openTime;
                  })()}
                  onChange={(e) => {
                    const hoursPart = form.openingHours ? form.openingHours.split("|")[0] || "" : "";
                    const closeTime = hoursPart.split("-")[1] || "23:00";
                    const closedDay = form.closedDay && form.closedDay !== "none" ? form.closedDay : "";
                    const newHours = `${e.target.value}-${closeTime}`;
                    adminLog("[ADMIN] Modal Edit - Changement heure ouverture:", e.target.value, "newHours:", newHours);
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
                  value={(() => {
                    if (!form.openingHours) return "";
                    const hoursPart = form.openingHours.split("|")[0] || "";
                    const closeTime = hoursPart.split("-")[1] || "";
                    adminLog("[ADMIN] Modal Edit - Champ 'À' - openingHours:", form.openingHours, "hoursPart:", hoursPart, "closeTime:", closeTime);
                    return closeTime;
                  })()}
                  onChange={(e) => {
                    const hoursPart = form.openingHours ? form.openingHours.split("|")[0] || "" : "";
                    const openTime = hoursPart.split("-")[0] || "09:00";
                    const closedDay = form.closedDay && form.closedDay !== "none" ? form.closedDay : "";
                    const newHours = `${openTime}-${e.target.value}`;
                    adminLog("[ADMIN] Modal Edit - Changement heure fermeture:", e.target.value, "newHours:", newHours);
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
              onValueChange={(value) => {
                const closedDay = value === "none" ? "" : value;
                let openingHours = form.openingHours.split("|")[0] || "";
                setForm({ 
                  ...form, 
                  closedDay: closedDay,
                  openingHours: closedDay ? `${openingHours}|${closedDay}` : openingHours
                });
              }}
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
            <Label>Nouveau mot de passe (optionnel)</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Laisser vide pour ne pas modifier"
              minLength={6}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 6 caractères. Laisser vide pour conserver le mot de passe actuel.
            </p>
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

