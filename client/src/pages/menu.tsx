import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { PizzaCard } from "@/components/pizza-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Star, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";

import pizzaMargherita from "@assets/generated_images/pizza_margherita.png";
import pizzaTunisian from "@assets/generated_images/tunisian_pizza.png";
import pizzaPepperoni from "@assets/generated_images/pizza_pepperoni.png";
import pizzaVegetarian from "@assets/generated_images/vegetarian_pizza.png";

const imageMap: { [key: string]: string } = {
  "Margherita": pizzaMargherita,
  "La Tunisienne": pizzaTunisian,
  "Pepperoni": pizzaPepperoni,
  "Vegetarian": pizzaVegetarian,
  "Tataouine Spéciale": pizzaTunisian,
  "4 Fromages": pizzaMargherita,
  "Mechoui": pizzaPepperoni,
  "Brochettes Mixtes": pizzaVegetarian,
};

interface Pizza {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  category: string;
  restaurantId: string;
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
}

export default function Menu() {
  const params = useParams<{ restaurantId?: string }>();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
  const { t, language } = useLanguage();
  const { addItem, restaurantId: cartRestaurantId } = useCart();
  const isRtl = language === 'ar';
  
  const restaurantId = params.restaurantId;

  // Fonction pour vérifier si le restaurant est ouvert maintenant
  const checkIfRestaurantIsOpen = (restaurant: Restaurant): boolean => {
    if (restaurant.isOpen === false) return false;
    if (!restaurant.openingHours) return true; // Si pas d'horaires, considérer ouvert
    
    // Parse opening hours (format: "09:00-23:00")
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
          // Load specific restaurant and its menu
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
            const transformed = menuData.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: parseFloat(p.prices?.[1]?.price || p.prices?.[0]?.price || "15"),
              image: imageMap[p.name] || pizzaMargherita,
              category: p.category,
              restaurantId: p.restaurantId,
            }));
            setPizzas(transformed);
          }
        } else {
          // Load all pizzas (fallback)
          const res = await fetch("/api/pizzas");
          if (res.ok) {
            const data = await res.json();
            const transformed = data.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: parseFloat(p.prices?.[1]?.price || p.prices?.[0]?.price || "15"),
              image: imageMap[p.name] || pizzaMargherita,
              category: p.category,
              restaurantId: p.restaurantId,
            }));
            setPizzas(transformed);
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
    const matchesSearch = pizza.name.toLowerCase().includes(search.toLowerCase()) || 
                          (pizza.description && pizza.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "all" || pizza.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (pizza: Pizza) => {
    addItem({
      ...pizza,
      description: pizza.description || "",
      category: pizza.category as 'classic' | 'special' | 'vegetarian',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-muted-foreground">{t('menu.loading') || 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Restaurant Header */}
      {restaurant && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-4 -mx-4 md:mx-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/")}
            className="mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-3xl">🍕</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-bold">{restaurant.name}</h1>
              <p className="text-sm text-muted-foreground">{restaurant.address}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{restaurant.rating || "4.5"}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{restaurant.deliveryTime || 30} min</span>
                </div>
                {isRestaurantOpen ? (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                    Ouvert
                  </span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    Fermé
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Alerte si le restaurant est fermé */}
          {!isRestaurantOpen && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-xl">🚫</span>
                <div>
                  <p className="font-semibold text-red-800">
                    Restaurant fermé
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    {restaurant.openingHours 
                      ? `Le restaurant sera ouvert de ${restaurant.openingHours}`
                      : "Le restaurant est actuellement fermé. Merci de commander pendant les horaires d'ouverture."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            {restaurant ? "Menu" : t('menu.title')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {filteredPizzas.length} {language === 'ar' ? "منتج" : language === 'en' ? "items" : "produits"}
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 ${isRtl ? 'right-3' : 'left-3'}`} />
          <Input 
            placeholder={t('menu.search')}
            className={`${isRtl ? 'pr-9' : 'pl-9'} bg-white/50 backdrop-blur border-primary/20 focus-visible:ring-primary`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" value={category} onValueChange={setCategory} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 h-auto gap-2 mb-6 no-scrollbar">
          <TabsTrigger 
            value="all" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            {t('cat.all')}
          </TabsTrigger>
          <TabsTrigger 
            value="classic" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[100px]"
          >
            🍕 {t('cat.classic')}
          </TabsTrigger>
          <TabsTrigger 
            value="special" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[100px]"
          >
            ⭐ {t('cat.special')}
          </TabsTrigger>
          <TabsTrigger 
            value="vegetarian" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[100px]"
          >
            🥗 {t('cat.vegetarian')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="mt-0">
          {filteredPizzas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'ar' ? "لا توجد منتجات" : language === 'en' ? "No items found" : "Aucun produit trouvé"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPizzas.map((pizza) => (
                <PizzaCard 
                  key={pizza.id} 
                  pizza={pizza} 
                  onAddToCart={() => handleAddToCart(pizza)}
                  disabled={!isRestaurantOpen}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
