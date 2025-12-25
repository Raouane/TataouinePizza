import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Star, Clock, MapPin, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { isRestaurantOpen, getRestaurantCloseReason, parseOpeningHours } from "@/lib/restaurant-status";

interface Pizza {
  id: string;
  name: string;
  description?: string;
  prices: Array<{ size: string; price: string }>;
  imageUrl?: string;
  category: string;
  restaurantId: string;
  productType?: string;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  description?: string;
  rating?: string;
  deliveryTime?: number;
  isOpen?: boolean;
  openingHours?: string;
  imageUrl?: string;
  categories?: string[];
}

export default function Menu() {
  const params = useParams<{ restaurantId?: string }>();
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState("all");
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantIsOpen, setRestaurantIsOpen] = useState(true);
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const { addItem } = useCart();
  const { t } = useLanguage();
  
  const restaurantId = params.restaurantId;

  // Les fonctions parseOpeningHours, isRestaurantOpen et getRestaurantCloseReason 
  // sont maintenant importées depuis @/lib/restaurant-status

  useEffect(() => {
    const loadData = async () => {
      try {
        if (restaurantId) {
          const [restRes, menuRes] = await Promise.all([
            fetch(`/api/restaurants/${restaurantId}`),
            fetch(`/api/restaurants/${restaurantId}/menu`)
          ]);
          
          if (restRes.ok) {
            const restData = await restRes.json();
            setRestaurant(restData);
            setRestaurantIsOpen(isRestaurantOpen(restData));
          }
          
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            console.log(`[Menu] ${menuData.length} produits chargés pour le restaurant ${restaurantId}`, menuData);
            setPizzas(menuData);
          } else {
            console.error(`[Menu] Erreur lors du chargement du menu: ${menuRes.status} ${menuRes.statusText}`);
            const errorData = await menuRes.json().catch(() => ({}));
            console.error("[Menu] Détails de l'erreur:", errorData);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [restaurantId]);

  const filteredPizzas = pizzas.filter(pizza => {
    if (category === "all") return true;
    return pizza.category === category;
  });

  const categories = Array.from(new Set(pizzas.map(p => p.category).filter(Boolean)));
  
  console.log(`[Menu] Filtrage: catégorie="${category}", ${pizzas.length} produits totaux, ${filteredPizzas.length} produits filtrés`);
  console.log(`[Menu] Catégories disponibles:`, categories);
  console.log(`[Menu] Produits:`, pizzas.map(p => ({ name: p.name, category: p.category, prices: p.prices?.length || 0 })));

  const handleAddToCart = (pizza: Pizza, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Si le produit a plusieurs tailles, ouvrir le modal
    if (pizza.prices && pizza.prices.length > 1) {
      setSelectedPizza(pizza);
      setSelectedSize(null); // Réinitialiser la sélection
      setIsSizeDialogOpen(true);
      return;
    }
    
    // Si une seule taille, ajouter directement
    const defaultPrice = pizza.prices?.[0];
    const price = parseFloat(defaultPrice?.price || "15");
    const size = (defaultPrice?.size || "medium") as 'small' | 'medium' | 'large';
    
    const success = addItem({
      id: pizza.id,
      name: pizza.name,
      description: pizza.description || "",
      price: price,
      image: pizza.imageUrl || "",
      category: pizza.category as 'classic' | 'special' | 'vegetarian',
      restaurantId: pizza.restaurantId,
    }, size, restaurant?.name);
    
    if (!success) {
      toast.error(t('menu.addToCart.error'));
    }
  };

  // Nouvelle fonction pour confirmer l'ajout avec la taille sélectionnée
  const handleConfirmAddToCart = () => {
    if (!selectedPizza || !selectedSize) {
      toast.error(t('menu.sizeSelection.required'));
      return;
    }
    
    const selectedPrice = selectedPizza.prices?.find(p => p.size === selectedSize);
    if (!selectedPrice) {
      toast.error(t('menu.sizeSelection.invalid'));
      return;
    }
    
    const price = parseFloat(selectedPrice.price);
    const size = selectedSize as 'small' | 'medium' | 'large';
    
    const success = addItem({
      id: selectedPizza.id,
      name: selectedPizza.name,
      description: selectedPizza.description || "",
      price: price,
      image: selectedPizza.imageUrl || "",
      category: selectedPizza.category as 'classic' | 'special' | 'vegetarian',
      restaurantId: selectedPizza.restaurantId,
    }, size, restaurant?.name);
    
    if (success) {
      setIsSizeDialogOpen(false);
      setSelectedPizza(null);
      setSelectedSize(null);
    } else {
      toast.error(t('menu.addToCart.error'));
    }
  };

  // Fonction pour obtenir le label de la taille
  const getSizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      small: t('menu.size.small'),
      medium: t('menu.size.medium'),
      large: t('menu.size.large'),
    };
    return labels[size.toLowerCase()] || size;
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      classic: t('cat.classic'),
      special: t('cat.special'),
      speciale: t('cat.special'),
      vegetarian: t('cat.vegetarian'),
      vegetarien: t('cat.vegetarian'),
      all: t('menu.category.all'),
      pizza: t('menu.category.pizza'),
      burger: t('menu.category.burger'),
      salade: t('menu.category.salade'),
      grill: t('menu.category.grill'),
      drink: t('menu.category.drink'),
      dessert: t('menu.category.dessert'),
    };
    return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-muted-foreground">{t('menu.loading')}</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('menu.restaurantNotFound')}</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          {t('menu.backHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-24">
      {/* Hero Image Section */}
      <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
        {restaurant.imageUrl && restaurant.imageUrl.trim() !== "" ? (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center">
            <span className="text-8xl">🍕</span>
          </div>
        )}
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setLocation("/")}
            className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          {(() => {
            const closeReason = getRestaurantCloseReason(restaurant);
            const isTemporarilyClosed = closeReason === 'toggle';
            
            return (
              <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                restaurantIsOpen 
                  ? "bg-green-500 text-white" 
                  : isTemporarilyClosed
                  ? "bg-orange-500 text-white"
                  : "bg-gray-500 text-white"
              }`}>
                {restaurantIsOpen 
                  ? t('menu.status.open') 
                  : isTemporarilyClosed
                  ? "🔒 Fermé temporairement"
                  : t('menu.status.closed')}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Restaurant Info Card */}
      <div className="relative -mt-16 sm:-mt-20 z-10 px-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-4 md:p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
          <p className="text-gray-600 text-sm md:text-base mb-4">
            {restaurant.description || restaurant.address}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 md:w-5 md:h-5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-sm md:text-base text-gray-900">
                {restaurant.rating || "4.8"}
              </span>
              <span className="text-xs md:text-sm text-gray-500 ml-1">
                ({Math.floor(Math.random() * 200) + 50} {t('menu.reviews')})
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-700">
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">
                {restaurant.deliveryTime || 30}-{restaurant.deliveryTime ? restaurant.deliveryTime + 10 : 40} {t('common.min')}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-700">
              <MapPin className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">2.5 {t('common.currency')} {t('menu.deliveryFee')}</span>
            </div>
          </div>

          {/* Categories Tags */}
          {restaurant.categories && restaurant.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {restaurant.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {cat === "pizza" ? "Pizza" : 
                   cat === "burger" ? "Burger" :
                   cat === "salade" ? "Salade" :
                   cat === "grill" ? "Grillades" :
                   cat === "drink" ? "Boisson" :
                   cat === "dessert" ? "Dessert" : cat}
                </span>
              ))}
            </div>
          )}

          {/* Alert if closed */}
          {!restaurantIsOpen && (() => {
            const closeReason = getRestaurantCloseReason(restaurant);
            const isTemporarilyClosed = closeReason === 'toggle';
            const { hours, closedDay } = parseOpeningHours(restaurant?.openingHours);
            
            return (
              <div className={`mt-4 p-4 rounded-lg border-l-4 ${
                isTemporarilyClosed
                  ? "bg-orange-50 border-orange-500"
                  : "bg-gray-50 border-gray-500"
              }`}>
                <p className={`font-semibold ${
                  isTemporarilyClosed ? "text-orange-800" : "text-gray-800"
                }`}>
                  {isTemporarilyClosed 
                    ? "⚠️ Restaurant fermé temporairement" 
                    : "Fermé"}
                </p>
                <div className={`text-sm mt-2 space-y-1 ${
                  isTemporarilyClosed ? "text-orange-600" : "text-gray-600"
                }`}>
                  {isTemporarilyClosed ? (
                    <p>Le restaurant est fermé temporairement. Veuillez réessayer plus tard.</p>
                  ) : (
                    <>
                      {hours && (
                        <p><span className="font-semibold">Horaires d'ouverture :</span> {hours}</p>
                      )}
                      {closedDay && (
                        <p><span className="font-semibold">Jour de repos :</span> {closedDay}</p>
                      )}
                      {!hours && !closedDay && (
                        <p>Le restaurant est fermé selon les horaires d'ouverture.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Menu Section */}
      <div className="px-4 mt-6 md:mt-8 max-w-4xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">{t('menu.title')}</h2>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:mb-6 scrollbar-hide">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              category === "all"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {t('menu.category.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                category === cat
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Products List */}
        {filteredPizzas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="text-4xl mb-4">🍕</div>
            <p className="text-gray-600 font-medium mb-2">
              {category !== "all" 
                ? `${t('menu.noProducts.category')} "${getCategoryLabel(category)}"`
                : t('menu.noProducts.restaurant')}
            </p>
            <p className="text-sm text-gray-500">
              {category !== "all" 
                ? t('menu.noProducts.tryCategory')
                : t('menu.noProducts.create')}
            </p>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {filteredPizzas.map((pizza) => {
              // Vérifier que le produit a des prix
              if (!pizza.prices || pizza.prices.length === 0) {
                console.warn(`[Menu] Produit ${pizza.name} n'a pas de prix`);
              }
              
              const defaultPrice = pizza.prices?.find(p => p.size === "medium") || pizza.prices?.[0];
              const price = parseFloat(defaultPrice?.price || "15");
              
              return (
                <div
                  key={pizza.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Image en haut - plus grande et attirante */}
                  <div className="w-full h-48 md:h-56 lg:h-64 relative overflow-hidden bg-gradient-to-br from-orange-100 to-red-100">
                    {pizza.imageUrl && pizza.imageUrl.trim() !== "" ? (
                      <img
                        src={pizza.imageUrl}
                        alt={pizza.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl md:text-7xl">🍕</span>
                      </div>
                    )}
                    {/* Overlay subtil pour améliorer la lisibilité */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Contenu en dessous */}
                  <div className="p-4 md:p-5">
                    <div className="flex flex-col gap-3">
                      {/* Nom et description */}
                      <div>
                        <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-1">
                          {pizza.name}
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 line-clamp-2">
                          {pizza.description || t('menu.product.defaultDescription')}
                        </p>
                      </div>

                      {/* Prix et bouton sur la même ligne */}
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-orange-500 font-bold text-xl md:text-2xl">
                            {price.toFixed(2)} {t('common.currency')}
                          </span>
                          {pizza.prices.length > 1 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t('menu.sizeSelection.available')}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          onClick={(e) => handleAddToCart(pizza, e)}
                          disabled={!restaurantIsOpen}
                          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 md:px-8 py-2.5 md:py-3 h-auto flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <Plus className="w-5 h-5 md:w-6 md:h-6" />
                          <span className="font-medium text-sm md:text-base">{t('menu.add')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Size Selection Dialog */}
      <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPizza?.name}</DialogTitle>
            <DialogDescription>
              {t('menu.sizeSelection.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedPizza?.prices?.map((priceOption) => (
              <button
                key={priceOption.size}
                onClick={() => setSelectedSize(priceOption.size)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedSize === priceOption.size
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="font-semibold text-lg">
                      {getSizeLabel(priceOption.size)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedPizza.description || t('menu.product.defaultDescription')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-500">
                      {parseFloat(priceOption.price).toFixed(2)} {t('common.currency')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsSizeDialogOpen(false);
                setSelectedPizza(null);
                setSelectedSize(null);
              }}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirmAddToCart}
              disabled={!selectedSize}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
            >
              {t('menu.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
