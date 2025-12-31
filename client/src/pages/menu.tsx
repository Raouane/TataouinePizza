import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Star, Clock, MapPin, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { isRestaurantOpen, getRestaurantCloseReason, parseOpeningHours } from "@/lib/restaurant-status";
import { PizzaImage } from "@/components/menu/pizza-image";
import { getCategoryLabel } from "@/lib/category-labels";

// Flag de debug - désactiver en production
const DEBUG_MENU = import.meta.env.DEV;

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
  phone?: string;
  orderType?: "online" | "phone_call" | "coming_soon";
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
  const { t, language } = useLanguage();
  const firstSizeButtonRef = useRef<HTMLButtonElement>(null);
  const productRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const hasScrolledToProduct = useRef(false);
  
  const restaurantId = params.restaurantId;

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
            if (DEBUG_MENU) {
              console.log(`[Menu] ${menuData.length} produits chargés pour le restaurant ${restaurantId}`);
              const withImages = menuData.filter((p: Pizza) => p.imageUrl && p.imageUrl.trim() !== '').length;
              const withoutImages = menuData.length - withImages;
              console.log(`[Menu] 📊 RÉSUMÉ: ${withImages} avec images, ${withoutImages} sans images`);
            }
            setPizzas(menuData);
          } else {
            if (DEBUG_MENU) {
              console.error(`[Menu] Erreur lors du chargement du menu: ${menuRes.status} ${menuRes.statusText}`);
            }
          }
        }
      } catch (error) {
        if (DEBUG_MENU) {
          console.error("Failed to load data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [restaurantId]);

  // Mémoïsation des catégories
  const categories = useMemo(() => {
    return Array.from(new Set(pizzas.map(p => p.category).filter(Boolean)));
  }, [pizzas]);

  // Mémoïsation des pizzas filtrées
  const filteredPizzas = useMemo(() => {
    return pizzas.filter(pizza => {
      if (category === "all") return true;
      return pizza.category === category;
    });
  }, [pizzas, category]);

  if (DEBUG_MENU) {
    console.log(`[Menu] Filtrage: catégorie="${category}", ${pizzas.length} produits totaux, ${filteredPizzas.length} produits filtrés`);
  }

  // Focus sur le premier bouton de taille quand le dialog s'ouvre
  useEffect(() => {
    if (isSizeDialogOpen && firstSizeButtonRef.current) {
      firstSizeButtonRef.current.focus();
    }
  }, [isSizeDialogOpen]);

  // Fonction helper pour scroller vers le produit et le surligner
  const scrollToProduct = useCallback((productId: string) => {
    // Attendre que le DOM soit mis à jour
    setTimeout(() => {
      const productElement = productRefs.current[productId];
      
      if (productElement) {
        // Scroller vers le produit avec un offset pour le header
        const offset = 120; // Offset pour le header et les tabs
        const elementPosition = productElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Surligner le produit brièvement pour attirer l'attention
        productElement.classList.add('ring-4', 'ring-orange-500', 'ring-offset-2', 'rounded-2xl');
        setTimeout(() => {
          productElement.classList.remove('ring-4', 'ring-orange-500', 'ring-offset-2');
        }, 3000); // Surlignage plus long pour laisser le temps de voir

        hasScrolledToProduct.current = true;

        // Nettoyer l'URL pour éviter de re-scroller si on revient sur la page
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }, 200); // Petit délai pour laisser le DOM se mettre à jour
  }, []);

  // Gérer le scroll automatique vers le produit et l'ouverture du dialog
  useEffect(() => {
    if (loading || pizzas.length === 0) return;

    // Lire le query param product depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');

    if (productId && !hasScrolledToProduct.current) {
      // Trouver le produit dans la liste
      const product = pizzas.find(p => p.id === productId);
      
      if (product) {
        // Filtrer automatiquement vers la catégorie du produit si nécessaire
        if (category === "all" && product.category) {
          setCategory(product.category);
          // Attendre que le filtre soit appliqué avant de scroller
          setTimeout(() => {
            scrollToProduct(productId);
          }, 300);
        } else {
          // Le produit est déjà dans la catégorie visible, scroller immédiatement
          scrollToProduct(productId);
        }
      }
    }
  }, [loading, pizzas, category, scrollToProduct]);

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

  const closeReason = getRestaurantCloseReason(restaurant);
  const isTemporarilyClosed = closeReason === 'toggle';
  const { hours, closedDay } = parseOpeningHours(restaurant?.openingHours || "");

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-24">
      {/* Hero Image Section */}
      <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
        <PizzaImage
          src={restaurant.imageUrl}
          alt={restaurant.name}
          className="w-full h-full"
          fallback={
            <div className="w-full h-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center">
              <span className="text-8xl">🍕</span>
            </div>
          }
        />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setLocation("/")}
            className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
            aria-label={t('common.back') || "Retour"}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
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
              ? t('menu.status.temporarilyClosed') || "🔒 Fermé temporairement"
              : t('menu.status.closed')}
          </span>
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
          {restaurant.categories && restaurant.categories.length > 0 && (() => {
            // Filtrer les catégories à exclure (dessert, patisserie, bakery, sweets, drink, boisson)
            const excludedCategories = ['dessert', 'patisserie', 'bakery', 'sweets', 'drink', 'boisson'];
            const filteredCategories = restaurant.categories.filter(
              (cat) => !excludedCategories.includes(cat.toLowerCase())
            );
            
            return filteredCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
                {filteredCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {getCategoryLabel(cat, t)}
                </span>
              ))}
            </div>
            ) : null;
          })()}

          {/* Alert if closed */}
          {!restaurantIsOpen && (
            <div className={`mt-4 p-4 rounded-lg border-l-4 ${
              isTemporarilyClosed
                ? "bg-orange-50 border-orange-500"
                : "bg-gray-50 border-gray-500"
            }`}>
              <p className={`font-semibold ${
                isTemporarilyClosed ? "text-orange-800" : "text-gray-800"
              }`}>
                {isTemporarilyClosed 
                  ? t('menu.status.temporarilyClosedMessage') || "⚠️ Restaurant fermé temporairement"
                  : t('menu.status.closed')}
              </p>
              <div className={`text-sm mt-2 space-y-1 ${
                isTemporarilyClosed ? "text-orange-600" : "text-gray-600"
              }`}>
                {isTemporarilyClosed ? (
                  <p>{t('menu.status.temporarilyClosedDesc') || "Le restaurant est fermé temporairement. Veuillez réessayer plus tard."}</p>
                ) : (
                  <>
                    {hours && (
                      <p><span className="font-semibold">{t('menu.status.openingHours') || "Horaires d'ouverture :"}</span> {hours}</p>
                    )}
                    {closedDay && (
                      <p><span className="font-semibold">{t('menu.status.closedDay') || "Jour de repos :"}</span> {closedDay}</p>
                    )}
                    {!hours && !closedDay && (
                      <p>{t('menu.status.closedBySchedule') || "Le restaurant est fermé selon les horaires d'ouverture."}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Section */}
      <div className="px-4 mt-6 md:mt-8 max-w-4xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">{t('menu.title')}</h2>

        {/* Message spécial pour restaurants nécessitant un appel */}
        {restaurant.orderType === "phone_call" && (
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 md:p-6 mb-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="text-3xl md:text-4xl flex-shrink-0">📞</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg md:text-xl text-orange-900 mb-2">
                  {t('menu.phoneCall.title')}
                </h3>
                <p className="text-sm md:text-base text-orange-800 mb-3">
                  {t('menu.phoneCall.description')}
                </p>
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 md:px-6 py-2 md:py-3 rounded-lg transition-colors"
                  >
                    <span className="text-lg">📞</span>
                    <span>{t('menu.phoneCall.callNow')} {restaurant.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message pour commerces à venir */}
        {restaurant.orderType === "coming_soon" && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 md:p-6 mb-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="text-3xl md:text-4xl flex-shrink-0">🚀</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg md:text-xl text-blue-900 mb-2">
                  {t('menu.comingSoon.title')}
                </h3>
                <p className="text-sm md:text-base text-blue-800">
                  {t('menu.comingSoon.description')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs - Masquer si orderType n'est pas "online" */}
        {restaurant.orderType === "online" && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:mb-6 scrollbar-hide">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                category === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              aria-label={t('menu.category.all')}
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
                aria-label={getCategoryLabel(cat, t)}
              >
                {getCategoryLabel(cat, t)}
              </button>
            ))}
          </div>
        )}

        {/* Products List - Masquer si orderType n'est pas "online" */}
        {restaurant.orderType === "online" && (
          <>
            {filteredPizzas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="text-4xl mb-4">🍕</div>
            <p className="text-gray-600 font-medium mb-2">
              {category !== "all" 
                ? `${t('menu.noProducts.category')} "${getCategoryLabel(category, t)}"`
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
                if (DEBUG_MENU) {
                  console.warn(`[Menu] Produit ${pizza.name} n'a pas de prix`);
                }
              }
              
              const defaultPrice = pizza.prices?.find(p => p.size === "medium") || pizza.prices?.[0];
              const price = parseFloat(defaultPrice?.price || "15");
              
              return (
                <div
                  key={pizza.id}
                  id={`product-${pizza.id}`}
                  ref={(el) => (productRefs.current[pizza.id] = el)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Image en haut - plus grande et attirante */}
                  <div className="w-full h-48 md:h-56 lg:h-64 relative overflow-hidden bg-gradient-to-br from-orange-100 to-red-100">
                    <PizzaImage
                      src={pizza.imageUrl}
                      alt={pizza.name}
                      className="w-full h-full"
                    />
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
                          aria-label={`${t('menu.add')} ${pizza.name}`}
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
          </>
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
            {selectedPizza?.prices?.map((priceOption, index) => (
              <button
                key={priceOption.size}
                ref={index === 0 ? firstSizeButtonRef : null}
                onClick={() => setSelectedSize(priceOption.size)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedSize === priceOption.size
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                aria-label={`${getSizeLabel(priceOption.size)} - ${parseFloat(priceOption.price).toFixed(2)} ${t('common.currency')}`}
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
