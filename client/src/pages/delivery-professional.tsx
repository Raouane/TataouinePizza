import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Phone, MessageCircle, MapPin, User, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";

// Les données des professionnels (pourraient être dans une base de données)
const deliveryModes: Record<string, { 
  image: string; 
  color: string;
  professional: {
    name: string;
    phone: string;
    whatsapp: string;
    rating: number;
    experience: string;
    description: string;
  }
}> = {
  scooter: {
    image: "/images/products/delivery/delivery-scooter.png",
    color: "bg-yellow-500",
    professional: {
      name: "Mohamed Trabelsi",
      phone: "+21653666945",
      whatsapp: "+21653666945",
      rating: 4.9,
      experience: "7",
      description: "Expert en livraison rapide en scooter. Service rapide et professionnel dans toute la ville."
    }
  },
  "tuk-tuk": {
    image: "/images/products/delivery/delivery-tuktuk.png",
    color: "bg-red-500",
    professional: {
      name: "Salah Hammami",
      phone: "+21653666945",
      whatsapp: "+21653666945",
      rating: 4.7,
      experience: "6",
      description: "Spécialiste des livraisons en tuk-tuk pour les quartiers étroits. Service adapté et efficace."
    }
  },
  truck: {
    image: "/images/products/delivery/delivery-truck.png",
    color: "bg-blue-500",
    professional: {
      name: "Karim Bouslama",
      phone: "+21653666945",
      whatsapp: "+21653666945",
      rating: 4.9,
      experience: "10",
      description: "Expert en livraisons de gros volumes. Parfait pour les commandes groupées et les entreprises."
    }
  },
  tractor: {
    image: "/images/products/delivery/tracteur.png",
    color: "bg-green-500",
    professional: {
      name: "Hassan Ben Youssef",
      phone: "+21653666945",
      whatsapp: "+21653666945",
      rating: 4.8,
      experience: "8",
      description: "Spécialisé dans le transport de matériaux agricoles et produits lourds. Service fiable et professionnel."
    }
  }
};

const getDeliveryModeTitle = (modeId: string, t: (key: string) => string): string => {
  const titles: Record<string, string> = {
    scooter: t('delivery.mode.scooter.title'),
    "tuk-tuk": t('delivery.mode.tuktuk.title'),
    truck: t('delivery.mode.truck.title'),
    tractor: t('delivery.mode.tractor.title')
  };
  return titles[modeId] || titles.scooter;
};

export default function DeliveryProfessional() {
  const [, setLocation] = useLocation();
  const { t, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  // Récupérer le mode de livraison depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const modeId = params.get("mode") || "scooter";
  const deliveryMode = deliveryModes[modeId] || deliveryModes.scooter;
  const professional = deliveryMode.professional;
  const deliveryModeTitle = getDeliveryModeTitle(modeId, t);

  const [formData, setFormData] = useState<any>(null);

  // Charger les données des étapes précédentes
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("delivery_form_data");
      if (savedData) {
        const data = JSON.parse(savedData);
        setFormData(data);
      }
    } catch (e) {
      console.error("Error loading form data:", e);
    }
  }, []);

  const handleCall = () => {
    window.location.href = `tel:${professional.phone}`;
  };

  const handleWhatsApp = () => {
    const message = t('delivery.professional.whatsapp.message', {
      name: professional.name,
      mode: deliveryModeTitle.toLowerCase(),
      pickup: formData?.pickupAddress || t('delivery.step3.summary.notSpecified'),
      delivery: formData?.deliveryAddress || t('delivery.step3.summary.notSpecified'),
      description: formData?.packageDescription || t('delivery.step3.summary.notSpecified')
    });
    window.open(`https://wa.me/${professional.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/delivery-form-step3?mode=${modeId}`)}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">{t('delivery.professional.title')}</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Professional Card */}
        <Card className="mb-6 overflow-hidden">
          {/* Header avec image */}
          <div className={`${deliveryMode.color} p-6 text-white`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                <img 
                  src={deliveryMode.image} 
                  alt={deliveryMode.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.className = `w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center`;
                      parent.innerHTML = `<div class="text-white text-2xl">👤</div>`;
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">{professional.name}</h2>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                  <span className="text-sm font-medium">{professional.rating}</span>
                  <span className="text-sm opacity-90">({professional.experience} {t('delivery.professional.experience.years')})</span>
                </div>
              </div>
            </div>
            <p className="text-sm opacity-90">{professional.description}</p>
          </div>

          <CardContent className="p-6">
            {/* Informations de livraison */}
            {formData && (
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">{t('delivery.professional.pickup')}</p>
                    <p className="text-sm font-medium text-gray-900">{formData.pickupAddress || t('delivery.step3.summary.notSpecified')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">{t('delivery.professional.delivery')}</p>
                    <p className="text-sm font-medium text-gray-900">{formData.deliveryAddress || t('delivery.step3.summary.notSpecified')}</p>
                  </div>
                </div>
                {formData.packageDescription && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">{t('delivery.professional.description')}</p>
                      <p className="text-sm font-medium text-gray-900">{formData.packageDescription}</p>
                    </div>
                  </div>
                )}
                {formData.name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">{t('delivery.professional.recipient')}</p>
                      <p className="text-sm font-medium text-gray-900">{formData.name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleCall}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base font-semibold"
              >
                <Phone className={`${isRtl ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                {t('delivery.professional.call')}
              </Button>
              <Button
                onClick={handleWhatsApp}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50 py-6 text-base font-semibold"
              >
                <MessageCircle className={`${isRtl ? 'ml-2' : 'mr-2'} h-5 w-5`} />
                {t('delivery.professional.whatsapp')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info supplémentaire */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-700 text-center">
              {t('delivery.professional.info')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
