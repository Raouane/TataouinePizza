import { Link } from "wouter";
import { Star, Bike } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { ImageWithFallback } from "./image-with-fallback";
import { parseRestaurantCategories } from "@/lib/restaurant-helpers";
import { isRestaurantOpen, getRestaurantCloseReason, parseOpeningHours } from "@/lib/restaurant-status";

export interface Restaurant {
  id: string;
  name: string;
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

interface RestaurantCardProps {
  restaurant: Restaurant;
  getCategoryLabel: (cat: string) => string;
}

export function RestaurantCard({ restaurant, getCategoryLabel }: RestaurantCardProps) {
  const { t } = useLanguage();
  const isActuallyOpen = isRestaurantOpen(restaurant);
  const closeReason = getRestaurantCloseReason(restaurant);
  const isTemporarilyClosed = closeReason === 'toggle';
  const { hours, closedDay } = parseOpeningHours(restaurant.openingHours || "");
  const categoriesArray = parseRestaurantCategories(restaurant.categories);
  
  const now = new Date();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const currentDay = dayNames[now.getDay()];

  return (
    <Link href={`/menu/${restaurant.id}`} className="block">
      <div className={`bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border ${
        isActuallyOpen 
          ? 'border-gray-100 hover:border-orange-200' 
          : 'opacity-75 border-gray-200'
      }`}>
        <div className="relative">
          <div className={`w-full h-48 bg-gradient-to-br relative overflow-hidden ${
            isActuallyOpen 
              ? 'from-orange-200 to-red-200' 
              : 'from-gray-200 to-gray-300'
          }`}>
            <ImageWithFallback
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className={`w-full h-full object-cover ${!isActuallyOpen ? 'grayscale' : ''}`}
              fallback={<span className={`text-6xl ${!isActuallyOpen ? 'opacity-50' : ''}`}>🍕</span>}
            />
            
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isTemporarilyClosed 
                  ? "bg-orange-500 text-white"
                  : isActuallyOpen 
                    ? "bg-green-500 text-white"
                    : "bg-gray-500 text-white"
              }`}>
                {isTemporarilyClosed 
                  ? "🔒 Fermé temporairement" 
                  : isActuallyOpen 
                    ? t('menu.status.open') 
                    : "Fermé"}
              </span>
            </div>
            
            {/* Message de fermeture */}
            {!isActuallyOpen && !isTemporarilyClosed && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                  <div className="space-y-1">
                    {hours && (
                      <div>
                        <span className="font-semibold">Horaires :</span> {hours}
                      </div>
                    )}
                    {closedDay && (
                      <div>
                        <span className="font-semibold">Jour de repos :</span> {closedDay}
                      </div>
                    )}
                    {!hours && !closedDay && (
                      <div>Le restaurant est fermé selon les horaires d'ouverture.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
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
              ({restaurant.reviewCount || 125} {t('menu.reviews')})
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {restaurant.description || restaurant.address}
          </p>
          
          {/* Message de fermeture si fermé selon les horaires */}
          {!isActuallyOpen && !isTemporarilyClosed && restaurant.openingHours && (
            <div className="mb-3 p-2 bg-gray-100 rounded-lg text-xs text-gray-700">
              {closedDay && currentDay === closedDay ? (
                `🔒 Fermé le ${closedDay}`
              ) : hours ? (
                `⏰ Ouvert ${hours}`
              ) : (
                "Fermé"
              )}
            </div>
          )}
          
          {/* Categories */}
          {categoriesArray.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categoriesArray.slice(0, 2).map((cat) => (
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
  );
}

