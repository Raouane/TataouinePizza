import { useLanguage } from "@/lib/i18n";
import { RestaurantCard } from "./restaurant-card";
import type { Restaurant } from "../restaurant.types";

interface RestaurantsSectionProps {
  restaurants: Restaurant[];
  title: string;
  getCategoryLabel: (cat: string) => string;
}

export function RestaurantsSection({ restaurants, title, getCategoryLabel }: RestaurantsSectionProps) {
  const { t } = useLanguage();
  
  if (restaurants.length === 0) return null;
  
  const isOpenSection = title.includes('Ouvert') || title.includes('Open');
  
  return (
    <div className={isOpenSection ? 'mb-10 md:mb-12' : ''}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {isOpenSection && (
          <span className="text-sm text-gray-500">
            {t('home.restaurants.available', { count: restaurants.length })}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-10 md:gap-12">
        {restaurants.map((restaurant) => (
          <RestaurantCard 
            key={restaurant.id} 
            restaurant={restaurant} 
            getCategoryLabel={getCategoryLabel}
          />
        ))}
      </div>
    </div>
  );
}
