import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";

// Les titres des modes de livraison sont maintenant dans i18n.tsx
const deliveryModes: Record<string, { image: string; color: string }> = {
  scooter: {
    image: "/images/products/delivery/delivery-scooter.png",
    color: "bg-yellow-500"
  },
  "tuk-tuk": {
    image: "/images/products/delivery/delivery-tuktuk.png",
    color: "bg-red-500"
  },
  truck: {
    image: "/images/products/delivery/delivery-truck.png",
    color: "bg-blue-500"
  },
  tractor: {
    image: "/images/products/delivery/tracteur.png",
    color: "bg-green-500"
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

export default function DeliveryForm() {
  const [, setLocation] = useLocation();
  const { t, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  // Récupérer le mode de livraison depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const modeId = params.get("mode") || "scooter";
  const deliveryMode = deliveryModes[modeId] || deliveryModes.scooter;
  const deliveryModeTitle = getDeliveryModeTitle(modeId, t);

  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Charger les données depuis l'onboarding si disponibles
  useEffect(() => {
    try {
      const onboarding = localStorage.getItem("tp_onboarding");
      if (onboarding) {
        const data = JSON.parse(onboarding);
        if (data.address) {
          setPickupAddress(data.address);
          setDeliveryAddress(data.address);
        }
      }
    } catch (e) {
      console.error("Error loading onboarding data:", e);
    }
  }, []);

  const handleContinue = () => {
    // Validation
    if (!pickupAddress.trim()) {
      alert(t('delivery.step1.error.pickup'));
      return;
    }
    if (!deliveryAddress.trim()) {
      alert(t('delivery.step1.error.delivery'));
      return;
    }

    // Sauvegarder les données
    const formData = {
      deliveryMode: modeId,
      deliveryModeTitle: deliveryModeTitle,
      pickupAddress: pickupAddress.trim(),
      deliveryAddress: deliveryAddress.trim()
    };

    localStorage.setItem("delivery_form_data", JSON.stringify(formData));

    // Rediriger vers la page suivante (nom et téléphone)
    setLocation(`/delivery-form-step2?mode=${modeId}`);
  };

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      {/* Header avec progression */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              {/* Barre de progression */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
                <div className="h-1.5 flex-1 rounded-full bg-gray-200"></div>
                <div className="h-1.5 flex-1 rounded-full bg-gray-200"></div>
              </div>
              <p className="text-xs text-gray-500">{t('delivery.step', { step: '1' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Illustration et titre */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-20 h-20 rounded-lg ${deliveryMode.color} flex items-center justify-center overflow-hidden flex-shrink-0`}>
            <img 
              src={deliveryMode.image} 
              alt={deliveryModeTitle}
              className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.className = `w-20 h-20 rounded-lg ${deliveryMode.color} flex items-center justify-center`;
                      parent.innerHTML = `<div class="text-white text-2xl">🛵</div>`;
                    }
                  }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{deliveryModeTitle}</h1>
            <p className="text-sm text-gray-500">{t('delivery.step', { step: '1' })}</p>
          </div>
        </div>

        {/* Section Adresses */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('delivery.step1.addresses.title')}
          </h2>

          <div className="space-y-4">
            {/* Adresse de récupération */}
            <div className="relative">
              <MapPin className={`absolute top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 ${isRtl ? 'right-3' : 'left-3'}`} />
              <Input
                type="text"
                placeholder={t('delivery.step1.pickup.placeholder')}
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className={`h-12 text-base ${isRtl ? 'pr-11' : 'pl-11'}`}
              />
            </div>

            {/* Adresse de livraison */}
            <div className="relative">
              <MapPin className={`absolute top-1/2 -translate-y-1/2 text-orange-500 h-5 w-5 ${isRtl ? 'right-3' : 'left-3'}`} />
              <Input
                type="text"
                placeholder={t('delivery.step1.delivery.placeholder')}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className={`h-12 text-base ${isRtl ? 'pr-11' : 'pl-11'}`}
              />
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white py-6 text-base font-semibold rounded-lg"
        >
          {t('delivery.step1.continue')}
          <ChevronRight className={`${isRtl ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
        </Button>
      </div>
    </div>
  );
}
