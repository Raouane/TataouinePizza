import { Link } from "wouter";
import { Star, Bike, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { parseRestaurantCategories } from "@/lib/restaurant-helpers";
import { getRestaurantCloseReason, parseOpeningHours } from "@/lib/restaurant-status";
import { isRestaurantOpen as checkNewOpeningHours, parseOpeningHoursSchedule, formatOpeningHours, getMinutesUntilOpening, getMinutesUntilClosing } from "@shared/openingHours";
import { useMemo } from "react";
import { calculateDistance, calculateDeliveryFee, formatDistance } from "@/lib/distance-utils";
import { getOnboarding } from "@/pages/onboarding";
import type { Restaurant } from "../restaurant.types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  getCategoryLabel: (cat: string) => string;
}

export function RestaurantCard({ restaurant, getCategoryLabel }: RestaurantCardProps) {
  const { t, language } = useLanguage();
  
  // Essayer d'abord le nouveau format JSON, puis fallback sur l'ancien format
  const schedule = parseOpeningHoursSchedule(restaurant.openingHours || null);
  let openStatus: { isOpen: boolean; nextOpenTime?: string | null } | null = null;
  
  if (schedule) {
    // Nouveau format JSON
    openStatus = checkNewOpeningHours(schedule);
  } else {
    // Fallback : utiliser l'ancien système pour compatibilité
    // Utiliser computedStatus si disponible (calculé côté serveur)
    if (restaurant.computedStatus !== undefined) {
      openStatus = { isOpen: restaurant.computedStatus.isOpen };
    } else {
      // Fallback : utiliser la logique de l'ancien système
      const closeReason = getRestaurantCloseReason(restaurant);
      const isTemporarilyClosed = closeReason === 'toggle';
      // Si fermé via toggle, considérer fermé
      if (isTemporarilyClosed || restaurant.isOpen === false) {
        openStatus = { isOpen: false };
      } else {
        // Considérer ouvert si pas d'horaires et toggle = true
        openStatus = { isOpen: restaurant.isOpen === true };
      }
    }
  }
  
  const isActuallyOpen = openStatus?.isOpen ?? false;
  const nextOpenTime = openStatus?.nextOpenTime;
  const closeReason = getRestaurantCloseReason(restaurant);
  const isTemporarilyClosed = closeReason === 'toggle';
  const { hours, closedDay } = parseOpeningHours(restaurant.openingHours || "");
  const categoriesArray = parseRestaurantCategories(restaurant.categories);
  
  const now = new Date();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const currentDay = dayNames[now.getDay()];
  
  // Calculer le compte à rebours pour ouverture/fermeture
  const minutesUntilOpening = useMemo(() => {
    if (isActuallyOpen || isTemporarilyClosed || !schedule) return null;
    return getMinutesUntilOpening(schedule);
  }, [schedule, isActuallyOpen, isTemporarilyClosed]);
  
  const minutesUntilClosing = useMemo(() => {
    if (!isActuallyOpen || isTemporarilyClosed || !schedule) return null;
    return getMinutesUntilClosing(schedule);
  }, [schedule, isActuallyOpen, isTemporarilyClosed]);
  
  // Calculer la distance et les frais de livraison si les coordonnées sont disponibles
  const distanceInfo = useMemo(() => {
    const onboarding = getOnboarding();
    if (!onboarding?.lat || !onboarding?.lng || !restaurant.lat || !restaurant.lng) {
      return null;
    }
    
    const customerCoords = {
      lat: typeof onboarding.lat === 'number' ? onboarding.lat : parseFloat(String(onboarding.lat)),
      lng: typeof onboarding.lng === 'number' ? onboarding.lng : parseFloat(String(onboarding.lng)),
    };
    
    const restaurantCoords = {
      lat: typeof restaurant.lat === 'number' ? restaurant.lat : parseFloat(String(restaurant.lat)),
      lng: typeof restaurant.lng === 'number' ? restaurant.lng : parseFloat(String(restaurant.lng)),
    };
    
    const distance = calculateDistance(restaurantCoords, customerCoords);
    const deliveryFee = calculateDeliveryFee(distance);
    
    return { distance, deliveryFee };
  }, [restaurant.lat, restaurant.lng]);
  
  // Déterminer le badge et sa couleur
  const badgeConfig = useMemo(() => {
    if (isTemporarilyClosed) {
      return {
        color: "bg-orange-500 text-white",
        text: "🔒 " + t('menu.status.temporarilyClosed'),
        isUrgent: false
      };
    }
    
    if (isActuallyOpen) {
      if (minutesUntilClosing !== null) {
        // Ferme bientôt (< 30 min)
        return {
          color: "bg-orange-500 text-white",
          text: t('openingHours.closesSoon', { minutes: minutesUntilClosing }),
          isUrgent: true
        };
      }
      // Ouvert normalement
      return {
        color: "bg-green-500 text-white",
        text: t('menu.status.open'),
        isUrgent: false
      };
    }
    
    // Fermé
    if (minutesUntilOpening !== null) {
      // Ouvre bientôt (< 60 min)
      return {
        color: "bg-orange-500 text-white",
        text: t('openingHours.opensIn', { minutes: minutesUntilOpening }),
        isUrgent: true
      };
    }
    
    // Fermé sans ouverture imminente
    if (nextOpenTime) {
      return {
        color: "bg-red-500 text-white",
        text: `${t('openingHours.closed')} (${t('openingHours.opensAt')} ${nextOpenTime})`,
        isUrgent: false
      };
    }
    
    return {
      color: "bg-red-500 text-white",
      text: t('openingHours.closed'),
      isUrgent: false
    };
  }, [isActuallyOpen, isTemporarilyClosed, minutesUntilOpening, minutesUntilClosing, nextOpenTime, t]);
  
  // Fonction pour gérer le clic - empêcher si fermé
  const handleCardClick = (e: React.MouseEvent) => {
    if (!isActuallyOpen || isTemporarilyClosed) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={isActuallyOpen && !isTemporarilyClosed ? '' : 'cursor-not-allowed'}
    >
      <Link 
        href={isActuallyOpen && !isTemporarilyClosed ? `/menu/${restaurant.id}` : '#'} 
        className="block"
      >
        <div className={`bg-white rounded-2xl overflow-hidden shadow-md transition-all duration-300 border ${
          isActuallyOpen && !isTemporarilyClosed
            ? 'border-gray-100 hover:border-orange-200 hover:shadow-xl' 
            : 'opacity-60 border-gray-200 grayscale'
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
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">🍕</span>
                </div>
              }
            />
            
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeConfig.color}`}>
                {badgeConfig.text}
              </span>
            </div>
            
            {/* Message de fermeture */}
            {!isActuallyOpen && !isTemporarilyClosed && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                  <div className="space-y-1">
                    {schedule && (
                      <div>
                        <span className="font-semibold">{t('openingHours.title')} :</span> {formatOpeningHours(schedule, language)}
                      </div>
                    )}
                    {!schedule && hours && (
                      <div>
                        <span className="font-semibold">{t('openingHours.title')} :</span> {hours}
                      </div>
                    )}
                    {closedDay && (
                      <div>
                        <span className="font-semibold">{t('menu.status.closedDay')} :</span> {closedDay}
                      </div>
                    )}
                    {!schedule && !hours && !closedDay && (
                      <div>{t('menu.status.closedBySchedule')}</div>
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
              {schedule ? (
                <div>
                  <span className="font-semibold">{t('openingHours.title')} :</span> {formatOpeningHours(schedule, language)}
                </div>
              ) : closedDay && currentDay === closedDay ? (
                <div>
                  🔒 {t('openingHours.closed')} - {t('menu.status.closedDay')} {closedDay}
                </div>
              ) : hours ? (
                <div>
                  ⏰ {t('openingHours.opensAt')} {hours.split('-')[0] || hours}
                </div>
              ) : (
                <div>{t('openingHours.closed')}</div>
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
          
          {/* Delivery Price and Distance */}
          <div className="flex items-center justify-between text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span className="font-medium">
                {distanceInfo ? `${distanceInfo.deliveryFee.toFixed(3)} ${t('common.currency')}` : `2.000 ${t('common.currency')}`}
              </span>
            </div>
            {distanceInfo && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{formatDistance(distanceInfo.distance)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </Link>
    </div>
  );
}
