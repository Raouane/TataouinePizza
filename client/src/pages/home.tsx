import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, MapPin, Star, Zap, Gift } from "lucide-react";
import heroImage from "@assets/generated_images/tataouine_landscape_with_pizza.png";
import pizzaMargherita from "@assets/generated_images/pizza_margherita.png";
import pizzaTunisian from "@assets/generated_images/tunisian_pizza.png";
import pizzaPepperoni from "@assets/generated_images/pizza_pepperoni.png";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

export default function Home() {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      id: "classiques",
      name: language === 'ar' ? "الكلاسيكيات" : language === 'en' ? "Classics" : "Classiques",
      icon: "🍕",
      color: "bg-gradient-to-br from-orange-100 to-orange-200",
      badge: "15+ pizzas"
    },
    {
      id: "speciales",
      name: language === 'ar' ? "الخاصة" : language === 'en' ? "Specials" : "Spéciales",
      icon: "⭐",
      color: "bg-gradient-to-br from-red-100 to-red-200",
      badge: "10+ pizzas"
    },
    {
      id: "veggie",
      name: language === 'ar' ? "نباتي" : language === 'en' ? "Veggie" : "Végétal",
      icon: "🥗",
      color: "bg-gradient-to-br from-green-100 to-green-200",
      badge: "8 pizzas"
    },
    {
      id: "boissons",
      name: language === 'ar' ? "مشروبات" : language === 'en' ? "Drinks" : "Boissons",
      icon: "🥤",
      color: "bg-gradient-to-br from-blue-100 to-blue-200",
      badge: "12+ options"
    }
  ];

  const specialOffers = [
    {
      id: 1,
      title: language === 'ar' ? "عرض الساعة" : language === 'en' ? "Hour Offer" : "Offre de l'heure",
      discount: "30%",
      time: "-1h",
      color: "bg-gradient-to-br from-pink-500 to-red-500",
      deliveryTime: "30-45 mins"
    },
    {
      id: 2,
      title: language === 'ar' ? "عروض شهيرة" : language === 'en' ? "Top Deals" : "Top Offres",
      discount: "UP TO 50%",
      time: "24h",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      deliveryTime: "20-30 mins"
    }
  ];

  const challenges = [
    {
      title: language === 'ar' ? "تحدي الشهر" : language === 'en' ? "Month Challenge" : "Défi du mois",
      duration: language === 'ar' ? "16 يوم" : language === 'en' ? "16 Days" : "16 jours",
      points: ["1500 pts", "1500 pts", "1500 pts"]
    }
  ];

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
              placeholder={language === 'ar' ? "ماذا تريد أن تطلب؟" : language === 'en' ? "What would you like to order?" : "Que voulez-vous commander?"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-search"
            />
          </div>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground text-center">
            {language === 'ar' ? "ماذا تود أن تطلب اليوم؟" : language === 'en' ? "What would you like to order?" : "Qu'allons-nous vous préparer?"}
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link key={category.id} href="/menu">
              <div 
                className={`${category.color} rounded-2xl p-4 text-center cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[160px] flex flex-col items-center justify-center`}
                data-testid={`card-category-${category.id}`}
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-bold text-sm mb-2 text-gray-800">{category.name}</h3>
                <span className="text-xs bg-white/70 px-2 py-1 rounded-full font-medium text-gray-700">
                  {category.badge}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            {language === 'ar' ? "الأفضل مبيعاً" : language === 'en' ? "Bestsellers" : "Nos bestsellers"}
          </h2>
          <Link href="/menu">
            <a className="text-primary hover:underline text-sm font-medium hidden md:inline-flex gap-1">
              {language === 'ar' ? "عرض الكل" : language === 'en' ? "View all" : "Voir tout"}
            </a>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              name: language === 'ar' ? "التونسية" : language === 'en' ? "Tunisian" : "La Tunisienne", 
              price: "18.00 TND", 
              img: pizzaTunisian,
              desc: language === 'ar' ? "تونة، زيتون أسود، بيضة، حرّيسة" : language === 'en' ? "Tuna, black olives, egg, harissa" : "Thon, olives noires, œuf, harissa",
              rating: 4.8
            },
            { 
              name: "Margherita", 
              price: "12.00 TND", 
              img: pizzaMargherita,
              desc: language === 'ar' ? "صلصة طماطم، موتزاريلا، ريحان" : language === 'en' ? "Tomato sauce, mozzarella, basil" : "Sauce tomate, mozzarella, basilic",
              rating: 4.9
            },
            { 
              name: "Pepperoni", 
              price: "16.50 TND", 
              img: pizzaPepperoni,
              desc: language === 'ar' ? "بيبيروني حار، موتزاريلا" : language === 'en' ? "Spicy pepperoni, mozzarella" : "Pepperoni piquant, mozzarella",
              rating: 4.7
            },
          ].map((item, i) => (
            <Link key={i} href="/menu">
              <div className="group cursor-pointer" data-testid={`card-product-${i}`}>
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} bg-white/90 backdrop-blur px-3 py-1 rounded-full font-bold text-sm shadow-sm flex items-center gap-1`}>
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    {item.rating}
                  </div>
                  <div className={`absolute bottom-3 ${isRtl ? 'left-3' : 'right-3'} bg-primary text-white px-3 py-1 rounded-full font-bold text-sm`}>
                    {item.price}
                  </div>
                </div>
                <h3 className="font-serif font-bold text-lg mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Daily Offers */}
      <section>
        <h2 className="text-2xl font-serif font-bold flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-yellow-500" />
          {language === 'ar' ? "العروض اليومية" : language === 'en' ? "Daily Offers" : "Offres du jour"}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specialOffers.map((offer) => (
            <Link key={offer.id} href="/menu">
              <div 
                className={`${offer.color} text-white rounded-3xl p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300`}
                data-testid={`card-offer-${offer.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm opacity-90">{offer.title}</p>
                    <p className="text-4xl font-bold">{offer.discount}</p>
                  </div>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    {offer.time}
                  </span>
                </div>
                <div className="text-sm opacity-90">
                  ⏱️ {offer.deliveryTime}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Challenges Section */}
      <section>
        <h2 className="text-2xl font-serif font-bold flex items-center gap-2 mb-6">
          <Gift className="w-5 h-5 text-red-500" />
          {language === 'ar' ? "التحديات" : language === 'en' ? "Challenges" : "Défis"}
        </h2>
        
        {challenges.map((challenge, idx) => (
          <div 
            key={idx}
            className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 rounded-3xl p-6"
            data-testid="card-challenge"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-green-900">{challenge.title}</h3>
                <span className="inline-block mt-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  🕐 {challenge.duration}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 flex-wrap">
              {challenge.points.map((points, i) => (
                <div 
                  key={i}
                  className="bg-white border-2 border-green-400 rounded-full px-4 py-2 text-center"
                >
                  <p className="text-xs text-muted-foreground">🎁 {points}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-4">
        <Link href="/menu">
          <Button size="lg" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-lg px-8 h-14 rounded-full shadow-lg">
            {language === 'ar' ? "تصفح القائمة الآن" : language === 'en' ? "Browse Menu" : "Parcourir le menu"}
          </Button>
        </Link>
      </section>
    </div>
  );
}

// Helper component for chevron icon
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}
