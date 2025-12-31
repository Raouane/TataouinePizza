import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { isRestaurantOpen } from "@/lib/restaurant-status";
import { SearchBar } from "@/components/search-bar";
import { PizzaSearchResult } from "@/components/pizza-search-result";
import { RestaurantsSection } from "@/components/restaurants-section";
import { getCategoryLabel } from "@/lib/category-labels";
import { debounce } from "@/lib/debounce";

interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  description?: string;
  imageUrl?: string;
  categories?: string[];
  isOpen?: boolean;
  openingHours?: string;
  deliveryTime?: number;
  rating?: string;
  reviewCount?: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loadingPizzas, setLoadingPizzas] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // AbortController pour annuler les requêtes en cours
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Debounced search avec AbortController
  const debouncedFetchPizzas = useMemo(
    () =>
      debounce((query: string) => {
        // Annuler la requête précédente si elle existe
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        if (query.trim().length > 0) {
          fetchPizzas(query.trim());
        } else {
          setPizzas([]);
          setLoadingPizzas(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedFetchPizzas(searchQuery);
    
    // Cleanup: annuler la requête si le composant se démonte ou la recherche change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, debouncedFetchPizzas]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMISATION: Recherche côté serveur avec query param + AbortController
  const fetchPizzas = useCallback(async (query: string) => {
    // Créer un nouveau AbortController pour cette requête
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoadingPizzas(true);
    try {
      const res = await fetch(`/api/pizzas?search=${encodeURIComponent(query)}`, {
        signal: abortController.signal,
      });
      
      // Vérifier si la requête a été annulée
      if (abortController.signal.aborted) {
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setPizzas(data);
      }
    } catch (err) {
      // Ignorer les erreurs d'abort (c'est normal)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error("Failed to fetch pizzas:", err);
    } finally {
      // Ne mettre à jour le loading que si la requête n'a pas été annulée
      if (!abortController.signal.aborted) {
        setLoadingPizzas(false);
      }
    }
  }, []);

  // OPTIMISATION: Map des restaurants pour O(1) lookup
  const restaurantsById = useMemo(() => {
    return Object.fromEntries(restaurants.map(r => [r.id, r]));
  }, [restaurants]);

  // Préparer les données AVANT le return
  const showSearchResults = searchQuery.trim().length > 0;
  
  const filteredRestaurants = useMemo(() => {
    if (showSearchResults) return [];
    const query = searchQuery.toLowerCase();
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    );
  }, [restaurants, searchQuery, showSearchResults]);

  const sortedRestaurants = useMemo(() => {
    return [...filteredRestaurants].sort((a, b) => {
      const aIsOpen = isRestaurantOpen(a);
      const bIsOpen = isRestaurantOpen(b);
      if (aIsOpen === bIsOpen) return 0;
      return aIsOpen ? -1 : 1;
    });
  }, [filteredRestaurants]);

  const openRestaurants = useMemo(() => 
    sortedRestaurants.filter(r => isRestaurantOpen(r)),
    [sortedRestaurants]
  );

  const closedRestaurants = useMemo(() => 
    sortedRestaurants.filter(r => !isRestaurantOpen(r)),
    [sortedRestaurants]
  );

  // Filtrer les pizzas (maintenant déjà filtrées côté serveur, mais on garde pour sécurité)
  const filteredPizzas = useMemo(() => {
    if (!showSearchResults) return [];
    return pizzas
      .filter(pizza => {
        const restaurant = restaurantsById[pizza.restaurantId];
        return restaurant && isRestaurantOpen(restaurant);
      })
      .slice(0, 20);
  }, [pizzas, restaurantsById, showSearchResults]);

  // Helper pour les labels de catégories (utilise le helper pur)
  const getCategoryLabelMemo = useCallback(
    (cat: string) => getCategoryLabel(cat, t),
    [t]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Message d'appel - Toujours visible juste après la barre de recherche quand il n'y a pas de résultats */}
      {showSearchResults && !loadingPizzas && filteredPizzas.length === 0 && (
        <div className="px-3 md:px-4 mt-2 md:mt-3 max-w-4xl mx-auto">
          <div className="p-3 md:p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3 leading-relaxed text-center">
              {t('home.search.callUs') || "Vous ne trouvez pas ce que vous cherchez ? Pas de problème, appelez-nous et nous aurons le plaisir de vous répondre et trouver ce que vous aimez !"}
            </p>
            <div className="flex justify-center">
              <a 
                href="tel:+21653666945" 
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm md:text-base px-4 md:px-6 py-2 md:py-3 rounded-lg transition-colors"
              >
                <Phone className="h-4 w-4 md:h-5 md:w-5" />
                <span>{t('home.search.callNow') || "Appelez-nous"}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {showSearchResults && (
        <section className="px-3 md:px-4 mt-4 md:mt-8 max-w-4xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 px-1">
            {loadingPizzas 
              ? t('home.search.loading')
              : filteredPizzas.length > 0 
                ? t('home.search.results', { count: filteredPizzas.length })
                : t('home.search.noResults')}
          </h2>
          
          {loadingPizzas ? (
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 rounded-xl md:rounded-2xl h-20 md:h-24 animate-pulse" />
              ))}
            </div>
          ) : filteredPizzas.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {filteredPizzas.map((pizza) => (
                <PizzaSearchResult
                  key={pizza.id}
                  pizza={pizza}
                  restaurant={restaurantsById[pizza.restaurantId]}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-3 md:py-8 bg-white rounded-xl md:rounded-2xl px-4">
              <div className="text-3xl md:text-4xl mb-2 md:mb-3">🔍</div>
              <p className="text-sm md:text-base text-gray-600 font-medium">{t('home.search.noResults')}</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">{t('home.search.tryOther')}</p>
            </div>
          )}
        </section>
      )}

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
              <RestaurantsSection
                restaurants={openRestaurants}
                title={t('home.restaurants.open')}
                getCategoryLabel={getCategoryLabelMemo}
              />
              <RestaurantsSection
                restaurants={closedRestaurants}
                title={t('home.restaurants.closed')}
                getCategoryLabel={getCategoryLabelMemo}
              />
              
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
