import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Star, Clock, MapPin, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

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
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
  const { addItem } = useCart();
  
  const restaurantId = params.restaurantId;

  const checkIfRestaurantIsOpen = (restaurant: Restaurant): boolean => {
    if (restaurant.isOpen === false) return false;
    if (!restaurant.openingHours) return true;
    
    const [openTime, closeTime] = restaurant.openingHours.split("-");
    if (!openTime || !closeTime) return true;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

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
            setIsRestaurantOpen(checkIfRestaurantIsOpen(restData));
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

  const handleAddToCart = (pizza: Pizza) => {
    // Prendre le prix medium par défaut, sinon le premier disponible
    const defaultPrice = pizza.prices?.find(p => p.size === "medium") || pizza.prices?.[0];
    const price = parseFloat(defaultPrice?.price || "15");
    
    addItem({
      id: pizza.id,
      name: pizza.name,
      description: pizza.description || "",
      price: price,
      image: pizza.imageUrl || "",
      category: pizza.category as 'classic' | 'special' | 'vegetarian',
      restaurantId: pizza.restaurantId,
    });
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      classic: "Classique",
      special: "Spéciale",
      speciale: "Spéciale",
      vegetarian: "Végétarienne",
      vegetarien: "Végétarienne",
      all: "Tout",
    };
    return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Restaurant non trouvé</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Image Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
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
        <div className="absolute top-4 right-4">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            isRestaurantOpen 
              ? "bg-green-500 text-white" 
              : "bg-gray-500 text-white"
          }`}>
            {isRestaurantOpen ? "Ouvert" : "Fermé"}
          </span>
        </div>
      </div>

      {/* Restaurant Info Card */}
      <div className="relative -mt-20 z-10 px-4">
        <div className="bg-white rounded-3xl shadow-lg p-6 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
          <p className="text-gray-600 text-base mb-4">
            {restaurant.description || restaurant.address}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-gray-900">
                {restaurant.rating || "4.8"}
              </span>
              <span className="text-sm text-gray-500 ml-1">
                ({Math.floor(Math.random() * 200) + 50} avis)
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-700">
              <Clock className="w-5 h-5" />
              <span className="text-sm">
                {restaurant.deliveryTime || 30}-{restaurant.deliveryTime ? restaurant.deliveryTime + 10 : 40} min
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-700">
              <MapPin className="w-5 h-5" />
              <span className="text-sm">2.5 DT livraison</span>
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
          {!isRestaurantOpen && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="font-semibold text-red-800">Restaurant fermé</p>
              <p className="text-sm text-red-600 mt-1">
                {restaurant.openingHours 
                  ? `Le restaurant sera ouvert de ${restaurant.openingHours}`
                  : "Le restaurant est actuellement fermé."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Menu Section */}
      <div className="px-4 mt-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === "all"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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
                ? `Aucun produit dans la catégorie "${getCategoryLabel(category)}"`
                : "Aucun produit disponible pour ce restaurant"}
            </p>
            <p className="text-sm text-gray-500">
              {category !== "all" 
                ? "Essayez une autre catégorie"
                : "Créez des produits pour ce restaurant depuis l'espace admin"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                      {pizza.imageUrl && pizza.imageUrl.trim() !== "" ? (
                        <img
                          src={pizza.imageUrl}
                          alt={pizza.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl">🍕</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {pizza.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {pizza.description || "Délicieux plat préparé avec soin"}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-orange-500 font-bold text-lg">
                            {price.toFixed(2)} DT
                          </span>
                          {pizza.prices.length > 1 && (
                            <span className="text-xs text-gray-500">
                              ({pizza.prices.map(p => `${p.size}: ${p.price} DT`).join(", ")})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Add Button */}
                    <div className="flex items-center">
                      <Button
                        onClick={() => handleAddToCart(pizza)}
                        disabled={!isRestaurantOpen}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-3 h-auto flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Ajouter</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
