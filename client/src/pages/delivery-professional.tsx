import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Phone, MessageCircle, MapPin, User, Package, Star, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

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

  // Fonction pour partager la position GPS via WhatsApp
  const handleShareLocation = () => {
    console.log('[DeliveryProfessional] 🧭 Clic sur le bouton GPS');
    
    // Vérifier si le navigateur supporte la géolocalisation
    if (!("geolocation" in navigator)) {
      toast.error(t('geolocation.notSupported'));
      return;
    }

    // Demander la position GPS actuelle
    navigator.geolocation.getCurrentPosition(
      // ✅ SUCCÈS : La position a été récupérée
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[DeliveryProfessional] ✅ Position récupérée:', { latitude, longitude });
        
        // Générer le lien Google Maps avec les coordonnées
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        // Préparer le numéro du professionnel (sans le signe +, uniquement les chiffres)
        const professionalPhone = professional.whatsapp.replace(/[^0-9]/g, '');
        
        if (!professionalPhone) {
          toast.error(t('order.tracking.shareLocation.error'));
          return;
        }

        // Créer le message multilingue avec les coordonnées
        const message = t('order.tracking.shareLocation.message', {
          orderId: formData?.name || 'Livraison',
          mapsLink: mapsLink
        });

        // Encoder le message pour WhatsApp (URL encoding)
        const encodedMessage = encodeURIComponent(message);
        
        // Ouvrir WhatsApp avec le message pré-rempli
        const whatsappUrl = `https://wa.me/${professionalPhone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        toast.success(t('order.tracking.shareLocation.success'));
      },
      
      // ❌ ERREUR : La position n'a pas pu être récupérée
      (error) => {
        console.error('[DeliveryProfessional] ❌ Erreur géolocalisation:', error);
        let errorMessage: string;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            // L'utilisateur a refusé l'accès GPS
            errorMessage = t('geolocation.permissionDenied');
            break;
          case error.POSITION_UNAVAILABLE:
            // La position n'est pas disponible (GPS désactivé, etc.)
            errorMessage = t('geolocation.positionUnavailable');
            break;
          case error.TIMEOUT:
            // Le délai d'attente est dépassé
            errorMessage = t('geolocation.timeout');
            break;
          default:
            // Erreur inconnue
            errorMessage = t('geolocation.unknownError');
            break;
        }
        
        toast.error(errorMessage);
      },
      
      // ⚙️ OPTIONS de géolocalisation
      {
        enableHighAccuracy: true,  // Utiliser la meilleure précision possible (GPS)
        timeout: 10000,            // Délai max: 10 secondes
        maximumAge: 0              // Ne pas utiliser de position en cache (toujours demander une nouvelle)
      }
    );
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
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={handleCall}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 sm:py-6 text-sm sm:text-base font-semibold"
              >
                <Phone className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0`} />
                <span className="truncate">{t('delivery.professional.call')}</span>
              </Button>
              <Button
                onClick={handleShareLocation}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50 bg-green-50 py-3 sm:py-6 text-xs sm:text-sm md:text-base font-semibold flex items-center justify-center gap-1 sm:gap-2"
              >
                <Navigation className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0`} />
                <span className="hidden sm:inline">🧭 </span>
                <span className="truncate text-center">{t('order.tracking.shareLocation')}</span>
              </Button>
              <Button
                onClick={handleWhatsApp}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50 py-3 sm:py-6 text-sm sm:text-base font-semibold"
              >
                <MessageCircle className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0`} />
                <span className="truncate">{t('delivery.professional.whatsapp')}</span>
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
