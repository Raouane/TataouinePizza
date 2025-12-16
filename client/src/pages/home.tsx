import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, Clock, ChevronRight, Flame, Gift, Percent, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";

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

const categoryIcons: Record<string, { emoji: string; gradient: string }> = {
  pizza: { emoji: "🍕", gradient: "from-orange-400 to-red-500" },
  burger: { emoji: "🍔", gradient: "from-amber-400 to-orange-500" },
  grill: { emoji: "🥩", gradient: "from-red-400 to-rose-600" },
  sushi: { emoji: "🍣", gradient: "from-pink-400 to-rose-500" },
  dessert: { emoji: "🍰", gradient: "from-pink-300 to-purple-400" },
  drinks: { emoji: "🥤", gradient: "from-blue-400 to-cyan-500" },
};

export default function Home() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: language === 'ar' ? "الكل" : language === 'en' ? "All" : "Tout", emoji: "✨" },
    { id: "pizza", label: "Pizza", emoji: "🍕" },
    { id: "burger", label: "Burger", emoji: "🍔" },
    { id: "grill", label: language === 'ar' ? "مشويات" : language === 'en' ? "Grill" : "Grill", emoji: "🥩" },
  ];

  const promos = [
    {
      id: 1,
      title: language === 'ar' ? "عرض الساعة" : language === 'en' ? "Happy Hour" : "Happy Hour",
      subtitle: language === 'ar' ? "خصم 30% على طلبك" : language === 'en' ? "30% off your order" : "30% sur ta commande",
      gradient: "from-orange-500 via-red-500 to-pink-500",
      icon: <Flame className="w-6 h-6" />,
      badge: "-30%"
    },
    {
      id: 2,
      title: language === 'ar' ? "توصيل مجاني" : language === 'en' ? "Free Delivery" : "Livraison Gratuite",
      subtitle: language === 'ar' ? "للطلبات فوق 25 دينار" : language === 'en' ? "On orders over 25 TND" : "Dès 25 TND d'achat",
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      icon: <Gift className="w-6 h-6" />,
      badge: "FREE"
    },
    {
      id: 3,
      title: language === 'ar' ? "أول طلب" : language === 'en' ? "First Order" : "1ère Commande",
      subtitle: language === 'ar' ? "خصم 50% للعملاء الجدد" : language === 'en' ? "50% off for new users" : "50% pour les nouveaux",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      icon: <Sparkles className="w-6 h-6" />,
      badge: "-50%"
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'ar' ? "صباح الخير" : language === 'en' ? "Good morning" : "Bonjour";
    if (hour < 18) return language === 'ar' ? "مساء الخير" : language === 'en' ? "Good afternoon" : "Bon après-midi";
    return language === 'ar' ? "مساء الخير" : language === 'en' ? "Good evening" : "Bonsoir";
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Header */}
      <section className="relative -mx-4 md:mx-0 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 px-4 pt-6 pb-8 md:rounded-3xl">
          {/* Location */}
          <div className="flex items-center gap-2 text-white/90 text-sm mb-4">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Tataouine, Tunisie</span>
            <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
          </div>

          {/* Greeting */}
          <h1 className="text-white text-2xl md:text-3xl font-serif font-bold mb-1">
            {getGreeting()} 👋
          </h1>
          <p className="text-white/80 text-sm mb-6">
            {language === 'ar' ? "ماذا تشتهي اليوم؟" : language === 'en' ? "What are you craving today?" : "Qu'est-ce qui te ferait plaisir?"}
          </p>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'ar' ? "بحث..." : language === 'en' ? "Search restaurants..." : "Rechercher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-gray-800 placeholder-gray-400"
              data-testid="input-search"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="-mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat.id === "all" ? null : cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap font-medium text-sm transition-all shadow-sm ${
                (cat.id === "all" && !activeCategory) || activeCategory === cat.id
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-100"
              }`}
              data-testid={`button-category-${cat.id}`}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span>{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Promos Carousel */}
      <section className="-mx-4 px-4">
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
          {promos.map((promo, index) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative min-w-[280px] md:min-w-[320px] bg-gradient-to-r ${promo.gradient} rounded-2xl p-5 text-white overflow-hidden snap-start`}
            >
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold">
                {promo.badge}
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  {promo.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{promo.title}</h3>
                  <p className="text-sm text-white/80">{promo.subtitle}</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                {language === 'ar' ? "اكتشف" : language === 'en' ? "Discover" : "Découvrir"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Restaurants Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">
              {language === 'ar' ? "المطاعم القريبة" : language === 'en' ? "Nearby Restaurants" : "Restaurants à proximité"}
            </h2>
            <p className="text-sm text-gray-500">
              {filteredRestaurants.length} {language === 'ar' ? "متاح" : language === 'en' ? "available" : "disponibles"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-600 font-medium">
              {language === 'ar' ? "لا توجد نتائج" : language === 'en' ? "No results found" : "Aucun résultat"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredRestaurants.map((restaurant, index) => (
              <Link key={restaurant.id} href={`/menu/${restaurant.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
                  data-testid={`card-restaurant-${restaurant.id}`}
                >
                  <div className="flex">
                    {/* Restaurant Image */}
                    <div className={`w-28 h-28 md:w-36 md:h-36 flex-shrink-0 bg-gradient-to-br ${
                      categoryIcons[restaurant.category || "pizza"]?.gradient || "from-orange-400 to-red-500"
                    } flex items-center justify-center`}>
                      <span className="text-5xl md:text-6xl drop-shadow-lg">
                        {categoryIcons[restaurant.category || "pizza"]?.emoji || "🍕"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                            {restaurant.name}
                          </h3>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {restaurant.description || restaurant.address}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold">{restaurant.rating || "4.5"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{restaurant.deliveryTime || 30} min</span>
                        </div>
                        {restaurant.isOpen !== false && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                            {language === 'ar' ? "مفتوح" : language === 'en' ? "Open" : "Ouvert"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
