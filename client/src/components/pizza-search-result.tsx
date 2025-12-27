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
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="flex gap-4 p-4">
          <ImageWithFallback
            src={pizza.imageUrl}
            alt={pizza.name}
            className="w-24 h-24 flex-shrink-0 rounded-xl object-cover bg-gray-100"
          />
          
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
}

