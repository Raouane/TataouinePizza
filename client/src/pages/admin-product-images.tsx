import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminPizzas, updatePizza } from "@/lib/api";
import type { Pizza } from "@/lib/api";
import { LogOut, RefreshCw, AlertCircle, Edit, ImageIcon, Eye, EyeOff, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function AdminProductImages() {
  const [, setLocation] = useLocation();
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "with-image" | "without-image">("all");
  const [editingPizza, setEditingPizza] = useState<Pizza | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    fetchPizzas();
  }, [token, setLocation]);

  const fetchPizzas = async () => {
    try {
      setLoading(true);
      if (!token) {
        console.error("[ADMIN IMAGES] Token manquant");
        setLocation("/admin/login");
        return;
      }
      const data = await getAdminPizzas(token);
      console.log(`[ADMIN IMAGES] ${data.length} produits chargés`);
      
      // Log détaillé des images
      const withImages = data.filter(p => p.imageUrl && p.imageUrl.trim() !== '').length;
      const withoutImages = data.filter(p => !p.imageUrl || p.imageUrl.trim() === '').length;
      console.log(`[ADMIN IMAGES] Avec images: ${withImages}, Sans images: ${withoutImages}`);
      
      setPizzas(data);
      setError("");
    } catch (err: any) {
      console.error("[ADMIN IMAGES] Erreur lors du chargement:", err);
      setError(err.message || "Erreur lors du chargement des produits");
      if (err.message?.includes("401") || err.message?.includes("token") || err.message?.includes("Invalid")) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditImage = (pizza: Pizza) => {
    setEditingPizza(pizza);
    setImageUrl(pizza.imageUrl || "");
    setShowEditDialog(true);
  };

  const handleUpdateImage = async () => {
    if (!editingPizza || !token) return;
    
    try {
      console.log(`[ADMIN IMAGES] Mise à jour image pour "${editingPizza.name}"`);
      console.log(`[ADMIN IMAGES] URL avant normalisation: ${imageUrl}`);
      
      // ✅ Normaliser l'URL : convertir les chemins Windows en URLs relatives
      let normalizedUrl = imageUrl.trim();
      
      // Si c'est un chemin Windows (contient \ ou C:\), le convertir en URL relative
      if (normalizedUrl.includes('\\') || normalizedUrl.match(/^[A-Z]:\\/i)) {
        console.log(`[ADMIN IMAGES] 🔄 Détection chemin Windows, conversion en URL relative...`);
        
        // Extraire le nom du fichier
        const fileName = normalizedUrl.split('\\').pop() || normalizedUrl.split('/').pop() || '';
        
        // Si le chemin contient "images/products", extraire la partie relative
        const productsIndex = normalizedUrl.toLowerCase().indexOf('images/products');
        if (productsIndex !== -1) {
          const relativePath = normalizedUrl.substring(productsIndex);
          normalizedUrl = '/' + relativePath.replace(/\\/g, '/');
        } else if (fileName) {
          // Sinon, utiliser juste le nom du fichier dans images/products
          normalizedUrl = `/images/products/${fileName}`;
        } else {
          normalizedUrl = '';
        }
        
        console.log(`[ADMIN IMAGES] ✅ URL normalisée: ${normalizedUrl}`);
      }
      
      // S'assurer que l'URL commence par / pour les chemins relatifs
      if (normalizedUrl && !normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = '/' + normalizedUrl;
      }
      
      console.log(`[ADMIN IMAGES] URL finale envoyée: ${normalizedUrl}`);
      
      await updatePizza(editingPizza.id, {
        imageUrl: normalizedUrl || undefined,
      }, token);
      
      toast.success("Image mise à jour avec succès!");
      setShowEditDialog(false);
      setEditingPizza(null);
      setImageUrl("");
      await fetchPizzas();
    } catch (err: any) {
      console.error("[ADMIN IMAGES] Erreur lors de la mise à jour:", err);
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setLocation("/admin/login");
  };

  // Filtrer les produits
  const filteredPizzas = pizzas.filter((pizza) => {
    // Filtre par recherche
    if (searchQuery && !pizza.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filtre par présence d'image
    const hasImage = pizza.imageUrl && pizza.imageUrl.trim() !== "";
    if (filterType === "with-image" && !hasImage) return false;
    if (filterType === "without-image" && hasImage) return false;
    
    return true;
  });

  const withImagesCount = pizzas.filter(p => p.imageUrl && p.imageUrl.trim() !== '').length;
  const withoutImagesCount = pizzas.filter(p => !p.imageUrl || p.imageUrl.trim() === '').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-serif font-bold truncate">Gestion des Images</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">Gérer les images des produits</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={fetchPizzas} className="px-2 md:px-3">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Sheet open={showMenu} onOpenChange={setShowMenu}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2 md:px-3">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        setLocation("/admin");
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Dashboard Admin</p>
                        <p className="text-xs text-muted-foreground">Retour au tableau de bord</p>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        handleLogout();
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-red-100 p-2 rounded-lg">
                        <LogOut className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Déconnexion</p>
                        <p className="text-xs text-muted-foreground">Quitter l'application</p>
                      </div>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {error && (
          <div className="mb-4 flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{pizzas.length}</p>
              </div>
              <ImageIcon className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avec images</p>
                <p className="text-2xl font-bold text-green-600">{withImagesCount}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sans images</p>
                <p className="text-2xl font-bold text-red-600">{withoutImagesCount}</p>
              </div>
              <EyeOff className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Rechercher un produit</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Nom du produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Label>Filtrer par</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "all" | "with-image" | "without-image")}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="all">Tous</option>
                <option value="with-image">Avec images</option>
                <option value="without-image">Sans images</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Liste des produits */}
        {loading ? (
          <Card className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
            <p className="text-muted-foreground">Chargement des produits...</p>
          </Card>
        ) : filteredPizzas.length === 0 ? (
          <Card className="p-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun produit trouvé</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Aucun produit ne correspond à votre recherche" : "Aucun produit à afficher"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPizzas.map((pizza) => {
              const hasImage = pizza.imageUrl && pizza.imageUrl.trim() !== "";
              const imageUrl = pizza.imageUrl || "";
              const isFailed = failedImages.has(pizza.id);

              return (
                <Card key={pizza.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg break-words">{pizza.name}</h3>
                      {pizza.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {pizza.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={hasImage ? "default" : "destructive"}
                      className="flex-shrink-0"
                    >
                      {hasImage ? (
                        <Eye className="w-3 h-3 mr-1" />
                      ) : (
                        <EyeOff className="w-3 h-3 mr-1" />
                      )}
                      {hasImage ? "Avec image" : "Sans image"}
                    </Badge>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-square bg-gray-100 flex-shrink-0 mb-3 rounded-lg overflow-hidden">
                    {hasImage && !isFailed ? (
                      <img
                        src={imageUrl}
                        alt={pizza.name}
                        className="w-full h-full object-cover"
                        onLoad={() => {
                          console.log(`[ADMIN IMAGES] ✅ Image chargée: ${imageUrl} pour "${pizza.name}"`);
                          setFailedImages(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(pizza.id);
                            return newSet;
                          });
                        }}
                        onError={() => {
                          console.error(`[ADMIN IMAGES] ❌ Erreur chargement image: ${imageUrl} pour "${pizza.name}"`);
                          setFailedImages(prev => new Set(prev).add(pizza.id));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center p-4">
                          {isFailed ? (
                            <>
                              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">Image invalide</p>
                              <p className="text-xs text-gray-400 mt-1 break-all">{imageUrl}</p>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">Pas d'image</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* URL de l'image */}
                  {hasImage && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">URL de l'image:</p>
                      <p className="text-xs break-all bg-gray-50 p-2 rounded border">
                        {imageUrl}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditImage(pizza)}
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {hasImage ? "Modifier l'image" : "Ajouter une image"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog pour modifier l'image */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'image</DialogTitle>
            <DialogDescription>
              Modifiez l'URL de l'image pour le produit "{editingPizza?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>URL de l'image</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="/images/products/nom-du-produit.jpg ou https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Vous pouvez :
              </p>
              <ul className="text-xs text-muted-foreground mt-1 ml-4 list-disc space-y-1">
                <li>Coller un chemin Windows (ex: C:\Users\...\4fromage.png) - sera automatiquement converti</li>
                <li>Utiliser un chemin relatif (ex: /images/products/4fromage.png)</li>
                <li>Utiliser une URL externe (ex: https://images.unsplash.com/...)</li>
              </ul>
            </div>

            {/* Aperçu */}
            {imageUrl && imageUrl.trim() !== "" && (() => {
              // Normaliser l'URL pour l'aperçu aussi
              let previewUrl = imageUrl.trim();
              
              // Si c'est un chemin Windows, le convertir pour l'aperçu
              if (previewUrl.includes('\\') || previewUrl.match(/^[A-Z]:\\/i)) {
                const productsIndex = previewUrl.toLowerCase().indexOf('images/products');
                if (productsIndex !== -1) {
                  previewUrl = '/' + previewUrl.substring(productsIndex).replace(/\\/g, '/');
                } else {
                  const fileName = previewUrl.split('\\').pop() || previewUrl.split('/').pop() || '';
                  if (fileName) {
                    previewUrl = `/images/products/${fileName}`;
                  }
                }
              }
              
              return (
                <div>
                  <Label>Aperçu</Label>
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mt-1">
                    <img
                      src={previewUrl}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.preview-error')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'preview-error w-full h-full flex items-center justify-center bg-red-50';
                          errorDiv.innerHTML = '<p class="text-red-500 text-sm">Image invalide</p>';
                          parent.appendChild(errorDiv);
                        }
                      }}
                    />
                  </div>
                  {previewUrl !== imageUrl && (
                    <p className="text-xs text-blue-600 mt-1">
                      💡 URL normalisée pour l'aperçu: {previewUrl}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-2">
              <Button onClick={handleUpdateImage} className="flex-1">
                Enregistrer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingPizza(null);
                  setImageUrl("");
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
