import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, MapPin, Star, Clock, ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useState, useEffect } from "react";

interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  isOpen?: boolean;
  deliveryTime?: number;
  rating?: string;
}

export default function Home() {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error("Failed to fetch restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "pizza": return "🍕";
      case "burger": return "🍔";
      case "grill": return "🥩";
      case "sushi": return "🍣";
      default: return "🍽️";
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "pizza": return language === 'ar' ? "بيتزا" : language === 'en' ? "Pizza" : "Pizza";
      case "burger": return language === 'ar' ? "برجر" : language === 'en' ? "Burgers" : "Burgers";
      case "grill": return language === 'ar' ? "مشويات" : language === 'en' ? "Grill" : "Grillades";
      case "sushi": return language === 'ar' ? "سوشي" : language === 'en' ? "Sushi" : "Sushi";
      default: return language === 'ar' ? "مطعم" : language === 'en' ? "Restaurant" : "Restaurant";
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Location and Search */}
      <section className="bg-gradient-to-r from-primary/10 to-orange-100 rounded-2xl p-4">
        <div className="space-y-4">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-5 h-5 text-primary" />
            <span>Tataouine, Tunisie</span>
            <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={language === 'ar' ? "ابحث عن مطعم..." : language === 'en' ? "Search for a restaurant..." : "Rechercher un restaurant..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-search"
            />
          </div>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground text-center">
            {language === 'ar' ? "اختر مطعمك المفضل" : language === 'en' ? "Choose your favorite restaurant" : "Choisissez votre restaurant préféré"}
          </p>
        </div>
      </section>

      {/* Quick Categories */}
      <section>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["pizza", "burger", "grill"].map((cat) => (
            <button
              key={cat}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-full whitespace-nowrap hover:bg-primary/10 hover:border-primary transition-colors"
              onClick={() => setSearchQuery(cat)}
            >
              <span>{getCategoryIcon(cat)}</span>
              <span className="text-sm font-medium">{getCategoryLabel(cat)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Restaurants List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-bold">
            {language === 'ar' ? "المطاعم" : language === 'en' ? "Restaurants" : "Restaurants"}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredRestaurants.length} {language === 'ar' ? "متاح" : language === 'en' ? "available" : "disponibles"}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            {language === 'ar' ? "جاري التحميل..." : language === 'en' ? "Loading..." : "Chargement..."}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {language === 'ar' ? "لا توجد مطاعم" : language === 'en' ? "No restaurants found" : "Aucun restaurant trouvé"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRestaurants.map((restaurant) => (
              <Link key={restaurant.id} href={`/menu/${restaurant.id}`}>
                <div 
                  className="bg-white border rounded-2xl p-4 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                  data-testid={`card-restaurant-${restaurant.id}`}
                >
                  <div className="flex gap-4">
                    {/* Restaurant Image/Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-4xl">{getCategoryIcon(restaurant.category)}</span>
                    </div>

                    {/* Restaurant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg truncate">{restaurant.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {getCategoryLabel(restaurant.category)} • {restaurant.address}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>

                      {restaurant.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {restaurant.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{restaurant.rating || "4.5"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{restaurant.deliveryTime || 30} min</span>
                        </div>
                        {restaurant.isOpen !== false && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {language === 'ar' ? "مفتوح" : language === 'en' ? "Open" : "Ouvert"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Special Offers Banner */}
      <section className="bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl p-6 text-white">
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">
            {language === 'ar' ? "عروض خاصة" : language === 'en' ? "Special Offers" : "Offres Spéciales"}
          </h3>
          <p className="text-sm opacity-90 mb-4">
            {language === 'ar' ? "خصم يصل إلى 30% على طلبك الأول" : language === 'en' ? "Up to 30% off on your first order" : "Jusqu'à 30% de réduction sur votre première commande"}
          </p>
          <Button variant="secondary" size="sm">
            {language === 'ar' ? "اكتشف" : language === 'en' ? "Discover" : "Découvrir"}
          </Button>
        </div>
      </section>
    </div>
  );
}
