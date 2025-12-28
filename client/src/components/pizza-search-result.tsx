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
    <Link href={`/menu/${pizza.restaurantId}`}>
      <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
        <div className="flex gap-2 md:gap-4 p-3 md:p-4">
          {/* Image - Taille responsive mobile-first */}
          <ImageWithFallback
            src={pizza.imageUrl}
            alt={pizza.name}
            className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg md:rounded-xl object-cover bg-gray-100"
          />
          
          {/* Contenu - Optimisé mobile */}
          <div className="flex-1 flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="min-w-0">
              <h3 className="font-bold text-base md:text-lg text-gray-900 mb-1 truncate">
                {pizza.name}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2 leading-tight">
                {pizza.description || t('menu.product.defaultDescription')}
              </p>
              <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 flex-wrap">
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

