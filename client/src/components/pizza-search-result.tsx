/**
 * ============================================================================
 * COMPOSANT PIZZA SEARCH RESULT - NAVIGATION VERS MENU AVEC PARAMÈTRES
 * ============================================================================
 * 
 * Composant qui affiche un résultat de recherche de pizza et permet
 * la navigation vers le menu du restaurant avec highlight du produit.
 * 
 * UTILISATION DE LA NAVIGATION:
 * - Utilise <Link> de wouter pour navigation déclarative
 * - Route avec paramètre: /menu/:restaurantId
 * - Query string pour highlight: ?product=pizzaId
 * - Format: /menu/{restaurantId}?product={pizzaId}
 * 
 * EXEMPLE DE NAVIGATION:
 * - Clic sur une pizza → /menu/123?product=456
 * - Le composant Menu lit restaurantId via useParams()
 * - Le query string ?product=456 permet de scroller vers le produit
 * 
 * AVANTAGES:
 * - Navigation sans rechargement de page (SPA)
 * - URL partageable avec état (restaurant + produit)
 * - Compatible avec le bouton retour du navigateur
 * 
 * ============================================================================
 */

import { Link } from "wouter";
import { MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { ImageWithFallback } from "./image-with-fallback";

interface Pizza {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  category?: string;
  imageUrl?: string;
  prices?: Array<{ size: string; price: string }>;
}

interface Restaurant {
  id: string;
  name: string;
}

interface PizzaSearchResultProps {
  pizza: Pizza;
  restaurant: Restaurant | undefined;
}

export function PizzaSearchResult({ pizza, restaurant }: PizzaSearchResultProps) {
  const { t } = useLanguage();
  const defaultPrice = pizza.prices?.find(p => p.size === "medium") || pizza.prices?.[0];
  const price = parseFloat(defaultPrice?.price || "15");

  return (
    // Navigation vers le menu avec paramètres de route et query string
    // Format: /menu/:restaurantId?product=pizzaId
    // - restaurantId: paramètre de route (accessible via useParams() dans Menu)
    // - product: query string (accessible via window.location.search)
    <Link href={`/menu/${pizza.restaurantId}?product=${pizza.id}`} className="block">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer">
        <div className="flex gap-2 md:gap-4 p-3 md:p-4">
          {/* Image - Taille responsive mobile-first */}
          <div className="flex-shrink-0">
            <ImageWithFallback
              src={pizza.imageUrl}
              alt={pizza.name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-lg md:rounded-xl object-cover bg-gray-100"
            />
          </div>
          
          {/* Contenu - Optimisé mobile */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="min-w-0 flex flex-col gap-1.5 md:gap-2">
              <h3 className="font-bold text-base md:text-lg text-gray-900 truncate">
                {pizza.name}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2 leading-tight">
                {pizza.description || t('menu.product.defaultDescription')}
              </p>
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <span className="text-orange-500 font-bold text-base md:text-lg whitespace-nowrap">
                  {price.toFixed(2)} {t('common.currency')}
                </span>
                {pizza.category && (
                  <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-100 text-gray-700 rounded-md whitespace-nowrap">
                    {pizza.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">{restaurant?.name || t('home.restaurant.default')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

