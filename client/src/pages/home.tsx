import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, MapPin, Star, Clock, Bike, Zap, Coins } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { getOnboarding } from "@/pages/onboarding";

interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  description?: string;
  imageUrl?: string;
  categories?: string[];
  isOpen?: boolean;
  deliveryTime?: number;
  rating?: string;
}

interface Pizza {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  category?: string;
  imageUrl?: string;
  prices?: Array<{ size: string; price: string }>;
}

export default function Home() {
  const { t } = useLanguage();
  const { count } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loadingPizzas, setLoadingPizzas] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Charger les plats seulement quand il y a une recherche (lazy loading)
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      fetchPizzas();
    } else {
      setPizzas([]); // Réinitialiser si recherche vide
    }
  }, [searchQuery]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      if (res.ok) {
        const data = await res.json();
        // Debug: vérifier les images
        const carrefour = data.find((r: Restaurant) => r.name.toLowerCase().includes('carrefour'));
        if (carrefour) {
          console.log('[Home] Carrefour trouvé:', {
            name: carrefour.name,
            imageUrl: carrefour.imageUrl,
            hasImage: !!(carrefour.imageUrl && carrefour.imageUrl.trim() !== '')
          });
        }
        setRestaurants(data);
      }
    } catch (err) {
      console.error("Failed to fetch restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPizzas = async () => {
    setLoadingPizzas(true);
    try {
      const res = await fetch("/api/pizzas");
      if (res.ok) {
        const data = await res.json();
        setPizzas(data);
      }
    } catch (err) {
      console.error("Failed to fetch pizzas:", err);
    } finally {
      setLoadingPizzas(false);
    }
  };

  // Filtrer les plats selon la recherche (seulement des restaurants ouverts)
  const filteredPizzas = pizzas.filter(pizza => {
    if (!searchQuery.trim()) return false;
    
    const query = searchQuery.toLowerCase();
    const restaurant = restaurants.find(r => r.id === pizza.restaurantId);
    
    // Ne montrer que les plats des restaurants ouverts
    if (!restaurant || restaurant.isOpen === false) return false;
    
    return (
      pizza.name.toLowerCase().includes(query) ||
      pizza.description?.toLowerCase().includes(query) ||
      pizza.category?.toLowerCase().includes(query) ||
      restaurant?.name.toLowerCase().includes(query)
    );
  }).slice(0, 20); // Limiter à 20 résultats max

  // Si pas de recherche, afficher les restaurants normalement
  const showSearchResults = searchQuery.trim().length > 0;
  const filteredRestaurants = restaurants.filter(r => {
    if (showSearchResults) return false; // Ne pas afficher les restaurants si on cherche des plats
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const openRestaurants = filteredRestaurants.filter(r => r.isOpen !== false);
  const closedRestaurants = filteredRestaurants.filter(r => r.isOpen === false);

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      pizza: t('menu.category.pizza'),
      burger: t('menu.category.burger'),
      salade: t('menu.category.salade'),
      grill: t('menu.category.grill'),
      drink: t('menu.category.drink'),
      dessert: t('menu.category.dessert'),
    };
    return labels[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4" />
            <span>{t('home.location')}</span>
          </div>
          <Link href="/cart" className="relative">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">{count || 0}</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-900 via-red-900 to-amber-800 text-white">
        <div className="relative z-10 px-4 pt-8 pb-12 md:pt-12 md:pb-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {t('home.hero.title.part1')}{" "}
              <span className="text-orange-400 text-5xl md:text-6xl">{t('home.hero.title.part2')}</span>
            </h1>
            <p className="text-white/90 text-base md:text-lg mb-8 max-w-2xl">
              {t('home.hero.description')}
            </p>
            
            {/* Feature Buttons */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <Zap className="w-4 h-4 text-orange-300" />
                <span className="text-sm font-medium">{t('home.features.fastDelivery')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <Coins className="w-4 h-4 text-orange-300" />
                <span className="text-sm font-medium">{t('home.features.cashPayment')}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Background food images (subtle) */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-8xl">🍕</div>
          <div className="absolute top-20 right-20 text-7xl">🍔</div>
          <div className="absolute bottom-20 left-1/2 text-8xl">🍝</div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="px-4 -mt-6 relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white rounded-xl shadow-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('home.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800"
            />
          </div>
        </div>
      </section>

      {/* Search Results - Plats */}
      {showSearchResults && (
        <section className="px-4 mt-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {loadingPizzas 
              ? t('home.search.loading')
              : filteredPizzas.length > 0 
                ? t('home.search.results', { count: filteredPizzas.length })
                : t('home.search.noResults')}
          </h2>
          
          {loadingPizzas ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : filteredPizzas.length > 0 ? (
            <div className="space-y-4">
              {filteredPizzas.map((pizza) => {
                const restaurant = restaurants.find(r => r.id === pizza.restaurantId);
                const defaultPrice = pizza.prices?.find(p => p.size === "medium") || pizza.prices?.[0];
                const price = parseFloat(defaultPrice?.price || "15");
                
                return (
                  <Link key={pizza.id} href={`/menu/${pizza.restaurantId}`}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                              {pizza.description || t('menu.product.defaultDescription')}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-orange-500 font-bold text-lg">
                                {price.toFixed(2)} {t('common.currency')}
                              </span>
                              {pizza.category && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                                  {pizza.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="w-4 h-4" />
                              <span>{restaurant?.name || t('home.restaurant.default')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-medium">{t('home.search.noResults')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('home.search.tryOther')}</p>
            </div>
          )}
        </section>
      )}

      {/* Restaurants Section - Affiché seulement si pas de recherche */}
      {!showSearchResults && (
      <section className="px-4 md:px-6 mt-8 md:mt-12 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-6 md:space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Open Restaurants */}
            {openRestaurants.length > 0 && (
              <div className="mb-10 md:mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{t('home.restaurants.open')}</h2>
                  <span className="text-sm text-gray-500">{t('home.restaurants.available', { count: openRestaurants.length })}</span>
                </div>
                <div className="flex flex-col gap-10 md:gap-12">
                  {openRestaurants.map((restaurant) => (
                    <Link key={restaurant.id} href={`/menu/${restaurant.id}`} className="block">
                      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
                        <div className="relative">
                          {/* Restaurant Image */}
                          <div className="w-full h-48 bg-gradient-to-br from-orange-200 to-red-200 relative overflow-hidden">
                            {restaurant.imageUrl && restaurant.imageUrl.trim() !== "" ? (
                              <img
                                src={restaurant.imageUrl}
                                alt={restaurant.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Si l'image ne charge pas, afficher le fallback
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-full h-full flex items-center justify-center';
                                    fallback.innerHTML = '<span class="text-6xl">🍕</span>';
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-6xl">🍕</span>
                              </div>
                            )}
                            {/* Status Badge */}
                            <div className="absolute top-3 left-3">
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                {t('menu.status.open')}
                              </span>
                            </div>
                            {/* Delivery Time */}
                            <div className="absolute top-3 right-3">
                              <span className="bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                                {restaurant.deliveryTime || 30}-{restaurant.deliveryTime ? restaurant.deliveryTime + 10 : 40} {t('common.min')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Restaurant Info */}
                        <div className="p-5 md:p-6">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{restaurant.name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold text-gray-700">
                              {restaurant.rating || "4.5"}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({Math.floor(Math.random() * 200) + 50} {t('menu.reviews')})
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {restaurant.description || restaurant.address}
                          </p>
                          
                          {/* Categories */}
                          {restaurant.categories && restaurant.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {restaurant.categories.slice(0, 2).map((cat) => (
                                <span
                                  key={cat}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md"
                                >
                                  {getCategoryLabel(cat)}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Delivery Price */}
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Bike className="w-4 h-4" />
                            <span className="font-medium">2.5 {t('common.currency')}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Closed Restaurants */}
            {closedRestaurants.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">{t('home.restaurants.closed')}</h2>
                <div className="flex flex-col gap-10 md:gap-12">
                  {closedRestaurants.map((restaurant) => (
                    <Link key={restaurant.id} href={`/menu/${restaurant.id}`} className="block">
                      <div className="bg-white rounded-2xl overflow-hidden shadow-md opacity-75 border border-gray-200">
                        <div className="relative">
                          {/* Restaurant Image */}
                          <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                            {restaurant.imageUrl && restaurant.imageUrl.trim() !== "" ? (
                              <img
                                src={restaurant.imageUrl}
                                alt={restaurant.name}
                                className="w-full h-full object-cover grayscale"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-6xl opacity-50">🍕</span>
                              </div>
                            )}
                            {/* Status Badge */}
                            <div className="absolute top-3 left-3">
                              <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                {t('menu.status.closed')}
                              </span>
                            </div>
                            {/* Delivery Time */}
                            <div className="absolute top-3 right-3">
                              <span className="bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                                {restaurant.deliveryTime || 30}-{restaurant.deliveryTime ? restaurant.deliveryTime + 10 : 40} {t('common.min')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Restaurant Info */}
                        <div className="p-5 md:p-6">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{restaurant.name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold text-gray-700">
                              {restaurant.rating || "4.5"}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({Math.floor(Math.random() * 200) + 50} {t('menu.reviews')})
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {restaurant.description || restaurant.address}
                          </p>
                          
                          {/* Categories */}
                          {restaurant.categories && restaurant.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {restaurant.categories.slice(0, 2).map((cat) => (
                                <span
                                  key={cat}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md"
                                >
                                  {getCategoryLabel(cat)}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Delivery Price */}
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Bike className="w-4 h-4" />
                            <span className="font-medium">2.5 {t('common.currency')}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredRestaurants.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-2xl">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-600 font-medium">{t('home.search.noRestaurants')}</p>
              </div>
            )}
          </>
        )}
      </section>
      )}
    </div>
  );
}
