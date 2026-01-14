import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Zap, 
  MapPin, 
  Shield,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePublicSetting } from "@/hooks/use-app-settings";
import HomeOld from "./home-old";

interface DeliveryMode {
  id: string;
  image: string;
  title: string;
  description: string;
  color: string;
}

interface Feature {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
}

export default function Home() {
  const { t, language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const isRtl = dir === 'rtl';
  
  // Log de diagnostic pour vérifier que Home se monte correctement
  useEffect(() => {
    console.log('[DEBUG] 🏠 COMPOSANT HOME MONTÉ');
    console.log('  - URL navigateur:', window.location.pathname);
    console.log('  - Home affiché avec succès');
  }, []);
  
  // Récupérer le setting delivery_modes_enabled (global)
  const globalSetting = usePublicSetting("delivery_modes_enabled", "true");
  
  // Vérifier si l'utilisateur a une préférence locale
  const [localPreference, setLocalPreference] = useState<string | null>(null);
  
  useEffect(() => {
    const localValue = localStorage.getItem("delivery_modes_enabled");
    setLocalPreference(localValue);
  }, []);
  
  // Priorité : localStorage > setting global
  const deliveryModesEnabled = localPreference !== null 
    ? localPreference === "true"
    : globalSetting === "true";
  
  // Si le mode livraison est désactivé, afficher l'ancienne page
  if (!deliveryModesEnabled) {
    return <HomeOld />;
  }

  const deliveryModes: DeliveryMode[] = [
    {
      id: "scooter",
      image: "/images/products/delivery/delivery-scooter.png",
      title: t('delivery.mode.scooter.title'),
      description: t('delivery.mode.scooter.desc'),
      color: "bg-yellow-500"
    },
    {
      id: "tuk-tuk",
      image: "/images/products/delivery/delivery-tuktuk.png",
      title: t('delivery.mode.tuktuk.title'),
      description: t('delivery.mode.tuktuk.desc'),
      color: "bg-red-500"
    },
    {
      id: "truck",
      image: "/images/products/delivery/delivery-truck.png",
      title: t('delivery.mode.truck.title'),
      description: t('delivery.mode.truck.desc'),
      color: "bg-blue-500"
    },
    {
      id: "tractor",
      image: "/images/products/delivery/tracteur.png",
      title: t('delivery.mode.tractor.title'),
      description: t('delivery.mode.tractor.desc'),
      color: "bg-green-500"
    }
  ];

  const features: Feature[] = [
    {
      id: "express",
      icon: Zap,
      title: t('delivery.feature.express.title'),
      description: t('delivery.feature.express.desc'),
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600"
    },
    {
      id: "tracking",
      icon: MapPin,
      title: t('delivery.feature.tracking.title'),
      description: t('delivery.feature.tracking.desc'),
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600"
    },
    {
      id: "secure",
      icon: Shield,
      title: t('delivery.feature.secure.title'),
      description: t('delivery.feature.secure.desc'),
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      {/* Hero Section */}
      <section className="text-center mb-12 mt-8 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {t('delivery.hero.title')}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t('delivery.hero.subtitle')}
        </p>
      </section>

      {/* Delivery Modes Section */}
      <section className="mb-16 px-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          {t('delivery.modes.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {deliveryModes.map((mode) => {
            return (
              <Card 
                key={mode.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-300 border-2 hover:border-orange-500 overflow-hidden p-0 flex flex-col"
                onClick={() => setLocation(`/delivery-form?mode=${mode.id}`)}
              >
                <div className="relative w-full h-64 overflow-hidden flex-shrink-0">
                  <img 
                    src={mode.image} 
                    alt={mode.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback si l'image n'existe pas
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.className = `relative w-full h-64 ${mode.color} flex items-center justify-center`;
                        parent.innerHTML = `<div class="text-white text-4xl">🛵</div>`;
                      }
                    }}
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <CardTitle className="text-xl mb-2">{mode.title}</CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    {mode.description}
                  </CardDescription>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-amber-50 rounded-2xl p-8 mb-12 mx-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.id}
                className={`${feature.bgColor} rounded-xl p-6 flex flex-col items-center text-center`}
              >
                <div className={`w-16 h-16 rounded-lg bg-white flex items-center justify-center mb-4 shadow-sm`}>
                  <Icon className={`h-8 w-8 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center mb-12 px-4">
        <Button 
          size="lg" 
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg"
          asChild
        >
          <Link href="/menu">
            {t('delivery.cta.restaurants')}
            <ChevronRight className={`${isRtl ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
          </Link>
        </Button>
      </section>
    </div>
  );
}
